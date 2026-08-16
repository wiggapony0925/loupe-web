/**
 * Envelope-aware API client (the loupe pattern).
 *
 * Every /v1 response is `{ data, meta, error }`; this wrapper unwraps it,
 * turns the error half into a typed ApiError (branch on `code`, never on
 * message text), and Zod-parses `data` when a schema is supplied. Platform
 * concerns — base URL, token source, sign-out on 401 — are injected once via
 * configureApi so nothing here touches Firebase or storage directly.
 */
import type { z } from 'zod';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ApiConfig {
  baseUrl: string;
  getToken: () => Promise<string | null>;
  onUnauthorized: () => void;
}

let config: ApiConfig = {
  baseUrl: '',
  getToken: async () => null,
  onUnauthorized: () => undefined,
};

export function configureApi(next: ApiConfig): void {
  config = next;
}

export type Query = Record<string, string | number | boolean | undefined | null>;

function buildUrl(path: string, query?: Query): string {
  const url = `${config.baseUrl}${path}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

interface RequestOptions<T> {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Query;
  schema?: z.ZodType<T>;
}

interface Envelope {
  data: unknown;
  meta: Record<string, unknown> | null;
  error: { code: string; message: string; details?: unknown } | null;
}

export async function apiFetch<T = unknown>(path: string, options: RequestOptions<T> = {}): Promise<{ data: T; meta: Record<string, unknown> | null }> {
  const token = await config.getToken();
  const response = await fetch(buildUrl(path, options.query), {
    method: options.method ?? 'GET',
    headers: {
      ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  let envelope: Envelope;
  try {
    envelope = (await response.json()) as Envelope;
  } catch {
    throw new ApiError(response.status, 'client.bad_response', `Unexpected response (${response.status})`);
  }

  if (!response.ok || envelope.error) {
    const error = envelope.error ?? { code: 'internal.error', message: 'Request failed' };
    if (response.status === 401) config.onUnauthorized();
    throw new ApiError(response.status, error.code, error.message, error.details);
  }

  const data = options.schema ? options.schema.parse(envelope.data) : (envelope.data as T);
  return { data, meta: envelope.meta };
}

/**
 * Binary download (xlsx / csv / pdf). Fetches with auth, then hands the blob
 * to the browser as a named download; inside the Capacitor webview the OS
 * preview/share sheet takes over.
 */
export async function apiDownload(path: string, query: Query, filename: string): Promise<void> {
  const token = await config.getToken();
  const response = await fetch(buildUrl(path, query), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    let code = 'export.failed';
    let message = `Export failed (${response.status})`;
    try {
      const envelope = (await response.json()) as Envelope;
      if (envelope.error) ({ code, message } = envelope.error);
    } catch {
      // body wasn't JSON — keep the generic message
    }
    throw new ApiError(response.status, code, message);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revoke on a delay — revoking synchronously races the navigation in
  // WebKit and yields an empty file.
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
