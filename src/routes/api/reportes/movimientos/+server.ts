import { json, type RequestHandler } from '@sveltejs/kit';
import db from '$lib/server/database';
import { reportesService } from '$lib/server/services/reportes.service';

export const GET: RequestHandler = async ({ url, locals }) => {
  if (!locals.usuario) {
    return json({ error: 'No autorizado' }, { status: 401 });
  }

  const productoId = Number(url.searchParams.get('productoId'));
  
  if (!Number.isSafeInteger(productoId) || productoId <= 0) {
    return json({ error: 'ID de producto no válido' }, { status: 400 });
  }

  const producto = db.prepare('SELECT id FROM productos WHERE id = ?').get(productoId);
  if (!producto) {
    return json({ error: 'Producto no encontrado' }, { status: 404 });
  }

  try {
    const doc = reportesService.generarReporteMovimientos(productoId);
    const pdf = doc.output('arraybuffer');

    return new Response(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="movimientos-producto-${productoId}.pdf"`,
        'Cache-Control': 'private, no-store'
      }
    });
  } catch (error) {
    console.error(`Error generando reporte de movimientos para producto ${productoId}:`, error);
    return json({ error: 'Error interno al generar el reporte' }, { status: 500 });
  }
};