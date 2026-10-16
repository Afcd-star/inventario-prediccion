// Fuente única de verdad para la versión de la aplicación.
// Esquema semántico: MAYOR.MENOR.PARCHES
// Regla: el cambio de versión viaja en el mismo commit que la funcionalidad.

export const VERSION = '1.2.0';

export const CHANGELOG = [
  {
    version: '1.2.0',
    fecha: '2026-10-16',
    resumen: 'Monitor de anomalías con detección automática por z-score y desviación porcentual, ventana móvil de 7 días, umbrales configurables desde el Panel de Administración y panel de clasificación de alertas.'
  },
  {
    version: '1.1.0',
    fecha: '2026-10-13',
    resumen: 'Simulación de escenarios What-if con comparador interactivo y escenarios guardables.'
  },
  {
    version: '1.0.0',
    fecha: '2026-10-10',
    resumen: 'Base estable: autenticación con roles, i18n, series de tiempo, lotes FEFO, reportes PDF y códigos QR.'
  }
];