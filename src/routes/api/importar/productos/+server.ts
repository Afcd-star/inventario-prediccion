import { json, fail } from '@sveltejs/kit';
import { importacionService, type ModoImportacion } from '$lib/server/services/importacion.service';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
  // 1. Seguridad: Solo administradores pueden importar
  if (!locals.usuario || locals.usuario.rol !== 'admin') {
    throw fail(403, { message: 'No autorizado' });
  }

  try {
    const body = await request.json();
    const { filas, modo, nombreArchivo } = body;

    // 2. Validación básica de la petición
    if (!Array.isArray(filas) || filas.length === 0) {
      throw fail(400, { message: 'No se enviaron filas válidas para importar.' });
    }

    if (modo !== 'crear' && modo !== 'actualizar') {
      throw fail(400, { message: 'Modo de importación no válido.' });
    }

    // 3. Ejecutar la importación
    const resultado = importacionService.importarProductos(
      filas,
      modo as ModoImportacion,
      locals.usuario.id,
      nombreArchivo || 'importacion.csv'
    );

    // 4. Responder al cliente
    return json({
      success: true,
      data: resultado
    });

  } catch (error: any) {
    console.error('Error en importación:', error);
    const mensaje = error.message || 'Error interno al procesar la importación';
    throw fail(500, { message: mensaje });
  }
};  