import { redirect } from '@sveltejs/kit';
import { sesionesService } from '$lib/server/services/sesiones.service';
import { auditoriaService } from '$lib/server/services/auditoria.service';
import type { Actions } from './$types';

export const actions = {
  default: ({ locals, cookies, getClientAddress, request }) => {
    const token = cookies.get('sesion');

    auditoriaService.registrar({
      usuarioId: locals.usuario?.id ?? null,
      accion: 'logout',
      ip: getClientAddress()
    });

    // Eliminar sesión de la base de datos
    if (token) {
      sesionesService.cerrarSesion(token);
    }

    cookies.delete('sesion', { path: '/' });
    throw redirect(303, '/login');
  }
} satisfies Actions;