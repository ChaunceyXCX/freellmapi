import { describe, it, expect, beforeAll } from 'vitest';
import type { Express } from 'express';
import { createApp } from '../../app.js';
import { initDb } from '../../db/index.js';
import { getAdminPassword, getExpectedToken } from '../../middleware/auth.js';

async function request(app: Express, method: string, path: string, headers: Record<string, string> = {}, body?: any) {
  const server = app.listen(0);
  const addr = server.address() as any;
  const url = `http://127.0.0.1:${addr.port}${path}`;

  const res = await fetch(url, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => null);
  server.close();
  return { status: res.status, body: data };
}

describe('Auth API and Middleware', () => {
  let app: Express;

  beforeAll(() => {
    process.env.ENCRYPTION_KEY = '0'.repeat(64);
    process.env.ADMIN_PASSWORD = 'super-secret-password';
    initDb(':memory:');
    app = createApp();
  });

  it('POST /api/auth/login returns token for correct password', async () => {
    const { status, body } = await request(app, 'POST', '/api/auth/login', {}, {
      password: 'super-secret-password',
    });
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.token).toBe(getExpectedToken());
  });

  it('POST /api/auth/login returns 401 for incorrect password', async () => {
    const { status, body } = await request(app, 'POST', '/api/auth/login', {}, {
      password: 'wrong-password',
    });
    expect(status).toBe(401);
    expect(body.error.message).toBe('Invalid password');
  });

  it('GET /api/auth/session returns valid:true for correct token', async () => {
    const token = getExpectedToken();
    const { status, body } = await request(app, 'GET', '/api/auth/session', {
      Authorization: `Bearer ${token}`,
    });
    expect(status).toBe(200);
    expect(body.valid).toBe(true);
  });

  it('GET /api/auth/session returns valid:false for incorrect token', async () => {
    const { status, body } = await request(app, 'GET', '/api/auth/session', {
      Authorization: 'Bearer wrong-token',
    });
    expect(status).toBe(200);
    expect(body.valid).toBe(false);
  });

  it('GET /api/keys rejects request without token when NODE_ENV is production', async () => {
    const originalEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'production';
      const { status } = await request(app, 'GET', '/api/keys');
      expect(status).toBe(401);
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  it('GET /api/keys accepts request with valid token when NODE_ENV is production', async () => {
    const originalEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'production';
      const token = getExpectedToken();
      const { status } = await request(app, 'GET', '/api/keys', {
        Authorization: `Bearer ${token}`,
      });
      expect(status).toBe(200);
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });
});
