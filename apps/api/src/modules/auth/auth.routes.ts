import { Router } from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { env } from '../../config/env';
import {
  register,
  login,
  refresh,
  logout,
  verifyEmailHandler,
  googleCallbackHandler,
} from './auth.controller';

export const authRouter: Router = Router();

authRouter.post('/register', register);
authRouter.post('/login', login);
authRouter.post('/refresh', refresh);
authRouter.post('/logout', logout);
authRouter.get('/verify-email', verifyEmailHandler);

if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL: env.GOOGLE_CALLBACK_URL,
      },
      (_accessToken, _refreshToken, profile, done) => {
        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(new Error('No email in Google profile'));
        }
        const emailVerified = profile.emails?.[0]?.verified === true;
        done(null, { id: profile.id, email, emailVerified });
      },
    ),
  );

  authRouter.get(
    '/google',
    passport.authenticate('google', { scope: ['email', 'profile'], session: false }),
  );

  authRouter.get(
    '/google/callback',
    passport.authenticate('google', {
      session: false,
      failureRedirect: '/api/v1/auth/google/failure',
    }),
    googleCallbackHandler,
  );

  authRouter.get('/google/failure', (_req, res) => {
    res.redirect(`${env.WEB_BASE_URL}/auth/callback?error=GOOGLE_OAUTH_ERROR`);
  });
}
