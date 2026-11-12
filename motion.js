const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const smooth = (value) => {
  const progress = clamp(value);
  return progress * progress * (3 - 2 * progress);
};

function setupScrollMotion(reducedMotion) {
  const expertise = document.querySelector(".expertise");
  const deck = expertise.querySelector(".expert-deck");
  const sticky = expertise.querySelector(".expertise-sticky");
  const cards = [...deck.querySelectorAll(".expert-card")];
  const paths = [...document.querySelectorAll(".ink-path")];
  const expertisePath = expertise.querySelector(".ink-path");
  const stickyViewport = matchMedia("(min-width: 1000px) and (min-height: 690px)");
  let pending = 0;

  for (const card of cards) {
    const toggle = card.querySelector(".expert-toggle");
    toggle.hidden = false;
    toggle.addEventListener("click", () => {
      if (!deck.hasAttribute("data-dealt") && !deck.contains(document.activeElement)) return;
      const flipped = card.toggleAttribute("data-flipped");
      toggle.setAttribute("aria-pressed", String(flipped));
    });
  }

  function draw() {
    pending = 0;
    const animate = !reducedMotion.matches;
    expertise.classList.toggle("has-scroll-deck", animate && stickyViewport.matches);
    const pinned = expertise.classList.contains("has-scroll-deck");
    const section = expertise.getBoundingClientRect();
    const runway = Math.max(1, section.height - sticky.offsetHeight);
    const progress = pinned ? clamp((innerHeight * .25 - section.top) / (runway + innerHeight * .13)) : 1;
    const focused = deck.contains(document.activeElement);
    const spread = focused ? 1 : smooth((progress - .08) / .64);
    const turn = focused ? 1 : smooth((progress - .45) / .43);
    const width = deck.clientWidth;

    deck.toggleAttribute("data-dealt", progress >= .88 || focused);
    cards.forEach((card, index) => {
      const order = index - (cards.length - 1) / 2;
      const center = card.offsetLeft + card.offsetWidth / 2;
      card.style.setProperty("--stack-x", ((width / 2 - center + order * 7) * (1 - spread)) + "px");
      card.style.setProperty("--stack-y", (Math.abs(order) * 4 * (1 - spread)) + "px");
      card.style.setProperty("--stack-angle", (order * 6 * (1 - spread)) + "deg");
      card.style.setProperty("--card-turn", (180 * (1 - turn)) + "deg");
    });

    for (const path of paths) {
      const { top, height } = path.getBoundingClientRect();
      const visible = path === expertisePath && pinned ? progress : (innerHeight * .97 - top) / (height + innerHeight * .26);
      path.style.setProperty("--ink-offset", String(animate ? 1 - clamp(visible) : 0));
    }
  }

  function queueDraw() {
    if (!pending) pending = requestAnimationFrame(draw);
  }

  document.body.classList.add("motion-active");
  for (const event of ["scroll", "resize", "pageshow"]) {
    window.addEventListener(event, queueDraw, { passive: true });
  }
  for (const event of ["focusin", "focusout"]) deck.addEventListener(event, queueDraw);
  reducedMotion.addEventListener("change", queueDraw);
  document.fonts.ready.then(queueDraw);
  draw();
}

