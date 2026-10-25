import { json, error } from '@sveltejs/kit';
import { seriesService } from '$lib/server/services/series.service';
import type { RangoSerie } from '$lib/types';
import type { RequestHandler } from './$types';

const RANGOS: RangoSerie[] = ['7d', '30d', '90d', '1y'];

export const GET: RequestHandler = async ({ locals, url }) => {
  if (!locals.usuario) throw error(401, { message: 'No autenticado' });

  const bruto = url.searchParams.get('rango');
  const rango: RangoSerie = RANGOS.includes(bruto as RangoSerie) ? (bruto as RangoSerie) : '30d';

  const serie = seriesService.obtenerSerie('global', rango);
  return json({ success: true, data: serie });
};