# SKC Operaciones Web

Portal React + Vite para los formularios operativos especializados de SKC.

## Producción

- URL: `https://portal-formsbcop2.sucasainmobiliaria.com.co`
- API: `https://apiskccbo2.sucasainmobiliaria.com.co/api`
- Document root recomendado en Hostinger: la carpeta `dist/` de este repositorio.

La URL de la API está versionada en `.env.production` porque es pública y Vite la incorpora durante la compilación.

```bash
npm ci
npm run build
```

Publica el contenido de `dist/`. El `.htaccess` incluido permite abrir directamente rutas SPA como `/modules/inventory`.

## Desarrollo

```bash
npm install
npm run dev
```

Vite enviará `/api` a `http://localhost:8080` durante el desarrollo local.
