import { json } from '@sveltejs/kit';
import { notificacionesService } from '$lib/server/services/notificaciones.service';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.usuario) {
    return json({ error: 'No autorizado' }, { status: 401 });
  }
  
  const recientes = notificacionesService.listarNoLeidas(locals.usuario.id, 5);
  return json(recientes);
};