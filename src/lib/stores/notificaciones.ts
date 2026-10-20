import { writable, derived } from 'svelte/store';

// Store para el contador de no leídas
export const contadorNoLeidas = writable<number>(0);

// Store derivado: true si hay notificaciones sin leer
export const hayNotificaciones = derived(contadorNoLeidas, $contador => $contador > 0);

let eventSource: EventSource | null = null;

/**
 * Inicia la conexión SSE.
 * Se llama desde el layout cuando hay un usuario logueado.
 */
export function iniciarSSE() {
  // Si ya existe, no duplicar
  if (eventSource) return;

  eventSource = new EventSource('/api/notificaciones/stream');

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (typeof data.contador === 'number') {
        contadorNoLeidas.set(data.contador);
      }
    } catch (e) {
      console.error('Error al parsear evento SSE:', e);
    }
  };

  eventSource.onerror = (error) => {
    // EventSource se reconecta automáticamente, pero si la sesión expiró (401),
    // debemos cerrarlo para no saturar con reintentos inútiles.
    if (eventSource?.readyState === EventSource.CLOSED) {
      console.warn('SSE cerrado permanentemente (probablemente sesión expirada)');
      eventSource = null;
      contadorNoLeidas.set(0);
    } else {
      console.warn('Conexión SSE perdida, EventSource se reconectará automáticamente');
    }
  };
}

/**
 * Cierra la conexión SSE (al hacer logout).
 */
export function detenerSSE() {
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
  contadorNoLeidas.set(0);
}