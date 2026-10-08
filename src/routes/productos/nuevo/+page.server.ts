import db from '$lib/server/database';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions = {
  crear: async ({ request }) => {
    const data = await request.formData();
    const nombre = data.get('nombre')?.toString();
    const precio = parseFloat(data.get('precio')?.toString() || '0');
    const stock = parseInt(data.get('stock')?.toString() || '0');
    const minimo = parseInt(data.get('minimo')?.toString() || '10');

    if (!nombre || precio < 0) {
      return fail(400, { error: 'Nombre y precio valido son obligatorios' });
    }

    db.prepare(`
      INSERT INTO productos (nombre, precio, stock_actual, stock_minimo)
      VALUES (?, ?, ?, ?)
    `).run(nombre, precio, stock, minimo);

    throw redirect(303, '/productos');
  }
} satisfies Actions;