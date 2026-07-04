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

  /*
   * Keep the browser chrome (<meta name="theme-color">) in step with the
   * RESOLVED theme, not the OS scheme. The static media-attribute metas in
   * index.html only track prefers-color-scheme — wrong the moment a user
   * forces the opposite theme in-app. Colors mirror --bg-base per theme.
   */
  try {
    var COLORS = { dark: "#0b0b0d", light: "#ffffff" };
    var syncThemeColor = function () {
      var theme = document.documentElement.getAttribute("data-theme");
      var color = COLORS[theme] || COLORS.dark;
      var metas = document.querySelectorAll('meta[name="theme-color"]');
      for (var i = 0; i < metas.length; i++) metas[i].setAttribute("content", color);
    };
    syncThemeColor();
    new MutationObserver(syncThemeColor).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
  } catch (e) {
    /* cosmetic only — never block boot */
  }
})();
