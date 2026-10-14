import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrarLotes } from './migrations/002_lotes';
import { migrarSeriesTiempo } from './migrations/001_series_tiempo';
import { migrarUnidadMedida } from './migrations/004_eliminar_unidad_medida';
import db from './sqlite';

// Cargar el schema con readFileSync: funciona igual en Vite y en Node puro,
// a diferencia del import './schema.sql?raw' que solo entiende Vite.
const __dirname = dirname(fileURLToPath(import.meta.url));
const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');

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

console.log('✅ Base de datos conectada y tablas inicializadas en:', db.name);

export default db;