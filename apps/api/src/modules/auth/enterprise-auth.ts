import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { auth } from 'express-oauth2-jwt-bearer';
import type { AppConfig } from '../../config/env.js';
import type { User, UserRole } from '../../core/models.js';
import type { PlatformRepository } from '../../core/enterprise-models.js';

declare global { namespace Express { interface Request { currentUser?: User; correlationId?: string } } }

export const createMockToken = (userId: string) => `mock:${userId}`;

export function createAuthentication(repository: PlatformRepository, config: AppConfig) {
  const verifyJwt = config.auth0.configured ? auth({ issuerBaseURL: config.auth0.issuer ?? `https://${config.auth0.domain}/`, audience: config.auth0.audience, tokenSigningAlg: 'RS256' }) : undefined;
  return (req: Request, res: Response, next: NextFunction): void => {
    req.correlationId = req.header('x-correlation-id') ?? randomUUID();
    res.setHeader('x-correlation-id', req.correlationId);
    const token = req.header('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
    const resolveUser = async () => {
      if (config.demoMode && token.startsWith('mock:')) return repository.findUserById(token.slice(5));
      const payload = req.auth?.payload as Record<string, unknown> | undefined;
      const email = payload?.email ?? payload?.['https://cybershield.example/email'];
      return typeof email === 'string' ? repository.findUserByEmail(email) : null;
    };
    const complete = () => { resolveUser().then((user) => { if (!user) return res.status(401).json({ error: { message: 'La identidad no está aprovisionada en esta empresa.' } }); req.currentUser = user; next(); }).catch(next); };
    if (config.demoMode && token.startsWith('mock:')) { complete(); return; }
    if (!verifyJwt) { res.status(503).json({ error: { message: 'Auth0 no está configurado y el modo demo está desactivado.' } }); return; }
    verifyJwt(req, res, (error?: unknown) => error ? next(error) : complete());
  };
}

export function requireRoles(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.currentUser || !roles.includes(req.currentUser.role)) { res.status(403).json({ error: { message: 'No tienes permisos para esta operación.' } }); return; }
    next();
  };
}
