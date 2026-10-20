import { json } from '@sveltejs/kit';
import { revisarLotesPorVencer } from '$lib/server/services/notificaciones-disparadores';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals }) => {
  if (!locals.usuario || locals.usuario.rol !== 'admin') {
    return json({ error: 'No autorizado' }, { status: 403 });
  }

  revisarLotesPorVencer();
  return json({ success: true });
};