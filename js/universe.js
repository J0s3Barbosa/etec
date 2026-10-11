import * as THREE from 'three';

const PLANET_LAYOUT = [
  [0, 4.2, 0],
  [4.8, 2.3, 0],
  [4.2, -2.7, 0],
  [0, -4.4, 0],
  [-4.5, -2.5, 0],
  [-4.8, 2.1, 0]
];

const DRAG_CLICK_THRESHOLD = 8;
const CORE_INDEX = 0;

function orbitPositions(count, radius = 4.6) {
  if (count <= PLANET_LAYOUT.length && radius > 4) return PLANET_LAYOUT.slice(0, count);
  const out = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 - Math.PI / 2;
    out.push([Math.cos(a) * radius, Math.sin(a) * (radius * 0.52), Math.sin(a) * (radius * 0.13)]);
  }
  return out;
}

function labelTexture(text, emoji, sub = 'TOQUE PARA EXPLORAR') {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 160;
  const x = c.getContext('2d');
  x.clearRect(0, 0, 512, 160);
  x.font = 'bold 48px system-ui';
  x.textAlign = 'center';
  x.fillStyle = '#fff';
  x.shadowColor = '#000';
  x.shadowBlur = 10;
  const line = `${emoji} ${text}`;
  x.fillText(line.length > 22 ? line.slice(0, 21) + '…' : line, 256, 78);
  x.font = '26px system-ui';
  x.fillStyle = '#cfe5ff';
  x.fillText(sub, 256, 125);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function disposeGroup(group) {
  group.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
      else obj.material.dispose();
    }
    if (obj.material?.map) obj.material.map.dispose();
  });
}

function createPlanetMesh(node, { radius = 0.72, sub }) {
  const color = node.color ?? 0x88aaff;
  const g = new THREE.Group();
  g.userData.node = node;
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 40, 32),
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.18,
      roughness: 0.28,
      metalness: 0.12
    })
  );
  g.add(sphere);
  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(radius * 1.25, 0.025, 8, 64),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8 })
  );
  halo.rotation.x = 1.0;
  g.add(halo);
  const spr = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: labelTexture(node.name, node.emoji || '🪐', sub),
      transparent: true,
      depthTest: false
    })
  );
  spr.position.y = -(radius + 0.45);
  spr.scale.set(2.4, 0.78, 1);
  g.add(spr);
  return { group: g, sphere, node, halo };
}

