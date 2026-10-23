import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals }) => {
  if (!locals.usuario || locals.usuario.rol !== 'admin') {
    throw redirect(303, '/productos');
  }
  return {};
}) satisfies PageServerLoad;