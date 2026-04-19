import app from './app';
import { env } from './config/env';
import './jobs/notify-new-case.job';
import './jobs/contact-request.job';

app.listen(env.PORT, () => {
  console.log(`[server] Escuchando en puerto ${env.PORT} (${env.NODE_ENV})`);
});
