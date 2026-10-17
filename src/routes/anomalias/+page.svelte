<script lang="ts">
  import type { PageData } from './$types';
  import { enhance } from '$app/forms';
  import { _ } from 'svelte-i18n';
  import type { Anomalia } from '$lib/server/services/anomalias.service';
  import ToastFeedback from '$lib/components/ToastFeedback.svelte';

  type AnomaliaFila = Anomalia & { producto_nombre: string; revisor_nombre: string | null };
  interface DiaDetalle { fecha: string; real: number; predicho: number; desvPct: number; z: number; }

  let { data, form }: { data: PageData; form?: { success?: string; error?: string } } = $props();
  const mensajeFeedback = $derived.by(() => {
    if (form?.error) return `⚠️ ${$_(form.error)}`;
    if (form?.success === 'anomalia_clasificada') return `✅ ${$_('anomalias.clasificadaExito')}`;
    return null;
  });

  const filtros = [
    { valor: 'pendiente', clave: 'anomalias.filtroPendientes' },
    { valor: 'revisada', clave: 'anomalias.filtroRevisadas' },
    { valor: 'falso_positivo', clave: 'anomalias.filtroFalsos' },
    { valor: 'todas', clave: 'anomalias.filtroTodas' }
  ];

  function fraseVeces(a: AnomaliaFila): string {
    if (a.tipo === 'pico') {
      const factor = 1 + a.desviacion_promedio / 100;
      return $_('anomalias.vecesMas', { values: { n: factor.toFixed(1) } });
    }
    const factor = Math.max(0.01, 1 - a.desviacion_promedio / 100);
    const reciproco = 1 / factor;
    return $_('anomalias.vecesMenos', { values: { n: reciproco.toFixed(1) } });
  }

  function explicacion(a: AnomaliaFila): string {
    const dias = Math.round((new Date(a.fecha_fin).getTime() - new Date(a.fecha_inicio).getTime()) / 86400000) + 1;
    const veces = fraseVeces(a);
    return a.tipo === 'pico'
      ? $_('anomalias.expPico', { values: { producto: a.producto_nombre, veces, dias } })
      : $_('anomalias.expCaida', { values: { producto: a.producto_nombre, veces, dias } });
  }

  function detalleDe(a: AnomaliaFila): DiaDetalle[] {
    try {
      return JSON.parse(a.detalle) as DiaDetalle[];
    } catch {
      return [];
    }
  }

  function formatoFecha(fecha: string): string {
    return new Date(`${fecha}T00:00:00`).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  }
</script>

<svelte:head>
  <title>{$_('anomalias.titulo')} | StockPredict Pro</title>
</svelte:head>

<ToastFeedback feedback={form} message={mensajeFeedback} isError={Boolean(form?.error)} />

