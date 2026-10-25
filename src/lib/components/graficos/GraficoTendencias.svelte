<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { inicializarChart } from '$lib/chart-setup';
  import type { ChartConfiguration, Chart as ChartType, TooltipItem } from 'chart.js';
  import type { RangoSerie, SerieTemporal } from '$lib/types';

  let {
    ambito,
    titulo,
    rangoInicial = '30d'
  }: {
    ambito: 'global' | number;
    titulo: string;
    rangoInicial?: RangoSerie;
  } = $props();

  const RANGOS: RangoSerie[] = ['7d', '30d', '90d', '1y'];

  // `rangoInicial` es una SEMILLA deliberada, no una prop sincronizada:
  // el componente es no-controlado y el usuario cambia el rango con los botones.
  // svelte-ignore state_referenced_locally (intencional: semilla, no sync)
  let rango = $state<RangoSerie>(rangoInicial);

  let recarga = $state(0);

  let serie = $state.raw<SerieTemporal | null>(null);
  let cargando = $state(false);
  let errorCarga = $state<string | null>(null);
  let ultimaCarga = $state<Date | null>(null);

  let canvas = $state.raw<HTMLCanvasElement | null>(null);
  let contenedor = $state.raw<HTMLElement | null>(null);

  // La instancia de Chart NUNCA va en $state (proxy profundo = desastre de rendimiento).
  let chart: ChartType<'line'> | null = null;

  const COLOR_STOCK_REAL = '#2563eb';
  const COLOR_STOCK_PRED = '#60a5fa';
  const COLOR_VENTAS_REAL = '#16a34a';
  const COLOR_VENTAS_PRED = '#4ade80';

  let colorTexto = '#64748b';
  let colorGrid = 'rgba(100,116,139,0.18)';
  let colorFondo = '#ffffff';

  function urlSerie(): string {
    return ambito === 'global'
      ? `/api/series/global?rango=${rango}`
      : `/api/series/producto/${ambito}?rango=${rango}`;
  }

  function fmtHora(d: Date | null): string {
  if (!d) return '—'; 
  return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }); 
} 

  // Fetch con cancelación. $effect solo corre en cliente → SSR a salvo.
  $effect(() => {
    const control = new AbortController();
    cargando = true;
    errorCarga = null;

    const url = `${urlSerie()}&retry=${recarga}`;

    fetch(url, { signal: control.signal, cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) {
          let msg = `${$_('tendencias.error')} (${res.status})`;
          try {
            const b = await res.json();
            msg = b.message || b.data?.message || msg;
          } catch { /* body no-JSON */ }
          throw new Error(msg);
        }
        return res.json();
      })
      .then((body) => { serie = body.data, ultimaCarga = new Date(); })
      .catch((e) => {
        if (e?.name === 'AbortError') return;
        errorCarga = e.message || $_('tendencias.error');
      })
      .finally(() => {
        if (!control.signal.aborted) cargando = false;
      });

    return () => control.abort();
  });

  function leerColoresTema() {
    if (!contenedor) return;
    const cs = getComputedStyle(contenedor);
    colorTexto = cs.getPropertyValue('--text-secondary').trim() || colorTexto;
    colorGrid = cs.getPropertyValue('--border-color').trim() || colorGrid;
    colorFondo = cs.getPropertyValue('--bg-card').trim() || colorFondo;
  }

  const pluginFondo = {
    id: 'fondoCanvas',
    beforeDraw(ch: any) {
      const { ctx, width, height } = ch;
      ctx.save();
      ctx.fillStyle = colorFondo;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }
  };

  const pluginHoy = {
    id: 'lineaHoy',
    afterDatasetsDraw(ch: any) {
      if (!serie) return;
      const x = ch.scales.x;
      const y = ch.scales.yStock;
      if (!x || !y) return;

      const px = x.getPixelForValue(serie.hoyIndex);
      const { top, bottom } = ch.chartArea;
      const ctx = ch.ctx;

      // 1) La línea vertical punteada (igual que antes)
      ctx.save();
      ctx.beginPath();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = colorGrid;
      ctx.lineWidth = 1;
      ctx.moveTo(px, top);
      ctx.lineTo(px, bottom);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // 2) La etiqueta "Hoy" en NEGRITA, DENTRO del chartArea, con pill de fondo
      const texto = $_('tendencias.hoy');
      ctx.save();
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const m = ctx.measureText(texto);
      const padX = 7;
      const padY = 4;
      const w = m.width + padX * 2;
      const h = 12 + padY * 2;
      const cx = px;
      const cy = top + 14; // dentro del área → por debajo de la leyenda

      // Pill opaco: tapa cualquier línea que pase por detrás
      ctx.fillStyle = colorFondo;
      ctx.strokeStyle = colorGrid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(cx - w / 2, cy - h / 2, w, h, h / 2);
      ctx.fill();
      ctx.stroke();

      // Texto en negrita, color del tema
      ctx.fillStyle = colorTexto;
      ctx.fillText(texto, cx, cy);
      ctx.restore();
    }
  };

  function construirConfig(s: SerieTemporal): ChartConfiguration<'line'> {
    // Copias planas: Chart.js nunca debe recibir proxies de Svelte.
    const etiquetas = [...s.etiquetas];
    const stockReal = [...s.stockReal];
    const stockPredicho = [...s.stockPredicho];
    const ventasReales = [...s.ventasReales];
    const ventasPredichas = [...s.ventasPredichas];
    
    return {
      type: 'line',
      data: {
        labels: etiquetas,
        datasets: [
          {
            label: $_('tendencias.serieStockReal'),
            data: stockReal,
            borderColor: COLOR_STOCK_REAL,
            backgroundColor: COLOR_STOCK_REAL,
            yAxisID: 'yStock',
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 4,
            tension: 0.3,
            spanGaps: false
          },
          {
            label: $_('tendencias.serieStockPredicho'),
            data: stockPredicho,
            borderColor: COLOR_STOCK_PRED,
            backgroundColor: COLOR_STOCK_PRED,
            yAxisID: 'yStock',
            borderWidth: 2,
            borderDash: [6, 4],
            pointRadius: 0,
            pointHoverRadius: 4,
            tension: 0.3,
            spanGaps: false
          },
          {
            label: $_('tendencias.serieVentasReales'),
            data: ventasReales,
            borderColor: COLOR_VENTAS_REAL,
            backgroundColor: COLOR_VENTAS_REAL,
            yAxisID: 'yVentas',
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 4,
            tension: 0.3,
            spanGaps: false
          },
          {
            label: $_('tendencias.serieVentasPredichas'),
            data: ventasPredichas,
            borderColor: COLOR_VENTAS_PRED,
            backgroundColor: COLOR_VENTAS_PRED,
            yAxisID: 'yVentas',
            borderWidth: 2,
            borderDash: [6, 4],
            pointRadius: 0,
            pointHoverRadius: 4,
            tension: 0.3,
            spanGaps: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: etiquetas.length > 120 ? 0 : 300
        },
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            labels: {
              color: colorTexto,
              usePointStyle: true,
              boxWidth: 8
            }
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            callbacks: {
              label: (tooltipItem: TooltipItem<'line'>) => {
                const v = tooltipItem.parsed.y;
                if (v == null) return '';
                const unidad =
                  tooltipItem.dataset.yAxisID === 'yVentas'
                    ? $_('tendencias.unidadVenta')
                    : $_('tendencias.unidadStock');
                return ` ${tooltipItem.dataset.label}: ${Number(v).toLocaleString('es-ES')} ${unidad}`;
              }
            }
          },
          zoom: {
            zoom: {
              wheel: { enabled: true },
              pinch: { enabled: false },
              drag: {
                enabled: true,
                backgroundColor: 'rgba(37,99,235,0.12)',
                borderColor: COLOR_STOCK_REAL,
                borderWidth: 1
              },
              mode: 'x'
            },
            pan: {
              enabled: true,
              mode: 'x'
            },
            limits: {
              x: {
                min: 'original',
                max: 'original'
              }
            }
          }
        },
        scales: {
          x: {
            ticks: {
              color: colorTexto,
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 12
            },
            grid: {
              color: colorGrid
            }
          },
          yStock: {
            type: 'linear',
            position: 'left',
            title: {
              display: true,
              text: $_('tendencias.ejeStock'),
              color: colorTexto
            },
            ticks: {
              color: colorTexto,
              precision: 0
            },
            grid: {
              color: colorGrid
            }
          },
          yVentas: {
            type: 'linear',
            position: 'right',
            title: {
              display: true,
              text: $_('tendencias.ejeVentas'),
              color: colorTexto
            },
            ticks: {
              color: colorTexto,
              precision: 0
            },
            grid: {
              drawOnChartArea: false
            }
          }
        }
      },
      plugins: [pluginFondo, pluginHoy]
    } as ChartConfiguration<'line'>;
  }

  // Crea o actualiza el chart cuando hay canvas + serie.
  // try/catch OBLIGATORIO: sin él, un fallo de creación se traga en silencio
  // (IIFE async sin catch = unhandled rejection = lienzo blanco sin pista).
  $effect(() => {
    if (!canvas || !serie) return;

    let cancelado = false;

    (async () => {
      try {
        const Chart = await inicializarChart();

        if (cancelado || !canvas) return;

        // Guard explícito: si la clase no llegó registrada, lo decimos claro
        // en vez de dejar que new Chart() lance un error críptico de controller.
        if (!Chart || typeof Chart.register !== 'function') {
          throw new Error($_('tendencias.errorRegistro'));
        }

        leerColoresTema();

        if (chart) {
          chart.data = construirConfig(serie).data;
          chart.update();
        } else {
          chart = new Chart(canvas, construirConfig(serie));
        }
      } catch (e: any) {
        if (e?.name === 'AbortError' || cancelado) return;
        // El error REAL sube a la UI en vez de morir en consola.
        errorCarga = e?.message
          ? `${$_('tendencias.errorCreacion')}: ${e.message}`
          : $_('tendencias.errorCreacion');
        console.error('[GraficoTendencias] fallo al crear el chart:', e);
      }
    })();

    return () => { cancelado = true; };
  });

  // Cleanup al desmontar.
  $effect(() => {
    return () => {
      chart?.destroy();
      chart = null;
    };
  });

    // ── D5: repintar el gráfico al cambiar de tema (atributo data-theme en <html>) ──
  // El callback del MutationObserver NO corre dentro del tracking de Svelte, así que leer
  // chart/contenedor aquí por cierre no registra dependencias reactivas => este $effect
  // se ejecuta UNA sola vez al montar (no re-registra observers en cada cambio de tema).
  $effect(() => {
    const observer = new MutationObserver(() => {
      // 1) Refresca las vars del closure que leen los plugins inline (fondo del PNG + línea/pill "hoy").
      leerColoresTema();

      // 2) Si hay chart vivo, muta sus colores de ejes/leyenda y redibuja SIN animación.
      if (chart) {
        const opts = chart.options as any; // acceso laxo a scales custom (yStock/yVentas):
                                           // evita reabrir un frente de tipos de Chart.js.
        const s = opts.scales;
        if (s?.x) {
          s.x.ticks = { ...s.x.ticks, color: colorTexto };
          s.x.grid  = { ...s.x.grid,  color: colorGrid };
        }
        if (s?.yStock) {
          s.yStock.ticks = { ...s.yStock.ticks, color: colorTexto };
          s.yStock.grid  = { ...s.yStock.grid,  color: colorGrid };
          s.yStock.title = { ...s.yStock.title, color: colorTexto };
        }
        if (s?.yVentas) {
          s.yVentas.ticks = { ...s.yVentas.ticks, color: colorTexto };
          s.yVentas.title = { ...s.yVentas.title, color: colorTexto };
        }
        const lg = opts.plugins?.legend;
        if (lg && lg.labels) lg.labels.color = colorTexto;
        chart.update('none'); // redibuja -> dispara pluginFondo/pluginHoy con los colores nuevos
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });

    return () => observer.disconnect();
  });

  function resetZoom() { chart?.resetZoom(); }

  function exportarPNG() {
    if (!chart) return;
    const url = chart.toBase64Image('image/png', 1);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tendencia_${ambito === 'global' ? 'global' : ambito}_${rango}.png`;
    a.click();
  }
</script>

<section class="grafico-card" bind:this={contenedor}>
  <div class="grafico-header">
    <h2>{titulo}</h2>
    <div class="controls" role="group" aria-label={$_('tendencias.ariaRangos')}>
      {#each RANGOS as r}
        <button
          type="button"
          class="btn-rango"
          class:activo={rango === r}
          aria-pressed={rango === r}
          onclick={() => rango = r}
        >
          {$_(`tendencias.rango.${r}`)}
        </button>
      {/each}
    </div>
  </div>

  {#if errorCarga && !serie}
    <!-- Error sin datos previos: no hay nada que mostrar -->
    <div class="estado estado-error" role="alert">
      <span>{errorCarga}</span>
      <button type="button" class="btn btn-sm btn-secondary" onclick={() => recarga++}>
        {$_('tendencias.reintentar')}
      </button>
    </div>
  {:else if serie}
    {#if errorCarga}
      <div class="aviso-stale" role="alert">
        <span>⚠️ {$_('tendencias.stale', { values: { hora: fmtHora(ultimaCarga) } })}</span>
        <button type="button" class="btn-stale" onclick={() => recarga++}>
          {$_('tendencias.reintentar')}
        </button>
      </div>
    {/if}
    <!-- SIEMPRE que hay datos, el canvas persiste. cargando solo superpone un velo. -->
    <div class="lienzo" role="img" aria-label={$_('tendencias.ariaGrafico', { values: { titulo } })}>
      <canvas bind:this={canvas} aria-hidden="true"></canvas>
      {#if cargando}
        <div class="overlay-carga" aria-busy="true">{$_('tendencias.cargando')}</div>
      {/if}
    </div>
    <div class="grafico-footer">
      <p class="nota">{$_('tendencias.notaModelo')}</p>
      <div class="footer-btns">
        <button type="button" class="btn btn-sm btn-secondary" onclick={resetZoom}>{$_('tendencias.resetZoom')}</button>
        <button type="button" class="btn btn-sm btn-secondary" onclick={exportarPNG}>⬇️ {$_('tendencias.exportarPNG')}</button>
      </div>
    </div>
    <p class="nota-excel">{$_('tendencias.notaExcel')}</p>
  {:else if cargando}
    <!-- Primer fetch, todavía sin datos: spinner a secas (sin canvas que desmontar) -->
    <div class="estado estado-carga" aria-busy="true">{$_('tendencias.cargando')}</div>
  {/if}
</section>

<style>
  .grafico-card {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 10px;
    padding: 1.25rem 1.5rem;
    margin-bottom: 1.25rem;
  }
  .grafico-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
    margin-bottom: 1rem;
  }
  .grafico-header h2 { margin: 0; font-size: var(--font-size-lg); }
  .controls { display: flex; gap: 0.35rem; flex-wrap: wrap; }
  .btn-rango {
    padding: 0.35rem 0.7rem;
    border: 1px solid var(--border-color);
    background: transparent;
    color: var(--text-secondary);
    border-radius: 6px;
    font-size: var(--font-size-sm);
    cursor: pointer;
    transition: all 0.15s;
  }
  .btn-rango:hover { color: var(--text-primary); border-color: var(--accent-primary); }
  .btn-rango.activo {
    background: var(--accent-primary);
    color: #fff;
    border-color: var(--accent-primary);
  }
  .lienzo { position: relative; height: 340px; width: 100%; }
  .estado {
    display: grid;
    place-items: center;
    height: 340px;
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
  }
  .estado-error { color: var(--status-danger-text, var(--accent-danger)); gap: 0.75rem; }
  .grafico-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-top: 0.75rem;
    flex-wrap: wrap;
  }
  .nota { margin: 0; font-size: var(--font-size-sm); color: var(--text-secondary); font-style: italic; }
  .footer-btns { display: flex; gap: 0.5rem; }

    .aviso-stale {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    flex-wrap: wrap;
    padding: 0.6rem 0.9rem;
    margin-bottom: 0.75rem;
    border-radius: 8px;
    background: var(--status-warning-bg, rgba(245, 158, 11, 0.12));
    border: 1px solid var(--status-warning-border, var(--accent-warning));
    color: var(--status-warning-text, var(--accent-warning));
    font-size: var(--font-size-sm);
  }
  .btn-stale {
    padding: 0.3rem 0.7rem;
    border: 1px solid currentColor;
    background: transparent;
    color: inherit;
    border-radius: 6px;
    font-size: var(--font-size-sm);
    cursor: pointer;
  }

  @media (max-width: 640px) {
    .lienzo { height: 260px; }
    .grafico-header { flex-direction: column; align-items: stretch; }
  }

  .overlay-carga {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    background: rgba(255, 255, 255, 0.72); /* fallback claro */
    background: color-mix(in srgb, var(--bg-card) 72%, transparent);
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
    z-index: 2;
    border-radius: 8px;
    pointer-events: none; /* deja pasar el zoom/click al chart de fondo */
  }

  .nota-excel {
    margin: 0.5rem 0 0;
    font-size: var(--font-size-xs, 0.78rem);
    color: var(--text-secondary);
    opacity: 0.85;
  }
</style>