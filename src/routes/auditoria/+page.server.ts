import { redirect } from '@sveltejs/kit';
import db from '$lib/server/database';
import { auditoriaService } from '$lib/server/services/auditoria.service';
import type { PageServerLoad } from './$types';

export const load = (async ({ url, locals }) => {
  if (!locals.usuario) {
    throw redirect(303, '/login');
  }
  if (locals.usuario.rol !== 'admin') {
    throw redirect(303, '/dashboard');
  }

  const desde = url.searchParams.get('desde');
  const hasta = url.searchParams.get('hasta');
  const usuarioParam = url.searchParams.get('usuario');
  const accion = url.searchParams.get('accion');
  const paginaSolicitada = parseInt(url.searchParams.get('pagina') ?? '1', 10);
  const pagina = Number.isFinite(paginaSolicitada) && paginaSolicitada > 0 ? paginaSolicitada : 1;

  const resultado = auditoriaService.listar({
    desde,
    hasta,
    usuarioId: usuarioParam ? parseInt(usuarioParam, 10) : null,
    accion,
    pagina,
    porPagina: 50
  });

  return {
    ...resultado,
    filtros: {
      desde: desde ?? '',
      hasta: hasta ?? '',
      usuario: usuarioParam ?? '',
      accion: accion ?? ''
    },
    usuariosFiltro: db.prepare('SELECT id, nombre FROM usuarios ORDER BY nombre').all() as Array<{ id: number; nombre: string }>,
    accionesDisponibles: auditoriaService.listarAccionesDistintas()
  };
}) satisfies PageServerLoad;