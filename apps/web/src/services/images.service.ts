import { api } from '../lib/api'

interface UploadSignature {
  signature: string
  timestamp: number
  api_key: string
  cloud_name: string
  folder: string
}

export interface UploadedImage {
  publicId: string
  secureUrl: string
}

export const getUploadSignature = async (folder: 'cases' | 'avatars' = 'cases'): Promise<UploadSignature> => {
  const res = await api.post<UploadSignature>('/images/sign', { folder })
  return res.data
}

export const uploadToCloudinary = async (file: File, folder: 'cases' | 'avatars' = 'cases'): Promise<UploadedImage> => {
  const sig = await getUploadSignature(folder)

  const formData = new FormData()
  formData.append('file', file)
  formData.append('api_key', sig.api_key)
  formData.append('timestamp', String(sig.timestamp))
  formData.append('signature', sig.signature)
  formData.append('folder', sig.folder)

  const res = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloud_name}/image/upload`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    throw new Error('Upload a Cloudinary fallido')
  }

  const data = await res.json() as { public_id: string; secure_url: string }
  return { publicId: data.public_id, secureUrl: data.secure_url }
}
