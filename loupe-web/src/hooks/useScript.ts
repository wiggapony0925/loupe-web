import { useEffect, useState } from "react";

export type ScriptStatus = "idle" | "loading" | "ready" | "error";

/**
 * Load an external script once and report its status. Multiple callers asking
 * for the same `src` share a single `<script>` tag (deduped by URL), so e.g.
 * the Google Identity SDK is fetched once even if Login and Signup both mount.
 * Pass `null` to stay idle (e.g. when a provider isn't configured).
 */
export function useScript(src: string | null): ScriptStatus {
  const [status, setStatus] = useState<ScriptStatus>(src ? "loading" : "idle");

  useEffect(() => {
    if (!src) {
      setStatus("idle");
      return;
    }

    let el = document.querySelector<HTMLScriptElement>(
      `script[data-src="${src}"]`,
    );

    if (!el) {
      el = document.createElement("script");
      el.src = src;
      el.async = true;
      el.defer = true;
      el.dataset.src = src;
      el.dataset.status = "loading";
      document.head.appendChild(el);
      const set = (s: ScriptStatus) => () => {
        el?.setAttribute("data-status", s);
      };
      el.addEventListener("load", set("ready"));
      el.addEventListener("error", set("error"));
    }

    const current = (el.dataset.status as ScriptStatus) ?? "loading";
    setStatus(current);

    const onLoad = () => setStatus("ready");
    const onError = () => setStatus("error");
    el.addEventListener("load", onLoad);
    el.addEventListener("error", onError);

    return () => {
      el?.removeEventListener("load", onLoad);
      el?.removeEventListener("error", onError);
    };
  }, [src]);

  return status;
}
