<script lang="ts">
  import { _ } from 'svelte-i18n';

  interface Props {
    productoId: number;
    stockActual: number;
  }

  let { productoId, stockActual }: Props = $props();
  
  // Estado reactivo para saber qué tipo de movimiento está seleccionado
  let tipoSeleccionado = $state('entrada');
</script>

<form method="POST" action="?/registrar" class="movement-form">
  <input type="hidden" name="producto_id" value={productoId} />

  <fieldset class="type-field">
    <legend>{$_('movimientos.tipo')}</legend>
    <div class="type-options">
      <label class="type-option">
        <input type="radio" name="tipo" value="entrada" bind:group={tipoSeleccionado} required />
        <span>{$_('movimientos.entrada')}</span>
      </label>
      <label class="type-option">
        <input type="radio" name="tipo" value="salida" bind:group={tipoSeleccionado} required />
        <span>{$_('movimientos.salida')}</span>
      </label>
    </div>
  </fieldset>

  <div class="form-field">
    <label for="cantidad">{$_('movimientos.cantidad')}</label>
    <input 
      id="cantidad" 
      type="number" 
      name="cantidad" 
      min="1" 
      max={tipoSeleccionado === 'salida' ? stockActual : undefined} 
      required 
    />
    <p class="stock-hint">
      {$_('movimientos.stockDisponible')}: {stockActual}
    </p>
  </div>

  <div class="form-field">
    <label for="notas">{$_('movimientos.notas')}</label>
    <textarea 
      id="notas" 
      name="notas" 
      rows="3" 
    ></textarea>
  </div>

  <button type="submit" class="btn btn-success">
    {$_('movimientos.registrar')}
  </button>
</form>

<style>
  .movement-form {
    display: grid;
    gap: 1.25rem;
  }

  .type-field {
    min-width: 0;
    padding: 1rem;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    background: var(--bg-secondary);
  }

  .type-field legend {
    padding: 0 0.35rem;
    color: var(--text-primary);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
  }

  .type-options {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.75rem;
  }

  .type-option {
    display: flex;
    min-width: 0;
    align-items: flex-start;
    gap: 0.6rem;
    padding: 0.8rem;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    background: var(--bg-card);
    color: var(--text-primary);
    cursor: pointer;
  }

  .type-option input {
    flex: 0 0 auto;
    width: 1rem;
    height: 1rem;
    margin-top: 0.15rem;
    accent-color: var(--accent-primary);
  }

  .type-option:has(input:checked) {
    border-color: var(--accent-primary);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-primary) 18%, transparent);
  }

  .stock-hint {
    margin: 0;
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
  }

  .type-option:has(input:focus-visible) {
    outline: 3px solid var(--accent-primary);
    outline-offset: 2px;
  }

  @media (max-width: 480px) {
    .type-options {
      grid-template-columns: 1fr;
    }
  }
</style>