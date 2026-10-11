<script lang="ts">
  import type { PageData } from './$types';
  import { onMount, onDestroy } from 'svelte';
  import Chart from 'chart.js/auto';
  import BotonPDF from '$lib/components/BotonPDF.svelte';

  let { data }: { data: PageData } = $props();
  
  let canvas = $state<HTMLCanvasElement | null>(null);
  let chart: Chart | null = null;

  onMount(() => {
    if (canvas && data.topConsumidos.length > 0) {
      const estilos = getComputedStyle(document.documentElement);
      const colorTexto = estilos.getPropertyValue('--text-primary').trim();
      const colorGrid = estilos.getPropertyValue('--border-color').trim();
      const coloresGrafico = Array.from({ length: 5 }, (_, index) =>
        estilos.getPropertyValue(`--chart-color-${index + 1}`).trim()
      );
      
      chart = new Chart(canvas, {
        type: 'bar',
        data: {
          labels: data.topConsumidos.map(p => p.nombre),
          datasets: [{
            data: data.topConsumidos.map(p => p.total_vendido),
            backgroundColor: coloresGrafico,
            borderRadius: 6,
            borderSkipped: false
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: 'y',
          plugins: {
            legend: {
              display: false
            }
          },
          scales: {
            x: {
              beginAtZero: true,
              ticks: {
                color: colorTexto,
                precision: 0
              },
              grid: {
                color: colorGrid
              }
            },
            y: {
              ticks: {
                color: colorTexto,
                font: {
                  size: 14
                }
              },
              grid: {
                display: false
              }
            }
          }
        }
      });

      const observer = new MutationObserver(() => {
        if (!chart) return;

        const computedStyles = getComputedStyle(document.documentElement);
        const colorEtiquetas = computedStyles.getPropertyValue('--text-primary').trim();
        const scales = chart.options.scales;
        if (scales?.x && scales.y) {
          scales.x.ticks = { ...scales.x.ticks, color: colorEtiquetas };
          scales.x.grid = {
            ...scales.x.grid,
            color: computedStyles.getPropertyValue('--border-color').trim()
          };
          scales.y.ticks = { ...scales.y.ticks, color: colorEtiquetas };
          chart.data.datasets[0].backgroundColor = Array.from({ length: 5 }, (_, index) =>
            computedStyles.getPropertyValue(`--chart-color-${index + 1}`).trim()
          );
          chart.update('none');
        }
      });
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme']
      });

      return () => observer.disconnect();
    }
  });

  onDestroy(() => {
    if (chart) chart.destroy();
  });
</script>

<svelte:head>
  <title>Dashboard | StockPredict Pro</title>
</svelte:head>

<main class="page-container dashboard-container">
  <header class="page-header">
    <div class="page-heading">
      <div>
        <h1>Dashboard de StockPredict Pro</h1>
        <p class="text-secondary">Resumen inteligente de tu inventario</p>
      </div>
      <BotonPDF
        url="/api/reportes?tipo=inventario"
        nombreArchivo="inventario-stockpredict.pdf"
        texto="Exportar Inventario"
        variante="primario"
      />
    </div>
  </header>

  <!-- Tarjetas de Métricas -->
  <section class="metrics-grid">
    <div class="metric-card metric-total">
      <h3 class="text-secondary text-sm">Total Productos</h3>
      <p class="metric-value">{data.metricas.totalProductos}</p>
    </div>
    <div class="metric-card metric-danger">
      <h3 class="text-sm">Stock Bajo</h3>
      <p class="metric-value">{data.metricas.stockBajo}</p>
    </div>
    <div class="metric-card metric-warning">
      <h3 class="text-sm">Reorden Urgente (3 días o menos)</h3>
      <p class="metric-value">{data.metricas.reordenUrgente}</p>
    </div>
  </section>

  <div class="dashboard-grid">
    <!-- Tabla de Predicciones -->
    <section class="card">
      <h2>Estado de Predicciones</h2>
      {#if data.productos.length === 0}
        <p class="text-secondary">No hay productos registrados.</p>
      {:else}
        <table class="data-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Stock</th>
              <th>Días hasta agotar</th>
              <th>Reorden</th>
            </tr>
          </thead>
          <tbody>
            {#each data.productos as p}
              <tr>
                <td>{p.nombre}</td>
                <td class={p.stock_actual < p.stock_minimo ? 'text-danger font-semibold' : ''}>
                  {p.stock_actual}
                </td>
                <td>
                  {#if p.prediccion && p.prediccion.dias_hasta_agotarse !== null}
                    {p.prediccion.dias_hasta_agotarse} días
                  {:else}
                    <span class="text-muted">Sin datos</span>
                  {/if}
                </td>
                <td>
                  {#if p.prediccion?.fecha_recomendada_reorden}
                    <span class="badge badge-info">
                      {p.prediccion.fecha_recomendada_reorden}
                    </span>
                  {:else}
                    <span class="text-muted">-</span>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
    </section>

    <!-- Gráfico de Top Consumidos -->
    <section class="card chart-card">
      <h2>Top 5 Más Vendidos</h2>
      {#if data.topConsumidos.length > 0}
        <div class="chart-container">
          <canvas bind:this={canvas}></canvas>
        </div>
      {:else}
        <p class="text-secondary text-center" style:padding="2rem">
          Registra salidas para ver el gráfico.
        </p>
      {/if}
    </section>
  </div>
</main>

<style>
  .page-header {
    margin-bottom: 2rem;
  }

  .page-heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
  }

  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
  }

  .metric-value {
    margin: 0;
    font-size: var(--font-size-4xl);
    font-weight: var(--font-weight-bold);
  }

  .dashboard-grid {
    display: grid;
    grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
    gap: 2rem;
  }

  .chart-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 0;
  }

  .chart-container {
    width: 100%;
    height: 300px;
    margin: 1rem auto 0;
    position: relative;
  }

  @media (max-width: 600px) {
    .page-heading {
      flex-direction: column;
    }
  }
</style>