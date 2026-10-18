import db from '../database';
import { apiKeysService, type ApiKeyInfo } from './apikeys.service';

// Rate limiting por clave: ventana deslizante en memoria
const ventanas = new Map<number, number[]>();
const LIMITE_POR_MINUTO = 120;
const VENTANA_MS = 60 * 1000;

type ResultadoAuth =
  | { ok: true; key: ApiKeyInfo }
  | { ok: false; codigo: number; error: string };

export const apiGateway = {
  /**
   * Extrae y valida la credencial del encabezado Authorization Bearer.
   * Aplica rate limiting por clave.
   */
  autenticar(headers: Headers): ResultadoAuth {
    const auth = headers.get('authorization');
    if (!auth || !auth.toLowerCase().startsWith('bearer ')) {
      return { ok: false, codigo: 401, error: 'Falta el encabezado Authorization con esquema Bearer' };
    }

    const secreto = auth.slice(7).trim();
    if (!secreto) {
      return { ok: false, codigo: 401, error: 'Credencial vacía' };
    }

    const key = apiKeysService.validar(secreto);
    if (!key) {
      return { ok: false, codigo: 401, error: 'Clave de API inválida, revocada o expirada' };
    }

    // Rate limiting por clave
    const ahora = Date.now();
    const marca = ventanas.get(key.id) ?? [];
    const recientes = marca.filter(t => ahora - t < VENTANA_MS);
    if (recientes.length >= LIMITE_POR_MINUTO) {
      return { ok: false, codigo: 429, error: 'Límite de llamadas por minuto excedido' };
    }
    recientes.push(ahora);
    ventanas.set(key.id, recientes);

    return { ok: true, key };
  },

  /**
   * Registra cada llamada a la API pública en la bitácora.
   */
  registrarLlamada(
    keyId: number | null,
    endpoint: string,
    metodo: string,
    codigo: number,
    duracionMs: number,
    ip: string | null
  ): void {
    db.prepare(`
      INSERT INTO api_logs (api_key_id, endpoint, metodo, codigo_respuesta, duracion_ms, ip)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(keyId, endpoint, metodo, codigo, duracionMs, ip);
  }
};