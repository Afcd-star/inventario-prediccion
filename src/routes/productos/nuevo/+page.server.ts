import db from '$lib/server/database';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { esFechaCaducidadValida, movimientosService } from '$lib/server/movimientos.service';

export const actions = {
  crear: async ({ request }) => {
    const data = await request.formData();
    const nombre = data.get('nombre')?.toString().trim();
    const precio = Number(data.get('precio')?.toString() || '0');
    const stock = Number(data.get('stock')?.toString() || '0');
    const minimo = Number(data.get('minimo')?.toString() || '10');
    const numeroLote = data.get('numero_lote')?.toString().trim();
    const fechaCaducidad = data.get('fecha_caducidad')?.toString();

    if (!nombre || !Number.isFinite(precio) || precio < 0) {
      return fail(400, { error: 'productos.errorCampos' });
    }
    if (![stock, minimo].every(value => Number.isSafeInteger(value) && value >= 0)) {
      return fail(400, { error: 'productos.errorInventario' });
    }
    if (stock > 0 && (!numeroLote || !fechaCaducidad || !esFechaCaducidadValida(fechaCaducidad))) {
      return fail(400, { error: 'productos.errorLote' });
    }

    db.transaction(() => {
      const result = db.prepare(`
        INSERT INTO productos (nombre, precio, stock_actual, stock_minimo)
        VALUES (?, ?, 0, ?)
      `).run(nombre, precio, minimo);

      if (stock > 0 && numeroLote && fechaCaducidad) {
        movimientosService.registrarEntrada(
          Number(result.lastInsertRowid),
          stock,
          'Stock inicial',
          numeroLote,
          fechaCaducidad
        );
      }
    })();

    throw redirect(303, '/productos');
  }
} satisfies Actions;