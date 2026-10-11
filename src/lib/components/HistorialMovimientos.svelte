<script lang="ts">
  import type { Movimiento } from '$lib/server/movimientos.service';
  import { _, locale } from 'svelte-i18n';

  interface Props {
    movimientos: Movimiento[];
  }

  let { movimientos }: Props = $props();
</script>

{#if movimientos.length === 0}
  <p class="text-secondary text-center" style:padding="2rem">
    {$_('movimientos.sinMovimientos')}
  </p>
{:else}
  <table class="data-table">
    <thead>
      <tr>
        <th>{$_('movimientos.fecha')}</th>
        <th>{$_('comunes.tipo')}</th>
        <th>{$_('movimientos.cantidad')}</th>
        <th>{$_('movimientos.notasTabla')}</th>
      </tr>
    </thead>
    <tbody>
      {#each movimientos as mov}
        <tr>
          <td>{new Date(mov.fecha).toLocaleString($locale === 'en' ? 'en-US' : 'es-ES')}</td>
          <td>
            <span class="badge" class:badge-success={mov.tipo === 'entrada'} class:badge-danger={mov.tipo === 'salida'}>
              {mov.tipo === 'entrada' ? $_('movimientos.tipoEntrada') : $_('movimientos.tipoSalida')}
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