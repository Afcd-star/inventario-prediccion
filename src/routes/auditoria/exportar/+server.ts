import { error } from '@sveltejs/kit';
import { auditoriaService } from '$lib/server/services/auditoria.service';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
  if (!locals.usuario || locals.usuario.rol !== 'admin') {
    throw error(403, 'No autorizado');
  }

  const desde = url.searchParams.get('desde');
  const hasta = url.searchParams.get('hasta');
  const usuarioParam = url.searchParams.get('usuario');
  const accion = url.searchParams.get('accion');

  // Obtener todos los registros (sin paginación) respetando los filtros
  let pagina = 1;
  const porPagina = 10000; // Límite práctico para exportación
  const todosRegistros: Array<{
    creada_en: string;
    usuario_nombre: string | null;
    accion: string;
    tabla_afectada: string | null;
    registro_id: number | null;
    ip: string | null;
    detalles: string;
  }> = [];

  while (true) {
    const resultado = auditoriaService.listar({
      desde,
      hasta,
      usuarioId: usuarioParam ? parseInt(usuarioParam, 10) : null,
      accion,
      pagina,
      porPagina
    });

    todosRegistros.push(...resultado.registros);

    if (pagina >= resultado.totalPaginas) break;
    pagina++;
  }

  // Construir CSV
  const encabezados = ['Fecha', 'Autor', 'Acción', 'Tabla', 'Registro', 'IP', 'Detalles'];
  const filas = todosRegistros.map(registro => [
    registro.creada_en,
    registro.usuario_nombre ?? '',
    registro.accion,
    registro.tabla_afectada ?? '',
    registro.registro_id ?? '',
    registro.ip ?? '',
    registro.detalles
  ]);

  const csv = [
    encabezados.join(','),
    ...filas.map(fila =>
      fila.map(celda => `"${String(celda).replace(/"/g, '""')}"`).join(',')
    )
  ].join('\n');

  const nombreArchivo = `auditoria_${new Date().toISOString().split('T')[0]}.csv`;

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${nombreArchivo}"`
    }
  });
};