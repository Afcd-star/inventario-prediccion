<script lang="ts">
  import type { Movimiento } from '$lib/server/movimientos.service';

  interface Props {
    movimientos: Movimiento[];
  }

  let { movimientos }: Props = $props();
</script>

{#if movimientos.length === 0}
  <p style:textAlign="center" style:color="#666" style:padding="2rem">No hay movimientos registrados para este producto.</p>
{:else}
  <table style:width="100%" style:borderCollapse="collapse" style:background="#ffffff" style:borderRadius="8px" style:overflow="hidden">
    <thead>
      <tr style:background="#f3f4f6">
        <th style:padding="1rem" style:textAlign="left" style:borderBottom="1px solid #e5e7eb">Fecha</th>
        <th style:padding="1rem" style:textAlign="left" style:borderBottom="1px solid #e5e7eb">Tipo</th>
        <th style:padding="1rem" style:textAlign="left" style:borderBottom="1px solid #e5e7eb">Cantidad</th>
        <th style:padding="1rem" style:textAlign="left" style:borderBottom="1px solid #e5e7eb">Notas</th>
      </tr>
    </thead>
    <tbody>
      {#each movimientos as mov}
        <tr>
          <td style:padding="1rem" style:borderBottom="1px solid #e5e7eb">{new Date(mov.fecha).toLocaleString()}</td>
          <td style:padding="1rem" style:borderBottom="1px solid #e5e7eb">
            <span style:padding="0.25rem 0.5rem" style:borderRadius="4px" style:fontSize="0.85rem" style:fontWeight="600" style:background={mov.tipo === 'entrada' ? '#d1fae5' : '#fee2e2'} style:color={mov.tipo === 'entrada' ? '#065f46' : '#991b1b'}>
              {mov.tipo.toUpperCase()}
            </span>
          </td>
          <td style:padding="1rem" style:borderBottom="1px solid #e5e7eb" style:fontWeight="600">
            {mov.tipo === 'entrada' ? '+' : '-'}{mov.cantidad}
          </td>
          <td style:padding="1rem" style:borderBottom="1px solid #e5e7eb" style:color="#6b7280">{mov.notas || '-'}</td>
        </tr>
      {/each}
    </tbody>
  </table>
{/if}