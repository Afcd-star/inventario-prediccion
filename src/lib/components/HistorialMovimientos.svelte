<script lang="ts">
  import type { Movimiento } from '$lib/server/movimientos.service';

  interface Props {
    movimientos: Movimiento[];
  }

  let { movimientos }: Props = $props();
</script>

{#if movimientos.length === 0}
  <p class="text-secondary text-center" style:padding="2rem">
    No hay movimientos registrados para este producto.
  </p>
{:else}
  <table class="data-table">
    <thead>
      <tr>
        <th>Fecha</th>
        <th>Tipo</th>
        <th>Cantidad</th>
        <th>Notas</th>
      </tr>
    </thead>
    <tbody>
      {#each movimientos as mov}
        <tr>
          <td>{new Date(mov.fecha).toLocaleString()}</td>
          <td>
            <span class="badge" class:badge-success={mov.tipo === 'entrada'} class:badge-danger={mov.tipo === 'salida'}>
              {mov.tipo.toUpperCase()}
            </span>
          </td>
          <td class="font-semibold">
            {mov.tipo === 'entrada' ? '+' : '-'}{mov.cantidad}
          </td>
          <td class="text-secondary">{mov.notas || '-'}</td>
        </tr>
      {/each}
    </tbody>
  </table>
{/if}

<style>
</style>