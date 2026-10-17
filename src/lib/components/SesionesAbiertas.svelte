<script lang="ts">
  import { enhance } from '$app/forms';
  import { _, locale } from 'svelte-i18n';

  interface Sesion {
    id: number;
    es_actual: boolean;
    ip: string | null;
    creada_en: string;
    ultima_actividad: string;
    dispositivo: { sistema: string; navegador: string; icono: string };
  }

  interface Props {
    sesiones: Sesion[];
    onSuccess: () => void;
  }

  let { sesiones, onSuccess }: Props = $props();
  const otrasSesiones = $derived(sesiones.filter(sesion => !sesion.es_actual).length);

  function formatoFecha(fecha: string): string {
    return new Date(`${fecha.replace(' ', 'T')}Z`).toLocaleString(
      $locale === 'en' ? 'en-US' : 'es-ES',
      { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }
    );
  }
</script>

<div class="sesiones-contenido">
  {#if otrasSesiones > 0}
    <form
      method="POST"
      action="?/cerrarOtrasSesiones"
      use:enhance={() => async ({ result, update }) => {
        if (result.type === 'success') onSuccess();
        await update();
      }}
    >
      <button
        type="submit"
        class="btn btn-warning"
        onclick={(event) => {
          if (!window.confirm($_('sesiones.confirmarCerrarOtras'))) event.preventDefault();
        }}
      >
        🔒 {$_('sesiones.cerrarOtras')}
      </button>
    </form>
  {/if}

  {#if sesiones.length === 0}
    <p class="text-secondary">{$_('sesiones.sinSesiones')}</p>
  {:else}
    <div class="sesiones-lista">
      {#each sesiones as sesion (sesion.id)}
        <article class="sesion-item">
          <div class="sesion-cabecera">
            <span class="sesion-icono" aria-hidden="true">{sesion.dispositivo.icono}</span>
            <div>
              <h3>{sesion.dispositivo.sistema} · {sesion.dispositivo.navegador}</h3>
              {#if sesion.es_actual}
                <span class="badge badge-actual">{$_('sesiones.actual')}</span>
              {/if}
            </div>
          </div>
          <dl>
            <div><dt>{$_('sesiones.ip')}</dt><dd>{sesion.ip ?? '—'}</dd></div>
            <div><dt>{$_('sesiones.creada')}</dt><dd>{formatoFecha(sesion.creada_en)}</dd></div>
            <div><dt>{$_('sesiones.ultimaActividad')}</dt><dd>{formatoFecha(sesion.ultima_actividad)}</dd></div>
          </dl>
          <form method="POST" action="?/cerrarSesionAbierta" use:enhance={() => async ({ result, update }) => {
            if (result.type === 'success') onSuccess();
            await update();
          }}>
            <input type="hidden" name="sesion_id" value={sesion.id} />
            <button
              type="submit"
              class="btn btn-small"
              class:btn-danger={sesion.es_actual}
              class:btn-secondary={!sesion.es_actual}
              onclick={(event) => {
                const key = sesion.es_actual ? 'sesiones.confirmarCerrarActual' : 'sesiones.confirmarCerrar';
                if (!window.confirm($_(key))) event.preventDefault();
              }}
            >
              {$_('sesiones.cerrar')}
            </button>
          </form>
        </article>
      {/each}
    </div>
  {/if}
</div>

<style>
  .sesiones-contenido,
  .sesiones-lista {
    display: grid;
    gap: 1rem;
  }

  .sesiones-lista {
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
  }

  .sesion-item {
    display: grid;
    align-content: start;
    gap: 0.9rem;
    padding: 1rem;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    background: var(--bg-secondary);
  }

  .sesion-cabecera {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .sesion-icono {
    font-size: 1.5rem;
  }

  .sesion-cabecera h3 {
    margin: 0 0 0.35rem;
    font-size: var(--font-size-sm);
  }

  .badge-actual {
    background: var(--status-success-bg);
    color: var(--status-success-text);
  }

  dl {
    display: grid;
    gap: 0.45rem;
    margin: 0;
  }

  dl div {
    display: flex;
    justify-content: space-between;
    gap: 0.75rem;
    font-size: var(--font-size-xs);
  }

  dt { color: var(--text-secondary); }
  dd { margin: 0; text-align: right; overflow-wrap: anywhere; }
</style>
