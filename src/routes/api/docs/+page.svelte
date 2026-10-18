<script lang="ts">
  import { onMount } from 'svelte';
  import { _ } from 'svelte-i18n';

  let spec = $state<any>(null);
  let cargando = $state(true);

  onMount(async () => {
    const res = await fetch('/openapi.json');
    spec = await res.json();
    cargando = false;
  });

  function getMethodColor(method: string): string {
    const colors: Record<string, string> = {
      get: '#10b981',
      post: '#3b82f6',
      put: '#f59e0b',
      delete: '#ef4444'
    };
    return colors[method.toLowerCase()] || '#6b7280';
  }

  const EJEMPLO_CURL = `curl -H "Authorization: Bearer spk_tu_clave_aqui" \\
     http://localhost:5173/api/public/productos`;

  const EJEMPLO_JS = `const respuesta = await fetch('http://localhost:5173/api/public/productos', {
  headers: {
    'Authorization': 'Bearer spk_tu_clave_aqui'
  }
});
const productos = await respuesta.json();`;

  const EJEMPLO_PY = `import requests

encabezados = {'Authorization': 'Bearer spk_tu_clave_aqui'}
respuesta = requests.get('http://localhost:5173/api/public/productos', headers=encabezados)
productos = respuesta.json()`;
</script>

<svelte:head>
  <title>API Docs | StockPredict Pro</title>
</svelte:head>

<main class="page-container">
  <header class="page-header">
    <a href="/admin" class="btn-back">
      <span>←</span>
      <span>Volver al Panel de Administración</span>
    </a>
    <h1>📚 Documentación de la API Pública</h1>
    <p class="text-secondary">
      Esta API permite integrar StockPredict Pro con sistemas externos como ERPs, 
      plataformas de ecommerce y sistemas de transporte.
    </p>
  </header>

  {#if cargando}
    <div class="loading">Cargando documentación...</div>
  {:else if spec}
    <section class="card info-card">
      <h2>{spec.info.title}</h2>
      <p class="version">Versión: <strong>{spec.info.version}</strong></p>
      <p>{spec.info.description}</p>
      
      <h3>Autenticación</h3>
      <p>
        Todas las peticiones deben incluir el encabezado <code>Authorization</code> 
        con el esquema <code>Bearer</code> seguido de tu API key.
      </p>
      <div class="code-block">
        <code>Authorization: Bearer spk_tu_clave_aqui</code>
      </div>
      
      <h3>Rate Limiting</h3>
      <p>
        Cada API key tiene un límite de <strong>120 peticiones por minuto</strong>. 
        Si excedes este límite, recibirás una respuesta <code>429 Too Many Requests</code>.
      </p>
    </section>

    <section class="card">
      <h2>Endpoints</h2>
      
      {#each Object.entries(spec.paths) as [path, methods]}
        {@const methodsTyped = methods as Record<string, any>}
        {#each Object.entries(methodsTyped) as [method, details]}
          {@const detailsTyped = details as any}
          <div class="endpoint">
            <div class="endpoint-header">
              <span class="method" style:background-color={getMethodColor(method)}>
                {method.toUpperCase()}
              </span>
              <code class="path">{path}</code>
            </div>
            
            <div class="endpoint-body">
              <h3>{detailsTyped.summary}</h3>
              {#if detailsTyped.description}
                <p>{detailsTyped.description}</p>
              {/if}

              {#if detailsTyped.parameters && detailsTyped.parameters.length > 0}
                <div class="section">
                  <h4>Parámetros</h4>
                  {#each detailsTyped.parameters as param}
                    <div class="param">
                      <code>{param.name}</code>
                      <span class="badge badge-info">{param.in}</span>
                      {#if param.required}
                        <span class="badge badge-danger">requerido</span>
                      {/if}
                      <p>{param.schema?.type || 'string'}</p>
                    </div>
                  {/each}
                </div>
              {/if}

              {#if detailsTyped.requestBody}
                <div class="section">
                  <h4>Body de la petición</h4>
                  <p>Content-Type: <code>application/json</code></p>
                  {#if detailsTyped.requestBody.content['application/json']?.schema?.['$ref']}
                    <p>Schema: <code>{detailsTyped.requestBody.content['application/json'].schema['$ref']}</code></p>
                  {/if}
                </div>
              {/if}

              <div class="section">
                <h4>Respuestas</h4>
                {#each Object.entries(detailsTyped.responses) as [code, response]}
                  {@const responseTyped = response as any}
                  <div class="response">
                    <span class="badge" class:badge-success={code.startsWith('2')} class:badge-danger={code.startsWith('4')}>
                      {code}
                    </span>
                    <span>{responseTyped.description}</span>
                  </div>
                {/each}
              </div>
            </div>
          </div>
        {/each}
      {/each}
    </section>

    <section class="card">
      <h2>Ejemplos de uso</h2>
      
      <h3>curl</h3>
      <div class="code-block">
        <pre><code>{EJEMPLO_CURL}</code></pre>
      </div>

      <h3>JavaScript (fetch)</h3>
      <div class="code-block">
        <pre><code>{EJEMPLO_JS}</code></pre>
      </div>

      <h3>Python (requests)</h3>
      <div class="code-block">
        <pre><code>{EJEMPLO_PY}</code></pre>
      </div>
    </section>
  {/if}
</main>

<style>
  .page-header {
    margin-bottom: 2rem;
  }

  .loading {
    text-align: center;
    padding: 3rem;
    color: var(--text-secondary);
  }

  .info-card {
    background: var(--bg-secondary);
  }

  .version {
    margin: 0.5rem 0;
  }

  .code-block {
    background: var(--bg-card);
    padding: 1rem;
    border-radius: 6px;
    margin: 1rem 0;
    overflow-x: auto;
  }

  .code-block code,
  .code-block pre {
    font-family: 'Courier New', monospace;
    font-size: 0.9rem;
    color: var(--text-primary);
  }

  .endpoint {
    margin: 2rem 0;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    overflow: hidden;
  }

  .endpoint-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border-color);
  }

  .method {
    padding: 0.25rem 0.75rem;
    border-radius: 4px;
    color: white;
    font-weight: bold;
    font-size: 0.85rem;
  }

  .path {
    font-size: 1rem;
    color: var(--text-primary);
  }

  .endpoint-body {
    padding: 1.5rem;
  }

  .endpoint-body h3 {
    margin: 0 0 0.5rem;
  }

  .section {
    margin-top: 1.5rem;
  }

  .section h4 {
    margin: 0 0 0.75rem;
    color: var(--text-secondary);
    font-size: 0.9rem;
    text-transform: uppercase;
  }

  .param {
    padding: 0.75rem;
    background: var(--bg-secondary);
    border-radius: 4px;
    margin-bottom: 0.5rem;
  }

  .param code {
    font-weight: bold;
    margin-right: 0.5rem;
  }

  .response {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem 0;
  }

  .badge {
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.85rem;
    font-weight: 500;
  }

  .badge-info {
    background: var(--status-info-bg);
    color: var(--status-info-text);
  }

  .badge-success {
    background: var(--status-success-bg);
    color: var(--status-success-text);
  }

  .badge-danger {
    background: var(--status-danger-bg);
    color: var(--status-danger-text);
  }
</style>