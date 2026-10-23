import db from '../database';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

import type {
  KPIsReporte,
  FilaPrediccionReporte,
  FilaLoteReporte,
  FilaAnomaliaReporte,
  FilaMovimientoReporte
} from '$lib/types';

// Helper: fecha local legible YYYY-MM-DD HH:MM:SS (sin depender de locale del navegador)
function marcaTemporalLocal(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export const exportacionService = {
  // ---------- Datos simples (confirmados en bloques previos) ----------

  obtenerFilasProductos(): Array<Record<string, unknown>> {
    return db.prepare(`
      SELECT nombre, descripcion, precio, stock_actual, stock_minimo
      FROM productos
      ORDER BY nombre ASC
    `).all() as Array<Record<string, unknown>>;
  },

  obtenerFilasMovimientos(): Array<Record<string, unknown>> {
    return db.prepare(`
      SELECT
        m.fecha,
        p.nombre AS producto,
        l.numero_lote AS lote,
        m.tipo,
        m.cantidad,
        u.nombre AS ubicacion,
        m.notas
      FROM movimientos m
      JOIN productos p ON m.producto_id = p.id
      LEFT JOIN lotes l ON m.lote_id = l.id
      LEFT JOIN ubicaciones u ON m.ubicacion_id = u.id
      ORDER BY m.fecha DESC
    `).all() as Array<Record<string, unknown>>;
  },

  // ---------- Constructores de archivo (sin cambios) ----------

  construirCSV(filas: Array<Record<string, unknown>>): string {
    return '\uFEFF' + Papa.unparse(filas, { header: true, delimiter: ',' });
  },

  construirXLSX(filas: Array<object>, nombreHoja: string): Uint8Array<ArrayBuffer> {
    const hoja = XLSX.utils.json_to_sheet(filas);
    hoja['!cols'] = Object.keys(filas[0] ?? { a: 1, b: 1 }).map(() => ({ wch: 22 }));
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, nombreHoja);
    const buffer = XLSX.write(libro, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
    return new Uint8Array(buffer);
  },

  // ---------- 🆕 Reporte multi-hoja (Bloque 11.8) ----------

  // ✏️ Hoja 1 · Resumen — columnas 100% confirmadas por tus capturas
    // ✏️ Ahora envuelve los crudos con texto plano (etiquetas del Excel, no de la UI)
  obtenerResumenKPIs(): Array<Record<string, unknown>> {
    const k = this.obtenerKPIsCrudos();
    return [
      { Metrica: 'Total productos', Valor: k.total },
      { Metrica: 'Valor del inventario', Valor: k.valorInventario.toFixed(2) },
      { Metrica: 'Productos en stock bajo', Valor: k.stockBajo },
      { Metrica: 'Lotes por vencer (30 días)', Valor: k.lotesVencer30 },
      { Metrica: 'Anomalías activas (pendientes)', Valor: k.anomaliasPendientes },
      { Metrica: 'Generado el', Valor: marcaTemporalLocal() }
    ];
  },

  // 🆕 Predicciones CALCULADAS desde movimientos (productos NO las persiste).
  // ⚠️ Sustituible por un JOIN a la tabla `predicciones` del dashboard para paridad 1:1.
  //    Fórmula: consumo = salidas totales / días distintos con venta.
  obtenerPrediccionesCalculadas(): FilaPrediccionReporte[] {
    const filas = db.prepare(`
      WITH consumo AS (
        SELECT
          producto_id,
          SUM(CASE WHEN tipo = 'salida' THEN cantidad ELSE 0 END) AS total_salidas,
          COUNT(DISTINCT CASE WHEN tipo = 'salida' THEN date(fecha) END) AS dias_venta
        FROM movimientos
        GROUP BY producto_id
      )
      SELECT
        p.id,
        p.nombre AS producto,
        p.stock_actual,
        p.stock_minimo,
        p.precio,
        c.total_salidas,
        c.dias_venta
      FROM productos p
      LEFT JOIN consumo c ON c.producto_id = p.id
      ORDER BY p.nombre ASC
    `).all() as Array<{
      id: number; producto: string; stock_actual: number; stock_minimo: number;
      precio: number; total_salidas: number | null; dias_venta: number | null;
    }>;

    const HORIZONTE_DIAS = 30;

    return filas.map((f) => {
      const tieneVentas = f.total_salidas != null && f.dias_venta != null && f.dias_venta > 0;
      const consumo = tieneVentas ? Number((f.total_salidas! / f.dias_venta!).toFixed(2)) : null;

      let diasHastaAgotar: number | null = null;
      let fechaReorden: string | null = null;
      let compraRecomendada: number | null = null;

      if (consumo != null && consumo > 0) {
        diasHastaAgotar = Number((f.stock_actual / consumo).toFixed(1));

        if (f.stock_actual <= f.stock_minimo) {
          fechaReorden = 'AHORA';
        } else {
          const diasParaMinimo = Math.ceil((f.stock_actual - f.stock_minimo) / consumo);
          const d = new Date();
          d.setDate(d.getDate() + diasParaMinimo);
          const p = (n: number) => String(n).padStart(2, '0');
          fechaReorden = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
        }

        compraRecomendada = Math.max(0, Math.ceil(consumo * HORIZONTE_DIAS - f.stock_actual));
      }

      return {
        producto: f.producto,
        stock_actual: f.stock_actual,
        stock_minimo: f.stock_minimo,
        precio: f.precio,
        consumo_diario: consumo,            // null = sin ventas registradas
        dias_hasta_agotar: diasHastaAgotar,
        fecha_reorden: fechaReorden,
        compra_recomendada: compraRecomendada
      };
    });
  },

  // ✏️ Hoja 2 · Stock bajo — se deriva de las predicciones calculadas (DRY, sin SQL duplicado)
  obtenerStockBajo(): FilaPrediccionReporte[] {
    return this.obtenerPrediccionesCalculadas()
      .filter((p) => Number(p.stock_actual) <= Number(p.stock_minimo))
      .sort((a, b) => {
        const da = a.dias_hasta_agotar as number | null;
        const dbb = b.dias_hasta_agotar as number | null;
        // null (sin datos) al final; el resto ascendente por urgencia
        if (da == null && dbb == null) return 0;
        if (da == null) return 1;
        if (dbb == null) return -1;
        return da - dbb;
      });
  },

  // ✏️ Hoja 3 · Lotes por vencer (FEFO) — columnas confirmadas en bloque 11.6
  obtenerLotesPorVencer(dias = 90): FilaLoteReporte[] {
    const filas = db.prepare(`
      SELECT
        p.nombre AS producto,
        l.numero_lote AS lote,
        l.cantidad_actual AS cantidad,
        l.fecha_caducidad AS caducidad,
        CAST(julianday(l.fecha_caducidad) - julianday('now') AS INTEGER) AS dias_restantes
      FROM lotes l
      JOIN productos p ON l.producto_id = p.id
      WHERE l.cantidad_actual > 0
        AND l.fecha_caducidad IS NOT NULL
        AND l.fecha_caducidad <= date('now', '+' || ? || ' day')
      ORDER BY l.fecha_caducidad ASC
    `).all(dias) as Array<Record<string, unknown>>;

    return filas.map((f) => ({
      producto: String(f.producto ?? ''),
      lote: String(f.lote ?? ''),
      cantidad: Number(f.cantidad ?? 0),
      caducidad: String(f.caducidad ?? ''),
      dias_restantes: Number(f.dias_restantes ?? 0)
    }));
  },

  // ✏️ Hoja 5 · Anomalías activas — columnas REALES de tu captura (sin 'periodo', sin 'z_max')
  obtenerAnomalias(): FilaAnomaliaReporte[] {
    const filas = db.prepare(`
      SELECT
        p.nombre AS producto,
        a.tipo,
        a.fecha_inicio,
        a.fecha_fin,
        CAST(julianday(a.fecha_fin) - julianday(a.fecha_inicio) + 1 AS INTEGER) AS dias_consecutivos,
        ROUND(a.desviacion_promedio, 2) AS desviacion_promedio,
        ROUND(a.z_score_max, 2) AS z_score_max,
        a.estado,
        a.creada_en
      FROM anomalias a
      JOIN productos p ON a.producto_id = p.id
      WHERE a.estado = 'pendiente'
      ORDER BY a.creada_en DESC
    `).all() as Array<Record<string, unknown>>;

    return filas.map((f) => ({
      producto: String(f.producto ?? ''),
      tipo: String(f.tipo ?? ''),
      fecha_inicio: String(f.fecha_inicio ?? ''),
      fecha_fin: String(f.fecha_fin ?? ''),
      dias_consecutivos: Number(f.dias_consecutivos ?? 0),
      desviacion_promedio: Number(f.desviacion_promedio ?? 0),
      z_score_max: Number(f.z_score_max ?? 0),
      estado: String(f.estado ?? ''),
      creada_en: String(f.creada_en ?? '')
    }));
  },

  // ✏️ Hoja 6 · Movimientos recientes — límite de seguridad para no inflar memoria (8 GB)
  obtenerMovimientosRecientes(limite = 5000): FilaMovimientoReporte[] {
    const filas = db.prepare(`
      SELECT
        m.fecha,
        p.nombre AS producto,
        l.numero_lote AS lote,
        m.tipo,
        m.cantidad,
        u.nombre AS ubicacion,
        m.notas
      FROM movimientos m
      JOIN productos p ON m.producto_id = p.id
      LEFT JOIN lotes l ON m.lote_id = l.id
      LEFT JOIN ubicaciones u ON m.ubicacion_id = u.id
      ORDER BY m.fecha DESC
      LIMIT ?
    `).all(limite) as Array<Record<string, unknown>>;

    return filas.map((f) => ({
      fecha: String(f.fecha ?? ''),
      producto: String(f.producto ?? ''),
      lote: f.lote == null ? null : String(f.lote),
      tipo: String(f.tipo ?? ''),
      cantidad: Number(f.cantidad ?? 0),
      ubicacion: f.ubicacion == null ? null : String(f.ubicacion),
      notas: f.notas == null ? null : String(f.notas)
    }));
  },

  // 🆕 Libro multi-hoja (Uint8Array<ArrayBuffer> → compatible con Response en TS 5.7+)
  construirLibroMultiHoja(
    hojas: Array<{ nombre: string; filas: Array<object> }>
  ): Uint8Array<ArrayBuffer> {
    const libro = XLSX.utils.book_new();

    for (const { nombre, filas } of hojas) {
      const hoja = XLSX.utils.json_to_sheet(filas.length > 0 ? filas : [{ Aviso: 'Sin datos' }]);
      const claves = filas.length > 0 ? Object.keys(filas[0]) : ['Aviso'];
      hoja['!cols'] = claves.map((k) => ({ wch: Math.min(40, Math.max(14, k.length + 4)) }));
      XLSX.utils.book_append_sheet(libro, hoja, nombre.slice(0, 31)); // Excel: máx 31 chars
    }

    const buffer = XLSX.write(libro, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
    return new Uint8Array(buffer);
  },

  // 🆕 Orquesta el reporte completo (6 hojas)
  generarReporteCompleto(): { xlsx: Uint8Array<ArrayBuffer>; hojas: string[] } {
    const predicciones = this.obtenerPrediccionesCalculadas(); // una sola vez, se reutiliza
    const hojas = [
      { nombre: 'Resumen',          filas: this.obtenerResumenKPIs() },
      { nombre: 'Stock bajo',       filas: predicciones.filter((p) => Number(p.stock_actual) <= Number(p.stock_minimo))
                                          .sort((a, b) => ((a.dias_hasta_agotar as number|null) ?? Infinity) - ((b.dias_hasta_agotar as number|null) ?? Infinity)) },
      { nombre: 'Lotes por vencer', filas: this.obtenerLotesPorVencer(90) },
      { nombre: 'Predicciones',     filas: predicciones },
      { nombre: 'Anomalías',        filas: this.obtenerAnomalias() },
      { nombre: 'Movimientos',      filas: this.obtenerMovimientosRecientes(5000) }
    ];

    return { xlsx: this.construirLibroMultiHoja(hojas), hojas: hojas.map((h) => h.nombre) };
  },

  // 🆕 KPIs SIN etiquetas: la vista los viste con i18n; el Excel los envuelve con texto plano.
  obtenerKPIsCrudos(): KPIsReporte {
    const total = db.prepare('SELECT COUNT(*) AS n FROM productos').get() as { n: number };
    const valor = db.prepare('SELECT COALESCE(SUM(stock_actual * precio), 0) AS v FROM productos').get() as { v: number };
    const stockBajo = db.prepare('SELECT COUNT(*) AS n FROM productos WHERE stock_actual <= stock_minimo').get() as { n: number };
    const lotesVencer = db.prepare(`
      SELECT COUNT(*) AS n FROM lotes
      WHERE cantidad_actual > 0
        AND fecha_caducidad IS NOT NULL
        AND fecha_caducidad <= date('now', '+30 day')
    `).get() as { n: number };
    const anomalias = db.prepare("SELECT COUNT(*) AS n FROM anomalias WHERE estado = 'pendiente'").get() as { n: number };

    return {
      total: total.n,
      valorInventario: Number(valor.v),
      stockBajo: stockBajo.n,
      lotesVencer30: lotesVencer.n,
      anomaliasPendientes: anomalias.n
    };
  }
};