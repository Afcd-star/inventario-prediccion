# 📦 Inventario con Predicción de Stock

Sistema web de inventario para pequeñas tiendas que predice cuándo se acabará el stock basándose en el historial de ventas.

##  Características

- Gestión completa de productos (CRUD)
- Registro de entradas y salidas de stock
- Predicción de días hasta agotamiento
- Recomendación de fecha de reorden
- Dashboard con métricas clave
- Modo oscuro

## 🛠️ Stack Tecnológico

- **Frontend:** SvelteKit
- **Backend:** SvelteKit API Routes
- **Base de datos:** SQLite (better-sqlite3)
- **Gráficos:** Chart.js
- **Deploy:** Vercel/Cloudflare Pages

##  Instalación

```bash
npm install
npm run dev



## Credenciales de Prueba

- Email: admin@inventario.com
- Password: admin123

## 📊 Predicción

El sistema calcula automáticamente:
- Consumo promedio diario basado en historial de ventas
- Días hasta agotarse
- Fecha recomendada de reorden
- Alertas de stock bajo