import { fail, redirect } from '@sveltejs/kit';
import db from '$lib/server/database';
import { apiKeysService } from '$lib/server/services/apikeys.service';
import { webhooksService } from '$lib/server/services/webhooks.service';
import { auditoriaService } from '$lib/server/services/auditoria.service';
import type { PageServerLoad, Actions } from './$types';

export const load = (async ({ locals }) => {
  if (!locals.usuario || locals.usuario.rol !== 'admin') {
    throw redirect(303, '/dashboard');
  }

  const apiKeys = apiKeysService.listar();
  const webhooks = webhooksService.listar();

  const logsApi = db.prepare(`
    SELECT l.id, l.endpoint, l.metodo, l.codigo_respuesta, l.duracion_ms, l.ip, l.creada_en,
           k.nombre as nombre_clave
    FROM api_logs l
    LEFT JOIN api_keys k ON l.api_key_id = k.id
    ORDER BY l.creada_en DESC
    LIMIT 50
  `).all();

  const entregasWebhook = db.prepare(`
    SELECT e.id, e.evento, e.estado, e.intentos, e.creada_en, e.completada_en, e.ultima_respuesta,
           w.url as webhook_url
    FROM webhook_entregas e
    JOIN webhooks w ON e.webhook_id = w.id
    ORDER BY e.creada_en DESC
    LIMIT 50
  `).all();

  return { apiKeys, webhooks, logsApi, entregasWebhook };
}) satisfies PageServerLoad;

export const actions = {
  crearApiKey: async ({ request, locals, getClientAddress }) => {
    if (!locals.usuario || locals.usuario.rol !== 'admin') throw fail(403);

    const data = await request.formData();
    const nombre = data.get('nombre')?.toString();
    const scopes = data.getAll('scopes') as string[];
    const expiraEn = data.get('expira_en')?.toString() || null;

    if (!nombre || scopes.length === 0) {
      return fail(400, { error: 'integraciones.errorApiKeyCampos' });
    }

    const resultado = apiKeysService.crear(nombre, scopes, locals.usuario.id, expiraEn);

    auditoriaService.registrar({
      usuarioId: locals.usuario.id,
      accion: 'api_key_crear',
      tabla: 'api_keys',
      registroId: resultado.id,
      detalles: { nombre, scopes },
      ip: getClientAddress()
    });

    return { success: 'api_key_creada', secretoNuevo: resultado.secreto };
  },

  revocarApiKey: async ({ request, locals, getClientAddress }) => {
    if (!locals.usuario || locals.usuario.rol !== 'admin') throw fail(403);

    const data = await request.formData();
    const id = Number(data.get('id'));

    apiKeysService.revocar(id);

    auditoriaService.registrar({
      usuarioId: locals.usuario.id,
      accion: 'api_key_revocar',
      tabla: 'api_keys',
      registroId: id,
      detalles: {},
      ip: getClientAddress()
    });

    return { success: 'api_key_revocada' };
  },

  crearWebhook: async ({ request, locals, getClientAddress }) => {
    if (!locals.usuario || locals.usuario.rol !== 'admin') throw fail(403);

    const data = await request.formData();
    const url = data.get('url')?.toString();
    const eventos = data.getAll('eventos') as string[];

    if (!url || !url.startsWith('http') || eventos.length === 0) {
      return fail(400, { error: 'integraciones.errorWebhookCampos' });
    }

    const resultado = webhooksService.crear(url, eventos, locals.usuario.id);

    auditoriaService.registrar({
      usuarioId: locals.usuario.id,
      accion: 'webhook_crear',
      tabla: 'webhooks',
      registroId: resultado.id,
      detalles: { url, eventos },
      ip: getClientAddress()
    });

    return { success: 'webhook_creado', secretoNuevo: resultado.secreto };
  },

  eliminarWebhook: async ({ request, locals, getClientAddress }) => {
    if (!locals.usuario || locals.usuario.rol !== 'admin') throw fail(403);

    const data = await request.formData();
    const id = Number(data.get('id'));

    webhooksService.eliminar(id);

    auditoriaService.registrar({
      usuarioId: locals.usuario.id,
      accion: 'webhook_eliminar',
      tabla: 'webhooks',
      registroId: id,
      detalles: {},
      ip: getClientAddress()
    });

    return { success: 'webhook_eliminado' };
  }
} satisfies Actions;