<script lang="ts">
  import { _ } from 'svelte-i18n';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>{$_('transferencias.titulo')} | StockPredict Pro</title>
</svelte:head>

<main class="page-container">
  <header class="page-header">
    <a href="/dashboard" class="btn-back">
      <span>←</span>
      <span>{$_('transferencias.volver')}</span>
    </a>
    <div class="header-actions">
      <h1>{$_('transferencias.titulo')}</h1>
      <a href="/transferencias/nueva" class="btn btn-primary">
        {$_('transferencias.nueva.nuevaTransferencia')}
      </a>
    </div>
    <p class="text-secondary">{$_('transferencias.descripcion')}</p>
  </header>

  <section class="card">
    {#if data.transferencias.length === 0}
      <p class="text-secondary">{$_('transferencias.sinActivas')}</p>
    {:else}
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>{$_('transferencias.origen')}</th>
              <th>{$_('transferencias.destino')}</th>
              <th>{$_('transferencias.estado')}</th>
              <th>{$_('transferencias.fecha')}</th>
              <th>{$_('transferencias.acciones')}</th>
            </tr>
          </thead>
          <tbody>
            {#each data.transferencias as t}
              <tr>
                <td><strong>#{t.id}</strong></td>
                <td>{t.origen_nombre}</td>
                <td>{t.destino_nombre}</td>
                <td>
                  <span class="badge" class:badge-warning={t.estado === 'pendiente' || t.estado === 'en_transito'}>
                    {t.estado === 'pendiente' ? $_('transferencias.estadoPendiente') : $_('transferencias.estadoTransito')}
                  </span>
                </td>
                <td>{new Date(t.creada_en).toLocaleDateString()}</td>
                <td>
                  <a href="/transferencias/{t.id}" class="btn btn-sm btn-secondary">
                    {$_('transferencias.verDetalle')}
                  </a>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </section>
</main>

<style>
  .page-header { margin-bottom: 2rem; }
  .header-actions { display: flex; justify-content: space-between; align-items: center; width: 100%; }
  .header-actions h1 { margin: 0; font-size: var(--font-size-2xl); }
  .table-container { overflow-x: auto; }
  .data-table { width: 100%; border-collapse: collapse; }
  .data-table th, .data-table td { padding: 0.75rem 1rem; text-align: left; border-bottom: 1px solid var(--border-color); }
  .data-table th { font-weight: var(--font-weight-semibold); color: var(--text-secondary); font-size: var(--font-size-sm); }
  .badge { padding: 0.25rem 0.5rem; border-radius: 4px; font-size: var(--font-size-xs); font-weight: var(--font-weight-medium); }
  .badge-warning { background: var(--status-warning-bg); color: var(--status-warning-text); }
</style>