<script lang="ts">
  import { enhance } from '$app/forms';
  import type { SubmitFunction } from '@sveltejs/kit';
  import { cambiarIdioma } from '$lib/i18n';
  import { _, locale } from 'svelte-i18n';

  interface Props {
    usuario: {
      id: number;
      nombre: string;
      email: string;
      rol: string;
      created_at: string;
      idioma_preferido: string;
      tema_preferido: string;
    };
    form?: {
      success?: string;
      error?: string;
      campo?: string;
    };
    onSuccess: () => void;
  }

  let { usuario, form, onSuccess }: Props = $props();

  let cambiarPassword = $state(false);
  let passwordNuevo = $state('');
  let formEnviando = $state(false);

  // Tipado correcto para SvelteKit enhance
  const handleFormSubmit: SubmitFunction = () => {
    formEnviando = true;
    return async ({ result, update }) => {
      formEnviando = false;
      if (result.type === 'success') {
        onSuccess();
      }
      await update();
    };
  };

  function errorCampo(campo: string): string | null {
    if (form?.error && form.campo === campo) return $_(form.error);
    return null;
  }

  const reglas = $derived([
    { texto: 'perfil.reglaLongitud', cumple: passwordNuevo.length >= 8 },
    { texto: 'perfil.reglaMayuscula', cumple: /[A-Z]/.test(passwordNuevo) },
    { texto: 'perfil.reglaMinuscula', cumple: /[a-z]/.test(passwordNuevo) },
    { texto: 'perfil.reglaNumero', cumple: /[0-9]/.test(passwordNuevo) },
    { texto: 'perfil.reglaSimbolo', cumple: /[^A-Za-z0-9]/.test(passwordNuevo) }
  ]);
  const fortaleza = $derived(reglas.filter(regla => regla.cumple).length);

  async function seleccionarIdioma(idioma: string) {
    if (idioma === 'es' || idioma === 'en') await cambiarIdioma(idioma);
  }

  function seleccionarTema(tema: string) {
    if (tema !== 'light' && tema !== 'dark') return;
    document.documentElement.setAttribute('data-theme', tema);
    localStorage.setItem('tema', tema);
  }

  function formatoFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString($locale === 'en' ? 'en-US' : 'es-ES');
  }
</script>

