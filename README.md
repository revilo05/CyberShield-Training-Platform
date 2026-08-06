# CyberShield Training Platform

**CyberShield Training Platform** es una plataforma SaaS orientada a empresas que busca reducir el **riesgo humano en ciberseguridad** mediante entrenamiento interactivo, simulaciones realistas, rutas personalizadas y analítica de comportamiento.

La nueva idea del proyecto evoluciona de una simple plataforma de cursos a un producto de **gestión y medición del riesgo humano**, donde los administradores pueden identificar usuarios vulnerables, medir progreso y tomar decisiones basadas en datos.

## Integrantes

- Oliver Abreu Mateo — 25-1619
- Pedro Abreu — 23-1253
- Leandro Coiscou — 24-0557

## Problema que resuelve

Muchas empresas sufren incidentes de seguridad por errores humanos: phishing, contraseñas débiles, ingeniería social, descargas sospechosas y malas prácticas digitales. CyberShield permite entrenar a los empleados y medir su nivel de riesgo antes de que ocurra un incidente real.

## Propuesta de valor

CyberShield ayuda a convertir a los empleados en la primera línea de defensa de la organización.

El sistema ofrece:

- Simulaciones realistas de phishing e ingeniería social.
- Módulos cortos de aprendizaje.
- Rutas de entrenamiento personalizadas.
- Cyber Risk Score por empleado, departamento y empresa.
- Dashboard administrativo con métricas de riesgo.
- Gamificación para aumentar participación.
- Reportes de evidencia para auditorías internas.

## Stack técnico propuesto

- **Frontend:** React + TypeScript + Vite
- **Backend:** Node.js + Express + TypeScript
- **Base de datos:** PostgreSQL
- **Cache / sesiones:** Redis
- **Autenticación:** Auth0 / OAuth 2.0 / OpenID Connect
- **Infraestructura local:** Docker Compose
- **Cloud objetivo:** AWS

## Estructura del repositorio

```txt
apps/
  api/          Backend Express + TypeScript
  web/          Frontend React + TypeScript
packages/
  shared/       Tipos compartidos
database/
  migrations/   Esquema inicial PostgreSQL
infra/
  docker/       Docker Compose local
docs/
  mvp/          Alcance del MVP
  architecture/ Arquitectura y decisiones técnicas
```

## Ejecutar localmente

```bash
npm install
npm run docker:up
npm run dev:api
npm run dev:web
```

## Estado del proyecto

Repositorio inicializado para comenzar el desarrollo del MVP académico y funcional de CyberShield.
