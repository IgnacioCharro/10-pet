import { env } from '../config/env';

const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';

export interface EmailPayload {
  to: string;
  subject: string;
  text: string;
  html: string;
}

const requireApiKey = (): void => {
  if (!env.BREVO_API_KEY && env.NODE_ENV === 'production') {
    throw new Error('BREVO_API_KEY is not configured');
  }
};

const deliver = async (payload: EmailPayload): Promise<void> => {
  const res = await fetch(BREVO_ENDPOINT, {
    method: 'POST',
    headers: {
      'api-key': env.BREVO_API_KEY as string,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { email: env.MAIL_FROM_EMAIL, name: env.MAIL_FROM_NAME },
      to: [{ email: payload.to }],
      subject: payload.subject,
      textContent: payload.text,
      htmlContent: payload.html,
    }),
  });

  if (!res.ok) {
    // El cuerpo trae el motivo real (remitente sin verificar, cuota agotada, clave
    // invalida). Incluirlo evita tener que adivinar desde el status code.
    const body = await res.text().catch(() => '');
    throw new Error(`Brevo respondio ${res.status} ${res.statusText}: ${body}`);
  }
};

export const sendEmail = async (payload: EmailPayload): Promise<void> => {
  if (!env.BREVO_API_KEY) {
    requireApiKey();
    console.log(`[email] → ${payload.to}: ${payload.subject}`);
    return;
  }
  await deliver(payload);
};

export const sendVerificationEmail = async (
  toEmail: string,
  token: string,
): Promise<void> => {
  const verifyUrl = `${env.API_BASE_URL}/api/v1/auth/verify-email?token=${token}`;

  if (!env.BREVO_API_KEY) {
    requireApiKey();
    console.log(`[email] verification link for ${toEmail}: ${verifyUrl}`);
    return;
  }

  await deliver({
    to: toEmail,
    subject: 'Verificá tu cuenta en 10_Pet',
    text: `Hacé clic en el siguiente link para verificar tu cuenta:\n\n${verifyUrl}\n\nEste link expira en 24 horas.`,
    html: `
      <p>Hola,</p>
      <p>Hacé clic en el botón para verificar tu cuenta en 10_Pet:</p>
      <p><a href="${verifyUrl}" style="background:#16a34a;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">Verificar cuenta</a></p>
      <p>O copiá este link en tu navegador:<br>${verifyUrl}</p>
      <p>Este link expira en 24 horas.</p>
    `,
  });
};

export const sendWelcomeEmail = async (toEmail: string, name: string | null): Promise<void> => {
  const casesUrl = `${env.WEB_BASE_URL}/cases`;
  const greeting = name ? `Hola ${name}` : 'Hola';

  if (!env.BREVO_API_KEY) {
    requireApiKey();
    console.log(`[email] welcome email for ${toEmail}`);
    return;
  }

  await deliver({
    to: toEmail,
    subject: 'Bienvenido/a a 10_Pet',
    text: `${greeting},\n\nGracias por unirte a 10_Pet. Podés ver casos de animales que necesitan ayuda en tu zona:\n\n${casesUrl}\n\nCada caso reportado puede marcar la diferencia. Gracias por ser parte.`,
    html: `
      <p>${greeting},</p>
      <p>Gracias por unirte a <strong>10_Pet</strong>.</p>
      <p>Podés ver y reportar casos de animales que necesitan ayuda en tu zona:</p>
      <p><a href="${casesUrl}" style="background:#16a34a;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">Ver casos</a></p>
      <p>Cada caso reportado puede marcar la diferencia. Gracias por ser parte.</p>
    `,
  });
};

export const sendPasswordResetEmail = async (
  toEmail: string,
  token: string,
): Promise<void> => {
  const resetUrl = `${env.WEB_BASE_URL}/reset-password?token=${token}`;

  if (!env.BREVO_API_KEY) {
    requireApiKey();
    console.log(`[email] password reset link for ${toEmail}: ${resetUrl}`);
    return;
  }

  await deliver({
    to: toEmail,
    subject: 'Recuperar contraseña — 10_Pet',
    text: `Recibimos una solicitud para restablecer tu contraseña.\n\nHacé clic en el siguiente link para crear una nueva contraseña:\n\n${resetUrl}\n\nEste link expira en 1 hora. Si no solicitaste esto, podés ignorar este email.`,
    html: `
      <p>Hola,</p>
      <p>Recibimos una solicitud para restablecer tu contraseña en 10_Pet.</p>
      <p><a href="${resetUrl}" style="background:#16a34a;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">Restablecer contraseña</a></p>
      <p>O copiá este link en tu navegador:<br>${resetUrl}</p>
      <p>Este link expira en <strong>1 hora</strong>.</p>
      <p>Si no solicitaste esto, podés ignorar este email. Tu contraseña no cambiará.</p>
    `,
  });
};
