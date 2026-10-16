import { fail, redirect } from '@sveltejs/kit';
import bcrypt from 'bcryptjs';
import db from '$lib/server/database';
import type { PageServerLoad, Actions } from './$types';
import { auditoriaService } from '$lib/server/services/auditoria.service';

export const load = (async ({ locals }) => {
  if (!locals.usuario) {
    throw redirect(303, '/login');
  }

  // Obtener datos completos del usuario
  const usuario = db.prepare(
    'SELECT id, nombre, email, rol, created_at FROM usuarios WHERE id = ?'
  ).get(locals.usuario.id) as {
    id: number;
    nombre: string;
    email: string;
    rol: string;
    created_at: string;
  };

  return { usuario };
}) satisfies PageServerLoad;

export const actions = {
  actualizarPerfil: async ({ request, locals, getClientAddress }) => {
    if (!locals.usuario) {
      throw redirect(303, '/login');
    }

    const data = await request.formData();
    const nombre = data.get('nombre')?.toString();

    if (!nombre || nombre.trim().length < 3) {
      return fail(400, { error: 'perfil.errorNombre' });
    }

    const usuario = db.prepare(
      'SELECT nombre FROM usuarios WHERE id = ?'
    ).get(locals.usuario.id) as { nombre: string } | undefined;
    const nombreAnterior = usuario?.nombre;

    db.prepare(
      'UPDATE usuarios SET nombre = ? WHERE id = ?'
    ).run(nombre, locals.usuario.id);

    auditoriaService.registrar({
      usuarioId: locals.usuario.id,
      accion: 'perfil_nombre',
      tabla: 'usuarios',
      registroId: locals.usuario.id,
      detalles: { nombreAnterior, nombreNuevo: nombre },
      ip: getClientAddress()
    });

    return { success: 'perfil_actualizado' };
  },

  cambiarPassword: async ({ request, locals, getClientAddress }) => {
    if (!locals.usuario) {
      throw redirect(303, '/login');
    }

    const data = await request.formData();
    const passwordActual = data.get('password_actual')?.toString();
    const passwordNuevo = data.get('password_nuevo')?.toString();
    const passwordConfirmar = data.get('password_confirmar')?.toString();

    if (!passwordActual || !passwordNuevo || !passwordConfirmar) {
      return fail(400, { error: 'perfil.errorCampos' });
    }

    if (passwordNuevo !== passwordConfirmar) {
      return fail(400, { error: 'perfil.errorCoincidencia' });
    }

    if (passwordNuevo.length < 6) {
      return fail(400, { error: 'perfil.errorLongitud' });
    }

    // Verificar contraseña actual
    const usuario = db.prepare(
      'SELECT password_hash FROM usuarios WHERE id = ?'
    ).get(locals.usuario.id) as { password_hash: string };

    const esValida = await bcrypt.compare(passwordActual, usuario.password_hash);

    if (!esValida) {
      return fail(400, { error: 'perfil.errorPasswordActual' });
    }

    // Hashear y actualizar nueva contraseña
    const saltos = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(passwordNuevo, saltos);

    db.prepare(
      'UPDATE usuarios SET password_hash = ? WHERE id = ?'
    ).run(hash, locals.usuario.id);

    auditoriaService.registrar({
      usuarioId: locals.usuario.id,
      accion: 'perfil_password',
      tabla: 'usuarios',
      registroId: locals.usuario.id,
      detalles: { cambio: 'contraseña actualizada' },
      ip: getClientAddress()
    });

    return { success: 'password_cambiado' };
  }
} satisfies Actions;