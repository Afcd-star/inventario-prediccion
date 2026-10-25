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