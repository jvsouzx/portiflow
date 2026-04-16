import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';

// A cena (scene) é como um container que armazena objetos, câmeras e iluminaçõa
const scene = new THREE.Scene();

// A camera é o que permite visulizar o conteúdo das cenas, o three.js tem várias cameras 
// o mais comum é utilizar a perpective camera que simula o comportamento do olhar humano
const camera = new THREE.PerspectiveCamera(80, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer({
    canvas: document.querySelector<HTMLCanvasElement>('#background')!,
    alpha: true,
});

const canvas = renderer.domElement;
renderer.setClearColor(0x000000, 0);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
camera.aspect = canvas.clientWidth / canvas.clientHeight;
camera.updateProjectionMatrix();

camera.position.setZ(30);

renderer.render(scene, camera);

// const gridHelper = new THREE.GridHelper(200, 50)
// scene.add(gridHelper)

// creating a object
// const geometry = new THREE.PlaneGeometry( 50, 50, 60, 60 );
const geometry = new THREE.BoxGeometry(15, 15, 15, 30, 30, 30);
const material = new THREE.PointsMaterial({
    size: 0.1,
    sizeAttenuation: true,
    color: 0x6b8aad,

});
const cube = new THREE.Points(geometry, material);

// salva posições e normais originais
const originalPositions = geometry.attributes.position.array.slice();
const normals = geometry.attributes.normal.array;

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableZoom = false;
controls.enablePan = false;

// cada ripple guarda o ponto 3D de origem
const ripples: { x: number; y: number; z: number; time: number }[] = [];

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// mesh invisível para raycasting (Points não suporta intersect)
const hitCube = new THREE.Mesh(
    new THREE.BoxGeometry(15, 15, 15),
    new THREE.MeshBasicMaterial({ visible: false })
);
const cubeGroup = new THREE.Group();
cubeGroup.add(cube);
cubeGroup.add(hitCube);
scene.add(cubeGroup);

renderer.domElement.addEventListener('click', (event) => {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(hitCube);

    if (intersects.length > 0) {
        // converte o ponto de world space para local space do cubo
        const localPoint = cube.worldToLocal(intersects[0].point.clone());
        ripples.push({ x: localPoint.x, y: localPoint.y, z: localPoint.z, time: performance.now() / 1000 });
    }
});

function animate() {
    requestAnimationFrame(animate);
    const now = performance.now() / 1000;

    const positions = geometry.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
        const ox = originalPositions[i];
        const oy = originalPositions[i + 1];
        const oz = originalPositions[i + 2];
        const nx = normals[i];
        const ny = normals[i + 1];
        const nz = normals[i + 2];

        let offset = 0;
        for (const ripple of ripples) {
            const dist = Math.sqrt((ox - ripple.x) ** 2 + (oy - ripple.y) ** 2 + (oz - ripple.z) ** 2);
            const age = now - ripple.time;
            const wavePos = age * 8;
            if (dist < wavePos) {
                const amplitude = Math.max(0, 1.0 - age * 0.3);
                offset += Math.sin(dist * 2 - age * 10) * amplitude * Math.exp(-dist * 0.15);
            }
        }
        // desloca o vértice na direção da sua normal
        positions[i] = ox + nx * offset;
        positions[i + 1] = oy + ny * offset;
        positions[i + 2] = oz + nz * offset;
    }
    while (ripples.length > 0 && now - ripples[0].time > 6) {
        ripples.shift();
    }
    geometry.attributes.position.needsUpdate = true;

    cubeGroup.rotation.x += 0.0008;
    cubeGroup.rotation.y += 0.0002;
    cubeGroup.rotation.z += 0.0008;
    controls.update();
    renderer.render(scene, camera);
}

animate()

// Project card mini cubes (fat edges, static)
function makeEdges(geo: THREE.BufferGeometry): LineSegments2 {
    const edges = new THREE.EdgesGeometry(geo);
    const positions = edges.attributes.position.array as Float32Array;
    const lGeo = new LineSegmentsGeometry().setPositions(positions);
    const lMat = new LineMaterial({ color: 0x131b2e, linewidth: 3 });
    lMat.resolution.set(window.innerWidth, window.innerHeight);
    return new LineSegments2(lGeo, lMat);
}

const cardVariants = [
    () => makeEdges(new THREE.BoxGeometry(3, 3, 3)),
    () => makeEdges(new THREE.IcosahedronGeometry(2.2, 0)),
    () => makeEdges(new THREE.DodecahedronGeometry(2.2, 0)),
    () => makeEdges(new THREE.OctahedronGeometry(2.5, 0)),
];

document.querySelectorAll<HTMLCanvasElement>('.project-canvas').forEach((canvas) => {
    const variant = parseInt(canvas.dataset.variant || '0');
    const s = new THREE.Scene();
    const c = new THREE.PerspectiveCamera(50, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
    c.position.z = 7;

    const r = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    r.setClearColor(0x4a7a9e);
    r.setPixelRatio(window.devicePixelRatio);
    r.setSize(canvas.clientWidth, canvas.clientHeight);

    const mesh = cardVariants[variant]();
    mesh.rotation.x = 0.4;
    mesh.rotation.y = 0.6 + variant * 0.5;
    s.add(mesh);

    function animateCard() {
        requestAnimationFrame(animateCard);
        mesh.rotation.y += 0.005;
        r.render(s, c);
    }
    animateCard();
});

// observer logic
// Muda o tema do nav de acordo com a seção visível.
//
// threshold: 0.5 → dispara quando 50% da seção entra/sai da viewport.

const navbar = document.querySelector('nav')!;
const sections = document.querySelectorAll<HTMLElement>('section[data-nav-theme]');

const navObserver = new IntersectionObserver(
    (entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                navbar.dataset.theme = (entry.target as HTMLElement).dataset.navTheme!;
            }
        });
    },
    { threshold: 0.5 }
);

sections.forEach((section) => navObserver.observe(section));

const navToggle = document.querySelector('.nav-toggle')!;
const navLinks = document.querySelector('.nav-links')!;

navToggle.addEventListener('click', () => {
  navLinks.classList.toggle('active');
});

navLinks.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('active');
  });
});

window.addEventListener('resize', () => {
  const canvas = renderer.domElement;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
});

let counter = 1;

document.addEventListener('click', (e) => {
  const card = (e.target as HTMLElement).closest('.project-card');
  if (!card) return;
  console.log("Clicou " + counter + " vezes!");
  counter += 1;
});