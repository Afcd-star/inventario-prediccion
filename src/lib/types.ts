export interface Producto {
  id: number;
  nombre: string;
  descripcion: string | null;
  precio: number;
  stock_actual: number;
  stock_minimo: number;
  unidad_medida: string;
  created_at: string;
  updated_at: string;
}