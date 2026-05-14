import sgMail from '@sendgrid/mail';
import { env } from '../config/env';

if (env.SENDGRID_API_KEY) {
  sgMail.setApiKey(env.SENDGRID_API_KEY);
}

export interface EmailPayload {
  to: string;
  subject: string;
  text: string;
  html: string;
}

const requireApiKey = (): void => {
  if (!env.SENDGRID_API_KEY && env.NODE_ENV === 'production') {
    throw new Error('SENDGRID_API_KEY is not configured');
  }
};

export const sendEmail = async (payload: EmailPayload): Promise<void> => {
  if (!env.SENDGRID_API_KEY) {
    requireApiKey();
    console.log(`[email] → ${payload.to}: ${payload.subject}`);
    return;
  }
  await sgMail.send({
    to: payload.to,
    from: { email: env.SENDGRID_FROM_EMAIL, name: env.SENDGRID_FROM_NAME },
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
  });
};

export const sendVerificationEmail = async (
  toEmail: string,
  token: string,
): Promise<void> => {
  const verifyUrl = `${env.API_BASE_URL}/api/v1/auth/verify-email?token=${token}`;

  if (!env.SENDGRID_API_KEY) {
    requireApiKey();
    console.log(`[email] verification link for ${toEmail}: ${verifyUrl}`);
    return;
  }

  await sgMail.send({
    to: toEmail,
    from: { email: env.SENDGRID_FROM_EMAIL, name: env.SENDGRID_FROM_NAME },
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

  if (!env.SENDGRID_API_KEY) {
    requireApiKey();
    console.log(`[email] welcome email for ${toEmail}`);
    return;
  }

  await sgMail.send({
    to: toEmail,
    from: { email: env.SENDGRID_FROM_EMAIL, name: env.SENDGRID_FROM_NAME },
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

  if (!env.SENDGRID_API_KEY) {
    requireApiKey();
    console.log(`[email] password reset link for ${toEmail}: ${resetUrl}`);
    return;
  }

  await sgMail.send({
    to: toEmail,
    from: { email: env.SENDGRID_FROM_EMAIL, name: env.SENDGRID_FROM_NAME },
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