function setupPointerEffects(reducedMotion) {
  const pointer = matchMedia("(any-pointer: fine)");
  const headings = [...document.querySelectorAll("main h1, main h2")];
  for (const heading of headings) {
    heading.querySelectorAll(".glow-title-light").forEach(layer => layer.remove());
    const sheen = document.createElement("span");
    sheen.className = "heading-sheen";
    sheen.setAttribute("aria-hidden", "true");
    sheen.innerHTML = heading.innerHTML;
    sheen.querySelectorAll("[id]").forEach(element => element.removeAttribute("id"));
    heading.classList.add("reactive-heading");
    heading.append(sheen);
  }

  const springs = new Map();
  let activeHeading;
  let lastPointer;
  let pending = 0;
  let lastFrame = 0;

  function frame(time) {
    pending = 0;
    const step = lastFrame ? Math.min(2, (time - lastFrame) / 16.67) : 1;
    lastFrame = time;
    for (const [element, spring] of springs) {
      spring.vx = (spring.vx - spring.x * .18 * step) * Math.pow(.7, step);
      spring.vy = (spring.vy - spring.y * .18 * step) * Math.pow(.7, step);
      spring.x = clamp(spring.x + spring.vx * step, -3, 3);
      spring.y = clamp(spring.y + spring.vy * step, -3, 3);
      element.style.setProperty("--nudge-x", spring.x.toFixed(3) + "px");
      element.style.setProperty("--nudge-y", spring.y.toFixed(3) + "px");
      element.style.setProperty("--nudge-angle", (spring.x * .15).toFixed(3) + "deg");
      if (Math.abs(spring.x) + Math.abs(spring.y) + Math.abs(spring.vx) + Math.abs(spring.vy) < .025) {
        for (const key of ["--nudge-x", "--nudge-y", "--nudge-angle"]) element.style.removeProperty(key);
        element.classList.remove("pointer-spring");
        springs.delete(element);
      }
    }
    if (springs.size) pending = requestAnimationFrame(frame);
    else lastFrame = 0;
  }

  function resetHeading() {
    activeHeading?.removeAttribute("data-heading-active");
    activeHeading = undefined;
  }

  function reset() {
    resetHeading();
    lastPointer = undefined;
    for (const element of springs.keys()) {
      for (const key of ["--nudge-x", "--nudge-y", "--nudge-angle"]) element.style.removeProperty(key);
      element.classList.remove("pointer-spring");
    }
    springs.clear();
    if (pending) cancelAnimationFrame(pending);
    pending = 0;
    lastFrame = 0;
  }

  window.addEventListener("pointermove", event => {
    if (reducedMotion.matches || !pointer.matches || event.pointerType === "touch" || !(event.target instanceof Element)) return;
    const heading = event.target.closest(".reactive-heading");
    if (heading !== activeHeading) {
      resetHeading();
      activeHeading = heading;
      heading?.setAttribute("data-heading-active", "");
    }
    if (heading) {
      const bounds = heading.getBoundingClientRect();
      heading.style.setProperty("--sheen-x", (event.clientX - bounds.left).toFixed(2) + "px");
      heading.style.setProperty("--sheen-y", (event.clientY - bounds.top).toFixed(2) + "px");
    }

    const previous = lastPointer;
    lastPointer = { x: event.clientX, y: event.clientY, time: event.timeStamp };
    if (!previous || event.timeStamp - previous.time > 120) return;
    const dx = clamp((event.clientX - previous.x) * .07, -1.2, 1.2);
    const dy = clamp((event.clientY - previous.y) * .07, -1.2, 1.2);
    const targets = new Set([
      event.target.closest("a:not(.skip), button:not(.expert-toggle)"),
      event.target.closest(".studio, .session, .expert-card, .portrait, .workflow, input, textarea, select")
    ]);
    targets.delete(null);
    for (const element of targets) {
      const spring = springs.get(element) || { x: 0, y: 0, vx: 0, vy: 0 };
      spring.vx = clamp(spring.vx + dx, -2, 2);
      spring.vy = clamp(spring.vy + dy, -2, 2);
      springs.set(element, spring);
      element.classList.add("pointer-spring");
    }
    if (springs.size && !pending) pending = requestAnimationFrame(frame);
  }, { passive: true });

  window.addEventListener("blur", reset);
  window.addEventListener("resize", reset, { passive: true });
  document.documentElement.addEventListener("pointerleave", reset);
  document.addEventListener("scroll", reset, { passive: true });
  reducedMotion.addEventListener("change", reset);
  pointer.addEventListener("change", reset);
}

export function setupMotion(reducedMotion) {
  setupScrollMotion(reducedMotion);
  setupPointerEffects(reducedMotion);
}
