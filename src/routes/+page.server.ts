import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals }) => {
  // Si no hay usuario logueado, ir al login
  if (!locals.usuario) {
    throw redirect(303, '/login');
  }
  // Si hay usuario, ir al dashboard
  throw redirect(303, '/dashboard');
}) satisfies PageServerLoad;