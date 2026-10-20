import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, request }) => {
  // 1. Validar sesión
  if (!locals.usuario) {
    return new Response('No autorizado', {
      status: 401,
      headers: { 'Content-Type': 'text/plain' }
    });
  }

  const usuarioId = locals.usuario.id;

  // 2. Import dinámico para evitar circularidad
  const { notificacionesService } = await import('$lib/server/services/notificaciones.service');

  // 3. Headers SSE
  const headers = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no' // Para nginx, si algún día usas proxy
  });

  // 4. Stream con manejo correcto de desconexión
  const encoder = new TextEncoder();
  let intervalo: ReturnType<typeof setInterval> | null = null;
  let ultimoConteo = notificacionesService.contarNoLeidas(usuarioId);

  const stream = new ReadableStream({
    start(controller) {
      // Enviar estado inicial
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ contador: ultimoConteo })}\n\n`)
      );

      // Polling ligero cada 5 segundos
      intervalo = setInterval(() => {
        const nuevoConteo = notificacionesService.contarNoLeidas(usuarioId);
        if (nuevoConteo !== ultimoConteo) {
          ultimoConteo = nuevoConteo;
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ contador: nuevoConteo })}\n\n`)
          );
        }
      }, 5000);

      // 5. Detectar desconexión del cliente y limpiar recursos
      // El AbortSignal del request se dispara cuando el cliente cierra la conexión
      const signal = request.signal;
      if (signal) {
        signal.addEventListener('abort', () => {
          if (intervalo) {
            clearInterval(intervalo);
            intervalo = null;
          }
          try {
            controller.close();
          } catch {
            // El stream ya puede estar cerrado, ignorar
          }
        });
      }
    },
    cancel() {
      // Cleanup adicional si el stream se cancela por otra razón
      if (intervalo) {
        clearInterval(intervalo);
        intervalo = null;
      }
    }
  });

  return new Response(stream, { headers });
};