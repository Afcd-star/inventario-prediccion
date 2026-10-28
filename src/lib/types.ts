export interface Producto {
  id: number;
  nombre: string;
  descripcion: string | null;
  precio: number;
  stock_actual: number;
  stock_minimo: number;
  created_at: string;
  updated_at: string;
}

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  password_hash: string;
  rol: 'admin' | 'empleado';
  created_at: string;
}

// Fase 10: Notificaciones en tiempo real
export type TipoNotificacion = 
  | 'stock_bajo'
  | 'anomalia_detectada'
  | 'transferencia_completada'
  | 'transferencia_cancelada'
  | 'lote_por_vencer';

export interface Notificacion {
  id: number;
  usuario_id: number;
  tipo: TipoNotificacion;
  titulo: string;
  mensaje: string;
  leida: number;
  metadata: string | null;
  creada_en: string;
}

export interface PreferenciaNotificacion {
  usuario_id: number;
  tipo_evento: TipoNotificacion;
  activa: number;
}

// ============================================
// Importación y exportación masiva (Fase 11/12)
// ============================================

export type ModoImportacion = 'crear' | 'actualizar';

export interface FilaProducto {
  nombre: string;
  descripcion?: string;
  precio: number | string;
  stock_minimo: number | string;
}

export interface FilaStockInicial {
  producto: string;
  cantidad: number | string;
  numero_lote?: string;
  fecha_caducidad?: string;
  ubicacion?: string;
}

export interface ErrorFilaImportacion {
  fila: number;
  nombre?: string;
  motivo: string;
}

export interface ResultadoImportacion {
  exitosas: number;
  actualizadas: number;
  errores: ErrorFilaImportacion[];
}

export interface ColumnaPreview {
  clave: string;          // nombre de la columna en el archivo
  etiqueta: string;       // texto visible en el encabezado (ya traducido)
  tipo?: 'texto' | 'numero';
  placeholder?: string;
  paso?: string;          // step del input numérico (ej: '0.01' para precios)
}

// ============================================
// Reporte completo (Bloque 11.8 · vista)
// ============================================

export interface KPIsReporte {
  total: number;
  valorInventario: number;
  stockBajo: number;
  lotesVencer30: number;
  anomaliasPendientes: number;
}

export interface FilaPrediccionReporte {
  producto: string;
  stock_actual: number;
  stock_minimo: number;
  precio: number;
  consumo_diario: number | null;
  dias_hasta_agotar: number | null;
  fecha_reorden: string | null;
  compra_recomendada: number | null;
}

export interface FilaLoteReporte {
  producto: string;
  lote: string;
  cantidad: number;
  caducidad: string;
  dias_restantes: number;
}

export interface FilaAnomaliaReporte {
  producto: string;
  tipo: string;
  fecha_inicio: string;
  fecha_fin: string;
  dias_consecutivos: number;
  desviacion_promedio: number;
  z_score_max: number;
  estado: string;
  creada_en: string;
}

export interface FilaMovimientoReporte {
  fecha: string;
  producto: string;
  lote: string | null;
  tipo: string;
  cantidad: number;
  ubicacion: string | null;
  notas: string | null;
}

export interface InformeCompleto {
  kpis: KPIsReporte;
  stockBajo: FilaPrediccionReporte[];
  lotesPorVencer: FilaLoteReporte[];
  predicciones: FilaPrediccionReporte[];
  anomalias: FilaAnomaliaReporte[];
  movimientos: FilaMovimientoReporte[];
  movimientosTotales: number; // para la nota "mostrando X de Y"
}

// ============================================
// Visualización histórica (Fase 13)
// ============================================

export type RangoSerie = '7d' | '30d' | '90d' | '1y';

export interface SerieTemporal {
  etiquetas: string[];                 // fechas AAAA-MM-DD contiguas (pasado + futuro)
  stockReal: (number | null)[];        // valores hasta hoy, null en futuro
  ventasReales: (number | null)[];     // valores hasta hoy, null en futuro
  stockPredicho: (number | null)[];    // null en pasado, ancla en hoy + futuro
  ventasPredichas: (number | null)[];  // null hasta hoy, futuro
  hoyIndex: number;                    // posición de "hoy" en etiquetas
  rango: RangoSerie;
  ambito: 'global' | number;           // 'global' o productoId
}

// ============================================
// Proveedores y órdenes de compra (Fase 15)
// ============================================

