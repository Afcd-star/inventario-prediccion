<script lang="ts">
  import type { PageData } from './$types';
  import { _ } from 'svelte-i18n';

  let { data, form }: { data: PageData; form?: { success?: string; error?: string } } = $props();
</script>

<svelte:head>
  <title>{$_('admin.titulo')} | StockPredict Pro</title>
</svelte:head>

<main class="page-container">
  <header class="page-header">
    <a href="/dashboard" class="btn-back">
      <span>←</span>
      <span>{$_('admin.volver')}</span>
    </a>
    <h1>{$_('admin.titulo')}</h1>
    <p class="text-secondary">{$_('admin.subtitulo')}</p>
  </header>

  <!-- Mensajes de feedback -->
  {#if form?.success === 'usuario_creado'}
    <div class="alert alert-success">
      ✅ {$_('admin.usuarioCreado')}
    </div>
  {:else if form?.success === 'rol_actualizado'}
    <div class="alert alert-success">
      ✅ {$_('admin.rolActualizado')}
    </div>
  {:else if form?.success === 'usuario_eliminado'}
    <div class="alert alert-success">
      🗑️ {$_('admin.usuarioEliminado')}
    </div>
  {:else if form?.success === 'predicciones_recalculadas'}
    <div class="alert alert-success">
       {$_('admin.prediccionesRecalculadas')}
    </div>
  {/if}

  {#if form?.error}
    <div class="alert alert-danger">
      ️ {$_(form.error)}
    </div>
  {/if}

  <div class="admin-grid">
    <!-- Lista de Usuarios -->
    <section class="card">
      <h2>{$_('admin.usuarios')}</h2>
      {#if data.usuarios.length === 0}
        <p class="text-secondary">{$_('admin.sinUsuarios')}</p>
      {:else}
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
                <td class="actions-cell">
                  <form method="POST" action="?/cambiarRol" class="inline-form">
                    <input type="hidden" name="userId" value={usuario.id} />
                    <select name="rol" class="input-field select-rol">
                      <option value="admin" selected={usuario.rol === 'admin'}>{$_('admin.adminCorto')}</option>
                      <option value="empleado" selected={usuario.rol === 'empleado'}>{$_('perfil.empleado')}</option>
                    </select>
                    <button type="submit" class="btn btn-small btn-primary">{$_('admin.actualizar')}</button>
                  </form>
                  <form method="POST" action="?/eliminarUsuario" class="inline-form" onsubmit={(e) => {
                    if (!confirm($_('admin.confirmarEliminar'))) e.preventDefault();
                  }}>
                    <input type="hidden" name="userId" value={usuario.id} />
                    <button type="submit" class="btn btn-small btn-danger">{$_('botones.eliminar')}</button>
                  </form>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
    </section>

    <!-- Crear Nuevo Usuario -->
    <section class="card">
      <h2>{$_('admin.crearUsuario')}</h2>
      <form method="POST" action="?/crearUsuario" class="form-stack">
        <div class="input-group">
          <label for="nombre" class="label">{$_('admin.nombreCompleto')}</label>
          <input
            id="nombre"
            type="text"
            name="nombre"
            required
            class="input-field"
            placeholder={$_('comunes.ejemploNombre')}
          />
        </div>
        <div class="input-group">
          <label for="email" class="label">{$_('admin.correo')}</label>
          <input
            id="email"
            type="email"
            name="email"
            required
            class="input-field"
            placeholder={$_('comunes.ejemploEmail')}
          />
        </div>
        <div class="input-group">
          <label for="password" class="label">{$_('admin.passwordInicial')}</label>
          <input
            id="password"
            type="password"
            name="password"
            required
            minlength="6"
            class="input-field"
            placeholder={$_('perfil.minimoCaracteres')}
          />
        </div>
        <div class="input-group">
          <label for="rol" class="label">{$_('admin.rol')}</label>
          <select id="rol" name="rol" class="input-field">
            <option value="empleado">{$_('perfil.empleado')}</option>
            <option value="admin">{$_('perfil.admin')}</option>
          </select>
        </div>
        <button type="submit" class="btn btn-primary">
          {$_('admin.crearUsuarioBoton')}
        </button>
      </form>
    </section>

    <!-- Herramientas del Sistema -->
    <section class="card">
      <h2>{$_('admin.herramientas')}</h2>
      <p class="text-secondary" style:marginBottom="1rem">
        {$_('admin.descripcionHerramientas')}
      </p>
      <form method="POST" action="?/recalcularPredicciones">
        <button type="submit" class="btn btn-warning">
          🔄 {$_('admin.recalcular')}
        </button>
      </form>
    </section>
  </div>
</main>

<style>
  .page-header {
    margin-bottom: 2rem;
  }

  .admin-grid {
    display: grid;
    gap: 2rem;
  }

  .actions-cell {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .inline-form {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .select-rol {
    width: auto;
    padding: 0.5rem;
    font-size: var(--font-size-sm);
  }

</style>