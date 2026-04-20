import { initializeApp, getApps } from 'firebase/app'
import { getMessaging, getToken, onMessage, MessagePayload } from 'firebase/messaging'
import { api } from '../lib/api'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

function getFirebaseApp() {
  if (getApps().length > 0) return getApps()[0]
  return initializeApp(firebaseConfig)
}

export async function requestPushPermission(): Promise<boolean> {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return false
  if (!import.meta.env.VITE_FIREBASE_VAPID_KEY) return false

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return false

  try {
    const app = getFirebaseApp()
    const messaging = getMessaging(app)
    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: await navigator.serviceWorker.ready,
    })
    if (token) {
      await api.post('/users/me/push-token', { token })
    }
    return true
  } catch {
    return false
  }
}

export function onForegroundMessage(cb: (payload: MessagePayload) => void): () => void {
  if (!import.meta.env.VITE_FIREBASE_API_KEY) return () => {}
  try {
    const app = getFirebaseApp()
    const messaging = getMessaging(app)
    return onMessage(messaging, cb)
  } catch {
    return () => {}
  }
}
