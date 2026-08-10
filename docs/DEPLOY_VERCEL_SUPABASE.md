# Despliegue en Vercel y Supabase

Esta variante usa un solo proyecto Vercel para React y Express, y un proyecto Supabase como PostgreSQL administrado. Auth0 sigue siendo el proveedor de identidad. Redis y BullMQ no son necesarios en produccion: Vercel Cron procesa el outbox en lotes pequenos, con locks, reintentos y dead-letter.

## 1. Requisitos

- Cuenta y proyecto en Vercel.
- Proyecto Supabase activo en una region cercana a los usuarios.
- Tenant de Auth0 con una SPA y una API configuradas.
- Node.js 24 LTS y npm para ejecutar migraciones.
- Un remitente verificado en Amazon SES si se enviaran campanas reales.

## 2. Crear Supabase

1. Crea un proyecto vacio. Para Republica Dominicana, us-east-1 suele ser una opcion razonable.
2. En Connect, copia dos conexiones distintas:
   - Direct connection, puerto 5432: solo para migraciones y tareas administrativas.
   - Shared Pooler transaction mode, puerto 6543: para DATABASE_URL en Vercel.
3. Ambas conexiones deben exigir TLS. Descarga tambien el certificado CA de servidor desde Database Settings, SSL Configuration. No publiques la contrasena, una service role key ni el valor configurado en variables de entorno.
4. Ejecuta las migraciones con la conexion directa:

~~~powershell
$env:NODE_ENV = 'development'
$env:DATABASE_URL = 'postgresql://...direct.../postgres?sslmode=verify-full'
$env:NODE_EXTRA_CA_CERTS = 'C:\ruta\prod-ca-2021.crt'
$env:AUTO_MIGRATE = 'false'
npm run db:migrate
~~~

5. Verifica que schema_migrations contenga 001 a 008.
6. Ejecuta los Security y Performance Advisors de Supabase y resuelve cualquier hallazgo nuevo antes de abrir el piloto.

La migracion 008 revoca el acceso directo de anon y authenticated a las tablas internas. El navegador nunca usa una clave de Supabase; toda lectura pasa por Express y Auth0.

## 3. Preparar Auth0

1. Configura la API con el audience que usaras en AUTH0_AUDIENCE.
2. Configura la SPA con el dominio final de Vercel.
3. Agrega estas URLs:
   - Allowed Callback URLs: https://TU-DOMINIO
   - Allowed Logout URLs: https://TU-DOMINIO
   - Allowed Web Origins: https://TU-DOMINIO
4. Conserva DEMO_MODE=false en produccion.

## 4. Variables de Vercel

Configura estos valores en Project Settings, Environment Variables. Los secretos deben aplicarse a Production y, cuando corresponda, a Preview.

| Variable | Uso |
| --- | --- |
| DATABASE_URL | Shared Pooler transaction mode, puerto 6543. No agregues parametros `sslmode`, `sslcert`, `sslkey` o `sslrootcert` cuando uses `DATABASE_SSL_CA_BASE64` |
| DATABASE_SSL_CA_BASE64 | Certificado CA de Supabase codificado como Base64 en una sola linea; secreto solo del servidor |
| DATABASE_POOL_MAX | 3 |
| AUTO_MIGRATE | false |
| DEMO_MODE | false |
| WEB_ORIGIN | URL publica exacta de Vercel |
| AUTH0_DOMAIN | Dominio del tenant Auth0 |
| AUTH0_AUDIENCE | Audience de la API |
| AUTH0_ISSUER | URL issuer terminada en slash |
| VITE_AUTH0_DOMAIN | Dominio Auth0 visible para la SPA |
| VITE_AUTH0_CLIENT_ID | Client ID de la SPA |
| VITE_AUTH0_AUDIENCE | Mismo audience de la API |
| VITE_AUTH0_ORGANIZATION | Organization ID del piloto, si se exige |
| CRON_SECRET | Secreto aleatorio de al menos 32 caracteres |
| OUTBOX_BATCH_SIZE | 10 inicialmente |
| CAMPAIGN_BATCH_SIZE | 20 inicialmente |
| WEBHOOK_ALLOWED_HOSTS | Hosts HTTPS separados por coma |

