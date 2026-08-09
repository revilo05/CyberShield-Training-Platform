# Paso a paso para probar

## Entorno local

1. Copia `.env.example` a `.env`. Deja `SES_FROM_EMAIL`, credenciales Microsoft y `OPENAI_API_KEY` vacíos para una prueba sin servicios externos.
2. Ejecuta `npm install`.
3. Inicia datos con `npm run docker:up`.
4. Aplica esquema con `npm run db:migrate`.
5. En tres terminales ejecuta `npm run dev:api`, `npm run dev:worker` y `npm run dev:web`.
6. Abre `http://localhost:5173` e ingresa con `admin@cybershield.demo`.
7. En **Enterprise Pilot**, crea una campaña. Confirma audiencia y escenario; luego programa. Sin SES, el worker usa transporte `LOCAL` y nunca envía correo real.
8. Comprueba `DRAFT → SCHEDULED → RUNNING → COMPLETED` y resultados en PostgreSQL.

## Verificación automatizada

Ejecuta `npm run verify`. Deben pasar TypeScript, 5 pruebas unitarias/golden y los cuatro builds. Para validar el catálogo: `SELECT COUNT(*) FROM training_modules;` debe ser al menos 8 y `scenario_versions` al menos 12.

## Integraciones reales

- Auth0/Entra: configura las variables `VITE_AUTH0_*` y `AUTH0_*`, asigna una Organization y aprovisiona los emails existentes mediante la conexión SCIM de Auth0.
- SES: valida el dominio dedicado y DKIM; añade `SES_FROM_EMAIL` solo después de un envío de prueba y aprobación.
- Microsoft Graph: concede `ThreatAssessment.ReadWrite.All` mediante consentimiento administrativo y llama el endpoint con una muestra no sensible.
- OpenAI: configura la clave; genera un borrador y verifica `model`, `promptVersion`, estado `REVIEW`, esquema válido y ausencia de PII.
- Webhook: añade el host a `WEBHOOK_ALLOWED_HOSTS`, registra el endpoint y verifica `HMAC-SHA256(timestamp.body)` usando la clave derivada SHA-256 del secreto entregado.

## Pruebas de seguridad mínimas

- Cambia un user ID por el de otra empresa: debe responder 404.
- Repite el mismo `idempotencyKey`: el segundo evento no crea filas.
- Usa token vencido o aleatorio: debe responder 404 sin revelar si existió.
- Registra webhook a IP privada/host no permitido: debe responder 400.
- Busca `password`, `authorization` y tokens en logs: los valores deben estar ausentes o redactados.
