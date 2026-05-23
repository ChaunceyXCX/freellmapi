import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { getUnifiedApiKey } from '../db/index.js';

function timingSafeStringEqual(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  const compareA = a.length === b.length ? a : Buffer.alloc(b.length);
  return crypto.timingSafeEqual(compareA, b) && a.length === b.length;
}

export function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD || getUnifiedApiKey();
}

export function getExpectedToken(): string {
  const password = getAdminPassword();
  return crypto.createHash('sha256').update(password).digest('hex');
}

export function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  if (process.env.NODE_ENV === 'test') {
    next();
    return;
  }

  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) {
    res.status(401).json({ error: { message: 'Unauthorized: Missing API key', type: 'authentication_error' } });
    return;
  }

  const expectedToken = getExpectedToken();
  if (!timingSafeStringEqual(token, expectedToken)) {
    res.status(401).json({ error: { message: 'Unauthorized: Invalid API key', type: 'authentication_error' } });
    return;
  }

  next();
}
