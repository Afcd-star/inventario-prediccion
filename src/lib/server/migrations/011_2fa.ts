import type { Database } from 'better-sqlite3';

export function migrar2FA(db: Database) {
  const columnas = db.prepare('PRAGMA table_info(usuarios)').all() as Array<{ name: string }>;
  const tieneTotpSecreto = columnas.some(col => col.name === 'totp_secreto');
  const tieneTotpActivado = columnas.some(col => col.name === 'totp_activado');

  const tablaExiste = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='codigos_recuperacion'"
  ).get();

  const cambios: string[] = [];

  if (!tieneTotpSecreto) cambios.push('ALTER TABLE usuarios ADD COLUMN totp_secreto TEXT');
  if (!tieneTotpActivado) cambios.push('ALTER TABLE usuarios ADD COLUMN totp_activado INTEGER DEFAULT 0');

  if (!tablaExiste) {
    cambios.push(`
      CREATE TABLE codigos_recuperacion (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id INTEGER NOT NULL,
        hash TEXT NOT NULL,
        usado INTEGER DEFAULT 0,
        creada_en DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
      );
      CREATE INDEX idx_codigos_recuperacion_usuario ON codigos_recuperacion(usuario_id);
      CREATE UNIQUE INDEX idx_codigos_recuperacion_hash ON codigos_recuperacion(hash);
    `);
  }

  if (cambios.length > 0) {
    db.exec(cambios.join(';\n'));
    console.log('✅ Migración 011 aplicada: soporte 2FA TOTP');
  }
}