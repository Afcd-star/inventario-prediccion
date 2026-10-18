import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { sesionesService } from '$lib/server/services/sesiones.service';
import { totpService } from '$lib/server/services/totp.service';
import { iniciarWorker } from '$lib/server/services/webhook-worker';

// Iniciar el worker de webhooks al cargar el servidor
iniciarWorker();

export const handle: Handle = async ({ event, resolve }) => {
  const token = event.cookies.get('sesion');
  const preSesion = event.cookies.get('pre_sesion');

  if (token) {
    const usuario = sesionesService.validarSesion(token);
    if (usuario) {
      event.locals.usuario = usuario;
    } else {
      event.cookies.delete('sesion', { path: '/' });
    }
  } else if (preSesion) {
    // Hay pre_sesión: verificar si es válida y exponer el usuario_id
    const usuarioId = totpService.verificarTokenTemporal(preSesion);
    if (usuarioId) {
      event.locals.preSesionUsuarioId = usuarioId;
    } else {
      event.cookies.delete('pre_sesion', { path: '/' });
    }
  }

  const esRutaApi = event.url.pathname.startsWith('/api/');
  const esRutaPublica =
    event.url.pathname === '/login' ||
    event.url.pathname === '/logout' ||
    event.url.pathname === '/2fa';

  // Si no hay usuario ni pre_sesión válida, redirigir a login
  if (!event.locals.usuario && !event.locals.preSesionUsuarioId && !esRutaApi && !esRutaPublica) {
    throw redirect(303, '/login');
  }

  // Si hay sesión real y el usuario va a /2fa, redirigir al dashboard
  if (event.locals.usuario && event.url.pathname === '/2fa') {
    throw redirect(303, '/dashboard');
  }

  const respuesta = await resolve(event);
  return respuesta;
};