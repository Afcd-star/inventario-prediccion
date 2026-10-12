import Database from 'better-sqlite3';
import { join } from 'path';
import { migrarLotes } from './migrations/002_lotes.ts';
import { migrarSeriesTiempo } from './migrations/001_series_tiempo';
import schema from './schema.sql?raw';

const DB_PATH = join(process.cwd(), 'database.db');

const db = new Database(DB_PATH);
db.pragma('foreign_keys = ON');

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

console.log('✅ Base de datos conectada y tablas inicializadas en:', DB_PATH);

export default db;