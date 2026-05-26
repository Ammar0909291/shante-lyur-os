/* Shante Lyur OS — Chat Desktop Notification Service Worker
 * Served at /sw.js (Next.js public/ directory → root scope)
 * Plain JS — service workers cannot use TypeScript imports.
 */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

// Receive messages posted from the main thread via sw.postMessage()
self.addEventListener('message', (event) => {
  if (event.data?.type !== 'NEW_CHAT_MESSAGE') return;

  const { senderName, messagePreview, conversationId, avatarUrl } = event.data;

  self.registration.showNotification(senderName || 'Новое сообщение', {
    body: messagePreview || '',
    icon: avatarUrl || '/favicon.ico',
    badge: '/favicon.ico',
    tag: `chat-${conversationId}`,   // group notifications per conversation
    renotify: true,                   // re-trigger sound/vibration even for same tag
    data: { conversationId },
    actions: [
      { action: 'open',    title: 'Открыть' },
      { action: 'dismiss', title: 'Закрыть' },
    ],
  });
});

// Handle notification click — focus an existing CRM tab or open a new one
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const conversationId = event.notification.data?.conversationId;

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        const crmClient = clientList.find((c) => c.url.includes('localhost:3000'));

        if (crmClient) {
          crmClient.focus();
          if (conversationId) {
            crmClient.postMessage({ type: 'NAVIGATE_TO_CONVERSATION', conversationId });
          }
        } else {
          const url = conversationId
            ? `http://localhost:3000/chat?conv=${conversationId}`
            : 'http://localhost:3000/chat';
          self.clients.openWindow(url);
        }
      }),
  );
});
