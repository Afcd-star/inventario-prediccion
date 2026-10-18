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
  tipo TEXT NOT NULL CHECK(tipo IN ('entrada', 'salida', 'transferencia_salida', 'transferencia_entrada', 'transferencia_cancelada')),
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
  idioma_preferido TEXT DEFAULT 'es',
  tema_preferido TEXT DEFAULT 'light',
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

-- Tabla de anomalías detectadas por el monitor predictivo (Fase 5)
CREATE TABLE IF NOT EXISTS anomalias (
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

-- Tabla de configuración clave-valor (umbrales del monitor, Fase 5)
CREATE TABLE IF NOT EXISTS configuracion (
  clave TEXT PRIMARY KEY,
  valor TEXT NOT NULL
);

INSERT OR IGNORE INTO configuracion (clave, valor) VALUES
  ('umbral_z', '2'),
  ('umbral_porcentaje', '30'),
  ('dias_consecutivos', '3');

-- Tabla de auditoría: registro inmutable de acciones críticas (Fase 6)
CREATE TABLE IF NOT EXISTS auditoria (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER,
  usuario_nombre TEXT,
  accion TEXT NOT NULL,
  tabla_afectada TEXT,
  registro_id INTEGER,
  detalles TEXT NOT NULL DEFAULT '{}',
  ip TEXT,
  creada_en DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE TRIGGER IF NOT EXISTS auditoria_bloquea_update
BEFORE UPDATE ON auditoria
BEGIN
  SELECT RAISE(ABORT, 'AUDITORIA INMUTABLE: las modificaciones estan prohibidas');
END;

CREATE TRIGGER IF NOT EXISTS auditoria_bloquea_delete
BEFORE DELETE ON auditoria
BEGIN
  SELECT RAISE(ABORT, 'AUDITORIA INMUTABLE: los borrados estan prohibidos');
END;

-- Tabla de intentos fallidos para rate limiting (Fase 6.5)
CREATE TABLE IF NOT EXISTS intentos_fallidos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo TEXT NOT NULL,
  clave TEXT NOT NULL,
  creada_en DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_intentos_tipo_clave_fecha
  ON intentos_fallidos(tipo, clave, creada_en);

-- Fase 8: Integración Empresarial
CREATE TABLE IF NOT EXISTS api_keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  prefijo TEXT NOT NULL,
  hash TEXT NOT NULL UNIQUE,
  scopes TEXT NOT NULL,
  creada_por INTEGER REFERENCES usuarios(id),
  creada_en DATETIME DEFAULT CURRENT_TIMESTAMP,
  expira_en DATETIME,
  ultima_usada_en DATETIME,
  activa INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS webhooks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT NOT NULL,
  secreto TEXT NOT NULL,
  eventos TEXT NOT NULL,
  activa INTEGER DEFAULT 1,
  creada_por INTEGER REFERENCES usuarios(id),
  creada_en DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS webhook_entregas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  webhook_id INTEGER NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  evento TEXT NOT NULL,
  payload TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'pendiente',
  intentos INTEGER DEFAULT 0,
  proximo_intento_en DATETIME,
  ultima_respuesta TEXT,
  creada_en DATETIME DEFAULT CURRENT_TIMESTAMP,
  completada_en DATETIME
);

CREATE TABLE IF NOT EXISTS api_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  api_key_id INTEGER REFERENCES api_keys(id) ON DELETE SET NULL,
  endpoint TEXT NOT NULL,
  metodo TEXT NOT NULL,
  codigo_respuesta INTEGER NOT NULL,
  duracion_ms INTEGER,
  ip TEXT,
  creada_en DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Índices para mejorar el rendimiento de las consultas
CREATE INDEX IF NOT EXISTS idx_movimientos_producto_fecha ON movimientos(producto_id, fecha);
CREATE INDEX IF NOT EXISTS idx_productos_nombre ON productos(nombre);
CREATE INDEX IF NOT EXISTS idx_productos_stock ON productos(stock_actual);
CREATE INDEX IF NOT EXISTS idx_lotes_producto ON lotes(producto_id);
CREATE INDEX IF NOT EXISTS idx_lotes_caducidad ON lotes(fecha_caducidad);