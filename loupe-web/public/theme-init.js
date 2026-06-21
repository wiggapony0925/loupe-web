/*
 * No-flash theme bootstrap. Loaded as a blocking <script src> in <head> so it
 * runs before first paint and stamps data-theme on <html> with no light/dark
 * flash. Externalized (rather than inlined) so the Content-Security-Policy can
 * use a strict `script-src 'self'` with no inline-script allowance — see
 * nginx.conf. Keep this tiny and dependency-free.
 */
(function () {
  try {
    var stored = localStorage.getItem("loupe.theme");
    var mode = stored || "system";
    var systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    var resolved = mode === "system" ? (systemDark ? "dark" : "light") : mode;
    document.documentElement.setAttribute("data-theme", resolved);
  } catch (e) {
    document.documentElement.setAttribute("data-theme", "dark");
  }
})();
