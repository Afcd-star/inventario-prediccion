import { json } from '@sveltejs/kit';
import { seriesTiempoService } from '$lib/server/services/series-tiempo.service';

export async function GET({ url, locals }) {
  if (!locals.usuario) {
    return json({ error: 'No autorizado' }, { status: 401 });
  }

  const productoId = parseInt(url.searchParams.get('productoId') || '0');
  
  if (!productoId) {
    return json({ error: 'ID de producto no válido' }, { status: 400 });
  }

  try {
    const analisis = await seriesTiempoService.analizarProducto(productoId);
    return json(analisis);
  } catch (error) {
    console.error('Error analizando series de tiempo:', error);
    return json({ error: 'Error al analizar datos' }, { status: 500 });
  }
}