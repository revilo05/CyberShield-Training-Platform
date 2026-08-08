# Auth0 Organizations, Entra ID y SCIM

1. Crea una Auth0 Organization por empresa y una Enterprise Connection de Microsoft Entra ID.
2. Configura callback/logout/origins para el dominio web y audience de la API.
3. Activa inbound SCIM en Auth0. En Entra, aprovisiona `userName/email`, `displayName`, `department`, `active` y grupos.
4. Mapea grupos a `EMPLOYEE`, `SUPERVISOR` y `ADMIN`; aplica mínimo privilegio y una regla por defecto `EMPLOYEE`.
5. Incluye email y organization en el access token mediante una Auth0 Action con namespace propio.
6. Sincroniza desactivaciones estableciendo `users.active=false`; no borres resultados históricos.
7. Valida alta, cambio de departamento/rol y desactivación con una cuenta de prueba antes de habilitar todos los grupos.

La API solo acepta usuarios ya aprovisionados. No crea una cuenta automáticamente a partir de cualquier JWT válido, lo que evita acceso accidental desde otra Organization.
