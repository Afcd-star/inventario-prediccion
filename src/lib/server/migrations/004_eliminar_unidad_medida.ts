import type Database from 'better-sqlite3';

export function migrarUnidadMedida(db: Database.Database): void {
  const columnas = db.prepare('PRAGMA table_info(productos)').all() as Array<{ name: string }>;
  if (!columnas.some(columna => columna.name === 'unidad_medida')) return;

  db.exec('ALTER TABLE productos DROP COLUMN unidad_medida');
  console.log('✅ Migración 004 aplicada: columna unidad_medida eliminada');
}
