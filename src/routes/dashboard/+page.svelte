<script lang="ts">
  import type { PageData } from './$types';
  import { tick } from 'svelte';
  import Chart from 'chart.js/auto'; // estático y SSR-seguro aquí (no trae hammerjs)
  import BotonPDF from '$lib/components/BotonPDF.svelte';
  import GraficoTendencias from '$lib/components/graficos/GraficoTendencias.svelte';
  import { _, locale } from 'svelte-i18n';

  let { data }: { data: PageData } = $props();

  type TabId = 'operacion' | 'analisis' | 'ubicaciones';
  const TABS: TabId[] = ['operacion', 'analisis', 'ubicaciones'];

  // Pestaña activa. Semilla 'operacion' (literal, no prop) => sin warning state_referenced_locally.
  let tab = $state<TabId>('operacion');

  // ✅ Nodos DOM en $state.raw (NO $state): reactividad de asignación sin proxy profundo.
  let canvasTopConsumidos = $state.raw<HTMLCanvasElement | null>(null);
  let canvasTendencia = $state.raw<HTMLCanvasElement | null>(null);

  // ✅ Instancias Chart.js en $state.raw: permiten que el $effect de i18n las vea actualizadas
  //    SIN caer en la circularidad del viejo branch `if(chart) update()` (que ahora no existe).
  let chartTopConsumidos = $state.raw<Chart | null>(null);
  let chartTendencia = $state.raw<Chart | null>(null);

  function tabindexDe(id: TabId): number {
    return tab === id ? 0 : -1; // roving tabindex: solo el tab activo es tabbable
  }

  function onTecladoTabs(e: KeyboardEvent) {
    const idx = TABS.indexOf(tab);
    let nuevo = idx;
    if (e.key === 'ArrowRight') nuevo = (idx + 1) % TABS.length;
    else if (e.key === 'ArrowLeft') nuevo = (idx - 1 + TABS.length) % TABS.length;
    else if (e.key === 'Home') nuevo = 0;
    else if (e.key === 'End') nuevo = TABS.length - 1;
    else return;
    e.preventDefault();
    tab = TABS[nuevo];
    document.getElementById(`tab-${TABS[nuevo]}`)?.focus();
  }

  async function irALotes() {
    tab = 'operacion';
    await tick(); // espero a que el expiry-card se monte antes de hacer scroll
    document.getElementById('lotes-proximos')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

    // ── Chart 1: Ranking "Top vendidos" como BARRAS HORIZONTALES (pestaña Análisis) ──
  // Siempre destroy+create; el guard de `tab` evita montar el chart en pestañas inactivas.
  $effect(() => {
    if (tab !== 'analisis' || !canvasTopConsumidos || data.topConsumidos.length === 0) return;

    const estilos = getComputedStyle(document.documentElement);
    const colorTexto = estilos.getPropertyValue('--text-primary').trim();
    const colorGrid = estilos.getPropertyValue('--border-color').trim();

    // Copia ordenada descendente: el más vendido arriba. No mutamos el prop `data`.
    const ordenados = [...data.topConsumidos].sort((a, b) => b.total_vendido - a.total_vendido);

    chartTopConsumidos = new Chart(canvasTopConsumidos, {
      type: 'bar',
      data: {
        labels: ordenados.map((p) => p.nombre),
        datasets: [{
          // Un solo color: la categoría ya la codifica el eje Y, no hace falta paleta.
          label: $_('dashboard.unidadesVendidas'),
          data: ordenados.map((p) => p.total_vendido),
          backgroundColor: '#3b82f6',
          borderRadius: 4,
          maxBarThickness: 38
        }]
      },
      options: {
        indexAxis: 'y',                 // <- horizontal: el ranking se lee de arriba a abajo
        responsive: true,
        maintainAspectRatio: false,     // <- llena la altura del contenedor (ver CSS)
        plugins: {
          legend: { display: false }    // <- el eje Y ya etiqueta; la leyenda sería ruido
        },
        scales: {
          x: {                          // eje numérico (unidades vendidas)
            beginAtZero: true,
            grid: { color: colorGrid },
            ticks: { color: colorTexto, precision: 0 }
          },
          y: {                          // eje de categorías (nombres de producto)
            grid: { display: false },   // sin rejilla vertical: las filas ya separan
            ticks: { color: colorTexto }
          }
        }
      }
    });

    return () => { chartTopConsumidos?.destroy(); chartTopConsumidos = null; };
  });

  // ── Chart 2: Línea transversal "Stock actual vs mínimo por producto" (pestaña Análisis) ──
  $effect(() => {
    if (tab !== 'analisis' || !canvasTendencia || data.productos.length === 0) return;

    const estilos = getComputedStyle(document.documentElement);
    const colorTexto = estilos.getPropertyValue('--text-primary').trim();
    const colorGrid = estilos.getPropertyValue('--border-color').trim();

    chartTendencia = new Chart(canvasTendencia, {
      type: 'line',
      data: {
        labels: data.productos.map((p) => p.nombre),
        datasets: [
          {
            label: $_('dashboard.stockActual'),
            data: data.productos.map((p) => p.stock_actual),
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            fill: true,
            tension: 0.4
          },
          {
            label: $_('dashboard.stockMinimo'),
            data: data.productos.map((p) => p.stock_minimo),
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
        plugins: { legend: { labels: { color: colorTexto } } },
        scales: {
          y: { beginAtZero: true, grid: { color: colorGrid }, ticks: { color: colorTexto } },
          x: { grid: { color: colorGrid }, ticks: { color: colorTexto } }
        }
      }
    });

    return () => { chartTendencia?.destroy(); chartTendencia = null; };
  });

  // ── i18n: reetiqueta la línea transversal al cambiar de idioma (chart vivo) ──
  // Lee chartTendencia ($state.raw) => se re-ejecuta al crear/destruir (redundante inofensivo)
  // y al cambiar idioma (su propósito real). No escribe chartTendencia => sin bucle.
  $effect(() => {
    const stockActualLabel = $_('dashboard.stockActual');
    const stockMinimoLabel = $_('dashboard.stockMinimo');
    const unidadesLabel = $_('dashboard.unidadesVendidas');

    if (chartTendencia) {
      chartTendencia.data.datasets[0].label = stockActualLabel;
      chartTendencia.data.datasets[1].label = stockMinimoLabel;
      chartTendencia.update('none');
    }
    if (chartTopConsumidos) {
      chartTopConsumidos.data.datasets[0].label = unidadesLabel;
      chartTopConsumidos.update('none');
    }
  });

  // ── Observador de tema: sin deps reactivas en el cuerpo => corre 1 vez al montar ──
  // Las charts se leen DENTRO del callback (fuera del tracking de Svelte), por cierre.
  $effect(() => {
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
        if (legend && legend.labels) legend.labels.color = labelColor;
        currentChart.update('none');
      }
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
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

  <!-- KPIs SIEMPRE visibles (el golpe de vista). Fuera de las pestañas a propósito. -->
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
    <div class="metric-card metric-anomalia">
      <h3 class="text-sm">{$_('anomalias.activas')}</h3>
      <p class="metric-value">{data.anomaliasPendientes}</p>
    </div>
    <!-- KPI clickable: ya no es anchor de scroll, es botón que activa la pestaña Operación -->
    <button type="button" class="metric-card metric-warning metric-link" onclick={irALotes}>
      <h3 class="text-sm">{$_('dashboard.lotesProximosAVencer')}</h3>
      <p class="metric-value">{data.metricas.lotesProximosAVencer}</p>
    </button>
  </section>

  <!-- Pestañas -->
  <!-- svelte-ignore a11y_interactive_supports_focus (roving tabindex APG: el foco vive en los tabs hijos; el tablist recibe keydown por bubbling y no necesita foco propio) -->
  <div
    class="tablist"
    role="tablist"
    aria-label={$_('dashboard.tabs.ariaTablist')}
    onkeydown={onTecladoTabs}
  > 
    <div
      class="tablist"
      role="tablist"
      aria-label={$_('dashboard.tabs.ariaTablist')}
      onkeydown={onTecladoTabs}
    >
      <button
        id="tab-operacion"
        role="tab"
        class="tab"
        class:tab-activo={tab === 'operacion'}
        aria-selected={tab === 'operacion'}
        aria-controls="panel-dashboard"
        tabindex={tabindexDe('operacion')}
        onclick={() => tab = 'operacion'}
      >
        {$_('dashboard.tabs.operacion')}
      </button>
      <button
        id="tab-analisis"
        role="tab"
        class="tab"
        class:tab-activo={tab === 'analisis'}
        aria-selected={tab === 'analisis'}
        aria-controls="panel-dashboard"
        tabindex={tabindexDe('analisis')}
        onclick={() => tab = 'analisis'}
      >
        {$_('dashboard.tabs.analisis')}
      </button>
      <button
        id="tab-ubicaciones"
        role="tab"
        class="tab"
        class:tab-activo={tab === 'ubicaciones'}
        aria-selected={tab === 'ubicaciones'}
        aria-controls="panel-dashboard"
        tabindex={tabindexDe('ubicaciones')}
        onclick={() => tab = 'ubicaciones'}
      >
        {$_('dashboard.tabs.ubicaciones')}
      </button>
    </div>
  </div>

  <div id="panel-dashboard" role="tabpanel" class="tabpanel" aria-labelledby={`tab-${tab}`} tabindex="0">

    {#if tab === 'operacion'}
      <!-- Lotes por vencer -->
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
                    <td><a href="/productos/{lote.producto_id}/lotes">{lote.producto_nombre}</a></td>
                    <td>{lote.numero_lote}</td>
                    <td>{new Date(`${lote.fecha_caducidad}T00:00:00`).toLocaleDateString($locale === 'en' ? 'en-US' : 'es-ES')}</td>
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

      <!-- Transferencias en tránsito -->
      {#if data.transferenciasActivas.length > 0}
        <section class="card" style="margin-top: 1.5rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <h2 style="margin: 0;">🚚 {$_('dashboard.transferenciasEnTransito')}</h2>
            <a href="/transferencias" class="btn btn-sm btn-primary">{$_('dashboard.verTodas')}</a>
          </div>
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>{$_('transferencias.origen')}</th>
                  <th>{$_('transferencias.destino')}</th>
                  <th>{$_('transferencias.estado')}</th>
                  <th>{$_('transferencias.fecha')}</th>
                </tr>
              </thead>
              <tbody>
                {#each data.transferenciasActivas.slice(0, 5) as t}
                  <tr>
                    <td><a href="/transferencias/{t.id}"><strong>#{t.id}</strong></a></td>
                    <td>{t.origen_nombre}</td>
                    <td>{t.destino_nombre}</td>
                    <td>
                      <span class="badge badge-warning">
                        {t.estado === 'pendiente' ? $_('transferencias.estadoPendiente') : $_('transferencias.estadoTransito')}
                      </span>
                    </td>
                    <td>{new Date(t.creada_en).toLocaleDateString()}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </section>
      {/if}

    {:else if tab === 'analisis'}
      <!-- 🆕 Tendencia temporal global (bonus Fase 13). Lazy: solo carga al abrir esta pestaña. -->
      <GraficoTendencias ambito="global" titulo={$_('tendencias.tituloGlobal')} rangoInicial="30d" />

            <!-- Predicciones: ahora full-width (antes 2fr de un grid de 2 columnas) -->
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
                  <td class={p.stock_actual < p.stock_minimo ? 'text-danger font-semibold' : ''}>{p.stock_actual}</td>
                  <td>
                    {#if p.prediccion && p.prediccion.dias_hasta_agotarse !== null}
                      {p.prediccion.dias_hasta_agotarse} {$_('comunes.dias')}
                    {:else}
                      <span class="text-muted">{$_('dashboard.sinDatos')}</span>
                    {/if}
                  </td>
                  <td>
                    {#if p.prediccion?.fecha_recomendada_reorden}
                      <span class="badge badge-info">{p.prediccion.fecha_recomendada_reorden}</span>
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

      <!-- Ranking top vendidos: full-width, barras horizontales (antes donut en columna 1fr) -->
      <section class="card" style="margin-top: 1.5rem;">
        <h2>{$_('dashboard.topVendidos')}</h2>
        {#if data.topConsumidos.length > 0}
          <div class="chart-container-full">
            <canvas bind:this={canvasTopConsumidos}></canvas>
          </div>
        {:else}
          <p class="text-secondary text-center" style:padding="2rem">{$_('dashboard.registrarSalidas')}</p>
        {/if}
      </section>

      <!-- Chart transversal: renombrado para NO confundirse con la tendencia temporal de arriba -->
      <section class="card chart-card trend-card">
        <h2>{$_('dashboard.stockVsMinimo')}</h2>
        {#if data.productos.length > 0}
          <div class="trend-chart-container">
            <canvas bind:this={canvasTendencia}></canvas>
          </div>
        {:else}
          <p class="text-secondary text-center" style:padding="2rem">{$_('dashboard.sinProductos')}</p>
        {/if}
      </section>

    {:else if tab === 'ubicaciones'}
      <section class="card">
        <h2 style="margin-top: 0;">🏢 {$_('dashboard.resumenUbicaciones')}</h2>
        <div class="stats-grid">
          <div class="stat-card">
            <span class="stat-number">{data.resumen.total_ubicaciones}</span>
            <span class="stat-label">{$_('dashboard.totalUbicaciones')}</span>
          </div>
          <div class="stat-card">
            <span class="stat-number">{data.resumen.transferencias_activas}</span>
            <span class="stat-label">{$_('dashboard.transferenciasActivas')}</span>
          </div>
          <div class="stat-card">
            <span class="stat-number">{data.resumen.stock_total_sistema.toLocaleString()}</span>
            <span class="stat-label">{$_('dashboard.stockTotalSistema')}</span>
          </div>
        </div>
      </section>

      <section class="card" style="margin-top: 1.5rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
          <h2 style="margin: 0;">📦 {$_('dashboard.stockPorUbicacion')}</h2>
          <a href="/admin/ubicaciones?from=dashboard" class="btn btn-sm btn-secondary">{$_('dashboard.gestionarUbicaciones')}</a>
        </div>
        {#if data.stockPorUbicacion.length === 0}
          <p class="text-secondary">{$_('dashboard.sinUbicaciones')}</p>
        {:else}
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>{$_('dashboard.ubicacion')}</th>
                  <th>{$_('dashboard.tipo')}</th>
                  <th>{$_('dashboard.productos')}</th>
                  <th>{$_('dashboard.stockTotal')}</th>
                  <th>{$_('dashboard.porVencer')}</th>
                </tr>
              </thead>
              <tbody>
                {#each data.stockPorUbicacion as ub}
                  <tr>
                    <td><strong>{ub.ubicacion_nombre}</strong></td>
                    <td>
                      <span class="badge badge-info">
                        {ub.ubicacion_tipo === 'almacen' ? $_('ubicaciones.tipoAlmacen') :
                         ub.ubicacion_tipo === 'tienda' ? $_('ubicaciones.tipoTienda') : $_('ubicaciones.tipoCentro')}
                      </span>
                    </td>
                    <td>{ub.total_productos}</td>
                    <td><strong>{ub.stock_total.toLocaleString()}</strong></td>
                    <td>
                      {#if ub.stock_por_vencer > 0}
                        <span class="badge badge-warning">⚠️ {ub.stock_por_vencer}</span>
                      {:else}
                        <span class="text-secondary">0</span>
                      {/if}
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      </section>
    {/if}

  </div>
</main>

<style>
  .dashboard-container { max-width: 1400px; margin: 2rem auto; padding: 0 1rem; }
  .page-header { margin-bottom: 2rem; }
  .header-content { display: flex; justify-content: space-between; align-items: flex-start; gap: 2rem; }
  .header-content h1 { margin: 0 0 0.5rem; }
  .header-content p { margin: 0; }
  .header-actions { flex-shrink: 0; }

  /* Pestañas */
  .tablist {
    display: flex;
    gap: 0.25rem;
    border-bottom: 1px solid var(--border-color);
    margin-bottom: 1.5rem;
  }
  .tab {
    padding: 0.6rem 1.1rem;
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s;
  }
  .tab:hover { color: var(--text-primary); }
  .tab-activo { color: var(--accent-primary); border-bottom-color: var(--accent-primary); }
  .tabpanel:focus-visible {
    outline: 2px solid var(--accent-primary);
    outline-offset: 2px;
    border-radius: 4px;
  }

  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
  }
  .metric-value { margin: 0; font-size: 2rem; font-weight: var(--font-weight-bold); }
  .metric-link { color: inherit; text-decoration: none; text-align: left; font: inherit; }
  .metric-link:hover { border-color: var(--accent-warning); transform: translateY(-2px); }

  .expiry-card { margin-bottom: 0; }
  .expiry-card h2 { margin-bottom: 1rem; }
  .table-scroll { width: 100%; overflow-x: auto; }
  .expiry-critical, .expiry-critical td { background: var(--status-danger-bg); color: var(--status-danger-text); }

  .card { padding: 1.5rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-card); }
  .chart-card { display: flex; flex-direction: column; align-items: center; }
  .trend-card { margin-top: 2rem; align-items: stretch; }
  .trend-chart-container { position: relative; width: 100%; height: 360px; margin-top: 1rem; }

  .chart-container-full {
    position: relative;
    width: 100%;
    height: 340px;   /* 5 barras × ~68px de fila: generoso y legible */
    margin-top: 1rem;
  }

  .data-table { width: 100%; border-collapse: collapse; }
  .data-table th, .data-table td { padding: 0.75rem; text-align: left; border-bottom: 1px solid var(--border-color); color: var(--text-primary); }
  .data-table th { background: var(--bg-secondary); font-weight: var(--font-weight-semibold); }

  .badge { padding: 0.25rem 0.5rem; border-radius: 4px; font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold); }
  .badge-info { background: var(--status-info-bg); color: var(--status-info-text); }
  .badge-success { background: var(--status-success-bg); color: var(--status-success-text); }
  .badge-danger { background: var(--status-danger-bg); color: var(--status-danger-text); }
  .badge-warning { background: var(--status-warning-bg); color: var(--status-warning-text); }
  .text-center { text-align: center; }

  @media (max-width: 600px) { .header-content { flex-direction: column; } }
</style>