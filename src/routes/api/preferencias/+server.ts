import { json } from '@sveltejs/kit';
import db from '$lib/server/database';
import { auditoriaService } from '$lib/server/services/auditoria.service';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals, getClientAddress }) => {
  if (!locals.usuario) {
    return json({ error: 'No autenticado' }, { status: 401 });
  }

  const data = await request.json();
  const { idioma, tema } = data;

  // Validación estricta
  if (!idioma || !tema) {
    return json({ error: 'Campos requeridos' }, { status: 400 });
  }

  if (!['es', 'en'].includes(idioma) || !['light', 'dark'].includes(tema)) {
    return json({ error: 'Valores inválidos' }, { status: 400 });
  }

  // Obtener valores anteriores para auditoría
  const usuario = db.prepare(
    'SELECT idioma_preferido, tema_preferido FROM usuarios WHERE id = ?'
  ).get(locals.usuario.id) as { idioma_preferido: string; tema_preferido: string };

  // Solo actualizar si cambió algo
  if (usuario.idioma_preferido === idioma && usuario.tema_preferido === tema) {
    return json({ success: true, mensaje: 'Sin cambios' });
  }

  // Actualizar BD
  db.prepare(
    'UPDATE usuarios SET idioma_preferido = ?, tema_preferido = ? WHERE id = ?'
  ).run(idioma, tema, locals.usuario.id);

  // Registrar en auditoría
  auditoriaService.registrar({
    usuarioId: locals.usuario.id,
    accion: 'perfil_preferencias',
    tabla: 'usuarios',
    registroId: locals.usuario.id,
    detalles: {
      idiomaAnterior: usuario.idioma_preferido,
      temaAnterior: usuario.tema_preferido,
      idiomaNuevo: idioma,
      temaNuevo: tema,
      origen: 'navbar'
    },
    ip: getClientAddress()
  });

  return json({ success: true });
};