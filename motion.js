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
  const spotlight = document.querySelector("[data-spotlight]");
  const title = spotlight.querySelector(".glow-title");
  const lenses = Array.from({ length: 3 }, () => {
    const lens = document.createElement("div");
    lens.className = "pointer-lens";
    lens.setAttribute("aria-hidden", "true");
    document.body.append(lens);
    return lens;
  });
  const titleLight = title.querySelector(".glow-title-light");
  const titleHalo = titleLight.cloneNode(true);
  titleHalo.classList.add("glow-title-halo");
  title.append(titleHalo);

  const points = [];
  const lifetime = 580;
  let pending = 0;
  let sample;
  let currentControl;
  let currentSurface;
  let wake;

  function clearControl() {
    if (!currentControl) return;
    for (const key of ["--pull-x", "--pull-y"]) {
      currentControl.style.removeProperty(key);
    }
    currentControl = undefined;
  }

  function updatePointer({ x, y, target }, time) {
    const control = target.closest("a:not(.skip), button");
    if (control !== currentControl) clearControl();
    if (control) {
      const bounds = control.getBoundingClientRect();
      const dx = clamp((x - bounds.left) / bounds.width - .5, -.5, .5);
      const dy = clamp((y - bounds.top) / bounds.height - .5, -.5, .5);
      control.style.setProperty("--pull-x", (dx * 13) + "px");
      control.style.setProperty("--pull-y", (dy * 10) + "px");
      currentControl = control;
    }
    const surface = target.closest(".studio, .session, .expert-card, .portrait, .workflow, h1, h2, h3, input, textarea, select");
    if (surface !== currentSurface) {
      currentSurface?.removeAttribute("data-pointer-active");
      surface?.setAttribute("data-pointer-active", "");
      currentSurface = surface;
    }
    if (surface) {
      const bounds = surface.getBoundingClientRect();
      surface.style.setProperty("--hover-x", (x - bounds.left) + "px");
      surface.style.setProperty("--hover-y", (y - bounds.top) + "px");
    }
    const inSpotlight = spotlight.contains(target);
    spotlight.classList.toggle("has-spotlight", inSpotlight);
    if (inSpotlight) {
      const bounds = title.getBoundingClientRect();
      title.style.setProperty("--glow-x", (x - bounds.left) + "px");
      title.style.setProperty("--glow-y", (y - bounds.top) + "px");
    }
    const last = points.at(-1);
    const dx = last ? x - last.x : 0;
    const dy = last ? y - last.y : 0;
    const distance = Math.hypot(dx, dy);
    if (last && (time - last.time > 110 || distance > 180)) points.length = 0;
    const speed = points.length ? clamp(distance / Math.max(12, time - last.time), 0, 3) : 0;
    points.push({ x, y, time, nx: distance ? -dy / distance : 0, ny: distance ? dx / distance : 0, speed });
    if (points.length > 34) points.shift();
    if (!wake || distance > 180) wake = { x, y, angle: 0 };
  }

  function draw(time) {
    pending = 0;
    if (sample) updatePointer(sample, time);
    sample = undefined;
    while (points.length && time - points[0].time > lifetime) points.shift();
    const tip = points.at(-1);
    if (!tip) {
      for (const lens of lenses) lens.style.opacity = "0";
      wake = undefined;
      return;
    }
    wake.x += (tip.x - wake.x) * .28;
    wake.y += (tip.y - wake.y) * .28;
    if (tip.speed > .18) {
      const angle = Math.atan2(-tip.nx, tip.ny);
      wake.angle += Math.atan2(Math.sin(angle - wake.angle), Math.cos(angle - wake.angle)) * .22;
    }
    const strength = 1 - smooth((time - tip.time) / lifetime);
    lenses.forEach((lens, index) => {
      const delayed = points[Math.max(0, points.length - 1 - index * 4)];
      const age = time - delayed.time;
      const life = 1 - smooth(age / lifetime);
      const wave = Math.sin(age * .009) * delayed.speed * 8;
      const x = index ? delayed.x + delayed.nx * wave : wake.x;
      const y = index ? delayed.y + delayed.ny * wave : wake.y;
      const size = 1 - index * .18;
      lens.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${wake.angle}rad) scale(${size * (1 + tip.speed * .25 * strength)}, ${size})`;
      lens.style.opacity = String(life * (.5 + tip.speed * .12) * (1 - index * .23));
    });
    pending = requestAnimationFrame(draw);
  }

  function clearHover() {
    clearControl();
    currentSurface?.removeAttribute("data-pointer-active");
    currentSurface = undefined;
    spotlight.classList.remove("has-spotlight");
  }

  function reset() {
    clearHover();
    points.length = 0;
    sample = undefined;
    wake = undefined;
    for (const lens of lenses) lens.style.opacity = "0";
    if (pending) cancelAnimationFrame(pending);
    pending = 0;
  }

  window.addEventListener("pointermove", (event) => {
    if (reducedMotion.matches || !pointer.matches || event.pointerType === "touch" || !(event.target instanceof Element)) return;
    sample = { x: event.clientX, y: event.clientY, target: event.target };
    if (!pending) pending = requestAnimationFrame(draw);
  }, { passive: true });
  window.addEventListener("resize", reset, { passive: true });
  window.addEventListener("blur", reset);
  document.documentElement.addEventListener("pointerleave", reset);
  document.addEventListener("scroll", clearHover, { passive: true });
  reducedMotion.addEventListener("change", reset);
  pointer.addEventListener("change", reset);
}

export function setupMotion(reducedMotion) {
  setupScrollMotion(reducedMotion);
  setupPointerEffects(reducedMotion);
}
