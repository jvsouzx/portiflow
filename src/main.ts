import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// A cena (scene) é como um container que armazena objetos, câmeras e iluminaçõa
const scene = new THREE.Scene();

// A camera é o que permite visulizar o conteúdo das cenas, o three.js tem várias cameras 
// o mais comum é utilizar a perpective camera que simula o comportamento do olhar humano
const camera = new THREE.PerspectiveCamera(80, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer({
    canvas: document.querySelector<HTMLCanvasElement>('#background')!,
});

renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
camera.position.setZ(30);

renderer.render(scene, camera);

// const gridHelper = new THREE.GridHelper(200, 50)
// scene.add(gridHelper)

// creating a object
// const geometry = new THREE.PlaneGeometry( 50, 50, 60, 60 );
const geometry = new THREE.BoxGeometry( 15, 15, 15, 30, 30, 30 );
const material = new THREE.PointsMaterial({
        size: 0.02,
        sizeAttenuation: true
    });
const cube = new THREE.Points( geometry, material );
scene.add( cube );

// salva posições e normais originais
const originalPositions = geometry.attributes.position.array.slice();
const normals = geometry.attributes.normal.array;

const controls = new OrbitControls(camera, renderer.domElement);

// cada ripple guarda o ponto 3D de origem
const ripples: { x: number; y: number; z: number; time: number }[] = [];

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// mesh invisível para raycasting (Points não suporta intersect)
const hitCube = new THREE.Mesh(
    new THREE.BoxGeometry(15, 15, 15),
    new THREE.MeshBasicMaterial({ visible: false })
);
scene.add(hitCube);

renderer.domElement.addEventListener('click', (event) => {
    // normalização das coordenadas do mouse
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

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

    cube.rotation.x += 0.0008;
    cube.rotation.y += 0.0002;
    cube.rotation.z += 0.0008;
    hitCube.rotation.x +=0.0008;
    hitCube.rotation.y +=0.0002; 
    hitCube.rotation.z +=0.0008;
    controls.update();
    renderer.render(scene, camera);
}

animate()