import type Database from 'better-sqlite3';

export function migrarLotes(db: Database.Database) {
  // Verificar si la tabla lotes ya existe
  const tablaExiste = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='lotes'"
  ).get();

  if (!tablaExiste) {
    console.log('🔄 Ejecutando migración: creando tabla lotes...');
    db.exec(`
      CREATE TABLE lotes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        producto_id INTEGER NOT NULL,
        numero_lote TEXT NOT NULL,
        fecha_caducidad DATE NOT NULL,
        cantidad_inicial INTEGER NOT NULL,
        cantidad_actual INTEGER NOT NULL,
        fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
      );
      
      CREATE INDEX idx_lotes_producto ON lotes(producto_id);
      CREATE INDEX idx_lotes_caducidad ON lotes(fecha_caducidad);
    `);
    console.log('✅ Tabla lotes creada');
  } else {
    console.log('ℹ️  La tabla lotes ya existe');
  }

  // Agregar campo lote_id a la tabla movimientos si no existe
  const columnas = db.prepare("PRAGMA table_info(movimientos)").all() as Array<{ name: string }>;
  const tieneLoteId = columnas.some(col => col.name === 'lote_id');

  if (!tieneLoteId) {
    console.log('🔄 Agregando campo lote_id a movimientos...');
    db.exec('ALTER TABLE movimientos ADD COLUMN lote_id INTEGER REFERENCES lotes(id)');
    console.log('✅ Campo lote_id agregado');
  } else {
    console.log('ℹ️  El campo lote_id ya existe en movimientos');
  }

  const productosSinLoteDeApertura = db.prepare(`
    SELECT
      p.id,
      p.stock_actual,
      COALESCE(SUM(l.cantidad_actual), 0) AS cantidad_en_lotes
    FROM productos p
    LEFT JOIN lotes l ON l.producto_id = p.id
    GROUP BY p.id
    HAVING p.stock_actual > COALESCE(SUM(l.cantidad_actual), 0)
      AND NOT EXISTS (
        SELECT 1
        FROM lotes apertura
        WHERE apertura.producto_id = p.id
          AND apertura.numero_lote = 'APERTURA-' || p.id
      )
  `).all() as Array<{ id: number; stock_actual: number; cantidad_en_lotes: number }>;

  const insertarLoteApertura = db.prepare(`
    INSERT INTO lotes (
      producto_id, numero_lote, fecha_caducidad, cantidad_inicial, cantidad_actual
    )
    VALUES (?, ?, '9999-12-31', ?, ?)
  `);

  const crearLotesApertura = db.transaction(() => {
    for (const producto of productosSinLoteDeApertura) {
      const cantidad = producto.stock_actual - producto.cantidad_en_lotes;
      insertarLoteApertura.run(producto.id, `APERTURA-${producto.id}`, cantidad, cantidad);
    }
  });

  crearLotesApertura();
  if (productosSinLoteDeApertura.length > 0) {
    console.log(`✅ Lotes de apertura creados para ${productosSinLoteDeApertura.length} productos`);
  }
}