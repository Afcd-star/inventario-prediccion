import db from '../database';

const VENTANA_LOGIN_MINUTOS = 15;
const MAX_INTENTOS_LOGIN = 5;
const VENTANA_PASSWORD_MINUTOS = 60;
const MAX_CAMBIOS_PASSWORD = 3;

export const rateLimiterService = {
  /**
   * Registra un intento fallido para un tipo y clave dados.
   * clave = IP para login, ID de usuario para cambio de contraseña.
   */
  registrarIntento(tipo: 'login' | 'password', clave: string): void {
    db.prepare(`
      INSERT INTO intentos_fallidos (tipo, clave) VALUES (?, ?)
    `).run(tipo, clave);
  },

  contarIntentos(tipo: 'login' | 'password', clave: string, ventanaMinutos: number): number {
    const fila = db.prepare(`
      SELECT COUNT(*) AS total
      FROM intentos_fallidos
      WHERE tipo = ? AND clave = ? AND creada_en >= datetime('now', ?)
    `).get(tipo, clave, `-${ventanaMinutos} minutes`) as { total: number };
    return fila.total;
  },

  estaBloqueadoLogin(ip: string): boolean {
    return this.contarIntentos('login', ip, VENTANA_LOGIN_MINUTOS) >= MAX_INTENTOS_LOGIN;
  },

  estaBloqueadoCambioPassword(usuarioId: number): boolean {
    return this.contarIntentos('password', String(usuarioId), VENTANA_PASSWORD_MINUTOS) >= MAX_CAMBIOS_PASSWORD;
  },

  /**
   * Limpia intentos de un tipo y clave. Útil para pruebas y mantenimiento.
   */
  limpiarIntentos(tipo: 'login' | 'password', clave: string): void {
    db.prepare('DELETE FROM intentos_fallidos WHERE tipo = ? AND clave = ?').run(tipo, clave);
  }
};