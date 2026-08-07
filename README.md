# SKC Operaciones Web

Portal React + Vite para los formularios operativos especializados de SKC.

## Producción

- URL: `https://portal-formsbcop2.sucasainmobiliaria.com.co`
- API: `https://apiskccbo2.sucasainmobiliaria.com.co/api`
- Rama de despliegue: `main`.

La URL de la API está versionada en `.env.production` porque es pública y Vite la incorpora durante la compilación.

```bash
npm ci
npm run build
```

En Hostinger, despliega el repositorio completo en la carpeta raíz vacía del
subdominio (`public_html`). El `.htaccess` de la raíz sirve únicamente el contenido
compilado de `dist/`, protege el código fuente y permite abrir directamente rutas
SPA como `/modules/inventory`.

La carpeta `dist/` está versionada para que el hosting pueda publicar el portal sin
necesitar Node.js. Cuando cambies el frontend, ejecuta el build, confirma también los
cambios generados en `dist/` y luego haz push.

## Desarrollo

```bash
npm install
npm run dev
```

Vite enviará `/api` a `http://localhost:8080` durante el desarrollo local.
