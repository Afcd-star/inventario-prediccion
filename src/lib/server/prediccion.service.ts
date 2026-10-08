import db from './database';
import type { Producto } from '../types';

export interface Prediccion {
  producto_id: number;
  consumo_promedio_diario: number;
  dias_hasta_agotarse: number | null;
  dias_hasta_minimo: number | null;
  fecha_recomendada_reorden: string | null;
}

export const prediccionService = {
  calcularParaProducto: (producto: Producto): Prediccion | null => {
    // 1. Obtener todas las salidas (ventas) del producto
    const salidas = db
      .prepare('SELECT cantidad, fecha FROM movimientos WHERE producto_id = ? AND tipo = ? ORDER BY fecha ASC')
      .all(producto.id, 'salida') as { cantidad: number; fecha: string }[];

    if (salidas.length === 0) {
      // Si no hay historial de ventas, no hay predicción
      return null;
    }

    // 2. Calcular el rango de días desde la primera venta hasta hoy
    const primeraVenta = new Date(salidas[0].fecha).getTime();
    const hoy = new Date().getTime();
    let diasTranscurridos = (hoy - primeraVenta) / (1000 * 60 * 60 * 24);
    
    // Evitar división por cero o números muy pequeños si las ventas son de hoy
    if (diasTranscurridos < 1) diasTranscurridos = 1;

    // 3. Calcular consumo promedio diario
    const totalVendido = salidas.reduce((acc, mov) => acc + mov.cantidad, 0);
    const consumoPromedio = totalVendido / diasTranscurridos;

    // 4. Calcular días hasta agotarse y días hasta llegar al mínimo
    let diasHastaAgotarse: number | null = null;
    let diasHastaMinimo: number | null = null;
    let fechaReorden: string | null = null;

    if (consumoPromedio > 0) {
      diasHastaAgotarse = Math.floor(producto.stock_actual / consumoPromedio);
      
      const stockPorEncimaDelMinimo = producto.stock_actual - producto.stock_minimo;
      if (stockPorEncimaDelMinimo > 0) {
        diasHastaMinimo = Math.floor(stockPorEncimaDelMinimo / consumoPromedio);
        
        // Calcular fecha exacta de reorden
        const fechaReordenDate = new Date(hoy + diasHastaMinimo * (1000 * 60 * 60 * 24));
        fechaReorden = fechaReordenDate.toISOString().split('T')[0];
      } else {
        // Si ya estamos por debajo del mínimo, la reorden es urgente (hoy)
        fechaReorden = new Date().toISOString().split('T')[0];
      }
    }

    // 5. Guardar o actualizar en la tabla de predicciones
    db.prepare(`
      INSERT INTO predicciones (producto_id, consumo_promedio_diario, dias_hasta_agotarse, dias_hasta_minimo, fecha_recomendada_reorden, actualizado_en)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(producto_id) DO UPDATE SET
        consumo_promedio_diario = excluded.consumo_promedio_diario,
        dias_hasta_agotarse = excluded.dias_hasta_agotarse,
        dias_hasta_minimo = excluded.dias_hasta_minimo,
        fecha_recomendada_reorden = excluded.fecha_recomendada_reorden,
        actualizado_en = CURRENT_TIMESTAMP
    `).run(
      producto.id, 
      consumoPromedio, 
      diasHastaAgotarse, 
      diasHastaMinimo, 
      fechaReorden
    );

    return {
      producto_id: producto.id,
      consumo_promedio_diario: consumoPromedio,
      dias_hasta_agotarse: diasHastaAgotarse,
      dias_hasta_minimo: diasHastaMinimo,
      fecha_recomendada_reorden: fechaReorden
    };
  },

  calcularTodas: () => {
    const productos = db.prepare('SELECT * FROM productos').all() as Producto[];
    const predicciones: Prediccion[] = [];
    
    for (const producto of productos) {
      const prediccion = prediccionService.calcularParaProducto(producto);
      if (prediccion) predicciones.push(prediccion);
    }
    
    return predicciones;
  }
};