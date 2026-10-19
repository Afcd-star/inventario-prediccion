<script lang="ts">
  import { enhance } from '$app/forms';
  import type { SubmitFunction } from '@sveltejs/kit';
  import { _ } from 'svelte-i18n';
  import type { PageData } from './$types';
  import { mostrarToast } from '$lib/stores/toasts';

  interface ApiKey {
    id: number;
    nombre: string;
    prefijo: string;
    scopes: string[];
    activa: number;
    ultima_usada_en: string | null;
  }

  interface Webhook {
    id: number;
    url: string;
    eventos: string[];
    activa: number;
  }

  interface LogApi {
    id: number;
    nombre_clave: string | null;
    endpoint: string;
    metodo: string;
    codigo_respuesta: number;
    duracion_ms: number;
    creada_en: string;
  }

  interface EntregaWebhook {
    id: number;
    evento: string;
    estado: string;
    intentos: number;
    creada_en: string;
    completada_en: string | null;
  }

  let { data, form }: { data: PageData; form?: any } = $props();

  let modalApiKey = $state(false);
  let modalWebhook = $state(false);
  let secretoMostrado = $state<string | null>(null);

  const SCOPES_DISPONIBLES = [
    'productos:leer',
    'stock:leer',
    'movimientos:escribir'
  ];

  const EVENTOS_DISPONIBLES = [
    'movimiento.registrado',
    'stock.bajo',
    'producto.creado',
    'producto.eliminado'
  ];

  // Mostrar toasts de éxito
  $effect(() => {
    if (form?.success) {
      const mensajes: Record<string, string> = {
        api_key_creada: $_('integraciones.api_key_creada'),
        api_key_revocada: $_('integraciones.api_key_revocada'),
        webhook_creado: $_('integraciones.webhook_creado'),
        webhook_eliminado: $_('integraciones.webhook_eliminado')
      };
      const mensaje = mensajes[form.success];
      if (mensaje) mostrarToast(mensaje, 'success');
    }
  });

  function cerrarModales() {
    modalApiKey = false;
    modalWebhook = false;
  }

  const manejarEnvioApiKey: SubmitFunction = () => {
    return async ({ result, update }) => {
      if (result.type === 'success') {
        cerrarModales();
        if (result.data?.secretoNuevo) {
          secretoMostrado = result.data.secretoNuevo as string;
        }
      }
      await update();
    };
  };

  const manejarEnvioWebhook: SubmitFunction = () => {
    return async ({ result, update }) => {
      if (result.type === 'success') {
        cerrarModales();
        if (result.data?.secretoNuevo) {
          secretoMostrado = result.data.secretoNuevo as string;
        }
      }
      await update();
    };
  };

  const ETIQUETAS_SCOPES: Record<string, string> = {
    'productos:leer': 'Leer productos',
    'stock:leer': 'Leer stock por ubicación',
    'movimientos:escribir': 'Registrar movimientos'
  };

  const ETIQUETAS_EVENTOS: Record<string, string> = {
    'movimiento.registrado': 'Movimiento registrado',
    'stock.bajo': 'Stock bajo mínimo',
    'producto.creado': 'Producto creado',
    'producto.eliminado': 'Producto eliminado'
  };

  function copiarSecreto() {
    if (secretoMostrado) navigator.clipboard.writeText(secretoMostrado);
  }

  function confirmarEliminar() {
    return confirm($_('integraciones.confirmarEliminarWebhook'));
  }

  function handleBackdropKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      cerrarModales();
    }
  }

  function etiquetaScope(scope: string): string {
    return ETIQUETAS_SCOPES[scope] ?? scope;
  }

  function etiquetaEvento(ev: string): string {
    return ETIQUETAS_EVENTOS[ev] ?? ev;
  }
</script>

<svelte:head>
  <title>{$_('integraciones.titulo')} | StockPredict Pro</title>
</svelte:head>

