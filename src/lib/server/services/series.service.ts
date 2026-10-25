import db from '../database';
import type { RangoSerie, SerieTemporal } from '$lib/types';

const DIAS_POR_RANGO: Record<RangoSerie, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '1y': 365
};

// Horizonte futuro capped a 30 días: proyectar 365 días lineales es ruido visual.
const FUTURO_MAX = 30;

function fechaISO(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function sumarDias(base: Date, dias: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + dias);
  return d;
}

export const seriesService = {
  /**
   * Reconstruye una serie temporal (stock + ventas, pasado y predicción futura)
   * para el ámbito dado ('global' o un productoId), en el rango pedido.
   *
   * El histórico de stock NO se lee de una tabla (no existe): se REBOBINA desde
   * `stock_actual` restando el neto de movimientos de los días posteriores.
   * Así el stock de cada día es exacto respecto al estado corriente del sistema.
   */
  obtenerSerie(ambito: 'global' | number, rango: RangoSerie): SerieTemporal {
    const R = DIAS_POR_RANGO[rango] ?? 30;
    const hoy = new Date();
    const inicioPasado = sumarDias(hoy, -(R - 1)); // ventana pasada de R días, incluyendo hoy
    const finISO = fechaISO(hoy);
    const inicioISO = fechaISO(inicioPasado);

    // --- A. Stock actual ancla ---
    const stockActual = ambito === 'global'
      ? (db.prepare('SELECT COALESCE(SUM(stock_actual), 0) AS s FROM productos').get() as { s: number }).s
      : (db.prepare('SELECT stock_actual AS s FROM productos WHERE id = ?').get(ambito) as { s: number } | undefined)?.s;

    if (stockActual == null) {
      throw new Error('AMBITO_NO_ENCONTRADO'); // el endpoint lo traduce a 404
    }

    // --- B. Movimientos agregados por día en la ventana pasada ---
    // neto = entradas - salidas (delta de stock); ventas = solo salidas.
    const filtroProducto = ambito === 'global' ? '' : ' AND producto_id = @pid';
    const params: Record<string, unknown> = { inicio: inicioISO, fin: finISO };
    if (ambito !== 'global') params.pid = ambito;

    const filasMov = db.prepare(`
      SELECT
        date(fecha) AS d,
        SUM(CASE WHEN tipo = 'entrada' THEN cantidad ELSE -cantidad END) AS neto,
        SUM(CASE WHEN tipo = 'salida'  THEN cantidad ELSE 0 END)        AS ventas
      FROM movimientos
      WHERE date(fecha) BETWEEN @inicio AND @fin ${filtroProducto}
      GROUP BY date(fecha)
    `).all(params) as Array<{ d: string; neto: number; ventas: number }>;

    const netoPorDia = new Map<string, number>();
    const ventasPorDia = new Map<string, number>();
    for (const f of filasMov) {
      netoPorDia.set(f.d, Number(f.neto) || 0);
      ventasPorDia.set(f.d, Number(f.ventas) || 0);
    }

    // --- C. Etiquetas contiguas (pasado + futuro) ---
    const futuroDias = Math.min(R, FUTURO_MAX);
    const etiquetas: string[] = [];
    for (let i = 0; i < R; i++) etiquetas.push(fechaISO(sumarDias(inicioPasado, i)));      // pasado, hoy al final
    for (let k = 1; k <= futuroDias; k++) etiquetas.push(fechaISO(sumarDias(hoy, k)));     // futuro
    const hoyIndex = R - 1;

    // --- D. Rebobinado del stock real (de hoy hacia atrás) ---
    // stock al cierre del día i = stock_actual - SUM(neto de días i+1 .. hoy)
    const stockReal: (number | null)[] = new Array(etiquetas.length).fill(null);
    const ventasReales: (number | null)[] = new Array(etiquetas.length).fill(null);
    let acumuladoNetoPosterior = 0; // neto de los días YA procesados que son posteriores a i
    for (let i = hoyIndex; i >= 0; i--) {
      stockReal[i] = stockActual - acumuladoNetoPosterior;
      ventasReales[i] = ventasPorDia.get(etiquetas[i]) ?? 0;
      acumuladoNetoPosterior += netoPorDia.get(etiquetas[i]) ?? 0; // prepara el día anterior
    }

    // --- E. Consumo diario (mismo modelo lineal del dashboard) ---
    let totalVentas = 0;
    let diasConVenta = 0;
    for (let i = 0; i <= hoyIndex; i++) {
      const v = ventasReales[i] ?? 0;
      if (v > 0) { totalVentas += v; diasConVenta++; }
    }
    const consumoDiario = diasConVenta > 0 ? totalVentas / diasConVenta : 0;

    // --- F. Proyección futura ---
    // stock_predicho ancla en hoy (= stock_actual) y decae linealmente; se trunca en 0.
    // ventas_predichas = consumo constante, arranca el día SIGUIENTE a hoy (null en hoy).
    const stockPredicho: (number | null)[] = new Array(etiquetas.length).fill(null);
    const ventasPredichas: (number | null)[] = new Array(etiquetas.length).fill(null);
    stockPredicho[hoyIndex] = stockActual; // punto de anclaje: las dos líneas de stock se tocan en hoy
    for (let k = 1; k <= futuroDias; k++) {
      const idx = hoyIndex + k;
      stockPredicho[idx] = Math.max(0, stockActual - consumoDiario * k);
      ventasPredichas[idx] = Number(consumoDiario.toFixed(2));
    }

    return {
      etiquetas,
      stockReal,
      ventasReales,
      stockPredicho,
      ventasPredichas,
      hoyIndex,
      rango,
      ambito
    };
  }
};