// Sin imports estáticos de chart.js ni chartjs-plugin-zoom.
// Todo se carga con import() dinámico dentro de inicializarChart(),
// que solo se llama desde $effect (client-only). Así SSR nunca ve window.

let ChartRef: any = null;
let inicializado = false;

/**
 * Carga Chart.js y el plugin de zoom de forma dinámica, registra los
 * componentes necesarios y retorna la clase Chart.
 * Idempotente: la segunda llamada retorna la misma instancia sin re-registrar.
 */
export async function inicializarChart(): Promise<any> {
  if (inicializado && ChartRef) return ChartRef;

  const {
    Chart,
    LineController,
    LineElement,
    PointElement,
    LinearScale,
    CategoryScale,
    Tooltip,
    Legend
  } = await import('chart.js');

  const zoomPlugin = (await import('chartjs-plugin-zoom')).default;

  Chart.register(
    LineController,
    LineElement,
    PointElement,
    LinearScale,
    CategoryScale,
    Tooltip,
    Legend,
    zoomPlugin
  );

  ChartRef = Chart;
  inicializado = true;
  return Chart;
}