process.env['JWT_SECRET'] = 'test-secret-that-is-at-least-32-characters-long';
process.env['JWT_ACCESS_EXPIRES'] = '15m';
process.env['JWT_REFRESH_EXPIRES'] = '7d';
process.env['DATABASE_URL'] = 'postgresql://localhost:5432/test';

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

vi.mock('../../db', () => ({
  sequelize: { authenticate: vi.fn().mockResolvedValue(undefined) },
  User: { findOne: vi.fn(), create: vi.fn(), findByPk: vi.fn() },
  RefreshToken: { create: vi.fn(), findOne: vi.fn(), update: vi.fn() },
}));

import { User, RefreshToken } from '../../db';
import { findOrCreateGoogleUser } from './auth.service';

// El modulo esta mockeado: los tipos de Sequelize no describen estos dobles.
const userFindOne = User.findOne as unknown as Mock;
const userCreate = User.create as unknown as Mock;
const refreshTokenCreate = RefreshToken.create as unknown as Mock;

const googleProfile = {
  id: 'google-uuid-1',
  email: 'maria@gmail.com',
  emailVerified: true,
  name: 'Maria Lopez',
};

// Usuario ya en la DB al que se le vincula el googleId
const existingUser = (name: string | null): Record<string, unknown> & { save: Mock } => ({
  id: 'user-uuid-1',
  email: 'maria@gmail.com',
  name,
  googleId: null,
  emailVerified: false,
  emailVerificationToken: 'pending-token',
  emailVerificationTokenExpiresAt: new Date('2026-05-01T00:00:00Z'),
  save: vi.fn().mockResolvedValue(undefined),
});

beforeEach(() => {
  vi.clearAllMocks();
  refreshTokenCreate.mockResolvedValue({ id: 'refresh-uuid-1' });
});

describe('findOrCreateGoogleUser', () => {
  it('guarda el nombre de Google al crear un usuario nuevo', async () => {
    userFindOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    userCreate.mockResolvedValueOnce({
      id: 'user-uuid-1',
      email: 'maria@gmail.com',
      name: 'Maria Lopez',
      emailVerified: true,
    });

    await findOrCreateGoogleUser(googleProfile);

    expect(userCreate).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Maria Lopez' }),
    );
  });

  it('completa el nombre al vincular googleId a una cuenta que no lo tenia', async () => {
    const user = existingUser(null);
    userFindOne.mockResolvedValueOnce(null).mockResolvedValueOnce(user);

    await findOrCreateGoogleUser(googleProfile);

    expect(user.name).toBe('Maria Lopez');
    expect(user.save).toHaveBeenCalled();
  });

  it('no pisa el nombre de una cuenta que ya lo tenia', async () => {
    const user = existingUser('Ana');
    userFindOne.mockResolvedValueOnce(null).mockResolvedValueOnce(user);

    await findOrCreateGoogleUser(googleProfile);

    expect(user.name).toBe('Ana');
    expect(userCreate).not.toHaveBeenCalled();
  });
});
