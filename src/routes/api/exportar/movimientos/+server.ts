import type { RequestHandler } from './$types';
import { exportacionService } from '$lib/server/services/exportacion.service';
import { auditoriaService } from '$lib/server/services/auditoria.service';

export const GET: RequestHandler = async ({ locals, url }) => {
  if (!locals.usuario) {
    return new Response('No autorizado', { status: 401 });
  }

  const formato = url.searchParams.get('formato') === 'xlsx' ? 'xlsx' : 'csv';
  const filas = exportacionService.obtenerFilasMovimientos();
  const fecha = new Date().toISOString().split('T')[0];

  auditoriaService.registrar({
    usuarioId: locals.usuario.id,
    accion: 'exportacion_movimientos',
    tabla: 'movimientos',
    detalles: { filas: filas.length, formato },
    ip: 'web'
  });

  if (formato === 'xlsx') {
    const buffer = exportacionService.construirXLSX(filas, 'Movimientos');
    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="movimientos_${fecha}.xlsx"`
      }
    });
  }

  return new Response(exportacionService.construirCSV(filas), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="movimientos_${fecha}.csv"`
    }
  });
};