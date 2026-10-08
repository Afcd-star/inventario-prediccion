<script lang="ts">
  import type { PageData } from './$types';
  import { onMount, onDestroy } from 'svelte';
  import Chart from 'chart.js/auto';

  let { data }: { data: PageData } = $props();
  
  // Corregido para Svelte 5: usar $state para variables vinculadas con bind:this
  let canvas = $state<HTMLCanvasElement | null>(null);
  let chart: Chart | null = null;

  onMount(() => {
    if (canvas && data.topConsumidos.length > 0) {
      chart = new Chart(canvas, {
        type: 'bar',
        data: {
          labels: data.topConsumidos.map(p => p.nombre),
          datasets: [{
            label: 'Unidades Vendidas',
            data: data.topConsumidos.map(p => p.total_vendido),
            backgroundColor: '#8b5cf6',
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true } }
        }
      });
    }
  });

  onDestroy(() => {
    if (chart) {
      chart.destroy(); // Liberar memoria RAM
    }
  });
</script>

<svelte:head>
  <title>Dashboard de Inventario</title>
</svelte:head>

<main style:maxWidth="1200px" style:margin="2rem auto" style:padding="0 1rem" style:fontFamily="sans-serif">
  <header style:marginBottom="2rem">
    <h1 style:margin="0">Dashboard de Predicción</h1>
    <p style:color="#6b7280" style:margin="0.5rem 0 0 0">Resumen inteligente de tu inventario</p>
  </header>

  <!-- Tarjetas de Métricas -->
  <section style:display="grid" style:gridTemplateColumns="repeat(auto-fit, minmax(250px, 1fr))" style:gap="1.5rem" style:marginBottom="2rem">
    <div style:background="#ffffff" style:padding="1.5rem" style:borderRadius="8px" style:border="1px solid #e5e7eb">
      <h3 style:margin="0 0 0.5rem 0" style:fontSize="0.9rem" style:color="#6b7280">Total Productos</h3>
      <p style:margin="0" style:fontSize="2rem" style:fontWeight="700">{data.metricas.totalProductos}</p>
    </div>
    <div style:background="#fee2e2" style:padding="1.5rem" style:borderRadius="8px" style:border="1px solid #fca5a5">
      <h3 style:margin="0 0 0.5rem 0" style:fontSize="0.9rem" style:color="#991b1b">Stock Bajo</h3>
      <p style:margin="0" style:fontSize="2rem" style:fontWeight="700" style:color="#991b1b">{data.metricas.stockBajo}</p>
    </div>
    <div style:background="#fef3c7" style:padding="1.5rem" style:borderRadius="8px" style:border="1px solid #fcd34d">
      <h3 style:margin="0 0 0.5rem 0" style:fontSize="0.9rem" style:color="#92400e">Reorden Urgente (3 días o menos)</h3>
      <p style:margin="0" style:fontSize="2rem" style:fontWeight="700" style:color="#92400e">{data.metricas.reordenUrgente}</p>
    </div>
  </section>

  <div style:display="grid" style:gridTemplateColumns="2fr 1fr" style:gap="2rem">
    <!-- Tabla de Predicciones -->
    <section style:background="#ffffff" style:padding="1.5rem" style:borderRadius="8px" style:border="1px solid #e5e7eb">
      <h2 style:marginTop="0" style:fontSize="1.2rem">Estado de Predicciones</h2>
      {#if data.productos.length === 0}
        <p style:color="#6b7280">No hay productos registrados.</p>
      {:else}
        <table style:width="100%" style:borderCollapse="collapse">
          <thead>
            <tr style:background="#f9fafb">
              <th style:padding="0.75rem" style:textAlign="left" style:borderBottom="1px solid #e5e7eb">Producto</th>
              <th style:padding="0.75rem" style:textAlign="left" style:borderBottom="1px solid #e5e7eb">Stock</th>
              <th style:padding="0.75rem" style:textAlign="left" style:borderBottom="1px solid #e5e7eb">Días hasta agotar</th>
              <th style:padding="0.75rem" style:textAlign="left" style:borderBottom="1px solid #e5e7eb">Reorden</th>
            </tr>
          </thead>
          <tbody>
            {#each data.productos as p}
              <tr>
                <td style:padding="0.75rem" style:borderBottom="1px solid #e5e7eb">{p.nombre}</td>
                <td style:padding="0.75rem" style:borderBottom="1px solid #e5e7eb" style:color={p.stock_actual < p.stock_minimo ? '#ef4444' : 'inherit'} style:fontWeight="600">
                  {p.stock_actual}
                </td>
                <td style:padding="0.75rem" style:borderBottom="1px solid #e5e7eb">
                  {#if p.prediccion && p.prediccion.dias_hasta_agotarse !== null}
                    {p.prediccion.dias_hasta_agotarse} días
                  {:else}
                    <span style:color="#9ca3af">Sin datos</span>
                  {/if}
                </td>
                <td style:padding="0.75rem" style:borderBottom="1px solid #e5e7eb">
                  {#if p.prediccion?.fecha_recomendada_reorden}
                    <span style:padding="0.25rem 0.5rem" style:background="#e0e7ff" style:color="#3730a3" style:borderRadius="4px" style:fontSize="0.85rem">
                      {p.prediccion.fecha_recomendada_reorden}
                    </span>
                  {:else}
                    <span style:color="#9ca3af">-</span>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
    </section>

    <!-- Gráfico de Top Consumidos -->
    <section style:background="#ffffff" style:padding="1.5rem" style:borderRadius="8px" style:border="1px solid #e5e7eb">
      <h2 style:marginTop="0" style:fontSize="1.2rem">Top 5 Más Vendidos</h2>
      {#if data.topConsumidos.length > 0}
        <canvas bind:this={canvas}></canvas>
      {:else}
        <p style:color="#6b7280" style:textAlign="center" style:padding="2rem">Registra salidas para ver el gráfico.</p>
      {/if}
    </section>
  </div>
</main>