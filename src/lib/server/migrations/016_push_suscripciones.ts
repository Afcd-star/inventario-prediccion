import type { Database } from 'better-sqlite3';

export function migrarPushSuscripciones(db: Database) {
  const tieneTabla = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='push_suscripciones'"
  ).get();

  if (!tieneTabla) {
    db.exec(`
      CREATE TABLE push_suscripciones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        endpoint TEXT NOT NULL UNIQUE,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        creada_en DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX idx_push_usuario ON push_suscripciones(usuario_id);
    `);
    console.log('✅ Migración 016 aplicada: tabla push_suscripciones');
  }
}