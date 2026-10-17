<script lang="ts">
  import { _, locale } from 'svelte-i18n';

  interface Actividad {
    accion: string;
    detalles: string;
    ip: string | null;
    creada_en: string;
  }

  interface Props {
    actividades: Actividad[];
  }

  let { actividades }: Props = $props();

  function formatoFecha(fecha: string): string {
    return new Date(`${fecha.replace(' ', 'T')}Z`).toLocaleString(
      $locale === 'en' ? 'en-US' : 'es-ES',
      { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    );
  }

  function traducirAccion(accion: string): string {
    const traducciones: Record<string, string> = {
      login_exito: 'perfil.accionLoginExito',
      login_fallo: 'perfil.accionLoginFallo',
      login_bloqueado: 'perfil.accionLoginBloqueado',
      logout: 'perfil.accionLogout',
      perfil_nombre: 'perfil.accionNombre',
      perfil_password: 'perfil.accionPassword',
      perfil_email: 'perfil.accionEmail',
      perfil_preferencias: 'perfil.accionPreferencias',
      sesion_cerrada: 'perfil.accionSesionCerrada',
      sesiones_cierre_masivo: 'perfil.accionSesionesCierreMasivo',
      usuario_crear: 'perfil.accionUsuarioCrear',
      usuario_rol: 'perfil.accionUsuarioRol',
      usuario_eliminar: 'perfil.accionUsuarioEliminar',
      producto_crear: 'perfil.accionProductoCrear',
      producto_editar: 'perfil.accionProductoEditar',
      producto_actualizar: 'perfil.accionProductoEditar',
      producto_eliminar: 'perfil.accionProductoEliminar',
      predicciones_recalcular: 'perfil.accionPrediccionesRecalcular',
      umbrales_guardar: 'perfil.accionUmbralesGuardar',
      movimiento_entrada: 'perfil.accionMovimientoEntrada',
      movimiento_salida: 'perfil.accionMovimientoSalida'
    };
    return $_(traducciones[accion] ?? 'perfil.accionDesconocida');
  }
</script>

{#if actividades.length === 0}
  <p class="text-secondary">{$_('perfil.sinActividad')}</p>
{:else}
  <div class="actividad-lista">
    {#each actividades as actividad}
      <article class="actividad-item">
        <div class="actividad-header">
          <strong>{traducirAccion(actividad.accion)}</strong>
          <time class="text-sm text-secondary">{formatoFecha(actividad.creada_en)}</time>
        </div>
        {#if actividad.ip}
          <p class="text-sm text-secondary">IP: {actividad.ip}</p>
        {/if}
      </article>
    {/each}
  </div>
{/if}

<style>
  .actividad-lista {
    display: grid;
    gap: 0.75rem;
  }

  .actividad-item {
    padding: 0.75rem;
    border-radius: 6px;
    background: var(--bg-secondary);
  }

  .actividad-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
  }

  .actividad-header strong,
  .actividad-header time {
    overflow-wrap: anywhere;
  }

  .actividad-item p {
    margin: 0.4rem 0 0;
  }
</style>
