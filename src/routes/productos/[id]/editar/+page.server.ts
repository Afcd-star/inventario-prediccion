import db from '$lib/server/database';
import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import type { Producto } from '$lib/types';
import { esFechaCaducidadValida, movimientosService } from '$lib/server/services/movimientos.service';
import { lotesService } from '$lib/server/services/lotes.service';
import { auditoriaService } from '$lib/server/services/auditoria.service';

// Carga los datos específicos para ESTA ruta (/editar)
export const load = (async ({ params }) => {
  const producto = db
    .prepare('SELECT * FROM productos WHERE id = ?')
    .get(Number(params.id)) as Producto | undefined;

  return {
    producto: producto ?? null,
    lotes: producto ? lotesService.obtenerTodosLotesProducto(producto.id) : []
  };
}) satisfies PageServerLoad;

// Maneja el envío del formulario de edición
export const actions = {
  editar: async ({ request, params, locals, getClientAddress }) => {
    const data = await request.formData();
    const nombre = data.get('nombre')?.toString().trim();
    const precio = Number(data.get('precio')?.toString() || '0');
    const stock = Number(data.get('stock')?.toString() || '0');
    const minimo = Number(data.get('minimo')?.toString() || '10');
    const descripcion = data.get('descripcion')?.toString().trim() ?? '';
    const numeroLote = data.get('numero_lote')?.toString().trim();
    const fechaCaducidad = data.get('fecha_caducidad')?.toString();
    const loteCaducidadIdValue = data.get('lote_caducidad_id')?.toString();
    const loteCaducidadId = loteCaducidadIdValue ? Number(loteCaducidadIdValue) : null;
    const fechaCaducidadLote = data.get('fecha_caducidad_lote')?.toString();
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
    if (loteCaducidadId !== null &&
      (!Number.isSafeInteger(loteCaducidadId) ||
        !fechaCaducidadLote ||
        !esFechaCaducidadValida(fechaCaducidadLote))) {
      return fail(400, { error: 'productos.errorLote' });
    }

    const antes = db.prepare(
      'SELECT nombre, precio, stock_actual, stock_minimo FROM productos WHERE id = ?'
    ).get(productoId) as {
      nombre: string;
      precio: number;
      stock_actual: number;
      stock_minimo: number;
    } | undefined;

    const actualizar = db.transaction(() => {
      if (loteCaducidadId !== null) {
        const resultadoCaducidad = db.prepare(`
          UPDATE lotes
          SET fecha_caducidad = ?
          WHERE id = ? AND producto_id = ?
        `).run(fechaCaducidadLote, loteCaducidadId, productoId);
        if (resultadoCaducidad.changes !== 1) return false;
      }

      const result = db.prepare(`
        UPDATE productos
        SET nombre = ?, descripcion = ?, precio = ?, stock_minimo = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(nombre, descripcion, precio, minimo, productoId);

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

    if (!antes || !actualizar()) {
      return fail(404, { error: 'productos.noEncontrado' });
    }

    const despues = db.prepare(
      'SELECT nombre, precio, stock_actual, stock_minimo FROM productos WHERE id = ?'
    ).get(productoId) as {
      nombre: string;
      precio: number;
      stock_actual: number;
      stock_minimo: number;
    };

    auditoriaService.registrar({
      usuarioId: locals.usuario?.id ?? null,
      accion: 'producto_actualizar',
      tabla: 'productos',
      registroId: productoId,
      detalles: { antes, despues },
      ip: getClientAddress()
    });

    throw redirect(303, '/productos');
  }
} satisfies Actions;