<div class="editar-contenido">
  <section class="info-actual" aria-label={$_('perfil.infoPersonal')}>
    <h3>{$_('perfil.infoActual')}</h3>
    <div class="dato">
      <span>{$_('perfil.nombre')}</span>
      <strong>{usuario.nombre}</strong>
    </div>
    <div class="dato">
      <span>{$_('perfil.email')}</span>
      <strong>{usuario.email}</strong>
    </div>
    <div class="dato">
      <span>{$_('perfil.rol')}</span>
      <strong>{usuario.rol === 'admin' ? $_('perfil.admin') : $_('perfil.empleado')}</strong>
    </div>
    <div class="dato">
      <span>{$_('perfil.miembroDesde')}</span>
      <strong>{formatoFecha(usuario.created_at)}</strong>
    </div>
  </section>

  <form method="POST" action="?/editarPerfil" use:enhance={handleFormSubmit} class="form-stack">
    <h3>{$_('perfil.editarDatos')}</h3>

    <div class="input-group">
      <label for="editar-nombre" class="label">{$_('perfil.nombreCompleto')}</label>
      <input id="editar-nombre" type="text" name="nombre" value={usuario.nombre} required minlength="3" class="input-field" />
      {#if errorCampo('nombre')}
        <p class="error-campo">⚠ {errorCampo('nombre')}</p>
      {/if}
    </div>

    <div class="input-group">
      <label for="editar-email" class="label">{$_('perfil.email')}</label>
      <input id="editar-email" type="email" name="email" value={usuario.email} required class="input-field" />
      {#if errorCampo('email')}
        <p class="error-campo">⚠ {errorCampo('email')}</p>
      {/if}
    </div>

    <div class="preferencias-grid">
      <div class="input-group">
        <label for="editar-idioma" class="label">{$_('perfil.idioma')}</label>
        <select id="editar-idioma" name="idioma" class="input-field" value={usuario.idioma_preferido} onchange={(event) => seleccionarIdioma(event.currentTarget.value)}>
          <option value="es">🇪🇸 Español</option>
          <option value="en">🇺🇸 English</option>
        </select>
      </div>
      <div class="input-group">
        <label for="editar-tema" class="label">{$_('perfil.tema')}</label>
        <select id="editar-tema" name="tema" class="input-field" value={usuario.tema_preferido} onchange={(event) => seleccionarTema(event.currentTarget.value)}>
          <option value="light">☀️ {$_('nav.modoClaro')}</option>
          <option value="dark">🌙 {$_('nav.modoOscuro')}</option>
        </select>
      </div>
    </div>

    <div class="checkbox-group">
      <label class="checkbox-label">
        <input type="checkbox" name="cambiar_password" bind:checked={cambiarPassword} />
        <span>{$_('perfil.cambiarPasswordCheckbox')}</span>
      </label>
    </div>

    {#if cambiarPassword}
      <div class="password-section" aria-label={$_('perfil.cambiarPassword')}>
        <div class="input-group">
          <label for="editar-password-actual" class="label">{$_('perfil.passwordActual')}</label>
          <input id="editar-password-actual" type="password" name="password_actual" class="input-field" autocomplete="current-password" />
          {#if errorCampo('password_actual')}
            <p class="error-campo">⚠ {errorCampo('password_actual')}</p>
          {/if}
        </div>

        <div class="input-group">
          <label for="editar-password-nuevo" class="label">{$_('perfil.passwordNuevo')}</label>
          <input id="editar-password-nuevo" type="password" name="password_nuevo" minlength="8" class="input-field" bind:value={passwordNuevo} autocomplete="new-password" />
          {#if errorCampo('password_nuevo')}
            <p class="error-campo">⚠ {errorCampo('password_nuevo')}</p>
          {/if}
          {#if passwordNuevo.length > 0}
            <div class="fortaleza-medidor">
              <div class="fortaleza-barra">
                <div class="fortaleza-nivel" class:nivel-1={fortaleza === 1} class:nivel-2={fortaleza === 2} class:nivel-3={fortaleza === 3} class:nivel-4={fortaleza === 4} class:nivel-5={fortaleza === 5} style:width={`${(fortaleza / 5) * 100}%`}></div>
              </div>
              <p class="text-sm">{$_('perfil.fortaleza')}: <strong>{fortaleza}/5</strong></p>
              <ul>
                {#each reglas as regla}
                  <li class:regla-cumple={regla.cumple}>
                    {regla.cumple ? '✓' : '○'} {$_(regla.texto)}
                  </li>
                {/each}
              </ul>
            </div>
          {/if}
        </div>

        <div class="input-group">
          <label for="editar-password-confirmar" class="label">{$_('perfil.passwordConfirmar')}</label>
          <input id="editar-password-confirmar" type="password" name="password_confirmar" minlength="8" class="input-field" autocomplete="new-password" />
          {#if errorCampo('password_confirmar')}
            <p class="error-campo">⚠ {errorCampo('password_confirmar')}</p>
          {/if}
        </div>
      </div>
    {/if}

    <div class="form-actions">
      <button type="button" class="btn btn-secondary" onclick={onSuccess}>
        {$_('botones.cancelar')}
      </button>
      <button type="submit" class="btn btn-primary" disabled={formEnviando}>
        {#if formEnviando}
          ⏳ {$_('comunes.cargando')}
        {:else}
          {$_('perfil.guardarCambios')}
        {/if}
      </button>
    </div>
  </form>
</div>

<style>
  /* (Mismo CSS que me enviaste, está perfecto) */
  .editar-contenido { display: grid; gap: 1.5rem; }
  .info-actual { padding: 1rem; background: var(--bg-secondary); border-radius: 8px; }
  .info-actual h3 { margin: 0 0 0.75rem; font-size: var(--font-size-sm); color: var(--text-secondary); }
  .dato { display: flex; justify-content: space-between; gap: 1rem; padding: 0.5rem 0; border-bottom: 1px solid var(--border-color); }
  .dato:last-child { border-bottom: none; }
  .dato span { color: var(--text-secondary); font-size: var(--font-size-sm); }
  .dato strong { text-align: right; color: var(--text-primary); }
  .preferencias-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 180px), 1fr)); gap: 1rem; }
  .checkbox-group { padding: 0.75rem; background: var(--bg-secondary); border-radius: 6px; }
  .checkbox-label { display: flex; align-items: center; gap: 0.75rem; cursor: pointer; font-weight: var(--font-weight-medium); }
  .checkbox-label input[type="checkbox"] { width: 1.25rem; height: 1.25rem; cursor: pointer; }
  .password-section { padding: 1rem; background: var(--bg-secondary); border-radius: 8px; border-left: 3px solid var(--accent-primary); animation: slideDown 0.3s ease; }
  @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
  .form-actions { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1rem; }
  .error-campo { margin: 0.35rem 0 0; color: var(--accent-danger); font-size: var(--font-size-xs); font-weight: var(--font-weight-medium); }
  .fortaleza-medidor { display: grid; gap: 0.4rem; margin-top: 0.5rem; padding: 0.75rem; border-radius: 6px; background: var(--bg-card); }
  .fortaleza-barra { width: 100%; height: 8px; background: var(--border-color); border-radius: 4px; overflow: hidden; }
  .fortaleza-nivel { height: 100%; transition: width 0.3s ease, background-color 0.3s ease; }
  .nivel-1 { background: var(--accent-danger); }
  .nivel-2, .nivel-3 { background: var(--accent-warning); }
  .nivel-4, .nivel-5 { background: var(--accent-success); }
  .fortaleza-medidor p, .fortaleza-medidor ul { margin: 0; }
  .fortaleza-medidor ul { display: grid; gap: 0.25rem; padding: 0; list-style: none; color: var(--text-secondary); font-size: var(--font-size-xs); }
  .regla-cumple { color: var(--accent-success); }
</style>