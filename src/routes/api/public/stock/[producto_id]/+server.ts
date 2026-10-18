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

  if (!apiKeysService.tieneScope(auth.key, 'stock:leer')) {
    apiGateway.registrarLlamada(auth.key.id, url.pathname, 'GET', 403, Date.now() - inicio, getClientAddress());
    return json({ error: 'Scope insuficiente: se requiere stock:leer' }, { status: 403 });
  }

  const productoId = Number(params.producto_id);
  if (!productoId || !Number.isInteger(productoId)) {
    apiGateway.registrarLlamada(auth.key.id, url.pathname, 'GET', 400, Date.now() - inicio, getClientAddress());
    return json({ error: 'ID de producto inválido' }, { status: 400 });
  }

  const producto = db.prepare('SELECT id, nombre FROM productos WHERE id = ?').get(productoId) as { id: number; nombre: string } | undefined;
  if (!producto) {
    apiGateway.registrarLlamada(auth.key.id, url.pathname, 'GET', 404, Date.now() - inicio, getClientAddress());
    return json({ error: 'Producto no encontrado' }, { status: 404 });
  }

  const stockPorUbicacion = db.prepare(`
    SELECT 
      u.id as ubicacion_id,
      u.nombre as ubicacion_nombre,
      COALESCE(SUM(l.cantidad_actual), 0) as stock_total,
      COUNT(l.id) as lotes_activos
    FROM ubicaciones u
    LEFT JOIN lotes l ON u.id = l.ubicacion_id AND l.producto_id = ? AND l.cantidad_actual > 0
    WHERE u.activa = 1
    GROUP BY u.id, u.nombre
    HAVING stock_total > 0
    ORDER BY u.nombre
  `).all(productoId);

  apiGateway.registrarLlamada(auth.key.id, url.pathname, 'GET', 200, Date.now() - inicio, getClientAddress());
  return json({ producto_id: producto.id, nombre: producto.nombre, stock_por_ubicacion: stockPorUbicacion });
};