import app from './app';
import { env } from './config/env';

app.listen(env.PORT, () => {
  console.log(`[server] Escuchando en puerto ${env.PORT} (${env.NODE_ENV})`);
});
