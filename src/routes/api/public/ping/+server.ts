import { json } from '@sveltejs/kit';
import { apiGateway } from '$lib/server/services/apigateway.service';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request, getClientAddress, url }) => {
  const inicio = Date.now();
  const auth = apiGateway.autenticar(request.headers);

  if (!auth.ok) {
    apiGateway.registrarLlamada(null, url.pathname, 'GET', auth.codigo, Date.now() - inicio, getClientAddress());
    return json({ error: auth.error }, { status: auth.codigo });
  }

  apiGateway.registrarLlamada(auth.key.id, url.pathname, 'GET', 200, Date.now() - inicio, getClientAddress());
  return json({ ok: true, mensaje: 'Conexión establecida', clave: auth.key.nombre });
};