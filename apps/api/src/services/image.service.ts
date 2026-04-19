import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env';

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

export interface UploadSignature {
  signature: string;
  timestamp: number;
  api_key: string;
  cloud_name: string;
  folder: string;
}

export const generateUploadSignature = (folder: string): UploadSignature => {
  const timestamp = Math.round(Date.now() / 1000);
  const params: Record<string, string | number> = { folder, timestamp };

  const signature = cloudinary.utils.api_sign_request(params, env.CLOUDINARY_API_SECRET ?? '');

  return {
    signature,
    timestamp,
    api_key: env.CLOUDINARY_API_KEY ?? '',
    cloud_name: env.CLOUDINARY_CLOUD_NAME ?? '',
    folder,
  };
};
