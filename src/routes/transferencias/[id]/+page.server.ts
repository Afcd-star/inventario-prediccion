import { fail, redirect } from '@sveltejs/kit';
import { transferenciasService } from '$lib/server/services/transferencias.service';
import type { PageServerLoad, Actions } from './$types';

export const load = (async ({ params, locals }) => {
  if (!locals.usuario) throw redirect(303, '/login');

  const transferencia = transferenciasService.obtenerDetalles(Number(params.id));
  if (!transferencia) {
    throw redirect(303, '/transferencias');
  }

  return { transferencia };
}) satisfies PageServerLoad;

export const actions = {
  completar: async ({ params, request, locals, getClientAddress }) => {
    if (!locals.usuario) throw fail(401);

    const data = await request.formData();
    const itemsRecibidos = [];
    
    // Extraer cantidades recibidas del formulario
    for (const [key, value] of data.entries()) {
      if (key.startsWith('recibido_')) {
        const itemId = Number(key.replace('recibido_', ''));
        const cantidad = Number(value);
        if (cantidad > 0) {
          itemsRecibidos.push({ item_id: itemId, cantidad_recibida: cantidad });
        }
      }
    }

    try {
      transferenciasService.completar(Number(params.id), locals.usuario.id, getClientAddress(), itemsRecibidos);
      return { success: 'transferencias.completada' };
    } catch (e: any) {
      return fail(400, { error: e.message || 'transferencias.errorInterno' });
    }
  },

  cancelar: async ({ params, locals, getClientAddress }) => {
    if (!locals.usuario) throw fail(401);

    try {
      transferenciasService.cancelar(Number(params.id), locals.usuario.id, getClientAddress());
      return { success: 'transferencias.cancelada' };
    } catch (e: any) {
      return fail(400, { error: e.message || 'transferencias.errorInterno' });
    }
  }
} satisfies Actions;