// MIGRACIÓN 003: tabla escenarios para la simulación What-if.
// Ejecutar una vez en cada base de datos que no tenga la tabla.
// Para aplicarla en una base de datos antigua:
//   npx tsx src/lib/server/migrations/003_escenarios.ts
import type Database from 'better-sqlite3';
import db from '../sqlite';

export function migrarEscenarios(db: Database.Database) {
  const tablaExiste = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='escenarios'"
  ).get();

  if (!tablaExiste) {
    db.exec(`
      CREATE TABLE escenarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        producto_id INTEGER NOT NULL,
        parametros TEXT NOT NULL,
        resultados TEXT NOT NULL,
        creado_por INTEGER NOT NULL,
        creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
        FOREIGN KEY (creado_por) REFERENCES usuarios(id) ON DELETE CASCADE
      );
      CREATE INDEX idx_escenarios_producto ON escenarios(producto_id);
    `);
    console.log('✅ Migración 003 aplicada: tabla escenarios creada');
  } else {
    console.log('ℹ️  Migración 003 ya estaba aplicada');
  }
}

migrarEscenarios(db);