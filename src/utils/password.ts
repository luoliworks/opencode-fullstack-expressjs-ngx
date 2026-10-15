import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const KEYLEN = 64;
const PREFIX = 'scrypt';

// scrypt with a random 16-byte salt, encoded as: scrypt$<saltHex>$<hashHex>
export function hashPassword(password: string): string {
  const salt: string = randomBytes(16).toString('hex');
  const hash: string = scryptSync(password, salt, KEYLEN).toString('hex');
  return `${PREFIX}$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts: string[] = stored.split('$');
  if (parts.length !== 3 || parts[0] !== PREFIX) return false;
  const expected = Buffer.from(parts[2], 'hex');
  const actual: Buffer = scryptSync(password, parts[1], KEYLEN);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
