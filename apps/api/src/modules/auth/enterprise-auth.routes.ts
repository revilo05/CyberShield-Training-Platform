import { Router } from 'express';
import { z } from 'zod';
import type { AppConfig } from '../../config/env.js';
import type { PlatformRepository } from '../../core/enterprise-models.js';
import { createAuthentication, createMockToken } from './enterprise-auth.js';

export function createEnterpriseAuthRouter(repository: PlatformRepository, config: AppConfig) {
  const router = Router(); const authenticate = createAuthentication(repository, config);
  router.get('/users', async (_req, res, next) => { try { if (!config.demoMode) return res.status(404).json({ error: { message: 'Modo demo desactivado.' } }); const user = await repository.findUserByEmail('admin@cybershield.demo'); if (!user) return res.json({ data: [] }); res.json({ data: await repository.listUsers(user.companyId) }); } catch (error) { next(error); } });
  router.post('/login', async (req, res, next) => { try { if (!config.demoMode) return res.status(404).json({ error: { message: 'Usa el inicio de sesión empresarial.' } }); const parsed = z.object({ email: z.string().email() }).parse(req.body); const user = await repository.findUserByEmail(parsed.email); if (!user) return res.status(401).json({ error: { message: 'Usuario demo no encontrado.' } }); res.json({ data: { token: createMockToken(user.id), user } }); } catch (error) { next(error); } });
  router.get('/me', authenticate, (req, res) => res.json({ data: req.currentUser }));
  router.get('/config', (_req, res) => res.json({ data: { demoMode: config.demoMode, auth0: config.auth0.configured ? { domain: config.auth0.domain, audience: config.auth0.audience } : null } }));
  return router;
}
