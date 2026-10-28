import db from '../database';
import type { SugerenciaReposicion, ProveedorRanking } from '../../types';

// Fila cruda del JOIN producto × predicción × par-proveedor. Un producto sin proveedor
// activo sale con proveedor_id NULL (LEFT JOIN); un producto sin fila en `predicciones`
// sale con consumo NULL. Ambos casos se degradan abajo, no se descartan en silencio.
type FilaCruda = {
  producto_id: number;
  producto_nombre: string;
  stock_actual: number;
  stock_minimo: number;
  consumo_promedio_diario: number | null;
  dias_hasta_agotarse: number | null;
  proveedor_id: number | null;
  proveedor_nombre: string | null;
  lead_time_efectivo: number | null;   // COALESCE(override, global)
  costo_unitario: number | null;
  pedido_minimo: number | null;
};

// ── Fórmula de reposición (Fase 15.4) ──────────────────────────────────────────
// Q_bruta = stock_objetivo − stock_actual − pedidos_ya_emitidos
//   stock_objetivo = stock_minimo + necesidad
//   necesidad        = consumo_diario × (lead_time_efectivo + R)
//
// R (periodo_revisión) = 0 → revisión continua: se pide en cuanto la cobertura se agota.
//   Documentado aquí y en el CHANGELOG/hint de UI (H2). El sistema hoy no gestiona
//   periodicidad de compras (opción A+), así que R=0 es el único valor honesto; si
//   mañana se quiere R configurable, es un parámetro de esta función, no un refactor.
// pedidos_ya_emitidos = 0 → A+ no registra órdenes de compra (sin tabla `ordenes_compra`).
//   La UI avisa de esta limitación (patrón stale-while-error de GraficoTendencias).
//
// Bordes:
//   - consumo NULL/0  → necesidad 0 → stock_objetivo = stock_minimo (degrada a "reponer al mínimo").
//   - lead_time NULL  → necesidad 0 (no se estima consumo durante un plazo desconocido, B3).
//   - Q_bruta ≤ 0     → el producto NO entra (no hay urgencia ni con el proveedor más rápido).
//   - MOQ presente    → Q_sugerida redondea hacia arriba al múltiplo de MOQ (≥ MOQ).
function calcularQ(
  consumo: number,
  leadTime: number | null,
  stockMinimo: number,
  stockActual: number,
  pedidoMinimo: number | null
): { qBruta: number; qSugerida: number } {
  const R = 0;                          // revisión continua (H2)
  const pendientes = 0;                 // A+ no registra OCs (H1/B1)
  const necesidad = (leadTime ?? 0) + R === 0 ? 0 : consumo * ((leadTime ?? 0) + R);
  const stockObjetivo = stockMinimo + necesidad;
  const qBruta = stockObjetivo - stockActual - pendientes;

  let qSugerida: number;
  if (pedidoMinimo != null && pedidoMinimo > 0) {
    // Redondeo al MOQ: nunca pedir menos del mínimo, y siempre múltiplo de él.
    qSugerida = Math.max(pedidoMinimo, Math.ceil(qBruta / pedidoMinimo) * pedidoMinimo);
  } else {
    qSugerida = Math.max(0, Math.ceil(qBruta));
  }
  return { qBruta, qSugerida };
}

