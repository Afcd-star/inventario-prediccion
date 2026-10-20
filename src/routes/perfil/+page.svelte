<script lang="ts">
  import type { PageData } from './$types';
  import { _ } from 'svelte-i18n';
  import ActividadReciente from '$lib/components/ActividadReciente.svelte';
  import PerfilEditarForm from '$lib/components/PerfilEditarForm.svelte';
  import SesionesAbiertas from '$lib/components/SesionesAbiertas.svelte';
  import Gestion2FA from '$lib/components/Gestion2FA.svelte';
  import { mostrarToast } from '$lib/stores/toasts';

  type ModalPerfil = 'editar' | 'sesiones' | null;
  
  let { data, form }: { 
    data: PageData; 
    form?: {
      success?: string;
      error?: string;
      campo?: string;
      cerradas?: number;
    } 
  } = $props();

  let menuAbierto = $state(false);
  let modal = $state<ModalPerfil>(null);
  let menuRoot = $state<HTMLDivElement | null>(null);
  let cargandoPush = $state(false);
  let mensajePush = $state('');
  let errorPush = $state(false);

  const iniciales = $derived(
    data.usuario.nombre.split(/\s+/).filter(Boolean).map(nombre => nombre[0]).join('').toUpperCase().slice(0, 2)
  );

  // Mostrar toasts de éxito
  $effect(() => {
    if (form?.success === 'perfil_actualizado') {
      mostrarToast($_('perfil.perfilActualizado'), 'success');
    } else if (form?.success === 'sesion_cerrada') {
      mostrarToast($_('sesiones.cerradaExito'), 'success');
    } else if (form?.success === 'sesiones_masivo') {
      mostrarToast($_('sesiones.masivoExito', { values: { n: form.cerradas ?? 0 } }), 'success');
    }
  });

  function abrirModal(nombre: Exclude<ModalPerfil, null>) {
    menuAbierto = false;
    modal = nombre;
  }

  function cerrarModal() {
    modal = null;
  }

  function cerrarConEscape(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      if (modal) cerrarModal();
      else menuAbierto = false;
    }
  }

  function cerrarMenuAlHacerClickFuera(event: MouseEvent) {
    if (menuAbierto && event.target instanceof Node && !menuRoot?.contains(event.target)) {
      menuAbierto = false;
    }
  }

  async function activarNotificacionesNavegador() {
    if (!('Notification' in window)) {
      mensajePush = 'Tu navegador no soporta notificaciones.';
      errorPush = true;
      return;
    }

    cargandoPush = true;
    mensajePush = '';
    errorPush = false;

    try {
      // 1. Pedir permiso del sistema
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        // 2. Esperar a que el Service Worker esté listo y controlando la página
        const registration = await navigator.serviceWorker.ready;
        console.log('Service Worker listo:', registration);

        // 3. Verificar si ya existe una suscripción
        let subscription = await registration.pushManager.getSubscription();
        
        if (!subscription) {
          // 4. Obtener la clave pública (¡IMPORTANTE! Debe tener el prefijo VITE_)
          const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
          
          console.log('Clave VAPID cargada:', vapidPublicKey ? 'SÍ (longitud: ' + vapidPublicKey.length + ')' : 'NO');

          if (!vapidPublicKey || vapidPublicKey.includes('TU_PUBLIC_KEY')) {
            throw new Error('La clave VAPID pública no está configurada en .env o no tiene el prefijo VITE_');
          }

          // 5. Convertir la clave y suscribirse
          const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
          
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: convertedVapidKey
          });
          
          console.log('Suscripción creada exitosamente:', subscription);
        }

        // 6. Enviar la suscripción al servidor
        const res = await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subscription)
        });

        if (res.ok) {
          mensajePush = '✅ Notificaciones del navegador activadas correctamente.';
        } else {
          const errData = await res.json();
          throw new Error(errData.error || 'Error al guardar en el servidor');
        }
      } else {
        mensajePush = 'Permiso de notificaciones denegado por el usuario.';
        errorPush = true;
      }
    } catch (error: any) {
      console.error('Error activando push:', error);
      mensajePush = `Error: ${error.message}`;
      errorPush = true;
    } finally {
      cargandoPush = false;
    }
  }

  function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
</script>

