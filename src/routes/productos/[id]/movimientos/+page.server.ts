import db from '$lib/server/database';
import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import type { Producto } from '$lib/types';
import { movimientosService } from '$lib/server/movimientos.service';

export const load = (async ({ params }) => {
  const producto = db
    .prepare('SELECT * FROM productos WHERE id = ?')
    .get(Number(params.id)) as Producto | undefined;

  if (!producto) {
    throw redirect(303, '/productos');
  }

  const movimientos = movimientosService.obtenerPorProducto(producto.id);

  return { producto, movimientos };
}) satisfies PageServerLoad;

export const actions = {
  registrar: async ({ request }) => {
    const data = await request.formData();
    const producto_id = parseInt(data.get('producto_id')?.toString() || '0');
    const tipo = data.get('tipo')?.toString();
    const cantidad = parseInt(data.get('cantidad')?.toString() || '0');
    const notas = data.get('notas')?.toString();

    if (!producto_id || !tipo || cantidad <= 0) {
      return fail(400, { error: 'Datos inválidos' });
    }

    if (tipo !== 'entrada' && tipo !== 'salida') {
      return fail(400, { error: 'Tipo de movimiento inválido' });
    }

    try {
      movimientosService.registrar({ producto_id, tipo: tipo as 'entrada' | 'salida', cantidad, notas });
    } catch (error) {
      return fail(400, { error: (error as Error).message });
    }

    throw redirect(303, `/productos/${producto_id}/movimientos`);
  }
} satisfies Actions;