import db from '../database';

export const ubicacionesService = {
  obtenerTodas: () => {
    return db.prepare(`
      SELECT id, nombre, tipo, direccion, activa, creada_en 
      FROM ubicaciones 
      ORDER BY id ASC
    `).all() as Array<{
      id: number;
      nombre: string;
      tipo: string;
      direccion: string | null;
      activa: number;
      creada_en: string;
    }>;
  },

  crear: (nombre: string, tipo: string, direccion: string) => {
    const result = db.prepare(`
      INSERT INTO ubicaciones (nombre, tipo, direccion, activa)
      VALUES (?, ?, ?, 1)
    `).run(nombre, tipo, direccion);
    return result.lastInsertRowid as number;
  },

  actualizar: (id: number, nombre: string, tipo: string, direccion: string, activa: number) => {
    db.prepare(`
      UPDATE ubicaciones 
      SET nombre = ?, tipo = ?, direccion = ?, activa = ?
      WHERE id = ?
    `).run(nombre, tipo, direccion, activa, id);
  },

  obtenerStockPorUbicacion: (productoId: number) => {
    return db.prepare(`
      SELECT u.id as ubicacion_id, u.nombre as ubicacion_nombre, 
             COALESCE(SUM(l.cantidad_actual), 0) as stock_total
      FROM lotes l
      JOIN ubicaciones u ON l.ubicacion_id = u.id
      WHERE l.producto_id = ? AND l.cantidad_actual > 0
      GROUP BY u.id, u.nombre
    `).all(productoId) as Array<{
      ubicacion_id: number;
      ubicacion_nombre: string;
      stock_total: number;
    }>;
  },

  obtenerStockConsolidado: () => {
    return db.prepare(`
      SELECT 
        u.id as ubicacion_id,
        u.nombre as ubicacion_nombre,
        u.tipo as ubicacion_tipo,
        COUNT(DISTINCT l.producto_id) as total_productos,
        COALESCE(SUM(l.cantidad_actual), 0) as stock_total,
        COALESCE(SUM(CASE WHEN l.cantidad_actual = 0 THEN 1 ELSE 0 END), 0) as lotes_agotados,
        COALESCE(SUM(CASE WHEN l.fecha_caducidad < date('now', '+30 days') THEN l.cantidad_actual ELSE 0 END), 0) as stock_por_vencer
      FROM ubicaciones u
      LEFT JOIN lotes l ON u.id = l.ubicacion_id
      WHERE u.activa = 1
      GROUP BY u.id, u.nombre, u.tipo
      ORDER BY stock_total DESC
    `).all() as Array<{
      ubicacion_id: number;
      ubicacion_nombre: string;
      ubicacion_tipo: string;
      total_productos: number;
      stock_total: number;
      lotes_agotados: number;
      stock_por_vencer: number;
    }>;
  },

  obtenerResumenGeneral: () => {
    const result = db.prepare(`
      SELECT 
        COUNT(DISTINCT u.id) as total_ubicaciones,
        COUNT(DISTINCT l.producto_id) as total_productos,
        COALESCE(SUM(l.cantidad_actual), 0) as stock_total_sistema
      FROM ubicaciones u
      LEFT JOIN lotes l ON u.id = l.ubicacion_id
      WHERE u.activa = 1
    `).get() as {
      total_ubicaciones: number;
      total_productos: number;
      stock_total_sistema: number;
    };

    const transferencias = db.prepare(`
      SELECT COUNT(*) as total FROM transferencias WHERE estado IN ('pendiente', 'en_transito')
    `).get() as { total: number };
    
    return { ...result, transferencias_activas: transferencias.total };
  }
};