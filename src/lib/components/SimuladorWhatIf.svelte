<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import { enhance } from '$app/forms';
  import Chart from 'chart.js/auto';
  import { _ } from 'svelte-i18n';
  import {
    simularEscenario,
    parametrosPorDefecto,
    type ParametrosEscenario,
    type CoeficientesModelo
  } from '$lib/simulacion';

  interface EscenarioFila {
    id: number;
    nombre: string;
    producto_id: number;
    producto_nombre: string;
    creador_nombre: string;
    creado_en: string;
    parametros: string;
  }

  interface Props {
    coeficientes: CoeficientesModelo;
    escenarios: EscenarioFila[];
  }

  let { coeficientes, escenarios }: Props = $props();

  let params = $state<ParametrosEscenario>({ ...parametrosPorDefecto });
  let nombreEscenario = $state('');
  let canvas = $state<HTMLCanvasElement | null>(null);
  let chart: Chart | null = null;
  let temaVersion = $state(0);

  // Se recalcula en milisegundos con cada movimiento de slider
  const resultado = $derived(simularEscenario(coeficientes, params));
  const labels = $derived(resultado.curvaBase.map((_, i) => `D${i + 1}`));

  onMount(() => {
    const observer = new MutationObserver(() => { temaVersion += 1; });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  });

  onDestroy(() => {
    if (chart) chart.destroy();
  });

  $effect(() => {
    void temaVersion;
    const r = resultado;
    if (!canvas) return;

    const esDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const colorTexto = esDark ? '#f1f5f9' : '#111827';
    const colorGrid = esDark ? '#334155' : '#e5e7eb';

    if (!chart) {
      chart = new Chart(canvas, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: $_('simulacion.base'),
              data: r.curvaBase,
              borderColor: '#3b82f6',
              backgroundColor: 'rgba(59, 130, 246, 0.10)',
              fill: true,
              tension: 0.3,
              pointRadius: 0
            },
            {
              label: $_('simulacion.simulado'),
              data: r.curvaSimulada,
              borderColor: '#8b5cf6',
              backgroundColor: 'rgba(139, 92, 246, 0.15)',
              fill: true,
              tension: 0.3,
              pointRadius: 0,
              borderDash: [6, 4]
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          plugins: { legend: { labels: { color: colorTexto } } },
          scales: {
            x: { ticks: { color: colorTexto, maxTicksLimit: 10 }, grid: { color: colorGrid } },
            y: { beginAtZero: true, ticks: { color: colorTexto }, grid: { color: colorGrid } }
          }
        }
      });
    } else {
      chart.data.labels = labels;
      chart.data.datasets[0].data = r.curvaBase;
      chart.data.datasets[1].data = r.curvaSimulada;
      chart.update('none');
    }
  });

  async function cargarEscenario(esc: EscenarioFila) {
      // Guardar parámetros temporalmente antes de navegar
      sessionStorage.setItem('escenario_pendiente', JSON.stringify({
        productoId: esc.producto_id,
        parametros: JSON.parse(esc.parametros)
      }));
  
      if (esc.producto_id !== coeficientes.productoId) {
        await goto(`/simulacion?producto=${esc.producto_id}`);
        // La navegación destruye este componente; la aplicación
        // se retomará en el onMount del nuevo componente
      } else {
        params = { ...parametrosPorDefecto, ...JSON.parse(esc.parametros) };
        sessionStorage.removeItem('escenario_pendiente');
      }
    }
    
    // Y al inicio del script, después del onMount del tema:
    onMount(() => {
      // Recuperar escenario pendiente si venimos de una navegación
      const pendiente = sessionStorage.getItem('escenario_pendiente');
      if (pendiente) {
        const { productoId, parametros } = JSON.parse(pendiente);
        if (productoId === coeficientes.productoId) {
          params = { ...parametrosPorDefecto, ...parametros };
        }
        sessionStorage.removeItem('escenario_pendiente');
      }
    });

  function restaurar() {
    params = { ...parametrosPorDefecto };
  }

  function claseDelta(base: number | null, sim: number | null, mayorEsMejor: boolean): string {
    if (base === null || sim === null || sim === base) return 'neutral';
    const mejor = mayorEsMejor ? sim > base : sim < base;
    return mejor ? 'mejor' : 'peor';
  }

  function formatearFecha(fecha: string | null): string {
    if (!fecha) return $_('simulacion.sinReorden');
    const hoy = new Date();
    const fechaHoy = [
      hoy.getFullYear(),
      String(hoy.getMonth() + 1).padStart(2, '0'),
      String(hoy.getDate()).padStart(2, '0')
    ].join('-');
    if (fecha === fechaHoy) return $_('simulacion.reordenAhora');
    return new Date(`${fecha}T00:00:00`).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  }
