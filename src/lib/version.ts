// Fuente única de verdad para la versión de la aplicación.
// Esquema semántico: MAYOR.MENOR.PARCHES
// Regla: el cambio de versión viaja en el mismo commit que la funcionalidad.

export const VERSION = '1.8.0';

export const CHANGELOG = [
  {
    version: '1.8.0',
    fecha: '2026-10-23',
    resumen: 'Gestión masiva de datos: importación CSV/Excel con preview editable, importación de stock con lotes, y exportación completa con compatibilidad Excel.'
  },
  {
    version: '1.6.1',
    fecha: '2026-10-18',
    resumen: 'Sistema unificado de notificaciones tipo toast (4.5s) para confirmaciones transaccionales, reemplazando banners inline y mejorando la consistencia de la experiencia de usuario.'
  },
  {
    version: '1.6.0',
    fecha: '2026-10-18',
    resumen: 'API pública RESTful con autenticación por API keys, sistema de webhooks con reintentos automáticos, y panel de gestión de integraciones.'
  },
  {
    version: '1.5.0',
    fecha: '2026-10-18',
    resumen: 'Escalabilidad logística: gestión de múltiples ubicaciones (almacenes, tiendas y centros de distribución), transferencias con estado en tránsito y confirmación de recepción, stock rastreado por lote y ubicación, dashboard con resumen logístico y nuevos tipos de movimiento para transferencias.'
  },
  {
    version: '1.4.0',
    fecha: '2026-10-18',
    resumen: 'Endurecimiento de seguridad: sesiones persistentes en base de datos, invalidacion remota, rate limiting, perfil unificado con reautenticacion, medidor de fortaleza de contrasenas y preferencias sincronizadas. Implementacion completa de 2FA con TOTP y codigos de recuperacion.'
  },
  {
    version: '1.3.0',
    fecha: '2026-10-16',
    resumen: 'Historial de auditoria inmutable con registro de acciones criticas, filtros combinables, paginacion y exportacion en CSV y PDF.'
  },
  {
    version: '1.2.0',
    fecha: '2026-10-16',
    resumen: 'Monitor de anomalias con deteccion automatica, ventana movil de 7 dias, umbrales configurables y panel de clasificacion de alertas.'
  },
  {
    version: '1.1.0',
    fecha: '2026-10-13',
    resumen: 'Simulador de escenarios What if con comparador interactivo, guardado de escenarios y sistema de version visible en toda la aplicacion.'
  },
  {
    version: '1.0.0',
    fecha: '2026-10-10',
    resumen: 'Base estable: autenticacion con roles, internacionalizacion, series de tiempo con estacionalidad, lotes con logica FEFO, reportes PDF y codigos QR.'
  }
];