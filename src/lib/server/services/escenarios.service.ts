import db from '../database';

export interface Escenario {
  id: number;
  nombre: string;
  producto_id: number;
  parametros: string;
  resultados: string;
  creado_por: number;
  creado_en: string;
}

export const escenariosService = {
  guardar(
    nombre: string,
    productoId: number,
    parametros: object,
    resultados: object,
    usuarioId: number
  ): Escenario {
    const resultado = db.prepare(`
      INSERT INTO escenarios (nombre, producto_id, parametros, resultados, creado_por)
      VALUES (?, ?, ?, ?, ?)
    `).run(nombre, productoId, JSON.stringify(parametros), JSON.stringify(resultados), usuarioId);

    return db.prepare('SELECT * FROM escenarios WHERE id = ?').get(resultado.lastInsertRowid) as Escenario;
  },

  listar(): Array<Escenario & { producto_nombre: string; creador_nombre: string }> {
    return db.prepare(`
      SELECT e.*, p.nombre AS producto_nombre, u.nombre AS creador_nombre
      FROM escenarios e
      JOIN productos p ON e.producto_id = p.id
      JOIN usuarios u ON e.creado_por = u.id
      ORDER BY e.creado_en DESC
    `).all() as Array<Escenario & { producto_nombre: string; creador_nombre: string }>;
  },

  eliminar(id: number): void {
    db.prepare('DELETE FROM escenarios WHERE id = ?').run(id);
  }
};