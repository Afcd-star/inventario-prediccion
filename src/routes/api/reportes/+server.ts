import { json, type RequestHandler } from '@sveltejs/kit';
import { reportesService } from '$lib/server/services/reportes.service';

export const GET: RequestHandler = async ({ url, locals }) => {
  if (!locals.usuario) {
    return json({ error: 'No autorizado' }, { status: 401 });
  }

  const tipo = url.searchParams.get('tipo');

  if (tipo !== 'inventario') {
    return json({ error: 'Tipo de reporte no válido' }, { status: 400 });
  }

  try {
    const doc = reportesService.generarReporteInventario();
    const pdf = doc.output('arraybuffer');
    
    return new Response(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="inventario-stockpredict.pdf"',
        'Cache-Control': 'private, no-store'
      }
    });
  } catch (error) {
    console.error('Error generando reporte de inventario:', error);
    return json({ error: 'Error interno al generar el reporte' }, { status: 500 });
  }
};