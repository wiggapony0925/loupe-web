import type { EnvVar } from "@loupe/core";

/**
 * Catalog of the **client** (build-time) environment — the values Vite inlines
 * into the bundle (`import.meta.env`). The backend can't see these, so the web
 * app documents them here. Unlike server secrets, these literally ship in the
 * JS bundle, so their values are always readable client-side (the UI still
 * masks the `secret`-flagged ones behind the eye toggle for tidiness).
 */
interface ClientEnvSpec {
  /** Key on `import.meta.env`. */
  key: string;
  label: string;
  group: string;
  /** Mask by default in the UI (still revealable — it's in the bundle). */
  secret: boolean;
  description: string;
  docsUrl?: string;
}

const CLIENT_SPECS: ClientEnvSpec[] = [
  {
    key: "MODE",
    label: "Build mode",
    group: "Build",
    secret: false,
    description: "Vite mode this bundle was built in (development | production).",
  },
  {
    key: "DEV",
    label: "Dev build",
    group: "Build",
    secret: false,
    description: "True while running the Vite dev server.",
  },
  {
    key: "PROD",
    label: "Prod build",
    group: "Build",
    secret: false,
    description: "True for a production build.",
  },
  {
    key: "BASE_URL",
    label: "Base path",
    group: "Build",
    secret: false,
    description: "Public base path the SPA is served under.",
  },
  {
    key: "VITE_API_URL",
    label: "API base URL",
    group: "Backend",
    secret: false,
    description: "Backend base URL. Blank = same-origin /v1 (Vite proxy in dev, nginx in prod).",
  },
  {
    key: "VITE_GOOGLE_CLIENT_ID",
    label: "Google client id",
    group: "Social sign-in",
    secret: false,
    description: "Enables the Google sign-in button; must match the audience the backend verifies.",
    docsUrl: "https://console.cloud.google.com/apis/credentials",
  },
  {
    key: "VITE_APPLE_CLIENT_ID",
    label: "Apple Services ID",
    group: "Social sign-in",
    secret: false,
    description: "Enables the Apple sign-in button (a Services ID, e.g. com.loupe.web).",
    docsUrl: "https://developer.apple.com/account/resources/identifiers/list",
  },
  {
    key: "VITE_SENTRY_DSN",
    label: "Sentry DSN",
    group: "Observability",
    secret: true,
    description: "When set, client error + performance monitoring is enabled.",
    docsUrl: "https://sentry.io",
  },
  {
    key: "VITE_SENTRY_TRACES_SAMPLE_RATE",
    label: "Sentry trace rate",
    group: "Observability",
    secret: false,
    description: "Performance-trace sample rate (0–1). Defaults to 0.1.",
  },
  {
    key: "VITE_USE_DEMO_DATA",
    label: "Demo data",
    group: "Feature flags",
    secret: false,
    description: "When set, the app may render demo/placeholder data.",
  },
];

/** Read live client env values into the shared {@link EnvVar} shape. */
export function readClientEnv(): EnvVar[] {
  const env = import.meta.env as unknown as Record<string, unknown>;
  return CLIENT_SPECS.map((spec) => {
    const raw = env[spec.key];
    // import.meta.env values are strings/booleans; coerce primitives only.
    const value =
      typeof raw === "string"
        ? raw
        : typeof raw === "boolean" || typeof raw === "number"
          ? String(raw)
          : null;
    const isSet = value !== null && value !== "";
    return {
      key: spec.key,
      label: spec.label,
      group: spec.group,
      secret: spec.secret,
      isSet,
      value, // always present client-side (these are baked into the bundle)
      length: value ? value.length : 0,
      description: spec.description,
      docsUrl: spec.docsUrl ?? null,
    };
  });
}
