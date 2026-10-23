<script lang="ts">
  import { _ } from 'svelte-i18n';
  import type { ResultadoImportacion } from '$lib/types';

  let {
    resultado,
    etiquetaExitosas,
    etiquetaActualizadas
  }: {
    resultado: ResultadoImportacion;
    etiquetaExitosas: string;
    etiquetaActualizadas: string;
  } = $props();
</script>

<div class="resultado-grid">
  <div class="resultado-item resultado-exitosas">
    <span class="resultado-numero">{resultado.exitosas}</span>
    <span class="resultado-label">{etiquetaExitosas}</span>
  </div>
  <div class="resultado-item resultado-actualizadas">
    <span class="resultado-numero">{resultado.actualizadas}</span>
    <span class="resultado-label">{etiquetaActualizadas}</span>
  </div>
  <div class="resultado-item resultado-errores">
    <span class="resultado-numero">{resultado.errores.length}</span>
    <span class="resultado-label">{$_('importacion.errores')}</span>
  </div>
</div>

{#if resultado.errores.length > 0}
  <div class="errores-detalle">
    <h3>{$_('importacion.detallesErrores')}:</h3>
    <ul>
      {#each resultado.errores as error}
        <li>
          <strong>{$_('importacion.fila')} {error.fila}</strong>
          {#if error.nombre}
            ({error.nombre})
          {/if}:
          {error.motivo}
        </li>
      {/each}
    </ul>
  </div>
{/if}

<style>
  .resultado-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
    margin: 1.5rem 0;
  }

  .resultado-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 1.5rem;
    border-radius: 8px;
    text-align: center;
  }

  .resultado-exitosas {
    background: var(--status-success-bg);
    border: 1px solid var(--status-success-border);
  }

  .resultado-actualizadas {
    background: var(--status-info-bg);
    border: 1px solid var(--status-info-border);
  }

  .resultado-errores {
    background: var(--status-danger-bg);
    border: 1px solid var(--status-danger-border);
  }

  .resultado-numero {
    font-size: 2.5rem;
    font-weight: var(--font-weight-bold);
    margin-bottom: 0.5rem;
  }

  .resultado-exitosas .resultado-numero {
    color: var(--status-success-text);
  }

  .resultado-actualizadas .resultado-numero {
    color: var(--status-info-text);
  }

  .resultado-errores .resultado-numero {
    color: var(--status-danger-text);
  }

  .resultado-label {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
  }

  .errores-detalle {
    margin-top: 1.5rem;
    padding: 1rem;
    background: var(--status-danger-bg);
    border: 1px solid var(--status-danger-border);
    border-radius: 8px;
  }

  .errores-detalle h3 {
    margin: 0 0 0.75rem;
    color: var(--status-danger-text);
  }

  .errores-detalle ul {
    margin: 0;
    padding-left: 1.5rem;
  }

  .errores-detalle li {
    margin-bottom: 0.5rem;
    color: var(--text-primary);
  }
</style>