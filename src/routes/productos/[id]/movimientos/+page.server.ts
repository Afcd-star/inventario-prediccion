import db from '$lib/server/database';
import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import type { Producto } from '$lib/types';
import { movimientosService } from '$lib/server/services/movimientos.service';
import { auditoriaService } from '$lib/server/services/auditoria.service';

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
  registrar: async ({ request, params, locals, getClientAddress }) => {
    const data = await request.formData();
    const producto_id = Number(data.get('producto_id')?.toString() || '0');
    const tipo = data.get('tipo')?.toString();
    const cantidad = Number(data.get('cantidad')?.toString() || '0');
    const notas = data.get('notas')?.toString() || null;
    const numero_lote = data.get('numero_lote')?.toString();
    const fecha_caducidad = data.get('fecha_caducidad')?.toString();

    if (!Number.isSafeInteger(producto_id) || producto_id <= 0 ||
      !Number.isSafeInteger(cantidad) || cantidad <= 0 || !tipo) {
      return fail(400, { error: 'movimientos.errorDatos' });
    }

    if (tipo !== 'entrada' && tipo !== 'salida') {
      return fail(400, { error: 'movimientos.errorTipo' });
    }

    try {
      movimientosService.registrar({
        producto_id,
        tipo,
        cantidad,
        notas,
        numero_lote,
        fecha_caducidad
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.startsWith('Stock insuficiente.') ||
          error.message.startsWith('No hay suficiente cantidad')) {
          return fail(400, { error: 'movimientos.errorStock' });
        }
        if (error.message.startsWith('No hay lotes disponibles')) {
          return fail(400, { error: 'movimientos.errorLotes' });
        }
        if (error.message.includes('lote') || error.message.includes('caducidad')) {
          return fail(400, { error: 'movimientos.errorLote' });
        }
        return fail(400, { error: error.message });
      }
      throw error;
    }

    auditoriaService.registrar({
      usuarioId: locals.usuario?.id ?? null,
      accion: tipo === 'entrada' ? 'movimiento_entrada' : 'movimiento_salida',
      tabla: 'movimientos',
      registroId: parseInt(params.id),
      detalles: { cantidad, tipo, notas },
      ip: getClientAddress()
    });

    return { success: 'movimiento_registrado' };
  }
} satisfies Actions;