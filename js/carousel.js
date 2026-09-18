(() => {
  const root = document.querySelector("[data-carousel]");
  if (!root) return;

  const slides = Array.from(root.querySelectorAll("[data-carousel-slide]"));
  const dots = root.querySelector("[data-carousel-dots]");
  const captionTitle = root.querySelector("[data-carousel-title]");
  const captionBody = root.querySelector("[data-carousel-body]");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const motionMs = 700;
  const cycleMs = 5000;

  if (slides.length === 0) return;

  let index = 0;
  let busy = false;
  let inView = true;
  let cycleTimer = 0;

  function themeName() {
    return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
  }

  function shotFor(img, theme) {
    return img.getAttribute(theme === "dark" ? "data-shot-dark" : "data-shot-light")
      || img.getAttribute("data-shot-light")
      || img.getAttribute("src");
  }

  function applyThemeShots() {
    const theme = themeName();
    root.querySelectorAll("img[data-shot-light], img[data-shot-dark]").forEach((img) => {
      const next = shotFor(img, theme);
      if (next && img.getAttribute("src") !== next) img.src = next;
    });
  }

  function wrapIndex(value) {
    return (value + slides.length) % slides.length;
  }

  function direction(from, to) {
    const forward = wrapIndex(to - from);
    const backward = wrapIndex(from - to);
    return forward <= backward ? 1 : -1;
  }

  function setCaption(slide) {
    if (captionTitle) captionTitle.textContent = slide?.dataset.title ?? "";
    if (captionBody) captionBody.textContent = slide?.dataset.caption ?? "";
  }

  function setDots(activeIndex) {
    if (!dots) return;
    Array.from(dots.children).forEach((dot, i) => {
      if (i === activeIndex) dot.setAttribute("aria-current", "true");
      else dot.removeAttribute("aria-current");
    });
  }

  function clearMotion(slide) {
    slide.classList.remove("is-enter", "is-enter-left", "is-enter-right", "is-leave", "is-leave-left", "is-leave-right");
  }

  function settle(slide) {
    slide.classList.add("is-settling");
    clearMotion(slide);
    slide.offsetHeight;
    slide.classList.remove("is-settling");
  }

  function stopCycle() {
    window.clearTimeout(cycleTimer);
    cycleTimer = 0;
  }

  function canCycle() {
    return slides.length > 1
      && inView
      && !document.hidden
      && !root.matches(":hover")
      && !root.contains(document.activeElement);
  }

  function scheduleCycle() {
    stopCycle();
    if (!canCycle()) return;
    cycleTimer = window.setTimeout(() => {
      if (busy || !canCycle()) {
        scheduleCycle();
        return;
      }
      go(index + 1);
    }, cycleMs);
  }

  function go(nextIndex) {
    const target = wrapIndex(nextIndex);
    if (target === index || busy) return;

    const from = slides[index];
    const to = slides[target];
    const dir = direction(index, target);

    stopCycle();
    setCaption(to);
    setDots(target);
    slides.forEach((slide, i) => {
      slide.setAttribute("aria-hidden", i === target ? "false" : "true");
    });

    if (reduceMotion.matches) {
      from.classList.remove("is-active");
      settle(from);
      settle(to);
      to.classList.add("is-active");
      index = target;
      scheduleCycle();
      return;
    }

    busy = true;
    settle(to);
    to.classList.add("is-enter", dir > 0 ? "is-enter-right" : "is-enter-left");

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        from.classList.remove("is-active");
        from.classList.add("is-leave", dir > 0 ? "is-leave-left" : "is-leave-right");
        to.classList.add("is-active");
        to.classList.remove("is-enter", "is-enter-left", "is-enter-right");
      });
    });

    window.setTimeout(() => {
      settle(from);
      clearMotion(to);
      busy = false;
      index = target;
      scheduleCycle();
    }, motionMs);
  }

  applyThemeShots();

  slides.forEach((slide, i) => {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-label", `Show ${slide.dataset.title ?? `slide ${i + 1}`}`);
    button.addEventListener("click", () => go(i));
    dots?.appendChild(button);
    slide.setAttribute("aria-hidden", i === 0 ? "false" : "true");
  });

  slides[0].classList.add("is-active");
  setCaption(slides[0]);
  setDots(0);

  root.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") go(index - 1);
    if (event.key === "ArrowRight") go(index + 1);
  });

  let touchStartX = 0;
  root.addEventListener("touchstart", (event) => {
    touchStartX = event.changedTouches[0]?.clientX ?? 0;
  }, { passive: true });
  root.addEventListener("touchend", (event) => {
    const delta = (event.changedTouches[0]?.clientX ?? 0) - touchStartX;
    if (Math.abs(delta) < 40) return;
    go(delta < 0 ? index + 1 : index - 1);
  });

  root.addEventListener("mouseenter", stopCycle);
  root.addEventListener("mouseleave", scheduleCycle);
  root.addEventListener("focusin", stopCycle);
  root.addEventListener("focusout", scheduleCycle);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopCycle();
    else scheduleCycle();
  });

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      inView = entries.some((entry) => entry.isIntersecting);
      if (inView) scheduleCycle();
      else stopCycle();
    }, { threshold: 0.35 });
    observer.observe(root);
  }

  document.addEventListener("themechange", applyThemeShots);
  scheduleCycle();
})();
