import crypto from 'node:crypto';
import db from '../database';

const MAX_INTENTOS = 5;
const INTERVALO_MS = 10000; // 10 segundos
const TIMEOUT_MS = 5000; // 5 segundos para la petición HTTP

// Tiempos de espera entre reintentos (en milisegundos)
const ESPERAS_REINTENTO = [
  30 * 1000,        // 30 segundos
  5 * 60 * 1000,    // 5 minutos
  30 * 60 * 1000,   // 30 minutos
  2 * 60 * 60 * 1000, // 2 horas
  24 * 60 * 60 * 1000 // 24 horas
];

let workerActivo = false;
let intervalo: NodeJS.Timeout | null = null;

/**
 * Firma el payload con HMAC-SHA256 usando el secreto del webhook.
 */
function firmarPayload(payload: string, secreto: string): string {
  const firma = crypto.createHmac('sha256', secreto).update(payload).digest('hex');
  return `sha256=${firma}`;
}

/**
 * Procesa una sola entrega pendiente.
 */
async function procesarEntrega(entrega: any): Promise<void> {
  const webhook = db.prepare('SELECT url, secreto FROM webhooks WHERE id = ?').get(entrega.webhook_id) as { url: string; secreto: string } | undefined;
  if (!webhook) {
    // Webhook eliminado, marcar entrega como cancelada
    db.prepare("UPDATE webhook_entregas SET estado = 'cancelada' WHERE id = ?").run(entrega.id);
    return;
  }

  const firma = firmarPayload(entrega.payload, webhook.secreto);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Event': entrega.evento,
        'X-Webhook-Signature': firma,
        'X-Webhook-Id': String(entrega.id)
      },
      body: entrega.payload,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      db.prepare(`
        UPDATE webhook_entregas 
        SET estado = 'exitosa', completada_en = CURRENT_TIMESTAMP, ultima_respuesta = ?
        WHERE id = ?
      `).run(String(response.status), entrega.id);
    } else {
      manejarFallo(entrega, `HTTP ${response.status}: ${response.statusText}`);
    }
  } catch (error: any) {
    manejarFallo(entrega, error.message || 'Error de red');
  }
}

/**
 * Maneja un fallo: incrementa intentos y programa reintento o marca como fallida.
 */
function manejarFallo(entrega: any, mensajeError: string): void {
  const nuevosIntentos = entrega.intentos + 1;

  if (nuevosIntentos >= MAX_INTENTOS) {
    db.prepare(`
      UPDATE webhook_entregas 
      SET estado = 'fallida', intentos = ?, ultima_respuesta = ?
      WHERE id = ?
    `).run(nuevosIntentos, mensajeError, entrega.id);
  } else {
    const espera = ESPERAS_REINTENTO[nuevosIntentos - 1] || ESPERAS_REINTENTO[ESPERAS_REINTENTO.length - 1];
    const proximoIntento = new Date(Date.now() + espera).toISOString();
    db.prepare(`
      UPDATE webhook_entregas 
      SET intentos = ?, proximo_intento_en = ?, ultima_respuesta = ?
      WHERE id = ?
    `).run(nuevosIntentos, proximoIntento, mensajeError, entrega.id);
  }
}

/**
 * Procesa todas las entregas pendientes cuyo próximo intento ya venció.
 */
async function procesarCola(): Promise<void> {
  if (workerActivo) return; // Evitar ejecuciones paralelas
  workerActivo = true;

  try {
    const entregas = db.prepare(`
      SELECT id, webhook_id, evento, payload, intentos
      FROM webhook_entregas
      WHERE estado = 'pendiente' AND proximo_intento_en <= CURRENT_TIMESTAMP
      ORDER BY proximo_intento_en ASC
      LIMIT 10
    `).all();

    for (const entrega of entregas) {
      await procesarEntrega(entrega);
    }
  } catch (error) {
    console.error('Error en worker de webhooks:', error);
  } finally {
    workerActivo = false;
  }
}

/**
 * Inicia el worker que procesa la cola cada 10 segundos.
 */
export function iniciarWorker(): void {
  if (intervalo) return; // Ya está corriendo
  console.log('🚀 Worker de webhooks iniciado (procesando cada 10 segundos)');
  intervalo = setInterval(procesarCola, INTERVALO_MS);
  // Procesar inmediatamente al iniciar
  procesarCola();
}

/**
 * Detiene el worker (útil para pruebas o graceful shutdown).
 */
export function detenerWorker(): void {
  if (intervalo) {
    clearInterval(intervalo);
    intervalo = null;
    console.log('⏹️ Worker de webhooks detenido');
  }
}