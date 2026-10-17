import { fail, redirect } from '@sveltejs/kit';
import { sesionesService } from '$lib/server/services/sesiones.service';
import { auditoriaService } from '$lib/server/services/auditoria.service';
import { describirDispositivo } from '$lib/server/user-agent';
import type { PageServerLoad, Actions } from './$types';

export const load = (async ({ locals, cookies }) => {
  if (!locals.usuario) {
    throw redirect(303, '/login');
  }

  const token = cookies.get('sesion') ?? null;
  const sesiones = sesionesService.listarSesionesConActual(locals.usuario.id, token);

  return {
    sesiones: sesiones.map(sesion => ({
      id: sesion.id,
      es_actual: sesion.es_actual,
      ip: sesion.ip,
      creada_en: sesion.creada_en,
      ultima_actividad: sesion.ultima_actividad,
      dispositivo: describirDispositivo(sesion.user_agent)
    }))
  };
}) satisfies PageServerLoad;

export const actions = {
  cerrarSesion: async ({ request, locals, cookies, getClientAddress }) => {
    if (!locals.usuario) {
      throw redirect(303, '/login');
    }

    const data = await request.formData();
    const sesionId = parseInt(data.get('sesion_id')?.toString() || '0', 10);
    if (!sesionId) {
      return fail(400, { error: 'sesiones.errorInvalida' });
    }

    const token = cookies.get('sesion') ?? null;
    const sesiones = sesionesService.listarSesionesConActual(locals.usuario.id, token);
    const objetivo = sesiones.find(s => s.id === sesionId);

    if (!objetivo) {
      return fail(404, { error: 'sesiones.errorInvalida' });
    }

    sesionesService.cerrarSesionPorId(sesionId, locals.usuario.id);

    auditoriaService.registrar({
      usuarioId: locals.usuario.id,
      accion: 'sesion_cerrada',
      tabla: 'sesiones',
      registroId: sesionId,
      detalles: {
        dispositivo: describirDispositivo(objetivo.user_agent),
        ipOrigen: objetivo.ip,
        eraSesionActual: objetivo.es_actual
      },
      ip: getClientAddress()
    });

    // Si cerró su propia sesión, sale del sistema
    if (objetivo.es_actual) {
      cookies.delete('sesion', { path: '/' });
      throw redirect(303, '/login');
    }

    return { success: 'sesion_cerrada' };
  },

  cerrarOtras: async ({ locals, cookies, getClientAddress }) => {
    if (!locals.usuario) {
      throw redirect(303, '/login');
    }

    const token = cookies.get('sesion');
    if (!token) {
      throw redirect(303, '/login');
    }

    const cerradas = sesionesService.cerrarTodasLasSesionesExcepto(locals.usuario.id, token);

    auditoriaService.registrar({
      usuarioId: locals.usuario.id,
      accion: 'sesiones_cierre_masivo',
      tabla: 'sesiones',
      detalles: { cantidadCerrada: cerradas },
      ip: getClientAddress()
    });

    return { success: 'sesiones_masivo', cerradas };
  }
} satisfies Actions;