<main class="page-container">
  <header class="page-header">
    <a href="/dashboard" class="btn-back">
      <span>←</span>
      <span>{$_('anomalias.volver')}</span>
    </a>
    <h1>🚨 {$_('anomalias.titulo')}</h1>
    <p class="text-secondary">{$_('anomalias.subtitulo')}</p>
  </header>

  <div class="filtros">
    {#each filtros as filtro}
      <a
        href="/anomalias?estado={filtro.valor}"
        class="btn btn-small"
        class:btn-primary={data.filtro === filtro.valor}
        class:btn-secondary={data.filtro !== filtro.valor}
      >
        {$_(filtro.clave)}
      </a>
    {/each}
  </div>

  {#if data.anomalias.length === 0}
    <div class="card">
      <p class="text-secondary">{$_('anomalias.sinAnomalias')}</p>
    </div>
  {:else}
    <div class="anomalias-lista">
      {#each data.anomalias as a (a.id)}
        <article class="anomalia-card" class:tipo-pico={a.tipo === 'pico'} class:tipo-caida={a.tipo === 'caida'}>
          <header class="anomalia-header">
            <div class="anomalia-titulo">
              <span class="badge" class:badge-pico={a.tipo === 'pico'} class:badge-caida={a.tipo === 'caida'}>
                {a.tipo === 'pico' ? $_('anomalias.tipoPico') : $_('anomalias.tipoCaida')}
              </span>
              <h3>{a.producto_nombre}</h3>
            </div>
            <span class="text-muted text-sm">
              {$_('anomalias.periodo')}: {formatoFecha(a.fecha_inicio)} → {formatoFecha(a.fecha_fin)}
            </span>
          </header>

          <p class="anomalia-explicacion">{explicacion(a)}</p>

          <div class="anomalia-metricas">
            <span class="text-sm text-secondary">
              {$_('anomalias.desviacion')}: <strong class="text-primary">{Math.round(a.desviacion_promedio)}% ({fraseVeces(a)})</strong>
            </span>
            <span class="text-sm text-secondary">
              {$_('anomalias.zMax')}: <strong class="text-primary">{a.z_score_max.toFixed(1)}</strong>
            </span>
          </div>

          <details class="anomalia-detalle">
            <summary>{$_('anomalias.detalle')}</summary>
            <table class="data-table">
              <thead>
                <tr>
                  <th>{$_('anomalias.fecha')}</th>
                  <th>{$_('anomalias.real')}</th>
                  <th>{$_('anomalias.predicho')}</th>
                  <th>{$_('anomalias.desv')}</th>
                  <th>{$_('anomalias.z')}</th>
                </tr>
              </thead>
              <tbody>
                {#each detalleDe(a) as dia}
                  <tr>
                    <td>{formatoFecha(dia.fecha)}</td>
                    <td>{dia.real}</td>
                    <td>{dia.predicho}</td>
                    <td>{dia.desvPct}%</td>
                    <td>{dia.z}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </details>

          {#if a.estado === 'pendiente'}
            <form method="POST" action="?/clasificar" use:enhance class="anomalia-acciones">
              <input type="hidden" name="id" value={a.id} />
              <button type="submit" name="estado" value="revisada" class="btn btn-success btn-small">
                ✓ {$_('anomalias.marcarRevisada')}
              </button>
              <button type="submit" name="estado" value="falso_positivo" class="btn btn-secondary btn-small">
                ✗ {$_('anomalias.marcarFalso')}
              </button>
            </form>
          {:else}
            <p class="text-muted text-sm" style:marginBottom="0">
              {$_('anomalias.revisadaPor')}: {a.revisor_nombre ?? '—'}
            </p>
          {/if}
        </article>
      {/each}
    </div>
  {/if}
</main>

<style>
  .filtros {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    margin-bottom: 1.5rem;
  }

  .anomalias-lista {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .anomalia-card {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-left: 5px solid var(--border-color);
    border-radius: 8px;
    padding: 1.5rem;
  }

  .anomalia-card.tipo-pico { border-left-color: var(--accent-warning); }
  .anomalia-card.tipo-caida { border-left-color: var(--accent-danger); }

  .anomalia-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    flex-wrap: wrap;
    margin-bottom: 0.75rem;
  }

  .anomalia-titulo {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .anomalia-titulo h3 {
    margin: 0;
    font-size: var(--font-size-lg);
  }

  .badge-pico {
    background: #fef3c7;
    color: #92400e;
  }

  .badge-caida {
    background: #fee2e2;
    color: #991b1b;
  }

  :global([data-theme="dark"]) .badge-pico {
    background: #78350f;
    color: #fde68a;
  }

  :global([data-theme="dark"]) .badge-caida {
    background: #7f1d1d;
    color: #fecaca;
  }

  .anomalia-explicacion {
    color: var(--text-primary);
    margin-bottom: 0.75rem;
  }

  .anomalia-metricas {
    display: flex;
    gap: 1.5rem;
    margin-bottom: 0.75rem;
  }

  .anomalia-detalle summary {
    cursor: pointer;
    color: var(--accent-primary);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    margin-bottom: 0.5rem;
  }

  .anomalia-acciones {
    display: flex;
    gap: 0.5rem;
    margin-top: 1rem;
  }
</style>