import type { Database } from 'better-sqlite3';

export function migrarProveedores(db: Database) {
  // 1. Tabla proveedores (datos maestros del proveedor; el lead-time global es el default)
  const tieneProveedores = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='proveedores'"
  ).get();
  if (!tieneProveedores) {
    db.exec(`
      CREATE TABLE proveedores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        contacto TEXT,
        email TEXT,
        telefono TEXT,
        tiempo_entrega_dias INTEGER,            -- default global del proveedor (NULL = sin plazo fijo)
        notas TEXT,
        activa INTEGER DEFAULT 1,               -- soft-disable (patrón de api_keys/webhooks), no borrado
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX idx_proveedores_nombre ON proveedores(nombre);
    `);
    console.log('✅ Migracion 017: Tabla proveedores creada');
  } else {
    console.log('ℹ️  La tabla proveedores ya existe');
  }

  // 2. Tabla intermedia producto_proveedor (relación muchos-a-muchos con datos por par)
  //    Reemplaza el anti-patrón "productos_suministrados" como campo de texto.
  const tienePP = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='producto_proveedor'"
  ).get();
  if (!tienePP) {
    db.exec(`
      CREATE TABLE producto_proveedor (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        producto_id INTEGER NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
        proveedor_id INTEGER NOT NULL REFERENCES proveedores(id) ON DELETE CASCADE,
        costo_unitario REAL NOT NULL,           -- inherentemente por-par; ver trade-off §1
        tiempo_entrega_dias INTEGER,            -- override del global del proveedor (NULL = hereda)
        pedido_minimo INTEGER,                  -- MOQ por par (NULL = sin mínimo)
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(producto_id, proveedor_id)       -- un producto no se asocia dos veces al mismo proveedor
      );
      CREATE INDEX idx_pp_producto ON producto_proveedor(producto_id);
      CREATE INDEX idx_pp_proveedor ON producto_proveedor(proveedor_id);
    `);
    console.log('✅ Migracion 017: Tabla producto_proveedor creada');
  } else {
    console.log('ℹ️  La tabla producto_proveedor ya existe');
  }
}