import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { error } from '@sveltejs/kit';
import Papa from 'papaparse';
import type { RequestHandler } from './$types';
import { exportacionService } from '$lib/server/services/exportacion.service';

const PLANTILLAS_PERMITIDAS = ['productos', 'stock_inicial'] as const;

type TipoPlantilla = (typeof PLANTILLAS_PERMITIDAS)[number];

export const GET: RequestHandler = async ({ params, url }) => {
  const tipo = params.tipo as TipoPlantilla;
  const formato = url.searchParams.get('formato') === 'xlsx' ? 'xlsx' : 'csv';

  if (!PLANTILLAS_PERMITIDAS.includes(tipo)) {
    throw error(404, 'Plantilla no encontrada');
  }

  try {
    const ruta = join(process.cwd(), 'static', 'plantillas', `${tipo}.csv`);
    const contenido = readFileSync(ruta, 'utf-8');

    if (formato === 'xlsx') {
      const parseado = Papa.parse<Record<string, unknown>>(contenido, {
        header: true,
        skipEmptyLines: true
      });
      const buffer = exportacionService.construirXLSX(parseado.data, 'Plantilla');
      return new Response(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${tipo}.xlsx"`
        }
      });
    }

    return new Response(contenido, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${tipo}.csv"`
      }
    });
  } catch {
    throw error(500, 'Error al leer la plantilla');
  }
};