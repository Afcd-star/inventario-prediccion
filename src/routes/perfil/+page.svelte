<script lang="ts">
  import type { PageData } from './$types';
  import { _, locale } from 'svelte-i18n';

  let { data, form }: { data: PageData; form?: { success?: string; error?: string } } = $props();
</script>

<svelte:head>
  <title>{$_('perfil.titulo')} | StockPredict Pro</title>
</svelte:head>

<main class="page-container page-container--narrow">
  <header class="page-header">
    <a href="/dashboard" class="btn-back">
      <span>←</span>
      <span>{$_('perfil.volver')}</span>
    </a>
    <h1>{$_('perfil.titulo')}</h1>
    <p class="text-secondary">{$_('perfil.subtitulo')}</p>
  </header>

  <!-- Mensajes de feedback -->
  {#if form?.success === 'perfil_actualizado'}
    <div class="alert alert-success">
      ✅ {$_('perfil.perfilActualizado')}
    </div>
  {:else if form?.success === 'password_cambiado'}
    <div class="alert alert-success">
      ✅ {$_('perfil.passwordCambiado')}
    </div>
  {/if}

  {#if form?.error}
    <div class="alert alert-danger">
      ️ {$_(form.error)}
    </div>
  {/if}

  <div class="profile-grid">
    <!-- Información del Usuario -->
    <section class="card">
      <h2>{$_('perfil.infoPersonal')}</h2>
      <div class="profile-info">
        <div class="info-row">
          <span class="info-label">{$_('perfil.nombre')}:</span>
          <span class="info-value">{data.usuario.nombre}</span>
        </div>
        <div class="info-row">
          <span class="info-label">{$_('perfil.email')}:</span>
          <span class="info-value">{data.usuario.email}</span>
        </div>
        <div class="info-row">
          <span class="info-label">{$_('perfil.rol')}:</span>
          <span class="badge badge-info">
            {data.usuario.rol === 'admin' ? $_('perfil.admin') : $_('perfil.empleado')}
          </span>
        </div>
        <div class="info-row">
          <span class="info-label">{$_('perfil.miembroDesde')}:</span>
          <span class="info-value">{new Date(data.usuario.created_at).toLocaleDateString($locale === 'en' ? 'en-US' : 'es-ES')}</span>
        </div>
      </div>
    </section>

    <!-- Actualizar Nombre -->
    <section class="card">
      <h2>{$_('perfil.actualizarNombre')}</h2>
      <form method="POST" action="?/actualizarPerfil" class="form-stack">
        <div class="input-group">
          <label for="nombre" class="label">{$_('perfil.nombreCompleto')}</label>
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
          {$_('perfil.guardarCambios')}
        </button>
      </form>
    </section>

    <!-- Cambiar Contraseña -->
    <section class="card">
      <h2>{$_('perfil.cambiarPassword')}</h2>
      <form method="POST" action="?/cambiarPassword" class="form-stack">
        <div class="input-group">
          <label for="password_actual" class="label">{$_('perfil.passwordActual')}</label>
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
          <label for="password_nuevo" class="label">{$_('perfil.passwordNuevo')}</label>
          <input
            id="password_nuevo"
            type="password"
            name="password_nuevo"
            required
            minlength="6"
            class="input-field"
            placeholder={$_('perfil.minimoCaracteres')}
          />
        </div>
        <div class="input-group">
          <label for="password_confirmar" class="label">{$_('perfil.passwordConfirmar')}</label>
          <input
            id="password_confirmar"
            type="password"
            name="password_confirmar"
            required
            minlength="6"
            class="input-field"
            placeholder={$_('perfil.repetirPassword')}
          />
        </div>
        <button type="submit" class="btn btn-primary">
          {$_('perfil.cambiarPassword')}
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