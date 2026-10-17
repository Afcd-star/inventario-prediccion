import type { Database } from 'better-sqlite3';

export function migrarPreferenciasUsuario(db: Database) {
  const columnas = db.prepare('PRAGMA table_info(usuarios)').all() as Array<{ name: string }>;
  const tieneIdioma = columnas.some(col => col.name === 'idioma_preferido');
  const tieneTema = columnas.some(col => col.name === 'tema_preferido');

  if (!tieneIdioma || !tieneTema) {
    db.exec(`
      ALTER TABLE usuarios ADD COLUMN idioma_preferido TEXT DEFAULT 'es';
      ALTER TABLE usuarios ADD COLUMN tema_preferido TEXT DEFAULT 'light';
    `);
    console.log('✅ Migración 010 aplicada: preferencias de idioma y tema agregadas a usuarios');
  }
}