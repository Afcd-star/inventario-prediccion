import { fail, redirect } from '@sveltejs/kit';
import bcrypt from 'bcryptjs';
import db from '$lib/server/database';
import { serverInstanceId } from '$lib/server/session';
import { auditoriaService } from '$lib/server/services/auditoria.service';
import type { Actions } from './$types';

export const actions = {
  default: async ({ request, cookies, getClientAddress }) => {
    const data = await request.formData();
    const email = data.get('email')?.toString();
    const password = data.get('password')?.toString();

    if (!email || !password) {
      return fail(400, { error: 'login.errorCampos' });
    }

    const usuario = db.prepare(
      'SELECT id, nombre, email, password_hash, rol FROM usuarios WHERE email = ?'
    ).get(email) as { id: number; nombre: string; email: string; password_hash: string; rol: 'admin' | 'empleado' } | undefined;

    if (!usuario) {
      auditoriaService.registrar({
        usuarioId: null,
        accion: 'login_fallo',
        detalles: { emailIntentado: email },
        ip: getClientAddress()
      });
      return fail(400, { error: 'login.errorCredenciales' });
    }

    const esValida = await bcrypt.compare(password, usuario.password_hash);

    if (!esValida) {
      auditoriaService.registrar({
        usuarioId: null,
        accion: 'login_fallo',
        detalles: { emailIntentado: email },
        ip: getClientAddress()
      });
      return fail(400, { error: 'login.errorCredenciales' });
    }

    auditoriaService.registrar({
      usuarioId: usuario.id,
      accion: 'login_exito',
      detalles: { email: usuario.email },
      ip: getClientAddress()
    });
    cookies.set('sesion', usuario.id.toString(), {
      path: '/',
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7 
    });
    cookies.set('sesion_servidor', serverInstanceId, {
      path: '/',
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7
    });

    throw redirect(303, '/dashboard');
  }
} satisfies Actions;