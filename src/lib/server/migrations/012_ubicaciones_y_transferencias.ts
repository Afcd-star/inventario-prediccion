import type { Database } from 'better-sqlite3';

export function migrarUbicacionesYTransferencias(db: Database) {
  // 1. Tabla ubicaciones
  const tieneUbicaciones = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='ubicaciones'").get();
  if (!tieneUbicaciones) {
    db.exec(`
      CREATE TABLE ubicaciones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        tipo TEXT NOT NULL DEFAULT 'almacen',
        direccion TEXT,
        activa INTEGER DEFAULT 1,
        creada_en DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Migracion 012: Tabla ubicaciones creada con Almacen Principal');
  }
  db.prepare(`
    INSERT OR IGNORE INTO ubicaciones (id, nombre, tipo, direccion, activa)
    VALUES (1, 'Almacen Principal', 'almacen', 'Ubicacion por defecto', 1)
  `).run();

  // 2. Agregar ubicacion_id a lotes
  const colLoteUbicacion = (db.prepare("PRAGMA table_info(lotes)").all() as Array<{name: string}>).some(c => c.name === 'ubicacion_id');
  if (!colLoteUbicacion) {
    db.exec(`ALTER TABLE lotes ADD COLUMN ubicacion_id INTEGER;`);
    db.exec(`UPDATE lotes SET ubicacion_id = 1 WHERE ubicacion_id IS NULL;`);
    console.log('✅ Migracion 012: Columna ubicacion_id agregada a lotes');
  }

  // 3. Agregar ubicacion_id a movimientos
  const colMovUbicacion = (db.prepare("PRAGMA table_info(movimientos)").all() as Array<{name: string}>).some(c => c.name === 'ubicacion_id');
  if (!colMovUbicacion) {
    db.exec(`ALTER TABLE movimientos ADD COLUMN ubicacion_id INTEGER;`);
    db.exec(`UPDATE movimientos SET ubicacion_id = 1 WHERE ubicacion_id IS NULL;`);
    console.log('✅ Migracion 012: Columna ubicacion_id agregada a movimientos');
  }

  // 4. Tabla transferencias
  const tieneTransferencias = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='transferencias'").get();
  if (!tieneTransferencias) {
    db.exec(`
      CREATE TABLE transferencias (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        origen_id INTEGER NOT NULL REFERENCES ubicaciones(id),
        destino_id INTEGER NOT NULL REFERENCES ubicaciones(id),
        estado TEXT NOT NULL DEFAULT 'pendiente',
        creado_por INTEGER REFERENCES usuarios(id),
        notas TEXT,
        creada_en DATETIME DEFAULT CURRENT_TIMESTAMP,
        completada_en DATETIME
      );
      CREATE INDEX idx_transferencias_estado ON transferencias(estado);
    `);
    console.log('✅ Migracion 012: Tabla transferencias creada');
  }

  // 5. Tabla transferencia_items
  const tieneTransferenciaItems = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='transferencia_items'").get();
  if (!tieneTransferenciaItems) {
    db.exec(`
      CREATE TABLE transferencia_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transferencia_id INTEGER NOT NULL REFERENCES transferencias(id) ON DELETE CASCADE,
        producto_id INTEGER NOT NULL REFERENCES productos(id),
        lote_id INTEGER REFERENCES lotes(id),
        cantidad_solicitada INTEGER NOT NULL,
        cantidad_recibida INTEGER,
        creada_en DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX idx_transferencia_items_transferencia ON transferencia_items(transferencia_id);
    `);
    console.log('✅ Migracion 012: Tabla transferencia_items creada');
  }
}