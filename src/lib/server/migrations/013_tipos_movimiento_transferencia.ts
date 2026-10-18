import type { Database } from 'better-sqlite3';

export function migrarTiposMovimientoTransferencia(db: Database) {
  // Leer el esquema actual de la tabla
  const tabla = db.prepare(
    "SELECT sql FROM sqlite_master WHERE type='table' AND name='movimientos'"
  ).get() as { sql: string } | undefined;

  // Si la tabla no existe o ya tiene los tipos de transferencia, no hacer nada
  if (!tabla || !tabla.sql || tabla.sql.includes('transferencia_salida')) {
    return;
  }

  console.log('⏳ Migración 013: ampliando tipos de movimiento para transferencias...');

  // Recreación segura de la tabla (procedimiento oficial de SQLite):
  // 1. Apagar FKs  2. Tabla nueva  3. Copiar datos  4. Drop  5. Renombrar  6. Índice  7. Encender FKs
  db.exec(`
    PRAGMA foreign_keys = OFF;

    CREATE TABLE movimientos_nuevo (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      producto_id INTEGER NOT NULL,
      tipo TEXT NOT NULL CHECK(tipo IN ('entrada', 'salida', 'transferencia_salida', 'transferencia_entrada', 'transferencia_cancelada')),
      cantidad INTEGER NOT NULL CHECK(cantidad > 0),
      fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
      notas TEXT,
      lote_id INTEGER REFERENCES lotes(id),
      ubicacion_id INTEGER,
      FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
    );

    INSERT INTO movimientos_nuevo (id, producto_id, tipo, cantidad, fecha, notas, lote_id, ubicacion_id)
    SELECT id, producto_id, tipo, cantidad, fecha, notas, lote_id, ubicacion_id
    FROM movimientos;

    DROP TABLE movimientos;

    ALTER TABLE movimientos_nuevo RENAME TO movimientos;

    CREATE INDEX idx_movimientos_producto_fecha ON movimientos(producto_id, fecha);

    PRAGMA foreign_keys = ON;
  `);

  console.log('✅ Migración 013: tipos de movimiento ampliados para transferencias');
}