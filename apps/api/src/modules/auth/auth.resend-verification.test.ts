process.env['JWT_SECRET'] = 'test-secret-that-is-at-least-32-characters-long';
process.env['DATABASE_URL'] = 'postgresql://localhost:5432/test';

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../db', () => ({
  sequelize: { authenticate: vi.fn() },
  User: { findOne: vi.fn() },
  RefreshToken: { create: vi.fn(), findOne: vi.fn(), update: vi.fn() },
}));

vi.mock('../../services/email.service', () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
  sendWelcomeEmail: vi.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
}));

import { User } from '../../db';
import { sendVerificationEmail } from '../../services/email.service';
import { resendVerification } from './auth.service';

const usuarioFalso = (overrides: Record<string, unknown> = {}) => ({
  email: 'user@example.com',
  emailVerified: false,
  emailVerificationToken: 'token-viejo-y-vencido',
  emailVerificationTokenExpiresAt: new Date('2020-01-01'),
  save: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

describe('resendVerification', () => {
  beforeEach(() => {
    vi.mocked(sendVerificationEmail).mockClear();
    vi.mocked(User.findOne).mockReset();
  });

  it('emite un token nuevo y lo manda cuando el usuario no esta verificado', async () => {
    const user = usuarioFalso();
    vi.mocked(User.findOne).mockResolvedValueOnce(user as never);

    await resendVerification('user@example.com');

    // El token viejo pudo haber vencido: reusarlo dejaria al usuario igual de atascado.
    expect(user.emailVerificationToken).not.toBe('token-viejo-y-vencido');
    expect(user.emailVerificationTokenExpiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(user.save).toHaveBeenCalled();

    expect(sendVerificationEmail).toHaveBeenCalledWith(
      'user@example.com',
      user.emailVerificationToken,
    );
  });

  it('no manda nada si el usuario ya esta verificado', async () => {
    const user = usuarioFalso({ emailVerified: true });
    vi.mocked(User.findOne).mockResolvedValueOnce(user as never);

    await resendVerification('user@example.com');

    // Si no, el endpoint serviria para bombardear de correos a cualquier cuenta activa.
    expect(sendVerificationEmail).not.toHaveBeenCalled();
    expect(user.save).not.toHaveBeenCalled();
  });

  it('no falla ni manda nada si el email no existe', async () => {
    vi.mocked(User.findOne).mockResolvedValueOnce(null as never);

    await expect(resendVerification('no-existe@example.com')).resolves.toBeUndefined();
    expect(sendVerificationEmail).not.toHaveBeenCalled();
  });

  it('genera un token distinto en cada reenvio', async () => {
    const primero = usuarioFalso();
    vi.mocked(User.findOne).mockResolvedValueOnce(primero as never);
    await resendVerification('user@example.com');

    const segundo = usuarioFalso();
    vi.mocked(User.findOne).mockResolvedValueOnce(segundo as never);
    await resendVerification('user@example.com');

    expect(primero.emailVerificationToken).not.toBe(segundo.emailVerificationToken);
  });

  it('no deja que un fallo de envio rompa la request', async () => {
    // El envio es fire-and-forget: si el proveedor falla, se loguea pero el usuario no
    // recibe un 500 por algo que no puede resolver.
    vi.mocked(sendVerificationEmail).mockRejectedValueOnce(new Error('proveedor caido'));
    const user = usuarioFalso();
    vi.mocked(User.findOne).mockResolvedValueOnce(user as never);

    await expect(resendVerification('user@example.com')).resolves.toBeUndefined();
  });
});
