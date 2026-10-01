import db from '$lib/server/database';
import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import type { Producto } from '$lib/types';

// 'satisfies' asegura que el retorno coincida con PageServerLoad y genera los tipos correctos
export const load = (async ({ params }) => {
  const producto = db
    .prepare('SELECT * FROM productos WHERE id = ?')
    .get(Number(params.id)) as Producto | undefined;
    
  return { producto: producto ?? null };
}) satisfies PageServerLoad;

export const actions = {
  editar: async ({ request, params }) => {
    const data = await request.formData();
    const nombre = data.get('nombre')?.toString();
    const precio = parseFloat(data.get('precio')?.toString() || '0');
    const stock = parseInt(data.get('stock')?.toString() || '0');
    const minimo = parseInt(data.get('minimo')?.toString() || '10');

    if (!nombre || precio < 0) {
      return fail(400, { error: 'Nombre y precio válido son obligatorios' });
    }

    db.prepare(`
      UPDATE productos 
      SET nombre = ?, precio = ?, stock_actual = ?, stock_minimo = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(nombre, precio, stock, minimo, Number(params.id));

    throw redirect(303, '/productos');
  }
} satisfies Actions;