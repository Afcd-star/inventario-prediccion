import { redirect } from '@sveltejs/kit';
import { transferenciasService } from '$lib/server/services/transferencias.service';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals }) => {
  if (!locals.usuario) {
    throw redirect(303, '/login');
  }

  const transferencias = transferenciasService.obtenerActivas();
  
  return { transferencias };
}) satisfies PageServerLoad;