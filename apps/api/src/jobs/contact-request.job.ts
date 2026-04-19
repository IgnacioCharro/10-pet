import Bull from 'bull';
import { QueryTypes } from 'sequelize';
import { sequelize } from '../db';
import { sendEmail } from '../services/email.service';
import { contactRequestQueue } from './queue';

export interface ContactRequestPayload {
  contactId: string;
  responderId: string;
  caseId: string;
}

async function processContactRequest(job: Bull.Job<ContactRequestPayload>): Promise<void> {
  const { responderId, caseId } = job.data;

  const [responder] = await sequelize.query<{ email: string }>(
    `SELECT email FROM users WHERE id = :responderId`,
    { replacements: { responderId }, type: QueryTypes.SELECT },
  );

  if (!responder) return;

  const caseUrl = `${process.env.WEB_BASE_URL ?? 'http://localhost:5173'}/cases/${caseId}`;

  await sendEmail({
    to: responder.email,
    subject: 'Alguien quiere ayudar con tu caso de rescate',
    text: `Un voluntario quiere ayudar con tu caso.\n\nVer caso y gestionar contactos: ${caseUrl}`,
    html: `
      <h2>Alguien quiere ayudar con tu caso</h2>
      <p>Un voluntario envió una solicitud de contacto para tu caso de rescate.</p>
      <p><a href="${caseUrl}" style="background:#22c55e;color:#fff;padding:10px 20px;text-decoration:none;border-radius:6px">Ver caso</a></p>
      <hr>
      <small>10Pet — Rescate animal.</small>
    `,
  });
}

if (contactRequestQueue) {
  contactRequestQueue.process(5, processContactRequest);

  contactRequestQueue.on('failed', (job, err) => {
    console.error(`[contact-request] job ${job.id} falló:`, err.message);
  });
}
