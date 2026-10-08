import db from '$lib/server/database';
import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import type { Producto } from '$lib/types';

export const load = (async ({ url }) => {
  const busqueda = url.searchParams.get('q') || '';
  
  let productos: Producto[];
  
  if (busqueda.trim()) {
    productos = db
      .prepare('SELECT * FROM productos WHERE nombre LIKE ? ORDER BY id DESC')
      .all(`%${busqueda}%`) as Producto[];
  } else {
    productos = db.prepare('SELECT * FROM productos ORDER BY id DESC').all() as Producto[];
  }
  
  return { productos, busqueda };
}) satisfies PageServerLoad;

export const actions = {
  crear: async ({ request }: { request: Request }) => {
    const data = await request.formData();
    const nombre = data.get('nombre')?.toString();
    const precio = parseFloat(data.get('precio')?.toString() || '0');
    const stock = parseInt(data.get('stock')?.toString() || '0');
    const minimo = parseInt(data.get('minimo')?.toString() || '10');

    if (!nombre || precio < 0) {
      return fail(400, { error: 'Nombre y precio válido son obligatorios' });
    }

    db.prepare(`
      INSERT INTO productos (nombre, precio, stock_actual, stock_minimo)
      VALUES (?, ?, ?, ?)
    `).run(nombre, precio, stock, minimo);

    // Retornar mensaje de éxito
    return { success: 'producto_creado' };
  },

  eliminar: async ({ request }: { request: Request }) => {
    const data = await request.formData();
    const id = parseInt(data.get('id')?.toString() || '0');
    
    db.prepare('DELETE FROM productos WHERE id = ?').run(id);
    
    // Retornar mensaje de éxito
    return { success: 'producto_eliminado' };
  }
} satisfies Actions;