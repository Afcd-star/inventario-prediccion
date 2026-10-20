import db from '../database';
import { seriesTiempoService } from './series-tiempo.service';
import { dispararAnomalia } from './notificaciones-disparadores';

export interface Anomalia {
  id: number;
  producto_id: number;
  tipo: 'pico' | 'caida';
  fecha_inicio: string;
  fecha_fin: string;
  desviacion_promedio: number;
  z_score_max: number;
  detalle: string;
  estado: 'pendiente' | 'revisada' | 'falso_positivo';
  revisada_por: number | null;
  revisada_en: string | null;
  creada_en: string;
}

export interface ConfiguracionDeteccion {
  umbralZ: number;
  umbralPorcentaje: number;
  diasConsecutivos: number;
}

interface PuntoDiario {
  fecha: string;
  real: number;
  predicho: number;
  desvPct: number;
  z: number;
}

const VALORES_POR_DEFECTO: ConfiguracionDeteccion = {
  umbralZ: 2,
  umbralPorcentaje: 30,
  diasConsecutivos: 3
};

export const anomaliasService = {
  /**
   * Lee los umbrales configurables desde la tabla configuracion.
   */
  obtenerConfiguracion(): ConfiguracionDeteccion {
    const filas = db.prepare('SELECT clave, valor FROM configuracion').all() as Array<{ clave: string; valor: string }>;
    const mapa = new Map(filas.map(f => [f.clave, f.valor]));
    return {
      umbralZ: Number(mapa.get('umbral_z') ?? VALORES_POR_DEFECTO.umbralZ),
      umbralPorcentaje: Number(mapa.get('umbral_porcentaje') ?? VALORES_POR_DEFECTO.umbralPorcentaje),
      diasConsecutivos: Number(mapa.get('dias_consecutivos') ?? VALORES_POR_DEFECTO.diasConsecutivos)
    };
  },

  /**
   * Guarda los umbrales (upsert por clave). Se usará desde el Panel de Admin.
   */
  guardarConfiguracion(config: ConfiguracionDeteccion): void {
    const upsert = db.prepare(`
      INSERT INTO configuracion (clave, valor) VALUES (?, ?)
      ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor
    `);
    const transaccion = db.transaction(() => {
      upsert.run('umbral_z', String(config.umbralZ));
      upsert.run('umbral_porcentaje', String(config.umbralPorcentaje));
      upsert.run('dias_consecutivos', String(config.diasConsecutivos));
    });
    transaccion();
  },

  /**
   * Construye la ventana móvil de días cerrados comparando venta real vs predicha.
   * Excluye el día de hoy porque suele estar incompleto y ensuciaría la estadística.
   */
  construirVentana(productoId: number, dias: number): PuntoDiario[] {
     const historial = seriesTiempoService.obtenerHistorialVentas(productoId, 90);
     const cerrados = historial.slice(0, -1); // sin hoy
     const ventana = cerrados.slice(-dias);
     const coef = seriesTiempoService.obtenerCoeficientes(productoId, ventana.length + 1);
     if (!coef) return [];

     return ventana.map((punto, i) => {
       const estacional = coef.indicesSemanales[punto.fecha.getDay()] ?? 1;
       const diasDesdeEntrenamiento = i + 1;
       const predicho = Math.max(
         0,
         (coef.consumoBase + coef.pendienteTendencia * diasDesdeEntrenamiento) * estacional
       );
      const real = punto.valor;
      const residuo = real - predicho;
      // Piso de sigma para evitar división por cero en ventas muy constantes
      const sigma = Math.max(coef.volatilidad, 1);
      const desvPct = predicho > 0.5 ? (residuo / predicho) * 100 : (real > 0 ? 100 : 0);
      return {
        fecha: punto.fecha.toISOString().split('T')[0],
        real,
        predicho,
        desvPct,
        z: residuo / sigma
      };
    });
  },

  /**
   * Evalúa un producto y crea una anomalía si hay racha anómala sostenida.
   * Devuelve la anomalía creada o null si no hay nada nuevo.
   */
  detectarParaProducto(productoId: number): Anomalia | null {
    const config = this.obtenerConfiguracion();
    const ventana = this.construirVentana(productoId, 7);
    if (ventana.length < config.diasConsecutivos) return null;

    const marcados = ventana.map(p => ({
      ...p,
      cumple: Math.abs(p.z) > config.umbralZ || Math.abs(p.desvPct) > config.umbralPorcentaje,
      signo: p.desvPct >= 0 ? 1 : -1
    }));

    // Racha más reciente de días consecutivos anómalos del mismo signo
    let racha: Array<typeof marcados[number]> = [];
    let signoEsperado: number | null = null;
    for (let i = marcados.length - 1; i >= 0; i--) {
      const dia = marcados[i];
      if (!dia.cumple) break;
      if (signoEsperado === null) signoEsperado = dia.signo;
      else if (dia.signo !== signoEsperado) break;
      racha.unshift(dia);
    }
    if (racha.length < config.diasConsecutivos) return null;

    // Anti-duplicados: una anomalía por producto y fecha de inicio de racha
    const fechaInicio = racha[0].fecha;
    const existente = db.prepare(
      'SELECT id FROM anomalias WHERE producto_id = ? AND fecha_inicio = ?'
    ).get(productoId, fechaInicio);
    if (existente) return null;

    const tipo: 'pico' | 'caida' = signoEsperado === 1 ? 'pico' : 'caida';
    const desviacionPromedio = racha.reduce((a, d) => a + Math.abs(d.desvPct), 0) / racha.length;
    const zMax = Math.max(...racha.map(d => Math.abs(d.z)));
    const detalle = JSON.stringify(racha.map(d => ({
      fecha: d.fecha,
      real: d.real,
      predicho: Number(d.predicho.toFixed(2)),
      desvPct: Number(d.desvPct.toFixed(1)),
      z: Number(d.z.toFixed(2))
    })));

    const resultado = db.prepare(`
      INSERT INTO anomalias (producto_id, tipo, fecha_inicio, fecha_fin, desviacion_promedio, z_score_max, detalle)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(productoId, tipo, fechaInicio, racha[racha.length - 1].fecha, desviacionPromedio, zMax, detalle);

    const anomaliaCreada = db.prepare('SELECT * FROM anomalias WHERE id = ?').get(resultado.lastInsertRowid) as Anomalia;

    // Disparar notificación de anomalía detectada
    if (anomaliaCreada) {
      const producto = db.prepare('SELECT nombre FROM productos WHERE id = ?').get(productoId) as { nombre: string } | undefined;
      if (producto) {
        dispararAnomalia(anomaliaCreada.id, producto.nombre, tipo, desviacionPromedio);
      }
    }

    return anomaliaCreada;
  },

  /**
   * Barrido global: reevalúa todos los productos. Para el botón del Panel de Admin.
   */
  detectarTodas(): number {
    const productos = db.prepare('SELECT id FROM productos').all() as Array<{ id: number }>;
    let nuevas = 0;
    for (const producto of productos) {
      try {
        if (this.detectarParaProducto(producto.id)) nuevas++;
      } catch (error) {
        console.error(`Error detectando anomalías del producto ${producto.id}:`, error);
      }
    }
    return nuevas;
  },

  listar(estado?: string): Array<Anomalia & { producto_nombre: string; revisor_nombre: string | null }> {
    const base = `
      SELECT a.*, p.nombre AS producto_nombre, u.nombre AS revisor_nombre
      FROM anomalias a
      JOIN productos p ON a.producto_id = p.id
      LEFT JOIN usuarios u ON a.revisada_por = u.id
    `;
    if (estado) {
      return db.prepare(`${base} WHERE a.estado = ? ORDER BY a.creada_en DESC`).all(estado) as Array<Anomalia & { producto_nombre: string; revisor_nombre: string | null }>;
    }
    return db.prepare(`${base} ORDER BY a.creada_en DESC`).all() as Array<Anomalia & { producto_nombre: string; revisor_nombre: string | null }>;
  },

  marcarEstado(id: number, estado: 'revisada' | 'falso_positivo', usuarioId: number): void {
    db.prepare(`
      UPDATE anomalias SET estado = ?, revisada_por = ?, revisada_en = CURRENT_TIMESTAMP WHERE id = ?
    `).run(estado, usuarioId, id);
  },

  contarPendientes(): number {
    const fila = db.prepare("SELECT COUNT(*) AS total FROM anomalias WHERE estado = 'pendiente'").get() as { total: number };
    return fila.total;
  }
};