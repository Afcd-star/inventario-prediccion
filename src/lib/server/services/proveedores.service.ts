import db from '../database';
import { auditoriaService } from './auditoria.service';
import type { Proveedor, ProductoAsociado, ParActivo } from '../../types';

// Fila de lista: proveedor + cuántos productos tiene asociados (para la grilla de 15.3)
type ProveedorConConteo = Proveedor & { productos_asociados: number };

// Fila para la ficha de producto (13): proveedores que surten este producto
type ProveedorDelProducto = {
  proveedor_id: number;
  nombre: string;
  contacto: string | null;
  email: string | null;
  telefono: string | null;
  costo_unitario: number;
  tiempo_entrega_efectivo: number | null;
  pedido_minimo: number | null;
};

// better-sqlite3 reporta violaciones de constraint con code SQLITE_CONSTRAINT_*;
// normalizamos a booleano sin depender del sufijo exacto del driver.
function esViolacionUnique(e: unknown): boolean {
  const code = (e as { code?: string })?.code ?? '';
  const msg = (e as { message?: string })?.message ?? '';
  return code.includes('UNIQUE') || msg.includes('UNIQUE');
}

export const proveedoresService = {
  obtenerTodas: (): ProveedorConConteo[] => {
    return db.prepare(`
      SELECT p.*, COUNT(pp.id) AS productos_asociados
      FROM proveedores p
      LEFT JOIN producto_proveedor pp ON pp.proveedor_id = p.id
      GROUP BY p.id
      ORDER BY p.nombre ASC
    `).all() as ProveedorConConteo[];
  },

  obtenerPorId: (id: number): Proveedor | undefined => {
    return db.prepare('SELECT * FROM proveedores WHERE id = ?').get(id) as Proveedor | undefined;
  },

  // Catálogo mínimo para el selector "añadir producto" de la ficha (15.3b).
  // Solo id + nombre: la ficha no necesita precio/stock aquí (los muestra la tabla de
  // asociaciones, que ya trae stock_actual vía obtenerProductosDelProveedor).
  obtenerCatalogoProductos: (): Array<{ id: number; nombre: string }> => {
    return db.prepare('SELECT id, nombre FROM productos ORDER BY nombre ASC').all() as
      Array<{ id: number; nombre: string }>;
  },

  crear: (
    datos: {
      nombre: string;
      contacto: string | null;
      email: string | null;
      telefono: string | null;
      tiempo_entrega_dias: number | null;
      notas: string | null;
    },
    usuarioId: number,
    ip: string | null
  ): number => {
    const res = db.prepare(`
      INSERT INTO proveedores (nombre, contacto, email, telefono, tiempo_entrega_dias, notas, activa)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `).run(
      datos.nombre,
      datos.contacto,
      datos.email,
      datos.telefono,
      datos.tiempo_entrega_dias,
      datos.notas
    );
    const id = res.lastInsertRowid as number;

    auditoriaService.registrar({
      usuarioId,
      accion: 'proveedor_crear',
      tabla: 'proveedores',
      registroId: id,
      detalles: { nombre: datos.nombre },
      ip: ip || 'localhost'
    });
    return id;
  },

  actualizar: (
    id: number,
    datos: {
      nombre: string;
      contacto: string | null;
      email: string | null;
      telefono: string | null;
      tiempo_entrega_dias: number | null;
      notas: string | null;
      activa: number;
    },
    usuarioId: number,
    ip: string | null
  ): void => {
    db.prepare(`
      UPDATE proveedores
      SET nombre = ?, contacto = ?, email = ?, telefono = ?,
          tiempo_entrega_dias = ?, notas = ?, activa = ?
      WHERE id = ?
    `).run(
      datos.nombre,
      datos.contacto,
      datos.email,
      datos.telefono,
      datos.tiempo_entrega_dias,
      datos.notas,
      datos.activa,
      id
    );

    auditoriaService.registrar({
      usuarioId,
      accion: 'proveedor_actualizar',
      tabla: 'proveedores',
      registroId: id,
      detalles: { nombre: datos.nombre, activa: datos.activa },
      ip: ip || 'localhost'
    });
  },

  // Guard de integridad: NO se elimina un proveedor con productos asociados en silencio.
  // El CASCADE de 15.1 borraría las asociaciones (y con ellas el historial de costos/lead-time)
  // sin aviso. Exigimos desasociar primero; la UI de 15.3 ofrece ese paso explícito.
  eliminar: (id: number, usuarioId: number, ip: string | null): void => {
    const asociados = db.prepare(
      'SELECT COUNT(*) AS n FROM producto_proveedor WHERE proveedor_id = ?'
    ).get(id) as { n: number };

    if (asociados.n > 0) {
      throw new Error(
        'No se puede eliminar: el proveedor tiene productos asociados. Desasócialos primero.'
      );
    }

    const proveedor = db.prepare('SELECT nombre FROM proveedores WHERE id = ?').get(id) as
      { nombre: string } | undefined;

    db.prepare('DELETE FROM proveedores WHERE id = ?').run(id);

    auditoriaService.registrar({
      usuarioId,
      accion: 'proveedor_eliminar',
      tabla: 'proveedores',
      registroId: id,
      detalles: { nombre: proveedor?.nombre ?? 'desconocido' },
      ip: ip || 'localhost'
    });
  },

  // Para la ficha de producto (Fase 13): ¿quién surte este producto?
  obtenerProveedoresDelProducto: (productoId: number): ProveedorDelProducto[] => {
    return db.prepare(`
      SELECT
        pr.id AS proveedor_id,
        pr.nombre,
        pr.contacto,
        pr.email,
        pr.telefono,
        pp.costo_unitario,
        COALESCE(pp.tiempo_entrega_dias, pr.tiempo_entrega_dias) AS tiempo_entrega_efectivo,
        pp.pedido_minimo
      FROM producto_proveedor pp
      JOIN proveedores pr ON pr.id = pp.proveedor_id
      WHERE pp.producto_id = ? AND pr.activa = 1
      ORDER BY pr.nombre ASC
    `).all(productoId) as ProveedorDelProducto[];
  },

  // Para la vista detalle del proveedor (15.3): ¿qué productos surte, a qué costo y plazo?
  obtenerProductosDelProveedor: (proveedorId: number): ProductoAsociado[] => {
    return db.prepare(`
      SELECT
        pp.id AS asociacion_id,
        pp.producto_id,
        prod.nombre AS producto_nombre,
        prod.stock_actual,
        prod.stock_minimo,
        pp.costo_unitario,
        pp.tiempo_entrega_dias AS tiempo_entrega_override,
        COALESCE(pp.tiempo_entrega_dias, prov.tiempo_entrega_dias) AS tiempo_entrega_efectivo,
        pp.pedido_minimo
      FROM producto_proveedor pp
      JOIN productos prod ON prod.id = pp.producto_id
      JOIN proveedores prov ON prov.id = pp.proveedor_id
      WHERE pp.proveedor_id = ?
      ORDER BY prod.nombre ASC
    `).all(proveedorId) as ProductoAsociado[];
  },

  asociarProducto: (
    proveedorId: number,
    productoId: number,
    costoUnitario: number,
    tiempoEntregaDias: number | null,
    pedidoMinimo: number | null,
    usuarioId: number,
    ip: string | null
  ): number => {
    try {
      const res = db.prepare(`
        INSERT INTO producto_proveedor
          (producto_id, proveedor_id, costo_unitario, tiempo_entrega_dias, pedido_minimo)
        VALUES (?, ?, ?, ?, ?)
      `).run(productoId, proveedorId, costoUnitario, tiempoEntregaDias, pedidoMinimo);
      const id = res.lastInsertRowid as number;

      auditoriaService.registrar({
        usuarioId,
        accion: 'proveedor_asociar_producto',
        tabla: 'producto_proveedor',
        registroId: id,
        detalles: { proveedorId, productoId, costoUnitario },
        ip: ip || 'localhost'
      });
      return id;
    } catch (e) {
      if (esViolacionUnique(e)) {
        throw new Error('Este producto ya está asociado a este proveedor.');
      }
      throw e; // FK u otro error: se propaga para que el action lo traduzca.
    }
  },

  desasociarProducto: (
    asociacionId: number,
    usuarioId: number,
    ip: string | null
  ): void => {
    const asoc = db.prepare(
      'SELECT producto_id, proveedor_id FROM producto_proveedor WHERE id = ?'
    ).get(asociacionId) as { producto_id: number; proveedor_id: number } | undefined;

    db.prepare('DELETE FROM producto_proveedor WHERE id = ?').run(asociacionId);

    auditoriaService.registrar({
      usuarioId,
      accion: 'proveedor_desasociar_producto',
      tabla: 'producto_proveedor',
      registroId: asociacionId,
      detalles: asoc ?? { asociacionId },
      ip: ip || 'localhost'
    });
  },

  actualizarAsociacion: (
    asociacionId: number,
    datos: { costo_unitario: number; tiempo_entrega_dias: number | null; pedido_minimo: number | null },
    usuarioId: number,
    ip: string | null
  ): void => {
    db.prepare(`
      UPDATE producto_proveedor
      SET costo_unitario = ?, tiempo_entrega_dias = ?, pedido_minimo = ?
      WHERE id = ?
    `).run(datos.costo_unitario, datos.tiempo_entrega_dias, datos.pedido_minimo, asociacionId);

    auditoriaService.registrar({
      usuarioId,
      accion: 'proveedor_actualizar_asociacion',
      tabla: 'producto_proveedor',
      registroId: asociacionId,
      detalles: datos,
      ip: ip || 'localhost'
    });
  },

  // Reconciliación por lista completa (patrón multiselección de la ficha 15.3b).
  // Recibe el estado DESEADO de las asociaciones del proveedor y calcula el diff
  // contra el estado actual: inserta las nuevas, actualiza las existentes y borra
  // las que ya no vienen. Lista vacía === desasociar todo (intencional, no bug).
  // Todo en una transacción: o se aplica el diff completo o no se aplica nada.
  reasociarProductos: (
    proveedorId: number,
    asociaciones: Array<{
      producto_id: number;
      costo_unitario: number;
      tiempo_entrega_dias: number | null;
      pedido_minimo: number | null;
    }>,
    usuarioId: number,
    ip: string | null
  ): void => {
    const reasociar = db.transaction(() => {
      // 1. El proveedor debe existir (si no, el diff no tiene sentido).
      const proveedor = db.prepare('SELECT id FROM proveedores WHERE id = ?').get(proveedorId) as
        { id: number } | undefined;
      if (!proveedor) throw new Error('El proveedor no existe.');

      // 2. Deduplicar y validar invariants de dominio ANTES de mutar.
      //    Un producto repetido en la lista es un bug de la UI: lo reporto, no lo colapso
      //    en silencio (ocultar el bug produce costos fantasma).
      const vistos = new Set<number>();
      for (const a of asociaciones) {
        if (vistos.has(a.producto_id)) {
          throw new Error(`El producto #${a.producto_id} aparece más de una vez en la lista.`);
        }
        vistos.add(a.producto_id);
        if (!Number.isFinite(a.costo_unitario) || a.costo_unitario < 0) {
          throw new Error(`Costo unitario inválido para el producto #${a.producto_id}.`);
        }
        if (a.pedido_minimo != null && (!Number.isInteger(a.pedido_minimo) || a.pedido_minimo < 0)) {
          throw new Error(`Pedido mínimo inválido para el producto #${a.producto_id}.`);
        }
        if (a.tiempo_entrega_dias != null && (!Number.isInteger(a.tiempo_entrega_dias) || a.tiempo_entrega_dias < 0)) {
          throw new Error(`Plazo de entrega inválido para el producto #${a.producto_id}.`);
        }
      }

      // 3. Validar que TODOS los producto_id existen (evita el error de FK críptico del
      //    INSERT; el mensaje nombra al culpable).
      const ids = asociaciones.map(a => a.producto_id);
      if (ids.length > 0) {
        const placeholders = ids.map(() => '?').join(',');
        const existentes = db.prepare(
          `SELECT id FROM productos WHERE id IN (${placeholders})`
        ).all(...ids) as Array<{ id: number }>;
        const setExistentes = new Set(existentes.map(p => p.id));
        const faltantes = ids.filter(id => !setExistentes.has(id));
        if (faltantes.length > 0) {
          throw new Error(`Productos inexistentes: ${faltantes.join(', ')}.`);
        }
      }

      // 4. Diff contra el estado actual (por producto_id, que es la clave del UNIQUE).
      const actuales = db.prepare(
        'SELECT producto_id FROM producto_proveedor WHERE proveedor_id = ?'
      ).all(proveedorId) as Array<{ producto_id: number }>;
      const setActuales = new Set(actuales.map(a => a.producto_id));
      const setDeseados = new Set(ids);

      const aInsertar = asociaciones.filter(a => !setActuales.has(a.producto_id));
      const aActualizar = asociaciones.filter(a => setActuales.has(a.producto_id));
      const aEliminar = actuales.filter(a => !setDeseados.has(a.producto_id));

      // 5. Aplicar el diff.
      const stmtInsert = db.prepare(`
        INSERT INTO producto_proveedor
          (producto_id, proveedor_id, costo_unitario, tiempo_entrega_dias, pedido_minimo)
        VALUES (?, ?, ?, ?, ?)
      `);
      const stmtUpdate = db.prepare(`
        UPDATE producto_proveedor
        SET costo_unitario = ?, tiempo_entrega_dias = ?, pedido_minimo = ?
        WHERE proveedor_id = ? AND producto_id = ?
      `);
      const stmtDelete = db.prepare(
        'DELETE FROM producto_proveedor WHERE proveedor_id = ? AND producto_id = ?'
      );

      for (const a of aInsertar) {
        stmtInsert.run(a.producto_id, proveedorId, a.costo_unitario, a.tiempo_entrega_dias, a.pedido_minimo);
      }
      for (const a of aActualizar) {
        stmtUpdate.run(a.costo_unitario, a.tiempo_entrega_dias, a.pedido_minimo, proveedorId, a.producto_id);
      }
      for (const a of aEliminar) {
        stmtDelete.run(proveedorId, a.producto_id);
      }

      return {
        insertados: aInsertar.map(a => a.producto_id),
        actualizados: aActualizar.map(a => a.producto_id),
        eliminados: aEliminar.map(a => a.producto_id)
      };
    });

    const diff = reasociar(); // si throwea, la transacción hace rollback y no se audita

    // Auditoría AGREGADA del diff (una entrada por la acción "reasociar proveedor #N",
    // no N entradas por fila: la acción crítica es la reconciliación, no cada costo).
    auditoriaService.registrar({
      usuarioId,
      accion: 'proveedor_reasociar_productos',
      tabla: 'producto_proveedor',
      registroId: proveedorId,
      detalles: {
        proveedorId,
        insertados: diff.insertados,
        actualizados: diff.actualizados,
        eliminados: diff.eliminados
      },
      ip: ip || 'localhost'
    });
  },

  // Resuelve un par (producto, proveedor) ACTIVO con todo lo que la OC necesita para
  // validar y pintar. Devuelve null si el par no existe o el proveedor está inactivo
  // (WHERE prov.activa = 1). El server lo usa como autoridad: el cliente nunca envía
  // costos ni garantiza que el par exista (D6). Indexado por idx_pp_producto + idx_pp_proveedor.
  obtenerParActivo: (productoId: number, proveedorId: number): ParActivo | null => {
    return db.prepare(`
      SELECT
        pp.producto_id,
        prod.nombre        AS producto_nombre,
        pv.id              AS proveedor_id,
        pv.nombre          AS proveedor_nombre,
        pv.contacto        AS proveedor_contacto,
        pv.email           AS proveedor_email,
        pv.telefono        AS proveedor_telefono,
        pp.costo_unitario,
        pp.pedido_minimo,
        COALESCE(pp.tiempo_entrega_dias, pv.tiempo_entrega_dias) AS tiempo_entrega_efectivo
      FROM producto_proveedor pp
      JOIN productos prod ON prod.id = pp.producto_id
      JOIN proveedores pv ON pv.id = pp.proveedor_id AND pv.activa = 1
      WHERE pp.producto_id = ? AND pp.proveedor_id = ?
    `).get(productoId, proveedorId) as ParActivo | null;
  },
};