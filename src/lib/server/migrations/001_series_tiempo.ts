// MIGRACIÓN 001 (ARCHIVADA): campos de series de tiempo en predicciones.
// Ya aplicada en la base de datos principal. Se conserva como historial del esquema.
// Las instalaciones nuevas NO la necesitan: schema.sql ya incluye estos campos.
// Para aplicarla en una base de datos antigua:
//   npx tsx src/lib/server/migrations/001_series_tiempo.ts
import type Database from 'better-sqlite3';

export function migrarSeriesTiempo(db: Database.Database) {
  // Verificar si la tabla predicciones tiene los nuevos campos
  const columnas = db.prepare("PRAGMA table_info(predicciones)").all() as Array<{ name: string }>;
  const nombresColumnas = columnas.map(c => c.name);

  if (!nombresColumnas.includes('tendencia')) {
    db.exec(`
      ALTER TABLE predicciones ADD COLUMN tendencia TEXT DEFAULT 'estable';
      ALTER TABLE predicciones ADD COLUMN volatilidad REAL DEFAULT 0;
      ALTER TABLE predicciones ADD COLUMN patrones TEXT DEFAULT '[]';
      ALTER TABLE predicciones ADD COLUMN prediccion_30_dias TEXT DEFAULT '[]';
    `);
    console.log('✅ Migración de series de tiempo completada');
  } else {
    console.log('️  La tabla predicciones ya tiene los campos de series de tiempo');
  }
}