/* eslint-disable react/no-unknown-property */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

class Lanyard {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(20, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.controls = null;
        this.card = null;
        this.lanyard = null;
        this.dragging = false;
        this.init();
    }

    init() {
        // Setup renderer
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        document.getElementById('lanyard-container').appendChild(this.renderer.domElement);

        // Setup camera
        this.camera.position.set(0, 0, 30);
        this.camera.lookAt(0, 0, 0);

        // Setup controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;

        // Add lights
        const ambientLight = new THREE.AmbientLight(0xffffff, Math.PI);
        this.scene.add(ambientLight);

        // Add environment lighting
        const envLight1 = new THREE.DirectionalLight(0xffffff, 2);
        envLight1.position.set(0, -1, 5);
        this.scene.add(envLight1);

        const envLight2 = new THREE.DirectionalLight(0xffffff, 3);
        envLight2.position.set(-1, -1, 1);
        this.scene.add(envLight2);

        const envLight3 = new THREE.DirectionalLight(0xffffff, 3);
        envLight3.position.set(1, 1, 1);
        this.scene.add(envLight3);

        // Create card and lanyard
        this.createCard();
        this.createLanyard();

        // Handle window resize
        window.addEventListener('resize', this.onWindowResize.bind(this));

        // Add interaction events
        this.renderer.domElement.addEventListener('mousedown', this.onMouseDown.bind(this));
        this.renderer.domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
        this.renderer.domElement.addEventListener('mouseup', this.onMouseUp.bind(this));

        // Start animation loop
        this.animate();
    }

    createCard() {
        const geometry = new THREE.PlaneGeometry(1.6, 2.25); // ID card dimensions
        const material = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            metalness: 0.8,
            roughness: 0.9,
            clearcoat: 1,
            clearcoatRoughness: 0.15
        });

        this.card = new THREE.Mesh(geometry, material);
        this.card.position.set(2, 0, 0);
        this.scene.add(this.card);
    }

    createLanyard() {
        const points = [];
        const curve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(0, 4, 0),
            new THREE.Vector3(0.5, 3, 0),
            new THREE.Vector3(1, 2, 0),
            new THREE.Vector3(1.5, 1, 0),
            new THREE.Vector3(2, 0, 0)
        ]);

        const geometry = new THREE.TubeGeometry(curve, 32, 0.02, 8, false);
        const material = new THREE.MeshStandardMaterial({
            color: 0x2196f3,
            metalness: 0.3,
            roughness: 0.7
        });

        this.lanyard = new THREE.Mesh(geometry, material);
        this.scene.add(this.lanyard);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    onMouseDown(event) {
        const mouse = new THREE.Vector2(
            (event.clientX / window.innerWidth) * 2 - 1,
            -(event.clientY / window.innerHeight) * 2 + 1
        );

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, this.camera);

        const intersects = raycaster.intersectObject(this.card);
        if (intersects.length > 0) {
            this.dragging = true;
            document.body.style.cursor = 'grabbing';
        }
    }

    onMouseMove(event) {
        if (this.dragging) {
            const mouse = new THREE.Vector2(
                (event.clientX / window.innerWidth) * 2 - 1,
                -(event.clientY / window.innerHeight) * 2 + 1
            );

            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(mouse, this.camera);

            const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1));
            const point = new THREE.Vector3();
            raycaster.ray.intersectPlane(plane, point);

            this.card.position.copy(point);
            this.updateLanyard();
        }
    }

    onMouseUp() {
        this.dragging = false;
        document.body.style.cursor = 'auto';
    }

    updateLanyard() {
        const curve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(0, 4, 0),
            new THREE.Vector3(0.5, 3, 0),
            new THREE.Vector3(1, 2, 0),
            new THREE.Vector3(this.card.position.x * 0.5, this.card.position.y * 0.5, 0),
            this.card.position
        ]);

        const geometry = new THREE.TubeGeometry(curve, 32, 0.02, 8, false);
        this.lanyard.geometry.dispose();
        this.lanyard.geometry = geometry;
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));

        if (this.card && !this.dragging) {
            // Add gentle swaying motion
            const time = Date.now() * 0.001;
            this.card.position.y += Math.sin(time) * 0.001;
            this.card.rotation.y += 0.001;
            this.updateLanyard();
        }

        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new Lanyard();
});