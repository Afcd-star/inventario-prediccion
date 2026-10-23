import { error } from '@sveltejs/kit';
import { exportacionService } from '$lib/server/services/exportacion.service';
import { auditoriaService } from '$lib/server/services/auditoria.service';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, url }) => {
  if (!locals.usuario) {
    throw error(401, { message: 'No autenticado' });
  }
  if (locals.usuario.rol !== 'admin') {
    throw error(403, { message: 'Solo administradores pueden exportar datos masivos' });
  }

  const formato = url.searchParams.get('formato') === 'xlsx' ? 'xlsx' : 'csv';
  const filas = exportacionService.obtenerFilasProductos();
  const fecha = new Date().toISOString().split('T')[0];

  auditoriaService.registrar({
    usuarioId: locals.usuario.id,
    accion: 'exportacion_productos',
    tabla: 'productos',
    detalles: { filas: filas.length, formato },
    ip: 'web'
  });

  if (formato === 'xlsx') {
    const buffer = exportacionService.construirXLSX(filas, 'Productos');
    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="productos_${fecha}.xlsx"`
      }
    });
  }

  return new Response(exportacionService.construirCSV(filas), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="productos_${fecha}.csv"`
    }
  });
};