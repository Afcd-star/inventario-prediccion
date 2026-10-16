import { error } from '@sveltejs/kit';
import { reportesService } from '$lib/server/services/reportes.service';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
  if (!locals.usuario || locals.usuario.rol !== 'admin') {
    throw error(403, 'No autorizado');
  }

  const filtros = {
    desde: url.searchParams.get('desde'),
    hasta: url.searchParams.get('hasta'),
    usuarioId: url.searchParams.get('usuario') ? parseInt(url.searchParams.get('usuario')!, 10) : null,
    accion: url.searchParams.get('accion')
  };

  const pdfBuffer = reportesService.generarPDF_Auditoria(filtros);
  const nombreArchivo = `auditoria_${new Date().toISOString().split('T')[0]}.pdf`;

  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${nombreArchivo}"`
    }
  });
};