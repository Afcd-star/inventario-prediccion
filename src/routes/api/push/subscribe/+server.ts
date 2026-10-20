import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import db from '$lib/server/database';

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.usuario) {
    return json({ error: 'No autorizado' }, { status: 401 });
  }

  const subscription = await request.json();

  try {
    db.prepare(`
      INSERT INTO push_suscripciones (usuario_id, endpoint, p256dh, auth)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(endpoint) DO UPDATE SET 
        p256dh = excluded.p256dh,
        auth = excluded.auth
    `).run(locals.usuario.id, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth);

    return json({ success: true });
  } catch (error) {
    console.error('Error guardando suscripción push:', error);
    return json({ error: 'Error interno' }, { status: 500 });
  }
};