/**
 * Shared axios factory for Telegram Bot API calls.
 *
 * Handles two common environment problems:
 *
 * 1. TLS inspection by VPN / antivirus software (Kaspersky, Happ VPN, etc.)
 *    These tools intercept HTTPS and re-sign with their own CA.
 *    Node.js rejects the cert (ECONNABORTED) while browsers/PowerShell work fine
 *    because they use the Windows certificate store which includes the VPN CA.
 *    Fix: set TELEGRAM_TLS_SKIP_VERIFY=true in .env (dev only).
 *
 * 2. Outbound network blocked at firewall/ISP level.
 *    Fix: set HTTPS_PROXY=http://host:port in .env.
 */
import https from 'https';
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

function buildTlsAgent(): { httpsAgent?: https.Agent } {
  // Skip TLS verification when VPN/antivirus is doing TLS inspection.
  // Only active when TELEGRAM_TLS_SKIP_VERIFY=true is set in .env.
  const skip =
    process.env['TELEGRAM_TLS_SKIP_VERIFY'] === 'true' ||
    process.env['NODE_TLS_REJECT_UNAUTHORIZED'] === '0';

  if (!skip) return {};

  return {
    httpsAgent: new https.Agent({
      rejectUnauthorized: false,
      keepAlive: false,
    }),
  };
}

export interface TelegramApiResponse {
  ok: boolean;
  result?: unknown;
  error_code?: number;
  description?: string;
}

const BASE_CONFIG: AxiosRequestConfig = {
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
  ...buildTlsAgent(),
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
