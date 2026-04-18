import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';
import { User, RefreshToken } from '../../db';
import {
  signAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  refreshExpiresAt,
} from './auth.tokens';
import {
  emailAlreadyRegistered,
  invalidCredentials,
  invalidRefreshToken,
} from './auth.errors';
import type { LoginInput, RegisterInput } from './auth.validators';

const BCRYPT_COST = 12;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult extends AuthTokens {
  user: { id: string; email: string; emailVerified: boolean };
}

const issueTokens = async (user: {
  id: string;
  email: string;
}): Promise<AuthTokens> => {
  const accessToken = signAccessToken({ sub: user.id, email: user.email });
  const refreshToken = generateRefreshToken();
  await RefreshToken.create({
    userId: user.id,
    tokenHash: hashRefreshToken(refreshToken),
    expiresAt: refreshExpiresAt(),
  });
  return { accessToken, refreshToken };
};

export const registerUser = async (input: RegisterInput): Promise<AuthResult> => {
  const existing = await User.findOne({ where: { email: input.email } });
  if (existing) {
    throw emailAlreadyRegistered();
  }
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);
  const user = await User.create({
    email: input.email,
    passwordHash,
  });
  const tokens = await issueTokens({ id: user.id, email: user.email });
  return {
    ...tokens,
    user: { id: user.id, email: user.email, emailVerified: user.emailVerified },
  };
};

export const loginUser = async (input: LoginInput): Promise<AuthResult> => {
  const user = await User.findOne({ where: { email: input.email } });
  if (!user || !user.passwordHash) {
    throw invalidCredentials();
  }
  const ok = await bcrypt.compare(input.password, user.passwordHash);
  if (!ok) {
    throw invalidCredentials();
  }
  const tokens = await issueTokens({ id: user.id, email: user.email });
  return {
    ...tokens,
    user: { id: user.id, email: user.email, emailVerified: user.emailVerified },
  };
};

export const rotateRefreshToken = async (
  presentedToken: string,
): Promise<AuthTokens> => {
  const hash = hashRefreshToken(presentedToken);
  const record = await RefreshToken.findOne({
    where: {
      tokenHash: hash,
      revoked: false,
      expiresAt: { [Op.gt]: new Date() },
    },
  });
  if (!record) {
    throw invalidRefreshToken();
  }
  const user = await User.findByPk(record.userId);
  if (!user) {
    throw invalidRefreshToken();
  }
  record.revoked = true;
  await record.save();
  return issueTokens({ id: user.id, email: user.email });
};

export const revokeRefreshToken = async (presentedToken: string): Promise<void> => {
  const hash = hashRefreshToken(presentedToken);
  await RefreshToken.update(
    { revoked: true },
    { where: { tokenHash: hash, revoked: false } },
  );
};
