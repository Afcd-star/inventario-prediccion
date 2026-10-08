<script lang="ts">
  import type { PageData } from './$types';
  import TablaProductos from '$lib/components/TablaProductos.svelte';

  let { data, form }: { data: PageData; form?: { success?: string } } = $props();
</script>

<svelte:head>
  <title>Productos</title>
</svelte:head>

<main style:maxWidth="900px" style:margin="2rem auto" style:padding="0 1rem" style:fontFamily="sans-serif">
  <header style:display="flex" style:justifyContent="space-between" style:alignItems="center" style:marginBottom="1.5rem">
    <h1 style:margin="0" style:color="var(--text-primary)">Gestión de Productos</h1>
    <div style:display="flex" style:gap="0.5rem">
      <a href="/dashboard" style:padding="0.5rem 1rem" style:background="var(--accent-success)" style:color="white" style:border="none" style:borderRadius="6px" style:cursor="pointer" style:textDecoration="none" style:fontWeight="600">
        Dashboard
      </a>
      <a href="/productos/nuevo" style:padding="0.5rem 1rem" style:background="var(--accent-primary)" style:color="white" style:border="none" style:borderRadius="6px" style:cursor="pointer" style:textDecoration="none" style:fontWeight="600">
        Nuevo Producto
      </a>
    </div>
  </header>

  <!-- Buscador -->
  <div style:marginBottom="1.5rem">
    <form method="GET" action="/productos" style:display="flex" style:gap="0.5rem">
      <input 
        type="text" 
        name="q" 
        placeholder="Buscar producto por nombre..." 
        value={data.busqueda}
        style:flex="1" 
        style:padding="0.75rem" 
        style:border="1px solid var(--border-color)" 
        style:borderRadius="6px"
        style:background="var(--bg-card)"
        style:color="var(--text-primary)"
      />
      <button type="submit" style:padding="0.75rem 1.5rem" style:background="var(--accent-primary)" style:color="white" style:border="none" style:borderRadius="6px" style:cursor="pointer" style:fontWeight="600">
        Buscar
      </button>
      {#if data.busqueda}
        <a href="/productos" style:padding="0.75rem 1rem" style:background="var(--bg-secondary)" style:color="var(--text-secondary)" style:border="1px solid var(--border-color)" style:borderRadius="6px" style:textDecoration="none">
          Limpiar
        </a>
      {/if}
    </form>
  </div>

  <!-- Mensajes de feedback usando la propiedad 'form' -->
  {#if form?.success === 'producto_creado'}
    <div style:padding="1rem" style:background="#d1fae5" style:color="#065f46" style:borderRadius="6px" style:marginBottom="1rem">
      ✅ Producto creado exitosamente.
    </div>
  {:else if form?.success === 'producto_eliminado'}
    <div style:padding="1rem" style:background="#fee2e2" style:color="#991b1b" style:borderRadius="6px" style:marginBottom="1rem">
      🗑️ Producto eliminado.
    </div>
  {/if}

  <TablaProductos productos={data.productos} />
</main>