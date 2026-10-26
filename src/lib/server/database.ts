import bcrypt from 'bcryptjs';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrarSeriesTiempo } from './migrations/001_series_tiempo';
import { migrarLotes } from './migrations/002_lotes';
import { migrarUnidadMedida } from './migrations/004_eliminar_unidad_medida';
import { migrarAnomaliasConfig } from './migrations/005_anomalias_config';
import { migrarAuditoria } from './migrations/006_auditoria';
import { migrarAuditoriaNombre } from './migrations/007_auditoria_nombre';
import { migrarSesiones } from './migrations/008_sesiones';
import { migrarIntentosFallidos } from './migrations/009_intentos_fallidos';
import { migrarPreferenciasUsuario } from './migrations/010_preferencias_usuario';
import { migrar2FA } from './migrations/011_2fa';
import { migrarUbicacionesYTransferencias } from './migrations/012_ubicaciones_y_transferencias';
import { migrarTiposMovimientoTransferencia } from './migrations/013_tipos_movimiento_transferencia';
import { migrarApiWebhooks } from './migrations/014_api_webhooks';
import { migrarNotificaciones } from './migrations/015_notificaciones';
import { migrarPushSuscripciones } from './migrations/016_push_suscripciones';
import { migrarProveedores } from './migrations/017_proveedores';
import db from './sqlite';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Ruta canónica: schema.sql junto a este módulo. Acierta en dev-Vite y en Node puro
// (scripts de migración), donde __dirname apunta a src/lib/server/.
let rutaSchema = join(__dirname, 'schema.sql');

// En el BUILD de Vite este módulo se empaqueta en .svelte-kit/output/server/chunks/,
// y schema.sql NO se copia ahí (no es un módulo JS): __dirname apunta al chunk y la
// ruta de arriba falla con ENOENT. Como el proceso de build/preview corre desde la
// raíz del proyecto, caemos a la ruta del source relativa a cwd. Así cubrimos los
// tres entornos SIN recurrir a '?raw', que solo entiende Vite y rompería Node puro.
if (!existsSync(rutaSchema)) {
  rutaSchema = join(process.cwd(), 'src', 'lib', 'server', 'schema.sql');
}

const schema = readFileSync(rutaSchema, 'utf-8');
db.exec(schema);

// 🌟 MIGRACIÓN: Agregar columna 'dias_hasta_minimo' si no existe
function migrarPredicciones() {
  const columnas = db.prepare("PRAGMA table_info(predicciones)").all() as { name: string }[];
  const existeColumna = columnas.some(col => col.name === 'dias_hasta_minimo');
  
  if (!existeColumna) {
    console.log('🔄 Ejecutando migración: agregando columna dias_hasta_minimo...');
    db.exec('ALTER TABLE predicciones ADD COLUMN dias_hasta_minimo INTEGER');
    console.log('✅ Migración completada');
  }
}

migrarPredicciones();

// 🌟 NUEVA MIGRACIÓN: Crear tabla de usuarios si no existe
function migrarUsuarios() {
  const tablaExiste = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='usuarios'").get();
  
  if (!tablaExiste) {
    console.log('🔄 Ejecutando migración: creando tabla usuarios...');
    db.exec(`
      CREATE TABLE usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        rol TEXT NOT NULL DEFAULT 'empleado' CHECK(rol IN ('admin', 'empleado')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabla usuarios creada');
  }
}

migrarUsuarios();
migrarLotes(db);
migrarSeriesTiempo(db);
migrarUnidadMedida(db);
migrarAnomaliasConfig(db);
migrarAuditoria(db);
migrarAuditoriaNombre(db);
migrarSesiones(db);
migrarIntentosFallidos(db);
migrarPreferenciasUsuario(db)
migrar2FA(db);
migrarUbicacionesYTransferencias(db);
migrarTiposMovimientoTransferencia(db);
migrarApiWebhooks(db);
migrarNotificaciones(db);
migrarPushSuscripciones(db);
migrarProveedores(db);

// ── Semilla idempotente del administrador inicial ──────────────────────────────
// Corre en cada arranque, pero solo actúa si la tabla `usuarios` está vacía
// (primer arranque con BD nueva / clon del repo). En una BD con usuarios ya
// creados —como la tuya, que tiene admin y empleado desde el Panel— es un no-op:
// el guard de COUNT(*) > 0 lo salta y no duplica ni sobrescribe nada.
function asegurarUsuarioInicial() {
  const total = db.prepare('SELECT COUNT(*) AS n FROM usuarios').get() as { n: number };
  if (total.n > 0) return;

  const email = process.env.ADMIN_EMAIL ?? 'admin@stockpredict.local';
  const password = process.env.ADMIN_PASSWORD ?? 'CHANGE_ME_admin';
  const usarDefault = !process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD;

  // hashSync (síncrono) encaja en la cascada de migraciones de este módulo;
  // produce un hash compatible con el bcrypt.compare (async) del login.
  const hash = bcrypt.hashSync(password, 12);

  db.prepare(`
    INSERT INTO usuarios (nombre, email, password_hash, rol)
    VALUES (?, ?, ?, 'admin')
  `).run('Administrador', email, hash);

  console.log(`✅ Usuario administrador inicial creado (email: ${email})`);
  if (usarDefault) {
    console.warn(
      '⚠️  El administrador se creó con credenciales por defecto. ' +
      'Define ADMIN_EMAIL y ADMIN_PASSWORD en .env, o cámbialas desde /perfil, ' +
      'antes de usar el sistema en un entorno real.'
    );
  }
}
asegurarUsuarioInicial();

console.log('✅ Base de datos conectada y tablas inicializadas en:', db.name);

export default db;