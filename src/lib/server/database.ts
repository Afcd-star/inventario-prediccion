import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Obtener la ruta del directorio actual
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ruta del archivo de base de datos (se creará en la raíz del proyecto)
const DB_PATH = join(__dirname, '../../../database.db');

// Inicializar la base de datos
const db = new Database(DB_PATH);

// Habilitar claves foráneas (importante en SQLite)
db.pragma('foreign_keys = ON');

// Leer el esquema SQL
const schemaPath = join(__dirname, 'schema.sql');
const schema = readFileSync(schemaPath, 'utf-8');

// Ejecutar el esquema para crear las tablas
db.exec(schema);

console.log('✅ Base de datos conectada y tablas inicializadas en:', DB_PATH);

// Exportar la instancia de la base de datos
export default db;