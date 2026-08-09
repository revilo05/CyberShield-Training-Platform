import type { NextFunction, Request, Response } from 'express';
import type { User } from '../../core/models.js';
import { store } from '../../data/seed-store.js';

declare global {
  namespace Express {
    interface Request { currentUser?: User }
  }
}

export function createMockToken(userId: string): string {
  return `mock:${userId}`;
}

export function requireAuthentication(req: Request, res: Response, next: NextFunction): void {
  const authorization = req.header('authorization');
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : '';
  const userId = token.startsWith('mock:') ? token.slice(5) : '';
  const user = store.users.find((candidate) => candidate.id === userId);

  if (!user) {
    res.status(401).json({ error: { message: 'Debes iniciar sesión para continuar.' } });
    return;
  }
  req.currentUser = user;
  next();
}
