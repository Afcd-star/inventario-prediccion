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