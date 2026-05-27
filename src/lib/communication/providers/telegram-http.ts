/**
 * Shared axios factory for Telegram Bot API calls.
 *
 * Problem: Happ VPN / Clash / V2Ray on Windows register themselves as the
 * Windows system proxy (WinINet). PowerShell and browsers automatically use it,
 * but Node.js ignores the system proxy and tries to connect directly — which
 * gets blocked / aborted by the VPN layer.
 *
 * Fix: detect the Windows system proxy from the registry and pass it to axios.
 * Falls back to HTTPS_PROXY / HTTP_PROXY env vars if set explicitly.
 */
import https from 'https';
import { execSync } from 'child_process';
import axios, { type AxiosRequestConfig } from 'axios';

interface AxiosProxyConfig {
  protocol: string;
  host: string;
  port: number;
  auth?: { username: string; password: string };
}

// ─── Windows system proxy detection ──────────────────────────────────────────

function detectWindowsSystemProxy(): string | null {
  if (process.platform !== 'win32') return null;
  try {
    const regBase = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings';

    // Check ProxyEnable = 1
    const enableOut = execSync(`reg query "${regBase}" /v ProxyEnable`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const enableMatch = enableOut.match(/ProxyEnable\s+REG_DWORD\s+0x(\w+)/i);
    if (!enableMatch || parseInt(enableMatch[1], 16) !== 1) return null;

    // Read ProxyServer value
    const serverOut = execSync(`reg query "${regBase}" /v ProxyServer`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const serverMatch = serverOut.match(/ProxyServer\s+REG_SZ\s+(\S+)/i);
    if (!serverMatch) return null;

    const raw = serverMatch[1].trim();
    if (!raw) return null;

    // Handle "http=host:port;https=host:port;ftp=..." per-protocol format
    if (raw.includes('=')) {
      const parts = raw.split(';');
      for (const part of parts) {
        if (part.startsWith('https=')) return `http://${part.slice(6)}`;
        if (part.startsWith('http='))  return `http://${part.slice(5)}`;
      }
      return null;
    }

    // Plain "host:port" or full URL
    if (raw.startsWith('http') || raw.startsWith('socks')) return raw;
    return `http://${raw}`;
  } catch {
    return null;
  }
}

// ─── Proxy config builder ─────────────────────────────────────────────────────

function parseProxyUrl(raw: string): { proxy: AxiosProxyConfig } | Record<string, never> {
  try {
    const u = new URL(raw);
    const cfg: AxiosProxyConfig = {
      protocol: u.protocol.replace(':', ''),
      host: u.hostname,
      port: parseInt(u.port || (u.protocol === 'https:' ? '443' : '80'), 10),
    };
    if (u.username) {
      cfg.auth = {
        username: decodeURIComponent(u.username),
        password: decodeURIComponent(u.password),
      };
    }
    return { proxy: cfg };
  } catch {
    return {};
  }
}

function buildProxyConfig(): ReturnType<typeof parseProxyUrl> {
  const raw =
    process.env['HTTPS_PROXY'] ??
    process.env['https_proxy'] ??
    process.env['HTTP_PROXY']  ??
    process.env['http_proxy']  ??
    detectWindowsSystemProxy();   // ← auto-detect Happ VPN / system proxy

  if (!raw) return {};
  return parseProxyUrl(raw);
}

// ─── TLS agent ────────────────────────────────────────────────────────────────

function buildTlsAgent(): { httpsAgent?: https.Agent } {
  const skip =
    process.env['TELEGRAM_TLS_SKIP_VERIFY'] === 'true' ||
    process.env['NODE_TLS_REJECT_UNAUTHORIZED'] === '0';

  if (!skip) return {};
  return { httpsAgent: new https.Agent({ rejectUnauthorized: false, keepAlive: false }) };
}

// ─── Axios config (built once, module-level) ──────────────────────────────────

const BASE_CONFIG: AxiosRequestConfig = {
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
  // Never throw on HTTP error status — return the body so callers can read
  // json.ok / json.description from Telegram's error response (e.g. 400 "chat not found")
  validateStatus: () => true,
  ...buildTlsAgent(),
  ...buildProxyConfig(),
};

// Log detected proxy at startup (dev only)
if (process.env['NODE_ENV'] !== 'production') {
  const proxy = (BASE_CONFIG as Record<string, unknown>)['proxy'];
  const agent = (BASE_CONFIG as Record<string, unknown>)['httpsAgent'];
  if (proxy) {
    const p = proxy as AxiosProxyConfig;
    console.info(`[Telegram] Using proxy: ${p.protocol}://${p.host}:${p.port}`);
  } else if (agent) {
    console.info('[Telegram] TLS verification disabled (TELEGRAM_TLS_SKIP_VERIFY)');
  } else {
    console.info('[Telegram] Direct connection (no proxy detected)');
  }
}

// ─── Public helpers ───────────────────────────────────────────────────────────

export interface TelegramApiResponse {
  ok: boolean;
  result?: unknown;
  error_code?: number;
  description?: string;
}

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
