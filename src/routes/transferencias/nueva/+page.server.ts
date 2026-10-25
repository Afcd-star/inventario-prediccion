import { fail, redirect } from '@sveltejs/kit';
import { ubicacionesService } from '$lib/server/services/ubicaciones.service';
import { transferenciasService } from '$lib/server/services/transferencias.service';
import db from '$lib/server/database';
import type { PageServerLoad, Actions } from './$types';

export const load = (async ({ locals }) => {
  if (!locals.usuario) throw redirect(303, '/login');

  const ubicaciones = ubicacionesService.obtenerTodas().filter(u => u.activa === 1);
  
  // Obtener productos con lotes para el selector
  const productosConLotes = db.prepare(`
    SELECT DISTINCT p.id, p.nombre, l.id as lote_id, l.numero_lote, l.cantidad_actual, l.ubicacion_id
    FROM productos p
    JOIN lotes l ON p.id = l.producto_id
    WHERE l.cantidad_actual > 0
    ORDER BY p.nombre, l.numero_lote
  `).all() as Array<{
    id: number;
    nombre: string;
    lote_id: number;
    numero_lote: string;
    cantidad_actual: number;
    ubicacion_id: number;
  }>;

  return { ubicaciones, productosConLotes };
}) satisfies PageServerLoad;

export const actions = {
  crear: async ({ request, locals, getClientAddress }) => {
    if (!locals.usuario) return fail(401);

    const data = await request.formData();
    const origenId = Number(data.get('origen_id'));
    const destinoId = Number(data.get('destino_id'));
    const notas = data.get('notas')?.toString() || null;

    // Extraer items del formulario (se envían como arrays)
    const productoIds = data.getAll('producto_id[]') as string[];
    const loteIds = data.getAll('lote_id[]') as string[];
    const cantidades = data.getAll('cantidad[]') as string[];

    if (!origenId || !destinoId || productoIds.length === 0) {
      return fail(400, { error: 'transferencias.errorCampos' });
    }

    const items = productoIds.map((pid, index) => ({
      producto_id: Number(pid),
      lote_id: Number(loteIds[index]) || null,
      cantidad: Number(cantidades[index])
    })).filter(item => item.cantidad > 0);

    if (items.length === 0) {
      return fail(400, { error: 'transferencias.errorCantidad' });
    }

    try {
      transferenciasService.crear(origenId, destinoId, locals.usuario.id, notas, items, getClientAddress());
    } catch (e: any) {
      return fail(400, { error: e.message || 'transferencias.errorInterno' });
    }
    throw redirect(303, '/transferencias');
  }
} satisfies Actions;