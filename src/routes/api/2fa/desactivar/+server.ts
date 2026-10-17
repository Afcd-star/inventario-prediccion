import { json } from '@sveltejs/kit';
import bcrypt from 'bcryptjs';
import db from '$lib/server/database';
import { totpService } from '$lib/server/services/totp.service';
import { auditoriaService } from '$lib/server/services/auditoria.service';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals, getClientAddress }) => {
  if (!locals.usuario) {
    return json({ error: 'No autenticado' }, { status: 401 });
  }

  const data = await request.json();
  const { password } = data;

  if (!password) {
    return json({ error: 'Contraseña requerida' }, { status: 400 });
  }

  const usuario = db.prepare(
    'SELECT password_hash FROM usuarios WHERE id = ?'
  ).get(locals.usuario.id) as { password_hash: string } | undefined;

  if (!usuario) {
    return json({ error: 'Usuario no encontrado' }, { status: 404 });
  }

  const esValida = await bcrypt.compare(password, usuario.password_hash);
  if (!esValida) {
    return json({ error: 'Contraseña incorrecta' }, { status: 400 });
  }

  totpService.desactivar(locals.usuario.id);

  auditoriaService.registrar({
    usuarioId: locals.usuario.id,
    accion: 'perfil_2fa_desactivado',
    tabla: 'usuarios',
    registroId: locals.usuario.id,
    detalles: { metodo: 'TOTP' },
    ip: getClientAddress()
  });

  return json({ success: true });
};