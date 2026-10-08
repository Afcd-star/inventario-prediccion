<script lang="ts">
  import type { Producto } from '$lib/types';

  interface Props {
    productos: Producto[];
  }

  let { productos }: Props = $props();

  function confirmarEliminacion(event: Event) {
    if (!window.confirm('¿Eliminar este producto?')) {
      event.preventDefault();
    }
  }
</script>

{#if productos.length === 0}
  <p style:textAlign="center" style:color="#666" style:padding="2rem">No hay productos registrados aún.</p>
{:else}
  <table style:width="100%" style:borderCollapse="collapse" style:background="#ffffff" style:borderRadius="8px" style:overflow="hidden">
    <thead>
      <tr style:background="#f3f4f6">
        <th style:padding="1rem" style:textAlign="left" style:borderBottom="1px solid #e5e7eb">ID</th>
        <th style:padding="1rem" style:textAlign="left" style:borderBottom="1px solid #e5e7eb">Nombre</th>
        <th style:padding="1rem" style:textAlign="left" style:borderBottom="1px solid #e5e7eb">Precio</th>
        <th style:padding="1rem" style:textAlign="left" style:borderBottom="1px solid #e5e7eb">Stock</th>
        <th style:padding="1rem" style:textAlign="left" style:borderBottom="1px solid #e5e7eb">Acciones</th>
      </tr>
    </thead>
    <tbody>
      {#each productos as producto}
        <tr style:backgroundColor={producto.stock_actual < producto.stock_minimo ? '#fee2e2' : 'transparent'} style:color={producto.stock_actual < producto.stock_minimo ? '#991b1b' : 'inherit'}>
          <td style:padding="1rem" style:borderBottom="1px solid #e5e7eb">{producto.id}</td>
          <td style:padding="1rem" style:borderBottom="1px solid #e5e7eb">{producto.nombre}</td>
          <td style:padding="1rem" style:borderBottom="1px solid #e5e7eb">${producto.precio.toFixed(2)}</td>
          <td style:padding="1rem" style:borderBottom="1px solid #e5e7eb">{producto.stock_actual} / {producto.stock_minimo}</td>
          <td style:padding="1rem" style:borderBottom="1px solid #e5e7eb" style:display="flex" style:gap="0.5rem">
            <a href="/productos/{producto.id}/movimientos" style:padding="0.5rem 1rem" style:background="#8b5cf6" style:color="white" style:border="none" style:borderRadius="6px" style:cursor="pointer" style:textDecoration="none" style:fontWeight="600">
              Movimientos
            </a>
            <a href="/productos/{producto.id}/editar" style:padding="0.5rem 1rem" style:background="#f59e0b" style:color="white" style:border="none" style:borderRadius="6px" style:cursor="pointer" style:textDecoration="none" style:fontWeight="600">
              Editar
            </a>
            <form method="POST" action="?/eliminar" onsubmit={confirmarEliminacion}>
              <input type="hidden" name="id" value={producto.id} />
              <button type="submit" style:padding="0.5rem 1rem" style:background="#ef4444" style:color="white" style:border="none" style:borderRadius="6px" style:cursor="pointer" style:fontWeight="600">
                Eliminar
              </button>
            </form>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
{/if}