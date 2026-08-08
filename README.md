# CyberShield Training Platform

MVP funcional de una plataforma SaaS para medir y reducir el riesgo humano en ciberseguridad mediante entrenamiento, simulaciones y un **Cyber Risk Score** de 0 a 100.

## Flujo demostrable

`Login mock → Dashboard → Módulos → Simulación → Score actualizado → Reporte administrativo`

El MVP usa datos seed en memoria para funcionar inmediatamente. PostgreSQL y Redis quedan disponibles mediante Docker Compose, con migraciones y seeds equivalentes para la siguiente fase de persistencia.

## Stack

- React + TypeScript + Vite
- Node.js + Express + TypeScript
- PostgreSQL 16 y Redis 7
- npm workspaces

## Requisitos

- Node.js 20 o superior
- npm 10 o superior
- Docker Desktop, solo para PostgreSQL y Redis

## Instalación y ejecución

Desde la raíz del repositorio:

```bash
npm install
npm run docker:up
```

Abre dos terminales:

```bash
npm run dev:api
```

```bash
npm run dev:web
```

- Web: `http://localhost:5173`
- API: `http://localhost:4000`
- Health check: `http://localhost:4000/health`

La API no requiere Docker para el demo porque usa seeds en memoria. `npm run docker:up` prepara PostgreSQL y Redis para validar la infraestructura y las migraciones.

## Usuarios mock

No requieren contraseña y se seleccionan en la pantalla de acceso.

| Rol | Correo | Alcance |
| --- | --- | --- |
| EMPLOYEE | `empleado@cybershield.demo` | Entrenamiento, simulaciones y riesgo propio |
| SUPERVISOR | `supervisor@cybershield.demo` | Funciones de empleado, dashboard y reportes |
| ADMIN | `admin@cybershield.demo` | Acceso completo al MVP |

También existen `diego@cybershield.demo` y `sofia@cybershield.demo` como datos de reporte.

## Endpoints principales

| Método | Ruta | Acceso |
| --- | --- | --- |
| GET | `/health` | Público |
| GET | `/api/auth/users` | Público, perfiles demo |
| POST | `/api/auth/login` | Público |
| GET | `/api/auth/me` | Autenticado |
| GET | `/api/training/modules` | Autenticado |
| GET | `/api/training/modules/:moduleId` | Autenticado |
| GET | `/api/training/progress/me` | Autenticado |
| PATCH | `/api/training/progress/:moduleId` | Autenticado |
| GET | `/api/simulations` | Autenticado |
| POST | `/api/simulations/:simulationId/answers` | Autenticado |
| GET | `/api/simulations/results/me` | Autenticado |
| GET | `/api/risk-score/me` | Autenticado |
| POST | `/api/risk-score/preview` | SUPERVISOR o ADMIN |
| GET | `/api/admin/dashboard` | SUPERVISOR o ADMIN |
| GET | `/api/reports/progress` | SUPERVISOR o ADMIN |

Usa el token devuelto por login como `Authorization: Bearer mock:<user-id>`.

## Cyber Risk Score

La estrategia actual comienza con un riesgo base y pondera:

- +18 por simulación fallida.
- +12 por error repetido.
- Hasta −25 por completar la ruta.
- −5 por amenaza reportada correctamente.

El resultado se limita entre 0 y 100: `LOW` (0–30), `MEDIUM` (31–70) o `HIGH` (71–100). Cada nivel produce recomendaciones automáticas.

## Patrones de diseño

- **Strategy:** score, evaluación de simulaciones y autorización.
- **Factory Method:** módulos por categoría y menú por rol.
- **Observer/Event Bus:** recalcula el score al completar un módulo o responder una simulación.

La explicación técnica está en `docs/architecture/MVP_PATTERNS.md`.

## Base de datos

Docker ejecuta automáticamente:

1. `database/migrations/001_initial_schema.sql`
2. `database/migrations/002_mvp_seed.sql`

Si ya existe el volumen de PostgreSQL y necesitas volver a ejecutar las migraciones, usa `npm run docker:down`, elimina el volumen de forma intencional y vuelve a ejecutar `npm run docker:up`.

## Validación

```bash
npm run build
```

Compila API, web y tipos compartidos con TypeScript estricto.

## Estructura relevante

```text
apps/api/src/
  core/           Eventos, errores y modelos
  data/           Repositorio seed en memoria
  modules/        Auth, training, simulations, risk-score y reports
apps/web/src/
  auth/           Sesión mock
  components/     Layout y componentes reutilizables
  navigation/     Factory de menú por rol
  pages/          Vistas del MVP
  services/       Cliente de API
database/migrations/
docs/architecture/
```

## Próximos pasos

- Sustituir el repositorio en memoria por PostgreSQL mediante una interfaz de persistencia.
- Integrar Auth0/OIDC y sesiones en Redis.
- Añadir pruebas automatizadas unitarias y de integración.
- Incorporar creación de campañas, auditoría y exportación de reportes.