export interface Proveedor {
  id: number;
  nombre: string;
  contacto: string | null;
  email: string | null;
  telefono: string | null;
  tiempo_entrega_dias: number | null;   // default global del proveedor
  notas: string | null;
  activa: number;                        // 0/1, patrón SQLite del proyecto
  created_at: string;
}

export interface ProductoProveedor {
  id: number;
  producto_id: number;
  proveedor_id: number;
  costo_unitario: number;               // por par (NOT NULL en schema)
  tiempo_entrega_dias: number | null;   // override del global (NULL = hereda)
  pedido_minimo: number | null;         // MOQ por par (NULL = sin mínimo)
  created_at: string;
}

export interface ProductoAsociado {
  asociacion_id: number;
  producto_id: number;
  producto_nombre: string;
  stock_actual: number;
  stock_minimo: number;
  costo_unitario: number;
  tiempo_entrega_override: number | null;  // pp.tiempo_entrega_dias crudo (NULL = hereda)
  tiempo_entrega_efectivo: number | null;  // COALESCE(override, global)
  pedido_minimo: number | null;
}

// ── Sugerencias de reposición (Fase 15.4) ──
// Un elemento = un producto que necesita reponerse (Q_bruta > 0) o que no tiene
// proveedor activo (caso B2). Los proveedores del producto van en `proveedores`,
// ordenados de mejor a peor (lead-time ASC, costo desempate); [0] es el recomendado.
export interface SugerenciaReposicion {
  producto_id: number;
  producto_nombre: string;
  stock_actual: number;
  stock_minimo: number;
  // De la tabla `predicciones` (fuente única, unificación 15.4). null = sin fila/historial.
  consumo_diario: number | null;
  dias_hasta_agotar: number | null;
  bajo_minimo: boolean;            // señal secundaria (badge), no criterio de entrada
  // Proveedor recomendado = proveedores[0]. null si no hay ninguno activo (B2).
  proveedor_recomendado_id: number | null;
  proveedor_recomendado_nombre: string | null;
  lead_time_efectivo: number | null;   // del recomendado; null = "plazo no registrado" (B3)
  costo_unitario: number | null;       // del recomendado
  pedido_minimo: number | null;        // del recomendado
  q_sugerida: number | null;           // redondeada al MOQ del recomendado; null si sin proveedor
  proveedores: ProveedorRanking[];     // ranking completo para el modal "Ver otros"
}

// Una opción de proveedor dentro del ranking de un producto. El Q es POR PAR:
// cambiar de proveedor cambia el lead-time, la necesidad y por tanto la cantidad.
export interface ProveedorRanking {
  proveedor_id: number;
  proveedor_nombre: string;
  lead_time_efectivo: number | null;
  costo_unitario: number;
  pedido_minimo: number | null;
  q_sugerida: number;              // Q recalculada para este par (siempre > 0 si entra en el ranking)
}

// ── Exportación de OC (Fase 15.5) ──
// Payload que envía el cliente desde /proveedores/reposicion. Solo ids + cantidad:
// el server regenera costos/plazos desde BD (D6), nunca confía en lo que manda el cliente.
export interface LineaOCPayload {
  producto_id: number;
  proveedor_id: number;
  cantidad: number;
}

// Par producto-proveedor activo, resuelto por el server para validar y construir la OC.
// null = el par no existe o el proveedor está inactivo (→ 400, no manipulable).
export interface ParActivo {
  producto_id: number;
  producto_nombre: string;
  proveedor_id: number;
  proveedor_nombre: string;
  proveedor_contacto: string | null;
  proveedor_email: string | null;
  proveedor_telefono: string | null;
  costo_unitario: number;
  pedido_minimo: number | null;
  tiempo_entrega_efectivo: number | null;   // COALESCE(override, global)
}

// Línea ya resuelta para el PDF (con subtotal calculado en server).
export interface LineaOC {
  producto_nombre: string;
  cantidad: number;
  costo_unitario: number;
  subtotal: number;
  plazo_dias: number | null;                // lead-time efectivo de ESTE par (columna por línea, M1)
}

// Una OC = una página del PDF (D2). Agrupada por proveedor.
export interface OrdenCompraExportable {
  numero: string;                           // OC-YYYYMMDD-HHmm-{proveedorId} (M2)
  proveedor_nombre: string;
  proveedor_contacto: string | null;
  proveedor_email: string | null;
  proveedor_telefono: string | null;
  plazo_entrega_dias: number | null;        // MAX de los lead-times del grupo (M1)
  fecha_estimada: string;                   // hoy + plazo, o "Por confirmar" si null
  lineas: LineaOC[];
  total: number;                            // Σ subtotales (sin IVA, D4)
}