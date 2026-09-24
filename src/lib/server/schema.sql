-- Tabla de productos
CREATE TABLE IF NOT EXISTS productos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL UNIQUE,
  descripcion TEXT,
  precio REAL NOT NULL CHECK(precio >= 0),
  stock_actual INTEGER NOT NULL DEFAULT 0 CHECK(stock_actual >= 0),
  stock_minimo INTEGER NOT NULL DEFAULT 10 CHECK(stock_minimo >= 0),
  unidad_medida TEXT DEFAULT 'unidad',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de movimientos (entradas y salidas)
CREATE TABLE IF NOT EXISTS movimientos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  producto_id INTEGER NOT NULL,
  tipo TEXT NOT NULL CHECK(tipo IN ('entrada', 'salida')),
  cantidad INTEGER NOT NULL CHECK(cantidad > 0),
  fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
  notas TEXT,
  FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
);

-- Tabla de predicciones (se actualiza automáticamente)
CREATE TABLE IF NOT EXISTS predicciones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  producto_id INTEGER NOT NULL UNIQUE,
  consumo_promedio_diario REAL DEFAULT 0,
  dias_hasta_agotarse INTEGER,
  fecha_recomendada_reorden DATETIME,
  actualizado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
);

-- Índices para mejorar el rendimiento de las consultas
CREATE INDEX IF NOT EXISTS idx_movimientos_producto_fecha ON movimientos(producto_id, fecha);
CREATE INDEX IF NOT EXISTS idx_productos_nombre ON productos(nombre);
CREATE INDEX IF NOT EXISTS idx_productos_stock ON productos(stock_actual);