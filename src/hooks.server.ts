import type { Handle } from '@sveltejs/kit';
import db from '$lib/server/database';

export const handle: Handle = async ({ event, resolve }) => {
  const sesionId = event.cookies.get('sesion');

  if (sesionId) {
    const usuario = db.prepare(
      'SELECT id, nombre, email, rol FROM usuarios WHERE id = ?'
    ).get(sesionId) as { id: number; nombre: string; email: string; rol: 'admin' | 'empleado' } | undefined;

    if (usuario) {
      event.locals.usuario = usuario;
    } else {
      event.cookies.delete('sesion', { path: '/' });
    }
  }

  const respuesta = await resolve(event);
  return respuesta;
};