VITE_API_URL se omite porque web y API comparten origen. REDIS_URL tampoco se usa en esta variante.

Convierte el certificado descargado a Base64 sin escribir una copia PEM dentro del repositorio:

~~~powershell
$bytes = [System.IO.File]::ReadAllBytes('C:\ruta\prod-ca-2021.crt')
[Convert]::ToBase64String($bytes)
~~~

Copia la salida completa en `DATABASE_SSL_CA_BASE64` desde Project Settings. La API la decodifica en memoria y configura `pg` con `ssl.ca` y `rejectUnauthorized: true`. Cuando esta variable existe, la aplicacion elimina de la URL solo los parametros TLS que `pg` usaria para reemplazar ese objeto SSL; conserva los demas parametros.

Para desarrollo local puedes dejar `DATABASE_SSL_CA_BASE64` vacia y usar `NODE_EXTRA_CA_CERTS=C:\ruta\prod-ca-2021.crt` junto con `sslmode=verify-full` en `DATABASE_URL`. `NODE_EXTRA_CA_CERTS` debe existir antes de iniciar Node.js.

Para campanas agrega AWS_REGION y SES_FROM_EMAIL. Para funciones opcionales agrega las credenciales Microsoft y OPENAI_API_KEY. No configures claves que una funcion no necesite.

## 5. Desplegar Vercel

1. Importa el repositorio en Vercel y selecciona la raiz del monorepo.
2. Vercel detectara vercel.json:
   - Install command: npm ci --include=dev
   - Build command: npm run build:vercel
   - Output: apps/web/dist
   - Function: api/index.ts
3. Agrega las variables anteriores.
   No agregues `NODE_ENV` manualmente en Project Settings: Vercel define el entorno de produccion y npm puede omitir las dependencias de compilacion si recibe `NODE_ENV=production` durante la instalacion.
4. Ejecuta primero un Preview Deployment.
5. Prueba /api/health, login, modulos y dashboard.
6. Promueve exactamente ese preview a produccion.
7. Los crons solo se activan en produccion. La frecuencia de un minuto depende del plan de Vercel; si el plan no la permite, usa Supabase Cron para invocar el mismo endpoint protegido.

Tambien puedes desplegar con CLI:

~~~powershell
npx vercel link
npx vercel
npx vercel --prod
~~~

## 6. Validacion posterior

~~~powershell
Invoke-RestMethod 'https://TU-DOMINIO/api/health'
~~~

El resultado esperado incluye status ok, persistence postgresql y scoreVersion HRS-2.0.

Despues valida:

1. Login Auth0 y rechazo de tokens invalidos.
2. Consulta de un tenant y rechazo de IDs de otra empresa.
3. Creacion y programacion de una campana de prueba para una sola cuenta controlada.
4. Ejecucion del cron con Authorization Bearer CRON_SECRET.
5. Registro DELIVERED sin duplicados y consumo unico del token.
6. Reintento de un webhook fallido y paso a dead-letter en el octavo fallo.
7. Logs de Vercel sin credenciales, tokens ni PII innecesaria.
8. Advisors de Supabase sin tablas expuestas accidentalmente.

## 7. Operacion y rollback

- No habilites AUTO_MIGRATE en Vercel. Las migraciones son una operacion separada y auditable.
- Para rollback de aplicacion, promueve un deployment anterior en Vercel.
- Las migraciones deben ser aditivas; prepara una migracion compensatoria, no borres tablas en caliente.
- Antes de una campana grande, prueba con una cuenta, confirma SES fuera de sandbox y monitorea rebotes.
- Conserva el worker BullMQ solo si luego despliegas un proceso persistente en otra plataforma. No lo ejecutes como Vercel Function.
