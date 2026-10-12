<script lang="ts">
  import { _, locale } from 'svelte-i18n';

  type ProductoListado = {
    id: number;
    nombre: string;
    precio: number;
    stock_actual: number;
    stock_minimo: number;
    lotes_activos: number;
    numero_lote: string | null;
    fecha_caducidad: string | null;
  };

  interface Props {
    productos: ProductoListado[];
  }

  let { productos }: Props = $props();

  function confirmarEliminacion(event: Event) {
    if (!window.confirm($_('productos.confirmarEliminar'))) {
      event.preventDefault();
    }
  }
</script>

{#if productos.length === 0}
  <p class="empty-state">{$_('productos.sinProductos')}</p>
{:else}
  <div class="table-scroll">
    <table class="products-table">
      <thead>
        <tr>
          <th>{$_('productos.id')}</th>
          <th>{$_('productos.nombre')}</th>
          <th>{$_('productos.precio')}</th>
          <th>{$_('productos.stockActual')} / {$_('productos.stockMinimo')}</th>
          <th>{$_('productos.numeroLote')}</th>
          <th>{$_('productos.fechaCaducidad')}</th>
          <th>{$_('productos.acciones')}</th>
        </tr>
      </thead>
      <tbody>
        {#each productos as producto}
          <tr class:low-stock={producto.stock_actual < producto.stock_minimo}>
            <td>{producto.id}</td>
            <td class="product-name">{producto.nombre}</td>
            <td>${producto.precio.toFixed(2)}</td>
            <td>{producto.stock_actual} / {producto.stock_minimo}</td>
            <td>
              {#if producto.numero_lote}
                {#if producto.numero_lote.startsWith('APERTURA-')}
                  {$_('productos.loteApertura')}
                {:else}
                  {producto.numero_lote}
                {/if}
                {#if producto.lotes_activos > 1}
                  <span class="text-secondary">
                    {$_('productos.otrosLotes', { values: { cantidad: producto.lotes_activos - 1 } })}
                  </span>
                {/if}
              {:else}
                -
              {/if}
            </td>
            <td>
              {#if producto.numero_lote?.startsWith('APERTURA-')}
                {$_('productos.caducidadDesconocida')}
              {:else if producto.fecha_caducidad}
                {new Date(`${producto.fecha_caducidad}T00:00:00`).toLocaleDateString($locale === 'en' ? 'en-US' : 'es-ES')}
              {:else}
                -
              {/if}
            </td>
            <td>
              <div class="row-actions">
                <a href="/productos/{producto.id}/qr" class="btn btn-small btn-secondary">
                  QR
                </a>
                <a href="/productos/{producto.id}/movimientos" class="action-button action-primary">
                  {$_('productos.movimientos')}
                </a>
                <a href="/productos/{producto.id}/lotes" class="action-button action-secondary">
                  {$_('productos.verLotes')}
                </a>
                <a href="/productos/{producto.id}/editar" class="action-button action-secondary">
                  {$_('productos.editar')}
                </a>
                <form method="POST" action="?/eliminar" onsubmit={confirmarEliminacion}>
                  <input type="hidden" name="id" value={producto.id} />
                  <button type="submit" class="action-button action-danger">{$_('productos.eliminar')}</button>
                </form>
              </div>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}

<style>
  .empty-state {
    padding: 2rem;
    text-align: center;
    color: var(--text-secondary);
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 8px;
  }

  .table-scroll {
    width: 100%;
    overflow-x: auto;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 8px;
  }

  .products-table {
    width: 100%;
    min-width: 1250px;
    border-collapse: collapse;
  }

  .products-table th,
  .products-table td {
    padding: 0.9rem 1rem;
    text-align: left;
    border-bottom: 1px solid var(--border-color);
    color: var(--text-primary);
    white-space: nowrap;
  }

  .products-table th {
    background: var(--bg-secondary);
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
  }

  .products-table tbody tr:last-child td {
    border-bottom: 0;
  }

  .products-table tbody tr:hover {
    background: var(--bg-secondary);
  }

  .products-table tbody tr.low-stock,
  .products-table tbody tr.low-stock td {
    background: var(--status-danger-bg);
    color: var(--status-danger-text);
  }

  .products-table tbody tr.low-stock:hover,
  .products-table tbody tr.low-stock:hover td {
    background: color-mix(in srgb, var(--status-danger-bg) 82%, var(--accent-danger));
  }

  .product-name {
    font-weight: var(--font-weight-semibold);
  }

  .row-actions {
    display: flex;
    max-width: 520px;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .row-actions form {
    margin: 0;
  }

  .action-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 2.25rem;
    padding: 0.45rem 0.7rem;
    border: 1px solid transparent;
    border-radius: 8px;
    font: inherit;
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    line-height: 1.2;
    text-decoration: none;
    white-space: nowrap;
    cursor: pointer;
    transition: background-color 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
  }

  .action-button:hover {
    transform: translateY(-1px);
  }

  .action-primary {
    background: var(--accent-primary);
    color: var(--text-on-accent);
  }

  .action-primary:hover {
    background: var(--accent-purple);
    color: var(--text-on-accent);
  }

  .action-secondary {
    background: var(--bg-secondary);
    border-color: var(--border-color);
    color: var(--text-primary);
  }

  .action-secondary:hover {
    border-color: var(--accent-primary);
    color: var(--accent-primary);
  }

  .action-danger {
    background: var(--accent-danger);
    color: var(--text-on-accent);
  }

  .action-danger:hover {
    filter: brightness(0.9);
  }

  .action-button:focus-visible {
    outline: 3px solid var(--accent-primary);
    outline-offset: 2px;
  }

  @media (max-width: 600px) {
    .products-table th,
    .products-table td {
      padding: 0.75rem;
    }

    .action-button {
      padding: 0.4rem 0.55rem;
      font-size: var(--font-size-xs);
    }
  }
</style>