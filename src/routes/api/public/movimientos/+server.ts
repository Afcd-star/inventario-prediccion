import { json } from '@sveltejs/kit';
import db from '$lib/server/database';
import { apiGateway } from '$lib/server/services/apigateway.service';
import { apiKeysService } from '$lib/server/services/apikeys.service';
import type { RequestHandler } from './$types';
import { webhooksService } from '$lib/server/services/webhooks.service';

export const POST: RequestHandler = async ({ request, getClientAddress, url }) => {
  const inicio = Date.now();
  const auth = apiGateway.autenticar(request.headers);

  if (!auth.ok) {
    apiGateway.registrarLlamada(null, url.pathname, 'POST', auth.codigo, Date.now() - inicio, getClientAddress());
    return json({ error: auth.error }, { status: auth.codigo });
  }

  if (!apiKeysService.tieneScope(auth.key, 'movimientos:escribir')) {
    apiGateway.registrarLlamada(auth.key.id, url.pathname, 'POST', 403, Date.now() - inicio, getClientAddress());
    return json({ error: 'Scope insuficiente: se requiere movimientos:escribir' }, { status: 403 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    apiGateway.registrarLlamada(auth.key.id, url.pathname, 'POST', 400, Date.now() - inicio, getClientAddress());
    return json({ error: 'JSON inválido' }, { status: 400 });
  }

  const { producto_id, tipo, cantidad, lote_id, notas } = body;

  // Validaciones
  if (!producto_id || !tipo || !cantidad) {
    apiGateway.registrarLlamada(auth.key.id, url.pathname, 'POST', 400, Date.now() - inicio, getClientAddress());
    return json({ error: 'Campos requeridos: producto_id, tipo, cantidad' }, { status: 400 });
  }

  if (!['entrada', 'salida'].includes(tipo)) {
    apiGateway.registrarLlamada(auth.key.id, url.pathname, 'POST', 400, Date.now() - inicio, getClientAddress());
    return json({ error: 'Tipo de movimiento inválido. Solo se permiten: entrada, salida' }, { status: 400 });
  }

  const cantidadNum = Number(cantidad);
  if (!Number.isInteger(cantidadNum) || cantidadNum <= 0) {
    apiGateway.registrarLlamada(auth.key.id, url.pathname, 'POST', 400, Date.now() - inicio, getClientAddress());
    return json({ error: 'La cantidad debe ser un entero positivo' }, { status: 400 });
  }

  // Verificar que el producto existe
  const producto = db.prepare('SELECT id FROM productos WHERE id = ?').get(producto_id);
  if (!producto) {
    apiGateway.registrarLlamada(auth.key.id, url.pathname, 'POST', 404, Date.now() - inicio, getClientAddress());
    return json({ error: 'Producto no encontrado' }, { status: 404 });
  }

  // Si se proporciona lote_id, verificar que existe y pertenece al producto
  if (lote_id) {
    const lote = db.prepare('SELECT id, cantidad_actual FROM lotes WHERE id = ? AND producto_id = ?').get(lote_id, producto_id) as { id: number; cantidad_actual: number } | undefined;
    if (!lote) {
      apiGateway.registrarLlamada(auth.key.id, url.pathname, 'POST', 404, Date.now() - inicio, getClientAddress());
      return json({ error: 'Lote no encontrado o no pertenece al producto' }, { status: 404 });
    }

    if (tipo === 'salida' && lote.cantidad_actual < cantidadNum) {
      apiGateway.registrarLlamada(auth.key.id, url.pathname, 'POST', 400, Date.now() - inicio, getClientAddress());
      return json({ error: 'Stock insuficiente en el lote' }, { status: 400 });
    }
  }

  // Ejecutar el movimiento en una transacción
  try {
    const registrar = db.transaction(() => {
      // Obtener ubicación del lote (si existe) o usar la primera ubicación activa
      let ubicacionId: number | null = null;
      if (lote_id) {
        const lote = db.prepare('SELECT ubicacion_id FROM lotes WHERE id = ?').get(lote_id) as { ubicacion_id: number } | undefined;
        ubicacionId = lote?.ubicacion_id ?? null;
      } else {
        const primeraUbicacion = db.prepare('SELECT id FROM ubicaciones WHERE activa = 1 ORDER BY id LIMIT 1').get() as { id: number } | undefined;
        ubicacionId = primeraUbicacion?.id ?? null;
      }

      // Registrar el movimiento
      const res = db.prepare(`
        INSERT INTO movimientos (producto_id, tipo, cantidad, lote_id, ubicacion_id, notas)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(producto_id, tipo, cantidadNum, lote_id, ubicacionId, notas || null);
      const movimientoId = res.lastInsertRowid as number;

      // Actualizar stock del lote si se proporcionó
      if (lote_id) {
        if (tipo === 'entrada') {
          db.prepare('UPDATE lotes SET cantidad_actual = cantidad_actual + ? WHERE id = ?').run(cantidadNum, lote_id);
        } else {
          db.prepare('UPDATE lotes SET cantidad_actual = cantidad_actual - ? WHERE id = ?').run(cantidadNum, lote_id);
        }
      }

      // Actualizar stock global del producto
      if (tipo === 'entrada') {
        db.prepare('UPDATE productos SET stock_actual = stock_actual + ? WHERE id = ?').run(cantidadNum, producto_id);
      } else {
        db.prepare('UPDATE productos SET stock_actual = stock_actual - ? WHERE id = ?').run(cantidadNum, producto_id);
      }

      return movimientoId;
    });

    const movimientoId = registrar();

    // Disparar evento de webhook
    webhooksService.dispararEvento('movimiento.registrado', {
      movimiento_id: movimientoId,
      producto_id,
      tipo,
      cantidad: cantidadNum,
      lote_id: lote_id || null,
      notas: notas || null,
      timestamp: new Date().toISOString()
    });

    apiGateway.registrarLlamada(auth.key.id, url.pathname, 'POST', 201, Date.now() - inicio, getClientAddress());
    return json({ ok: true, movimiento_id: movimientoId }, { status: 201 });
  } catch (e: any) {
    apiGateway.registrarLlamada(auth.key.id, url.pathname, 'POST', 500, Date.now() - inicio, getClientAddress());
    return json({ error: e.message || 'Error al registrar el movimiento' }, { status: 500 });
  }
};