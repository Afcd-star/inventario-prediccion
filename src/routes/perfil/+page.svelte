<script lang="ts">
  import type { PageData } from './$types';

  let { data, form }: { data: PageData; form?: { success?: string; error?: string } } = $props();
</script>

<svelte:head>
  <title>Mi Perfil | StockPredict Pro</title>
</svelte:head>

<main class="page-container page-container--narrow">
  <header class="page-header">
    <a href="/dashboard" class="btn-back">
      <span>←</span>
      <span>Volver al Dashboard</span>
    </a>
    <h1>Mi Perfil</h1>
    <p class="text-secondary">Gestiona tu información personal y seguridad</p>
  </header>

  <!-- Mensajes de feedback -->
  {#if form?.success === 'perfil_actualizado'}
    <div class="alert alert-success">
      ✅ Perfil actualizado exitosamente.
    </div>
  {:else if form?.success === 'password_cambiado'}
    <div class="alert alert-success">
      ✅ Contraseña cambiada exitosamente.
    </div>
  {/if}

  {#if form?.error}
    <div class="alert alert-danger">
      ️ {form.error}
    </div>
  {/if}

  <div class="profile-grid">
    <!-- Información del Usuario -->
    <section class="card">
      <h2>Información Personal</h2>
      <div class="profile-info">
        <div class="info-row">
          <span class="info-label">Nombre:</span>
          <span class="info-value">{data.usuario.nombre}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Email:</span>
          <span class="info-value">{data.usuario.email}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Rol:</span>
          <span class="badge badge-info">
            {data.usuario.rol === 'admin' ? 'Administrador' : 'Empleado'}
          </span>
        </div>
        <div class="info-row">
          <span class="info-label">Miembro desde:</span>
          <span class="info-value">{new Date(data.usuario.created_at).toLocaleDateString('es-ES')}</span>
        </div>
      </div>
    </section>

    <!-- Actualizar Nombre -->
    <section class="card">
      <h2>Actualizar Nombre</h2>
      <form method="POST" action="?/actualizarPerfil" class="form-stack">
        <div class="input-group">
          <label for="nombre" class="label">Nombre completo</label>
          <input
            id="nombre"
            type="text"
            name="nombre"
            value={data.usuario.nombre}
            required
            class="input-field"
          />
        </div>
        <button type="submit" class="btn btn-primary">
          Guardar Cambios
        </button>
      </form>
    </section>

    <!-- Cambiar Contraseña -->
    <section class="card">
      <h2>Cambiar Contraseña</h2>
      <form method="POST" action="?/cambiarPassword" class="form-stack">
        <div class="input-group">
          <label for="password_actual" class="label">Contraseña actual</label>
          <input
            id="password_actual"
            type="password"
            name="password_actual"
            required
            class="input-field"
            placeholder="••••••••"
          />
        </div>
        <div class="input-group">
          <label for="password_nuevo" class="label">Nueva contraseña</label>
          <input
            id="password_nuevo"
            type="password"
            name="password_nuevo"
            required
            minlength="6"
            class="input-field"
            placeholder="Mínimo 6 caracteres"
          />
        </div>
        <div class="input-group">
          <label for="password_confirmar" class="label">Confirmar nueva contraseña</label>
          <input
            id="password_confirmar"
            type="password"
            name="password_confirmar"
            required
            minlength="6"
            class="input-field"
            placeholder="Repite la nueva contraseña"
          />
        </div>
        <button type="submit" class="btn btn-primary">
          Cambiar Contraseña
        </button>
      </form>
    </section>
  </div>
</main>

<style>
  .page-header {
    margin-bottom: 2rem;
  }

  .profile-grid {
    display: grid;
    gap: 2rem;
  }

  .profile-info {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .info-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem;
    background: var(--bg-secondary);
    border-radius: 6px;
  }

  .info-label {
    font-weight: var(--font-weight-semibold);
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
  }

  .info-value {
    color: var(--text-primary);
    font-weight: var(--font-weight-medium);
  }

</style>