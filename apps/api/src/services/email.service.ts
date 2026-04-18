import sgMail from '@sendgrid/mail';
import { env } from '../config/env';

if (env.SENDGRID_API_KEY) {
  sgMail.setApiKey(env.SENDGRID_API_KEY);
}

export const sendVerificationEmail = async (
  toEmail: string,
  token: string,
): Promise<void> => {
  const verifyUrl = `${env.API_BASE_URL}/api/v1/auth/verify-email?token=${token}`;

  if (!env.SENDGRID_API_KEY) {
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
