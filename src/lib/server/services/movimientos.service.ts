import db from '../database';
import { lotesService } from './lotes.service';
import { prediccionService } from './prediccion.service';
import { anomaliasService } from './anomalias.service';
import { dispararStockBajo } from './notificaciones-disparadores'; // <-- NUEVO IMPORT

export interface Movimiento {
  id: number;
  producto_id: number;
  tipo: 'entrada' | 'salida';
  cantidad: number;
  fecha: string;
  notas: string | null;
  lote_id?: number;
  numero_lote?: string | null;
  fecha_caducidad?: string | null;
}

export interface MovimientoInput {
  producto_id: number;
  tipo: 'entrada' | 'salida';
  cantidad: number;
  notas?: string | null;
  numero_lote?: string;
  fecha_caducidad?: string;
}

function validarCantidad(cantidad: number): void {
  if (!Number.isSafeInteger(cantidad) || cantidad <= 0) {
    throw new Error('La cantidad debe ser un entero positivo.');
  }
}

export function esFechaCaducidadValida(fecha: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;

  const fechaParseada = new Date(`${fecha}T00:00:00.000Z`);
  return !Number.isNaN(fechaParseada.getTime()) &&
    fechaParseada.toISOString().slice(0, 10) === fecha;
}

export const movimientosService = {
  /**
   * Registra una entrada y actualiza el inventario dentro de una transacción.
   */
  registrarEntrada(
    productoId: number,
    cantidad: number,
    notas: string | null,
    numeroLote: string,
    fechaCaducidad: string
  ): Movimiento {
    validarCantidad(cantidad);
    if (!numeroLote.trim() || !esFechaCaducidadValida(fechaCaducidad)) {
      throw new Error('El número de lote y la fecha de caducidad son obligatorios.');
    }

    return db.transaction(() => {
      const producto = db.prepare('SELECT id FROM productos WHERE id = ?').get(productoId);
      if (!producto) throw new Error('Producto no encontrado.');

      const lote = lotesService.crearLote(productoId, numeroLote.trim(), fechaCaducidad, cantidad);
      db.prepare(`
        UPDATE productos
        SET stock_actual = stock_actual + ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(cantidad, productoId);

      const result = db.prepare(`
        INSERT INTO movimientos (producto_id, tipo, cantidad, notas, lote_id)
        VALUES (?, 'entrada', ?, ?, ?)
      `).run(productoId, cantidad, notas, lote.id);

      return db.prepare('SELECT * FROM movimientos WHERE id = ?')
        .get(result.lastInsertRowid) as Movimiento;
    })();
  },

  /**
   * Registra una salida usando FEFO (primero en caducar, primero en salir).
   */
  registrarSalidaFEFO(productoId: number, cantidad: number, notas: string | null): Movimiento[] {
    validarCantidad(cantidad);

    return db.transaction(() => {
      const producto = db.prepare('SELECT id FROM productos WHERE id = ?').get(productoId);
      if (!producto) throw new Error('Producto no encontrado.');

      const lotes = lotesService.obtenerLotesActivos(productoId);
      if (lotes.length === 0) {
        throw new Error('No hay lotes disponibles para este producto.');
      }

      const stockTotal = lotes.reduce((total, lote) => total + lote.cantidad_actual, 0);
      if (stockTotal < cantidad) {
        throw new Error(`Stock insuficiente. Disponible: ${stockTotal}, Solicitado: ${cantidad}.`);
      }

      let cantidadRestante = cantidad;
      const movimientosCreados: Movimiento[] = [];
      const obtenerMovimiento = db.prepare('SELECT * FROM movimientos WHERE id = ?');
      const insertarMovimiento = db.prepare(`
        INSERT INTO movimientos (producto_id, tipo, cantidad, notas, lote_id)
        VALUES (?, 'salida', ?, ?, ?)
      `);

      for (const lote of lotes) {
        if (cantidadRestante === 0) break;

        const cantidadDelLote = Math.min(cantidadRestante, lote.cantidad_actual);
        lotesService.reducirLote(lote.id, cantidadDelLote);

        const result = insertarMovimiento.run(productoId, cantidadDelLote, notas, lote.id);
        movimientosCreados.push(
          obtenerMovimiento.get(result.lastInsertRowid) as Movimiento
        );
        cantidadRestante -= cantidadDelLote;
      }

      // 1. Actualizar stock global del producto
      db.prepare(`
        UPDATE productos
        SET stock_actual = stock_actual - ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(cantidad, productoId);

      // 2. VERIFICAR Y DISPARAR NOTIFICACIÓN DE STOCK BAJO (Lugar arquitectónico correcto)
      const productoActualizado = db.prepare(`
        SELECT stock_actual, stock_minimo, nombre FROM productos WHERE id = ?
      `).get(productoId) as { stock_actual: number; stock_minimo: number; nombre: string } | undefined;

      if (productoActualizado && productoActualizado.stock_actual < productoActualizado.stock_minimo) {
        dispararStockBajo(productoId, productoActualizado.nombre, productoActualizado.stock_actual, productoActualizado.stock_minimo);
      }

      // 3. Recalcular predicciones y detectar anomalías
      prediccionService.calcularParaProducto(productoId);

      try {
        anomaliasService.detectarParaProducto(productoId);
      } catch (error) {
        console.error('El monitor de anomalías falló (no bloquea la venta):', error);
      }

      return movimientosCreados;
    })();
  },

  obtenerMovimientosProducto(productoId: number): Movimiento[] {
    return db.prepare(`
      SELECT m.*, l.numero_lote, l.fecha_caducidad
      FROM movimientos m
      LEFT JOIN lotes l ON m.lote_id = l.id
      WHERE m.producto_id = ?
      ORDER BY m.fecha DESC
    `).all(productoId) as Movimiento[];
  },

  obtenerPorProducto(productoId: number): Movimiento[] {
    return this.obtenerMovimientosProducto(productoId);
  },

  /**
   * Mantiene la API utilizada por formularios y callers existentes.
   */
  registrar(input: MovimientoInput): boolean {
    if (input.tipo === 'entrada') {
      if (!input.numero_lote || !input.fecha_caducidad) {
        throw new Error('El número de lote y la fecha de caducidad son obligatorios para una entrada.');
      }
      this.registrarEntrada(
        input.producto_id,
        input.cantidad,
        input.notas ?? null,
        input.numero_lote,
        input.fecha_caducidad
      );
      return true;
    }

    const movimientos = this.registrarSalidaFEFO(
      input.producto_id,
      input.cantidad,
      input.notas ?? null
    );
    return movimientos.length > 0;
  }
};