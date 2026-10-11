import { fail, redirect } from '@sveltejs/kit';
import bcrypt from 'bcryptjs';
import db from '$lib/server/database';
import { prediccionService } from '$lib/server/prediccion.service';
import type { PageServerLoad, Actions } from './$types';

export const load = (async ({ locals }) => {
  // Protección estricta: solo admins
  if (!locals.usuario || locals.usuario.rol !== 'admin') {
    throw redirect(303, '/dashboard');
  }

  // Obtener lista de usuarios
  const usuarios = db.prepare(
    'SELECT id, nombre, email, rol, created_at FROM usuarios ORDER BY created_at DESC'
  ).all() as Array<{
    id: number;
    nombre: string;
    email: string;
    rol: string;
    created_at: string;
  }>;

  return { usuarios };
}) satisfies PageServerLoad;

export const actions = {
  crearUsuario: async ({ request, locals }) => {
    if (!locals.usuario || locals.usuario.rol !== 'admin') {
      throw redirect(303, '/login');
    }

    const data = await request.formData();
    const nombre = data.get('nombre')?.toString();
    const email = data.get('email')?.toString();
    const password = data.get('password')?.toString();
    const rol = data.get('rol')?.toString();

    if (!nombre || !email || !password) {
      return fail(400, { error: 'Todos los campos son obligatorios' });
    }

    if (password.length < 6) {
      return fail(400, { error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    if (rol !== 'admin' && rol !== 'empleado') {
      return fail(400, { error: 'Rol inválido' });
    }

    // Verificar si el email ya existe
    const existe = db.prepare('SELECT id FROM usuarios WHERE email = ?').get(email);
    if (existe) {
      return fail(400, { error: 'El email ya está registrado' });
    }

    const saltos = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, saltos);

    db.prepare(
      'INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES (?, ?, ?, ?)'
    ).run(nombre, email, hash, rol);

    return { success: 'usuario_creado' };
  },

  cambiarRol: async ({ request, locals }) => {
    if (!locals.usuario || locals.usuario.rol !== 'admin') {
      throw redirect(303, '/login');
    }

    const data = await request.formData();
    const userId = parseInt(data.get('userId')?.toString() || '0');
    const nuevoRol = data.get('rol')?.toString();

    if (!userId || !nuevoRol) {
      return fail(400, { error: 'Datos inválidos' });
    }

    if (nuevoRol !== 'admin' && nuevoRol !== 'empleado') {
      return fail(400, { error: 'Rol inválido' });
    }

    // No permitir que un admin se quite su propio rol
    if (userId === locals.usuario.id && nuevoRol !== 'admin') {
      return fail(400, { error: 'No puedes cambiar tu propio rol de administrador' });
    }

    db.prepare('UPDATE usuarios SET rol = ? WHERE id = ?').run(nuevoRol, userId);

    return { success: 'rol_actualizado' };
  },

  eliminarUsuario: async ({ request, locals }) => {
    if (!locals.usuario || locals.usuario.rol !== 'admin') {
      throw redirect(303, '/login');
    }

    const data = await request.formData();
    const userId = parseInt(data.get('userId')?.toString() || '0');

    if (!userId) {
      return fail(400, { error: 'ID de usuario inválido' });
    }

    // No permitir auto-eliminación
    if (userId === locals.usuario.id) {
      return fail(400, { error: 'No puedes eliminar tu propia cuenta' });
    }

    db.prepare('DELETE FROM usuarios WHERE id = ?').run(userId);

    return { success: 'usuario_eliminado' };
  },

  recalcularPredicciones: async ({ locals }) => {
    if (!locals.usuario || locals.usuario.rol !== 'admin') {
      throw redirect(303, '/login');
    }

    prediccionService.calcularTodas();

    return { success: 'predicciones_recalculadas' };
  }
} satisfies Actions;