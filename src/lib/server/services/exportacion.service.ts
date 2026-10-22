import db from '../database';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export const exportacionService = {
  // ---------- Obtención de datos (compartida por ambos formatos) ----------

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

  // ---------- Constructores de archivo ----------

  /**
   * CSV con BOM UTF-8 para que Excel muestre los acentos correctamente.
   */
  construirCSV(filas: Array<Record<string, unknown>>): string {
    return '\uFEFF' + Papa.unparse(filas, { header: true, delimiter: ',' });
  },

  /**
   * Libro de Excel (.xlsx) a partir de filas JSON.
   */
  construirXLSX(filas: Array<Record<string, unknown>>, nombreHoja: string): Uint8Array<ArrayBuffer> {
    const hoja = XLSX.utils.json_to_sheet(filas);

    // Anchos de columna razonables para legibilidad en Excel
    hoja['!cols'] = Object.keys(filas[0] ?? { a: 1, b: 1 }).map(() => ({ wch: 22 }));

    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, nombreHoja);

    const buffer = XLSX.write(libro, { type: 'buffer', bookType: 'xlsx' }) as Buffer;

    return new Uint8Array(buffer);
  }
};