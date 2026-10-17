<script lang="ts">
  import type { PageData } from './$types';
  import { enhance } from '$app/forms';
  import { _ } from 'svelte-i18n';
  import ToastFeedback from '$lib/components/ToastFeedback.svelte';

  let { data, form }: { data: PageData; form?: { success?: string; error?: string; cerradas?: number } } = $props();
  const mensajeFeedback = $derived.by(() => {
    if (form?.error) return `⚠️ ${$_(form.error)}`;
    if (form?.success === 'sesion_cerrada') return `✅ ${$_('sesiones.cerradaExito')}`;
    if (form?.success === 'sesiones_masivo') {
      return `🔒 ${$_('sesiones.masivoExito', { values: { n: form.cerradas ?? 0 } })}`;
    }
    return null;
  });

  const otrasSesiones = $derived(data.sesiones.filter(s => !s.es_actual).length);

  function formatoFecha(fecha: string): string {
    return new Date(`${fecha.replace(' ', 'T')}Z`).toLocaleString('es-ES', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
</script>

<svelte:head>
  <title>{$_('sesiones.titulo')} | StockPredict Pro</title>
</svelte:head>

<ToastFeedback feedback={form} message={mensajeFeedback} isError={Boolean(form?.error)} />

<main class="page-container page-container--narrow">
  <header class="page-header">
    <a href="/perfil" class="btn-back">
      <span>←</span>
      <span>{$_('sesiones.volver')}</span>
    </a>
    <h1>🔐 {$_('sesiones.titulo')}</h1>
    <p class="text-secondary">{$_('sesiones.subtitulo')}</p>
  </header>

  <div class="acciones-superiores">
    <form method="POST" action="?/cerrarOtras" use:enhance>
      <button
        type="submit"
        class="btn btn-warning"
        disabled={otrasSesiones === 0}
        onclick={(e) => { if (!window.confirm($_('sesiones.confirmarCerrarOtras'))) e.preventDefault(); }}
      >
        🔒 {$_('sesiones.cerrarOtras')}
      </button>
    </form>
  </div>

  {#if data.sesiones.length === 0}
    <div class="card">
      <p class="text-secondary">{$_('sesiones.sinSesiones')}</p>
    </div>
  {:else}
    <div class="sesiones-grid">
      {#each data.sesiones as sesion (sesion.id)}
        <article class="card sesion-card" class:sesion-actual={sesion.es_actual}>
          <div class="sesion-header">
            <span class="sesion-icono" aria-hidden="true">{sesion.dispositivo.icono}</span>
            <div class="sesion-titulo">
              <h3>{sesion.dispositivo.sistema} · {sesion.dispositivo.navegador}</h3>
              {#if sesion.es_actual}
                <span class="badge badge-actual">{$_('sesiones.actual')}</span>
              {/if}
            </div>
          </div>

          <dl class="sesion-datos">
            <div class="dato">
              <dt>{$_('sesiones.ip')}</dt>
              <dd>{sesion.ip ?? '—'}</dd>
            </div>
            <div class="dato">
              <dt>{$_('sesiones.creada')}</dt>
              <dd>{formatoFecha(sesion.creada_en)}</dd>
            </div>
            <div class="dato">
              <dt>{$_('sesiones.ultimaActividad')}</dt>
              <dd>{formatoFecha(sesion.ultima_actividad)}</dd>
            </div>
          </dl>

          <form method="POST" action="?/cerrarSesion" use:enhance class="sesion-acciones">
            <input type="hidden" name="sesion_id" value={sesion.id} />
            <button
              type="submit"
              class="btn btn-small"
              class:btn-danger={sesion.es_actual}
              class:btn-secondary={!sesion.es_actual}
              onclick={(e) => {
                const mensaje = sesion.es_actual
                  ? $_('sesiones.confirmarCerrarActual')
                  : $_('sesiones.confirmarCerrar');
                if (!window.confirm(mensaje)) e.preventDefault();
              }}
            >
              {$_('sesiones.cerrar')}
            </button>
          </form>
        </article>
      {/each}
    </div>
  {/if}
</main>

<style>
  .acciones-superiores {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 1.5rem;
  }

  .sesiones-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr));
    gap: 1.25rem;
  }

  .sesion-card {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .sesion-actual {
    border-color: var(--accent-success);
    box-shadow: 0 0 0 1px var(--accent-success);
  }

  .sesion-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .sesion-icono {
    display: grid;
    width: 2.75rem;
    height: 2.75rem;
    flex: 0 0 auto;
    place-items: center;
    border-radius: 0.75rem;
    background: var(--bg-secondary);
    font-size: 1.4rem;
  }

  .sesion-titulo h3 {
    margin: 0 0 0.25rem;
    font-size: var(--font-size-base);
  }

  .badge-actual {
    background: var(--status-success-bg);
    color: var(--status-success-text);
  }

  .sesion-datos {
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .dato {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    font-size: var(--font-size-sm);
  }

  .dato dt {
    color: var(--text-secondary);
  }

  .dato dd {
    margin: 0;
    color: var(--text-primary);
    font-weight: var(--font-weight-medium);
  }

  .sesion-acciones {
    margin-top: auto;
  }
</style>