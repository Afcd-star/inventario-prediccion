import { fail, redirect } from '@sveltejs/kit';
import bcrypt from 'bcryptjs';
import db from '$lib/server/database';
import { sesionesService } from '$lib/server/services/sesiones.service';
import { auditoriaService } from '$lib/server/services/auditoria.service';
import { rateLimiterService } from '$lib/server/services/rate-limiter.service';
import type { Actions } from './$types';
import { totpService } from '$lib/server/services/totp.service';

export const actions = {
  default: async ({ request, cookies, getClientAddress }) => {
    const ip = getClientAddress();

    // Rate limiting: bloquear IP tras 5 intentos fallidos en 15 minutos
    if (rateLimiterService.estaBloqueadoLogin(ip)) {
      auditoriaService.registrar({
        usuarioId: null,
        accion: 'login_bloqueado',
        detalles: { intentosPrevios: rateLimiterService.contarIntentos('login', ip, 15) },
        ip
      });
      return fail(429, { error: 'login.bloqueado' });
    }

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
      rateLimiterService.registrarIntento('login', ip);
      auditoriaService.registrar({
        usuarioId: null,
        accion: 'login_fallo',
        detalles: { emailIntentado: email },
        ip
      });
      return fail(400, { error: 'login.errorCredenciales' });
    }

        const esValida = await bcrypt.compare(password, usuario.password_hash);

    if (!esValida) {
      rateLimiterService.registrarIntento('login', ip);
      auditoriaService.registrar({
        usuarioId: null,
        accion: 'login_fallo',
        detalles: { emailIntentado: email },
        ip
      });
      return fail(400, { error: 'login.errorCredenciales' });
    }

    // Credenciales válidas: limpiar intentos
    rateLimiterService.limpiarIntentos('login', ip);

    // Verificar si el usuario tiene 2FA activado
    const tiene2FA = totpService.estaActivado(usuario.id);

    if (tiene2FA) {
      // Generar token temporal y redirigir a /2fa
      const tokenTemporal = totpService.generarTokenTemporal(usuario.id);
      cookies.set('pre_sesion', tokenTemporal, {
        path: '/',
        httpOnly: true,
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 5 * 60 // 5 minutos
      });

      auditoriaService.registrar({
        usuarioId: usuario.id,
        accion: 'login_exito_pendiente_2fa',
        detalles: { email: usuario.email },
        ip
      });

      throw redirect(303, '/2fa');
    }

    // Sin 2FA: crear sesión normal
    const userAgent = request.headers.get('user-agent') || null;
    const token = sesionesService.crearSesion(usuario.id, userAgent, ip);

    auditoriaService.registrar({
      usuarioId: usuario.id,
      accion: 'login_exito',
      detalles: { email: usuario.email },
      ip
    });

    cookies.set('sesion', token, {
      path: '/',
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7
    });

    throw redirect(303, '/dashboard');
  }
} satisfies Actions;