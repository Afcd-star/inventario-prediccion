import { redirect } from '@sveltejs/kit';
import { sugerenciasService } from '$lib/server/services/sugerencias.service';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals }) => {
  if (!locals.usuario) throw redirect(303, '/login');

  // Read-only: sin actions. La vista muestra sugerencias calculadas on-the-fly por el motor.
  const sugerencias = sugerenciasService.obtenerSugerencias();

  return { sugerencias, rol: locals.usuario.rol };
}) satisfies PageServerLoad;