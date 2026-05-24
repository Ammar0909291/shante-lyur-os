import { WhatsAppProvider } from './providers/whatsapp.provider';
import { TelegramProvider } from './providers/telegram.provider';
import { MaxProvider } from './providers/max.provider';
import type { IMessageProvider } from './providers/base.provider';
import type { ProviderChannel } from './types';

class ChannelRouter {
  private readonly providers: Map<ProviderChannel, IMessageProvider>;

  constructor() {
    this.providers = new Map<ProviderChannel, IMessageProvider>([
      ['whatsapp' as ProviderChannel, new WhatsAppProvider()],
      ['telegram' as ProviderChannel, new TelegramProvider()],
      ['max' as ProviderChannel, new MaxProvider()],
    ]);
  }

  getProvider(channel: ProviderChannel): IMessageProvider | null {
    return this.providers.get(channel) ?? null;
  }

  getWhatsApp(): WhatsAppProvider {
    return this.providers.get('whatsapp') as WhatsAppProvider;
  }

  getTelegram(): TelegramProvider {
    return this.providers.get('telegram') as TelegramProvider;
  }

  getMax(): MaxProvider {
    return this.providers.get('max') as MaxProvider;
  }

  configuredChannels(): ProviderChannel[] {
    return Array.from(this.providers.entries())
      .filter(([, p]) => p.isConfigured())
      .map(([ch]) => ch);
  }
}

let _router: ChannelRouter | null = null;

export function getChannelRouter(): ChannelRouter {
  if (!_router) _router = new ChannelRouter();
  return _router;
}
