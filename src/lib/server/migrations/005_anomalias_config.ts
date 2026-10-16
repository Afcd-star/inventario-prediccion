// MIGRACIÓN 005: tablas anomalias y configuracion (Fase 5).
// Se ejecuta automáticamente al arrancar, invocada desde database.ts.
import type { Database } from 'better-sqlite3';

export function migrarAnomaliasConfig(db: Database) {
  const tablaAnomalias = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='anomalias'"
  ).get();

  if (!tablaAnomalias) {
    db.exec(`
      CREATE TABLE anomalias (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        producto_id INTEGER NOT NULL,
        tipo TEXT NOT NULL CHECK(tipo IN ('pico', 'caida')),
        fecha_inicio DATE NOT NULL,
        fecha_fin DATE NOT NULL,
        desviacion_promedio REAL NOT NULL,
        z_score_max REAL NOT NULL,
        detalle TEXT NOT NULL DEFAULT '[]',
        estado TEXT NOT NULL DEFAULT 'pendiente' CHECK(estado IN ('pendiente', 'revisada', 'falso_positivo')),
        revisada_por INTEGER,
        revisada_en DATETIME,
        creada_en DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
        FOREIGN KEY (revisada_por) REFERENCES usuarios(id) ON DELETE SET NULL
      );
      CREATE INDEX idx_anomalias_estado ON anomalias(estado);
      CREATE INDEX idx_anomalias_producto ON anomalias(producto_id);
    `);
    console.log('✅ Migración 005 aplicada: tabla anomalias creada');
  }

  const tablaConfig = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='configuracion'"
  ).get();

  if (!tablaConfig) {
    db.exec(`
      CREATE TABLE configuracion (
        clave TEXT PRIMARY KEY,
        valor TEXT NOT NULL
      );
      INSERT INTO configuracion (clave, valor) VALUES
        ('umbral_z', '2'),
        ('umbral_porcentaje', '30'),
        ('dias_consecutivos', '3');
    `);
    console.log('✅ Migración 005 aplicada: tabla configuracion creada con valores por defecto');
  }
}