<main class="page-container">
  <header class="page-header">
    <a href="/admin" class="btn-back">
      <span>←</span>
      <span>{$_('integraciones.volver')}</span>
    </a>
    <h1>{$_('integraciones.titulo')}</h1>
    <p class="text-secondary">{$_('integraciones.descripcion')}</p>
  </header>

  <!-- Banner de secreto recién creado (NO es toast: debe persistir hasta que el usuario lo confirme) -->
  {#if secretoMostrado}
    <div class="alert alert-warning secreto-banner">
      <strong>⚠️ {$_('integraciones.secretoUnicaVez')}</strong>
      <code class="secreto-code">{secretoMostrado}</code>
      <button class="btn btn-sm btn-secondary" onclick={copiarSecreto}>
        {$_('integraciones.copiar')}
      </button>
      <button class="btn btn-sm btn-secondary" onclick={() => secretoMostrado = null}>
        {$_('integraciones.yaGuarde')}
      </button>
    </div>
  {/if}

  <!-- Sección API Keys -->
  <section class="card">
    <div class="section-header">
      <h2>🔑 {$_('integraciones.apiKeys')}</h2>
      <button class="btn btn-primary" onclick={() => modalApiKey = true}>
        + {$_('integraciones.nuevaApiKey')}
      </button>
    </div>

    {#if data.apiKeys.length === 0}
      <p class="text-secondary">{$_('integraciones.sinApiKeys')}</p>
    {:else}
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>{$_('integraciones.nombre')}</th>
              <th>{$_('integraciones.prefijo')}</th>
              <th>{$_('integraciones.scopes')}</th>
              <th>{$_('integraciones.estado')}</th>
              <th>{$_('integraciones.ultimoUso')}</th>
              <th>{$_('integraciones.acciones')}</th>
            </tr>
          </thead>
          <tbody>
            {#each data.apiKeys as key}
              <tr>
                <td><strong>{key.nombre}</strong></td>
                <td><code>{key.prefijo}...</code></td>
                <td>
                  {#each key.scopes as scope}
                    <span class="badge badge-info">{etiquetaScope(scope)}</span>
                  {/each}
                </td>
                <td>
                  <span class="badge" class:badge-success={key.activa === 1} class:badge-danger={key.activa === 0}>
                    {key.activa === 1 ? $_('integraciones.activa') : $_('integraciones.revocada')}
                  </span>
                </td>
                <td class="text-secondary">{key.ultima_usada_en || $_('integraciones.nunca')}</td>
                <td>
                  {#if key.activa === 1}
                    <form method="POST" action="?/revocarApiKey" use:enhance style="display:inline;">
                      <input type="hidden" name="id" value={key.id} />
                      <button type="submit" class="btn btn-sm btn-danger">
                        {$_('integraciones.revocar')}
                      </button>
                    </form>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </section>

  <!-- Sección Webhooks -->
  <section class="card">
    <div class="section-header">
      <h2>🔔 {$_('integraciones.webhooks')}</h2>
      <button class="btn btn-primary" onclick={() => modalWebhook = true}>
        + {$_('integraciones.nuevoWebhook')}
      </button>
    </div>

    {#if data.webhooks.length === 0}
      <p class="text-secondary">{$_('integraciones.sinWebhooks')}</p>
    {:else}
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>URL</th>
              <th>{$_('integraciones.eventos')}</th>
              <th>{$_('integraciones.estado')}</th>
              <th>{$_('integraciones.acciones')}</th>
            </tr>
          </thead>
          <tbody>
            {#each data.webhooks as wh}
              <tr>
                <td><code>{wh.url}</code></td>
                <td>
                  {#each wh.eventos as ev}
                    <span class="badge badge-info">{etiquetaEvento(ev)}</span>
                  {/each}
                </td>
                <td>
                  <span class="badge" class:badge-success={wh.activa === 1} class:badge-danger={wh.activa === 0}>
                    {wh.activa === 1 ? $_('integraciones.activa') : $_('integraciones.inactiva')}
                  </span>
                </td>
                <td>
                  <form method="POST" action="?/eliminarWebhook" use:enhance style="display:inline;">
                    <input type="hidden" name="id" value={wh.id} />
                    <button type="submit" class="btn btn-sm btn-danger" onclick={() => confirmarEliminar()}>
                      {$_('botones.eliminar')}
                    </button>
                  </form>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </section>

  <!-- Sección Logs de API -->
  <section class="card">
    <h2>📊 {$_('integraciones.logsApi')}</h2>
    {#if data.logsApi.length === 0}
      <p class="text-secondary">{$_('integraciones.sinLogs')}</p>
    {:else}
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>{$_('integraciones.fecha')}</th>
              <th>{$_('integraciones.clave')}</th>
              <th>Endpoint</th>
              <th>{$_('integraciones.metodo')}</th>
              <th>{$_('integraciones.codigo')}</th>
              <th>{$_('integraciones.duracion')}</th>
            </tr>
          </thead>
          <tbody>
            {#each data.logsApi as log}
              {@const logTyped = log as LogApi}
              <tr>
                <td class="text-secondary">{new Date(logTyped.creada_en).toLocaleString()}</td>
                <td>{logTyped.nombre_clave || $_('integraciones.sinClave')}</td>
                <td><code>{logTyped.endpoint}</code></td>
                <td>{logTyped.metodo}</td>
                <td>
                  <span class="badge" class:badge-success={logTyped.codigo_respuesta < 400} class:badge-danger={logTyped.codigo_respuesta >= 400}>
                    {logTyped.codigo_respuesta}
                  </span>
                </td>
                <td>{logTyped.duracion_ms} ms</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </section>

  <!-- Sección Entregas de Webhooks -->
  <section class="card">
    <h2>📬 {$_('integraciones.entregasWebhook')}</h2>
    {#if data.entregasWebhook.length === 0}
      <p class="text-secondary">{$_('integraciones.sinEntregas')}</p>
    {:else}
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>{$_('integraciones.evento')}</th>
              <th>{$_('integraciones.estado')}</th>
              <th>{$_('integraciones.intentos')}</th>
              <th>{$_('integraciones.creada')}</th>
              <th>{$_('integraciones.completada')}</th>
            </tr>
          </thead>
          <tbody>
            {#each data.entregasWebhook as ent}
              {@const entTyped = ent as EntregaWebhook}
              <tr>
                <td><code>{entTyped.evento}</code></td>
                <td>
                  <span class="badge" class:badge-success={entTyped.estado === 'exitosa'} class:badge-danger={entTyped.estado === 'fallida'} class:badge-warning={entTyped.estado === 'pendiente'}>
                    {entTyped.estado}
                  </span>
                </td>
                <td>{entTyped.intentos}</td>
                <td class="text-secondary">{new Date(entTyped.creada_en).toLocaleString()}</td>
                <td class="text-secondary">{entTyped.completada_en ? new Date(entTyped.completada_en).toLocaleString() : '—'}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </section>
</main>

<!-- Modal crear API Key -->
{#if modalApiKey}
  <div 
    class="modal-backdrop" 
    role="dialog" 
    aria-modal="true" 
    tabindex="-1"
    onclick={(e) => { if (e.target === e.currentTarget) cerrarModales(); }}
    onkeydown={handleBackdropKeydown}
  >
    <div class="modal-content">
      <header class="modal-header">
        <h2>{$_('integraciones.nuevaApiKey')}</h2>
        <button class="modal-close" onclick={cerrarModales}>×</button>
      </header>
      <form method="POST" action="?/crearApiKey" use:enhance={manejarEnvioApiKey}>
        <div class="input-group">
          <label for="api-key-nombre" class="label">{$_('integraciones.nombre')}</label>
          <input id="api-key-nombre" type="text" name="nombre" class="input-field" required placeholder="Ej: ERP Contable" />
        </div>
        <div class="input-group">
          <div class="label">{$_('integraciones.scopes')}</div>
          {#each SCOPES_DISPONIBLES as scope, i}
            <label class="checkbox-label" for={`scope-${i}`}>
              <input id={`scope-${i}`} type="checkbox" name="scopes" value={scope} />
              <span>{etiquetaScope(scope)}</span>
            </label>
          {/each}
        </div>
        <div class="input-group">
          <label for="api-key-expira" class="label">{$_('integraciones.expiraEn')} ({$_('integraciones.opcional')})</label>
          <input id="api-key-expira" type="date" name="expira_en" class="input-field" />
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" onclick={cerrarModales}>{$_('botones.cancelar')}</button>
          <button type="submit" class="btn btn-primary">{$_('integraciones.crear')}</button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- Modal crear Webhook -->
{#if modalWebhook}
  <div 
    class="modal-backdrop" 
    role="dialog" 
    aria-modal="true" 
    tabindex="-1"
    onclick={(e) => { if (e.target === e.currentTarget) cerrarModales(); }}
    onkeydown={handleBackdropKeydown}
  >
    <div class="modal-content">
      <header class="modal-header">
        <h2>{$_('integraciones.nuevoWebhook')}</h2>
        <button class="modal-close" onclick={cerrarModales}>×</button>
      </header>
      <form method="POST" action="?/crearWebhook" use:enhance={manejarEnvioWebhook}>
        <div class="input-group">
          <label for="webhook-url" class="label">URL</label>
          <input id="webhook-url" type="url" name="url" class="input-field" required placeholder="https://tu-sistema.com/webhook" />
        </div>
        <div class="input-group">
          <div class="label">{$_('integraciones.eventos')}</div>
          {#each EVENTOS_DISPONIBLES as ev, i}
            <label class="checkbox-label" for={`event-${i}`}>
              <input id={`event-${i}`} type="checkbox" name="eventos" value={ev} />
              <span>{etiquetaEvento(ev)}</span>
            </label>
          {/each}
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" onclick={cerrarModales}>{$_('botones.cancelar')}</button>
          <button type="submit" class="btn btn-primary">{$_('integraciones.crear')}</button>
        </div>
      </form>
    </div>
  </div>
{/if}

<style>
  .page-header { margin-bottom: 2rem; }
  .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
  .section-header h2 { margin: 0; }
  .table-container { overflow-x: auto; }
  .data-table { width: 100%; border-collapse: collapse; }
  .data-table th, .data-table td { padding: 0.75rem; text-align: left; border-bottom: 1px solid var(--border-color); }
  .data-table th { font-weight: var(--font-weight-semibold); color: var(--text-secondary); font-size: var(--font-size-sm); }
  .badge { padding: 0.25rem 0.5rem; border-radius: 4px; font-size: var(--font-size-xs); font-weight: var(--font-weight-medium); margin-right: 0.25rem; }
  .badge-info { background: var(--status-info-bg); color: var(--status-info-text); }
  .badge-success { background: var(--status-success-bg); color: var(--status-success-text); }
  .badge-danger { background: var(--status-danger-bg); color: var(--status-danger-text); }
  .badge-warning { background: var(--status-warning-bg); color: var(--status-warning-text); }
  .secreto-banner { display: flex; flex-direction: column; gap: 0.75rem; align-items: flex-start; }
  .secreto-code { display: block; width: 100%; padding: 0.75rem; background: var(--bg-secondary); border-radius: 6px; font-family: monospace; word-break: break-all; }
  .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: grid; place-items: center; z-index: 1000; padding: 1rem; }
  .modal-content { background: var(--bg-card); border-radius: 12px; width: 100%; max-width: 500px; padding: 1.5rem; }
  .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
  .modal-header h2 { margin: 0; }
  .modal-close { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--text-secondary); }
  .modal-actions { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem; }
  .checkbox-label { display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem 0; cursor: pointer; }
  section.card { margin-bottom: 2rem; padding: 1.5rem; }
</style>