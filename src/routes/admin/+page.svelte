<script lang="ts">
  import { enhance } from '$app/forms';
  import type { PageData } from './$types';
  import { _ } from 'svelte-i18n';

  type Usuario = PageData['usuarios'][number];
  type Modal = 'usuarios' | 'crearUsuario' | 'herramientas' | 'tabla' | 'cambiarRol' | 'eliminarUsuario' | 'editarProducto' | null;
  type ProductoEdicion = {
    id: number;
    nombre: string;
    descripcion: string;
    precio: number;
    stock_actual: number;
    stock_minimo: number;
    created_at: string;
    updated_at: string;
  };
  type TablaPreview = {
    nombre: string;
    columnas: string[];
    filas: Array<Record<string, unknown>>;
    total: number;
    limite: number;
    truncado: boolean;
  };

  let { data, form }: { data: PageData; form?: { success?: string; error?: string } } = $props();
  let modal = $state<Modal>(null);
  let tablaSeleccionada = $state('');
  let previewTabla = $state<TablaPreview | null>(null);
  let usuarioSeleccionado = $state<Usuario | null>(null);
  let productoEditando = $state<ProductoEdicion | null>(null);
  let stockObjetivo = $state(0);
  let rolSeleccionado = $state<'admin' | 'empleado'>('empleado');
  let cargandoTabla = $state(false);
  let errorTabla = $state('');

  async function abrirTabla(nombre: string) {
    modal = 'tabla';
    tablaSeleccionada = nombre;
    previewTabla = null;
    errorTabla = '';
    cargandoTabla = true;

    try {
      const params = new URLSearchParams({ tabla: nombre });
      const response = await fetch(`/api/admin/tablas?${params}`);
      if (!response.ok) {
        throw new Error($_('admin.errorTabla'));
      }
      previewTabla = await response.json() as TablaPreview;
    } catch (error) {
      errorTabla = error instanceof Error ? error.message : $_('admin.errorTabla');
    } finally {
      cargandoTabla = false;
    }
  }

  function abrirCambioRol(usuario: Usuario) {
    usuarioSeleccionado = usuario;
    rolSeleccionado = usuario.rol === 'admin' ? 'admin' : 'empleado';
    modal = 'cambiarRol';
  }

  function abrirEdicionProducto(fila: Record<string, unknown>) {
    if (
      typeof fila.id !== 'number' ||
      typeof fila.nombre !== 'string' ||
      typeof fila.precio !== 'number' ||
      typeof fila.stock_actual !== 'number' ||
      typeof fila.stock_minimo !== 'number' ||
      typeof fila.created_at !== 'string' ||
      typeof fila.updated_at !== 'string' ||
      (fila.descripcion !== null && typeof fila.descripcion !== 'string')
    ) {
      errorTabla = $_('admin.errorTabla');
      return;
    }

    productoEditando = {
      id: fila.id,
      nombre: fila.nombre,
      descripcion: typeof fila.descripcion === 'string' ? fila.descripcion : '',
      precio: fila.precio,
      stock_actual: fila.stock_actual,
      stock_minimo: fila.stock_minimo,
      created_at: fila.created_at,
      updated_at: fila.updated_at
    };
    stockObjetivo = fila.stock_actual;
    modal = 'editarProducto';
  }

  function cerrarModal() {
    modal = null;
    usuarioSeleccionado = null;
    productoEditando = null;
  }

  function cerrarConEscape(event: KeyboardEvent) {
    if (event.key === 'Escape') cerrarModal();
  }

  function formatoCelda(valor: unknown): string {
    if (valor === null || valor === undefined) return '—';
    if (typeof valor === 'object') return JSON.stringify(valor);
    return String(valor);
  }
</script>

<svelte:window onkeydown={cerrarConEscape} />

<svelte:head>
  <title>{$_('admin.titulo')} | StockPredict Pro</title>
</svelte:head>

