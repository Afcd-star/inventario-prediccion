<script lang="ts">
  import type { PageData } from './$types';
  import { _ } from 'svelte-i18n';

  let { data }: { data: PageData } = $props();

  function categoriaDe(accion: string): string {
    if (accion.startsWith('login') || accion === 'logout') return 'auth';
    if (accion.startsWith('producto') || accion.startsWith('movimiento')) return 'inventario';
    if (accion.startsWith('perfil')) return 'perfil';
    if (accion.startsWith('usuario') || accion.startsWith('umbrales') || accion.startsWith('predicciones')) return 'admin';
    return 'otro';
  }

  function etiquetaCategoria(categoria: string): string {
    const claves: Record<string, string> = {
      auth: 'auditoria.catAuth',
      inventario: 'auditoria.catInventario',
      perfil: 'auditoria.catPerfil',
      admin: 'auditoria.catAdmin',
      otro: 'auditoria.catOtro'
    };
    return $_(claves[categoria] ?? 'auditoria.catOtro');
  }

  function formatoFechaHora(fecha: string): string {
    return new Date(`${fecha.replace(' ', 'T')}Z`).toLocaleString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function detallesBonitos(detalles: string): string {
    try {
      return JSON.stringify(JSON.parse(detalles), null, 2);
    } catch {
      return detalles;
    }
  }

  function urlPagina(numero: number): string {
    const params = new URLSearchParams();
    if (data.filtros.desde) params.set('desde', data.filtros.desde);
    if (data.filtros.hasta) params.set('hasta', data.filtros.hasta);
    if (data.filtros.usuario) params.set('usuario', data.filtros.usuario);
    if (data.filtros.accion) params.set('accion', data.filtros.accion);
    if (numero > 1) params.set('pagina', String(numero));
    const consulta = params.toString();
    return consulta ? `/auditoria?${consulta}` : '/auditoria';
  }
</script>

<svelte:head>
  <title>{$_('auditoria.titulo')} | StockPredict Pro</title>
</svelte:head>

<main class="page-container">
  <header class="page-header">
    <a href="/admin" class="btn-back">
      <span>←</span>
      <span>{$_('auditoria.volver')}</span>
    </a>
    <h1>📜 {$_('auditoria.titulo')}</h1>
    <p class="text-secondary">{$_('auditoria.subtitulo')}</p>
  </header>

  <form method="GET" action="/auditoria" class="card filtros-card">
    <div class="filtros-grid">
      <div class="input-group">
        <label for="filtro-desde" class="label">{$_('auditoria.desde')}</label>
        <input id="filtro-desde" type="date" name="desde" value={data.filtros.desde} class="input-field" />
      </div>
      <div class="input-group">
        <label for="filtro-hasta" class="label">{$_('auditoria.hasta')}</label>
        <input id="filtro-hasta" type="date" name="hasta" value={data.filtros.hasta} class="input-field" />
      </div>
      <div class="input-group">
        <label for="filtro-usuario" class="label">{$_('auditoria.usuario')}</label>
        <select id="filtro-usuario" name="usuario" class="input-field">
          <option value="">{$_('auditoria.todosUsuarios')}</option>
          {#each data.usuariosFiltro as usuario}
            <option value={usuario.id} selected={data.filtros.usuario === String(usuario.id)}>
              {usuario.nombre}
            </option>
          {/each}
        </select>
      </div>
      <div class="input-group">
        <label for="filtro-accion" class="label">{$_('auditoria.accion')}</label>
        <select id="filtro-accion" name="accion" class="input-field">
          <option value="">{$_('auditoria.todasAcciones')}</option>
          {#each data.accionesDisponibles as accion}
            <option value={accion} selected={data.filtros.accion === accion}>{accion}</option>
          {/each}
        </select>
      </div>
    </div>
    <div class="filtros-acciones">
      <button type="submit" class="btn btn-primary btn-small">{$_('auditoria.aplicar')}</button>
      <a href="/auditoria" class="btn btn-secondary btn-small">{$_('auditoria.limpiar')}</a>
            <a
        href="/auditoria/exportar?desde={data.filtros.desde}&hasta={data.filtros.hasta}&usuario={data.filtros.usuario}&accion={data.filtros.accion}"
        class="btn btn-secondary btn-small"
        download
      >
        📥 {$_('auditoria.exportarCSV')}
      </a>
      <a
        href="/auditoria/exportar-pdf?desde={data.filtros.desde}&hasta={data.filtros.hasta}&usuario={data.filtros.usuario}&accion={data.filtros.accion}"
        class="btn btn-secondary btn-small"
        download
      >
        📄 {$_('auditoria.exportarPDF')}
      </a>
      <span class="text-secondary text-sm">{$_('auditoria.totalRegistros', { values: { total: data.total } })}</span>
    </div>
  </form>

  {#if data.registros.length === 0}
    <div class="card">
      <p class="text-secondary">{$_('auditoria.sinRegistros')}</p>
    </div>
  {:else}
    <div class="card tabla-card-auditoria">
      <table class="data-table">
        <thead>
          <tr>
            <th>{$_('auditoria.fecha')}</th>
            <th>{$_('auditoria.autor')}</th>
            <th>{$_('auditoria.accion')}</th>
            <th>{$_('auditoria.objetivo')}</th>
            <th>{$_('auditoria.ip')}</th>
            <th>{$_('auditoria.detalles')}</th>
          </tr>
        </thead>
        <tbody>
          {#each data.registros as registro (registro.id)}
            <tr>
              <td class="celda-fecha">{formatoFechaHora(registro.creada_en)}</td>
              <td>
                {#if registro.usuario_nombre}
                  {registro.usuario_nombre}
                {:else}
                  <span class="badge cat-otro">{$_('auditoria.sinSesion')}</span>
                {/if}
              </td>
              <td>
                <span class="badge cat-{categoriaDe(registro.accion)}" title={etiquetaCategoria(categoriaDe(registro.accion))}>
                  {registro.accion}
                </span>
              </td>
              <td class="text-secondary text-sm">
                {registro.tabla_afectada ?? '—'}{registro.registro_id ? ` #${registro.registro_id}` : ''}
              </td>
              <td class="text-secondary text-sm">{registro.ip ?? '—'}</td>
              <td>
                <details>
                  <summary class="resumen-detalles">JSON</summary>
                  <pre class="detalles-json">{detallesBonitos(registro.detalles)}</pre>
                </details>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <div class="paginacion">
      {#if data.pagina > 1}
        <a href={urlPagina(data.pagina - 1)} class="btn btn-secondary btn-small">← {$_('auditoria.anterior')}</a>
      {/if}
      <span class="text-secondary text-sm">
        {$_('auditoria.paginas', { values: { actual: data.pagina, total: data.totalPaginas } })}
      </span>
      {#if data.pagina < data.totalPaginas}
        <a href={urlPagina(data.pagina + 1)} class="btn btn-secondary btn-small">{$_('auditoria.siguiente')} →</a>
      {/if}
    </div>
  {/if}
</main>

<style>
  .filtros-card {
    margin-bottom: 1.5rem;
  }

  .filtros-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 180px), 1fr));
    gap: 1rem;
  }

  .filtros-acciones {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-top: 1rem;
    flex-wrap: wrap;
  }

  .tabla-card-auditoria {
    overflow-x: auto;
  }

  .celda-fecha {
    white-space: nowrap;
  }

  .cat-auth { background: var(--status-info-bg); color: var(--status-info-text); }
  .cat-inventario { background: var(--status-success-bg); color: var(--status-success-text); }
  .cat-perfil { background: var(--status-warning-bg); color: var(--status-warning-text); }
  .cat-admin { background: rgba(139, 92, 246, 0.15); color: var(--accent-purple); }
  .cat-otro { background: var(--bg-secondary); color: var(--text-secondary); }

  .resumen-detalles {
    cursor: pointer;
    color: var(--accent-primary);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
  }

  .detalles-json {
    margin: 0.5rem 0 0;
    padding: 0.75rem;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    font-size: var(--font-size-xs);
    overflow-x: auto;
    max-width: 420px;
  }

  .paginacion {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    margin-top: 1.5rem;
  }
</style>