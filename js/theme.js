(() => {
  const root = document.documentElement;
  const media = window.matchMedia("(prefers-color-scheme: dark)");

  function apply() {
    const theme = media.matches ? "dark" : "light";
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
    document.dispatchEvent(new CustomEvent("themechange", { detail: { theme } }));
  }

  apply();
  media.addEventListener("change", apply);
})();
