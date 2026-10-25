<script lang="ts">
  import type { PageData } from './$types';
  import { _, locale } from 'svelte-i18n';

  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>{$_('productos.lotesTitulo')}: {data.producto.nombre} | StockPredict Pro</title>
</svelte:head>

<main class="page-container">
  <header class="page-header">
    <a href="/productos/{data.producto?.id}" class="btn-back">← {$_('productos.volver')}</a>
    <h1>{$_('productos.lotesTitulo')}: {data.producto.nombre}</h1>
    <p class="text-secondary">{$_('productos.lotesDescripcion')}</p>
  </header>

  <section class="card">
    {#if data.lotes.length === 0}
      <p class="empty-state">{$_('productos.sinLotes')}</p>
    {:else}
      <div class="table-scroll">
        <table class="lots-table">
          <thead>
            <tr>
              <th>{$_('productos.numeroLote')}</th>
              <th>{$_('productos.fechaCaducidad')}</th>
              <th>{$_('productos.stockInicialLote')}</th>
              <th>{$_('productos.stockActualLote')}</th>
              <th>{$_('productos.estadoLote')}</th>
            </tr>
          </thead>
          <tbody>
            {#each data.lotes as lote}
              {@const loteApertura = lote.numero_lote.startsWith('APERTURA-')}
              {@const vencido = lote.dias_restantes !== null && lote.dias_restantes < 0}
              {@const critico = lote.dias_restantes !== null && lote.dias_restantes <= 7}
              {@const proximo = lote.dias_restantes !== null && lote.dias_restantes <= 30}
              <tr
                class:lot-row-expired={lote.cantidad_actual > 0 && vencido}
                class:lot-row-critical={lote.cantidad_actual > 0 && !vencido && critico}
                class:lot-row-warning={lote.cantidad_actual > 0 && !critico && proximo}
              >
                <td>{loteApertura ? $_('productos.loteApertura') : lote.numero_lote}</td>
                <td>
                  {#if loteApertura}
                    {$_('productos.caducidadDesconocida')}
                  {:else}
                    {new Date(`${lote.fecha_caducidad}T00:00:00`).toLocaleDateString($locale === 'en' ? 'en-US' : 'es-ES')}
                  {/if}
                </td>
                <td>{lote.cantidad_inicial}</td>
                <td>{lote.cantidad_actual}</td>
                <td>
                  {#if lote.cantidad_actual === 0}
                    <span class="badge badge-neutral">{$_('productos.loteAgotado')}</span>
                  {:else if loteApertura}
                    <span class="badge badge-neutral">{$_('productos.caducidadDesconocida')}</span>
                  {:else if vencido}
                    <span class="badge badge-danger">{$_('productos.loteVencido')}</span>
                  {:else if critico}
                    <span class="badge badge-danger">
                      {$_('productos.loteVenceEn', { values: { dias: lote.dias_restantes } })}
                    </span>
                  {:else if proximo}
                    <span class="badge badge-warning">
                      {$_('productos.loteVenceEn', { values: { dias: lote.dias_restantes } })}
                    </span>
                  {:else}
                    <span class="badge badge-success">{$_('productos.loteVigente')}</span>
                  {/if}
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
  .page-header {
    margin-bottom: 1.5rem;
  }

  .btn-back {
    display: inline-flex;
    margin-bottom: 1rem;
  }

  .card {
    padding: 1.5rem;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    background: var(--bg-card);
  }

  .table-scroll {
    width: 100%;
    overflow-x: auto;
  }

  .lots-table {
    width: 100%;
    min-width: 650px;
    border-collapse: collapse;
  }

  .lots-table th,
  .lots-table td {
    padding: 0.85rem 1rem;
    border-bottom: 1px solid var(--border-color);
    color: var(--text-primary);
    text-align: left;
  }

  .lots-table th {
    background: var(--bg-secondary);
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
  }

  .lot-row-expired,
  .lot-row-expired td,
  .lot-row-critical,
  .lot-row-critical td {
    background: var(--status-danger-bg);
    color: var(--status-danger-text);
  }

  .lot-row-warning,
  .lot-row-warning td {
    background: var(--status-warning-bg);
    color: var(--status-warning-text);
  }

  .badge {
    display: inline-block;
    padding: 0.25rem 0.55rem;
    border-radius: 999px;
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    white-space: nowrap;
  }

  .badge-danger {
    background: var(--status-danger-bg);
    color: var(--status-danger-text);
  }

  .badge-warning {
    background: var(--status-warning-bg);
    color: var(--status-warning-text);
  }

  .badge-success {
    background: var(--status-success-bg);
    color: var(--status-success-text);
  }

  .badge-neutral {
    background: var(--bg-secondary);
    color: var(--text-secondary);
  }

  .empty-state {
    margin: 0;
    padding: 2rem;
    color: var(--text-secondary);
    text-align: center;
  }
</style>
