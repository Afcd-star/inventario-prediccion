import type { Database } from 'better-sqlite3';

export function migrarApiWebhooks(db: Database) {
  const cambios: string[] = [];

  // 1. Tabla de claves de API
  const tieneApiKeys = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='api_keys'"
  ).get();
  if (!tieneApiKeys) {
    cambios.push(`
      CREATE TABLE api_keys (
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
      CREATE INDEX idx_api_keys_hash ON api_keys(hash);
    `);
  }

  // 2. Tabla de webhooks configurados
  const tieneWebhooks = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='webhooks'"
  ).get();
  if (!tieneWebhooks) {
    cambios.push(`
      CREATE TABLE webhooks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT NOT NULL,
        secreto TEXT NOT NULL,
        eventos TEXT NOT NULL,
        activa INTEGER DEFAULT 1,
        creada_por INTEGER REFERENCES usuarios(id),
        creada_en DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  // 3. Cola durable de entregas de webhooks
  const tieneEntregas = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='webhook_entregas'"
  ).get();
  if (!tieneEntregas) {
    cambios.push(`
      CREATE TABLE webhook_entregas (
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
      CREATE INDEX idx_webhook_entregas_pendientes ON webhook_entregas(estado, proximo_intento_en);
    `);
  }

  // 4. Bitácora de llamadas a la API pública
  const tieneApiLogs = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='api_logs'"
  ).get();
  if (!tieneApiLogs) {
    cambios.push(`
      CREATE TABLE api_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        api_key_id INTEGER REFERENCES api_keys(id) ON DELETE SET NULL,
        endpoint TEXT NOT NULL,
        metodo TEXT NOT NULL,
        codigo_respuesta INTEGER NOT NULL,
        duracion_ms INTEGER,
        ip TEXT,
        creada_en DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX idx_api_logs_key_fecha ON api_logs(api_key_id, creada_en);
    `);
  }

  if (cambios.length > 0) {
    db.exec(cambios.join(';\n'));
    console.log('✅ Migración 014 aplicada: ecosistema de API pública y webhooks');
  }
}