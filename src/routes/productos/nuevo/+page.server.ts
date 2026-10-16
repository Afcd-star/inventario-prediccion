import db from '$lib/server/database';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { esFechaCaducidadValida, movimientosService } from '$lib/server/services/movimientos.service';
import { auditoriaService } from '$lib/server/services/auditoria.service';

export const actions = {
  crear: async ({ locals, request, getClientAddress }) => {
    const data = await request.formData();
    const nombre = data.get('nombre')?.toString().trim();
    const precio = Number(data.get('precio')?.toString() || '0');
    const stock = Number(data.get('stock')?.toString() || '0');
    const minimo = Number(data.get('minimo')?.toString() || '10');
    const descripcion = data.get('descripcion')?.toString().trim() ?? '';
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

    const resultado = db.transaction(() => {
      const result = db.prepare(`
        INSERT INTO productos (nombre, descripcion, precio, stock_actual, stock_minimo)
        VALUES (?, ?, ?, 0, ?)
      `).run(nombre, descripcion, precio, minimo);

      if (stock > 0 && numeroLote && fechaCaducidad) {
        movimientosService.registrarEntrada(
          Number(result.lastInsertRowid),
          stock,
          'Stock inicial',
          numeroLote,
          fechaCaducidad
        );
      }
      return result;
    })();

    auditoriaService.registrar({
      usuarioId: locals.usuario?.id ?? null,
      accion: 'producto_crear',
      tabla: 'productos',
      registroId: Number(resultado.lastInsertRowid),
      detalles: { nombre, precio, stock_actual: stock, stock_minimo: minimo },
      ip: getClientAddress()
    });

    throw redirect(303, '/productos');
  }
} satisfies Actions;