<main class="page-container admin-page">
  <header class="page-header">
    <a href="/dashboard" class="btn-back">
      <span>←</span>
      <span>{$_('admin.volver')}</span>
    </a>
    <h1>{$_('admin.titulo')}</h1>
    <p class="text-secondary">{$_('admin.subtitulo')}</p>
  </header>

  {#if form?.success}
    <div class="alert alert-success">
      ✅ {$_(`admin.${form.success === 'usuario_creado' ? 'usuarioCreado' : form.success === 'rol_actualizado' ? 'rolActualizado' : form.success === 'usuario_eliminado' ? 'usuarioEliminado' : form.success === 'producto_actualizado' ? 'productoActualizado' : 'prediccionesRecalculadas'}`)}
    </div>
  {/if}

  {#if form?.error}
    <div class="alert alert-danger">{$_(form.error)}</div>
  {/if}

  <section class="admin-actions" aria-label={$_('admin.acciones')}>
    <button class="action-card" type="button" onclick={() => modal = 'usuarios'}>
      <span class="action-icon" aria-hidden="true">👥</span>
      <span class="action-title">{$_('admin.usuarios')}</span>
      <span class="action-description">{data.usuarios.length} {$_('admin.usuariosRegistrados')}</span>
    </button>
    <button class="action-card" type="button" onclick={() => modal = 'crearUsuario'}>
      <span class="action-icon" aria-hidden="true">＋</span>
      <span class="action-title">{$_('admin.crearUsuario')}</span>
      <span class="action-description">{$_('admin.abrirAccion')}</span>
    </button>
    <button class="action-card" type="button" onclick={() => modal = 'herramientas'}>
      <span class="action-icon" aria-hidden="true">⚙</span>
      <span class="action-title">{$_('admin.herramientas')}</span>
      <span class="action-description">{$_('admin.abrirAccion')}</span>
    </button>
  </section>

  <section class="card tables-card">
    <div class="section-heading">
      <div>
        <h2>{$_('admin.tablas')}</h2>
        <p class="text-secondary">{$_('admin.descripcionTablas')}</p>
      </div>
      <span class="table-count">{data.tablas.length}</span>
    </div>

    {#if data.tablas.length === 0}
      <p class="text-secondary">{$_('admin.sinTablas')}</p>
    {:else}
      <div class="tables-grid">
        {#each data.tablas as tabla}
          <article class="table-card">
            <div>
              <h3>{tabla.nombre}</h3>
              <p class="text-secondary">
                {tabla.registros} {$_('admin.registros')} · {tabla.columnas} {$_('admin.columnas')}
              </p>
            </div>
            <button class="btn btn-secondary" type="button" onclick={() => abrirTabla(tabla.nombre)}>
              {$_('admin.verRegistros')}
            </button>
          </article>
        {/each}
      </div>
    {/if}
  </section>
</main>

{#if modal}
  <div class="modal-backdrop">
    <dialog
      open
      class="modal-window"
      class:table-modal-window={modal === 'tabla'}
      aria-modal="true"
      aria-labelledby="modal-title"
      tabindex="-1"
    >
      <header class="modal-header">
        <h2 id="modal-title">
          {#if modal === 'usuarios'}
            {$_('admin.usuarios')}
          {:else if modal === 'crearUsuario'}
            {$_('admin.crearUsuario')}
          {:else if modal === 'herramientas'}
            {$_('admin.herramientas')}
          {:else if modal === 'tabla'}
            {$_('admin.registrosDe')} {tablaSeleccionada}
          {:else if modal === 'cambiarRol'}
            {$_('admin.cambiarRol')}
          {:else if modal === 'editarProducto'}
            {$_('admin.editarProducto')}
          {:else}
            {$_('admin.confirmarEliminar')}
          {/if}
        </h2>
        <button class="modal-close" type="button" aria-label={$_('admin.cerrar')} onclick={cerrarModal}>×</button>
      </header>

      {#if form?.error}
        <p class="alert alert-danger" role="alert">{$_(form.error)}</p>
      {:else if form?.success}
        <p class="alert alert-success" role="status">{$_('admin.operacionCompleta')}</p>
      {/if}

      {#if modal === 'usuarios'}
        {#if data.usuarios.length === 0}
          <p class="text-secondary">{$_('admin.sinUsuarios')}</p>
        {:else}
          <div class="modal-table-scroll">
            <table class="data-table">
              <thead>
                <tr>
                  <th>{$_('comunes.nombre')}</th>
                  <th>{$_('perfil.email')}</th>
                  <th>{$_('admin.rol')}</th>
                  <th>{$_('admin.acciones')}</th>
                </tr>
              </thead>
              <tbody>
                {#each data.usuarios as usuario}
                  <tr>
                    <td>{usuario.nombre}</td>
                    <td>{usuario.email}</td>
                    <td>
                      <span class="badge" class:badge-admin={usuario.rol === 'admin'} class:badge-empleado={usuario.rol === 'empleado'}>
                        {usuario.rol === 'admin' ? $_('perfil.admin') : $_('perfil.empleado')}
                      </span>
                    </td>
                    <td class="row-actions">
                      <button class="btn btn-small btn-primary" type="button" onclick={() => abrirCambioRol(usuario)}>
                        {$_('admin.cambiarRol')}
                      </button>
                      <button
                        class="btn btn-small btn-danger"
                        type="button"
                        disabled={usuario.id === data.usuarioActualId}
                        onclick={() => {
                          usuarioSeleccionado = usuario;
                          modal = 'eliminarUsuario';
                        }}
                      >
                        {$_('botones.eliminar')}
                      </button>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      {:else if modal === 'crearUsuario'}
        <form method="POST" action="?/crearUsuario" use:enhance class="form-stack">
          <div class="input-group">
            <label for="nombre" class="label">{$_('admin.nombreCompleto')}</label>
            <input id="nombre" type="text" name="nombre" required class="input-field" placeholder={$_('comunes.ejemploNombre')} />
          </div>
          <div class="input-group">
            <label for="email" class="label">{$_('admin.correo')}</label>
            <input id="email" type="email" name="email" required class="input-field" placeholder={$_('comunes.ejemploEmail')} />
          </div>
          <div class="input-group">
            <label for="password" class="label">{$_('admin.passwordInicial')}</label>
            <input id="password" type="password" name="password" required minlength="6" class="input-field" placeholder={$_('perfil.minimoCaracteres')} />
          </div>
          <div class="input-group">
            <label for="rol" class="label">{$_('admin.rol')}</label>
            <select id="rol" name="rol" class="input-field">
              <option value="empleado">{$_('perfil.empleado')}</option>
              <option value="admin">{$_('perfil.admin')}</option>
            </select>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" onclick={cerrarModal}>{$_('botones.cancelar')}</button>
            <button type="submit" class="btn btn-primary">{$_('admin.crearUsuarioBoton')}</button>
          </div>
        </form>
      {:else if modal === 'herramientas'}
        <p class="text-secondary">{$_('admin.descripcionHerramientas')}</p>
        <form method="POST" action="?/recalcularPredicciones" use:enhance class="modal-actions">
          <button type="button" class="btn btn-secondary" onclick={cerrarModal}>{$_('botones.cancelar')}</button>
          <button type="submit" class="btn btn-warning">🔄 {$_('admin.recalcular')}</button>
        </form>
      {:else if modal === 'tabla'}
        {#if cargandoTabla}
          <p class="text-secondary">{$_('admin.cargandoTabla')}</p>
        {:else if errorTabla}
          <p class="alert alert-danger">{errorTabla}</p>
        {:else if previewTabla}
          <p class="text-secondary table-summary">
            {previewTabla.total} {$_('admin.registros')}
            {#if previewTabla.truncado}
              · {$_('admin.limiteRegistros', { values: { limite: previewTabla.limite } })}
            {/if}
          </p>
          {#if previewTabla.filas.length === 0}
            <p class="text-secondary">{$_('admin.tablaVacia')}</p>
          {:else}
            <div class="modal-table-scroll">
              <table class="data-table records-table">
                <thead>
                  <tr>
                    {#each previewTabla.columnas as columna}
                      <th>{columna}</th>
                    {/each}
                    {#if tablaSeleccionada === 'productos'}
                      <th>{$_('admin.acciones')}</th>
                    {/if}
                  </tr>
                </thead>
                <tbody>
                  {#each previewTabla.filas as fila}
                    <tr>
                      {#each previewTabla.columnas as columna}
                        <td>{formatoCelda(fila[columna])}</td>
                      {/each}
                      {#if tablaSeleccionada === 'productos'}
                        <td>
                          <button
                            class="btn btn-small btn-primary"
                            type="button"
                            onclick={() => abrirEdicionProducto(fila)}
                          >
                            {$_('botones.editar')}
                          </button>
                        </td>
                      {/if}
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {/if}
        {/if}
      {:else if modal === 'editarProducto' && productoEditando}
        <form
          method="POST"
          action="?/editarProducto"
          use:enhance={() => async ({ result, update }) => {
            await update();
            if (result.type === 'success') await abrirTabla('productos');
          }}
          class="product-edit-form"
        >
          <input type="hidden" name="producto_id" value={productoEditando.id} />
          <p class="text-secondary metadata-note">
            ID {productoEditando.id} · {$_('admin.productoMetadatosSoloLectura')} ·
            {productoEditando.created_at} · {productoEditando.updated_at}
          </p>
          <div class="input-group">
            <label for="producto-nombre" class="label">{$_('productos.nombre')}</label>
            <input id="producto-nombre" name="nombre" class="input-field" value={productoEditando.nombre} required />
          </div>
          <div class="input-group">
            <label for="producto-descripcion" class="label">{$_('productos.descripcion')}</label>
            <textarea id="producto-descripcion" name="descripcion" class="input-field" rows="3" value={productoEditando.descripcion}></textarea>
          </div>
          <div class="product-edit-grid">
            <div class="input-group">
              <label for="producto-precio" class="label">{$_('productos.precio')}</label>
              <input id="producto-precio" name="precio" type="number" class="input-field" min="0" step="0.01" value={productoEditando.precio} required />
            </div>
            <div class="input-group">
              <label for="producto-stock" class="label">{$_('productos.stockActual')}</label>
              <input id="producto-stock" name="stock_actual" type="number" class="input-field" min="0" step="1" bind:value={stockObjetivo} required />
            </div>
            <div class="input-group">
              <label for="producto-minimo" class="label">{$_('productos.stockMinimo')}</label>
              <input id="producto-minimo" name="stock_minimo" type="number" class="input-field" min="0" step="1" value={productoEditando.stock_minimo} required />
            </div>
          </div>
          {#if stockObjetivo > productoEditando.stock_actual}
            <p class="text-secondary">{$_('admin.stockAumentaAviso')}</p>
            <div class="input-group">
              <label for="producto-lote" class="label">{$_('productos.numeroLote')}</label>
              <input id="producto-lote" name="numero_lote" class="input-field" required />
            </div>
            <div class="input-group">
              <label for="producto-caducidad" class="label">{$_('productos.fechaCaducidad')}</label>
              <input id="producto-caducidad" name="fecha_caducidad" type="date" class="input-field" required />
            </div>
          {/if}
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" onclick={cerrarModal}>{$_('botones.cancelar')}</button>
            <button type="submit" class="btn btn-primary">{$_('admin.guardarProducto')}</button>
          </div>
        </form>
      {:else if modal === 'cambiarRol' && usuarioSeleccionado}
        <form method="POST" action="?/cambiarRol" use:enhance class="form-stack">
          <input type="hidden" name="userId" value={usuarioSeleccionado.id} />
          <p>{usuarioSeleccionado.nombre} · {usuarioSeleccionado.email}</p>
          <div class="input-group">
            <label for="nuevo-rol" class="label">{$_('admin.rol')}</label>
            <select id="nuevo-rol" name="rol" class="input-field" bind:value={rolSeleccionado}>
              <option value="admin">{$_('perfil.admin')}</option>
              <option value="empleado">{$_('perfil.empleado')}</option>
            </select>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" onclick={cerrarModal}>{$_('botones.cancelar')}</button>
            <button type="submit" class="btn btn-primary">{$_('admin.actualizar')}</button>
          </div>
        </form>
      {:else if modal === 'eliminarUsuario' && usuarioSeleccionado}
        <p>{$_('admin.confirmarEliminar')} <strong>{usuarioSeleccionado.nombre}</strong>?</p>
        <form method="POST" action="?/eliminarUsuario" use:enhance class="modal-actions">
          <input type="hidden" name="userId" value={usuarioSeleccionado.id} />
          <button type="button" class="btn btn-secondary" onclick={cerrarModal}>{$_('botones.cancelar')}</button>
          <button type="submit" class="btn btn-danger">{$_('botones.eliminar')}</button>
        </form>
      {/if}
    </dialog>
  </div>
{/if}

<style>
  .page-header {
    margin-bottom: 2rem;
  }

  .admin-actions,
  .tables-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 230px), 1fr));
    gap: 1rem;
  }

  .admin-actions {
    margin-bottom: 2rem;
  }

  .action-card,
  .table-card {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 1.25rem;
    border: 1px solid var(--border-color);
    border-radius: 10px;
    background: var(--bg-card);
    color: var(--text-primary);
    text-align: left;
  }

  .action-card {
    cursor: pointer;
    font: inherit;
    transition: border-color 0.2s, transform 0.2s;
  }

  .action-card:hover {
    transform: translateY(-2px);
    border-color: var(--accent-primary);
  }

  .action-icon {
    font-size: 1.5rem;
  }

  .action-title {
    font-weight: var(--font-weight-semibold);
  }

  .action-description,
  .table-card p,
  .section-heading p {
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
  }

  .tables-card {
    padding: 1.5rem;
    border: 1px solid var(--border-color);
    border-radius: 10px;
    background: var(--bg-card);
  }

  .section-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1.25rem;
  }

  .section-heading h2,
  .table-card h3 {
    margin: 0 0 0.35rem;
  }

  .table-count {
    display: grid;
    width: 2.5rem;
    height: 2.5rem;
    place-items: center;
    border-radius: 50%;
    background: var(--status-info-bg);
    color: var(--status-info-text);
    font-weight: var(--font-weight-bold);
  }

  .table-card {
    justify-content: space-between;
    min-width: 0;
  }

  .modal-backdrop {
    position: fixed;
    z-index: 1000;
    inset: 0;
    display: grid;
    place-items: center;
    padding: 1rem;
    background: rgb(15 23 42 / 65%);
  }

  .modal-window {
    margin: auto;
    width: min(100%, 950px);
    max-height: min(90vh, 900px);
    overflow: auto;
    padding: 1.5rem;
    border: 1px solid var(--border-color);
    border-radius: 12px;
    background: var(--bg-card);
    color: var(--text-primary);
    box-shadow: var(--shadow-popover);
  }

  .modal-window.table-modal-window {
    width: fit-content;
    min-width: min(100%, 950px);
    max-width: calc(100vw - 2rem);
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1.25rem;
  }

  .modal-header h2 {
    margin: 0;
    overflow-wrap: anywhere;
  }

  .modal-close {
    display: grid;
    width: 2.25rem;
    height: 2.25rem;
    flex: 0 0 auto;
    place-items: center;
    border: 0;
    border-radius: 6px;
    background: var(--bg-secondary);
    color: var(--text-primary);
    font-size: 1.5rem;
    cursor: pointer;
  }

  .modal-table-scroll {
    width: max-content;
    max-width: 100%;
    max-height: 60vh;
    overflow: auto;
    border: 1px solid var(--border-color);
    border-radius: 8px;
  }

  .modal-table-scroll .records-table {
    width: max-content;
    min-width: 100%;
    border-collapse: collapse;
    table-layout: auto;
  }

  .modal-table-scroll th,
  .modal-table-scroll td {
    padding: 0.7rem;
    border-bottom: 1px solid var(--border-color);
    text-align: left;
    vertical-align: top;
    white-space: nowrap;
  }

  .modal-table-scroll td {
    max-width: min(40vw, 560px);
    overflow-wrap: anywhere;
    white-space: normal;
  }

  .modal-table-scroll th {
    position: sticky;
    top: 0;
    background: var(--bg-secondary);
    white-space: nowrap;
  }

  .table-summary {
    margin-bottom: 1rem;
  }

  .product-edit-form {
    display: grid;
    gap: 1rem;
  }

  .product-edit-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 180px), 1fr));
    gap: 1rem;
  }

  .metadata-note {
    margin: 0;
    font-size: var(--font-size-sm);
  }

  .modal-actions,
  .row-actions {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.6rem;
  }

  .modal-actions {
    justify-content: flex-end;
    margin-top: 1.25rem;
  }

  .row-actions {
    min-width: 170px;
  }

  .badge-admin,
  .badge-empleado {
    padding: 0.25rem 0.6rem;
    border-radius: 999px;
    font-size: var(--font-size-sm);
  }

  .badge-admin {
    background: var(--status-info-bg);
    color: var(--status-info-text);
  }

  .badge-empleado {
    background: var(--status-success-bg);
    color: var(--status-success-text);
  }

  @media (max-width: 600px) {
    .modal-window {
      padding: 1rem;
    }

    .modal-window.table-modal-window {
      min-width: 0;
      width: fit-content;
      max-width: calc(100vw - 2rem);
    }

    .action-card {
      min-height: 140px;
    }
  }
</style>
