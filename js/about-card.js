import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

class IDCardModel {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.controls = null;
        this.model = null;
        this.isDragging = false;
        this.init();
    }

    init() {
        // Setup renderer
        this.renderer.setSize(400, 400);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.outputEncoding = THREE.sRGBEncoding;

        // Create container
        const container = document.getElementById('id-card-container');
        if (!container) {
            console.error('Container element not found');
            return;
        }
        container.style.width = '400px';
        container.style.height = '400px';
        container.style.position = 'relative';
        container.appendChild(this.renderer.domElement);

        // Setup camera
        this.camera.position.set(0, 0, 5);
        this.camera.lookAt(0, 0, 0);

        // Setup controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.enableZoom = true;
        this.controls.minDistance = 3;
        this.controls.maxDistance = 8;

        // Add lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(5, 5, 5);
        this.scene.add(directionalLight);

        // Load model
        const loader = new GLTFLoader();
        loader.load('../models/card/idcard.glb', 
            (gltf) => {
                console.log('Model loaded successfully');
                this.model = gltf.scene;
                this.model.scale.set(1, 1, 1);
                this.scene.add(this.model);
            },
            (xhr) => {
                console.log((xhr.loaded / xhr.total * 100) + '% loaded');
            },
            (error) => {
                console.error('Error loading model:', error);
            }
        );

        // Add mouse interaction
        this.renderer.domElement.addEventListener('mousedown', () => {
            this.isDragging = true;
            this.renderer.domElement.style.cursor = 'grabbing';
        });

        this.renderer.domElement.addEventListener('mousemove', (event) => {
            if (this.isDragging && this.model) {
                const movementX = event.movementX * 0.005;
                const movementY = event.movementY * 0.005;
                this.model.rotation.y += movementX;
                this.model.rotation.x += movementY;
            }
        });

        this.renderer.domElement.addEventListener('mouseup', () => {
            this.isDragging = false;
            this.renderer.domElement.style.cursor = 'grab';
        });

        this.renderer.domElement.addEventListener('mouseleave', () => {
            this.isDragging = false;
            this.renderer.domElement.style.cursor = 'grab';
        });

        // Start animation loop
        this.animate();
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));

        if (this.model && !this.isDragging) {
            // Add gentle floating animation
            const time = Date.now() * 0.001;
            this.model.rotation.y = Math.sin(time) * 0.1;
        }

        if (this.controls) {
            this.controls.update();
        }

        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize the model
document.addEventListener('DOMContentLoaded', () => {
    new IDCardModel();
});