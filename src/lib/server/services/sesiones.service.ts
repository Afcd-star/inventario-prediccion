import { randomBytes, createHash } from 'node:crypto';
import db from '../database';

export interface Sesion {
  id: number;
  usuario_id: number;
  token_hash: string;
  user_agent: string | null;
  ip: string | null;
  creada_en: string;
  ultima_actividad: string;
}

export interface SesionConUsuario extends Sesion {
  usuario_nombre: string;
  usuario_email: string;
}

const DURACION_SESION_DIAS = 7;
const INTERVALO_ACTUALIZACION_MINUTOS = 5;

function generarToken(): string {
  return randomBytes(32).toString('hex');
}

function hashearToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export const sesionesService = {
  /**
   * Crea una nueva sesión para un usuario.
   * Retorna el token plano (para guardar en cookie) y guarda el hash en BD.
   */
  crearSesion(
    usuarioId: number,
    userAgent: string | null,
    ip: string | null
  ): string {
    const token = generarToken();
    const tokenHash = hashearToken(token);

    db.prepare(`
      INSERT INTO sesiones (usuario_id, token_hash, user_agent, ip)
      VALUES (?, ?, ?, ?)
    `).run(usuarioId, tokenHash, userAgent, ip);

    return token;
  },

  /**
   * Valida un token de sesión.
   * Retorna el usuario si la sesión es válida, null si no.
   * Actualiza última_actividad si han pasado más de 5 minutos.
   */
  validarSesion(token: string): {
    id: number;
    nombre: string;
    email: string;
    rol: 'admin' | 'empleado';
  } | null {
    const tokenHash = hashearToken(token);

    const sesion = db.prepare(`
      SELECT s.*, u.id as usuario_id, u.nombre, u.email, u.rol
      FROM sesiones s
      JOIN usuarios u ON s.usuario_id = u.id
      WHERE s.token_hash = ?
    `).get(tokenHash) as (Sesion & {
      usuario_id: number;
      nombre: string;
      email: string;
      rol: 'admin' | 'empleado';
    }) | undefined;

    if (!sesion) {
      return null;
    }

    // Verificar si la sesión ha expirado
    const creadaEn = new Date(sesion.creada_en).getTime();
    const ahora = Date.now();
    const diasTranscurridos = (ahora - creadaEn) / (1000 * 60 * 60 * 24);

    if (diasTranscurridos > DURACION_SESION_DIAS) {
      this.cerrarSesion(token);
      return null;
    }

    // Actualizar última_actividad si han pasado más de 5 minutos
    const ultimaActividad = new Date(sesion.ultima_actividad).getTime();
    const minutosDesdeUltimaActividad = (ahora - ultimaActividad) / (1000 * 60);

    if (minutosDesdeUltimaActividad >= INTERVALO_ACTUALIZACION_MINUTOS) {
      db.prepare(`
        UPDATE sesiones SET ultima_actividad = CURRENT_TIMESTAMP WHERE token_hash = ?
      `).run(tokenHash);
    }

    return {
      id: sesion.usuario_id,
      nombre: sesion.nombre,
      email: sesion.email,
      rol: sesion.rol
    };
  },

  /**
   * Cierra una sesión específica (elimina de BD).
   */
  cerrarSesion(token: string): void {
    const tokenHash = hashearToken(token);
    db.prepare('DELETE FROM sesiones WHERE token_hash = ?').run(tokenHash);
  },

  /**
   * Lista todas las sesiones activas de un usuario.
   */
  listarSesionesActivas(usuarioId: number): Sesion[] {
    const ahora = Date.now();
    const fechaLimite = new Date(ahora - DURACION_SESION_DIAS * 24 * 60 * 60 * 1000)
      .toISOString();

    return db.prepare(`
      SELECT * FROM sesiones
      WHERE usuario_id = ? AND creada_en >= ?
      ORDER BY ultima_actividad DESC
    `).all(usuarioId, fechaLimite) as Sesion[];
  },

  /**
   * Cierra todas las sesiones de un usuario excepto la actual.
   */
  cerrarTodasLasSesionesExcepto(usuarioId: number, tokenActual: string): number {
    const tokenHashActual = hashearToken(tokenActual);
    const resultado = db.prepare(`
      DELETE FROM sesiones
      WHERE usuario_id = ? AND token_hash != ?
    `).run(usuarioId, tokenHashActual);

    return resultado.changes;
  },

  /**
   * Cierra TODAS las sesiones de un usuario (útil tras cambio de contraseña).
   */
  cerrarTodasLasSesiones(usuarioId: number): number {
    const resultado = db.prepare(`
      DELETE FROM sesiones WHERE usuario_id = ?
    `).run(usuarioId);

    return resultado.changes;
  },

  /**
   * Limpia sesiones expiradas (mantenimiento).
   */
  limpiarSesionesExpiradas(): number {
    const ahora = Date.now();
    const fechaLimite = new Date(ahora - DURACION_SESION_DIAS * 24 * 60 * 60 * 1000)
      .toISOString();

    const resultado = db.prepare(`
      DELETE FROM sesiones WHERE creada_en < ?
    `).run(fechaLimite);

    return resultado.changes;
  },

  /**
   * Lista las sesiones activas marcando cuál corresponde al token en uso.
   */
  listarSesionesConActual(
    usuarioId: number,
    tokenActual: string | null
  ): Array<Sesion & { es_actual: boolean }> {
    const sesiones = this.listarSesionesActivas(usuarioId);
    const hashActual = tokenActual ? hashearToken(tokenActual) : null;
    return sesiones.map(sesion => ({
      ...sesion,
      es_actual: hashActual !== null && sesion.token_hash === hashActual
    }));
  },

  /**
   * Cierra una sesión por su ID, verificando que pertenezca al usuario.
   * La doble condición en el WHERE es la garantía de seguridad:
   * nadie puede cerrar sesiones ajenas aunque conozca el ID.
   */
  cerrarSesionPorId(sesionId: number, usuarioId: number): void {
    db.prepare('DELETE FROM sesiones WHERE id = ? AND usuario_id = ?').run(sesionId, usuarioId);
  }
};