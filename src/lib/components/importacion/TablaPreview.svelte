<script lang="ts">
  import { _ } from 'svelte-i18n';
  import type { ColumnaPreview } from '$lib/types';

  let {
    filas,
    columnas,
    validador,
    onEditar
  }: {
    filas: Array<Record<string, string>>;
    columnas: ColumnaPreview[];
    validador: (fila: Record<string, string>) => string[];
    onEditar: (indice: number, campo: string, valor: string) => void;
  } = $props();

  const FILAS_POR_PAGINA = 50;
  let pagina = $state(0);

  // Si cambia el archivo y la página actual queda fuera de rango, volver a 0
  $effect(() => {
    if (pagina >= totalPaginas && pagina > 0) {
      pagina = 0;
    }
  });

  const filasPaginadas = $derived(
    filas.slice(pagina * FILAS_POR_PAGINA, (pagina + 1) * FILAS_POR_PAGINA)
  );
  const totalPaginas = $derived(Math.ceil(filas.length / FILAS_POR_PAGINA));
</script>

<div class="tabla-preview-container">
  <table class="data-table">
    <thead>
      <tr>
        <th>#</th>
        {#each columnas as col}
          <th>{col.etiqueta}</th>
        {/each}
        <th>{$_('importacion.estado')}</th>
      </tr>
    </thead>
    <tbody>
      {#each filasPaginadas as fila, i}
        {@const indiceReal = pagina * FILAS_POR_PAGINA + i}
        {@const erroresFila = validador(fila)}
        <tr class:fila-error={erroresFila.length > 0}>
          <td>{indiceReal + 1}</td>
          {#each columnas as col}
            <td>
              <input
                type={col.tipo === 'numero' ? 'number' : 'text'}
                step={col.paso}
                value={fila[col.clave] ?? ''}
                placeholder={col.placeholder ?? ''}
                onchange={(e) => onEditar(indiceReal, col.clave, e.currentTarget.value)}
                class="input-sm"
              />
            </td>
          {/each}
          <td>
            {#if erroresFila.length > 0}
              <span class="badge badge-danger" title={erroresFila.join(', ')}>
                ❌ {erroresFila.length} error{erroresFila.length > 1 ? 'es' : ''}
              </span>
            {:else}
              <span class="badge badge-success">✅ OK</span>
            {/if}
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

{#if totalPaginas > 1}
  <div class="paginacion-preview">
    <button
      onclick={() => pagina = Math.max(0, pagina - 1)}
      disabled={pagina === 0}
      class="btn btn-sm btn-secondary"
    >
      ← {$_('importacion.anterior')}
    </button>
    <span class="text-secondary">
      {$_('importacion.pagina')} {pagina + 1} {$_('importacion.de')} {totalPaginas}
    </span>
    <button
      onclick={() => pagina = Math.min(totalPaginas - 1, pagina + 1)}
      disabled={pagina >= totalPaginas - 1}
      class="btn btn-sm btn-secondary"
    >
      {$_('importacion.siguiente')} →
    </button>
  </div>
{/if}

<style>
  .tabla-preview-container {
    overflow-x: auto;
    margin: 1rem 0;
  }

  .input-sm {
    width: 100%;
    padding: 0.4rem 0.5rem;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    background: var(--bg-card);
    color: var(--text-primary);
    font-size: var(--font-size-sm);
  }

  .fila-error {
    background: var(--status-danger-bg);
  }

  .fila-error .input-sm {
    border-color: var(--accent-danger);
  }

  .paginacion-preview {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 1rem;
    margin: 1rem 0;
  }
</style>