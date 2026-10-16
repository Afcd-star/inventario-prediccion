import { redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { auditoriaService }  from '$lib/server/services/auditoria.service';

export const actions = {
  default: ({ locals, cookies, getClientAddress }) => {
    auditoriaService.registrar({
      usuarioId: locals.usuario?.id ?? null,
      accion: 'logout',
      ip: getClientAddress()
    });
    cookies.delete('sesion', { path: '/' });
    cookies.delete('sesion_servidor', { path: '/' });
    throw redirect(303, '/login');
  }
} satisfies Actions;