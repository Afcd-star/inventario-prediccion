<script lang="ts">
  import { _, locale } from 'svelte-i18n';
  import type { PageData } from './$types';
  import GraficoTendencias from '$lib/components/graficos/GraficoTendencias.svelte';

  let { data }: { data: PageData } = $props();
  const informe = $derived(data.informe);

  // Mapeo EXPLÍCITO del código corto de svelte-i18n a un locale BCP-47 válido
  // para Intl.NumberFormat / toLocaleString. 'es' -> 'es-ES', 'en' -> 'en-US'.
  // Si el idioma activo no está en el mapa, caemos a 'es-ES' (doble fallback).
  const MAPA_LOCALE_INTL: Record<string, string> = {
    es: 'es-ES',
    en: 'en-US'
  };

  // $locale puede ser null/undefined en SSR (store aún sin inicializar):
  // por eso el `?? 'es'` antes de indexar, y el `?? 'es-ES'` después.
  const localeIntl = $derived(
    MAPA_LOCALE_INTL[$locale ?? 'es'] ?? 'es-ES'
  );

  const moneda = $derived(
    new Intl.NumberFormat(localeIntl, {
      style: 'currency',
      currency: 'EUR'
    })
  );

  function fmtNum(n: number | null, decimales = 0): string {
    if (n == null) return '—';
    return n.toLocaleString(localeIntl, {
      minimumFractionDigits: decimales,
      maximumFractionDigits: decimales
    });
  }
</script>

<svelte:head>
  <title>{$_('reportes.titulo')} | StockPredict Pro</title>
</svelte:head>