export const sugerenciasService = {
  obtenerSugerencias(): SugerenciaReposicion[] {
    const crudas = db.prepare(`
      SELECT
        p.id            AS producto_id,
        p.nombre        AS producto_nombre,
        p.stock_actual,
        p.stock_minimo,
        pr.consumo_promedio_diario,
        pr.dias_hasta_agotarse,
        pv.id           AS proveedor_id,
        pv.nombre       AS proveedor_nombre,
        COALESCE(pp.tiempo_entrega_dias, pv.tiempo_entrega_dias) AS lead_time_efectivo,
        pp.costo_unitario,
        pp.pedido_minimo
      FROM productos p
      LEFT JOIN predicciones pr ON pr.producto_id = p.id
      LEFT JOIN producto_proveedor pp ON pp.producto_id = p.id
      LEFT JOIN proveedores pv ON pv.id = pp.proveedor_id AND pv.activa = 1
      ORDER BY p.id ASC,
               -- Ranking de proveedores: lead-time ASC, nulls (plazo no registrado) al final,
               -- costo como desempate. [0] = recomendado (Opción 2, H3-a/H3-b).
               (pv.id IS NULL),
               lead_time_efectivo IS NULL,
               lead_time_efectivo ASC,
               pp.costo_unitario ASC
    `).all() as FilaCruda[];

    // Agrupo por producto preservando el orden del ORDER BY (el primer par de cada
    // producto es el recomendado; el resto van al ranking en orden de mejor a peor).
    const porProducto = new Map<number, FilaCruda[]>();
    for (const f of crudas) {
      const arr = porProducto.get(f.producto_id);
      if (arr) arr.push(f);
      else porProducto.set(f.producto_id, [f]);
    }

    const sugerencias: SugerenciaReposicion[] = [];

    for (const [productoId, filas] of porProducto) {
      const primera = filas[0];
      const consumo = primera.consumo_promedio_diario ?? 0;
      const bajoMinimo = primera.stock_actual <= primera.stock_minimo;

      // ¿Tiene algún proveedor activo? (LEFT JOIN: si no, todas las filas traen proveedor_id NULL)
      const conProveedor = filas.filter(f => f.proveedor_id != null);

      if (conProveedor.length === 0) {
        // B2: producto sin proveedor activo → entra con Q null y aviso "sin proveedor asociado".
        // No se calcula Q (no hay lead-time/MOQ/costo con qué). Se muestra igualmente para que
        // el admin vea que hay un producto que nadie surte.
        const { qBruta } = calcularQ(consumo, null, primera.stock_minimo, primera.stock_actual, null);
        if (qBruta > 0 || bajoMinimo) {
          sugerencias.push({
            producto_id: productoId,
            producto_nombre: primera.producto_nombre,
            stock_actual: primera.stock_actual,
            stock_minimo: primera.stock_minimo,
            consumo_diario: primera.consumo_promedio_diario,
            dias_hasta_agotar: primera.dias_hasta_agotarse,
            bajo_minimo: bajoMinimo,
            proveedor_recomendado_id: null,
            proveedor_recomendado_nombre: null,
            lead_time_efectivo: null,
            costo_unitario: null,
            pedido_minimo: null,
            q_sugerida: null,
            proveedores: []
          });
        }
        continue;
      }

      // Calculo Q por par y construyo el ranking (orden ya dado por el ORDER BY del SQL).
      const ranking: ProveedorRanking[] = [];
      for (const f of conProveedor) {
        const { qBruta, qSugerida } = calcularQ(
          consumo,
          f.lead_time_efectivo,
          primera.stock_minimo,
          primera.stock_actual,
          f.pedido_minimo
        );
        // El ranking solo incluye pares con necesidad real (qBruta > 0). Un proveedor con
        // lead-time tan corto que cubre sin pedir no es una "opción de compra" para este producto.
        if (qBruta > 0) {
          ranking.push({
            proveedor_id: f.proveedor_id!,
            proveedor_nombre: f.proveedor_nombre!,
            lead_time_efectivo: f.lead_time_efectivo,
            costo_unitario: f.costo_unitario!,
            pedido_minimo: f.pedido_minimo,
            q_sugerida: qSugerida
          });
        }
      }

      // Filtro de entrada (B1 corregido): el producto entra si AL MENOS un proveedor activo
      // da qBruta > 0. Como el recomendado es el de menor lead-time (menor necesidad → menor
      // qBruta), si el recomendado da qBruta > 0 todos los demás también; si el recomendado
      // da qBruta ≤ 0 pero un lento da > 0, el producto entra (con el lento como único par
      // del ranking). Es el filtro más estricto coherente con "qué reponer".
      if (ranking.length === 0) continue;

      const recomendado = ranking[0];
      sugerencias.push({
        producto_id: productoId,
        producto_nombre: primera.producto_nombre,
        stock_actual: primera.stock_actual,
        stock_minimo: primera.stock_minimo,
        consumo_diario: primera.consumo_promedio_diario,
        dias_hasta_agotar: primera.dias_hasta_agotarse,
        bajo_minimo: bajoMinimo,
        proveedor_recomendado_id: recomendado.proveedor_id,
        proveedor_recomendado_nombre: recomendado.proveedor_nombre,
        lead_time_efectivo: recomendado.lead_time_efectivo,
        costo_unitario: recomendado.costo_unitario,
        pedido_minimo: recomendado.pedido_minimo,
        q_sugerida: recomendado.q_sugerida,
        proveedores: ranking
      });
    }

    // Orden final de la lista: urgencia (dias_hasta_agotar ASC), nulls al final (sin datos
    // de consumo = menos urgente que uno que sí se agota), coherente con 11.8/dashboard.
    sugerencias.sort((a, b) => {
      const da = a.dias_hasta_agotar;
      const dbb = b.dias_hasta_agotar;
      if (da == null && dbb == null) return 0;
      if (da == null) return 1;
      if (dbb == null) return -1;
      return da - dbb;
    });

    return sugerencias;
  }
};