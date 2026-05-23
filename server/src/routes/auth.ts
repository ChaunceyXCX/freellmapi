import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { getAdminPassword, getExpectedToken } from '../middleware/auth.js';

export const authRouter = Router();

const loginSchema = z.object({
  password: z.string().min(1),
});

authRouter.post('/login', (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { message: parsed.error.errors.map(e => e.message).join(', ') } });
    return;
  }

  const { password } = parsed.data;
  const adminPassword = getAdminPassword();

  if (password !== adminPassword) {
    res.status(401).json({ error: { message: 'Invalid password', type: 'authentication_error' } });
    return;
  }

  const token = getExpectedToken();
  res.json({ success: true, token });
});

authRouter.get('/session', (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) {
    res.json({ valid: false });
    return;
  }

  const expectedToken = getExpectedToken();
  if (token === expectedToken) {
    res.json({ valid: true });
  } else {
    res.json({ valid: false });
  }
});
