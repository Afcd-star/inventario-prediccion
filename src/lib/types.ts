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