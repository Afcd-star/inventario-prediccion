import type { Database } from 'better-sqlite3';

export function migrarSesiones(db: Database) {
  const tablaExiste = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='sesiones'"
  ).get();

  if (!tablaExiste) {
    db.exec(`
      CREATE TABLE sesiones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id INTEGER NOT NULL,
        token_hash TEXT NOT NULL UNIQUE,
        user_agent TEXT,
        ip TEXT,
        creada_en DATETIME DEFAULT CURRENT_TIMESTAMP,
        ultima_actividad DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
      );

      CREATE INDEX idx_sesiones_token_hash ON sesiones(token_hash);
      CREATE INDEX idx_sesiones_usuario_id ON sesiones(usuario_id);
      CREATE INDEX idx_sesiones_ultima_actividad ON sesiones(ultima_actividad);
    `);
    console.log('✅ Migración 008 aplicada: tabla sesiones creada');
  }
}