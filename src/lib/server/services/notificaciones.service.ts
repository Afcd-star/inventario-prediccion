import db from '../database';
import webPush from 'web-push';
import type { Notificacion, TipoNotificacion } from '$lib/types';

export const notificacionesService = {
  /**
   * Crea una notificación para un usuario específico.
   * Verifica que el usuario tenga activada la preferencia para ese tipo de evento.
   */
  crear(
    usuarioId: number,
    tipo: TipoNotificacion,
    titulo: string,
    mensaje: string,
    metadata: any = null
  ): number | null {
    // Verificar preferencia del usuario
    const preferencia = db.prepare(`
      SELECT activa FROM preferencias_notificacion
      WHERE usuario_id = ? AND tipo_evento = ?
    `).get(usuarioId, tipo) as { activa: number } | undefined;

    // Si no existe la preferencia, se asume activa (default)
    // Si existe y está desactiva, no crear notificación
    if (preferencia && preferencia.activa === 0) {
      return null;
    }

    const result = db.prepare(`
      INSERT INTO notificaciones (usuario_id, tipo, titulo, mensaje, metadata)
      VALUES (?, ?, ?, ?, ?)
    `).run(usuarioId, tipo, titulo, mensaje, metadata ? JSON.stringify(metadata) : null);

    this.enviarPush(usuarioId, titulo, mensaje).catch(err => {
      console.error('Fallo en envío de Push (no crítico):', err);
    });
    
    return result.lastInsertRowid as number;
  },

  /**
   * Lista las notificaciones no leídas de un usuario (para el contador del navbar).
   */
  contarNoLeidas(usuarioId: number): number {
    const result = db.prepare(`
      SELECT COUNT(*) as total FROM notificaciones
      WHERE usuario_id = ? AND leida = 0
    `).get(usuarioId) as { total: number };
    return result.total;
  },

  /**
   * Lista las últimas N notificaciones no leídas (para el popover del navbar).
   */
  listarNoLeidas(usuarioId: number, limite: number = 5): Notificacion[] {
    return db.prepare(`
      SELECT * FROM notificaciones
      WHERE usuario_id = ? AND leida = 0
      ORDER BY creada_en DESC
      LIMIT ?
    `).all(usuarioId, limite) as Notificacion[];
  },

  /**
   * Lista notificaciones con filtros (para el panel completo).
   */
  listarConFiltros(
    usuarioId: number,
    opciones: {
      leida?: boolean;
      tipo?: TipoNotificacion;
      pagina?: number;
      limite?: number;
    } = {}
  ): { notificaciones: Notificacion[]; total: number; pagina: number; totalPaginas: number } {
    const pagina = opciones.pagina || 1;
    const limite = opciones.limite || 20;
    const offset = (pagina - 1) * limite;

    let whereClause = 'WHERE usuario_id = ?';
    const params: any[] = [usuarioId];

    if (opciones.leida !== undefined) {
      whereClause += ' AND leida = ?';
      params.push(opciones.leida ? 1 : 0);
    }

    if (opciones.tipo) {
      whereClause += ' AND tipo = ?';
      params.push(opciones.tipo);
    }

    const total = db.prepare(`
      SELECT COUNT(*) as total FROM notificaciones ${whereClause}
    `).get(...params) as { total: number };

    const notificaciones = db.prepare(`
      SELECT * FROM notificaciones ${whereClause}
      ORDER BY creada_en DESC
      LIMIT ? OFFSET ?
    `).all(...params, limite, offset) as Notificacion[];

    return {
      notificaciones,
      total: total.total,
      pagina,
      totalPaginas: Math.ceil(total.total / limite)
    };
  },

  /**
   * Marca una notificación como leída.
   */
  marcarLeida(id: number, usuarioId: number): void {
    db.prepare(`
      UPDATE notificaciones SET leida = 1
      WHERE id = ? AND usuario_id = ?
    `).run(id, usuarioId);
  },

  /**
   * Marca todas las notificaciones de un usuario como leídas.
   */
  marcarTodasLeidas(usuarioId: number): void {
    db.prepare(`
      UPDATE notificaciones SET leida = 1
      WHERE usuario_id = ? AND leida = 0
    `).run(usuarioId);
  },

  /**
   * Elimina una notificación específica.
   */
  eliminar(id: number, usuarioId: number): void {
    db.prepare(`
      DELETE FROM notificaciones
      WHERE id = ? AND usuario_id = ?
    `).run(id, usuarioId);
  },

  /**
   * Elimina todas las notificaciones leídas de un usuario.
   */
  eliminarLeidas(usuarioId: number): void {
    db.prepare(`
      DELETE FROM notificaciones
      WHERE usuario_id = ? AND leida = 1
    `).run(usuarioId);
  },

  /**
   * Limpia notificaciones leídas con más de 30 días (job de mantenimiento).
   */
  limpiarAntiguas(): number {
    const result = db.prepare(`
      DELETE FROM notificaciones
      WHERE leida = 1 AND creada_en < datetime('now', '-30 days')
    `).run();
    return result.changes;
  },

  /**
   * Obtiene las preferencias de notificación de un usuario.
   */
  obtenerPreferencias(usuarioId: number): Map<TipoNotificacion, boolean> {
    const filas = db.prepare(`
      SELECT tipo_evento, activa FROM preferencias_notificacion
      WHERE usuario_id = ?
    `).all(usuarioId) as Array<{ tipo_evento: TipoNotificacion; activa: number }>;

    const preferencias = new Map<TipoNotificacion, boolean>();
    for (const fila of filas) {
      preferencias.set(fila.tipo_evento, fila.activa === 1);
    }
    return preferencias;
  },

  /**
   * Actualiza una preferencia de notificación.
   */
  actualizarPreferencia(
    usuarioId: number,
    tipoEvento: TipoNotificacion,
    activa: boolean
  ): void {
    db.prepare(`
      INSERT INTO preferencias_notificacion (usuario_id, tipo_evento, activa)
      VALUES (?, ?, ?)
      ON CONFLICT(usuario_id, tipo_evento) DO UPDATE SET activa = excluded.activa
    `).run(usuarioId, tipoEvento, activa ? 1 : 0);
  },

  /**
   * Envía una notificación Web Push a todas las suscripciones del usuario.
   * (Se llama asíncronamente desde crear() para no bloquear)
   */
  async enviarPush(usuarioId: number, titulo: string, mensaje: string): Promise<void> {
    // Verificar que las variables de entorno estén configuradas
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      console.warn('Web Push: Faltan claves VAPID en .env');
      return;
    }

    // Configurar VAPID (solo la primera vez)
    webPush.setVapidDetails(
      process.env.VAPID_SUBJECT || 'mailto:admin@stockpredict.com',
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );

    // Obtener todas las suscripciones del usuario
    const suscripciones = db.prepare(`
      SELECT endpoint, p256dh, auth FROM push_suscripciones WHERE usuario_id = ?
    `).all(usuarioId) as Array<{ endpoint: string; p256dh: string; auth: string }>;

    if (suscripciones.length === 0) {
      return; // El usuario no tiene suscripciones push
    }

    const payload = JSON.stringify({
      title: titulo,
      body: mensaje,
      url: '/notificaciones'
    });

    // Enviar a cada suscripción
    for (const sub of suscripciones) {
      try {
        await webPush.sendNotification(
          { 
            endpoint: sub.endpoint, 
            keys: { 
              p256dh: sub.p256dh, 
              auth: sub.auth 
            } 
          },
          payload
        );
      } catch (error: any) {
        // Si la suscripción expiró (410 Gone), la eliminamos de la BD
        if (error.statusCode === 410) {
          db.prepare('DELETE FROM push_suscripciones WHERE endpoint = ?').run(sub.endpoint);
          console.log(`Suscripción push obsoleta eliminada para usuario ${usuarioId}`);
        } else {
          console.error(`Error enviando push al usuario ${usuarioId}:`, error);
        }
      }
    }
  }
};

