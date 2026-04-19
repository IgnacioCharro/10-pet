import crypto from 'crypto';
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
  invalidVerificationToken,
} from './auth.errors';
import { sendVerificationEmail } from '../../services/email.service';
import type { LoginInput, RegisterInput } from './auth.validators';

const BCRYPT_COST = 12;
const VERIFICATION_TOKEN_EXPIRES_HOURS = 24;

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

const generateVerificationToken = (): string =>
  crypto.randomBytes(32).toString('hex');

const verificationExpiresAt = (): Date => {
  const d = new Date();
  d.setHours(d.getHours() + VERIFICATION_TOKEN_EXPIRES_HOURS);
  return d;
};

export const registerUser = async (input: RegisterInput): Promise<AuthResult> => {
  const existing = await User.findOne({ where: { email: input.email } });
  if (existing) {
    throw emailAlreadyRegistered();
  }
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);
  const verificationToken = generateVerificationToken();
  const user = await User.create({
    email: input.email,
    passwordHash,
    emailVerificationToken: verificationToken,
    emailVerificationTokenExpiresAt: verificationExpiresAt(),
  });

  sendVerificationEmail(user.email, verificationToken).catch((err) =>
    console.error('[email] error sending verification email:', err),
  );

  const tokens = await issueTokens({ id: user.id, email: user.email });
  return {
    ...tokens,
    user: { id: user.id, email: user.email, emailVerified: user.emailVerified },
  };
};

export const verifyEmail = async (token: string): Promise<void> => {
  const user = await User.findOne({
    where: {
      emailVerificationToken: token,
      emailVerificationTokenExpiresAt: { [Op.gt]: new Date() },
    },
  });
  if (!user) {
    throw invalidVerificationToken();
  }
  user.emailVerified = true;
  user.emailVerificationToken = null;
  user.emailVerificationTokenExpiresAt = null;
  await user.save();
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

export const findOrCreateGoogleUser = async (profile: {
  id: string;
  email: string;
  emailVerified: boolean;
}): Promise<AuthResult> => {
  let user = await User.findOne({ where: { googleId: profile.id } });

  if (!user) {
    user = await User.findOne({ where: { email: profile.email } });
    if (user) {
      user.googleId = profile.id;
      if (profile.emailVerified) {
        user.emailVerified = true;
        user.emailVerificationToken = null;
        user.emailVerificationTokenExpiresAt = null;
      }
      await user.save();
    } else {
      user = await User.create({
        email: profile.email,
        googleId: profile.id,
        emailVerified: profile.emailVerified,
      });
    }
  }

  const tokens = await issueTokens({ id: user.id, email: user.email });
  return {
    ...tokens,
    user: { id: user.id, email: user.email, emailVerified: user.emailVerified },
  };
};
