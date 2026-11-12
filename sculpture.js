import * as THREE from "./three.module.min.js";

function roundedRect(path, width, height, radius) {
  const x = width / 2;
  const y = height / 2;
  path.moveTo(-x + radius, -y);
  path.lineTo(x - radius, -y);
  path.quadraticCurveTo(x, -y, x, -y + radius);
  path.lineTo(x, y - radius);
  path.quadraticCurveTo(x, y, x - radius, y);
  path.lineTo(-x + radius, y);
  path.quadraticCurveTo(-x, y, -x, y - radius);
  path.lineTo(-x, -y + radius);
  path.quadraticCurveTo(-x, -y, -x + radius, -y);
  return path;
}

function makeFrame() {
  const shape = roundedRect(new THREE.Shape(), 2.3, 1.72, .36);
  shape.holes.push(roundedRect(new THREE.Path(), 1.77, 1.19, .21));
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: .22,
    bevelEnabled: true,
    bevelSize: .099,
    bevelThickness: .105,
    bevelSegments: 5,
    curveSegments: 11,
  });
  geometry.center();
  geometry.computeVertexNormals();
  return geometry;
}

function makeEnvironment(renderer) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const paint = canvas.getContext("2d");
  const backdrop = paint.createLinearGradient(0, 0, 0, 256);
  backdrop.addColorStop(0, "#f9e9ff");
  backdrop.addColorStop(.31, "#c0a4c5");
  backdrop.addColorStop(.58, "#39233d");
  backdrop.addColorStop(1, "#bca0bf");
  paint.fillStyle = backdrop;
  paint.fillRect(0, 0, 512, 256);

  for (const [x, y, w, h, color] of [
    [7, 33, 142, 72, "#ffffff"],
    [202, 70, 88, 18, "#ffe2ce"],
    [345, 41, 111, 58, "#fff9ff"],
    [280, 181, 109, 22, "#d8b4f1"],
  ]) {
    paint.fillStyle = color;
    paint.fillRect(x, y, w, h);
  }

  const source = new THREE.CanvasTexture(canvas);
  source.colorSpace = THREE.SRGBColorSpace;
  source.mapping = THREE.EquirectangularReflectionMapping;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const target = pmrem.fromEquirectangular(source);
  source.dispose();
  pmrem.dispose();
  return target;
}

export function mountSculpture(motion) {
  const canvas = document.querySelector("#hero-canvas");
  const art = canvas.parentElement;
  const control = document.querySelector("#art-control");
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.17;

  const scene = new THREE.Scene();
  let environment = makeEnvironment(renderer);
  scene.environment = environment.texture;
  const camera = new THREE.PerspectiveCamera(32, 1, .1, 40);
  camera.position.set(0, .14, 9.8);
  const group = new THREE.Group();
  scene.add(group);
  const geometry = makeFrame();
  const layout = [
    [-.84, -.42, -.48, .5, -.22, -.4, 0x9a68b4, 1.10],
    [.94, .19, -.61, -.38, -.48, -.49, 0xa962a4, .95],
    [-.44, .63, .18, -.35, .36, .40, 0xc5a0e0, .98],
    [.49, -.42, .82, .44, -.24, -.52, 0xe3b6ca, 1.04],
    [.56, .83, .53, .26, -.34, .61, 0xf5dac9, .80],
  ];
  const frames = layout.map(([x, y, z, rx, ry, rz, color, size]) => {
    const material = new THREE.MeshPhysicalMaterial({
      color,
      metalness: .69,
      roughness: .24,
      clearcoat: .75,
      clearcoatRoughness: .14,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.rotation.set(rx, ry, rz);
    mesh.scale.setScalar(size);
    group.add(mesh);
    return mesh;
  });
  scene.add(new THREE.HemisphereLight(0xfff4ff, 0xc994b5, 1.3));
  const key = new THREE.DirectionalLight(0xfff7ee, 2);
  key.position.set(-3, 6, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffcffa, 1.2);
  rim.position.set(4, 1, -4);
  scene.add(rim);

  const pointer = new THREE.Vector2();
  let active = false;
  let contextLost = false;
  let raf = 0;
  let previousTime = 0;
  let elapsed = 0;
  let turnTarget = 0;
  let turn = 0;

  function resize() {
    const { clientWidth: width, clientHeight: height } = art;
    if (!width || !height) return;
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5, Math.sqrt(1900000 / (width * height))));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.position.z = camera.aspect < 1.34 ? 11.15 : 9.8;
    camera.updateProjectionMatrix();
  }

  function frame(time) {
    raf = 0;
    const delta = previousTime ? Math.min((time - previousTime) / 1000, .05) : 0;
    elapsed += delta;
    previousTime = time;
    const panel = art.getBoundingClientRect();
    const scroll = THREE.MathUtils.clamp(-panel.top / Math.max(1, panel.height), 0, 1);
    const blend = 1 - Math.exp(-6 * delta);
    turn += (turnTarget - turn) * blend;
    group.rotation.x += (.08 + pointer.y * .27 - group.rotation.x) * blend;
    group.rotation.y += (pointer.x * .32 + turn - scroll * .48 - group.rotation.y) * blend;
    group.rotation.z = .08 * Math.sin(elapsed * .45) - scroll * .18;
    group.position.y = -.09 + Math.sin(elapsed * .65) * .12 + scroll * .44;
    group.position.x = scroll * .48;
    frames.forEach((mesh, index) => {
      const [x, y, , , baseY] = layout[index];
      mesh.position.x = x + Math.sin(elapsed * .68 + index) * .12 + x * scroll * .32;
      mesh.position.y = y + Math.sin(elapsed * .83 + index * 1.4) * .13;
      mesh.rotation.y = baseY + Math.sin(elapsed * .72 + index) * .14;
    });
    renderer.render(scene, camera);
    art.classList.add("is-live");
    control.hidden = false;
    raf = requestAnimationFrame(frame);
  }

  function updatePlayback() {
    const shouldRender = active && !document.hidden && !contextLost && !motion.matches;
    if (shouldRender && !raf) {
      previousTime = 0;
      raf = requestAnimationFrame(frame);
    } else if (!shouldRender && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
    if (contextLost || motion.matches) {
      art.classList.remove("is-live");
      control.hidden = true;
    }
  }

  art.addEventListener("pointermove", (event) => {
    if (event.pointerType === "touch") return;
    const { left, top, width, height } = art.getBoundingClientRect();
    pointer.set((event.clientX - left) / width * 2 - 1, (event.clientY - top) / height * 2 - 1);
  }, { passive: true });
  art.addEventListener("pointerleave", () => pointer.set(0, 0));
  control.addEventListener("click", () => { turnTarget += Math.PI / 1.5; });
  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    contextLost = true;
    updatePlayback();
  });
  canvas.addEventListener("webglcontextrestored", () => {
    environment.dispose();
    environment = makeEnvironment(renderer);
    scene.environment = environment.texture;
    contextLost = false;
    updatePlayback();
  });
  const visibility = new IntersectionObserver(([entry]) => {
    active = entry.isIntersecting;
    updatePlayback();
  });
  const size = new ResizeObserver(resize);
  visibility.observe(art);
  size.observe(art);
  motion.addEventListener("change", updatePlayback);
  document.addEventListener("visibilitychange", updatePlayback);
  resize();
}
