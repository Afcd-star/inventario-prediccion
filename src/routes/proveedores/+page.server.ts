import { fail, redirect } from '@sveltejs/kit';
import { proveedoresService } from '$lib/server/services/proveedores.service';
import type { PageServerLoad, Actions } from './$types';

export const load = (async ({ locals }) => {
  if (!locals.usuario) throw redirect(303, '/login');

  // Lectura: cualquier autenticado. El rol viaja a la UI para ocultar los botones de gestión.
  const proveedores = proveedoresService.obtenerTodas();
  return { proveedores, rol: locals.usuario.rol };
}) satisfies PageServerLoad;

// Guard de escritura: solo admin. Defensa en profundidad (la UI ya oculta los botones).
function exigirAdmin(locals: { usuario?: { rol: string } | null }) {
  if (!locals.usuario || locals.usuario.rol !== 'admin') {
    throw redirect(303, '/dashboard');
  }
}

export const actions = {
  crear: async ({ request, locals, getClientAddress }) => {
    exigirAdmin(locals);
    const data = await request.formData();
    const nombre = data.get('nombre')?.toString().trim();
    const contacto = data.get('contacto')?.toString().trim() || null;
    const email = data.get('email')?.toString().trim() || null;
    const telefono = data.get('telefono')?.toString().trim() || null;
    const notas = data.get('notas')?.toString().trim() || null;
    const plazoRaw = data.get('tiempo_entrega_dias')?.toString().trim();
    const tiempoEntrega = plazoRaw ? Number(plazoRaw) : null;

    if (!nombre) return fail(400, { error: 'proveedores.errorNombre' });
    if (tiempoEntrega != null && (!Number.isInteger(tiempoEntrega) || tiempoEntrega < 0)) {
      return fail(400, { error: 'proveedores.errorPlazo' });
    }

    try {
      proveedoresService.crear(
        { nombre, contacto, email, telefono, tiempo_entrega_dias: tiempoEntrega, notas },
        locals.usuario!.id,
        getClientAddress()
      );

    } catch (e: any) {
      return fail(400, { error: e.message || 'proveedores.errorInterno' });
    }

    throw redirect(303, '/proveedores');
  },

  actualizar: async ({ request, locals, getClientAddress }) => {
    exigirAdmin(locals);
    const data = await request.formData();
    const id = Number(data.get('id'));
    const nombre = data.get('nombre')?.toString().trim();
    const contacto = data.get('contacto')?.toString().trim() || null;
    const email = data.get('email')?.toString().trim() || null;
    const telefono = data.get('telefono')?.toString().trim() || null;
    const notas = data.get('notas')?.toString().trim() || null;
    const plazoRaw = data.get('tiempo_entrega_dias')?.toString().trim();
    const tiempoEntrega = plazoRaw ? Number(plazoRaw) : null;
    const activa = data.get('activa') ? 1 : 0;

    if (!id || !Number.isSafeInteger(id) || id <= 0) return fail(400, { error: 'proveedores.errorId' });
    if (!nombre) return fail(400, { error: 'proveedores.errorNombre' });
    if (tiempoEntrega != null && (!Number.isInteger(tiempoEntrega) || tiempoEntrega < 0)) {
      return fail(400, { error: 'proveedores.errorPlazo' });
    }

    try {
      proveedoresService.actualizar(
        id,
        { nombre, contacto, email, telefono, tiempo_entrega_dias: tiempoEntrega, notas, activa },
        locals.usuario!.id,
        getClientAddress()
      );
      return { success: 'proveedores.actualizado' };
    } catch (e: any) {
      return fail(400, { error: e.message || 'proveedores.errorInterno' });
    }
  },

  // Eliminar como form action (NO el fetch+reload de admin/ubicaciones): el service lanza
  // si hay productos asociados y ese mensaje llega al usuario vía form?.error.
  eliminar: async ({ request, locals, getClientAddress }) => {
    exigirAdmin(locals);
    const data = await request.formData();
    const id = Number(data.get('id'));
    if (!id || !Number.isSafeInteger(id) || id <= 0) return fail(400, { error: 'proveedores.errorId' });

    try {
      proveedoresService.eliminar(id, locals.usuario!.id, getClientAddress());
      return { success: 'proveedores.eliminado' };
    } catch (e: any) {
      return fail(400, { error: e.message || 'proveedores.errorInterno' });
    }
  }
} satisfies Actions;