export function createUniverse(host, treeRoot, { onLeafSelect, onNavigate }) {
  let scene;
  let camera;
  let renderer;
  let raycaster;
  let mouse;
  let root;
  let coreMesh;
  let orbitGroup;
  let linkGroup;
  const planetMeshes = [];
  const navStack = [treeRoot];
  let rootLayersOpen = false;
  let viewMode = 'layer';
  let dragging = false;
  let dragLast = { x: 0, y: 0 };
  let dragStart = { x: 0, y: 0 };
  let targetRot = { x: 0, y: 0 };
  let zoom = 1;
  const clock = new THREE.Clock();

  function currentNode() {
    return navStack[navStack.length - 1];
  }

  function notifyNav() {
    onNavigate?.({ stack: [...navStack], rootLayersOpen, viewMode });
  }

  function clearLinks() {
    if (!linkGroup) return;
    while (linkGroup.children.length) {
      const child = linkGroup.children[0];
      linkGroup.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    }
  }

  function clearPlanets() {
    clearLinks();
    while (planetMeshes.length) {
      const p = planetMeshes.pop();
      orbitGroup.remove(p.group);
      disposeGroup(p.group);
    }
  }

  function addPlanetAt(node, position, opts) {
    const p = createPlanetMesh(node, opts);
    p.group.position.set(...position);
    p.baseY = position[1];
    orbitGroup.add(p.group);
    planetMeshes.push(p);
    return p;
  }

  function linkLine(a, b, color = 0x5a8fd4, opacity = 0.55) {
    const geo = new THREE.BufferGeometry().setFromPoints([a, b]);
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
    const line = new THREE.Line(geo, mat);
    linkGroup.add(line);
  }

  function buildPlanets(nodes) {
    clearPlanets();
    viewMode = 'layer';
    if (!nodes.length) {
      notifyNav();
      return;
    }
    const positions = orbitPositions(nodes.length);
    nodes.forEach((node, i) => {
      const hasKids = node.children?.length;
      const hasMap = node.mindMap?.length;
      let sub = 'TOQUE PARA APRENDER';
      if (hasKids) sub = 'ENTRAR NA CAMADA';
      else if (hasMap) sub = 'ABRIR MAPA DE IDEIAS';
      addPlanetAt(node, positions[i], { sub });
    });
    notifyNav();
  }

  function buildMindMap(hub) {
    clearPlanets();
    viewMode = 'mindmap';
    const nodes = hub.mindMap || [];
    const hubPlanet = addPlanetAt(hub, [0, 0, 0], { radius: 0.82, sub: 'HABILIDADE · TOQUE PARA RESUMO' });
    hubPlanet.isHub = true;
    const positions = orbitPositions(nodes.length, 3.1);
    const byId = new Map([[hub.id, hubPlanet]]);
    nodes.forEach((node, i) => {
      const p = addPlanetAt(node, positions[i], {
        radius: 0.58,
        sub: node.mindMap?.length ? 'APROFUNDAR MAPA' : 'TOQUE PARA DETALHES'
      });
      byId.set(node.id, p);
      linkLine(new THREE.Vector3(0, 0, 0), new THREE.Vector3(...positions[i]));
    });
    nodes.forEach((node, i) => {
      const from = byId.get(node.id);
      if (!from || !node.links?.length) return;
      node.links.forEach((linkId) => {
        const to = byId.get(linkId);
        if (!to || to === from) return;
        linkLine(from.group.position.clone(), to.group.position.clone(), 0x81f1df, 0.42);
      });
    });
    notifyNav();
  }

  function showNodeChildren(node) {
    buildPlanets(node.children || []);
  }

  function navigateInto(node) {
    if (node.children?.length) {
      navStack.push(node);
      showNodeChildren(node);
      return;
    }
    if (node.mindMap?.length) {
      navStack.push(node);
      buildMindMap(node);
      return;
    }
    onLeafSelect(node);
  }

  function navigateUp() {
    if (viewMode === 'mindmap' && navStack.length > 1) {
      navStack.pop();
      const node = currentNode();
      buildPlanets(node.children || []);
      notifyNav();
      return;
    }
    if (navStack.length > 1) {
      navStack.pop();
      showNodeChildren(currentNode());
      return;
    }
    if (rootLayersOpen) {
      rootLayersOpen = false;
      clearPlanets();
      viewMode = 'layer';
      notifyNav();
    }
  }

  function openRootLayers() {
    rootLayersOpen = true;
    navStack.length = 0;
    navStack.push(treeRoot);
    showNodeChildren(treeRoot);
  }

  function handlePick(hits) {
    if (!hits.length) return;
    const obj = hits[0].object;
    if (obj === coreMesh) {
      if (!rootLayersOpen && navStack.length === 1 && navStack[0].id === treeRoot.id) {
        openRootLayers();
      } else {
        navigateUp();
      }
      return;
    }
    const hit = planetMeshes.find((p) => p.sphere === obj);
    if (!hit) return;
    if (viewMode === 'mindmap' && hit.isHub) {
      onLeafSelect(hit.node);
      return;
    }
    navigateInto(hit.node);
  }

  function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050817);
    camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 1000);
    camera.position.set(0, 1, 14);
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(innerWidth, innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(renderer.domElement);
    scene.add(new THREE.AmbientLight(0x9bbaff, 1.5));
    const light = new THREE.PointLight(0xffffff, 100);
    light.position.set(0, 5, 8);
    scene.add(light);
    root = new THREE.Group();
    scene.add(root);
    const starGeo = new THREE.BufferGeometry();
    const positions = [];
    for (let i = 0; i < 1300; i++) {
      positions.push((Math.random() - 0.5) * 100, (Math.random() - 0.5) * 70, (Math.random() - 0.5) * 80);
    }
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xb9d8ff, size: 0.09 })));
    coreMesh = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.35, 2),
      new THREE.MeshStandardMaterial({
        color: 0x4de0cd,
        emissive: 0x0c6d86,
        emissiveIntensity: 1.2,
        metalness: 0.1,
        roughness: 0.3
      })
    );
    root.add(coreMesh);
    root.add(
      new THREE.Mesh(
        new THREE.SphereGeometry(1.65, 32, 32),
        new THREE.MeshBasicMaterial({ color: 0x33e6db, transparent: true, opacity: 0.09, side: THREE.BackSide })
      )
    );
    const dna = new THREE.Group();
    for (let i = 0; i < 22; i++) {
      const a = i * 0.55;
      const y = (i - 10.5) * 0.12;
      for (let strand = 0; strand < 2; strand++) {
        const angle = a + strand * Math.PI;
        const m = new THREE.Mesh(
          new THREE.SphereGeometry(0.09, 12, 12),
          new THREE.MeshStandardMaterial({
            color: strand ? 0x9d85ff : 0x79f4d9,
            emissive: strand ? 0x3a2478 : 0x12665d
          })
        );
        m.position.set(Math.cos(angle) * 0.65, y, Math.sin(angle) * 0.65);
        dna.add(m);
      }
    }
    root.add(dna);
    orbitGroup = new THREE.Group();
    linkGroup = new THREE.Group();
    root.add(orbitGroup);
    orbitGroup.add(linkGroup);
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();
    const el = renderer.domElement;
    el.addEventListener('pointerdown', (e) => {
      dragging = true;
      dragStart = { x: e.clientX, y: e.clientY };
      dragLast = { ...dragStart };
      el.setPointerCapture(e.pointerId);
    });
    el.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - dragLast.x;
      const dy = e.clientY - dragLast.y;
      targetRot.y += dx * 0.006;
      targetRot.x += dy * 0.004;
      targetRot.x = Math.max(-0.65, Math.min(0.65, targetRot.x));
      dragLast = { x: e.clientX, y: e.clientY };
    });
    el.addEventListener('pointerup', (e) => {
      dragging = false;
      if (Math.hypot(e.clientX - dragStart.x, e.clientY - dragStart.y) > DRAG_CLICK_THRESHOLD) return;
      const r = el.getBoundingClientRect();
      mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      mouse.y = -((e.clientY - r.top) / r.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const targets = [coreMesh, ...planetMeshes.map((p) => p.sphere)];
      const hits = raycaster.intersectObjects(targets, false);
      handlePick(hits);
    });
    el.addEventListener(
      'wheel',
      (e) => {
        zoom = Math.max(0.65, Math.min(1.7, zoom + e.deltaY * 0.0008));
        camera.position.z = 14 / zoom;
      },
      { passive: true }
    );
    window.addEventListener('resize', () => {
      camera.aspect = innerWidth / innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(innerWidth, innerHeight);
    });
    notifyNav();
    animate();
  }

  function animate() {
    requestAnimationFrame(animate);
    if (!renderer) return;
    const t = clock.getElapsedTime();
    if (root) {
      root.rotation.y += (targetRot.y - root.rotation.y) * 0.045;
      root.rotation.x += (targetRot.x - root.rotation.x) * 0.045;
      root.children[CORE_INDEX].rotation.y = t * 0.15;
      root.children[1].scale.setScalar(1 + Math.sin(t * 1.5) * 0.035);
      root.children[2].rotation.y = t * 0.22;
      planetMeshes.forEach((p, i) => {
        const base = p.baseY ?? p.group.position.y;
        p.group.position.y = base + Math.sin(t * 1.2 + i) * 0.06;
        p.group.rotation.y = t * 0.12 + i * 0.3;
        p.halo.rotation.z = t * 0.18 + i;
      });
    }
    renderer.render(scene, camera);
  }

  return {
    start() {
      if (!renderer) init();
    },
    goUp() {
      navigateUp();
    }
  };
}
