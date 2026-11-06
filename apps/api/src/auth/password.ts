import { randomBytes } from 'node:crypto';
import { hash, verify } from '@node-rs/argon2';

/**
 * Password hashing with argon2id - the current OWASP recommendation.
 *
 * - A HASH is one-way: we can check a password against it, but never get the password back.
 * - Each hash has its own random SALT, so two users with the same password get different hashes
 *   and pre-computed "rainbow tables" are useless.
 * - argon2 is deliberately SLOW and memory-hungry (~19 MiB per hash), which makes guessing
 *   billions of passwords with GPUs impractical. Never use fast hashes like MD5/SHA for passwords.
 *
 * The output string ("$argon2id$v=19$m=19456,t=2,p=1$<salt>$<hash>") stores the parameters,
 * so we can raise them later and old hashes still verify.
 */
export function hashPassword(password: string): Promise<string> {
  return hash(password);
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false; // malformed hash -> treat as wrong password
  }
}

/**
 * When an email doesn't exist we still spend the same time hashing, so an attacker
 * can't tell "no such user" (fast) from "wrong password" (slow) by timing the response.
 */
let dummyHash: Promise<string> | undefined;
export async function burnPasswordCheckTime(password: string): Promise<void> {
  dummyHash ??= hash(randomBytes(16).toString('hex'));
  await verifyPassword(await dummyHash, password);
}
