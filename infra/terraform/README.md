# Infraestructura del piloto

El módulo crea ECS Fargate para API y worker, RDS PostgreSQL 16, ElastiCache Redis cifrado, ALB, ECR, CloudWatch, Secrets Manager, SES y un bucket temporal de exportaciones. Recibe VPC y subredes como entradas para no imponer el diseño de red corporativo.

Antes de `terraform apply`, crea el listener HTTPS del ALB con el certificado ACM aprobado, carga en Secrets Manager `DATABASE_URL`, `REDIS_URL`, credenciales Microsoft/OpenAI y configura las definiciones ECS para consumir esos secretos. La omisión es deliberada: Terraform no debe recibir secretos en texto plano ni guardarlos en state.

Ejecuta `terraform fmt -check`, `terraform validate` y un plan revisado. Mantén `deletion_protection=true` en RDS durante todo el piloto.
