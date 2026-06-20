/** Single source of truth for company contact details + external links used by
 *  the footer and the content pages. Swap these for your real handles before
 *  launch. Lives in `lib` so both `components` and `features` can share it. */
export const SUPPORT_EMAIL = "support@loupe.app";
export const CAREERS_EMAIL = "careers@loupe.app";
export const PRESS_EMAIL = "press@loupe.app";

/** Interactive backend API reference (Swagger UI). */
export const API_DOCS_URL = "https://loupe-api-714615078104.us-central1.run.app/api-docs";

/** Backend health endpoint — same-origin in prod, Vite-proxied in dev. */
export const HEALTH_URL = "/health";

export const SOCIAL_LINKS = {
  x: "https://x.com/loupeapp",
  github: "https://github.com/loupe-app",
  linkedin: "https://www.linkedin.com/company/loupe-app",
  instagram: "https://www.instagram.com/loupeapp",
} as const;
