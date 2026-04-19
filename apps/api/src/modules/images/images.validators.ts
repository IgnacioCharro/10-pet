import { z } from 'zod';

export const signUploadSchema = z.object({
  folder: z.enum(['cases', 'avatars']).default('cases'),
});

export type SignUploadInput = z.infer<typeof signUploadSchema>;
