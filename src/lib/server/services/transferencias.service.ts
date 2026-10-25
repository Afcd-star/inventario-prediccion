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

      let totalRecibido = 0;

      for (const item of items) {
        const recibido = itemsRecibidos.find(r => r.item_id === item.id);
        const cantidad = recibido && recibido.cantidad_recibida != null ? recibido.cantidad_recibida : 0;

        if (cantidad < 0) {
          throw new Error(`Cantidad recibida negativa para el item ${item.id}`);
        }
        if (cantidad > item.cantidad_solicitada) {
          throw new Error(`Se recibió más de lo solicitado en el item ${item.id} (${cantidad} > ${item.cantidad_solicitada})`);
        }

        totalRecibido += cantidad;

        // 🆕 Devolución al ORIGEN de lo NO recibido (cierra el bug de recepción parcial).
        // Corre SIEMPRE, antes de los branches: cubre cantidad===0 (devuelve todo) y
        // 0<cantidad<solicitada (devuelve la diferencia). Si lote_id es null, 'crear' no
        // decrementó ningún lote (UPDATE ... WHERE id=NULL = no-op), así que no hay fuga
        // que cerrar y no devolvemos nada. Coherente.
        const devolver = item.cantidad_solicitada - cantidad;
        if (devolver > 0 && item.lote_id != null) {
          db.prepare(`
            INSERT INTO movimientos (producto_id, lote_id, tipo, cantidad, ubicacion_id, notas, fecha)
            VALUES (?, ?, 'transferencia_cancelada', ?, ?, ?, CURRENT_TIMESTAMP)
          `).run(
            item.producto_id, item.lote_id, devolver, t.origen_id,
            `Devolución por recepción parcial de transferencia #${transferenciaId} (no llegaron ${devolver} de ${item.cantidad_solicitada})`
          );
          db.prepare(`UPDATE lotes SET cantidad_actual = cantidad_actual + ? WHERE id = ?`).run(devolver, item.lote_id);
        }

        // Registro de lo recibido en DESTINO
        if (cantidad > 0) {
          stmtUpdateItem.run(cantidad, item.id);

          if (item.lote_id == null) {
            throw new Error(
              `El item ${item.id} (producto ${item.producto_id}) no tiene lote de origen; ` +
              `no se puede recibir stock sin lote. Corrige la transferencia o cancélala.`
            );
          }

          const loteOrigen = db.prepare('SELECT numero_lote, fecha_caducidad FROM lotes WHERE id = ?').get(item.lote_id) as { numero_lote: string; fecha_caducidad: string } | undefined;
          if (!loteOrigen) {
            throw new Error(`El lote de origen ${item.lote_id} del item ${item.id} ya no existe`);
          }

          const existente = db.prepare(`
            SELECT id FROM lotes WHERE producto_id = ? AND numero_lote = ? AND ubicacion_id = ?
          `).get(item.producto_id, loteOrigen.numero_lote, t.destino_id) as { id: number } | undefined;

          const loteIdDestino = existente
            ? existente.id
            : (db.prepare(`
                INSERT INTO lotes (producto_id, numero_lote, fecha_caducidad, cantidad_inicial, cantidad_actual, ubicacion_id)
                VALUES (?, ?, ?, 0, 0, ?)
              `).run(item.producto_id, loteOrigen.numero_lote, loteOrigen.fecha_caducidad, t.destino_id).lastInsertRowid as number);

          db.prepare(`
            INSERT INTO movimientos (producto_id, lote_id, tipo, cantidad, ubicacion_id, notas, fecha)
            VALUES (?, ?, 'transferencia_entrada', ?, ?, ?, CURRENT_TIMESTAMP)
          `).run(item.producto_id, loteIdDestino, cantidad, t.destino_id, `Recepción de transferencia #${transferenciaId}`);

          db.prepare(`UPDATE lotes SET cantidad_actual = cantidad_actual + ? WHERE id = ?`).run(cantidad, loteIdDestino);
        } else {
          // cantidad === 0: item procesado y no recibido → 0 explícito (no NULL).
          // La devolución al origen YA corrió arriba (devolver === solicitada).
          stmtUpdateItem.run(0, item.id);
        }
      }

      // 🚨 No se "completa" una transferencia donde no llegó nada: eso es una cancelación.
      // Throw dentro de la transacción => rollback => la devolución parcial NO se persiste
      // => el origen sigue decrementado (estado 'en_transito' honesto: stock aún viajando).
      if (totalRecibido === 0) {
        throw new Error('No se recibió ninguna cantidad. Cancela la transferencia o registra la recepción real.');
      }

      stmtUpdateTransf.run(transferenciaId);
      return { creado_por: t.creado_por, origen_id: t.origen_id, destino_id: t.destino_id };
    });

    const resultado = completar();   // si throwea arriba, NUNCA se dispara la notificación

    auditoriaService.registrar({
      usuarioId: completadoPor,
      accion: 'transferencia_completar',
      tabla: 'transferencias',
      registroId: transferenciaId,
      detalles: { transferenciaId },
      ip: ip || 'localhost'
    });

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