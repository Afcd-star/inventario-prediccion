import { anomaliasService } from '$lib/server/services/anomalias.service';
import type { LayoutServerLoad } from './$types';


export const load = (async ({ locals }) => {
  return {
    usuario: locals.usuario,
    // Solo consultamos si hay sesión activa, para no tocar la BD en el login
    anomaliasPendientes: locals.usuario ? anomaliasService.contarPendientes() : 0
  };
}) satisfies LayoutServerLoad;