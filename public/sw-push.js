// Service Worker para Web Push notifications
// Registrado por src/app/services/web-push.service.ts apenas após login.
// Usado SOMENTE para notificações de prioridade alta — não é PWA completo.

self.addEventListener('install', (event) => {
  // Ativa imediatamente sem esperar reload
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

/**
 * Recebe push do servidor (via VAPID) e mostra notificação OS.
 * Payload esperado: { title, body, url, tag, icon }
 */
self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    payload = { title: 'NAUE Consultoria', body: event.data ? event.data.text() : '' };
  }

  const title = payload.title || 'NAUE Consultoria';
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/logoNaue.png',
    badge: payload.icon || '/logoNaue.png',
    tag: payload.tag || 'naue-notification',
    renotify: true,
    requireInteraction: false,
    data: {
      url: payload.url || '/home'
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

/**
 * Quando usuário clica na notificação, foca aba existente ou abre nova.
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/home';
  const targetUrl = new URL(url, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Se já tem aba aberta, foca
      for (const client of windowClients) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl).catch(() => {});
          return client.focus();
        }
      }
      // Senão abre nova
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
