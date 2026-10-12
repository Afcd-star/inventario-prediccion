<script lang="ts">
  import type { PageData } from './$types';
  import { onMount, onDestroy } from 'svelte';
  import Chart from 'chart.js/auto';
  import BotonPDF from '$lib/components/BotonPDF.svelte';
  import { _, locale } from 'svelte-i18n';

  let { data }: { data: PageData } = $props();
  
  let canvasTopConsumidos = $state<HTMLCanvasElement | null>(null);
  let canvasTendencia = $state<HTMLCanvasElement | null>(null);
  let chartTopConsumidos: Chart | null = null;
  let chartTendencia: Chart | null = null;

  $effect(() => {
    const stockActualLabel = $_('dashboard.stockActual');
    const stockMinimoLabel = $_('dashboard.stockMinimo');

    if (chartTendencia) {
      chartTendencia.data.datasets[0].label = stockActualLabel;
      chartTendencia.data.datasets[1].label = stockMinimoLabel;
      chartTendencia.update('none');
    }
  });

  onMount(() => {
    const estilos = getComputedStyle(document.documentElement);
    const colorTexto = estilos.getPropertyValue('--text-primary').trim();
    const colorGrid = estilos.getPropertyValue('--border-color').trim();

    if (canvasTopConsumidos && data.topConsumidos.length > 0) {
      chartTopConsumidos = new Chart(canvasTopConsumidos, {
        type: 'doughnut',
        data: {
          labels: data.topConsumidos.map(p => p.nombre),
          datasets: [{
            data: data.topConsumidos.map(p => p.total_vendido),
            backgroundColor: ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'],
            borderWidth: 0,
            hoverOffset: 10
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          aspectRatio: 1.5,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                padding: 15,
                usePointStyle: true,
                color: colorTexto,
                font: { size: 12 }
              }
            }
          }
        }
      });
    }

    if (canvasTendencia && data.productos.length > 0) {
      chartTendencia = new Chart(canvasTendencia, {
        type: 'line',
        data: {
          labels: data.productos.map(p => p.nombre),
          datasets: [
            {
              label: $_('dashboard.stockActual'),
              data: data.productos.map(p => p.stock_actual),
              borderColor: '#3b82f6',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              fill: true,
              tension: 0.4
            },
            {
              label: $_('dashboard.stockMinimo'),
              data: data.productos.map(p => p.stock_minimo),
              borderColor: '#ef4444',
              borderDash: [5, 5],
              fill: false,
              tension: 0.4
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              labels: { color: colorTexto }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: { color: colorGrid },
              ticks: { color: colorTexto }
            },
            x: {
              grid: { color: colorGrid },
              ticks: { color: colorTexto }
            }
          }
        }
      });
    }

    const observer = new MutationObserver(() => {
        const computedStyles = getComputedStyle(document.documentElement);
        const labelColor = computedStyles.getPropertyValue('--text-primary').trim();
        const gridColor = computedStyles.getPropertyValue('--border-color').trim();

        for (const currentChart of [chartTopConsumidos, chartTendencia]) {
          if (!currentChart) continue;
          const scales = currentChart.options.scales;
          if (scales?.x && scales.y) {
            scales.x.ticks = { ...scales.x.ticks, color: labelColor };
            scales.x.grid = { ...scales.x.grid, color: gridColor };
            scales.y.ticks = { ...scales.y.ticks, color: labelColor };
            scales.y.grid = { ...scales.y.grid, color: gridColor };
          }
          const legend = currentChart.options.plugins?.legend;
          if (legend && legend.labels) {
            legend.labels.color = labelColor;
          }
          currentChart.update('none');
        }
      });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });

    return () => observer.disconnect();
  });

  onDestroy(() => {
    chartTopConsumidos?.destroy();
    chartTendencia?.destroy();
  });
</script>

<svelte:head>
  <title>{$_('dashboard.titulo')} | StockPredict Pro</title>
</svelte:head>

