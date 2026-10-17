import type { Database } from 'better-sqlite3';

export function migrarIntentosFallidos(db: Database) {
  const tablaExiste = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='intentos_fallidos'"
  ).get();

  if (!tablaExiste) {
    db.exec(`
      CREATE TABLE intentos_fallidos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tipo TEXT NOT NULL,
        clave TEXT NOT NULL,
        creada_en DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX idx_intentos_tipo_clave_fecha
        ON intentos_fallidos(tipo, clave, creada_en);
    `);
    console.log('✅ Migración 009 aplicada: tabla intentos_fallidos creada');
  }
}