# Seguridad, privacidad y gobierno

## Límites de confianza

- Auth0 valida organización, issuer, audience, firma RS256, expiración y scopes. Microsoft Entra ID funciona como conexión empresarial del broker.
- La autorización nunca confía en IDs enviados por el navegador: cada consulta administrativa vuelve a comprobar `companyId`.
- PostgreSQL RLS es una segunda barrera. Cada transacción de repositorio define `app.company_id`.
- El worker solo acepta eventos confirmados en `outbox_events`; `jobId=outbox-{id}` impide duplicados en Redis.

## Controles de simulación

- Nunca existe un campo para contraseña o código MFA en el contrato de eventos.
- El cuerpo público se limita a 256 KB y el endpoint tiene rate limit.
- Los tokens son opacos, expiran y su hash es lo único persistido.
- SES debe usar un subdominio dedicado. Antes de producción verifica SPF, DKIM y DMARC, dominio permitido, cuentas sensibles excluidas, envío de prueba y kill switch.
- El HTML de los escenarios debe ser contenido aprobado; no se permiten scripts, redirecciones abiertas ni formularios de credenciales.

## IA

Solo se envían industria, departamento genérico, objetivo, técnica y canal. El servicio no acepta nombres, emails ni resultados. Se usa Structured Output validado con Zod, `safety_identifier` seudónimo, modelo/prompt versionados y revisión humana. Aprobar cambia el estado del borrador; nunca altera el score ni publica una campaña automáticamente.

## Retención

Cada empresa tiene `retention_days=365`. `apply_company_retention(company_id)` genera primero agregados mensuales sin usuario y después elimina eventos, snapshots, evaluaciones, targets, outbox y auditoría vencidos. La auditoría es append-only para el runtime; solo la función privilegiada puede atravesar el trigger mediante un contexto de retención.

No programes esta función hasta completar un backup restaurable y aprobar el cambio con privacidad/legal. Ejecuta primero las consultas de conteo del runbook. La función es irreversible.

## Amenazas prioritarias

| Amenaza | Control |
|---|---|
| Cruce de tenant por ID | Filtro `company_id`, comprobación de recurso y RLS |
| JWT manipulado | JWKS/issuer/audience/RS256; demo prohibido en producción |
| Reenvío o duplicado | token con expiración, idempotency key y claves únicas |
| SSRF por webhook | HTTPS y `WEBHOOK_ALLOWED_HOSTS`; redirects deshabilitados |
| Fuga en logs | Pino redacta authorization, cookies, token y contenido |
| Duplicación de email | target único, claim `PENDING→SENDING`, outbox y BullMQ jobId |
| Prompt con PII | esquema de entrada cerrado y campos genéricos únicamente |
