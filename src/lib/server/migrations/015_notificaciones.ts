import type { Database } from 'better-sqlite3';

export function migrarNotificaciones(db: Database) {
  const cambios: string[] = [];

  // 1. Tabla de notificaciones
  const tieneNotificaciones = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='notificaciones'"
  ).get();
  if (!tieneNotificaciones) {
    cambios.push(`
      CREATE TABLE notificaciones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        tipo TEXT NOT NULL,
        titulo TEXT NOT NULL,
        mensaje TEXT NOT NULL,
        leida INTEGER DEFAULT 0,
        metadata TEXT,
        creada_en DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX idx_notificaciones_usuario_leida ON notificaciones(usuario_id, leida);
      CREATE INDEX idx_notificaciones_creada_en ON notificaciones(creada_en DESC);
    `);
  }

  // 2. Tabla de preferencias de notificación por usuario
  const tienePreferencias = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='preferencias_notificacion'"
  ).get();
  if (!tienePreferencias) {
    cambios.push(`
      CREATE TABLE preferencias_notificacion (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        tipo_evento TEXT NOT NULL,
        activa INTEGER DEFAULT 1,
        UNIQUE(usuario_id, tipo_evento)
      );
    `);
  }

  if (cambios.length > 0) {
    db.exec(cambios.join(';\n'));
    console.log('✅ Migración 015 aplicada: sistema de notificaciones');
  }
}