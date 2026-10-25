import { json, error } from '@sveltejs/kit';
import { seriesService } from '$lib/server/services/series.service';
import type { RangoSerie } from '$lib/types';
import type { RequestHandler } from './$types';

const RANGOS: RangoSerie[] = ['7d', '30d', '90d', '1y'];

export const GET: RequestHandler = async ({ locals, params, url }) => {
  if (!locals.usuario) throw error(401, { message: 'No autenticado' });

  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) throw error(400, { message: 'ID de producto inválido' });

  const bruto = url.searchParams.get('rango');
  const rango: RangoSerie = RANGOS.includes(bruto as RangoSerie) ? (bruto as RangoSerie) : '30d';

  try {
    const serie = seriesService.obtenerSerie(id, rango);
    return json({ success: true, data: serie });
  } catch (e: any) {
    if (e?.message === 'AMBITO_NO_ENCONTRADO') throw error(404, { message: 'Producto no encontrado' });
    throw error(500, { message: 'Error al construir la serie temporal' });
  }
};