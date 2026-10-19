import crypto from 'node:crypto';
import db from '../database';

export interface WebhookConfig {
  id: number;
  url: string;
  eventos: string[];
  activa: number;
}

export const webhooksService = {
  /**
   * Genera un secreto aleatorio para firmar las entregas de este webhook.
   */
  generarSecreto(): string {
    return 'whsec_' + crypto.randomBytes(24).toString('hex');
  },

  /**
   * Crea un nuevo webhook configurado.
   */
  crear(
    url: string,
    eventos: string[],
    creadoPor: number
  ): { id: number; secreto: string } {
    const secreto = this.generarSecreto();
    const res = db.prepare(`
      INSERT INTO webhooks (url, secreto, eventos, creada_por)
      VALUES (?, ?, ?, ?)
    `).run(url, secreto, eventos.join(','), creadoPor);
    return { id: res.lastInsertRowid as number, secreto };
  },

  /**
  * Lista todos los webhooks configurados (sin mostrar el secreto).
  */
  listar(): Array<WebhookConfig & { creada_en: string }> {
    const filas = db.prepare(`
      SELECT id, url, eventos, activa, creada_en
      FROM webhooks
      ORDER BY creada_en DESC
    `).all() as Array<{
      id: number;
      url: string;
      eventos: string;
      activa: number;
      creada_en: string;
    }>;

    return filas.map(fila => ({
      ...fila,
      eventos: fila.eventos.split(',').filter(Boolean)
    }));
  },

  /**
   * Actualiza la configuración de un webhook.
   */
  actualizar(id: number, url: string, eventos: string[], activa: number): void {
    db.prepare(`
      UPDATE webhooks
      SET url = ?, eventos = ?, activa = ?
      WHERE id = ?
    `).run(url, eventos.join(','), activa, id);
  },

  /**
   * Elimina un webhook y todas sus entregas pendientes.
   */
  eliminar(id: number): void {
    db.prepare('DELETE FROM webhooks WHERE id = ?').run(id);
  },

  /**
   * Dispara un evento: busca todos los webhooks suscritos y encola una entrega para cada uno.
   */
  dispararEvento(evento: string, payload: any): void {
    const webhooks = db.prepare(`
      SELECT id, eventos FROM webhooks WHERE activa = 1
    `).all() as Array<{ id: number; eventos: string }>;

    const suscritos = webhooks.filter(w => {
      const eventosArray = w.eventos.split(',').map(e => e.trim());
      return eventosArray.includes(evento) || eventosArray.includes('*');
    });

    if (suscritos.length === 0) return;

    const payloadStr = JSON.stringify(payload);
    const stmt = db.prepare(`
      INSERT INTO webhook_entregas (webhook_id, evento, payload, estado, proximo_intento_en)
      VALUES (?, ?, ?, 'pendiente', CURRENT_TIMESTAMP)
    `);

    const transaction = db.transaction(() => {
      for (const webhook of suscritos) {
        stmt.run(webhook.id, evento, payloadStr);
      }
    });

    transaction();
  }
};