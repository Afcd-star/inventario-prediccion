import db from '../database';
import { auditoriaService } from './auditoria.service';
import { dispararTransferenciaCompletada, dispararTransferenciaCancelada } from './notificaciones-disparadores';

export const transferenciasService = {
  crear: (
    origenId: number,
    destinoId: number,
    creadoPor: number,
    notas: string | null,
    items: Array<{ producto_id: number; lote_id: number | null; cantidad: number }>,
    ip: string | null
  ) => {
    if (origenId === destinoId) {
      throw new Error('El origen y el destino no pueden ser la misma ubicación');
    }

    // 1. Validar stock en origen
    for (const item of items) {
      const stock = db.prepare(`
        SELECT cantidad_actual FROM lotes 
        WHERE id = ? AND producto_id = ? AND ubicacion_id = ?
      `).get(item.lote_id, item.producto_id, origenId) as { cantidad_actual: number } | undefined;

      if (!stock || stock.cantidad_actual < item.cantidad) {
        throw new Error(`Stock insuficiente en el origen para el producto ${item.producto_id} (lote ${item.lote_id})`);
      }
    }

    // 2. Transacción para crear transferencia y descontar stock del origen
    const crearTransferencia = db.transaction(() => {
      const res = db.prepare(`
        INSERT INTO transferencias (origen_id, destino_id, estado, creado_por, notas)
        VALUES (?, ?, 'en_transito', ?, ?)
      `).run(origenId, destinoId, creadoPor, notas);
      const transferenciaId = res.lastInsertRowid as number;

      const stmtItem = db.prepare(`
        INSERT INTO transferencia_items (transferencia_id, producto_id, lote_id, cantidad_solicitada)
        VALUES (?, ?, ?, ?)
      `);
      
      const stmtMovimiento = db.prepare(`
        INSERT INTO movimientos (producto_id, lote_id, tipo, cantidad, ubicacion_id, notas, fecha)
        VALUES (?, ?, 'transferencia_salida', ?, ?, ?, CURRENT_TIMESTAMP)
      `);

      const stmtActualizarLote = db.prepare(`
        UPDATE lotes SET cantidad_actual = cantidad_actual - ? WHERE id = ?
      `);

      for (const item of items) {
        stmtItem.run(transferenciaId, item.producto_id, item.lote_id, item.cantidad);
        stmtMovimiento.run(item.producto_id, item.lote_id, item.cantidad, origenId, `Transferencia #${transferenciaId} a ubicación ${destinoId}`);
        stmtActualizarLote.run(item.cantidad, item.lote_id);
      }

      return transferenciaId;
    });

    const transferenciaId = crearTransferencia();

    auditoriaService.registrar({
      usuarioId: creadoPor,
      accion: 'transferencia_crear',
      tabla: 'transferencias',
      registroId: transferenciaId,
      detalles: { origenId, destinoId, itemsCount: items.length },
      ip: ip || 'localhost'
    });

    return transferenciaId;
  },

  completar: (
    transferenciaId: number,
    completadoPor: number,
    ip: string | null,
    itemsRecibidos: Array<{ item_id: number; cantidad_recibida: number }>
  ) => {
    const completar = db.transaction(() => {
      // Agregamos creado_por para saber a quién notificar
      const t = db.prepare('SELECT origen_id, destino_id, estado, creado_por FROM transferencias WHERE id = ?').get(transferenciaId) as { origen_id: number; destino_id: number; estado: string; creado_por: number } | undefined;
      if (!t || t.estado !== 'en_transito') {
        throw new Error('La transferencia no está en estado válido para completar');
      }

      const items = db.prepare(`
        SELECT ti.id, ti.producto_id, ti.lote_id, ti.cantidad_solicitada
        FROM transferencia_items ti
        WHERE ti.transferencia_id = ?
      `).all(transferenciaId) as Array<{ id: number; producto_id: number; lote_id: number | null; cantidad_solicitada: number }>;

      const stmtUpdateItem = db.prepare(`UPDATE transferencia_items SET cantidad_recibida = ? WHERE id = ?`);
      const stmtUpdateTransf = db.prepare(`UPDATE transferencias SET estado = 'completada', completada_en = CURRENT_TIMESTAMP WHERE id = ?`);

      for (const item of items) {
        const recibido = itemsRecibidos.find(r => r.item_id === item.id);
        const cantidad = recibido ? recibido.cantidad_recibida : 0;

        if (cantidad > 0) {
          stmtUpdateItem.run(cantidad, item.id);

          // 1. Asegurar que el lote existe en el destino (si no, crearlo con stock 0)
          let loteIdDestino = item.lote_id;
          if (item.lote_id) {
            const loteOrigen = db.prepare('SELECT numero_lote, fecha_caducidad FROM lotes WHERE id = ?').get(item.lote_id) as { numero_lote: string, fecha_caducidad: string } | undefined;
            if (loteOrigen) {
              const existente = db.prepare(`
                SELECT id FROM lotes WHERE producto_id = ? AND numero_lote = ? AND ubicacion_id = ?
              `).get(item.producto_id, loteOrigen.numero_lote, t.destino_id) as { id: number } | undefined;

              if (existente) {
                loteIdDestino = existente.id;
              } else {
                const res = db.prepare(`
                  INSERT INTO lotes (producto_id, numero_lote, fecha_caducidad, cantidad_inicial, cantidad_actual, ubicacion_id)
                  VALUES (?, ?, ?, 0, 0, ?)
                `).run(item.producto_id, loteOrigen.numero_lote, loteOrigen.fecha_caducidad, t.destino_id);
                loteIdDestino = res.lastInsertRowid as number;
              }
            }
          }

          // 2. Registrar movimiento de entrada en destino
          db.prepare(`
            INSERT INTO movimientos (producto_id, lote_id, tipo, cantidad, ubicacion_id, notas, fecha)
            VALUES (?, ?, 'transferencia_entrada', ?, ?, ?, CURRENT_TIMESTAMP)
          `).run(item.producto_id, loteIdDestino, cantidad, t.destino_id, `Recepción de transferencia #${transferenciaId}`);

          // 3. Actualizar stock del lote en destino
          db.prepare(`UPDATE lotes SET cantidad_actual = cantidad_actual + ? WHERE id = ?`).run(cantidad, loteIdDestino);
        }
      }

      stmtUpdateTransf.run(transferenciaId);
      return { creado_por: t.creado_por, origen_id: t.origen_id, destino_id: t.destino_id };
    });

    const resultado = completar();

    auditoriaService.registrar({
      usuarioId: completadoPor,
      accion: 'transferencia_completar',
      tabla: 'transferencias',
      registroId: transferenciaId,
      detalles: { transferenciaId },
      ip: ip || 'localhost'
    });

    // Disparar notificación de transferencia completada
    const origen = db.prepare('SELECT nombre FROM ubicaciones WHERE id = ?').get(resultado.origen_id) as { nombre: string };
    const destino = db.prepare('SELECT nombre FROM ubicaciones WHERE id = ?').get(resultado.destino_id) as { nombre: string };
    dispararTransferenciaCompletada(transferenciaId, origen.nombre, destino.nombre, resultado.creado_por);
  },

  cancelar: (transferenciaId: number, canceladoPor: number, ip: string | null) => {
    const cancelar = db.transaction(() => {
      // Agregamos creado_por para saber a quién notificar
      const t = db.prepare('SELECT origen_id, destino_id, estado, creado_por FROM transferencias WHERE id = ?').get(transferenciaId) as { origen_id: number; destino_id: number; estado: string; creado_por: number } | undefined;
      if (!t || t.estado === 'completada' || t.estado === 'cancelada') {
        throw new Error('No se puede cancelar esta transferencia');
      }

      const items = db.prepare(`
        SELECT ti.id, ti.producto_id, ti.lote_id, ti.cantidad_solicitada, ti.cantidad_recibida
        FROM transferencia_items ti
        WHERE ti.transferencia_id = ?
      `).all(transferenciaId) as Array<{ id: number; producto_id: number; lote_id: number | null; cantidad_solicitada: number; cantidad_recibida: number | null }>;

      for (const item of items) {
        const aDevolver = item.cantidad_solicitada - (item.cantidad_recibida || 0);
        if (aDevolver > 0) {
          db.prepare(`
            INSERT INTO movimientos (producto_id, lote_id, tipo, cantidad, ubicacion_id, notas, fecha)
            VALUES (?, ?, 'transferencia_cancelada', ?, ?, ?, CURRENT_TIMESTAMP)
          `).run(item.producto_id, item.lote_id, aDevolver, t.origen_id, `Cancelación de transferencia #${transferenciaId}`);

          db.prepare(`UPDATE lotes SET cantidad_actual = cantidad_actual + ? WHERE id = ?`).run(aDevolver, item.lote_id);
        }
      }

      db.prepare(`UPDATE transferencias SET estado = 'cancelada', completada_en = CURRENT_TIMESTAMP WHERE id = ?`).run(transferenciaId);
      return { creado_por: t.creado_por, origen_id: t.origen_id, destino_id: t.destino_id };
    });

    const resultado = cancelar();

    auditoriaService.registrar({
      usuarioId: canceladoPor,
      accion: 'transferencia_cancelar',
      tabla: 'transferencias',
      registroId: transferenciaId,
      detalles: { transferenciaId },
      ip: ip || 'localhost'
    });

    // Disparar notificación de transferencia cancelada
    const origen = db.prepare('SELECT nombre FROM ubicaciones WHERE id = ?').get(resultado.origen_id) as { nombre: string };
    const destino = db.prepare('SELECT nombre FROM ubicaciones WHERE id = ?').get(resultado.destino_id) as { nombre: string };
    dispararTransferenciaCancelada(transferenciaId, origen.nombre, destino.nombre, resultado.creado_por);
  },

  obtenerDetalles: (transferenciaId: number) => {
    const t = db.prepare(`
      SELECT tr.*, u_origen.nombre as origen_nombre, u_destino.nombre as destino_nombre, us.nombre as creador_nombre
      FROM transferencias tr
      JOIN ubicaciones u_origen ON tr.origen_id = u_origen.id
      JOIN ubicaciones u_destino ON tr.destino_id = u_destino.id
      LEFT JOIN usuarios us ON tr.creado_por = us.id
      WHERE tr.id = ?
    `).get(transferenciaId) as any;

    if (!t) return null;

    t.items = db.prepare(`
      SELECT ti.*, p.nombre as producto_nombre, l.numero_lote
      FROM transferencia_items ti
      JOIN productos p ON ti.producto_id = p.id
      LEFT JOIN lotes l ON ti.lote_id = l.id
      WHERE ti.transferencia_id = ?
    `).all(transferenciaId);

    return t;
  },

  obtenerActivas: () => {
    return db.prepare(`
      SELECT tr.id, tr.origen_id, tr.destino_id, tr.estado, tr.creada_en, tr.notas,
             u_origen.nombre as origen_nombre, u_destino.nombre as destino_nombre
      FROM transferencias tr
      JOIN ubicaciones u_origen ON tr.origen_id = u_origen.id
      JOIN ubicaciones u_destino ON tr.destino_id = u_destino.id
      WHERE tr.estado IN ('pendiente', 'en_transito')
      ORDER BY tr.creada_en DESC
    `).all() as Array<{
      id: number;
      origen_id: number;
      destino_id: number;
      estado: string;
      creada_en: string;
      notas: string | null;
      origen_nombre: string;
      destino_nombre: string;
    }>;
  }
};