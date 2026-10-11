import db from './database';

export function migrarSeriesTiempo() {
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

// Ejecutar migración
migrarSeriesTiempo();