<svelte:window onkeydown={cerrarConEscape} onclick={cerrarMenuAlHacerClickFuera} />

<svelte:head>
  <title>{$_('perfil.titulo')} | StockPredict Pro</title>
</svelte:head>

<main class="page-container page-container--narrow">
  <header class="page-header">
    <a href="/dashboard" class="btn-back">
      <span>←</span>
      <span>{$_('perfil.volver')}</span>
    </a>
  </header>

  <!-- Alerta de error general (no asociado a un campo específico) -->
  {#if form?.error && !form?.campo}
    <div class="alert alert-danger">⚠️ {$_(form.error)}</div>
  {/if}

  <!-- Tarjeta de Perfil -->
  <section class="profile-card card">
    <div class="profile-summary">
      <div class="profile-avatar" aria-label={data.usuario.nombre}>{iniciales}</div>
      <div class="profile-heading">
        <h1>{$_('perfil.titulo')}</h1>
        <p class="text-secondary">{$_('perfil.subtitulo')}</p>
        <p class="profile-name">{data.usuario.nombre}</p>
        <p class="profile-email text-secondary">{data.usuario.email}</p>
        <p class="profile-role text-secondary">
          {data.usuario.rol === 'admin' ? $_('perfil.admin') : $_('perfil.empleado')} · 
          {$_('perfil.miembroDesde')}: {new Date(data.usuario.created_at).toLocaleDateString()}
        </p>
      </div>
    </div>

    <div class="profile-menu" bind:this={menuRoot}>
      <button
        class="profile-menu-trigger"
        type="button"
        aria-label={$_('perfil.abrirOpciones')}
        aria-haspopup="menu"
        aria-expanded={menuAbierto}
        onclick={() => menuAbierto = !menuAbierto}
      >⋮</button>
      {#if menuAbierto}
        <div class="profile-dropdown" role="menu">
          <button type="button" role="menuitem" onclick={() => abrirModal('editar')}>
            <span aria-hidden="true">✏️</span> {$_('perfil.editarDatos')}
          </button>
          <button type="button" role="menuitem" onclick={() => abrirModal('sesiones')}>
            <span aria-hidden="true">🔐</span> {$_('sesiones.titulo')}
          </button>
        </div>
      {/if}
    </div>
  </section>

  <!-- Gestión de 2FA -->
  <section class="actividad-section card">
    <Gestion2FA 
      usuarioId={data.usuario.id} 
      estaActivado={data.usuario.totp_activado === 1} 
      codigosDisponibles={data.codigosDisponibles}
    />
  </section>

  <!-- Tarjeta de Notificaciones del Navegador -->
  <section class="actividad-section card">
    <h2>🔔 {$_('perfil.notificacionesNavegador')}</h2>
    <p class="text-secondary text-sm" style="margin-bottom: 1rem;">
      {$_('perfil.descNotificacionesNavegador')}
    </p>

    <button 
      class="btn btn-primary" 
      onclick={activarNotificacionesNavegador}
      disabled={cargandoPush}
    >
      {cargandoPush ? 'Activando...' : 'Activar notificaciones del navegador'}
    </button>

    {#if mensajePush}
      <p class="text-sm" style="margin-top: 0.5rem; color: {errorPush ? 'var(--accent-danger)' : 'var(--accent-success)'};">
        {mensajePush}
      </p>
    {/if}
  </section>

  <!-- Actividad Reciente -->
  <section class="actividad-section card">
    <h2>📜 {$_('perfil.actividadReciente')}</h2>
    <ActividadReciente actividades={data.actividadReciente} />
  </section>
</main>

<!-- Modal Unificado -->
{#if modal}
  <div
    class="profile-modal-backdrop"
    role="presentation"
    onclick={(event) => {
      if (event.target === event.currentTarget) cerrarModal();
    }}
  >
    <dialog open class="profile-modal" aria-modal="true" aria-labelledby="profile-modal-title">
      <header class="profile-modal-header">
        <h2 id="profile-modal-title">
          {#if modal === 'editar'}
            {$_('perfil.editarDatos')}
          {:else if modal === 'sesiones'}
            {$_('sesiones.titulo')}
          {/if}
        </h2>
        <button class="modal-close" type="button" aria-label={$_('admin.cerrar')} onclick={cerrarModal}>×</button>
      </header>

      <div class="profile-modal-content">
        {#if modal === 'editar'}
          <PerfilEditarForm usuario={data.usuario} form={form} onSuccess={cerrarModal} />
        {:else if modal === 'sesiones'}
          <SesionesAbiertas sesiones={data.sesiones} onSuccess={cerrarModal} />
        {/if}
      </div>
    </dialog>
  </div>
{/if}

<style>
  .page-header {
    margin-bottom: 1rem;
  }

  .profile-card {
    position: relative;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    min-width: 0;
    padding: clamp(1.25rem, 4vw, 2rem);
    box-shadow: var(--shadow-card);
  }

  .profile-summary {
    display: flex;
    align-items: center;
    gap: 1.25rem;
    min-width: 0;
  }

  .profile-avatar {
    display: grid;
    width: clamp(4rem, 12vw, 6rem);
    height: clamp(4rem, 12vw, 6rem);
    flex: 0 0 auto;
    place-items: center;
    border: 3px solid var(--bg-card);
    border-radius: 50%;
    background: linear-gradient(135deg, var(--accent-primary), var(--accent-purple));
    color: var(--text-on-accent);
    font-size: clamp(1.25rem, 4vw, 2rem);
    font-weight: var(--font-weight-bold);
    box-shadow: var(--shadow-subtle);
  }

  .profile-heading {
    min-width: 0;
  }

  .profile-heading h1 {
    margin: 0;
  }

  .profile-heading p {
    margin: 0.35rem 0 0;
    overflow-wrap: anywhere;
  }

  .profile-name {
    color: var(--text-primary);
    font-weight: var(--font-weight-semibold);
    font-size: var(--font-size-lg);
  }

  .profile-role {
    font-size: var(--font-size-sm);
  }

  .profile-menu {
    position: relative;
    flex: 0 0 auto;
    margin-left: auto;
  }

  .profile-menu-trigger {
    display: grid;
    width: 2.5rem;
    height: 2.5rem;
    place-items: center;
    border: 1px solid var(--border-color);
    border-radius: 50%;
    background: var(--bg-card);
    color: var(--text-primary);
    font-size: 1.5rem;
    line-height: 1;
    cursor: pointer;
  }

  .profile-menu-trigger:hover,
  .profile-menu-trigger:focus-visible {
    border-color: var(--accent-primary);
    color: var(--accent-primary);
  }

  .profile-dropdown {
    position: absolute;
    z-index: 10;
    top: calc(100% + 0.5rem);
    right: 0;
    display: grid;
    width: max-content;
    min-width: 14rem;
    padding: 0.4rem;
    border: 1px solid var(--border-color);
    border-radius: 10px;
    background: var(--bg-card);
    box-shadow: var(--shadow-popover);
  }

  .profile-dropdown button {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
    padding: 0.75rem;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: var(--text-primary);
    text-align: left;
    font: inherit;
    cursor: pointer;
  }

  .profile-dropdown button:hover,
  .profile-dropdown button:focus-visible {
    background: var(--status-info-bg);
    color: var(--status-info-text);
  }

  /* Sección de Actividad Reciente (Nueva) */
  .actividad-section {
    margin-top: 1.5rem;
    padding: 1.5rem;
  }

  .actividad-section h2 {
    margin: 0 0 1rem;
    font-size: var(--font-size-lg);
  }

  .profile-modal-backdrop {
    position: fixed;
    z-index: 1000;
    inset: 0;
    display: grid;
    place-items: center;
    padding: 1rem;
    background: rgb(15 23 42 / 65%);
  }

  .profile-modal {
    position: relative;
    place-self: center;
    margin: 0;
    width: min(100%, 760px);
    max-height: min(90vh, 900px);
    overflow: auto;
    padding: clamp(1rem, 4vw, 1.5rem);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    background: var(--bg-card);
    color: var(--text-primary);
    box-shadow: var(--shadow-popover);
  }

  .profile-modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .profile-modal-header h2 {
    margin: 0;
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

  .profile-modal-content {
    min-width: 0;
  }

  @media (max-width: 520px) {
    .profile-summary {
      align-items: flex-start;
      gap: 0.75rem;
    }

    .profile-heading h1 {
      font-size: var(--font-size-xl);
    }

    .profile-modal-backdrop {
      padding: 0.5rem;
    }
  }
</style>