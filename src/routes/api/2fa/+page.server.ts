import { fail, redirect } from '@sveltejs/kit';
import bcrypt from 'bcryptjs';
import db from '$lib/server/database';
import { totpService } from '$lib/server/services/totp.service';
import { sesionesService } from '$lib/server/services/sesiones.service';
import { rateLimiterService } from '$lib/server/services/rate-limiter.service';
import { auditoriaService } from '$lib/server/services/auditoria.service';
import type { PageServerLoad, Actions } from './$types';

export const load = (async ({ locals }) => {
  // Si no hay pre_sesión válida, no debería llegar aquí (el hooks redirige)
  if (!locals.preSesionUsuarioId) {
    throw redirect(303, '/login');
  }

  const usuario = db.prepare(
    'SELECT id, nombre, email, totp_activado FROM usuarios WHERE id = ?'
  ).get(locals.preSesionUsuarioId) as {
    id: number;
    nombre: string;
    email: string;
    totp_activado: number;
  } | undefined;

  if (!usuario || usuario.totp_activado !== 1) {
    throw redirect(303, '/login');
  }

  return { usuario };
}) satisfies PageServerLoad;

export const actions = {
  verificar_codigo: async ({ request, cookies, getClientAddress, locals }) => {
    const usuarioId = locals.preSesionUsuarioId;
    if (!usuarioId) throw redirect(303, '/login');

    const ip = getClientAddress();

    if (rateLimiterService.estaBloqueadoLogin(ip)) {
      return fail(429, { error: '2fa.bloqueado' });
    }

    const data = await request.formData();
    const codigo = data.get('codigo')?.toString();

    if (!codigo || codigo.length < 6) {
      return fail(400, { error: '2fa.errorCodigo' });
    }

    const secreto = totpService.obtenerSecreto(usuarioId);
    if (!secreto) {
      return fail(400, { error: '2fa.errorInterno' });
    }

    let codigoValido = false;
    let esRecuperacion = false;

    // Primero intentar como TOTP
    if (totpService.verificarCodigo(secreto, codigo)) {
      codigoValido = true;
    } else if (totpService.verificarCodigoRecuperacion(usuarioId, codigo)) {
      // Segundo intento: código de recuperación
      codigoValido = true;
      esRecuperacion = true;
    }

    if (!codigoValido) {
      rateLimiterService.registrarIntento('login', ip);
      return fail(400, { error: '2fa.errorCodigo' });
    }

    // Código válido: crear sesión real
    rateLimiterService.limpiarIntentos('login', ip);

    const userAgent = (await request.headers.get('user-agent')) || null;
    const token = sesionesService.crearSesion(usuarioId, userAgent, ip);

    cookies.set('sesion', token, {
      path: '/',
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7
    });

    // Limpiar pre_sesión
    cookies.delete('pre_sesion', { path: '/' });

    auditoriaService.registrar({
      usuarioId,
      accion: esRecuperacion ? 'login_exito_codigo_recuperacion' : 'login_exito',
      detalles: { metodo: esRecuperacion ? 'codigo_recuperacion' : 'totp' },
      ip
    });

    throw redirect(303, '/dashboard');
  },

  cancelar: async ({ cookies }) => {
    cookies.delete('pre_sesion', { path: '/' });
    throw redirect(303, '/login');
  }
} satisfies Actions;