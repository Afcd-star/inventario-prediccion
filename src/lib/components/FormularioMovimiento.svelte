<script lang="ts">
  interface Props {
    productoId: number;
    stockActual: number;
  }

  let { productoId, stockActual }: Props = $props();
</script>

<form method="POST" action="?/registrar">
  <input type="hidden" name="producto_id" value={productoId} />

  <div style:marginBottom="1rem">
    <label style:display="block" style:marginBottom="0.5rem" style:fontWeight="600">Tipo de Movimiento</label>
    <div style:display="flex" style:gap="1rem">
      <label style:display="flex" style:alignItems="center" style:gap="0.5rem" style:cursor="pointer">
        <input type="radio" name="tipo" value="entrada" required />
        Entrada (Aumenta stock)
      </label>
      <label style:display="flex" style:alignItems="center" style:gap="0.5rem" style:cursor="pointer">
        <input type="radio" name="tipo" value="salida" required />
        Salida (Reduce stock)
      </label>
    </div>
  </div>

  <div style:marginBottom="1rem">
    <label for="cantidad" style:display="block" style:marginBottom="0.5rem" style:fontWeight="600">Cantidad</label>
    <input 
      id="cantidad" 
      type="number" 
      name="cantidad" 
      min="1" 
      max={stockActual} 
      required 
      style:width="100%" 
      style:padding="0.5rem" 
      style:border="1px solid #d1d5db" 
      style:borderRadius="6px" 
    />
    <p style:fontSize="0.8rem" style:color="#6b7280" style:marginTop="0.25rem">Stock actual disponible: {stockActual}</p>
  </div>

  <div style:marginBottom="1.5rem">
    <label for="notas" style:display="block" style:marginBottom="0.5rem" style:fontWeight="600">Notas (Opcional)</label>
    <textarea 
      id="notas" 
      name="notas" 
      rows="3" 
      style:width="100%" 
      style:padding="0.5rem" 
      style:border="1px solid #d1d5db" 
      style:borderRadius="6px" 
    ></textarea>
  </div>

  <button type="submit" style:width="100%" style:padding="0.75rem" style:background="#10b981" style:color="white" style:border="none" style:borderRadius="6px" style:cursor="pointer" style:fontWeight="600">
    Registrar Movimiento
  </button>
</form>