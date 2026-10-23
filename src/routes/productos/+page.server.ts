import db from '$lib/server/database';
import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import type { Producto } from '$lib/types';
import { esFechaCaducidadValida, movimientosService } from '$lib/server/services/movimientos.service';
import { auditoriaService } from '$lib/server/services/auditoria.service';

type ProductoListado = Producto & {
  lotes_activos: number;
  numero_lote: string | null;
  fecha_caducidad: string | null;
};

export const load = (async ({ url, locals }) => {
  const busqueda = url.searchParams.get('q') || '';

  const consulta = `
    SELECT
      p.*,
      (
        SELECT COUNT(*)
        FROM lotes l
        WHERE l.producto_id = p.id AND l.cantidad_actual > 0
      ) AS lotes_activos,
      (
        SELECT l.numero_lote
        FROM lotes l
        WHERE l.producto_id = p.id AND l.cantidad_actual > 0
        ORDER BY l.fecha_caducidad ASC, l.id ASC
        LIMIT 1
      ) AS numero_lote,
      (
        SELECT l.fecha_caducidad
        FROM lotes l
        WHERE l.producto_id = p.id AND l.cantidad_actual > 0
        ORDER BY l.fecha_caducidad ASC, l.id ASC
        LIMIT 1
      ) AS fecha_caducidad
    FROM productos p
    WHERE p.nombre LIKE ?
    ORDER BY p.id DESC
  `;
  const productos = db.prepare(consulta)
    .all(busqueda.trim() ? `%${busqueda}%` : '%') as ProductoListado[];

  return { productos, busqueda, rol: locals.usuario?.rol ?? null };
}) satisfies PageServerLoad;

export const actions = {
  crear: async ({ request }: { request: Request }) => {
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

    // Retornar mensaje de éxito
    return { success: 'producto_creado' };
  },

  eliminar: async ({ request, locals, getClientAddress }) => {
    const data = await request.formData();
    const id = parseInt(data.get('id')?.toString() || '0');

    const producto = db.prepare(
      'SELECT nombre FROM productos WHERE id = ?'
    ).get(id) as { nombre: string } | undefined;
    const resultado = db.prepare('DELETE FROM productos WHERE id = ?').run(id);

    if (resultado.changes > 0) {
      auditoriaService.registrar({
        usuarioId: locals.usuario?.id ?? null,
        accion: 'producto_eliminar',
        tabla: 'productos',
        registroId: id,
        detalles: { nombre: producto?.nombre ?? 'desconocido' },
        ip: getClientAddress()
      });
    }

    // Retornar mensaje de éxito
    return { success: 'producto_eliminado' };
  }
} satisfies Actions;