import { fail, redirect } from '@sveltejs/kit';
import { anomaliasService } from '$lib/server/services/anomalias.service';
import type { PageServerLoad, Actions } from './$types';

export const load = (async ({ url, locals }) => {
  if (!locals.usuario) {
    throw redirect(303, '/login');
  }

  const estadosValidos = ['pendiente', 'revisada', 'falso_positivo', 'todas'];
  const parametro = url.searchParams.get('estado') ?? 'pendiente';
  const filtro = estadosValidos.includes(parametro) ? parametro : 'pendiente';

  return {
    filtro,
    anomalias: anomaliasService.listar(filtro === 'todas' ? undefined : filtro)
  };
}) satisfies PageServerLoad;

export const actions = {
  clasificar: async ({ request, locals }) => {
    if (!locals.usuario) {
      throw redirect(303, '/login');
    }

    const data = await request.formData();
    const id = parseInt(data.get('id')?.toString() || '0');
    const estado = data.get('estado')?.toString();

    if (!id || (estado !== 'revisada' && estado !== 'falso_positivo')) {
      return fail(400, { error: 'Datos inválidos para clasificar' });
    }

    anomaliasService.marcarEstado(id, estado, locals.usuario.id);
    return { success: 'anomalia_clasificada' };
  }
} satisfies Actions;