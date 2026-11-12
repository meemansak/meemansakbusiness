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
  document.body.append(canvas);

  const points = [];
  const lifetime = 410;
  let scale = 1;
  let pending = 0;
  let sample;
  let currentControl;

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
    const control = target.closest(".pill, .session-link, .expert-toggle, .workflow-controls button");
    if (control !== currentControl) clearControl();
    if (control) {
      const bounds = control.getBoundingClientRect();
      const dx = clamp((x - bounds.left) / bounds.width - .5, -.5, .5);
      const dy = clamp((y - bounds.top) / bounds.height - .5, -.5, .5);
      control.style.setProperty("--pull-x", (dx * 13) + "px");
      control.style.setProperty("--pull-y", (dy * 10) + "px");
      currentControl = control;
    }
    const inSpotlight = spotlight.contains(target);
    spotlight.classList.toggle("has-spotlight", inSpotlight);
    if (inSpotlight) {
      const bounds = title.getBoundingClientRect();
      title.style.setProperty("--glow-x", (x - bounds.left) + "px");
      title.style.setProperty("--glow-y", (y - bounds.top) + "px");
    }
    const last = points.at(-1);
    if (last && (time - last.time > 95 || Math.hypot(x - last.x, y - last.y) > 180)) points.length = 0;
    points.push({ x, y, time });
    if (points.length > 25) points.shift();
  }

  function draw(time) {
    pending = 0;
    if (sample) updatePointer(sample, time);
    sample = undefined;
    while (points.length && time - points[0].time > lifetime) points.shift();
    context.clearRect(0, 0, canvas.width / scale, canvas.height / scale);
    context.lineCap = "round";
    context.shadowColor = "#7896ff";
    context.shadowBlur = 5;

    for (let i = 1; i < points.length; i++) {
      const previous = points[i - 1];
      const point = points[i];
      const life = 1 - (time - previous.time) / lifetime;
      const before = points[i - 2] || previous;
      context.beginPath();
      context.moveTo((before.x + previous.x) / 2, (before.y + previous.y) / 2);
      context.quadraticCurveTo(previous.x, previous.y, (previous.x + point.x) / 2, (previous.y + point.y) / 2);
      context.strokeStyle = "rgba(60, 105, 255, " + (life * .58) + ")";
      context.lineWidth = .8 + life * 2.6;
      context.stroke();
    }

    if (points.length) pending = requestAnimationFrame(draw);
  }

  function reset() {
    clearControl();
    spotlight.classList.remove("has-spotlight");
    points.length = 0;
    sample = undefined;
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
  document.addEventListener("scroll", () => {
    clearControl();
    spotlight.classList.remove("has-spotlight");
  }, { passive: true });
  reducedMotion.addEventListener("change", reset);
  resize();
}

export function setupMotion(reducedMotion) {
  setupScrollMotion(reducedMotion);
  setupPointerEffects(reducedMotion);
}
