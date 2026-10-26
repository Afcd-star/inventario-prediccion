import { fail, redirect } from '@sveltejs/kit';
import { proveedoresService } from '$lib/server/services/proveedores.service';
import type { PageServerLoad, Actions } from './$types';

export const load = (async ({ params, locals }) => {
  if (!locals.usuario) throw redirect(303, '/login');

  const id = Number(params.id);
  if (!Number.isSafeInteger(id) || id <= 0) {
    return { proveedor: null, productosAsociados: [], catalogo: [], rol: locals.usuario.rol };
  }

  const proveedor = proveedoresService.obtenerPorId(id);
  const productosAsociados = proveedor ? proveedoresService.obtenerProductosDelProveedor(id) : [];
  const catalogo = proveedoresService.obtenerCatalogoProductos();

  return { proveedor: proveedor ?? null, productosAsociados, catalogo, rol: locals.usuario.rol };
}) satisfies PageServerLoad;

function exigirAdmin(locals: { usuario?: { rol: string } | null }) {
  if (!locals.usuario || locals.usuario.rol !== 'admin') throw redirect(303, '/dashboard');
}

// Reconstruye los arrays paralelos del form (producto_id[], costo_unitario[], ...) por índice,
// igual que transferencias/nueva. Valida por fila ANTES de llamar al service.
function leerAsociaciones(data: FormData): Array<{
  producto_id: number; costo_unitario: number; tiempo_entrega_dias: number | null; pedido_minimo: number | null;
}> {
  const productoIds = data.getAll('producto_id[]') as string[];
  const costos = data.getAll('costo_unitario[]') as string[];
  const plazos = data.getAll('tiempo_entrega_dias[]') as string[];
  const moqs = data.getAll('pedido_minimo[]') as string[];

  return productoIds.map((pid, i) => {
    const costoNum = Number(costos[i]);
    const plazoRaw = (plazos[i] ?? '').trim();
    const moqRaw = (moqs[i] ?? '').trim();
    return {
      producto_id: Number(pid),
      costo_unitario: costoNum,
      tiempo_entrega_dias: plazoRaw === '' ? null : Number(plazoRaw),
      pedido_minimo: moqRaw === '' ? null : Number(moqRaw)
    };
  });
}

function validarAsociaciones(asocs: ReturnType<typeof leerAsociaciones>): string | null {
  for (const a of asocs) {
    if (!Number.isSafeInteger(a.producto_id) || a.producto_id <= 0) return 'proveedores.errorProductoInvalido';
    if (!Number.isFinite(a.costo_unitario) || a.costo_unitario < 0) return 'proveedores.errorCosto';
    if (a.tiempo_entrega_dias != null && (!Number.isInteger(a.tiempo_entrega_dias) || a.tiempo_entrega_dias < 0))
      return 'proveedores.errorPlazo';
    if (a.pedido_minimo != null && (!Number.isInteger(a.pedido_minimo) || a.pedido_minimo < 0))
      return 'proveedores.errorMinimo';
  }
  return null;
}

export const actions = {
  // Idempotente por diseño (diff por producto_id): quedarse con success es SEGURO ante F5,
  // porque reenviar la misma lista produce un diff vacío (no-op). NO se pone redirect aquí;
  // si alguien lo añade "por consistencia", pierde el toast sin ganar seguridad.
  reasociar: async ({ request, params, locals, getClientAddress }) => {
    exigirAdmin(locals);
    const id = Number(params.id);
    if (!Number.isSafeInteger(id) || id <= 0) return fail(400, { error: 'proveedores.errorId' });

    const data = await request.formData();
    const asocs = leerAsociaciones(data);
    const err = validarAsociaciones(asocs);
    if (err) return fail(400, { error: err });

    try {
      proveedoresService.reasociarProductos(id, asocs, locals.usuario!.id, getClientAddress());
      return { success: 'proveedores.asociacionesGuardadas' };
    } catch (e: any) {
      return fail(400, { error: e.message || 'proveedores.errorInterno' });
    }
  },

  // Editar cabecera. Duplicado deliberado del action homónimo de la lista (15.3a): misma
  // lógica, misma llamada a service.actualizar. Deuda de uniformización anotada (componente
  // compartido de form de cabecera en un pulido futuro).
  actualizar: async ({ request, params, locals, getClientAddress }) => {
    exigirAdmin(locals);
    const id = Number(params.id);
    if (!Number.isSafeInteger(id) || id <= 0) return fail(400, { error: 'proveedores.errorId' });

    const data = await request.formData();
    const nombre = data.get('nombre')?.toString().trim();
    const contacto = data.get('contacto')?.toString().trim() || null;
    const email = data.get('email')?.toString().trim() || null;
    const telefono = data.get('telefono')?.toString().trim() || null;
    const notas = data.get('notas')?.toString().trim() || null;
    const plazoRaw = data.get('tiempo_entrega_dias')?.toString().trim();
    const tiempoEntrega = plazoRaw ? Number(plazoRaw) : null;
    const activa = data.get('activa') ? 1 : 0;

    if (!nombre) return fail(400, { error: 'proveedores.errorNombre' });
    if (tiempoEntrega != null && (!Number.isInteger(tiempoEntrega) || tiempoEntrega < 0))
      return fail(400, { error: 'proveedores.errorPlazo' });

    try {
      proveedoresService.actualizar(id, {
        nombre, contacto, email, telefono, tiempo_entrega_dias: tiempoEntrega, notas, activa
      }, locals.usuario!.id, getClientAddress());
      return { success: 'proveedores.actualizado' };
    } catch (e: any) {
      return fail(400, { error: e.message || 'proveedores.errorInterno' });
    }
  },

  eliminar: async ({ request, params, locals, getClientAddress }) => {
    exigirAdmin(locals);
    const id = Number(params.id);
    if (!Number.isSafeInteger(id) || id <= 0) return fail(400, { error: 'proveedores.errorId' });
    try {
      proveedoresService.eliminar(id, locals.usuario!.id, getClientAddress());
      throw redirect(303, '/proveedores');   // fuera del try: el catch no debe tragar el redirect
    } catch (e: any) {
      // Si es el redirect, lo re-lanzo (no es un error de negocio).
      if (e && typeof e === 'object' && 'location' in e) throw e;
      return fail(400, { error: e.message || 'proveedores.errorInterno' });
    }
  }
} satisfies Actions;