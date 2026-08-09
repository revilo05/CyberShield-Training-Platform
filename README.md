# CyberShield Training Platform

Piloto empresarial para gestionar riesgo humano: entrenamiento, simulaciones controladas, campañas, reporting, analítica explicable e integraciones empresariales.

## Inicio rápido

Requisitos: Node.js 24 LTS, npm, Docker Desktop.

```bash
npm install
npm run docker:up
npm run db:migrate
```

Después inicia, en terminales separadas:

```bash
npm run dev:api
npm run dev:worker
npm run dev:web
```

Abre `http://localhost:5173`. En desarrollo puedes usar `admin@cybershield.demo`; `DEMO_MODE` se rechaza en producción.

## Arquitectura

- `apps/web`: React + Vite, Auth0 Organizations y centro Enterprise Pilot.
- `apps/api`: Express, JWT OIDC/JWKS, repositorios PostgreSQL, HRS-2.0, campañas, webhooks, Graph, OpenAI y exportaciones.
- `apps/worker`: BullMQ/Redis, outbox, SES, reintentos, rate limiting y DLQ.
- `packages/shared`: contratos TypeScript de tenant, campaña, riesgo, contenido y auditoría.
- `database/migrations`: esquema, contenido, RLS, retención y seeds de desarrollo.
- `infra/terraform`: ECS Fargate, RDS, ElastiCache, SES, ECR, Secrets Manager y CloudWatch.

## Calidad

```bash
npm run verify
```

El comando ejecuta TypeScript estricto, pruebas golden/unitarias y builds de los cuatro workspaces. CI repite la validación con PostgreSQL 16 y Redis reales.

## Documentación

- [Diseño del piloto](docs/ENTERPRISE_PILOT.md)
- [Paso a paso de pruebas](docs/TESTING.md)
- [Seguridad, privacidad y retención](docs/SECURITY_PRIVACY.md)
- [Runbooks operativos](docs/RUNBOOKS.md)
- [Auth0, Entra ID y SCIM](docs/AUTH0_ENTRA_SCIM.md)
- [API v1](docs/API_V1.md)
- [Infraestructura AWS](infra/terraform/README.md)

## Convenciones críticas

`0` representa menor riesgo y `100` mayor riesgo. HRS-2.0 nunca mezcla exposición del puesto con conducta, guarda snapshots por versión y muestra confianza. Los borradores de IA no publican contenido ni modifican scores. Las simulaciones no recopilan credenciales y no usan píxeles de apertura.
