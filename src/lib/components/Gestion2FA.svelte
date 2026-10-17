<script lang="ts">
  import { _ } from 'svelte-i18n';

  interface Props {
    usuarioId: number;
    estaActivado: boolean;
    fechaActivacion?: string;
    codigosDisponibles?: number;
  }

  let { usuarioId, estaActivado, fechaActivacion, codigosDisponibles }: Props = $props();

  type Estado = 'inactivo' | 'generando' | 'pendiente' | 'mostrando_codigos' | 'desactivando';
  let estado = $state<Estado>('inactivo');
  
  let secreto = $state('');
  let qrDataUrl = $state('');
  let codigoVerificacion = $state('');
  let error = $state('');
  let codigosRecuperacion = $state<string[]>([]);
  let passwordDesactivacion = $state('');

  function toggle2FA(e: Event) {
    // Prevenir el cambio visual inmediato del navegador
    e.preventDefault();
    
    if (estaActivado) {
      estado = 'desactivando';
    } else {
      iniciarActivacion();
    }
  }

  async function iniciarActivacion() {
    estado = 'generando';
    error = '';
    try {
      const res = await fetch('/api/2fa/generar', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      secreto = data.secreto;
      qrDataUrl = data.qrDataUrl;
      estado = 'pendiente';
    } catch (err: any) {
      error = err.message || 'Error al generar el código QR';
      estado = 'inactivo';
    }
  }

  async function verificarYActivar() {
    if (codigoVerificacion.length !== 6) {
      error = 'El código debe tener 6 dígitos';
      return;
    }

    error = '';
    try {
      const res = await fetch('/api/2fa/activar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secreto, codigo: codigoVerificacion })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error);

      codigosRecuperacion = data.codigosRecuperacion;
      estado = 'mostrando_codigos';
    } catch (err: any) {
      error = err.message || 'Código inválido. Inténtalo de nuevo.';
    }
  }

  async function desactivar2FA() {
    if (!passwordDesactivacion) {
      error = 'Ingresa tu contraseña para confirmar';
      return;
    }

    error = '';
    try {
      const res = await fetch('/api/2fa/desactivar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordDesactivacion })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error);

      estado = 'inactivo';
      window.location.reload();
    } catch (err: any) {
      error = err.message || 'Contraseña incorrecta';
    }
  }

  function copiarCodigos() {
    const texto = codigosRecuperacion.join('\n');
    navigator.clipboard.writeText(texto);
  }

  function imprimirCodigos() {
    const ventana = window.open('', '_blank');
    if (ventana) {
      ventana.document.write(`
        <html>
          <head><title>Códigos de Recuperación 2FA</title></head>
          <body style="font-family: monospace; padding: 2rem;">
            <h2>Códigos de Recuperación - StockPredict Pro</h2>
            <p>Guarda estos códigos en un lugar seguro. Cada uno se puede usar una sola vez.</p>
            <pre style="font-size: 1.2rem; line-height: 1.5;">${codigosRecuperacion.join('\n')}</pre>
          </body>
        </html>
      `);
      ventana.document.close();
      ventana.print();
    }
  }

  function verCodigosExistentes() {
    window.location.href = '/perfil/2fa/codigos';
  }
</script>

<div class="gestion-2fa">
  <div class="card-seccion">
    <div class="twofa-header">
      <div class="twofa-info">
        <h3>🔐 {$_('perfil.2fa.titulo')}</h3>
        <p class="text-secondary text-sm">{$_('perfil.2fa.descripcion')}</p>
      </div>
      
      <label class="toggle-switch">
        <input 
          type="checkbox" 
          checked={estaActivado}
          onclick={toggle2FA}
          disabled={estado !== 'inactivo'}
        />
        <span class="toggle-slider">
          <span class="toggle-slider-circle"></span>
        </span>
      </label>
    </div>

    {#if estaActivado && fechaActivacion}
      <div class="twofa-status">
        <span class="status-badge activo">
          ✅ {$_('perfil.2fa.activoDesde')} {fechaActivacion}
        </span>
        {#if codigosDisponibles !== undefined}
          <p class="text-sm text-secondary">
            🔑 {$_('perfil.2fa.codigosDisponibles')}: {codigosDisponibles}
          </p>
        {/if}
      </div>

      <div class="twofa-actions">
        <button class="btn btn-secondary" onclick={verCodigosExistentes}>
          {$_('perfil.2fa.verCodigos')}
        </button>
      </div>
    {/if}
  </div>

  {#if estado === 'generando'}
    <div class="overlay">
      <div class="modal-content">
        <p class="text-secondary">⏳ {$_('perfil.2fa.generando')}</p>
      </div>
    </div>
  {:else if estado === 'pendiente'}
    <div class="overlay">
      <div class="modal-content">
        <h3>📱 {$_('perfil.2fa.escanear')}</h3>
        <p class="text-secondary text-sm">{$_('perfil.2fa.instrucciones')}</p>
        
        <div class="qr-container">
          <img src={qrDataUrl} alt="QR Code 2FA" />
        </div>

        <div class="input-group">
          <label for="codigo-2fa" class="label">{$_('perfil.2fa.codigo')}</label>
          <input 
            id="codigo-2fa" 
            type="text" 
            inputmode="numeric" 
            pattern="[0-9]{6}" 
            maxlength="6"
            bind:value={codigoVerificacion}
            class="input-field" 
            placeholder="000000"
          />
        </div>

        {#if error}
          <p class="error-campo">⚠ {error}</p>
        {/if}

        <div class="acciones-2fa">
          <button class="btn btn-secondary" onclick={() => estado = 'inactivo'}>
            {$_('botones.cancelar')}
          </button>
          <button class="btn btn-primary" onclick={verificarYActivar}>
            {$_('perfil.2fa.verificar')}
          </button>
        </div>
      </div>
    </div>
  {:else if estado === 'mostrando_codigos'}
    <div class="overlay">
      <div class="modal-content alerta-exito">
        <h3>✅ {$_('perfil.2fa.activado')}</h3>
        <p class="text-secondary text-sm">{$_('perfil.2fa.guardarCodigos')}</p>
        
        <div class="codigos-container">
          {#each codigosRecuperacion as codigo}
            <div class="codigo-item">{codigo}</div>
          {/each}
        </div>

        <div class="acciones-2fa">
          <button class="btn btn-secondary" onclick={copiarCodigos}>
            📋 {$_('perfil.2fa.copiar')}
          </button>
          <button class="btn btn-secondary" onclick={imprimirCodigos}>
            🖨️ {$_('perfil.2fa.imprimir')}
          </button>
          <button class="btn btn-primary" onclick={() => window.location.reload()}>
            {$_('perfil.2fa.finalizar')}
          </button>
        </div>
      </div>
    </div>
  {:else if estado === 'desactivando'}
    <div class="overlay">
      <div class="modal-content">
        <h3>🔒 {$_('perfil.2fa.desactivar')}</h3>
        <p class="text-secondary text-sm">{$_('perfil.2fa.confirmarDesactivacion')}</p>
        
        <div class="input-group">
          <label for="password-desactivar" class="label">{$_('perfil.passwordActual')}</label>
          <input 
            id="password-desactivar" 
            type="password"
            bind:value={passwordDesactivacion}
            class="input-field" 
            placeholder="••••••••"
          />
        </div>

        {#if error}
          <p class="error-campo">⚠ {error}</p>
        {/if}

        <div class="acciones-2fa">
          <button class="btn btn-secondary" onclick={() => estado = 'inactivo'}>
            {$_('botones.cancelar')}
          </button>
          <button class="btn btn-danger" onclick={desactivar2FA}>
            {$_('perfil.2fa.desactivar')}
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .gestion-2fa {
    margin-top: 1.5rem;
  }

  .card-seccion {
    padding: 1.5rem;
    background: var(--bg-secondary);
    border-radius: 8px;
    border: 1px solid var(--border-color);
  }

  .twofa-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .twofa-info h3 {
    margin: 0 0 0.25rem;
    font-size: var(--font-size-base);
  }

  .twofa-info p {
    margin: 0;
  }

  .toggle-switch {
    position: relative;
    display: inline-block;
    width: 60px;
    height: 34px;
    flex-shrink: 0;
  }

  .toggle-switch input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  .toggle-slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: var(--border-color);
    transition: 0.3s;
    border-radius: 34px;
  }

  .toggle-slider-circle {
    position: absolute;
    height: 26px;
    width: 26px;
    left: 4px;
    bottom: 4px;
    background-color: white;
    transition: 0.3s;
    border-radius: 50%;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  .toggle-switch input:checked + .toggle-slider {
    background-color: var(--accent-success);
  }

  .toggle-switch input:checked + .toggle-slider .toggle-slider-circle {
    transform: translateX(26px);
  }

  .toggle-switch input:disabled + .toggle-slider {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .twofa-status {
    margin: 1rem 0;
    padding: 1rem;
    background: var(--bg-card);
    border-radius: 6px;
  }

  .status-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
  }

  .status-badge.activo {
    background: var(--status-success-bg);
    color: var(--status-success-text);
  }

  .twofa-actions {
    display: flex;
    gap: 0.75rem;
    margin-top: 1rem;
  }

  .overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: grid;
    place-items: center;
    z-index: 1000;
    padding: 1rem;
  }

  .modal-content {
    background: var(--bg-card);
    padding: 2rem;
    border-radius: 12px;
    max-width: 500px;
    width: 100%;
    box-shadow: var(--shadow-popover);
  }

  .modal-content h3 {
    margin: 0 0 1rem;
  }

  .qr-container {
    display: flex;
    justify-content: center;
    margin: 1.5rem 0;
    padding: 1rem;
    background: #ffffff;
    border-radius: 8px;
    border: 1px solid var(--border-color);
  }

  .qr-container img {
    width: 256px;
    height: 256px;
  }

  .acciones-2fa {
    display: flex;
    gap: 0.75rem;
    margin-top: 1.5rem;
    flex-wrap: wrap;
  }

  .alerta-exito {
    border: 2px solid var(--accent-success);
  }

  .codigos-container {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 0.75rem;
    margin: 1rem 0;
  }

  .codigo-item {
    font-family: 'Courier New', monospace;
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-bold);
    text-align: center;
    padding: 0.5rem;
    background: var(--bg-card);
    border: 1px dashed var(--border-color);
    border-radius: 4px;
    letter-spacing: 1px;
  }

  .error-campo {
    margin: 0.5rem 0 0;
    color: var(--accent-danger);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
  }

  .text-sm {
    font-size: var(--font-size-sm);
  }

  .text-secondary {
    color: var(--text-secondary);
  }
</style>