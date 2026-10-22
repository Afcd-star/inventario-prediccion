import { json, fail } from '@sveltejs/kit';
import { importacionService } from '$lib/server/services/importacion.service';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.usuario || locals.usuario.rol !== 'admin') {
    throw fail(403, { message: 'No autorizado' });
  }

  try {
    const body = await request.json();
    const { filas, nombreArchivo } = body;

    if (!Array.isArray(filas) || filas.length === 0) {
      throw fail(400, { message: 'No se enviaron filas válidas para importar.' });
    }

    const resultado = importacionService.importarStockInicial(
      filas,
      locals.usuario.id,
      nombreArchivo || 'stock_inicial.csv'
    );

    return json({ success: true, data: resultado });
  } catch (error: any) {
    console.error('Error en importación de stock:', error);
    throw fail(500, { message: error.message || 'Error interno al procesar la importación' });
  }
};