</script>

<div class="simulador">
  <!-- Controles -->
  <section class="card">
    <div class="card-header-flex">
      <h2>{$_('simulacion.controles')}</h2>
      <button class="btn btn-secondary btn-small" onclick={restaurar}>↺</button>
    </div>

    <div class="controles-grid">
      <div class="control">
        <div class="control-header">
          <span class="label">{$_('simulacion.demanda')}</span>
          <span class="control-valor">{params.cambioDemanda > 0 ? '+' : ''}{params.cambioDemanda}%</span>
        </div>
        <input type="range" min="-50" max="100" step="5" bind:value={params.cambioDemanda} />
      </div>

      <div class="control">
        <div class="control-header">
          <span class="label">{$_('simulacion.precio')}</span>
          <span class="control-valor">{params.cambioPrecio > 0 ? '+' : ''}{params.cambioPrecio}%</span>
        </div>
        <input type="range" min="-50" max="50" step="5" bind:value={params.cambioPrecio} />
      </div>

      <div class="control">
        <div class="control-header">
          <span class="label">{$_('simulacion.alzaPromocion')}</span>
          <span class="control-valor">+{params.alzaPromocion}%</span>
        </div>
        <input type="range" min="0" max="100" step="5" bind:value={params.alzaPromocion} disabled={!params.promocionActiva} />
        <label class="switch-label">
          <input type="checkbox" bind:checked={params.promocionActiva} />
          <span>{$_('simulacion.promocion')}</span>
        </label>
      </div>

      <div class="control">
        <div class="control-header">
          <span class="label">{$_('simulacion.entrega')}</span>
          <span class="control-valor">{params.tiempoEntrega}</span>
        </div>
        <input type="range" min="1" max="60" step="1" bind:value={params.tiempoEntrega} />
      </div>
    </div>

    <p class="nota-elasticidad text-muted text-sm">
      {$_('simulacion.elasticidad')}
    </p>
  </section>

  <!-- Gráfico comparativo -->
  <section class="card">
    <h2>{$_('simulacion.grafico')}</h2>
    <div class="chart-area">
      <canvas bind:this={canvas}></canvas>
    </div>
  </section>

  <!-- Tarjetas comparativas -->
  <section class="comparativa-grid">
    <div class="card comparativa-card">
      <h3 class="text-secondary text-sm">{$_('simulacion.consumo')}</h3>
      <div class="comparativa-valores">
        <span class="valor-base">{coeficientes.consumoBase.toFixed(1)}</span>
        <span class="flecha">→</span>
        <span class="valor-sim neutral">{resultado.consumoSimulado.toFixed(1)}</span>
      </div>
      <p class="text-muted text-sm">{$_('simulacion.unidades')}</p>
    </div>

    <div class="card comparativa-card">
      <h3 class="text-secondary text-sm">{$_('simulacion.diasAgotarse')}</h3>
      <div class="comparativa-valores">
        <span class="valor-base">{resultado.diasAgotarseBase ?? '∞'}</span>
        <span class="flecha">→</span>
        <span class="valor-sim {claseDelta(resultado.diasAgotarseBase, resultado.diasAgotarseSimulado, true)}">
          {resultado.diasAgotarseSimulado ?? '∞'}
        </span>
      </div>
      <p class="text-muted text-sm">{$_('comunes.dias')}</p>
    </div>

    <div class="card comparativa-card">
      <h3 class="text-secondary text-sm">{$_('simulacion.fechaReorden')}</h3>
      <div class="comparativa-valores columna">
        <span class="valor-base">{formatearFecha(resultado.fechaReordenBase)}</span>
        <span class="valor-sim {claseDelta(
          resultado.fechaReordenBase ? new Date(resultado.fechaReordenBase).getTime() : null,
          resultado.fechaReordenSimulado ? new Date(resultado.fechaReordenSimulado).getTime() : null,
          true
        )}">
          {formatearFecha(resultado.fechaReordenSimulado)}
        </span>
      </div>
    </div>

    <div class="card comparativa-card">
      <h3 class="text-secondary text-sm">{$_('simulacion.compraRecomendada')}</h3>
      <div class="comparativa-valores">
        <span class="valor-sim neutral grande">{resultado.compraRecomendada}</span>
      </div>
      <p class="text-muted text-sm">{$_('comunes.unidades')}</p>
    </div>
  </section>

  <!-- Guardar escenario -->
  <section class="card">
    <h2>{$_('simulacion.guardar')}</h2>
    <form method="POST" action="?/guardarEscenario" use:enhance class="guardar-form">
      <input type="hidden" name="producto_id" value={coeficientes.productoId} />
      <input type="hidden" name="parametros" value={JSON.stringify(params)} />
      <input type="hidden" name="resultados" value={JSON.stringify(resultado)} />
      <input
        type="text"
        name="nombre"
        bind:value={nombreEscenario}
        required
        maxlength="60"
        placeholder={$_('simulacion.nombrePlaceholder')}
        class="input-field"
      />
      <button type="submit" class="btn btn-primary">💾 {$_('simulacion.guardar')}</button>
    </form>
  </section>

  <!-- Escenarios guardados -->
  <section class="card">
    <h2>{$_('simulacion.escenariosGuardados')}</h2>
    {#if escenarios.length === 0}
      <p class="text-secondary">{$_('simulacion.sinEscenarios')}</p>
    {:else}
      <table class="data-table">
        <thead>
          <tr>
            <th>{$_('simulacion.nombreEscenario')}</th>
            <th>{$_('dashboard.producto')}</th>
            <th>{$_('movimientos.fecha')}</th>
            <th>{$_('productos.acciones')}</th>
          </tr>
        </thead>
        <tbody>
          {#each escenarios as esc}
            <tr>
              <td class="font-semibold">{esc.nombre}</td>
              <td>{esc.producto_nombre}</td>
              <td class="text-secondary text-sm">
                {new Date(esc.creado_en).toLocaleDateString('es-ES')} · {esc.creador_nombre}
              </td>
              <td class="acciones-celda">
                <button class="btn btn-secondary btn-small" onclick={() => cargarEscenario(esc)}>
                  {$_('simulacion.cargar')}
                </button>
                <form
                  method="POST"
                  action="?/eliminarEscenario"
                  onsubmit={(e) => { if (!window.confirm($_('simulacion.confirmarEliminar'))) e.preventDefault(); }}
                >
                  <input type="hidden" name="id" value={esc.id} />
                  <button type="submit" class="btn btn-danger btn-small">{$_('simulacion.eliminar')}</button>
                </form>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </section>
</div>

<style>
  .simulador {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .card-header-flex {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .controles-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 1.5rem;
  }

  .control {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .control-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .control-valor {
    font-weight: var(--font-weight-bold);
    color: var(--accent-primary);
    font-size: var(--font-size-sm);
  }

  .control input[type='range'] {
    width: 100%;
    accent-color: var(--accent-primary);
    cursor: pointer;
  }

  .control input[type='range']:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .switch-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--text-primary);
    font-size: var(--font-size-sm);
    cursor: pointer;
  }

  .switch-label input {
    accent-color: var(--accent-purple);
    width: 16px;
    height: 16px;
    cursor: pointer;
  }

  .nota-elasticidad {
    margin-top: 1.25rem;
    margin-bottom: 0;
  }

  .chart-area {
    position: relative;
    height: 320px;
    width: 100%;
  }

  .comparativa-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 1rem;
  }

  .comparativa-card {
    text-align: center;
  }

  .comparativa-valores {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    margin: 0.5rem 0;
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-bold);
  }

  .comparativa-valores.columna {
    flex-direction: column;
    gap: 0.25rem;
    font-size: var(--font-size-lg);
  }

  .valor-base {
    color: var(--text-secondary);
  }

  .flecha {
    color: var(--text-muted);
  }

  .valor-sim.neutral { color: var(--accent-purple); }
  .valor-sim.mejor { color: var(--accent-success); }
  .valor-sim.peor { color: var(--accent-danger); }
  .valor-sim.grande { font-size: var(--font-size-2xl); }

  .guardar-form {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .guardar-form .input-field {
    flex: 1;
    min-width: 200px;
  }

  .acciones-celda {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }
</style>