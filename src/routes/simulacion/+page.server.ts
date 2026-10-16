import { fail, redirect } from '@sveltejs/kit';
import db from '$lib/server/database';
import { seriesTiempoService } from '$lib/server/services/series-tiempo.service';
import { escenariosService } from '$lib/server/services/escenarios.service';
import type { PageServerLoad, Actions } from './$types';

export const load = (async ({ url, locals }) => {
  if (!locals.usuario) {
    throw redirect(303, '/login');
  }

  const productos = db.prepare(
    'SELECT id, nombre FROM productos ORDER BY nombre'
  ).all() as Array<{ id: number; nombre: string }>;

  const parametro = url.searchParams.get('producto');
  const idSolicitado = parametro === null ? null : Number(parametro);
  const productoSeleccionado =
    parametro !== null && Number.isSafeInteger(idSolicitado)
      ? productos.find((producto) => producto.id === idSolicitado)?.id ?? null
      : null;

  const coeficientes = productoSeleccionado
    ? seriesTiempoService.obtenerCoeficientes(productoSeleccionado)
    : null;

  return {
    productos,
    productoSeleccionado,
    coeficientes,
    escenarios: escenariosService.listar()
  };
}) satisfies PageServerLoad;

export const actions = {
  guardarEscenario: async ({ request, locals }) => {
    if (!locals.usuario) {
      throw redirect(303, '/login');
    }

    const data = await request.formData();
    const nombre = data.get('nombre')?.toString()?.trim();
    const productoId = parseInt(data.get('producto_id')?.toString() || '0');
    const parametros = data.get('parametros')?.toString();
    const resultados = data.get('resultados')?.toString();

    if (!nombre || !productoId || !parametros || !resultados) {
      return fail(400, { error: 'Datos incompletos para guardar el escenario' });
    }

    escenariosService.guardar(
      nombre,
      productoId,
      JSON.parse(parametros),
      JSON.parse(resultados),
      locals.usuario.id
    );

    return { success: 'escenario_guardado' };
  },

  eliminarEscenario: async ({ request, locals }) => {
    if (!locals.usuario) {
      throw redirect(303, '/login');
    }

    const data = await request.formData();
    const id = parseInt(data.get('id')?.toString() || '0');

    if (!id) {
      return fail(400, { error: 'Escenario no válido' });
    }

    escenariosService.eliminar(id);
    return { success: 'escenario_eliminado' };
  }
} satisfies Actions;