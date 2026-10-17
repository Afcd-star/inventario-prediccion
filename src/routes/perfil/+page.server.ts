import { fail, redirect } from '@sveltejs/kit';
import bcrypt from 'bcryptjs';
import db from '$lib/server/database';
import type { PageServerLoad, Actions } from './$types';
import { auditoriaService } from '$lib/server/services/auditoria.service';
import { rateLimiterService } from '$lib/server/services/rate-limiter.service';
import { sesionesService } from '$lib/server/services/sesiones.service';
import { describirDispositivo } from '$lib/server/user-agent';
import { totpService } from '$lib/server/services/totp.service';

export const load = (async ({ locals, cookies }) => {
  if (!locals.usuario) {
    throw redirect(303, '/login');
  }

  // 1. Agregamos totp_activado al SELECT
  const usuario = db.prepare(
    'SELECT id, nombre, email, rol, created_at, idioma_preferido, tema_preferido, totp_activado FROM usuarios WHERE id = ?'
  ).get(locals.usuario.id) as {
    id: number;
    nombre: string;
    email: string;
    rol: string;
    created_at: string;
    idioma_preferido: string;
    tema_preferido: string;
    totp_activado: number;
  };

  const actividadReciente = db.prepare(`
    SELECT accion, detalles, ip, creada_en
    FROM auditoria
    WHERE usuario_id = ?
    ORDER BY creada_en DESC
    LIMIT 20
  `).all(locals.usuario.id) as Array<{
    accion: string;
    detalles: string;
    ip: string | null;
    creada_en: string;
  }>;

  const tokenActual = cookies.get('sesion') ?? null;
  const sesiones = sesionesService.listarSesionesConActual(locals.usuario.id, tokenActual).map(sesion => ({
    id: sesion.id,
    es_actual: sesion.es_actual,
    ip: sesion.ip,
    creada_en: sesion.creada_en,
    ultima_actividad: sesion.ultima_actividad,
    dispositivo: describirDispositivo(sesion.user_agent)
  }));

  // 2. Contamos los códigos de recuperación disponibles
  const codigosDisponibles = totpService.contarCodigosDisponibles(locals.usuario.id);

  return { 
    usuario, 
    actividadReciente, 
    sesiones,
    codigosDisponibles 
  };
}) satisfies PageServerLoad;