<main class="page-container">
  <header class="page-header">
    <a href="/productos" class="btn-back">
      <span>←</span>
      <span>{$_('reportes.volver')}</span>
    </a>
    <h1>📊 {$_('reportes.titulo')}</h1>
    <p class="text-secondary">{$_('reportes.subtitulo')}</p>
    <div class="acciones-reporte">
      <a href="/api/exportar/reporte-completo" class="btn btn-primary">
        ⬇️ {$_('reportes.descargarExcel')}
      </a>
    </div>
  </header>

  <GraficoTendencias ambito="global" titulo={$_('tendencias.tituloGlobal')} rangoInicial="30d" />

  <!-- 1 · KPIs -->
  <section class="card">
    <h2>{$_('reportes.secResumen')}</h2>
    <div class="kpis-grid">
      <div class="kpi">
        <span class="kpi-valor">{informe.kpis.total}</span>
        <span class="kpi-label">{$_('reportes.kpiTotal')}</span>
      </div>
      <div class="kpi">
        <span class="kpi-valor">{moneda.format(informe.kpis.valorInventario)}</span>
        <span class="kpi-label">{$_('reportes.kpiValor')}</span>
      </div>
      <div class="kpi kpi-alerta">
        <span class="kpi-valor">{informe.kpis.stockBajo}</span>
        <span class="kpi-label">{$_('reportes.kpiStockBajo')}</span>
      </div>
      <div class="kpi kpi-alerta">
        <span class="kpi-valor">{informe.kpis.lotesVencer30}</span>
        <span class="kpi-label">{$_('reportes.kpiLotes')}</span>
      </div>
      <div class="kpi kpi-alerta">
        <span class="kpi-valor">{informe.kpis.anomaliasPendientes}</span>
        <span class="kpi-label">{$_('reportes.kpiAnomalias')}</span>
      </div>
    </div>
  </section>

  <!-- 2 · Stock bajo -->
  <section class="card">
    <h2>{$_('reportes.secStockBajo')} ({informe.stockBajo.length})</h2>
    {#if informe.stockBajo.length === 0}
      <p class="text-secondary">{$_('reportes.sinDatos')}</p>
    {:else}
      <div class="tabla-scroll">
        <table class="data-table">
          <thead>
            <tr>
              <th>{$_('reportes.colProducto')}</th>
              <th>{$_('reportes.colStock')}</th>
              <th>{$_('reportes.colMinimo')}</th>
              <th>{$_('reportes.colDiasAgotar')}</th>
              <th>{$_('reportes.colCompra')}</th>
            </tr>
          </thead>
          <tbody>
            {#each informe.stockBajo as p, i (`${p.producto}-${i}`)}
              <tr>
                <td>{p.producto}</td>
                <td>{p.stock_actual}</td>
                <td>{p.stock_minimo}</td>
                <td>{fmtNum(p.dias_hasta_agotar, 1)}</td>
                <td>{fmtNum(p.compra_recomendada)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </section>

  <!-- 3 · Lotes por vencer -->
  <section class="card">
    <h2>{$_('reportes.secLotes')} ({informe.lotesPorVencer.length})</h2>
    {#if informe.lotesPorVencer.length === 0}
      <p class="text-secondary">{$_('reportes.sinDatos')}</p>
    {:else}
      <div class="tabla-scroll">
        <table class="data-table">
          <thead>
            <tr>
              <th>{$_('reportes.colProducto')}</th>
              <th>{$_('reportes.colLote')}</th>
              <th>{$_('reportes.colCantidad')}</th>
              <th>{$_('reportes.colCaducidad')}</th>
              <th>{$_('reportes.colDiasRestantes')}</th>
            </tr>
          </thead>
          <tbody>
            {#each informe.lotesPorVencer as l, i (`${l.lote}-${l.producto}-${i}`)}
              <tr class:l-critico={l.dias_restantes <= 7}>
                <td>{l.producto}</td>
                <td>{l.lote}</td>
                <td>{l.cantidad}</td>
                <td>{l.caducidad}</td>
                <td>{l.dias_restantes}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </section>

  <!-- 4 · Predicciones -->
  <section class="card">
    <h2>{$_('reportes.secPredicciones')} ({informe.predicciones.length})</h2>
    <div class="tabla-scroll">
      <table class="data-table">
        <thead>
          <tr>
            <th>{$_('reportes.colProducto')}</th>
            <th>{$_('reportes.colStock')}</th>
            <th>{$_('reportes.colConsumo')}</th>
            <th>{$_('reportes.colDiasAgotar')}</th>
            <th>{$_('reportes.colFechaReorden')}</th>
            <th>{$_('reportes.colCompra')}</th>
          </tr>
        </thead>
        <tbody>
          {#each informe.predicciones as p, i (`${p.producto}-${i}`)}
            <tr>
              <td>{p.producto}</td>
              <td>{p.stock_actual}</td>
              <td>{fmtNum(p.consumo_diario, 2)}</td>
              <td>{fmtNum(p.dias_hasta_agotar, 1)}</td>
              <td>{p.fecha_reorden ?? '—'}</td>
              <td>{fmtNum(p.compra_recomendada)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    <p class="nota-tecnica">{$_('reportes.notaPredicciones')}</p>
  </section>

  <!-- 5 · Anomalías activas -->
  <section class="card">
    <h2>{$_('reportes.secAnomalias')} ({informe.anomalias.length})</h2>
    {#if informe.anomalias.length === 0}
      <p class="text-secondary">{$_('reportes.sinDatos')}</p>
    {:else}
      <div class="tabla-scroll">
        <table class="data-table">
          <thead>
            <tr>
              <th>{$_('reportes.colProducto')}</th>
              <th>{$_('reportes.colTipo')}</th>
              <th>{$_('reportes.colInicio')}</th>
              <th>{$_('reportes.colFin')}</th>
              <th>{$_('reportes.colDesviacion')}</th>
              <th>{$_('reportes.colZ')}</th>
            </tr>
          </thead>
          <tbody>
            {#each informe.anomalias as a, i (`${a.producto}-${a.fecha_inicio}-${i}`)}
              <tr>
                <td>{a.producto}</td>
                <td><span class="badge badge-warning">{a.tipo}</span></td>
                <td>{a.fecha_inicio}</td>
                <td>{a.fecha_fin}</td>
                <td>{fmtNum(a.desviacion_promedio, 1)}%</td>
                <td>{fmtNum(a.z_score_max, 2)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </section>

  <!-- 6 · Movimientos recientes -->
  <section class="card">
    <h2>{$_('reportes.secMovimientos')}</h2>
    <div class="tabla-scroll">
      <table class="data-table">
        <thead>
          <tr>
            <th>{$_('reportes.colFecha')}</th>
            <th>{$_('reportes.colProducto')}</th>
            <th>{$_('reportes.colTipo')}</th>
            <th>{$_('reportes.colCantidad')}</th>
            <th>{$_('reportes.colUbicacion')}</th>
          </tr>
        </thead>
        <tbody>
          {#each informe.movimientos as m, i (`${m.fecha}-${m.producto}-${m.tipo}-${i}`)}
            <tr>
              <td>{m.fecha}</td>
              <td>{m.producto}</td>
              <td><span class="badge" class:badge-success={m.tipo === 'entrada'} class:badge-danger={m.tipo === 'salida'}>{m.tipo}</span></td>
              <td>{m.cantidad}</td>
              <td>{m.ubicacion ?? '—'}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    <p class="nota-tecnica">{$_('reportes.notaMovimientos', { values: { n: informe.movimientosTotales } })}</p>
  </section>
</main>

<style>
  .page-header { margin-bottom: 1.5rem; }
  .acciones-reporte { margin-top: 1rem; }

  .kpis-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 1rem;
    margin-top: 1rem;
  }
  .kpi {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.35rem;
    padding: 1.25rem 1rem;
    border-radius: 10px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    text-align: center;
  }
  .kpi-valor { font-size: 1.9rem; font-weight: var(--font-weight-bold); color: var(--text-primary); line-height: 1.1; }
  .kpi-label { font-size: var(--font-size-sm); color: var(--text-secondary); }
  .kpi-alerta { background: var(--status-warning-bg); border-color: var(--status-warning-border, var(--accent-warning)); }
  .kpi-alerta .kpi-valor { color: var(--status-warning-text, var(--accent-warning)); }

  .tabla-scroll { overflow-x: auto; margin-top: 0.75rem; }
  .l-critico { background: var(--status-danger-bg); }
  .nota-tecnica { margin-top: 0.75rem; font-size: var(--font-size-sm); color: var(--text-secondary); font-style: italic; }

  section.card { margin-bottom: 1.25rem; }
  section.card h2 { margin-top: 0; }
</style>