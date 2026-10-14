// Motor de simulación What-if (Fase 4).
// Funciones puras: sin base de datos y sin Svelte.
// Se ejecuta en el navegador para recalcular en milisegundos
// cada vez que el usuario mueve un control.

export interface ParametrosEscenario {
  cambioDemanda: number;    // porcentaje de cambio de demanda (-50 a +100)
  cambioPrecio: number;     // porcentaje de cambio de precio (-50 a +50)
  promocionActiva: boolean;
  alzaPromocion: number;    // porcentaje de alza de ventas durante la promoción
  tiempoEntrega: number;    // días de entrega del proveedor
}

export interface CoeficientesModelo {
  productoId: number;
  consumoBase: number;
  pendienteTendencia: number;
  indicesSemanales: number[];
  volatilidad: number;
  stockActual: number;
  stockMinimo: number;
}

export interface ResultadoSimulacion {
  consumoSimulado: number;
  curvaBase: number[];
  curvaSimulada: number[];
  diasAgotarseBase: number | null;
  diasAgotarseSimulado: number | null;
  fechaReordenBase: string | null;
  fechaReordenSimulado: string | null;
  compraRecomendada: number;
}

// Elasticidad precio de la demanda asumida: cada 1% de subida
// de precio reduce la demanda un 1.2%.
export const ELASTICIDAD_PRECIO = -1.2;

const HORIZONTE_VISUAL = 30;     // días mostrados en el gráfico
const HORIZONTE_AGOTARSE = 365;  // días evaluados para el agotamiento
const TIEMPO_ENTREGA_BASE = 7;   // días de entrega del escenario base

export const parametrosPorDefecto: ParametrosEscenario = {
  cambioDemanda: 0,
  cambioPrecio: 0,
  promocionActiva: false,
  alzaPromocion: 25,
  tiempoEntrega: TIEMPO_ENTREGA_BASE
};

function curvaDiaria(
  consumo: number,
  pendiente: number,
  indices: number[],
  horizonte: number
): number[] {
  const curva: number[] = [];
  const hoy = new Date();
  for (let d = 0; d < horizonte; d++) {
    const fecha = new Date(hoy);
    fecha.setDate(fecha.getDate() + d);
    const estacional = indices[fecha.getDay()] ?? 1;
    curva.push(Math.max(0, (consumo + pendiente * d) * estacional));
  }
  return curva;
}

function diasHastaAgotarse(curva: number[], stock: number): number | null {
  if (stock <= 0) return 0;

  let acumulado = 0;
  for (let d = 0; d < curva.length; d++) {
    acumulado += curva[d];
    if (acumulado >= stock) return d + 1;
  }
  return null;
}

function fechaReorden(
  curva: number[],
  stock: number,
  consumo: number,
  tiempoEntrega: number,
  stockMinimo: number
): string | null {
  // Punto de reorden clásico: consumo durante la entrega + stock de seguridad
  const puntoReorden = consumo * tiempoEntrega + stockMinimo;
  let acumulado = 0;
  const hoy = new Date();
  for (let d = 0; d < curva.length; d++) {
    acumulado += curva[d];
    if (stock - acumulado <= puntoReorden) {
      const fecha = new Date(hoy);
      fecha.setDate(fecha.getDate() + d);
      return fecha.toISOString().split('T')[0];
    }
  }
  return null;
}

export function simularEscenario(
  coef: CoeficientesModelo,
  params: ParametrosEscenario
): ResultadoSimulacion {
  const factorPrecio = 1 + (params.cambioPrecio / 100) * ELASTICIDAD_PRECIO;
  const factorDemanda = 1 + params.cambioDemanda / 100;
  const factorPromo = params.promocionActiva ? 1 + params.alzaPromocion / 100 : 1;

  const consumoSimulado = Math.max(0, coef.consumoBase * factorPrecio * factorDemanda * factorPromo);
  const pendienteSimulada = coef.pendienteTendencia * factorDemanda * factorPromo;

  const curvaBaseVisual = curvaDiaria(coef.consumoBase, coef.pendienteTendencia, coef.indicesSemanales, HORIZONTE_VISUAL);
  const curvaSimuladaVisual = curvaDiaria(consumoSimulado, pendienteSimulada, coef.indicesSemanales, HORIZONTE_VISUAL);

  const curvaBaseLarga = curvaDiaria(coef.consumoBase, coef.pendienteTendencia, coef.indicesSemanales, HORIZONTE_AGOTARSE);
  const curvaSimuladaLarga = curvaDiaria(consumoSimulado, pendienteSimulada, coef.indicesSemanales, HORIZONTE_AGOTARSE);

  // Compra recomendada: cubrir entrega + 30 días de cobertura + seguridad
  const compraRecomendada = Math.max(
    0,
    Math.ceil(consumoSimulado * (params.tiempoEntrega + 30) + coef.stockMinimo - coef.stockActual)
  );

  return {
    consumoSimulado,
    curvaBase: curvaBaseVisual,
    curvaSimulada: curvaSimuladaVisual,
    diasAgotarseBase: diasHastaAgotarse(curvaBaseLarga, coef.stockActual),
    diasAgotarseSimulado: diasHastaAgotarse(curvaSimuladaLarga, coef.stockActual),
    fechaReordenBase: fechaReorden(curvaBaseLarga, coef.stockActual, coef.consumoBase, TIEMPO_ENTREGA_BASE, coef.stockMinimo),
    fechaReordenSimulado: fechaReorden(curvaSimuladaLarga, coef.stockActual, consumoSimulado, params.tiempoEntrega, coef.stockMinimo),
    compraRecomendada
  };
}