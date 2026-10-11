import db from './database';
import { seriesTiempoService } from './series-tiempo.service';

export const prediccionService = {
  /**
   * Calcula predicciones mejoradas usando series de tiempo
   */
  calcularPrediccion(productoId: number) {
    const producto = db.prepare(
      'SELECT * FROM productos WHERE id = ?'
    ).get(productoId) as any;

    if (!producto) return null;

    // Obtener análisis de series de tiempo
    const analisis = seriesTiempoService.analizarProducto(productoId);

    if ('error' in analisis) {
      // Fallback a método simple si no hay suficientes datos
      return this.calcularPrediccionSimple(productoId);
    }

    // Calcular consumo diario ajustado por estacionalidad
    const consumoPromedio = analisis.resumen.promedioDiario;
    const diasHastaAgotarse = producto.stock_actual / consumoPromedio;

    // Fecha de reorden considerando la tendencia
    const margenSeguridad = producto.stock_minimo * 1.5;
    const stockObjetivo = producto.stock_minimo + margenSeguridad;
    const diasHastaReorden = (producto.stock_actual - stockObjetivo) / consumoPromedio;

    const fechaReorden = new Date();
    fechaReorden.setDate(fechaReorden.getDate() + Math.max(0, diasHastaReorden));

    return {
      consumo_promedio_diario: consumoPromedio,
      dias_hasta_agotarse: Math.round(diasHastaAgotarse),
      fecha_recomendada_reorden: fechaReorden.toISOString().split('T')[0],
      tendencia: analisis.resumen.tendencia,
      volatilidad: analisis.resumen.volatilidad,
      patrones: analisis.patrones,
      prediccion_30_dias: analisis.prediccion?.slice(0, 30).map(p => p.valor) || []
    };
  },

  /**
   * Método simple de respaldo
   */
  calcularPrediccionSimple(productoId: number) {
    const producto = db.prepare(
      'SELECT * FROM productos WHERE id = ?'
    ).get(productoId) as any;

    if (!producto) return null;

    const movimientos = db.prepare(`
      SELECT cantidad, fecha FROM movimientos
      WHERE producto_id = ? AND tipo = 'salida'
      ORDER BY fecha DESC LIMIT 30
    `).all(productoId) as Array<{ cantidad: number; fecha: string }>;

    if (movimientos.length === 0) {
      return {
        consumo_promedio_diario: 0,
        dias_hasta_agotarse: null,
        fecha_recomendada_reorden: null,
        tendencia: 'estable',
        volatilidad: 0,
        patrones: [],
        prediccion_30_dias: []
      };
    }

    const totalVendido = movimientos.reduce((acc, m) => acc + m.cantidad, 0);
    const diasAnalizados = Math.max(1, Math.ceil(
      (Date.now() - new Date(movimientos[movimientos.length - 1].fecha).getTime()) / (1000 * 60 * 60 * 24)
    ));

    const consumoPromedio = totalVendido / diasAnalizados;
    const diasHastaAgotarse = producto.stock_actual / consumoPromedio;

    const margenSeguridad = producto.stock_minimo * 1.5;
    const stockObjetivo = producto.stock_minimo + margenSeguridad;
    const diasHastaReorden = (producto.stock_actual - stockObjetivo) / consumoPromedio;

    const fechaReorden = new Date();
    fechaReorden.setDate(fechaReorden.getDate() + Math.max(0, diasHastaReorden));

    return {
      consumo_promedio_diario: consumoPromedio,
      dias_hasta_agotarse: Math.round(diasHastaAgotarse),
      fecha_recomendada_reorden: fechaReorden.toISOString().split('T')[0],
      tendencia: 'estable',
      volatilidad: 0,
      patrones: [],
      prediccion_30_dias: []
    };
  },

  calcularParaProducto(productoId: number) {
    const prediccion = this.calcularPrediccion(productoId);

    if (!prediccion) return;

    db.prepare(`
      INSERT OR REPLACE INTO predicciones (
        producto_id,
        consumo_promedio_diario,
        dias_hasta_agotarse,
        fecha_recomendada_reorden,
        tendencia,
        volatilidad,
        patrones,
        prediccion_30_dias
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      productoId,
      prediccion.consumo_promedio_diario,
      prediccion.dias_hasta_agotarse,
      prediccion.fecha_recomendada_reorden,
      prediccion.tendencia,
      prediccion.volatilidad,
      JSON.stringify(prediccion.patrones),
      JSON.stringify(prediccion.prediccion_30_dias)
    );
  },

  /**
   * Calcula predicciones para todos los productos
   */
  calcularTodas() {
    const productos = db.prepare('SELECT id FROM productos').all() as Array<{ id: number }>;
    
    productos.forEach(producto => {
      this.calcularParaProducto(producto.id);
    });
  }
};