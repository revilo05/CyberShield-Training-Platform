# Patrones de diseño del MVP

## Strategy

- `BehavioralRiskScoreStrategy` encapsula la fórmula del Cyber Risk Score y permite sustituirla sin cambiar rutas ni reportes.
- `SimulationEvaluationStrategyProvider` selecciona reglas diferentes para phishing e ingeniería social.
- Las estrategias de autorización definen permisos por rol (`EMPLOYEE`, `SUPERVISOR`, `ADMIN`) y se aplican como middleware.

## Factory Method

- `TrainingModuleFactoryProvider` crea módulos con valores y dificultad apropiados para cada categoría.
- `RoleMenuFactory` construye la navegación visible en el frontend según el rol autenticado.

## Observer / Event Bus

- `EventBus` publica `training.completed` y `simulation.completed`.
- `RiskScoreService` se suscribe a ambos eventos y recalcula el score inmediatamente.
- Los servicios guardan primero el progreso o resultado y luego emiten el evento; los controladores solo traducen HTTP.

## Persistencia

El MVP usa un repositorio seed en memoria para que la demostración no dependa de infraestructura. Las migraciones PostgreSQL reflejan el modelo mínimo y cargan datos equivalentes. El siguiente paso natural es implementar una interfaz de repositorio y sustituir la implementación en memoria por PostgreSQL sin cambiar los servicios de negocio.
