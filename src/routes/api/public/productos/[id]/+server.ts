import { json } from '@sveltejs/kit';
import db from '$lib/server/database';
import { apiGateway } from '$lib/server/services/apigateway.service';
import { apiKeysService } from '$lib/server/services/apikeys.service';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, request, getClientAddress, url }) => {
  const inicio = Date.now();
  const auth = apiGateway.autenticar(request.headers);

  if (!auth.ok) {
    apiGateway.registrarLlamada(null, url.pathname, 'GET', auth.codigo, Date.now() - inicio, getClientAddress());
    return json({ error: auth.error }, { status: auth.codigo });
  }

  if (!apiKeysService.tieneScope(auth.key, 'productos:leer')) {
    apiGateway.registrarLlamada(auth.key.id, url.pathname, 'GET', 403, Date.now() - inicio, getClientAddress());
    return json({ error: 'Scope insuficiente: se requiere productos:leer' }, { status: 403 });
  }

  const productoId = Number(params.id);
  if (!productoId || !Number.isInteger(productoId)) {
    apiGateway.registrarLlamada(auth.key.id, url.pathname, 'GET', 400, Date.now() - inicio, getClientAddress());
    return json({ error: 'ID de producto inválido' }, { status: 400 });
  }

  const producto = db.prepare(`
    SELECT id, nombre, descripcion, precio, stock_actual, stock_minimo
    FROM productos
    WHERE id = ?
  `).get(productoId);

  if (!producto) {
    apiGateway.registrarLlamada(auth.key.id, url.pathname, 'GET', 404, Date.now() - inicio, getClientAddress());
    return json({ error: 'Producto no encontrado' }, { status: 404 });
  }

  apiGateway.registrarLlamada(auth.key.id, url.pathname, 'GET', 200, Date.now() - inicio, getClientAddress());
  return json(producto);
};