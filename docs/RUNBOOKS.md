# Runbooks operativos

## Pausar o cancelar una campaña

1. Un `ADMIN` usa `POST /api/v1/campaigns/{id}/pause` o `/cancel`.
2. Confirma el nuevo estado con `GET /api/v1/campaigns`.
3. El worker comprueba el estado antes de cada destinatario. Los targets todavía `PENDING` no se envían.
4. Registra el incidente y conserva el `x-correlation-id`.

## DLQ

Revisa `cybershield-campaigns-dlq` y `cybershield-webhooks-dlq`. Corrige primero proveedor, DNS, rate limit o secreto. Reencola usando el mismo `outboxId`: las claves únicas y estados de target impiden repetir entregas confirmadas.

## Retención anual

1. Verifica backup y restauración de RDS.
2. Para la empresa objetivo, calcula los registros afectados: `SELECT COUNT(*) FROM behavior_events WHERE company_id=$1 AND occurred_at < NOW()-(SELECT make_interval(days=>retention_days) FROM companies WHERE id=$1);`.
3. Confirma que el catálogo de anonimización cumple el acuerdo del piloto.
4. Dentro de una ventana aprobada ejecuta `SELECT apply_company_retention($1);`.
5. Conserva el JSON de resultado en el ticket operativo, no en logs públicos.

## Recuperación

- RPO objetivo: 24 h; RTO objetivo: 4 h para el piloto.
- Restaura RDS a una instancia nueva, ejecuta migraciones pendientes y valida conteos por empresa.
- Usa un Redis nuevo; el outbox PostgreSQL repuebla trabajos no procesados.
- Ejecuta un envío local/de prueba antes de reactivar SES.
