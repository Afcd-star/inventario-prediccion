import { anomaliasService } from '$lib/server/services/anomalias.service';
import type { LayoutServerLoad } from './$types';

export const load = (async ({ locals }) => {
  return {
    usuario: locals.usuario,
    preferencias: locals.preferencias ?? { idioma_preferido: 'es', tema_preferido: 'light' },
    anomaliasPendientes: locals.usuario ? anomaliasService.contarPendientes() : 0
  };
}) satisfies LayoutServerLoad;