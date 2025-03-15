import * as THREE from 'three';
import { GLTFLoader } from './GLTFLoader.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Load the headset model
const loader = new GLTFLoader();
loader.load('models/headset/scene.gltf', (gltf) => {
    scene.add(gltf.scene);
    gltf.scene.position.set(0, -1, -5); // Adjust position as needed
}, undefined, (error) => {
    console.error(error);
});

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
animate();
