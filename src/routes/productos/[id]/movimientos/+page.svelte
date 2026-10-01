<script lang="ts">
  import type { PageData } from './$types';
  import FormularioMovimiento from '$lib/components/FormularioMovimiento.svelte';
  import HistorialMovimientos from '$lib/components/HistorialMovimientos.svelte';

  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>Movimientos: {data.producto.nombre}</title>
</svelte:head>

<main style:maxWidth="900px" style:margin="2rem auto" style:padding="0 1rem" style:fontFamily="sans-serif">
  <header style:marginBottom="2rem">
    <a href="/productos" style:color="#3b82f6" style:textDecoration="none" style:fontSize="0.9rem">← Volver a productos</a>
    <h1 style:margin="0.5rem 0 0 0">Movimientos: {data.producto.nombre}</h1>
    <p style:color="#6b7280" style:margin="0.5rem 0 0 0">
      Stock actual: <strong style:color={data.producto.stock_actual < data.producto.stock_minimo ? '#ef4444' : '#10b981'}>{data.producto.stock_actual}</strong> {data.producto.unidad_medida}
    </p>
  </header>

  <div style:display="grid" style:gridTemplateColumns="1fr 2fr" style:gap="2rem">
    <section style:background="#f9fafb" style:padding="1.5rem" style:borderRadius="8px">
      <h2 style:marginTop="0" style:fontSize="1.1rem">Nuevo Movimiento</h2>
      <FormularioMovimiento productoId={data.producto.id} stockActual={data.producto.stock_actual} />
    </section>

    <section>
      <h2 style:fontSize="1.1rem">Historial</h2>
      <HistorialMovimientos movimientos={data.movimientos} />
    </section>
  </div>
</main>