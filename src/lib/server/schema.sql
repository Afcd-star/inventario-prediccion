-- Tabla de productos
CREATE TABLE IF NOT EXISTS productos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL UNIQUE,
  descripcion TEXT,
  precio REAL NOT NULL CHECK(precio >= 0),
  stock_actual INTEGER NOT NULL DEFAULT 0 CHECK(stock_actual >= 0),
  stock_minimo INTEGER NOT NULL DEFAULT 10 CHECK(stock_minimo >= 0),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de lotes (trazabilidad y caducidad, lógica FEFO)
CREATE TABLE IF NOT EXISTS lotes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  producto_id INTEGER NOT NULL,
  numero_lote TEXT NOT NULL,
  fecha_caducidad DATE NOT NULL,
  cantidad_inicial INTEGER NOT NULL,
  cantidad_actual INTEGER NOT NULL,
  fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
);

-- Tabla de movimientos (entradas y salidas)
CREATE TABLE IF NOT EXISTS movimientos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  producto_id INTEGER NOT NULL,
  tipo TEXT NOT NULL CHECK(tipo IN ('entrada', 'salida')),
  cantidad INTEGER NOT NULL CHECK(cantidad > 0),
  fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
  notas TEXT,
  lote_id INTEGER REFERENCES lotes(id),
  FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
);

-- Tabla de predicciones (se actualiza automáticamente)
CREATE TABLE IF NOT EXISTS predicciones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  producto_id INTEGER NOT NULL UNIQUE,
  consumo_promedio_diario REAL DEFAULT 0,
  dias_hasta_agotarse INTEGER,
  dias_hasta_minimo INTEGER,
  fecha_recomendada_reorden DATETIME,
  tendencia TEXT DEFAULT 'estable',
  volatilidad REAL DEFAULT 0,
  patrones TEXT DEFAULT '[]',
  prediccion_30_dias TEXT DEFAULT '[]',
  actualizado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
);

-- Tabla de usuarios y roles
CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  rol TEXT NOT NULL DEFAULT 'empleado' CHECK(rol IN ('admin', 'empleado')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de escenarios simulados (What-if, Fase 4)
CREATE TABLE IF NOT EXISTS escenarios (
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

-- Índices para mejorar el rendimiento de las consultas
CREATE INDEX IF NOT EXISTS idx_movimientos_producto_fecha ON movimientos(producto_id, fecha);
CREATE INDEX IF NOT EXISTS idx_productos_nombre ON productos(nombre);
CREATE INDEX IF NOT EXISTS idx_productos_stock ON productos(stock_actual);
CREATE INDEX IF NOT EXISTS idx_lotes_producto ON lotes(producto_id);
CREATE INDEX IF NOT EXISTS idx_lotes_caducidad ON lotes(fecha_caducidad);