import { createHmac, timingSafeEqual } from 'node:crypto';

// HS256 JWT implemented on Node's built-in crypto — no extra dependency.
// Algorithm is hardcoded on verify, so there is no alg-confusion surface.
const SECRET: string = process.env.JWT_SECRET ?? 'dev-only-insecure-secret';
if (process.env.JWT_SECRET === undefined) {
  console.warn('[auth] JWT_SECRET is not set — using an insecure dev fallback. Set JWT_SECRET in production.');
}

const EXPIRES_IN_SEC: number = Number(process.env.JWT_EXPIRES_IN ?? 7 * 24 * 3600);

export interface AuthPayload {
  sub: number; // user id
  username: string;
  role: string;
  iat: number;
  exp: number;
}

function b64urlEncode(input: string): string {
  return Buffer.from(input).toString('base64url');
}

function signPart(data: string): Buffer {
  return createHmac('sha256', SECRET).update(data).digest();
}

export function signToken(user: { id: number; username: string; role: string }): string {
  const now: number = Math.floor(Date.now() / 1000);
  const header: string = b64urlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload: string = b64urlEncode(
    JSON.stringify({
      sub: user.id,
      username: user.username,
      role: user.role,
      iat: now,
      exp: now + EXPIRES_IN_SEC,
    }),
  );
  const data: string = `${header}.${payload}`;
  return `${data}.${signPart(data).toString('base64url')}`;
}

export function verifyToken(token: string): AuthPayload | null {
  const parts: string[] = token.split('.');
  if (parts.length !== 3) return null;
  let header: { alg?: unknown };
  let payload: AuthPayload;
  try {
    header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8')) as { alg?: unknown };
    payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as AuthPayload;
  } catch {
    return null;
  }
  if (header.alg !== 'HS256') return null;
  const expected: Buffer = signPart(`${parts[0]}.${parts[1]}`);
  const actual = Buffer.from(parts[2], 'base64url');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  if (typeof payload.exp !== 'number' || typeof payload.sub !== 'number') return null;
  if (payload.exp * 1000 < Date.now()) return null;
  return payload;
}
