// MIGRACIÓN 007: columna usuario_nombre en auditoria (foto fija del autor).
// Los registros nuevos congelan el nombre al escribirse. Los antiguos se
// resuelven por COALESCE con el JOIN del servicio, sin tocar triggers.
import type { Database } from 'better-sqlite3';

export function migrarAuditoriaNombre(db: Database) {
  const columnas = db.prepare('PRAGMA table_info(auditoria)').all() as Array<{ name: string }>;
  const tieneNombre = columnas.some(col => col.name === 'usuario_nombre');

  if (!tieneNombre) {
    db.exec('ALTER TABLE auditoria ADD COLUMN usuario_nombre TEXT');
    console.log('✅ Migración 007 aplicada: columna usuario_nombre agregada a auditoria');
  }
}