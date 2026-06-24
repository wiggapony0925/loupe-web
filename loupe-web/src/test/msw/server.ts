import { setupServer } from "msw/node";
import { handlers } from "./handlers";

/** Node MSW server used by Vitest. Lifecycle is wired in `src/test/setup.ts`. */
export const server = setupServer(...handlers);
