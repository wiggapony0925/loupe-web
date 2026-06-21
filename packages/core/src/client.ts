/**
 * Envelope-aware fetch client. Every `/v1/*` response ships the universal
 * envelope `{ data, meta, pagination, error }`; `apiFetch` unwraps to `data`
 * and turns non-2xx into a typed {@link ApiError}. Auth + base URL come from
 * the injected config (see config.ts), never from a platform global.
 */
import { getApiConfig } from "./config";

export interface Envelope<T = unknown> {
  data: T | null;
  meta: { request_id: string; timestamp: string; version: string; duration_ms: number | null };
  pagination: unknown | null;
  error: ErrorDetail | null;
}

export interface ErrorDetail {
  code: string;
  message: string;
  status?: number;
  field?: string | null;
  details?: unknown;
}

/** Typed error thrown for any non-2xx response or transport failure. */
export class ApiError extends Error {
  code: string;
  status: number;
  path: string;
  details?: unknown;
  constructor(path: string, opts: { code: string; message: string; status: number; details?: unknown }) {
    super(opts.message);
    this.name = "ApiError";
    this.path = path;
    this.code = opts.code;
    this.status = opts.status;
    this.details = opts.details;
  }
}

type QueryValue = string | number | boolean | undefined;

export interface ApiFetchInit extends Omit<RequestInit, "body"> {
  json?: unknown;
  /** Multipart body (file uploads, e.g. card scan). The browser sets the
   *  multipart Content-Type + boundary, so we never set it ourselves. */
  form?: FormData;
  query?: Record<string, QueryValue>;
  skipAuth?: boolean;
}

function url(path: string): string {
  const base = getApiConfig().baseUrl.replace(/\/$/, "");
  if (/^https?:\/\//i.test(path)) return path;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

function buildQuery(query?: Record<string, QueryValue>): string {
  if (!query) return "";
  const parts: string[] = [];
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined) continue;
    parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  }
  return parts.length ? `?${parts.join("&")}` : "";
}

function isEnvelope(value: unknown): value is Envelope {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return "meta" in v && ("data" in v || "error" in v);
}

/** Issue a request and return the full envelope (use when you need `meta`/`pagination`). */
export async function apiFetchEnvelope<T = unknown>(
  path: string,
  init: ApiFetchInit = {},
): Promise<Envelope<T>> {
  const cfg = getApiConfig();
  const { json, form, query, skipAuth, headers, ...rest } = init;
  const finalHeaders: Record<string, string> = {
    Accept: "application/json",
    ...((headers as Record<string, string>) ?? {}),
  };
  let body: BodyInit | undefined;
  if (form !== undefined) {
    body = form; // do NOT set Content-Type — the browser adds the boundary
  } else if (json !== undefined) {
    finalHeaders["Content-Type"] = "application/json";
    body = JSON.stringify(json);
  }
  const token = skipAuth ? null : cfg.getToken?.();
  if (token) finalHeaders.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(url(path) + buildQuery(query), {
      ...rest,
      headers: finalHeaders,
      body,
      // Web opts in so the HttpOnly auth cookie is sent (same-origin /v1).
      ...(cfg.withCredentials ? { credentials: "include" as const } : {}),
    });
  } catch (e) {
    throw new ApiError(path, { code: "network.unreachable", message: String(e), status: 0 });
  }

  if (res.status === 204) return { data: null, meta: emptyMeta(), pagination: null, error: null };

  const text = await res.text().catch(() => "");
  let parsed: unknown = text;
  if ((res.headers.get("content-type") ?? "").includes("application/json") && text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      /* keep raw text */
    }
  }

  if (!res.ok) {
    if (res.status === 401 && !skipAuth) cfg.onUnauthorized?.();
    const fallback: ErrorDetail = {
      code: `http.${res.status}`,
      message: `${res.status} ${res.statusText || "error"} (${path})`,
      status: res.status,
    };
    const err = isEnvelope(parsed) && parsed.error ? parsed.error : fallback;
    throw new ApiError(path, {
      code: err.code,
      message: err.message,
      status: err.status ?? res.status,
      details: err.details,
    });
  }

  if (isEnvelope(parsed)) return parsed as Envelope<T>;
  return { data: parsed as T, meta: emptyMeta(), pagination: null, error: null };
}

/** Convenience wrapper that unwraps to `envelope.data`. Throws {@link ApiError} on failure. */
export async function apiFetch<T = unknown>(path: string, init: ApiFetchInit = {}): Promise<T> {
  const envelope = await apiFetchEnvelope<T>(path, init);
  return envelope.data as T;
}

function emptyMeta(): Envelope["meta"] {
  return { request_id: "", timestamp: new Date().toISOString(), version: "v1", duration_ms: null };
}
