import { error } from '@sveltejs/kit';
import { exportacionService } from '$lib/server/services/exportacion.service';
import { auditoriaService } from '$lib/server/services/auditoria.service';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.usuario) throw error(401, { message: 'No autenticado' });
  if (locals.usuario.rol !== 'admin') {
    throw error(403, { message: 'Solo administradores pueden generar reportes completos' });
  }

  const { xlsx, hojas } = exportacionService.generarReporteCompleto();
  const fecha = new Date().toISOString().split('T')[0];

  auditoriaService.registrar({
    usuarioId: locals.usuario.id,
    accion: 'exportacion_reporte_completo',
    tabla: 'productos',
    detalles: { hojas, formato: 'xlsx' },
    ip: 'web'
  });

  return new Response(xlsx, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="reporte_inventario_${fecha}.xlsx"`
    }
  });
};