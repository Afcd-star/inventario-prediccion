import db from '$lib/server/database';
import type { PageServerLoad } from './$types';
import type { Producto } from '$lib/types';

interface PrediccionData {
  producto_id: number;
  consumo_promedio_diario: number;
  dias_hasta_agotarse: number | null;
  dias_hasta_minimo: number | null;
  fecha_recomendada_reorden: string | null;
}

interface ProductoConPrediccion extends Producto {
  prediccion: PrediccionData | null;
}

export const load = (async () => {
  // 1. Obtener todos los productos
  const productos = db.prepare('SELECT * FROM productos ORDER BY nombre').all() as Producto[];
  
  // 2. Obtener todas las predicciones
  const predicciones = db.prepare('SELECT * FROM predicciones').all() as PrediccionData[];
  
  // 3. Fusionar productos con sus predicciones
  const productosConPrediccion: ProductoConPrediccion[] = productos.map(p => {
    const pred = predicciones.find(pr => pr.producto_id === p.id);
    return { ...p, prediccion: pred || null };
  });

  // 4. Calcular métricas globales
  const totalProductos = productos.length;
  const stockBajo = productos.filter(p => p.stock_actual < p.stock_minimo).length;
  const reordenUrgente = productosConPrediccion.filter(p => 
    p.prediccion && p.prediccion.dias_hasta_minimo !== null && p.prediccion.dias_hasta_minimo <= 3
  ).length;

  // 5. Obtener Top 5 productos más consumidos (para el gráfico)
  const topConsumidos = db.prepare(`
    SELECT p.nombre, SUM(m.cantidad) as total_vendido 
    FROM movimientos m 
    JOIN productos p ON m.producto_id = p.id 
    WHERE m.tipo = 'salida' 
    GROUP BY p.id 
    ORDER BY total_vendido DESC 
    LIMIT 5
  `).all() as { nombre: string; total_vendido: number }[];

  return { 
    productos: productosConPrediccion,
    metricas: { totalProductos, stockBajo, reordenUrgente },
    topConsumidos
  };
}) satisfies PageServerLoad;