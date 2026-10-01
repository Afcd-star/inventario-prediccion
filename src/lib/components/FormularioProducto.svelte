<script lang="ts">
  import type { Producto } from '$lib/types';

  interface Props {
    producto?: Producto;
    accion: 'crear' | 'editar';
  }

  let { producto, accion }: Props = $props();

  // $derived le dice a Svelte que esto se recalcula si 'accion' cambia
  const esEdicion = $derived(accion === 'editar');
</script>

<form method="POST" action="?/{accion}">
  <div style:marginBottom="1rem">
    <label for="nombre" style:display="block" style:marginBottom="0.5rem" style:fontWeight="600">Nombre</label>
    <input
      id="nombre"
      type="text"
      name="nombre"
      value={producto?.nombre ?? ''}
      required
      style:width="100%"
      style:padding="0.5rem"
      style:border="1px solid #d1d5db"
      style:borderRadius="6px"
    />
  </div>

  <div style:marginBottom="1rem">
    <label for="precio" style:display="block" style:marginBottom="0.5rem" style:fontWeight="600">Precio</label>
    <input
      id="precio"
      type="number"
      name="precio"
      step="0.01"
      min="0"
      value={producto?.precio ?? 0}
      required
      style:width="100%"
      style:padding="0.5rem"
      style:border="1px solid #d1d5db"
      style:borderRadius="6px"
    />
  </div>

  <div style:display="flex" style:gap="1rem" style:marginBottom="1.5rem">
    <div style:flex="1">
      <label for="stock" style:display="block" style:marginBottom="0.5rem" style:fontWeight="600">Stock Actual</label>
      <input
        id="stock"
        type="number"
        name="stock"
        min="0"
        value={producto?.stock_actual ?? 0}
        required
        style:width="100%"
        style:padding="0.5rem"
        style:border="1px solid #d1d5db"
        style:borderRadius="6px"
      />
    </div>
    <div style:flex="1">
      <label for="minimo" style:display="block" style:marginBottom="0.5rem" style:fontWeight="600">Stock Mínimo</label>
      <input
        id="minimo"
        type="number"
        name="minimo"
        min="0"
        value={producto?.stock_minimo ?? 10}
        required
        style:width="100%"
        style:padding="0.5rem"
        style:border="1px solid #d1d5db"
        style:borderRadius="6px"
      />
    </div>
  </div>

  <div style:display="flex" style:gap="1rem">
    <a href="/productos" style:padding="0.5rem 1rem" style:background="#e5e7eb" style:color="#374151" style:border="none" style:borderRadius="6px" style:cursor="pointer" style:textDecoration="none" style:fontWeight="600">
      Cancelar
    </a>
    <button type="submit" style:padding="0.5rem 1rem" style:background="#3b82f6" style:color="white" style:border="none" style:borderRadius="6px" style:cursor="pointer" style:fontWeight="600">
      {esEdicion ? 'Guardar Cambios' : 'Crear Producto'}
    </button>
  </div>
</form>