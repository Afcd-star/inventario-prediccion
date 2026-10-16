import db from '../database';

export interface Lote {
  id: number;
  producto_id: number;
  numero_lote: string;
  fecha_caducidad: string;
  cantidad_inicial: number;
  cantidad_actual: number;
  fecha_creacion: string;
}

export const lotesService = {
  /**
   * Crea un nuevo lote para un producto
   */
  crearLote(productoId: number, numeroLote: string, fechaCaducidad: string, cantidad: number): Lote {
    const result = db.prepare(`
      INSERT INTO lotes (producto_id, numero_lote, fecha_caducidad, cantidad_inicial, cantidad_actual)
      VALUES (?, ?, ?, ?, ?)
    `).run(productoId, numeroLote, fechaCaducidad, cantidad, cantidad);

    return db.prepare('SELECT * FROM lotes WHERE id = ?').get(result.lastInsertRowid) as Lote;
  },

  /**
   * Obtiene todos los lotes activos de un producto (ordenados por FEFO)
   */
  obtenerLotesActivos(productoId: number): Lote[] {
    return db.prepare(`
      SELECT * FROM lotes 
      WHERE producto_id = ? AND cantidad_actual > 0
      ORDER BY fecha_caducidad ASC, id ASC
    `).all(productoId) as Lote[];
  },

  /**
   * Obtiene el lote más próximo a caducar (FEFO)
   */
  obtenerLoteFEFO(productoId: number): Lote | undefined {
    return db.prepare(`
      SELECT * FROM lotes 
      WHERE producto_id = ? AND cantidad_actual > 0
      ORDER BY fecha_caducidad ASC, id ASC
      LIMIT 1
    `).get(productoId) as Lote | undefined;
  },

  /**
   * Reduce la cantidad de un lote (para salidas)
   */
  reducirLote(loteId: number, cantidad: number): void {
    const result = db.prepare(`
      UPDATE lotes SET cantidad_actual = cantidad_actual - ? WHERE id = ? AND cantidad_actual >= ?
    `).run(cantidad, loteId, cantidad);

    if (result.changes !== 1) {
      throw new Error('No hay suficiente cantidad disponible en el lote.');
    }
  },

  /**
   * Obtiene lotes próximos a vencer (en los próximos X días)
   */
  obtenerLotesProximosAVencer(dias: number = 30): Array<Lote & { producto_nombre: string }> {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fechaLimite = new Date(hoy);
    fechaLimite.setDate(fechaLimite.getDate() + dias);
    const fechaLocal = (fecha: Date) => [
      fecha.getFullYear(),
      String(fecha.getMonth() + 1).padStart(2, '0'),
      String(fecha.getDate()).padStart(2, '0')
    ].join('-');

    return db.prepare(`
      SELECT l.*, p.nombre as producto_nombre
      FROM lotes l
      JOIN productos p ON l.producto_id = p.id
      WHERE l.cantidad_actual > 0 
        AND l.fecha_caducidad <= ?
        AND l.fecha_caducidad >= ?
      ORDER BY l.fecha_caducidad ASC, l.id ASC
    `).all(fechaLocal(fechaLimite), fechaLocal(hoy)) as Array<Lote & { producto_nombre: string }>;
  },

  /**
   * Obtiene lotes vencidos
   */
  obtenerLotesVencidos(): Array<Lote & { producto_nombre: string }> {
    return db.prepare(`
      SELECT l.*, p.nombre as producto_nombre
      FROM lotes l
      JOIN productos p ON l.producto_id = p.id
      WHERE l.cantidad_actual > 0 
        AND l.fecha_caducidad < date('now')
      ORDER BY l.fecha_caducidad ASC
    `).all() as Array<Lote & { producto_nombre: string }>;
  },

  /**
   * Obtiene todos los lotes de un producto
   */
  obtenerTodosLotesProducto(productoId: number): Lote[] {
    return db.prepare(`
      SELECT * FROM lotes 
      WHERE producto_id = ?
      ORDER BY fecha_caducidad ASC, id ASC
    `).all(productoId) as Lote[];
  },

  /**
   * Calcula días restantes para un lote
   */
  calcularDiasRestantes(fechaCaducidad: string): number {
    const hoy = new Date();
    const [anio, mes, dia] = fechaCaducidad.split('-').map(Number);
    const fechaHoyUTC = Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    const fechaCaducidadUTC = Date.UTC(anio, mes - 1, dia);

    return Math.round((fechaCaducidadUTC - fechaHoyUTC) / (1000 * 60 * 60 * 24));
  }
};