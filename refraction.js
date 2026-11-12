// A local vector field displaces the actual rendered content near the pointer.
export function setupRefraction(reducedMotion) {
  const finePointer = matchMedia("(pointer: fine)");
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("aria-hidden", "true");
  svg.style.cssText = "position:absolute;width:0;height:0;pointer-events:none";
  svg.innerHTML = '<defs><filter id="liquid-drag" x="-3%" y="-3%" width="106%" height="106%" color-interpolation-filters="sRGB" primitiveUnits="userSpaceOnUse"><feFlood flood-color="rgb(128,128,128)" result="neutral"/><feImage width="260" height="260" preserveAspectRatio="none" result="field"/><feMerge result="map"><feMergeNode in="neutral"/><feMergeNode in="field"/></feMerge><feDisplacementMap in="SourceGraphic" in2="map" xChannelSelector="R" yChannelSelector="G" scale="0"/></filter></defs>';
  document.body.append(svg);
  const map = svg.querySelector("feImage");
  const displacement = svg.querySelector("feDisplacementMap");
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const context = canvas.getContext("2d");
  if (!context) return;
  const pixels = context.createImageData(64, 64);
  let surface;
  let pointer;
  let previous;
  let frame = 0;
  let lastDraw = 0;
  let energy = 0;
  let directionX = 0;
  let directionY = 0;

  function reset() {
    surface?.style.removeProperty("filter");
    surface = undefined;
    previous = undefined;
    energy = 0;
    displacement.setAttribute("scale", "0");
    cancelAnimationFrame(frame);
    frame = 0;
  }

  function draw(time) {
    frame = 0;
    if (!surface || energy < .015) { reset(); return; }
    if (time - lastDraw >= 28) {
      energy *= Math.exp(-Math.min(100, time - lastDraw) / 250);
      lastDraw = time;
      const bounds = surface.getBoundingClientRect();
      map.setAttribute("x", pointer.x - bounds.left - 130);
      map.setAttribute("y", pointer.y - bounds.top - 130);
      for (let y = 0; y < 64; y++) {
        for (let x = 0; x < 64; x++) {
          const nx = (x - 31.5) / 31.5;
          const ny = (y - 31.5) / 31.5;
          const radius = Math.hypot(nx, ny);
          const envelope = Math.max(0, 1 - radius * radius) ** 3;
          const wave = Math.sin(radius * 10 - time * .009) * .22;
          const index = (y * 64 + x) * 4;
          pixels.data[index] = 128 + envelope * (directionX * 75 + nx * wave * 100);
          pixels.data[index + 1] = 128 + envelope * (directionY * 75 + ny * wave * 100);
          pixels.data[index + 2] = 128;
          pixels.data[index + 3] = 255;
        }
      }
      context.putImageData(pixels, 0, 0);
      map.setAttribute("href", canvas.toDataURL());
      displacement.setAttribute("scale", (energy * 52).toFixed(2));
    }
    frame = requestAnimationFrame(draw);
  }

  window.addEventListener("pointermove", event => {
    if (reducedMotion.matches || !finePointer.matches || event.pointerType === "touch") return;
    const target = event.target.closest("main > section, header, footer");
    if (!target) { reset(); return; }
    if (surface !== target) {
      surface?.style.removeProperty("filter");
      surface = target;
      surface.style.filter = "url(#liquid-drag)";
    }
    pointer = { x: event.clientX, y: event.clientY };
    energy = Math.max(.05, energy);
    if (previous) {
      const dx = pointer.x - previous.x;
      const dy = pointer.y - previous.y;
      const distance = Math.hypot(dx, dy);
      const speed = distance / Math.max(10, event.timeStamp - previous.time);
      if (distance) { directionX = dx / distance; directionY = dy / distance; }
      energy = Math.min(1, energy + Math.min(.45, speed * .18));
    }
    previous = { ...pointer, time: event.timeStamp };
    if (!frame) { lastDraw = performance.now(); frame = requestAnimationFrame(draw); }
  }, { passive: true });
  for (const event of ["blur", "resize", "scroll"]) window.addEventListener(event, reset, { passive: true });
  document.documentElement.addEventListener("pointerleave", reset);
  reducedMotion.addEventListener("change", reset);
  finePointer.addEventListener("change", reset);
}
