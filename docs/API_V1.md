# API v1

Todas las rutas salvo `POST /api/v1/simulation-events` requieren bearer token. Las respuestas usan `{ data }`; los errores incluyen un `x-correlation-id`.

- Campañas: `GET|POST /api/v1/campaigns`, `POST /:id/schedule|pause|cancel`, `GET /:id/results`.
- Escenarios: `GET /api/v1/scenarios`.
- Eventos: `POST /api/v1/simulation-events` con token, tipo e idempotency key.
- Riesgo: `GET /api/v1/risk/users/:id`, `/history` y `/api/v1/analytics/overview`.
- Contenido: `GET|POST /api/v1/content/drafts`, `POST /:id/approve`.
- Microsoft: `GET /api/v1/integrations/microsoft/status`, `POST /threat-assessments`.
- Integraciones: `GET /api/v1/integrations/status`.
- Webhooks: `GET|POST /api/v1/webhooks`.
- Exportación: `GET /api/v1/exports/risk.csv`, `/risk.pdf`, `/api/v1/siem/events?since=...`.

Los endpoints heredados de entrenamiento, simulaciones y reportes se mantienen para la interfaz del MVP, pero ya usan PostgreSQL.
