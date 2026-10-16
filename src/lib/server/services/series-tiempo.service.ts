import db from '../database';

// Interfaces para los datos de series de tiempo
interface PuntoDatos {
  fecha: Date;
  valor: number;
}

interface ComponentesSerie {
  tendencia: number[];
  estacionalidad: number[];
  residuo: number[];
  indicesEstacionales: { [key: string]: number };
}

interface PrediccionHoltWinters {
  valor: number;
  intervaloConfianza: { min: number; max: number };
}

export const seriesTiempoService = {
  /**
   * Obtiene el historial de ventas de un producto
   */
  obtenerHistorialVentas(productoId: number, dias: number = 90): PuntoDatos[] {
    const producto = db.prepare(
      'SELECT created_at FROM productos WHERE id = ?'
    ).get(productoId) as { created_at: string } | undefined;
    if (!producto) return [];

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const inicioVentana = new Date(hoy);
    inicioVentana.setDate(inicioVentana.getDate() - dias + 1);

    const fechaCreacion = new Date(`${producto.created_at.slice(0, 10)}T00:00:00`);
    const fechaInicio = fechaCreacion > inicioVentana ? fechaCreacion : inicioVentana;
    fechaInicio.setHours(0, 0, 0, 0);

    const movimientos = db.prepare(`
      SELECT date(fecha) AS fecha, cantidad
      FROM movimientos 
      WHERE producto_id = ? AND tipo = 'salida' AND date(fecha) >= date(?)
      ORDER BY fecha ASC
    `).all(productoId, fechaInicio.toISOString().split('T')[0]) as Array<{ fecha: string; cantidad: number }>;

    // Agrupar por día
    const ventasPorDia = new Map<string, number>();
    
    movimientos.forEach(m => {
      ventasPorDia.set(m.fecha, (ventasPorDia.get(m.fecha) || 0) + m.cantidad);
    });

    // Convertir a array de puntos
    const puntos: PuntoDatos[] = [];

    for (const fecha = new Date(fechaInicio); fecha <= hoy; fecha.setDate(fecha.getDate() + 1)) {
      const fechaStr = [
        fecha.getFullYear(),
        String(fecha.getMonth() + 1).padStart(2, '0'),
        String(fecha.getDate()).padStart(2, '0')
      ].join('-');

      puntos.push({
        fecha: new Date(fecha),
        valor: ventasPorDia.get(fechaStr) || 0
      });
    }

    return puntos;
  },

  /**
   * Calcula la tendencia usando promedio móvil centrado
   */
  calcularTendencia(datos: number[], ventana: number = 7): number[] {
    const tendencia: number[] = [];
    const mitadVentana = Math.floor(ventana / 2);

    for (let i = 0; i < datos.length; i++) {
      if (i < mitadVentana || i >= datos.length - mitadVentana) {
        tendencia.push(datos[i]); // Bordes: usar el valor original
        continue;
      }

      let suma = 0;
      for (let j = i - mitadVentana; j <= i + mitadVentana; j++) {
        suma += datos[j];
      }
      tendencia.push(suma / ventana);
    }

    return tendencia;
  },

  /**
   * Calcula los índices estacionales por día de semana
   */
  calcularEstacionalidadSemanal(puntos: PuntoDatos[], tendencia: number[]): { [diaSemana: string]: number } {
    const diasSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const sumasPorDia = new Map<number, number>();
    const conteosPorDia = new Map<number, number>();

    // Inicializar
    diasSemana.forEach((_, idx) => {
      sumasPorDia.set(idx, 0);
      conteosPorDia.set(idx, 0);
    });

    // Calcular ratios
    puntos.forEach((punto, i) => {
      const diaSemana = punto.fecha.getDay();
      const ratio = tendencia[i] > 0 ? punto.valor / tendencia[i] : 1;
      
      sumasPorDia.set(diaSemana, sumasPorDia.get(diaSemana)! + ratio);
      conteosPorDia.set(diaSemana, conteosPorDia.get(diaSemana)! + 1);
    });

    // Calcular promedios y normalizar
    const indices: { [key: string]: number } = {};
    let sumaTotal = 0;

    diasSemana.forEach((dia, idx) => {
      const promedio = sumasPorDia.get(idx)! / conteosPorDia.get(idx)!;
      indices[dia] = promedio;
      sumaTotal += promedio;
    });

    // Normalizar para que la suma sea 7 (promedio de 1 por día)
    const factorNormalizacion = sumaTotal > 0 ? 7 / sumaTotal : 1;
    diasSemana.forEach(dia => {
      indices[dia] *= factorNormalizacion;
    });

    return indices;
  },

  /**
   * Calcula los índices estacionales por mes
   */
  calcularEstacionalidadMensual(puntos: PuntoDatos[], tendencia: number[]): { [mes: string]: number } {
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 
                   'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const sumasPorMes = new Map<number, number>();
    const conteosPorMes = new Map<number, number>();

    meses.forEach((_, idx) => {
      sumasPorMes.set(idx, 0);
      conteosPorMes.set(idx, 0);
    });

    puntos.forEach((punto, i) => {
      const mes = punto.fecha.getMonth();
      const ratio = tendencia[i] > 0 ? punto.valor / tendencia[i] : 1;
      
      sumasPorMes.set(mes, sumasPorMes.get(mes)! + ratio);
      conteosPorMes.set(mes, conteosPorMes.get(mes)! + 1);
    });

    const indices: { [key: string]: number } = {};
    let sumaTotal = 0;
    let mesesConDatos = 0;

    meses.forEach((mes, idx) => {
      const conteo = conteosPorMes.get(idx)!;
      const promedio = conteo > 0 ? sumasPorMes.get(idx)! / conteo : 1;
      indices[mes] = promedio;
      if (conteo > 0) {
        sumaTotal += promedio;
        mesesConDatos += 1;
      }
    });

    const factorNormalizacion = sumaTotal > 0 ? mesesConDatos / sumaTotal : 1;
    meses.forEach(mes => {
      indices[mes] *= factorNormalizacion;
    });

    return indices;
  },

  /**
   * Descompone la serie de tiempo en sus componentes
   */
  descomponerSerie(puntos: PuntoDatos[]): ComponentesSerie {
    const valores = puntos.map(p => p.valor);
    const tendencia = this.calcularTendencia(valores, 7);
    const estacionalidadSemanal = this.calcularEstacionalidadSemanal(puntos, tendencia);
    const estacionalidadMensual = this.calcularEstacionalidadMensual(puntos, tendencia);

    // Calcular residuo
    const residuo = valores.map((v, i) => v - tendencia[i]);

    return {
      tendencia,
      estacionalidad: valores.map((v, i) => v - tendencia[i] - residuo[i]),
      residuo,
      indicesEstacionales: {
        ...estacionalidadSemanal,
        ...estacionalidadMensual
      }
    };
  },

  /**
   * Predicción usando Suavizado Exponencial de Holt-Winters
   */
  predecirHoltWinters(
    puntos: PuntoDatos[],
    periodosFuturos: number = 30,
    alpha: number = 0.3,
    beta: number = 0.1,
    gamma: number = 0.1
  ): PrediccionHoltWinters[] {
    const n = puntos.length;
    const valores = puntos.map(p => p.valor);
    
    // Inicialización
    let nivel = valores[0];
    let tendencia = valores.length > 1 ? valores[1] - valores[0] : 0;
    const estacionalidad = new Array(7).fill(1); // Inicializar con 1 (multiplicativo)

    // Calcular estacionalidad inicial
    for (let i = 0; i < Math.min(7, n); i++) {
      estacionalidad[i] = valores[i] / (nivel + tendencia * i);
    }

    // Aplicar Holt-Winters
    const predicciones: PrediccionHoltWinters[] = [];
    const desviacionEstandar = this.calcularDesviacionEstandar(valores);

    for (let t = 0; t < periodosFuturos; t++) {
      const periodoEstacional = t % 7;
      
      // Predicción
      const prediccion = (nivel + tendencia) * estacionalidad[periodoEstacional];
      
      // Intervalo de confianza (95%)
      const margenError = 1.96 * desviacionEstandar * Math.sqrt(t + 1);
      
      predicciones.push({
        valor: Math.max(0, prediccion), // No puede ser negativo
        intervaloConfianza: {
          min: Math.max(0, prediccion - margenError),
          max: prediccion + margenError
        }
      });

      // Actualizar componentes (si hay datos reales)
      if (t < n) {
        const valorReal = valores[t];
        const estacionalidadActual = estacionalidad[periodoEstacional];
        
        nivel = alpha * (valorReal / estacionalidadActual) + (1 - alpha) * (nivel + tendencia);
        tendencia = beta * (nivel - nivel) + (1 - beta) * tendencia;
        estacionalidad[periodoEstacional] = gamma * (valorReal / nivel) + (1 - gamma) * estacionalidadActual;
      }
    }

    return predicciones;
  },

  /**
   * Calcula la desviación estándar
   */
  calcularDesviacionEstandar(valores: number[]): number {
    const media = valores.reduce((a, b) => a + b, 0) / valores.length;
    const cuadrados = valores.map(v => Math.pow(v - media, 2));
    const varianza = cuadrados.reduce((a, b) => a + b, 0) / valores.length;
    return Math.sqrt(varianza);
  },

  /**
   * Obtiene análisis completo de un producto
   */
  analizarProducto(productoId: number) {
    const puntos = this.obtenerHistorialVentas(productoId, 90);
    
    if (puntos.length < 14) {
      return {
        error: 'Datos insuficientes. Se necesitan al menos 14 días de historial.',
        componentes: null,
        prediccion: null
      };
    }

    const componentes = this.descomponerSerie(puntos);
    const prediccion = this.predecirHoltWinters(puntos, 30);

    // Detectar patrones
    const patrones = this.detectarPatrones(componentes.indicesEstacionales);

    return {
      componentes,
      prediccion,
      patrones,
      resumen: {
        totalVentas90Dias: puntos.reduce((acc, p) => acc + p.valor, 0),
        promedioDiario: puntos.reduce((acc, p) => acc + p.valor, 0) / puntos.length,
        tendencia: this.calcularTendenciaGeneral(puntos.map(p => p.valor)),
        volatilidad: this.calcularDesviacionEstandar(puntos.map(p => p.valor))
      }
    };
  },

  /**
   * Detecta patrones en los índices estacionales
   */
  detectarPatrones(indices: { [key: string]: number }): string[] {
    const patrones: string[] = [];
    const diasSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 
                   'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

    // Patrones semanales
    const maxDia = diasSemana.reduce((a, b) => indices[a] > indices[b] ? a : b);
    const minDia = diasSemana.reduce((a, b) => indices[a] < indices[b] ? a : b);
    
    if (indices[maxDia] > 1.2) {
      patrones.push(`Mayor venta los ${maxDia}s (índice: ${indices[maxDia].toFixed(2)})`);
    }
    if (indices[minDia] < 0.8) {
      patrones.push(`Menor venta los ${minDia}s (índice: ${indices[minDia].toFixed(2)})`);
    }

    // Patrones mensuales
    const maxMes = meses.reduce((a, b) => indices[a] > indices[b] ? a : b);
    const minMes = meses.reduce((a, b) => indices[a] < indices[b] ? a : b);
    
    if (indices[maxMes] > 1.3) {
      patrones.push(`Pico de ventas en ${maxMes} (índice: ${indices[maxMes].toFixed(2)})`);
    }
    if (indices[minMes] < 0.7) {
      patrones.push(`Valle de ventas en ${minMes} (índice: ${indices[minMes].toFixed(2)})`);
    }

    return patrones;
  },

  /**
   * Calcula la tendencia general (creciente, decreciente o estable)
   */
  calcularTendenciaGeneral(valores: number[]): 'creciente' | 'decreciente' | 'estable' {
    if (valores.length < 2) return 'estable';
    
    const primeraMitad = valores.slice(0, Math.floor(valores.length / 2));
    const segundaMitad = valores.slice(Math.floor(valores.length / 2));
    
    const promedioPrimera = primeraMitad.reduce((a, b) => a + b, 0) / primeraMitad.length;
    const promedioSegunda = segundaMitad.reduce((a, b) => a + b, 0) / segundaMitad.length;
    
    const cambio = (promedioSegunda - promedioPrimera) / promedioPrimera;
    
    if (cambio > 0.1) return 'creciente';
    if (cambio < -0.1) return 'decreciente';
    return 'estable';
  },

    /**
   * Exporta los coeficientes del modelo para el simulador What-if (Fase 4).
   * Devuelve todo lo que el cliente necesita para recalcular predicciones
   * sin volver a consultar la base de datos.
   */
  obtenerCoeficientes(productoId: number, diasExcluir: number = 0) {
    const producto = db.prepare('SELECT * FROM productos WHERE id = ?').get(productoId) as any;
    if (!producto) return null;

    const historial = this.obtenerHistorialVentas(productoId, 90);
    const puntos = diasExcluir > 0 ? historial.slice(0, -diasExcluir) : historial;
    if (puntos.length < 14) return null;

    const componentes = this.descomponerSerie(puntos);
    const n = componentes.tendencia.length;

    // Pendiente de la tendencia por mínimos cuadrados
    const mediaX = (n - 1) / 2;
    const mediaY = componentes.tendencia.reduce((a, b) => a + b, 0) / n;
    let numerador = 0;
    let denominador = 0;
    for (let i = 0; i < n; i++) {
      numerador += (i - mediaX) * (componentes.tendencia[i] - mediaY);
      denominador += (i - mediaX) * (i - mediaX);
    }
    const pendienteTendencia = denominador === 0 ? 0 : numerador / denominador;

    const dias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const indicesSemanales = dias.map(d => componentes.indicesEstacionales[d] ?? 1);
    const ultimosDias = puntos.slice(-7);
    const consumoBase = ultimosDias.reduce((total, punto) => total + punto.valor, 0) / ultimosDias.length;

    return {
      productoId,
      consumoBase: Math.max(0, consumoBase),
      pendienteTendencia,
      indicesSemanales,
      volatilidad: this.calcularDesviacionEstandar(puntos.map(p => p.valor)),
      stockActual: producto.stock_actual,
      stockMinimo: producto.stock_minimo
    };
  }
};