/**
 * Shared axios factory for Telegram Bot API calls.
 *
 * Reads HTTPS_PROXY / HTTP_PROXY from the environment so that if
 * the server can't reach api.telegram.org directly (firewall, ISP block, etc.)
 * it routes through whatever proxy the operator has configured.
 *
 * Set in .env.local:
 *   HTTPS_PROXY=http://user:pass@proxyhost:3128
 *   # or a SOCKS5 address if you use one
 */
import axios, { type AxiosRequestConfig } from 'axios';

interface AxiosProxyConfig {
  protocol: string;
  host: string;
  port: number;
  auth?: { username: string; password: string };
}

function buildProxyConfig(): { proxy?: AxiosProxyConfig } {
  const raw =
    process.env['HTTPS_PROXY'] ??
    process.env['https_proxy'] ??
    process.env['HTTP_PROXY'] ??
    process.env['http_proxy'];

  if (!raw) return {};

  try {
    const u = new URL(raw);
    const config: AxiosProxyConfig = {
      protocol: u.protocol.replace(':', ''),
      host: u.hostname,
      port: parseInt(u.port || (u.protocol === 'https:' ? '443' : '80'), 10),
    };
    if (u.username) {
      config.auth = {
        username: decodeURIComponent(u.username),
        password: decodeURIComponent(u.password),
      };
    }
    return { proxy: config };
  } catch {
    return {};
  }
}

export interface TelegramApiResponse {
  ok: boolean;
  result?: unknown;
  error_code?: number;
  description?: string;
}

const BASE_CONFIG: AxiosRequestConfig = {
  timeout: 12_000,
  headers: { 'Content-Type': 'application/json' },
  ...buildProxyConfig(),
};

export async function tgGet(token: string, method: string): Promise<TelegramApiResponse> {
  const res = await axios.get<TelegramApiResponse>(
    `https://api.telegram.org/bot${token}/${method}`,
    BASE_CONFIG,
  );
  return res.data;
}

export async function tgPost(token: string, method: string, data: unknown): Promise<TelegramApiResponse> {
  const res = await axios.post<TelegramApiResponse>(
    `https://api.telegram.org/bot${token}/${method}`,
    data,
    BASE_CONFIG,
  );
  return res.data;
}
