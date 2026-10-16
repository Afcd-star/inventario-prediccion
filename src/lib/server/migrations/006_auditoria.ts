// MIGRACIÓN 006: tabla auditoria con inmutabilidad garantizada por triggers.
// Se ejecuta automáticamente al arrancar, invocada desde database.ts.
import type { Database } from 'better-sqlite3';

export function migrarAuditoria(db: Database) {
  const tablaExiste = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='auditoria'"
  ).get();

  if (!tablaExiste) {
    db.exec(`
      CREATE TABLE auditoria (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id INTEGER,
        accion TEXT NOT NULL,
        tabla_afectada TEXT,
        registro_id INTEGER,
        detalles TEXT NOT NULL DEFAULT '{}',
        ip TEXT,
        creada_en DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
      );

      CREATE INDEX idx_auditoria_fecha ON auditoria(creada_en);
      CREATE INDEX idx_auditoria_usuario ON auditoria(usuario_id);
      CREATE INDEX idx_auditoria_accion ON auditoria(accion);

      -- Inmutabilidad: ni UPDATE ni DELETE permitidos, ni siquiera desde consola
      CREATE TRIGGER auditoria_bloquea_update
      BEFORE UPDATE ON auditoria
      BEGIN
        SELECT RAISE(ABORT, 'AUDITORIA INMUTABLE: las modificaciones estan prohibidas');
      END;

      CREATE TRIGGER auditoria_bloquea_delete
      BEFORE DELETE ON auditoria
      BEGIN
        SELECT RAISE(ABORT, 'AUDITORIA INMUTABLE: los borrados estan prohibidos');
      END;
    `);
    console.log('✅ Migración 006 aplicada: tabla auditoria creada con triggers de inmutabilidad');
  }
}