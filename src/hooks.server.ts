import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import db from '$lib/server/database';
import { serverInstanceId } from '$lib/server/session';

export const handle: Handle = async ({ event, resolve }) => {
  const sesionId = event.cookies.get('sesion');
  const sesionServidor = event.cookies.get('sesion_servidor');

  if (sesionId && sesionServidor === serverInstanceId) {
    const usuario = db.prepare(
      'SELECT id, nombre, email, rol FROM usuarios WHERE id = ?'
    ).get(sesionId) as { id: number; nombre: string; email: string; rol: 'admin' | 'empleado' } | undefined;

    if (usuario) {
      event.locals.usuario = usuario;
    } else {
      event.cookies.delete('sesion', { path: '/' });
      event.cookies.delete('sesion_servidor', { path: '/' });
    }
  } else if (sesionId || sesionServidor) {
    event.cookies.delete('sesion', { path: '/' });
    event.cookies.delete('sesion_servidor', { path: '/' });
  }

  const esRutaApi = event.url.pathname.startsWith('/api/');
  const esRutaPublica = event.url.pathname === '/login' || event.url.pathname === '/logout';

  if (!event.locals.usuario && !esRutaApi && !esRutaPublica) {
    throw redirect(303, '/login');
  }

  const respuesta = await resolve(event);
  return respuesta;
};