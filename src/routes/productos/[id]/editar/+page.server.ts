import db from '$lib/server/database';
import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import type { Producto } from '$lib/types';
import { esFechaCaducidadValida, movimientosService } from '$lib/server/movimientos.service';

// Carga los datos específicos para ESTA ruta (/editar)
export const load = (async ({ params }) => {
  const producto = db
    .prepare('SELECT * FROM productos WHERE id = ?')
    .get(Number(params.id)) as Producto | undefined;

  return { producto: producto ?? null };
}) satisfies PageServerLoad;

// Maneja el envío del formulario de edición
export const actions = {
  editar: async ({ request, params }) => {
    const data = await request.formData();
    const nombre = data.get('nombre')?.toString().trim();
    const precio = Number(data.get('precio')?.toString() || '0');
    const stock = Number(data.get('stock')?.toString() || '0');
    const minimo = Number(data.get('minimo')?.toString() || '10');
    const numeroLote = data.get('numero_lote')?.toString().trim();
    const fechaCaducidad = data.get('fecha_caducidad')?.toString();
    const productoId = Number(params.id);

    if (!nombre || !Number.isFinite(precio) || precio < 0) {
      return fail(400, { error: 'productos.errorCampos' });
    }
    if (!Number.isSafeInteger(productoId) || productoId <= 0 ||
      !Number.isSafeInteger(stock) || stock < 0 ||
      !Number.isSafeInteger(minimo) || minimo < 0) {
      return fail(400, { error: 'productos.errorInventario' });
    }
    if (stock > 0 && (!numeroLote || !fechaCaducidad || !esFechaCaducidadValida(fechaCaducidad))) {
      return fail(400, { error: 'productos.errorLote' });
    }

    const actualizar = db.transaction(() => {
      const result = db.prepare(`
        UPDATE productos
        SET nombre = ?, precio = ?, stock_minimo = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(nombre, precio, minimo, productoId);

      if (result.changes === 0) return false;
      if (stock > 0 && numeroLote && fechaCaducidad) {
        movimientosService.registrarEntrada(
          productoId,
          stock,
          null,
          numeroLote,
          fechaCaducidad
        );
      }
      return true;
    });

    if (!actualizar()) {
      return fail(404, { error: 'productos.noEncontrado' });
    }

    throw redirect(303, '/productos');
  }
} satisfies Actions;