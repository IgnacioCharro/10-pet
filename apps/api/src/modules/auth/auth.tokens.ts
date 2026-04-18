import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../../config/env';

export interface AccessTokenPayload {
  sub: string;
  email: string;
}

export const signAccessToken = (payload: AccessTokenPayload): string => {
  const options: SignOptions = {
    expiresIn: env.JWT_ACCESS_EXPIRES as SignOptions['expiresIn'],
    algorithm: 'HS256',
  };
  return jwt.sign(payload, env.JWT_SECRET, options);
};

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
  if (typeof decoded === 'string' || !decoded.sub) {
    throw new Error('Token payload invalido');
  }
  return { sub: String(decoded.sub), email: String(decoded['email'] ?? '') };
};

export const generateRefreshToken = (): string => {
  return crypto.randomBytes(48).toString('hex');
};

export const hashRefreshToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

const DURATION_RE = /^(\d+)([smhd])$/;

export const parseDurationToMs = (value: string): number => {
  const match = DURATION_RE.exec(value.trim());
  if (!match) {
    throw new Error(`Duracion invalida: ${value}`);
  }
  const amount = Number(match[1]);
  const unit = match[2];
  const unitMs: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return amount * unitMs[unit]!;
};

export const refreshExpiresAt = (): Date => {
  return new Date(Date.now() + parseDurationToMs(env.JWT_REFRESH_EXPIRES));
};
