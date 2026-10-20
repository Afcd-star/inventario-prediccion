import db from '../database';
import { notificacionesService } from './notificaciones.service';
import type { TipoNotificacion } from '$lib/types';

/**
 * Dispara notificación de stock bajo para todos los usuarios admin.
 */
export function dispararStockBajo(productoId: number, productoNombre: string, stockActual: number, stockMinimo: number): void {
  const admins = db.prepare(`
    SELECT id FROM usuarios WHERE rol = 'admin'
  `).all() as Array<{ id: number }>;

  for (const admin of admins) {
    notificacionesService.crear(
      admin.id,
      'stock_bajo',
      'Stock bajo detectado',
      `El producto "${productoNombre}" tiene stock actual de ${stockActual} unidades, por debajo del mínimo de ${stockMinimo}.`,
      { producto_id: productoId, stock_actual: stockActual, stock_minimo: stockMinimo }
    );
  }
}

/**
 * Dispara notificación de anomalía detectada.
 */
export function dispararAnomalia(anomaliaId: number, productoNombre: string, tipo: string, desviacion: number): void {
  const admins = db.prepare(`
    SELECT id FROM usuarios WHERE rol = 'admin'
  `).all() as Array<{ id: number }>;

  for (const admin of admins) {
    notificacionesService.crear(
      admin.id,
      'anomalia_detectada',
      'Anomalía detectada',
      `Se detectó una anomalía de tipo "${tipo}" en el producto "${productoNombre}" con desviación del ${desviacion.toFixed(1)}%.`,
      { anomalia_id: anomaliaId, producto_nombre: productoNombre, tipo, desviacion }
    );
  }
}

/**
 * Dispara notificación de transferencia completada para el creador y el destinatario.
 */
export function dispararTransferenciaCompletada(transferenciaId: number, origenNombre: string, destinoNombre: string, creadoPor: number): void {
  // Notificar al creador
  notificacionesService.crear(
    creadoPor,
    'transferencia_completada',
    'Transferencia completada',
    `La transferencia #${transferenciaId} de ${origenNombre} a ${destinoNombre} ha sido completada.`,
    { transferencia_id: transferenciaId, origen: origenNombre, destino: destinoNombre }
  );

  // Notificar a todos los admins del destino (si son diferentes al creador)
  const adminsDestino = db.prepare(`
    SELECT DISTINCT u.id FROM usuarios u
    WHERE u.rol = 'admin' AND u.id != ?
  `).all(creadoPor) as Array<{ id: number }>;

  for (const admin of adminsDestino) {
    notificacionesService.crear(
      admin.id,
      'transferencia_completada',
      'Transferencia completada',
      `La transferencia #${transferenciaId} de ${origenNombre} a ${destinoNombre} ha sido completada.`,
      { transferencia_id: transferenciaId, origen: origenNombre, destino: destinoNombre }
    );
  }
}

/**
 * Dispara notificación de transferencia cancelada.
 */
export function dispararTransferenciaCancelada(transferenciaId: number, origenNombre: string, destinoNombre: string, creadoPor: number): void {
  notificacionesService.crear(
    creadoPor,
    'transferencia_cancelada',
    'Transferencia cancelada',
    `La transferencia #${transferenciaId} de ${origenNombre} a ${destinoNombre} ha sido cancelada. El stock ha regresado al origen.`,
    { transferencia_id: transferenciaId, origen: origenNombre, destino: destinoNombre }
  );
}

/**
 * Revisa lotes por vencer en los próximos 7 días y dispara notificaciones.
 * Debe ejecutarse diariamente (puede llamarse desde un endpoint o cron job).
 */
export function revisarLotesPorVencer(): void {
  const lotesProximos = db.prepare(`
    SELECT l.id, l.producto_id, l.numero_lote, l.fecha_caducidad, l.cantidad_actual,
           p.nombre as producto_nombre, u.nombre as ubicacion_nombre
    FROM lotes l
    JOIN productos p ON l.producto_id = p.id
    JOIN ubicaciones u ON l.ubicacion_id = u.id
    WHERE l.fecha_caducidad BETWEEN date('now') AND date('now', '+7 days')
      AND l.cantidad_actual > 0
  `).all() as Array<{
    id: number;
    producto_id: number;
    numero_lote: string;
    fecha_caducidad: string;
    cantidad_actual: number;
    producto_nombre: string;
    ubicacion_nombre: string;
  }>;

  const admins = db.prepare(`
    SELECT id FROM usuarios WHERE rol = 'admin'
  `).all() as Array<{ id: number }>;

  for (const admin of admins) {
    for (const lote of lotesProximos) {
      const diasRestantes = Math.ceil(
        (new Date(lote.fecha_caducidad).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      notificacionesService.crear(
        admin.id,
        'lote_por_vencer',
        'Lote próximo a vencer',
        `El lote "${lote.numero_lote}" del producto "${lote.producto_nombre}" en ${lote.ubicacion_nombre} vence en ${diasRestantes} días (${lote.fecha_caducidad}). Stock actual: ${lote.cantidad_actual}.`,
        { lote_id: lote.id, producto_id: lote.producto_id, dias_restantes: diasRestantes }
      );
    }
  }
}