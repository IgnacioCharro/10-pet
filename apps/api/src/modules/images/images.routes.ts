import { Router } from 'express';
import { requireAuth } from '../../middleware/require-auth';
import { postSignUpload } from './images.controller';

export const imagesRouter: Router = Router();

imagesRouter.post('/sign', requireAuth, postSignUpload);
