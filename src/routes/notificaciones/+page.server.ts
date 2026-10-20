import { redirect, fail } from '@sveltejs/kit';
import { notificacionesService } from '$lib/server/services/notificaciones.service';
import { auditoriaService } from '$lib/server/services/auditoria.service';
import type { PageServerLoad, Actions } from './$types';
import type { TipoNotificacion } from '$lib/types';

export const load = (async ({ locals, url }) => {
  if (!locals.usuario) {
    throw redirect(303, '/login');
  }

  const pagina = Number(url.searchParams.get('pagina')) || 1;
  const tipo = (url.searchParams.get('tipo') as TipoNotificacion) || undefined;
  const leidaParam = url.searchParams.get('leida');
  const leida = leidaParam === null ? undefined : leidaParam === 'true';

  const resultado = notificacionesService.listarConFiltros(locals.usuario.id, {
    pagina,
    tipo,
    leida
  });

  const contador = notificacionesService.contarNoLeidas(locals.usuario.id);

  return {
    notificaciones: resultado.notificaciones,
    total: resultado.total,
    pagina: resultado.pagina,
    totalPaginas: resultado.totalPaginas,
    contadorNoLeidas: contador,
    filtros: { tipo, leida }
  };
}) satisfies PageServerLoad;

export const actions = {
  marcarLeida: async ({ request, locals, getClientAddress }) => {
    if (!locals.usuario) throw fail(401);
    const data = await request.formData();
    const id = Number(data.get('id'));
    notificacionesService.marcarLeida(id, locals.usuario.id);
    return { success: true };
  },

  marcarTodasLeidas: async ({ locals }) => {
    if (!locals.usuario) throw fail(401);
    notificacionesService.marcarTodasLeidas(locals.usuario.id);
    auditoriaService.registrar({
      usuarioId: locals.usuario.id,
      accion: 'notificaciones_marcar_todas_leidas',
      tabla: 'notificaciones',
      detalles: {},
      ip: 'web'
    });
    return { success: true };
  },

  eliminarLeidas: async ({ locals }) => {
    if (!locals.usuario) throw fail(401);
    notificacionesService.eliminarLeidas(locals.usuario.id);
    auditoriaService.registrar({
      usuarioId: locals.usuario.id,
      accion: 'notificaciones_eliminar_leidas',
      tabla: 'notificaciones',
      detalles: {},
      ip: 'web'
    });
    return { success: true };
  },

  eliminarUna: async ({ request, locals }) => {
    if (!locals.usuario) throw fail(401);
    const data = await request.formData();
    const id = Number(data.get('id'));
    notificacionesService.eliminar(id, locals.usuario.id);
    return { success: true };
  }
} satisfies Actions;