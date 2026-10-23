import db from '../database';
import { auditoriaService } from './auditoria.service';

import type {
  ModoImportacion,
  FilaProducto,
  FilaStockInicial,
  ResultadoImportacion
} from '$lib/types';

export const importacionService = {
  /**
   * Procesa un array de filas (ya parseadas en el cliente) y las importa a la BD.
   */
  importarProductos(
    filas: FilaProducto[],
    modo: ModoImportacion,
    usuarioId: number,
    nombreArchivo: string = 'desconocido.csv'
  ): ResultadoImportacion {
    
    const resultado: ResultadoImportacion = { exitosas: 0, actualizadas: 0, errores: [] };
    const MAX_FILAS = 10000;

    // 1. Validación de volumen (Seguridad)
    if (filas.length > MAX_FILAS) {
      throw new Error(`El archivo excede el límite de ${MAX_FILAS} filas.`);
    }

    // 2. Preparar statements para máxima eficiencia dentro de la transacción
    const stmtBuscar = db.prepare('SELECT id FROM productos WHERE LOWER(nombre) = LOWER(?)');
    const stmtInsertar = db.prepare(`
      INSERT INTO productos (nombre, descripcion, precio, stock_actual, stock_minimo)
      VALUES (?, ?, ?, 0, ?)
    `);
    const stmtActualizar = db.prepare(`
      UPDATE productos 
      SET descripcion = ?, precio = ?, stock_minimo = ?
      WHERE id = ?
    `);

    // 3. Ejecutar en una sola transacción atómica para velocidad y consistencia
    const procesar = db.transaction(() => {
      for (let i = 0; i < filas.length; i++) {
        const fila = filas[i];
        const numeroFila = i + 2; // +2 porque la fila 1 es el header y el índice es base 0

        // --- A. Validación de datos ---
        const erroresFila: string[] = [];

        if (!fila.nombre || typeof fila.nombre !== 'string' || fila.nombre.trim().length === 0) {
          erroresFila.push('El nombre es obligatorio.');
        } else if (fila.nombre.length > 100) {
          erroresFila.push('El nombre no puede exceder 100 caracteres.');
        }

        const precio = Number(fila.precio);
        if (isNaN(precio) || precio < 0) {
          erroresFila.push('El precio debe ser un número válido mayor o igual a 0.');
        }

        const stockMinimo = Number(fila.stock_minimo);
        if (isNaN(stockMinimo) || stockMinimo < 0 || !Number.isInteger(stockMinimo)) {
          erroresFila.push('El stock mínimo debe ser un número entero válido mayor o igual a 0.');
        }

        if (erroresFila.length > 0) {
          resultado.errores.push({ fila: numeroFila, nombre: fila.nombre, motivo: erroresFila.join(' ') });
          continue; // Saltar al siguiente, no romper la transacción
        }

        // --- B. Lógica de Negocio (Crear vs Actualizar) ---
        const nombreLimpio = fila.nombre.trim();
        const existente = stmtBuscar.get(nombreLimpio) as { id: number } | undefined;

        if (existente) {
          if (modo === 'crear') {
            resultado.errores.push({ 
              fila: numeroFila, 
              nombre: nombreLimpio, 
              motivo: 'El producto ya existe y el modo es "Crear solo".' 
            });
          } else {
            // Modo 'actualizar': Sobrescribir datos maestros, NUNCA el stock
            stmtActualizar.run(
              fila.descripcion || null,
              precio,
              stockMinimo,
              existente.id
            );
            resultado.actualizadas++;
          }
        } else {
          // No existe: Crear nuevo (en ambos modos)
          stmtInsertar.run(
            nombreLimpio,
            fila.descripcion?.trim() || null,
            precio,
            stockMinimo
          );
          resultado.exitosas++;
        }
      }
    });

    procesar();

    // 4. Registro de Auditoría
    auditoriaService.registrar({
      usuarioId,
      accion: 'importacion_productos',
      tabla: 'productos',
      detalles: {
        modo,
        archivo: nombreArchivo,
        total_filas: filas.length,
        exitosas: resultado.exitosas,
        actualizadas: resultado.actualizadas,
        errores: resultado.errores.length
      },
      ip: 'web'
    });

    return resultado;
  },

  /**
   * Importa stock inicial o reposición masiva.
   * Crea movimientos tipo 'entrada' y lotes con trazabilidad completa.
   * El stock_actual del producto se actualiza como consecuencia del movimiento.
   */
  importarStockInicial(
    filas: FilaStockInicial[],
    usuarioId: number,
    nombreArchivo: string = 'stock_inicial.csv'
  ): ResultadoImportacion {

    const resultado: ResultadoImportacion = { exitosas: 0, actualizadas: 0, errores: [] };
    const MAX_FILAS = 10000;

    if (filas.length > MAX_FILAS) {
      throw new Error(`El archivo excede el límite de ${MAX_FILAS} filas.`);
    }

    // Statements preparados (rendimiento en lotes grandes)
    const stmtProducto = db.prepare('SELECT id FROM productos WHERE LOWER(nombre) = LOWER(?)');
    const stmtUbicacion = db.prepare('SELECT id FROM ubicaciones WHERE LOWER(nombre) = LOWER(?)');
    const stmtUbicacionDefault = db.prepare("SELECT id FROM ubicaciones WHERE tipo = 'almacen' ORDER BY id LIMIT 1");
    const stmtLoteExistente = db.prepare('SELECT id, fecha_caducidad FROM lotes WHERE producto_id = ? AND LOWER(numero_lote) = LOWER(?)');
    const stmtCrearLote = db.prepare(`
      INSERT INTO lotes (producto_id, numero_lote, fecha_caducidad, cantidad_actual, ubicacion_id)
      VALUES (?, ?, ?, ?, ?)
    `);
    const stmtSumarLote = db.prepare('UPDATE lotes SET cantidad_actual = cantidad_actual + ? WHERE id = ?');
    const stmtCompletarFechaLote = db.prepare('UPDATE lotes SET fecha_caducidad = ? WHERE id = ? AND fecha_caducidad IS NULL');
    const stmtMovimiento = db.prepare(`
      INSERT INTO movimientos (producto_id, lote_id, tipo, cantidad, ubicacion_id, notas, fecha)
      VALUES (?, ?, 'entrada', ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    const stmtSumarStock = db.prepare('UPDATE productos SET stock_actual = stock_actual + ? WHERE id = ?');

    const procesar = db.transaction(() => {
      for (let i = 0; i < filas.length; i++) {
        const fila = filas[i];
        const numeroFila = i + 2;
        const erroresFila: string[] = [];

        // --- A. Validaciones ---
        if (!fila.producto || fila.producto.trim().length === 0) {
          erroresFila.push('El nombre del producto es obligatorio.');
        }

        const cantidad = Number(fila.cantidad);
        if (isNaN(cantidad) || cantidad <= 0 || !Number.isInteger(cantidad)) {
          erroresFila.push('La cantidad debe ser un número entero mayor que 0.');
        }

        let fechaCaducidad: string | null = null;
        if (fila.fecha_caducidad && String(fila.fecha_caducidad).trim() !== '') {
          const fechaStr = String(fila.fecha_caducidad).trim();
          const esIsoValida = /^\d{4}-\d{2}-\d{2}$/.test(fechaStr) && !isNaN(new Date(fechaStr).getTime());
          if (!esIsoValida) {
            erroresFila.push('La fecha de caducidad debe tener formato AAAA-MM-DD.');
          } else {
            fechaCaducidad = fechaStr;
          }
        }

        if (erroresFila.length > 0) {
          resultado.errores.push({ fila: numeroFila, nombre: fila.producto, motivo: erroresFila.join(' ') });
          continue;
        }

        // --- B. Resolución de producto ---
        const producto = stmtProducto.get(fila.producto.trim()) as { id: number } | undefined;
        if (!producto) {
          resultado.errores.push({
            fila: numeroFila,
            nombre: fila.producto,
            motivo: 'Producto no encontrado en el catálogo. Impórtalo primero en la importación de productos.'
          });
          continue;
        }

        // --- C. Resolución de ubicación ---
        let ubicacionId: number | undefined;
        if (fila.ubicacion && fila.ubicacion.trim() !== '') {
          const ub = stmtUbicacion.get(fila.ubicacion.trim()) as { id: number } | undefined;
          if (!ub) {
            resultado.errores.push({
              fila: numeroFila,
              nombre: fila.producto,
              motivo: `Ubicación "${fila.ubicacion}" no existe.`
            });
            continue;
          }
          ubicacionId = ub.id;
        } else {
          const ubDefault = stmtUbicacionDefault.get() as { id: number } | undefined;
          if (!ubDefault) {
            resultado.errores.push({
              fila: numeroFila,
              nombre: fila.producto,
              motivo: 'No hay ningún almacén configurado en el sistema.'
            });
            continue;
          }
          ubicacionId = ubDefault.id;
        }

        // --- D. Lote: crear o reponer ---
        const numeroLote = (fila.numero_lote && fila.numero_lote.trim() !== '')
          ? fila.numero_lote.trim()
          : `IMP-${new Date().toISOString().slice(0, 10)}-${numeroFila}`;

        const loteExistente = stmtLoteExistente.get(producto.id, numeroLote) as { id: number; fecha_caducidad: string | null } | undefined;

        let loteId: number;
        if (loteExistente) {
          stmtSumarLote.run(cantidad, loteExistente.id);
          if (fechaCaducidad) {
            stmtCompletarFechaLote.run(fechaCaducidad, loteExistente.id);
          }
          loteId = loteExistente.id;
          resultado.actualizadas++;   // Contamos como "lote repuesto"
        } else {
          const insert = stmtCrearLote.run(producto.id, numeroLote, fechaCaducidad, cantidad, ubicacionId);
          loteId = insert.lastInsertRowid as number;
          resultado.exitosas++;       // Contamos como "lote creado"
        }

        // --- E. Movimiento de entrada (auditable) ---
        stmtMovimiento.run(
          producto.id,
          loteId,
          cantidad,
          ubicacionId,
          `Importación masiva de stock (${nombreArchivo})`
        );

        // --- F. Stock global como consecuencia ---
        stmtSumarStock.run(cantidad, producto.id);
      }
    });

    procesar();

    auditoriaService.registrar({
      usuarioId,
      accion: 'importacion_stock_inicial',
      tabla: 'movimientos',
      detalles: {
        archivo: nombreArchivo,
        total_filas: filas.length,
        lotes_creados: resultado.exitosas,
        lotes_repuestos: resultado.actualizadas,
        errores: resultado.errores.length
      },
      ip: 'web'
    });

    return resultado;
  }
};