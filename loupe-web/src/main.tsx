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
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
