let swRegistration: ServiceWorkerRegistration | null = null;

export async function initDesktopNotifications(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator) || !('Notification' in window)) {
    console.warn('[DesktopNotifications] Not supported in this browser');
    return;
  }

  try {
    swRegistration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  } catch (err) {
    console.error('[DesktopNotifications] SW registration failed:', err);
    return;
  }

  if (Notification.permission === 'default') {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;
  }

  // Route SW → app navigation messages to the active URL
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'NAVIGATE_TO_CONVERSATION') {
      window.location.href = `/chat?conv=${event.data.conversationId as string}`;
    }
  });
}

export async function sendDesktopNotification(payload: {
  senderName: string;
  messagePreview: string;
  conversationId: string;
  avatarUrl?: string;
}): Promise<void> {
  if (typeof window === 'undefined') return;
  if (Notification.permission !== 'granted') return;
  if (!swRegistration) return;

  const tabFocused = document.hasFocus();
  const onChatPage = window.location.pathname.startsWith('/chat');
  const activeConvId = sessionStorage.getItem('activeConversationId');

  // Suppress only when the user is actively viewing the exact conversation
  if (tabFocused && onChatPage && activeConvId === payload.conversationId) return;

  const sw = swRegistration.active ?? swRegistration.waiting ?? swRegistration.installing;
  if (!sw) return;

  const preview =
    payload.messagePreview.length > 80
      ? `${payload.messagePreview.slice(0, 80)}…`
      : payload.messagePreview;

  sw.postMessage({
    type: 'NEW_CHAT_MESSAGE',
    senderName: payload.senderName,
    messagePreview: preview,
    conversationId: payload.conversationId,
    avatarUrl: payload.avatarUrl ?? null,
  });
}