export const actions = {
  cerrarSesionAbierta: async ({ request, locals, cookies, getClientAddress }) => {
    if (!locals.usuario) throw redirect(303, '/login');

    const data = await request.formData();
    const sesionId = Number(data.get('sesion_id'));
    if (!Number.isSafeInteger(sesionId) || sesionId <= 0) {
      return fail(400, { error: 'sesiones.errorInvalida' });
    }

    const tokenActual = cookies.get('sesion') ?? null;
    const objetivo = sesionesService.listarSesionesConActual(locals.usuario.id, tokenActual).find(s => s.id === sesionId);
    if (!objetivo) return fail(404, { error: 'sesiones.errorInvalida' });

    sesionesService.cerrarSesionPorId(sesionId, locals.usuario.id);
    auditoriaService.registrar({
      usuarioId: locals.usuario.id,
      accion: 'sesion_cerrada',
      tabla: 'sesiones',
      registroId: sesionId,
      detalles: { dispositivo: describirDispositivo(objetivo.user_agent), ipOrigen: objetivo.ip, eraSesionActual: objetivo.es_actual },
      ip: getClientAddress()
    });

    if (objetivo.es_actual) {
      cookies.delete('sesion', { path: '/' });
      throw redirect(303, '/login');
    }
    return { success: 'sesion_cerrada' };
  },

  cerrarOtrasSesiones: async ({ locals, cookies, getClientAddress }) => {
    if (!locals.usuario) throw redirect(303, '/login');
    const tokenActual = cookies.get('sesion');
    if (!tokenActual) throw redirect(303, '/login');

    const cerradas = sesionesService.cerrarTodasLasSesionesExcepto(locals.usuario.id, tokenActual);
    auditoriaService.registrar({
      usuarioId: locals.usuario.id,
      accion: 'sesiones_cierre_masivo',
      tabla: 'sesiones',
      detalles: { cantidadCerrada: cerradas },
      ip: getClientAddress()
    });

    return { success: 'sesiones_masivo', cerradas };
  },

  // ✅ ACCIÓN UNIFICADA PARA TODOS LOS CAMBIOS DEL PERFIL
  editarPerfil: async ({ request, locals, cookies, getClientAddress }) => {
    if (!locals.usuario) throw redirect(303, '/login');

    const data = await request.formData();
    const nombre = data.get('nombre')?.toString();
    const email = data.get('email')?.toString();
    const idioma = data.get('idioma')?.toString();
    const tema = data.get('tema')?.toString();
    const cambiarPassword = data.get('cambiar_password') === 'on';

    // 1. Validaciones básicas
    if (!nombre || nombre.trim().length < 3) return fail(400, { error: 'perfil.errorNombre', campo: 'nombre' });
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail(400, { error: 'perfil.errorEmailFormato', campo: 'email' });
    if (!idioma || !['es', 'en'].includes(idioma)) return fail(400, { error: 'perfil.errorPreferencias', campo: 'idioma' });
    if (!tema || !['light', 'dark'].includes(tema)) return fail(400, { error: 'perfil.errorPreferencias', campo: 'tema' });

    // 2. Verificar email único
    const emailExiste = db.prepare('SELECT id FROM usuarios WHERE email = ? AND id != ?').get(email, locals.usuario.id);
    if (emailExiste) return fail(400, { error: 'perfil.errorEmailEnUso', campo: 'email' });

    let passwordActualizada = false;
    let sesionesInvalidadas = 0;

    // 3. Lógica condicional de contraseña
    if (cambiarPassword) {
      if (rateLimiterService.estaBloqueadoCambioPassword(locals.usuario.id)) {
        return fail(429, { error: 'perfil.bloqueadoPassword' });
      }

      const passwordActual = data.get('password_actual')?.toString();
      const passwordNuevo = data.get('password_nuevo')?.toString();
      const passwordConfirmar = data.get('password_confirmar')?.toString();

      if (!passwordActual || !passwordNuevo || !passwordConfirmar) {
        return fail(400, { error: 'perfil.errorCampos', campo: 'password_actual' });
      }
      if (passwordNuevo !== passwordConfirmar) {
        return fail(400, { error: 'perfil.errorCoincidencia', campo: 'password_confirmar' });
      }
      if (passwordNuevo.length < 8) { // Alineado con el medidor de fortaleza de 8 caracteres
        return fail(400, { error: 'perfil.errorLongitud', campo: 'password_nuevo' });
      }

      const usuario = db.prepare('SELECT password_hash FROM usuarios WHERE id = ?').get(locals.usuario.id) as { password_hash: string };
      const esValida = await bcrypt.compare(passwordActual, usuario.password_hash);

      if (!esValida) {
        rateLimiterService.registrarIntento('password', String(locals.usuario.id));
        return fail(400, { error: 'perfil.errorPasswordActual', campo: 'password_actual' });
      }

      rateLimiterService.limpiarIntentos('password', String(locals.usuario.id));
      const hash = await bcrypt.hash(passwordNuevo, await bcrypt.genSalt(10));
      db.prepare('UPDATE usuarios SET password_hash = ? WHERE id = ?').run(hash, locals.usuario.id);

      const tokenActual = cookies.get('sesion') ?? null;
      sesionesInvalidadas = tokenActual
        ? sesionesService.cerrarTodasLasSesionesExcepto(locals.usuario.id, tokenActual)
        : sesionesService.cerrarTodasLasSesiones(locals.usuario.id);

      passwordActualizada = true;
    }

    // 4. Guardar cambios básicos
    const usuarioAnterior = db.prepare('SELECT nombre, email, idioma_preferido, tema_preferido FROM usuarios WHERE id = ?').get(locals.usuario.id);

    db.prepare(`
      UPDATE usuarios SET nombre = ?, email = ?, idioma_preferido = ?, tema_preferido = ? WHERE id = ?
    `).run(nombre, email, idioma, tema, locals.usuario.id);

    // 5. Auditoría unificada
    auditoriaService.registrar({
      usuarioId: locals.usuario.id,
      accion: 'perfil_actualizado',
      tabla: 'usuarios',
      registroId: locals.usuario.id,
      detalles: {
        anterior: usuarioAnterior,
        nuevo: { nombre, email, idioma, tema },
        passwordActualizada,
        sesionesInvalidadas
      },
      ip: getClientAddress()
    });

    return { success: 'perfil_actualizado' };
  }
} satisfies Actions;