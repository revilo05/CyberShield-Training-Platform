import { Router } from 'express';
import { z } from 'zod';
import { store } from '../../data/seed-store.js';
import { createMockToken, requireAuthentication } from './auth.middleware.js';

const loginSchema = z.object({ email: z.string().email() });
export const authRouter = Router();

authRouter.get('/users', (_req, res) => {
  res.json({ data: store.users.map(({ id, fullName, email, role, department }) => ({ id, fullName, email, role, department })) });
});

authRouter.post('/login', (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { message: 'Introduce un correo válido.', details: parsed.error.flatten() } });
    return;
  }
  const user = store.users.find((candidate) => candidate.email.toLowerCase() === parsed.data.email.toLowerCase());
  if (!user) {
    res.status(401).json({ error: { message: 'Ese usuario no existe en el entorno demo.' } });
    return;
  }
  res.json({ data: { token: createMockToken(user.id), user } });
});

authRouter.get('/me', requireAuthentication, (req, res) => res.json({ data: req.currentUser }));
