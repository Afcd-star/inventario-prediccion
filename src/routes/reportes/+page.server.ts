import { error } from '@sveltejs/kit';
import { exportacionService } from '$lib/server/services/exportacion.service';
import type { InformeCompleto } from '$lib/types';
import type { PageServerLoad } from './$types';

const MOVIMIENTOS_EN_VISTA = 30; // límite duro para no castigar el DOM (8 GB)

export const load = (async ({ locals }) => {
  if (!locals.usuario) throw error(401, { message: 'No autenticado' });
  if (locals.usuario.rol !== 'admin') {
    throw error(403, { message: 'Solo administradores pueden ver el reporte completo' });
  }

  // Una sola query de predicciones; stockBajo se deriva de ella (evita duplicar SQL)
  const predicciones = exportacionService.obtenerPrediccionesCalculadas();
  const stockBajo = predicciones
    .filter((p) => p.stock_actual <= p.stock_minimo)
    .sort((a, b) => (a.dias_hasta_agotar ?? Infinity) - (b.dias_hasta_agotar ?? Infinity));

  const informe: InformeCompleto = {
    kpis: exportacionService.obtenerKPIsCrudos(),
    stockBajo,
    lotesPorVencer: exportacionService.obtenerLotesPorVencer(90),
    predicciones,
    anomalias: exportacionService.obtenerAnomalias(),
    movimientos: exportacionService.obtenerMovimientosRecientes(MOVIMIENTOS_EN_VISTA),
    movimientosTotales: MOVIMIENTOS_EN_VISTA
  };

  return { informe };
}) satisfies PageServerLoad;