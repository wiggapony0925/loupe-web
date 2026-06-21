import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { configureApi } from "@loupe/core";
import "@/styles/global.scss";
import App from "@/App";

// Configure the shared API layer before first render: same-origin /v1 (proxied
// by Vite in dev, nginx in prod) and the bearer token from localStorage.
configureApi({
  baseUrl: "",
  getToken: () => localStorage.getItem("loupe.auth.token"),
  // Send the HttpOnly auth cookie alongside requests (same-origin /v1). The
  // bearer token still works during rollout; the cookie is the path off
  // JS-readable storage.
  withCredentials: true,
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
