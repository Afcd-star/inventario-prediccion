export interface InfoDispositivo {
  sistema: string;
  navegador: string;
  icono: string;
}

/**
 * Describe un dispositivo de forma aproximada a partir del user agent.
 * Sin librerías externas: detección por patrones comunes, suficiente
 * para que un usuario reconozca sus propios dispositivos.
 */
export function describirDispositivo(userAgent: string | null): InfoDispositivo {
  if (!userAgent) {
    return { sistema: 'Desconocido', navegador: 'Desconocido', icono: '❓' };
  }

  const ua = userAgent;

  let sistema = 'Desconocido';
  let icono = '🖥️';
  if (/Windows NT 10/.test(ua)) { sistema = 'Windows 10/11'; icono = '🪟'; }
  else if (/Windows NT/.test(ua)) { sistema = 'Windows'; icono = '🪟'; }
  else if (/iPhone/.test(ua)) { sistema = 'iPhone'; icono = '📱'; }
  else if (/iPad/.test(ua)) { sistema = 'iPad'; icono = '📱'; }
  else if (/Android/.test(ua)) { sistema = 'Android'; icono = '🤖'; }
  else if (/Mac OS X/.test(ua)) { sistema = 'macOS'; icono = '🍎'; }
  else if (/Linux/.test(ua)) { sistema = 'Linux'; icono = '🐧'; }

  let navegador = 'Desconocido';
  if (/Edg\//.test(ua)) navegador = 'Edge';
  else if (/OPR\//.test(ua)) navegador = 'Opera';
  else if (/Firefox\//.test(ua)) navegador = 'Firefox';
  else if (/Chrome\//.test(ua)) navegador = 'Chrome';
  else if (/Safari\//.test(ua)) navegador = 'Safari';

  return { sistema, navegador, icono };
}