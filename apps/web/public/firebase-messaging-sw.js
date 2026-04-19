importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

// Config inyectada desde el SW registration en fcm.service.ts via querystring,
// o hardcodeada aqui si se prefiere. Por ahora usamos una config vacía que se
// reemplaza en producción vía variable de build.
const firebaseConfig = self.__FIREBASE_CONFIG__ || {};

if (firebaseConfig.apiKey) {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const { title, body } = payload.notification || {};
    if (title) {
      self.registration.showNotification(title, {
        body: body || '',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        data: payload.data,
      });
    }
  });
}
