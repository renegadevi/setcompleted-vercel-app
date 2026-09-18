(() => {
  const root = document.querySelector("[data-feature-tabs]");
  if (!root) return;

  const DWELL_MS = 12400;
  const COLS = 2;

  const tabs = Array.from(root.querySelectorAll('[role="tab"]'));
  const panels = Array.from(root.querySelectorAll('[role="tabpanel"]'));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  let activeTab = tabs.find((tab) => tab.getAttribute("aria-selected") === "true") ?? tabs[0];
  let startedAt = 0;
  let elapsedBeforePause = 0;
  let paused = true;
  let inView = false;
  let frame = 0;

  function setProgress(value) {
    root.style.setProperty("--feature-progress", String(value));
  }

  function activate(nextTab) {
    activeTab = nextTab;

    tabs.forEach((tab) => {
      const selected = tab === nextTab;
      tab.setAttribute("aria-selected", selected ? "true" : "false");
      tab.tabIndex = selected ? 0 : -1;
    });

    panels.forEach((panel) => {
      panel.hidden = panel.id !== nextTab.getAttribute("aria-controls");
    });

    elapsedBeforePause = 0;
    startedAt = performance.now();
    setProgress(0);
  }

  function advance() {
    const current = tabs.indexOf(activeTab);
    activate(tabs[(current + 1) % tabs.length]);
  }

  function tick(now) {
    if (paused || reduceMotion.matches) return;

    const elapsed = elapsedBeforePause + (now - startedAt);
    const progress = Math.min(1, elapsed / DWELL_MS);
    setProgress(progress);

    if (progress >= 1) advance();
    frame = requestAnimationFrame(tick);
  }

  function pause() {
    if (paused) return;
    paused = true;
    elapsedBeforePause += performance.now() - startedAt;
    cancelAnimationFrame(frame);
  }

  function canPlay() {
    return inView && !document.hidden && !reduceMotion.matches
      && !root.matches(":hover") && !root.contains(document.activeElement);
  }

  function resume() {
    if (!canPlay() || !paused) return;
    paused = false;
    startedAt = performance.now();
    frame = requestAnimationFrame(tick);
  }

  function select(nextTab) {
    activate(nextTab);
    if (canPlay()) resume();
  }

  tabs.forEach((tab) => {
    tab.tabIndex = tab === activeTab ? 0 : -1;
    tab.addEventListener("click", () => select(tab));
    tab.addEventListener("keydown", (event) => {
      const current = tabs.indexOf(tab);
      let next = current;
      if (event.key === "ArrowRight") next = current + 1;
      else if (event.key === "ArrowLeft") next = current - 1;
      else if (event.key === "ArrowDown") next = current + COLS;
      else if (event.key === "ArrowUp") next = current - COLS;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = tabs.length - 1;
      else return;
      event.preventDefault();
      const target = tabs[(next + tabs.length) % tabs.length];
      target.focus();
      select(target);
    });
  });

  root.addEventListener("mouseenter", pause);
  root.addEventListener("mouseleave", resume);
  root.addEventListener("focusin", pause);
  root.addEventListener("focusout", resume);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) pause();
    else resume();
  });

  reduceMotion.addEventListener("change", () => {
    if (reduceMotion.matches) {
      pause();
      setProgress(0);
      return;
    }
    resume();
  });

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      inView = entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.35);
      if (inView) resume();
      else pause();
    }, { threshold: [0, 0.35, 0.6] });
    observer.observe(root);
  } else {
    inView = true;
  }

  activate(activeTab);
  resume();
})();
