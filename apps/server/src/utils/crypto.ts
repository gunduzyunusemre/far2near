import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { RoomTokenPayload, UserRole } from '@far2near/shared-types';

const JWT_SECRET = process.env.JWT_SECRET || 'far2near-default-secret-key-change-in-prod-2026';

/**
 * Generate a 6-character secure uppercase alphanumeric room code (e.g. A3B9K2)
 */
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid confusing chars like 0/O, 1/I
  let result = '';
  const randomBytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) {
    result += chars[randomBytes[i] % chars.length];
  }
  return result;
}

/**
 * Sign a short-lived Room Token (15 min access)
 */
export function signRoomToken(payload: Omit<RoomTokenPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
}

/**
 * Verify and decode a Room Token
 */
export function verifyRoomToken(token: string): RoomTokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as RoomTokenPayload;
  } catch {
    return null;
  }
}
