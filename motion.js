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
  const canvas = document.createElement("canvas");
  canvas.className = "pointer-ink";
  canvas.setAttribute("aria-hidden", "true");
  const context = canvas.getContext("2d");
  if (!context) return;
  const lens = document.createElement("div");
  lens.className = "pointer-lens";
  lens.setAttribute("aria-hidden", "true");
  document.body.append(lens, canvas);

  const points = [];
  const lifetime = 580;
  let scale = 1;
  let pending = 0;
  let sample;
  let currentControl;
  let currentSurface;
  let wake;

  function resize() {
    scale = Math.min(devicePixelRatio || 1, 1.25);
    canvas.width = Math.ceil(innerWidth * scale);
    canvas.height = Math.ceil(innerHeight * scale);
    context.setTransform(scale, 0, 0, scale, 0, 0);
  }

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
    context.clearRect(0, 0, canvas.width / scale, canvas.height / scale);
    const tip = points.at(-1);
    if (!tip) {
      lens.style.opacity = "0";
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
    lens.style.transform = `translate3d(${wake.x}px, ${wake.y}px, 0) rotate(${wake.angle}rad) scaleX(${1 + tip.speed * .32 * strength})`;
    lens.style.opacity = String(strength * (.44 + tip.speed * .16));
    context.lineCap = "round";
    const ribbon = points.map(point => {
      const age = time - point.time;
      const life = 1 - age / lifetime;
      const wave = Math.sin(point.time * .026 + age * .008) * (5 + point.speed * 9) * Math.sin(Math.PI * life);
      return { x: point.x + point.nx * wave, y: point.y + point.ny * wave, life, speed: point.speed };
    });
    for (const [width, alpha] of [[27, .07], [13, .12], [4, .23]]) {
      for (let index = 1; index < ribbon.length; index++) {
        const point = ribbon[index];
        const previous = ribbon[index - 1];
        const before = ribbon[index - 2] || previous;
        context.beginPath();
        context.moveTo((before.x + previous.x) / 2, (before.y + previous.y) / 2);
        context.quadraticCurveTo(previous.x, previous.y, (previous.x + point.x) / 2, (previous.y + point.y) / 2);
        context.strokeStyle = `rgba(72, 112, 255, ${point.life ** 2 * alpha})`;
        context.lineWidth = Math.max(.6, width * point.life * (1 + point.speed * .22));
        context.stroke();
      }
    }
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
    lens.style.opacity = "0";
    if (pending) cancelAnimationFrame(pending);
    pending = 0;
    context.clearRect(0, 0, canvas.width / scale, canvas.height / scale);
  }

  window.addEventListener("pointermove", (event) => {
    if (reducedMotion.matches || !pointer.matches || event.pointerType === "touch" || !(event.target instanceof Element)) return;
    sample = { x: event.clientX, y: event.clientY, target: event.target };
    if (!pending) pending = requestAnimationFrame(draw);
  }, { passive: true });
  window.addEventListener("resize", resize, { passive: true });
  window.addEventListener("blur", reset);
  document.documentElement.addEventListener("pointerleave", reset);
  document.addEventListener("scroll", clearHover, { passive: true });
  reducedMotion.addEventListener("change", reset);
  pointer.addEventListener("change", reset);
  resize();
}

export function setupMotion(reducedMotion) {
  setupScrollMotion(reducedMotion);
  setupPointerEffects(reducedMotion);
}
