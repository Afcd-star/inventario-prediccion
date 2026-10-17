import * as OTPAuth from 'otpauth';
import * as QRCode from 'qrcode';
import crypto from 'node:crypto';
import db from '../database';

const EMISOR = 'StockPredict Pro';
const DIGITOS = 6;
const PERIODO = 30;
const VENTANA_VERIFICACION = 1; // acepta el código actual + el anterior y el siguiente (±30s)

export interface DatosActivacion2FA {
  secreto: string;
  uri: string;
  qrDataUrl: string;
  codigosRecuperacion: string[];
}

export const totpService = {
  /**
   * Genera un nuevo secreto TOTP base32.
   */
  generarSecreto(): string {
    return new OTPAuth.Secret({ size: 20 }).base32;
  },

  /**
   * Construye el URI otpauth:// que las apps autenticadoras escanean.
   */
  generarURI(email: string, secreto: string): string {
    const totp = new OTPAuth.TOTP({
      issuer: EMISOR,
      label: email,
      algorithm: 'SHA1',
      digits: DIGITOS,
      period: PERIODO,
      secret: OTPAuth.Secret.fromBase32(secreto)
    });
    return totp.toString();
  },

  /**
   * Genera el código QR como data URL para mostrar en el navegador.
   */
  async generarQR(uri: string): Promise<string> {
    return QRCode.toDataURL(uri, {
      width: 256,
      margin: 2,
      color: { dark: '#111827', light: '#ffffff' }
    });
  },

  /**
   * Verifica un código TOTP contra un secreto.
   * Retorna true si el código es válido (dentro de la ventana de tiempo).
   */
  verificarCodigo(secreto: string, codigo: string): boolean {
    const totp = new OTPAuth.TOTP({
      issuer: EMISOR,
      label: '',
      algorithm: 'SHA1',
      digits: DIGITOS,
      period: PERIODO,
      secret: OTPAuth.Secret.fromBase32(secreto)
    });
    const delta = totp.validate({ token: codigo, window: VENTANA_VERIFICACION });
    return delta !== null;
  },

  /**
   * Genera 10 códigos de recuperación de un solo uso, formato XXXX-XXXX.
   */
  generarCodigosRecuperacion(): string[] {
    const codigos: string[] = [];
    for (let i = 0; i < 10; i++) {
      const bytes = crypto.randomBytes(4).toString('hex').toUpperCase();
      codigos.push(`${bytes.slice(0, 4)}-${bytes.slice(4, 8)}`);
    }
    return codigos;
  },

  /**
   * Hashea un código de recuperación (SHA-256) para almacenarlo de forma segura.
   */
  hashCodigo(codigo: string): string {
    return crypto
      .createHash('sha256')
      .update(codigo.toLowerCase().replace(/-/g, ''))
      .digest('hex');
  },

  /**
   * Guarda los códigos de recuperación hasheados para un usuario.
   * Elimina primero los códigos anteriores no usados (rotación por seguridad).
   */
  guardarCodigosRecuperacion(usuarioId: number, codigos: string[]): void {
    const stmt = db.prepare('INSERT INTO codigos_recuperacion (usuario_id, hash) VALUES (?, ?)');
    const transaction = db.transaction(() => {
      db.prepare('DELETE FROM codigos_recuperacion WHERE usuario_id = ? AND usado = 0').run(usuarioId);
      for (const codigo of codigos) {
        stmt.run(usuarioId, this.hashCodigo(codigo));
      }
    });
    transaction();
  },

  /**
   * Verifica un código de recuperación y lo marca como usado.
   * Retorna true si el código era válido y no había sido usado.
   */
  verificarCodigoRecuperacion(usuarioId: number, codigo: string): boolean {
    const hash = this.hashCodigo(codigo);
    const fila = db.prepare(
      'SELECT id FROM codigos_recuperacion WHERE usuario_id = ? AND hash = ? AND usado = 0'
    ).get(usuarioId, hash) as { id: number } | undefined;

    if (!fila) return false;

    db.prepare('UPDATE codigos_recuperacion SET usado = 1 WHERE id = ?').run(fila.id);
    return true;
  },

  /**
   * Activa el 2FA para un usuario: guarda el secreto y marca como activado.
   */
  activar(usuarioId: number, secreto: string): void {
    db.prepare(
      'UPDATE usuarios SET totp_secreto = ?, totp_activado = 1 WHERE id = ?'
    ).run(secreto, usuarioId);
  },

  /**
   * Desactiva el 2FA: borra el secreto, desactiva el flag y elimina códigos de recuperación.
   */
  desactivar(usuarioId: number): void {
    const transaction = db.transaction(() => {
      db.prepare('UPDATE usuarios SET totp_secreto = NULL, totp_activado = 0 WHERE id = ?').run(usuarioId);
      db.prepare('DELETE FROM codigos_recuperacion WHERE usuario_id = ?').run(usuarioId);
    });
    transaction();
  },

  /**
   * Retorna true si el usuario tiene el 2FA activado.
   */
  estaActivado(usuarioId: number): boolean {
    const fila = db.prepare(
      'SELECT totp_activado FROM usuarios WHERE id = ?'
    ).get(usuarioId) as { totp_activado: number } | undefined;
    return fila?.totp_activado === 1;
  },

  /**
   * Obtiene el secreto TOTP de un usuario (solo para verificación durante login).
   */
  obtenerSecreto(usuarioId: number): string | null {
    const fila = db.prepare(
      'SELECT totp_secreto FROM usuarios WHERE id = ?'
    ).get(usuarioId) as { totp_secreto: string | null } | undefined;
    return fila?.totp_secreto ?? null;
  },

  /**
   * Cuenta los códigos de recuperación no usados de un usuario.
   */
  contarCodigosDisponibles(usuarioId: number): number {
    const fila = db.prepare(
      'SELECT COUNT(*) AS total FROM codigos_recuperacion WHERE usuario_id = ? AND usado = 0'
    ).get(usuarioId) as { total: number };
    return fila.total;
  },

    // --- Token temporal para flujo de 2FA ---
  generarTokenTemporal(usuarioId: number): string {
    const payload = `${usuarioId}:${Date.now()}`;
    const firma = crypto
      .createHmac('sha256', process.env.TEMP_TOKEN_SECRET ?? 'stockpredict-temp-secret-dev')
      .update(payload)
      .digest('hex');
    return `${payload}.${firma}`;
  },

  verificarTokenTemporal(token: string): number | null {
    const partes = token.split('.');
    if (partes.length !== 2) return null;
    const [payload, firma] = partes;
    const esperado = crypto
      .createHmac('sha256', process.env.TEMP_TOKEN_SECRET ?? 'stockpredict-temp-secret-dev')
      .update(payload)
      .digest('hex');
    if (firma !== esperado) return null;
    const [usuarioIdStr, timestampStr] = payload.split(':');
    const timestamp = parseInt(timestampStr, 10);
    if (Date.now() - timestamp > 5 * 60 * 1000) return null; // 5 minutos
    return parseInt(usuarioIdStr, 10);
  }
};