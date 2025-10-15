# Partner Codes

Este repositorio contiene dos piezas principales:

- **Módulos de servidor** en `src/` que encapsulan la lógica para validar y exponer rutas relacionadas con códigos de partners.
- **Panel web de referidos** en `referral-system-web/`, un proyecto Vite con componentes vanilla que simulan los flujos para distintos roles (admin, ejecutivo, finanzas y partner).

## Requisitos previos

- Node.js 18 o superior.
- npm 9 o superior.

## Puesta en marcha

### Panel web (Vite)

1. Instalar dependencias:

   ```bash
   cd referral-system-web
   npm install
   ```

2. Iniciar el entorno de desarrollo:

   ```bash
   npm run dev
   ```

   Vite mostrará en consola la URL local (por defecto `http://localhost:5173`) para navegar el panel.

3. Comandos adicionales:

   ```bash
   npm run build    # genera la versión optimizada
   npm run preview  # sirve la build para verificación manual
   ```

### Módulos de servidor

En la raíz (`/workspace/partner_codes`) basta con instalar dependencias para poder reutilizar los módulos de Express en otro proyecto:

```bash
npm install
```

No hay un servidor ejecutable incluido; los módulos están pensados para integrarse en un servicio existente.

## Organización del código

### Backend (`src/`)

- `src/validators.js`: funciones puras para validar formatos de códigos (`isValidCode`), verificar si un código puede usarse (`canUseCode`) y exigir `parent_partner_id` en afiliados (`requireParentForAffiliate`). 【F:src/validators.js†L1-L52】【F:src/validators.js†L54-L78】
- `src/routes/codes.js`: registra rutas Express para crear códigos y registrar usos. Aplica las validaciones anteriores antes de delegar en un `codeService` inyectado. 【F:src/routes/codes.js†L1-L55】【F:src/routes/codes.js†L57-L86】

### Frontend (`referral-system-web/src/`)

- `src/js/main.js`: punto de entrada. Monta el layout, registra rutas por rol y sincroniza la barra lateral. 【F:referral-system-web/src/js/main.js†L1-L103】【F:referral-system-web/src/js/main.js†L105-L152】
- `src/js/router.js`: router en memoria que registra vistas por rol y renderiza el contenido dinámicamente. 【F:referral-system-web/src/js/router.js†L1-L89】【F:referral-system-web/src/js/router.js†L91-L137】
- `src/js/views/`: vistas específicas por rol (admin, ejecutivo, finanzas, partner) que componen métricas, tablas y flujos. 【F:referral-system-web/src/js/main.js†L5-L38】
- `src/components/`: librería de UI reutilizable (sidebar, KPI cards, tablas, formularios, modales, toast, gráficas). 【F:referral-system-web/README.md†L1-L74】【F:referral-system-web/README.md†L76-L125】
- `src/js/api/`: adaptadores y rutas simuladas para usuarios, códigos, reportes e invoices; emplean la base en memoria. 【F:referral-system-web/src/js/api/routes.codes.js†L1-L120】
- `src/js/biz/`: utilidades de negocio (seed, cálculos de payouts, sumarios y acceso a la base). 【F:referral-system-web/src/js/db.js†L1-L74】
- `src/js/db.js`: base de datos en memoria con persistencia en `localStorage`. 【F:referral-system-web/src/js/db.js†L1-L74】【F:referral-system-web/src/js/db.js†L76-L113】
- `src/styles/`: estilos globales (`base.css`) y específicos (`dashboard.css`, `tables.css`).
- `src/data/`: datos CSV/JSON para poblar el entorno.

### Semillas y almacenamiento

El archivo `referral-system-web/src/seed.js` inicializa la base local en el primer arranque y garantiza que los datos de ejemplo estén disponibles para todas las vistas. Los datos persisten en `localStorage` mediante `src/js/db.js`, por lo que puedes reiniciar el estado borrando esa clave (`referral-system-db`). 【F:referral-system-web/src/js/main.js†L1-L14】【F:referral-system-web/src/js/db.js†L1-L74】

## Notas adicionales

- La lógica compartida del backend no expone endpoints por sí sola: necesitas proporcionar una implementación de `codeService` al registrar las rutas Express. 【F:src/routes/codes.js†L5-L23】
- El panel web se diseñó para interactuar con datos en memoria, por lo que no requiere backend para visualizar flujos y componentes.
