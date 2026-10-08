import db from './database';
import { prediccionService } from './prediccion.service';

export interface Movimiento {
  id: number;
  producto_id: number;
  tipo: 'entrada' | 'salida';
  cantidad: number;
  fecha: string;
  notas: string | null;
}

export interface MovimientoInput {
  producto_id: number;
  tipo: 'entrada' | 'salida';
  cantidad: number;
  notas?: string;
}

export const movimientosService = {
  obtenerPorProducto: (productoId: number): Movimiento[] => {
    return db
      .prepare('SELECT * FROM movimientos WHERE producto_id = ? ORDER BY fecha DESC')
      .all(productoId) as Movimiento[];
  },

  registrar: (input: MovimientoInput) => {
    const transaccion = db.transaction(() => {
      db.prepare(
        'INSERT INTO movimientos (producto_id, tipo, cantidad, notas) VALUES (?, ?, ?, ?)'
      ).run(input.producto_id, input.tipo, input.cantidad, input.notas || null);

      const signo = input.tipo === 'entrada' ? '+' : '-';
      const result = db.prepare(
        `UPDATE productos SET stock_actual = stock_actual ${signo} ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
      ).run(input.cantidad, input.producto_id);

      if (input.tipo === 'salida') {
        const productoActualizado = db
          .prepare('SELECT * FROM productos WHERE id = ?')
          .get(input.producto_id) as any;
          
        if (productoActualizado.stock_actual < 0) {
          throw new Error('No hay suficiente stock para realizar esta salida.');
        }

        // 🌟 NUEVO: Recalcular predicción automáticamente tras una salida
        prediccionService.calcularParaProducto(productoActualizado);
      }

      return result.changes > 0;
    });

    return transaccion();
  }
};