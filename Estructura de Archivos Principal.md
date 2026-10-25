> 🗂️ **Referencia histórica.** Este árbol corresponde a una etapa temprana del proyecto
> (≈ v1.0–v1.4). Desde entonces se han incorporado numerosas rutas, servicios y componentes;
> la estructura actual del código es la del propio repositorio. Se conserva como referencia
> del punto de partida.

---

src/
├── lib/
│   ├── components/
│   │   ├── Navbar.svelte
│   │   ├── TablaProductos.svelte
│   │   ├── FormularioProducto.svelte
│   │   ├── FormularioMovimiento.svelte
│   │   └── HistorialMovimientos.svelte
│   ├── server/
│   │   ├── database.ts
│   │   ├── schema.sql
│   │   ├── movimientos.service.ts
│   │   └── prediccion.service.ts
│   └── types.ts
├── routes/
│   ├── +layout.svelte
│   ├── +layout.server.ts
│   ├── +page.server.ts
│   ├── dashboard/
│   │   └── +page.svelte, +page.server.ts
│   ├── productos/
│   │   ├── +page.svelte, +page.server.ts
│   │   ├── nuevo/
│   │   │   └── +page.svelte, +page.server.ts
│   │   └── [id]/
│   │       ├── movimientos/
│   │       │   └── +page.svelte, +page.server.ts
│   │       └── editar/
│   │           └── +page.svelte, +page.server.ts
│   ├── login/
│   │   └── +page.svelte, +page.server.ts
│   ├── logout/
│   │   └── +page.server.ts
│   ├── perfil/
│   │   └── +page.svelte, +page.server.ts
│   └── admin/
│       └── +page.svelte, +page.server.ts
├── hooks.server.ts
├── app.d.ts
└── app.html
static/
└── app.css