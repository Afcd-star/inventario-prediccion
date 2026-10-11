import { redirect } from '@sveltejs/kit';
import db from '$lib/server/database';
import type { PageServerLoad } from './$types';
import type { Producto } from '$lib/types';

export const load = (async ({ params, locals }) => {
  if (!locals.usuario) {
    throw redirect(303, '/login');
  }

  const producto = db.prepare(
    'SELECT * FROM productos WHERE id = ?'
  ).get(params.id) as Producto | undefined;
  
  if (!producto) {
    throw redirect(303, '/productos');
  }

  return { producto };
}) satisfies PageServerLoad;