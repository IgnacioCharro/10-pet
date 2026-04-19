import Bull from 'bull';
import { QueryTypes } from 'sequelize';
import { sequelize } from '../db';
import { sendEmail } from '../services/email.service';
import { notifyNewCaseQueue } from './queue';

export interface NotifyNewCasePayload {
  caseId: string;
  animalType: string;
  description: string;
  urgencyLevel: number;
  locationText: string | null;
  lat: number;
  lng: number;
  creatorId: string;
}

interface TargetUser {
  id: string;
  email: string;
}

async function processNotifyNewCase(job: Bull.Job<NotifyNewCasePayload>): Promise<void> {
  const { caseId, animalType, description, urgencyLevel, locationText, creatorId } = job.data;

  // For MVP: notify all verified users except the case creator
  // TODO v1.1: filter by user location preferences within a radius
  const users = await sequelize.query<TargetUser>(
    `SELECT id, email FROM users
     WHERE email_verified = true
       AND id != :creatorId`,
    { replacements: { creatorId }, type: QueryTypes.SELECT },
  );

  if (users.length === 0) return;

  const animalLabel: Record<string, string> = { perro: 'perro', gato: 'gato', otro: 'animal' };
  const label = animalLabel[animalType] ?? 'animal';
  const locationStr = locationText ?? 'ubicación en el mapa';
  const caseUrl = `${process.env.WEB_BASE_URL ?? 'http://localhost:5173'}/cases/${caseId}`;

  for (const user of users) {
    await sendEmail({
      to: user.email,
      subject: `Nuevo caso de rescate — ${label} (urgencia ${urgencyLevel}/5)`,
      text: `Hay un nuevo caso de rescate cerca tuyo.\n\nAnimal: ${label}\nUbicación: ${locationStr}\nDescripción: ${description}\n\nVer caso: ${caseUrl}`,
      html: `
        <h2>Nuevo caso de rescate</h2>
        <p><strong>Animal:</strong> ${label}</p>
        <p><strong>Urgencia:</strong> ${urgencyLevel}/5</p>
        <p><strong>Ubicación:</strong> ${locationStr}</p>
        <p><strong>Descripción:</strong> ${description}</p>
        <p><a href="${caseUrl}" style="background:#22c55e;color:#fff;padding:10px 20px;text-decoration:none;border-radius:6px">Ver caso</a></p>
        <hr>
        <small>Recibís estos emails porque tenés cuenta en 10Pet.</small>
      `,
    });
  }
}

if (notifyNewCaseQueue) {
  notifyNewCaseQueue.process(5, processNotifyNewCase);

  notifyNewCaseQueue.on('failed', (job, err) => {
    console.error(`[notify-new-case] job ${job.id} falló:`, err.message);
  });
}
