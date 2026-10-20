<script lang="ts">
  import { enhance } from '$app/forms';
  import { _ } from 'svelte-i18n';
  import type { PageData } from './$types';
  import { contadorNoLeidas } from '$lib/stores/notificaciones';
  import type { TipoNotificacion, Notificacion } from '$lib/types';

  let { data, form }: { data: PageData; form?: { success?: boolean } } = $props();

  const TIPOS_NOTIFICACION: Array<{ valor: TipoNotificacion | ''; etiqueta: string; icono: string }> = [
    { valor: '', etiqueta: 'Todas', icono: '🔔' },
    { valor: 'stock_bajo', etiqueta: 'Stock bajo', icono: '📦' },
    { valor: 'anomalia_detectada', etiqueta: 'Anomalía', icono: '⚠️' },
    { valor: 'transferencia_completada', etiqueta: 'Transferencia completada', icono: '🚚' },
    { valor: 'transferencia_cancelada', etiqueta: 'Transferencia cancelada', icono: '❌' },
    { valor: 'lote_por_vencer', etiqueta: 'Lote por vencer', icono: '⏳' }
  ];

  const ESTADOS = [
    { valor: '', etiqueta: 'Todas' },
    { valor: 'false', etiqueta: 'No leídas' },
    { valor: 'true', etiqueta: 'Leídas' }
  ];

  let notificacionesLocales = $state<Notificacion[]>([]);

  // Sincronizar inicial y cuando cambie data
  $effect(() => {
    notificacionesLocales = data.notificaciones.map(n => ({...n}));
  });

  // Sincronizar el store global cuando se marcan como leídas
  $effect(() => {
    if (form?.success) {
      contadorNoLeidas.set(data.contadorNoLeidas);
    }
  });

  function construirUrlFiltros(tipo: string, leida: string): string {
    const params = new URLSearchParams();
    if (tipo) params.set('tipo', tipo);
    if (leida) params.set('leida', leida);
    return `/notificaciones?${params.toString()}`;
  }

  function formatoFecha(fecha: string): string {
    return new Date(fecha).toLocaleString('es-ES', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function iconoDeTipo(tipo: string): string {
    return TIPOS_NOTIFICACION.find(t => t.valor === tipo)?.icono ?? '🔔';
  }

  // Marcar una notificación como leída al hacer clic en ella
  async function marcarComoLeida(id: number) {
    const formData = new FormData();
    formData.append('id', String(id));
    
    try {
      const res = await fetch('?/marcarLeida', {
        method: 'POST',
        body: formData
      });
      
      if (res.ok) {
        // 1. Actualizar el contador global del Navbar
        const nuevoContador = Math.max(0, $contadorNoLeidas - 1);
        contadorNoLeidas.set(nuevoContador);

        // 2. ACTUALIZACIÓN REACTIVA: Modificar la copia local
        const index = notificacionesLocales.findIndex((n) => n.id === id);
        if (index !== -1) {
          notificacionesLocales[index] = { 
            ...notificacionesLocales[index], 
            leida: 1 
          };
        }
      }
    } catch (error) {
      console.error('Error al marcar notificación como leída:', error);
    }
  }
</script>

<svelte:head>
  <title>{$_('notificaciones.titulo')} | StockPredict Pro</title>
</svelte:head>

<main class="page-container">
  <header class="page-header">
    <a href="/dashboard" class="btn-back">
      <span>←</span>
      <span>{$_('notificaciones.volver')}</span>
    </a>
    <h1>🔔 {$_('notificaciones.titulo')}</h1>
    <p class="text-secondary">
      {$_('notificaciones.subtitulo')} · 
      <strong>{data.contadorNoLeidas}</strong> {$_('notificaciones.sinLeer')}
    </p>
  </header>

  <!-- Filtros -->
  <section class="card filtros-card">
    <div class="filtros-grid">
      <div class="input-group">
        <!-- Cambiado de <label> a <span> para evitar warning a11y -->
        <span class="label">{$_('notificaciones.tipo')}</span>
        <div class="filtros-chip" role="group" aria-label={$_('notificaciones.tipo')}>
          {#each TIPOS_NOTIFICACION as t}
            <a
              href={construirUrlFiltros(t.valor, data.filtros.leida !== undefined ? String(data.filtros.leida) : '')}
              class="chip"
              class:chip-active={data.filtros.tipo === t.valor || (t.valor === '' && !data.filtros.tipo)}
            >
              <span>{t.icono}</span>
              <span>{t.etiqueta}</span>
            </a>
          {/each}
        </div>
      </div>

      <div class="input-group">
        <span class="label">{$_('notificaciones.estado')}</span>
        <div class="filtros-chip" role="group" aria-label={$_('notificaciones.estado')}>
          {#each ESTADOS as e}
            <a
              href={construirUrlFiltros(data.filtros.tipo || '', e.valor)}
              class="chip"
              class:chip-active={
                (e.valor === '' && data.filtros.leida === undefined) ||
                (e.valor !== '' && String(data.filtros.leida) === e.valor)
              }
            >
              {e.etiqueta}
            </a>
          {/each}
        </div>
      </div>
    </div>

    <div class="filtros-acciones">
      {#if data.contadorNoLeidas > 0}
        <form method="POST" action="?/marcarTodasLeidas" use:enhance style="display: inline;">
          <button type="submit" class="btn btn-sm btn-primary">
            ✅ {$_('notificaciones.marcarTodasLeidas')}
          </button>
        </form>
      {/if}
      <form method="POST" action="?/eliminarLeidas" use:enhance style="display: inline;">
        <button type="submit" class="btn btn-sm btn-secondary" onclick={() => confirm($_('notificaciones.confirmarEliminarLeidas'))}>
          🗑️ {$_('notificaciones.eliminarLeidas')}
        </button>
      </form>
    </div>
  </section>

  <!-- Lista de notificaciones -->
  {#if data.notificaciones.length === 0}
    <div class="card">
      <p class="text-secondary text-center">
        {$_('notificaciones.vacias')}
      </p>
    </div>
  {:else}
    <ul class="notificaciones-lista">
      {#each notificacionesLocales as notif (notif.id)}
        <li class="notificacion-item" class:no-leida={notif.leida === 0}>
          
          <!-- Botón real para el área clicable (resuelve warnings a11y) -->
          <button 
            class="notificacion-click-area" 
            onclick={() => marcarComoLeida(notif.id)}
            aria-label="Marcar como leída: {notif.titulo}"
          >
            <div class="notificacion-icono">
              {iconoDeTipo(notif.tipo)}
            </div>
            <div class="notificacion-contenido">
              <div class="notificacion-header">
                <strong class="notificacion-titulo">{notif.titulo}</strong>
                <span class="notificacion-fecha text-secondary text-sm">
                  {formatoFecha(notif.creada_en)}
                </span>
              </div>
              <p class="notificacion-mensaje">{notif.mensaje}</p>
            </div>
          </button>
          
          <!-- Acciones separadas del área clicable principal -->
          <div class="notificacion-acciones">
            <form method="POST" action="?/eliminarUna" use:enhance style="display: inline;">
              <input type="hidden" name="id" value={notif.id} />
              <button type="submit" class="btn-icon" title={$_('notificaciones.eliminar')} onclick={() => confirm($_('notificaciones.confirmarEliminar'))}>
                🗑️
              </button>
            </form>
          </div>
        </li>
      {/each}
    </ul>

    <!-- Paginación -->
    {#if data.totalPaginas > 1}
      <div class="paginacion">
        {#if data.pagina > 1}
          <a href="?pagina={data.pagina - 1}{data.filtros.tipo ? `&tipo=${data.filtros.tipo}` : ''}{data.filtros.leida !== undefined ? `&leida=${data.filtros.leida}` : ''}" class="btn btn-sm btn-secondary">
            ← {$_('notificaciones.anterior')}
          </a>
        {/if}
        <span class="text-secondary text-sm">
          {$_('notificaciones.paginas', { values: { actual: data.pagina, total: data.totalPaginas } })}
        </span>
        {#if data.pagina < data.totalPaginas}
          <a href="?pagina={data.pagina + 1}{data.filtros.tipo ? `&tipo=${data.filtros.tipo}` : ''}{data.filtros.leida !== undefined ? `&leida=${data.filtros.leida}` : ''}" class="btn btn-sm btn-secondary">
            {$_('notificaciones.siguiente')} →
          </a>
        {/if}
      </div>
    {/if}
  {/if}
</main>

<style>
  .page-header { margin-bottom: 2rem; }

  .filtros-card {
    margin-bottom: 1.5rem;
    padding: 1.25rem;
  }

  .filtros-grid {
    display: grid;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .filtros-chip {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .chip {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.4rem 0.75rem;
    border: 1px solid var(--border-color);
    border-radius: 999px;
    background: var(--bg-card);
    color: var(--text-primary);
    font-size: var(--font-size-sm);
    text-decoration: none;
    transition: all 0.15s ease;
  }

  .chip:hover {
    border-color: var(--accent-primary);
  }

  .chip-active {
    background: var(--accent-primary);
    color: white;
    border-color: var(--accent-primary);
  }

  .filtros-acciones {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    padding-top: 0.75rem;
    border-top: 1px solid var(--border-color);
  }

  .notificaciones-lista {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .notificacion-item {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    padding: 1rem;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 10px;
    border-left: 4px solid var(--border-color);
    transition: all 0.2s ease;
  }

  .notificacion-item:hover {
    transform: translateX(2px);
    box-shadow: var(--shadow-hover);
  }

  .notificacion-item.no-leida {
    border-left-color: var(--accent-primary);
    background: var(--bg-secondary);
  }

  /* Nueva clase para el botón clicable accesible */
  .notificacion-click-area {
    flex: 1;
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    background: transparent;
    border: none;
    padding: 0;
    margin: 0;
    cursor: pointer;
    text-align: left;
    width: 100%;
    font: inherit;
    color: inherit;
    border-radius: 6px;
    transition: background 0.15s;
  }

  .notificacion-click-area:focus-visible {
    outline: 2px solid var(--accent-primary);
    outline-offset: 2px;
  }

  .notificacion-item.no-leida .notificacion-click-area .notificacion-titulo {
    font-weight: 700;
  }

  .notificacion-item.no-leida .notificacion-click-area .notificacion-mensaje {
    color: var(--text-primary);
  }

  .notificacion-icono {
    font-size: 1.5rem;
    flex-shrink: 0;
    width: 2.5rem;
    height: 2.5rem;
    display: grid;
    place-items: center;
    background: var(--bg-secondary);
    border-radius: 50%;
  }

  .notificacion-contenido {
    flex: 1;
    min-width: 0;
  }

  .notificacion-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 1rem;
    margin-bottom: 0.25rem;
  }

  .notificacion-titulo {
    font-size: var(--font-size-base);
  }

  .notificacion-fecha {
    white-space: nowrap;
  }

  .notificacion-mensaje {
    margin: 0;
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    line-height: 1.5;
  }

  .notificacion-acciones {
    display: flex;
    gap: 0.25rem;
    flex-shrink: 0;
    align-self: center; /* Centrar verticalmente con el contenido */
  }

  .btn-icon {
    display: grid;
    place-items: center;
    width: 2rem;
    height: 2rem;
    border: none;
    background: transparent;
    border-radius: 6px;
    cursor: pointer;
    font-size: 1rem;
    transition: background 0.15s;
  }

  .btn-icon:hover {
    background: var(--status-danger-bg);
  }

  .paginacion {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 1rem;
    margin-top: 2rem;
  }

  .text-center {
    text-align: center;
  }

  @media (max-width: 600px) {
    .notificacion-item {
      flex-wrap: wrap;
    }
    .notificacion-acciones {
      width: 100%;
      justify-content: flex-end;
      margin-top: 0.5rem;
    }
  }
</style>