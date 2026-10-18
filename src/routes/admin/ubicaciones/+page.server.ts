import { fail, redirect } from '@sveltejs/kit';
import db from '$lib/server/database';
import { ubicacionesService } from '$lib/server/services/ubicaciones.service';
import { auditoriaService } from '$lib/server/services/auditoria.service';
import type { PageServerLoad, Actions } from './$types';

export const load = (async ({ locals }) => {
  if (!locals.usuario || locals.usuario.rol !== 'admin') {
    throw redirect(303, '/dashboard');
  }
  
  const ubicaciones = ubicacionesService.obtenerTodas();
  return { ubicaciones };
}) satisfies PageServerLoad;

export const actions = {
  crear: async ({ request, locals, getClientAddress }) => {
    if (!locals.usuario || locals.usuario.rol !== 'admin') throw fail(403);
    
    const data = await request.formData();
    const nombre = data.get('nombre')?.toString();
    const tipo = data.get('tipo')?.toString();
    const direccion = data.get('direccion')?.toString();

    if (!nombre || !tipo) {
      return fail(400, { error: 'ubicaciones.errorCampos' });
    }

    try {
      const id = ubicacionesService.crear(nombre, tipo, direccion || '');
      
      auditoriaService.registrar({
        usuarioId: locals.usuario.id,
        accion: 'ubicacion_crear',
        tabla: 'ubicaciones',
        registroId: id,
        detalles: { nombre, tipo },
        ip: getClientAddress()
      });
      
      return { success: 'ubicaciones.creado' };
    } catch (e: any) {
      return fail(400, { error: e.message || 'ubicaciones.errorInterno' });
    }
  },

  actualizar: async ({ request, locals, getClientAddress }) => {
    if (!locals.usuario || locals.usuario.rol !== 'admin') throw fail(403);
    
    const data = await request.formData();
    const id = Number(data.get('id'));
    const nombre = data.get('nombre')?.toString();
    const tipo = data.get('tipo')?.toString();
    const direccion = data.get('direccion')?.toString();
    const activa = data.get('activa') === 'on' ? 1 : 0;

    if (!id || !nombre || !tipo) {
      return fail(400, { error: 'ubicaciones.errorCampos' });
    }

    try {
      ubicacionesService.actualizar(id, nombre, tipo, direccion || '', activa);
      
      auditoriaService.registrar({
        usuarioId: locals.usuario.id,
        accion: 'ubicacion_actualizar',
        tabla: 'ubicaciones',
        registroId: id,
        detalles: { nombre, tipo, activa },
        ip: getClientAddress()
      });
      
      return { success: 'ubicaciones.actualizado' };
    } catch (e: any) {
      return fail(400, { error: e.message || 'ubicaciones.errorInterno' });
    }
  },

  eliminar: async ({ request, locals, getClientAddress }) => {
    if (!locals.usuario || locals.usuario.rol !== 'admin') throw fail(403);
    
    const data = await request.formData();
    const id = Number(data.get('id'));

    if (!id) {
      return fail(400, { error: 'ubicaciones.errorCampos' });
    }

    // Protección: No permitir eliminar el Almacén Principal (ID 1)
    if (id === 1) {
      return fail(400, { error: 'ubicaciones.errorEliminarPrincipal' });
    }

    try {
      db.prepare('DELETE FROM ubicaciones WHERE id = ?').run(id);
      
      auditoriaService.registrar({
        usuarioId: locals.usuario.id,
        accion: 'ubicacion_eliminar',
        tabla: 'ubicaciones',
        registroId: id,
        detalles: { id },
        ip: getClientAddress()
      });
      
      return { success: 'ubicaciones.eliminado' };
    } catch (e: any) {
      return fail(400, { error: e.message || 'ubicaciones.errorInterno' });
    }
  }
} satisfies Actions;