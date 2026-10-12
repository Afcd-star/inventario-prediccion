import { error, json } from '@sveltejs/kit';
import db from '$lib/server/database';
import type { RequestHandler } from './$types';

const LIMITE_REGISTROS = 100;
const COLUMNAS_SENSIBLES = /password|hash|token|secret/i;

export const GET: RequestHandler = async ({ locals, url }) => {
  if (!locals.usuario || locals.usuario.rol !== 'admin') {
    throw error(403, 'Acceso denegado.');
  }

  const nombreTabla = url.searchParams.get('tabla');
  if (!nombreTabla) {
    throw error(400, 'Debes especificar una tabla.');
  }

  const tablaExistente = db.prepare(`
    SELECT name
    FROM sqlite_master
    WHERE type = 'table' AND name = ? AND name NOT LIKE 'sqlite_%'
  `).get(nombreTabla) as { name: string } | undefined;

  if (!tablaExistente) {
    throw error(404, 'La tabla solicitada no existe.');
  }

  const nombreSeguro = tablaExistente.name.replaceAll('"', '""');
  const columnas = db.prepare(`PRAGMA table_info("${nombreSeguro}")`)
    .all() as Array<{ name: string }>;
  const columnasVisibles = columnas
    .map(columna => columna.name)
    .filter(nombre => !COLUMNAS_SENSIBLES.test(nombre));

  if (columnasVisibles.length === 0) {
    throw error(403, 'Esta tabla no tiene columnas visibles.');
  }

  const columnasSql = columnasVisibles
    .map(nombre => `"${nombre.replaceAll('"', '""')}"`)
    .join(', ');
  const filas = db.prepare(`
    SELECT ${columnasSql}
    FROM "${nombreSeguro}"
    LIMIT ?
  `).all(LIMITE_REGISTROS) as Array<Record<string, unknown>>;
  const conteo = db.prepare(`SELECT COUNT(*) AS total FROM "${nombreSeguro}"`)
    .get() as { total: number };

  return json({
    nombre: tablaExistente.name,
    columnas: columnasVisibles,
    filas,
    total: conteo.total,
    limite: LIMITE_REGISTROS,
    truncado: conteo.total > LIMITE_REGISTROS
  });
};
