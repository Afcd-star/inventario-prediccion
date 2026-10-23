<script lang="ts">
  import { _ } from 'svelte-i18n';

  let {
    etiquetas = $_('exportacion.titulo'),
    opciones
  }: {
    etiquetas?: string;
    opciones: Array<{ etiqueta: string; url: string }>;
  } = $props();

  let abierto = $state(false);
  let menuRef = $state<HTMLDivElement | null>(null);
  let botonRef = $state<HTMLButtonElement | null>(null);

  function toggle() { abierto = !abierto; }
  function cerrar() { abierto = false; }

  function cerrarYDevolverFoco() {
    abierto = false;
    // El botón vive fuera del {#if}, siempre en el DOM: foco inmediato, sin tick.
    botonRef?.focus();
  }

  // Listeners globales SOLO mientras el menú está abierto.
  // - pointerdown fuera  => cerrar (cubre mouse y touch, firea antes que click)
  // - Escape             => cerrar y devolver el foco al botón (a11y correcta)
  // El cleanup se ejecuta al cerrar o al destruir el componente: cero fugas,
  // cero listeners Coste cuando está cerrado (importante en hardware modesto).
  $effect(() => {
    if (!abierto) return;

    function onPointerDown(e: PointerEvent) {
      if (menuRef && !menuRef.contains(e.target as Node)) {
        cerrarYDevolverFoco();
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') cerrarYDevolverFoco();
    }

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  });
</script>

<div class="menu-exportar" bind:this={menuRef}>
  <button
    type="button"
    bind:this={botonRef}
    class="btn btn-secondary"
    aria-haspopup="menu"
    aria-expanded={abierto}
    aria-label={$_('exportacion.aria')}
    onclick={toggle}
  >
    {etiquetas}
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="flecha" class:flecha-abierta={abierto} aria-hidden="true">
      <path d="m6 9 6 6 6-6"></path>
    </svg>
  </button>

  {#if abierto}
    <ul class="menu-lista" role="menu">
      {#each opciones as opt}
        <li role="none">
          <a href={opt.url} role="menuitem" class="menu-item" onclick={cerrar}>
            {opt.etiqueta}
          </a>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .menu-exportar {
    position: relative;
    display: inline-block;
  }

  .flecha {
    margin-left: 0.5rem;
    transition: transform 0.15s ease;
    vertical-align: middle;
  }

  .flecha-abierta {
    transform: rotate(180deg);
  }

  .menu-lista {
    position: absolute;
    top: calc(100% + 0.4rem);
    right: 0;
    min-width: 220px;
    list-style: none;
    margin: 0;
    padding: 0.4rem;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.12), 0 4px 10px rgba(0, 0, 0, 0.06);
    z-index: 50;
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .menu-item {
    display: block;
    padding: 0.6rem 0.8rem;
    border-radius: 6px;
    color: var(--text-primary);
    text-decoration: none;
    font-size: var(--font-size-sm);
    transition: background 0.15s;
  }

  .menu-item:hover,
  .menu-item:focus-visible {
    background: var(--bg-secondary);
    outline: none;
  }
</style>