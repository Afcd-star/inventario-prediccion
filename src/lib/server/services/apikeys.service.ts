import crypto from 'node:crypto';
import db from '../database';

const PREFIJO_VISIBLE = 'spk_';

export interface ApiKeyInfo {
  id: number;
  nombre: string;
  scopes: string[];
  expira_en: string | null;
  activa: number;
}

export const apiKeysService = {
  /**
   * Genera un secreto aleatorio, su hash SHA256 y un prefijo visible para identificarla.
   * El secreto completo solo se devuelve una vez al crearla.
   */
  generarClave(): { secreto: string; prefijo: string; hash: string } {
    const secreto = PREFIJO_VISIBLE + crypto.randomBytes(24).toString('hex');
    const hash = crypto.createHash('sha256').update(secreto).digest('hex');
    const prefijo = secreto.slice(0, 12);
    return { secreto, prefijo, hash };
  },

  crear(
    nombre: string,
    scopes: string[],
    creadoPor: number,
    expiraEn: string | null
  ): { id: number; secreto: string } {
    const { secreto, prefijo, hash } = this.generarClave();
    const res = db.prepare(`
      INSERT INTO api_keys (nombre, prefijo, hash, scopes, creada_por, expira_en)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(nombre, prefijo, hash, scopes.join(','), creadoPor, expiraEn);
    return { id: res.lastInsertRowid as number, secreto };
  },

  /**
   * Valida un secreto: lo hashea, lo busca, verifica estado y expiración.
   * Actualiza la marca de último uso.
   */
  validar(secreto: string): ApiKeyInfo | null {
    const hash = crypto.createHash('sha256').update(secreto).digest('hex');
    const fila = db.prepare(`
      SELECT id, nombre, scopes, expira_en, activa 
      FROM api_keys 
      WHERE hash = ?
    `).get(hash) as {
      id: number;
      nombre: string;
      scopes: string;
      expira_en: string | null;
      activa: number;
    } | undefined;

    if (!fila) return null;
    if (fila.activa !== 1) return null;
    if (fila.expira_en && new Date(fila.expira_en) < new Date()) return null;

    db.prepare('UPDATE api_keys SET ultima_usada_en = CURRENT_TIMESTAMP WHERE id = ?').run(fila.id);

    return {
      id: fila.id,
      nombre: fila.nombre,
      scopes: fila.scopes.split(',').filter(Boolean),
      expira_en: fila.expira_en,
      activa: fila.activa
    };
  },

  tieneScope(key: ApiKeyInfo, scope: string): boolean {
    return key.scopes.includes(scope) || key.scopes.includes('*');
  },

  listar(): Array<{
    id: number;
    nombre: string;
    prefijo: string;
    scopes: string[];
    expira_en: string | null;
    activa: number;
    creada_en: string;
    ultima_usada_en: string | null;
  }> {
    const filas = db.prepare(`
      SELECT id, nombre, prefijo, scopes, expira_en, activa, creada_en, ultima_usada_en
      FROM api_keys
      ORDER BY creada_en DESC
    `).all() as Array<{
      id: number;
      nombre: string;
      prefijo: string;
      scopes: string;
      expira_en: string | null;
      activa: number;
      creada_en: string;
      ultima_usada_en: string | null;
    }>;

    return filas.map(fila => ({
      ...fila,
      scopes: fila.scopes.split(',').filter(Boolean)
    }));
  },

  revocar(id: number): void {
    db.prepare('UPDATE api_keys SET activa = 0 WHERE id = ?').run(id);
  },

  eliminar(id: number): void {
    db.prepare('DELETE FROM api_keys WHERE id = ?').run(id);
  }
};