<main class="dashboard-container">
  <header class="page-header">
    <div class="header-content">
      <div>
        <h1>{$_('dashboard.titulo')}</h1>
        <p class="text-secondary">{$_('dashboard.subtitulo')}</p>
      </div>
      <div class="header-actions">
        <BotonPDF
          url="/api/reportes?tipo=inventario"
          nombreArchivo="inventario-stockpredict.pdf"
          texto={$_('dashboard.exportarPDF')}
          variante="primario"
        />
      </div>
    </div>
  </header>

  <!-- Tarjetas de Métricas -->
  <section class="metrics-grid">
    <div class="metric-card metric-total">
      <h3 class="text-secondary text-sm">{$_('dashboard.totalProductos')}</h3>
      <p class="metric-value">{data.metricas.totalProductos}</p>
    </div>
    <div class="metric-card metric-danger">
      <h3 class="text-sm">{$_('dashboard.stockBajo')}</h3>
      <p class="metric-value">{data.metricas.stockBajo}</p>
    </div>
    <div class="metric-card metric-warning">
      <h3 class="text-sm">{$_('dashboard.reordenUrgente')}</h3>
      <p class="metric-value">{data.metricas.reordenUrgente}</p>
    </div>
    <a class="metric-card metric-warning metric-link" href="#lotes-proximos">
      <h3 class="text-sm">{$_('dashboard.lotesProximosAVencer')}</h3>
      <p class="metric-value">{data.metricas.lotesProximosAVencer}</p>
    </a>
  </section>

  <section class="card expiry-card" id="lotes-proximos">
    <h2>{$_('dashboard.lotesProximosAVencer')}</h2>
    {#if data.lotesProximos.length === 0}
      <p class="text-secondary">{$_('dashboard.sinLotesProximos')}</p>
    {:else}
      <div class="table-scroll">
        <table class="data-table">
          <thead>
            <tr>
              <th>{$_('dashboard.producto')}</th>
              <th>{$_('productos.numeroLote')}</th>
              <th>{$_('productos.fechaCaducidad')}</th>
              <th>{$_('movimientos.cantidad')}</th>
              <th>{$_('dashboard.estadoVencimiento')}</th>
            </tr>
          </thead>
          <tbody>
            {#each data.lotesProximos as lote}
              <tr class:expiry-critical={lote.dias_restantes <= 7}>
                <td>
                  <a href="/productos/{lote.producto_id}/lotes">{lote.producto_nombre}</a>
                </td>
                <td>{lote.numero_lote}</td>
                <td>
                  {new Date(`${lote.fecha_caducidad}T00:00:00`).toLocaleDateString($locale === 'en' ? 'en-US' : 'es-ES')}
                </td>
                <td>{lote.cantidad_actual}</td>
                <td>
                  <span class:badge-danger={lote.dias_restantes <= 7} class:badge-warning={lote.dias_restantes > 7} class="badge">
                    {lote.dias_restantes <= 7
                      ? $_('dashboard.vencimientoCritico')
                      : $_('dashboard.diasParaVencer', { values: { dias: lote.dias_restantes } })}
                  </span>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </section>

  <div class="dashboard-grid">
    <!-- Tabla de Predicciones -->
    <section class="card">
      <h2>{$_('dashboard.estadoPredicciones')}</h2>
      {#if data.productos.length === 0}
        <p class="text-secondary">{$_('dashboard.sinProductos')}</p>
      {:else}
        <table class="data-table">
          <thead>
            <tr>
              <th>{$_('dashboard.producto')}</th>
              <th>{$_('dashboard.stock')}</th>
              <th>{$_('dashboard.diasAgotar')}</th>
              <th>{$_('dashboard.reorden')}</th>
              <th>{$_('dashboard.tendencia')}</th>
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
                    {p.prediccion.dias_hasta_agotarse} {$_('comunes.dias')}
                  {:else}
                    <span class="text-muted">{$_('dashboard.sinDatos')}</span>
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
                <td>
                  {#if p.prediccion?.tendencia === 'creciente'}
                    <span class="badge badge-success">{$_('dashboard.tendenciaCreciente')}</span>
                  {:else if p.prediccion?.tendencia === 'decreciente'}
                    <span class="badge badge-danger">{$_('dashboard.tendenciaDecreciente')}</span>
                  {:else if p.prediccion?.tendencia === 'estable'}
                    <span class="badge badge-info">{$_('dashboard.tendenciaEstable')}</span>
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

    <div class="charts-column">
      <section class="card chart-card">
        <h2>{$_('dashboard.topVendidos')}</h2>
        {#if data.topConsumidos.length > 0}
          <div class="chart-container">
            <canvas bind:this={canvasTopConsumidos}></canvas>
          </div>
        {:else}
          <p class="text-secondary text-center" style:padding="2rem">
            {$_('dashboard.registrarSalidas')}
          </p>
        {/if}
      </section>

    </div>
  </div>

  <section class="card chart-card trend-card">
    <h2>{$_('dashboard.tendenciaStock')}</h2>
    {#if data.productos.length > 0}
      <div class="trend-chart-container">
        <canvas bind:this={canvasTendencia}></canvas>
      </div>
    {:else}
      <p class="text-secondary text-center" style:padding="2rem">
        {$_('dashboard.sinProductos')}
      </p>
    {/if}
  </section>
</main>

<style>
  .dashboard-container {
    max-width: 1400px;
    margin: 2rem auto;
    padding: 0 1rem;
  }

  .page-header {
    margin-bottom: 2rem;
  }

  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 2rem;
  }

  .header-content h1 {
    margin: 0 0 0.5rem;
  }

  .header-content p {
    margin: 0;
  }

  .header-actions {
    flex-shrink: 0;
  }

  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
  }

  .metric-value {
    margin: 0;
    font-size: 2rem;
    font-weight: var(--font-weight-bold);
  }

  .metric-link {
    color: inherit;
    text-decoration: none;
  }

  .metric-link:hover {
    border-color: var(--accent-warning);
    transform: translateY(-2px);
  }

  .expiry-card {
    margin-bottom: 2rem;
  }

  .expiry-card h2 {
    margin-bottom: 1rem;
  }

  .table-scroll {
    width: 100%;
    overflow-x: auto;
  }

  .expiry-critical,
  .expiry-critical td {
    background: var(--status-danger-bg);
    color: var(--status-danger-text);
  }

  .dashboard-grid {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 2rem;
  }

  .charts-column {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .card {
    padding: 1.5rem;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    background: var(--bg-card);
  }

  .chart-card {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .chart-container {
    width: 100%;
    max-width: 300px;
    margin: 1rem auto 0;
    position: relative;
  }

  .trend-card {
    margin-top: 2rem;
    align-items: stretch;
  }

  .trend-chart-container {
    position: relative;
    width: 100%;
    height: 360px;
    margin-top: 1rem;
  }

  .data-table {
    width: 100%;
    border-collapse: collapse;
  }

  .data-table th,
  .data-table td {
    padding: 0.75rem;
    text-align: left;
    border-bottom: 1px solid var(--border-color);
    color: var(--text-primary);
  }

  .data-table th {
    background: var(--bg-secondary);
    font-weight: var(--font-weight-semibold);
  }

  .badge {
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
  }

  .badge-info {
    background: var(--status-info-bg);
    color: var(--status-info-text);
  }

  .badge-success {
    background: var(--status-success-bg);
    color: var(--status-success-text);
  }

  .badge-danger {
    background: var(--status-danger-bg);
    color: var(--status-danger-text);
  }

  .badge-warning {
    background: var(--status-warning-bg);
    color: var(--status-warning-text);
  }

  .text-center {
    text-align: center;
  }

  @media (max-width: 800px) {
    .dashboard-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 600px) {
    .header-content {
      flex-direction: column;
    }
  }
</style>