import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = join(__dirname, '../../../database.db');

const db = new Database(DB_PATH);
db.pragma('foreign_keys = ON');

const schemaPath = join(__dirname, 'schema.sql');
const schema = readFileSync(schemaPath, 'utf-8');
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

console.log('✅ Base de datos conectada y tablas inicializadas en:', DB_PATH);

export default db;