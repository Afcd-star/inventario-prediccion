import Database from 'better-sqlite3';
import { join } from 'path';

const DB_PATH = join(process.cwd(), 'database.db');

const db = new Database(DB_PATH);
db.pragma('foreign_keys = ON');

export default db;
