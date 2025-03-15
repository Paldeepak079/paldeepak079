import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, model, controls;
let isInitialAnimationComplete = false;
let initialAnimationStartTime = null;
const INITIAL_ANIMATION_DURATION = 5000; // 5 seconds for more dramatic effect
let isInitialized = false;

function init() {
    if (isInitialized) {
        console.log('Already initialized, skipping...');
        return;
    }
    
    console.log('Initializing 3D scene...');
    isInitialized = true;

    // Scene setup
    scene = new THREE.Scene();
    scene.background = null;

    // Camera setup
    camera = new THREE.PerspectiveCamera(25, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, -4, 0.3); // Moved closer on z-axis

    // Renderer setup
    const canvas = document.querySelector('#model-container');
    if (!canvas) {
        console.error('Canvas not found!');
        return;
    }

    renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;

    // Remove existing lights
    scene.remove(...scene.children.filter(child => child instanceof THREE.Light));

    // Update lighting setup for better material visibility
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7); // Increased slightly
    scene.add(ambientLight);

    // Update model loading section
    const mainLight = new THREE.DirectionalLight(0xffffff, 2.0); // Increased intensity
    mainLight.position.set(1, 1, 2); // Adjusted position for better material highlights
    scene.add(mainLight);

    // Subtle fill light from the back
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(0, -1, -1);
    scene.add(fillLight);

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = true;
    controls.enablePan = false;
    controls.enableRotate = true;
    controls.autoRotate = false;

    // Remove rotation constraints to allow full rotation
    controls.minPolarAngle = 0; // Allow full vertical rotation
    controls.maxPolarAngle = Math.PI; // Allow full vertical rotation

    // Set only zoom limits
    controls.minDistance = 0.2;
    controls.maxDistance = 1.0;

    // Make canvas interactive
    canvas.style.pointerEvents = 'auto'; // Enable mouse events

    // Add event listeners here where we have canvas
    canvas.addEventListener('mouseenter', () => {
        controls.enabled = true;
    });

    canvas.addEventListener('mouseleave', () => {
        controls.enabled = true;
    });

    canvas.addEventListener('mousedown', () => {
        canvas.style.cursor = 'grabbing';
    });

    canvas.addEventListener('mouseup', () => {
        canvas.style.cursor = 'grab';
    });

    // Update the model loading section
    if (model) {
        scene.remove(model);
        model.traverse((child) => {
            if (child.isMesh) {
                child.geometry.dispose();
                child.material.dispose();
            }
        });
    }

    const loader = new GLTFLoader();
    console.log('Loading model...');

    loader.load(
        '../models/headset/scene.gltf',
        (gltf) => {
            if (model) {
                scene.remove(model); // Remove any existing model
            }
            console.log('Model loaded successfully!');
            model = gltf.scene;
            
            // Adjust scale and position
            model.scale.set(0.0002, 0.0002, 0.0002);
            model.position.set(0, -4, -0.1);
            
            scene.add(model);
            
            // Enhance materials
            model.traverse((child) => {
                if (child.isMesh) {
                    child.material.envMapIntensity = 1.5;
                    child.material.roughness = 0.4;
                    child.material.metalness = 0.8;
                    child.material.needsUpdate = true;
                }
            });

            // Set initial camera position for animation
            camera.position.set(0, -4, 2); // Start further back
            camera.lookAt(model.position);
            controls.target.copy(model.position);
            
            // Start animation with timestamp
            requestAnimationFrame(animate);
        },
        (progress) => {
            const percent = (progress.loaded / progress.total * 100);
            console.log(`Loading progress: ${percent.toFixed(2)}%`);
        },
        (error) => {
            console.error('Error loading model:', error);
        }
    );
}

function performInitialCameraAnimation(currentTime) {
    if (!initialAnimationStartTime) {
        initialAnimationStartTime = currentTime;
    }

    const elapsedTime = currentTime - initialAnimationStartTime;
    const progress = Math.min(elapsedTime / INITIAL_ANIMATION_DURATION, 1);
    
    // Disable controls during animation
    controls.enabled = false;

    // More dramatic camera movement
    const angle = progress * Math.PI * 4; // Two full rotations
    const radius = 2 * (1 - progress) + 0.3; // Start wide, end closer
    const heightOffset = Math.sin(progress * Math.PI * 2) * 0.5; // Up and down movement

    // Spiral camera movement
    camera.position.x = Math.cos(angle) * radius;
    camera.position.z = Math.sin(angle) * radius + 0.3;
    camera.position.y = -4 + heightOffset;

    // Model animation during camera movement
    if (model) {
        // Rotate model during initial animation
        model.rotation.y = angle * 0.5;
        
        // Add some tilt
        model.rotation.z = Math.sin(progress * Math.PI) * 0.2;
        
        // Scale pulse effect
        const scale = 0.0002 * (1 + Math.sin(progress * Math.PI * 4) * 0.1);
        model.scale.set(scale, scale, scale);
    }

    // Always look at the model
    camera.lookAt(model.position);
    controls.target.copy(model.position);

    // Smooth transition at the end
    if (progress > 0.9) {
        const endProgress = (progress - 0.9) / 0.1;
        camera.position.lerp(new THREE.Vector3(0, -4, 0.3), endProgress);
        if (model) {
            model.rotation.z = model.rotation.z * (1 - endProgress);
            model.scale.lerp(new THREE.Vector3(0.0002, 0.0002, 0.0002), endProgress);
        }
    }

    if (progress >= 1) {
        isInitialAnimationComplete = true;
        controls.enabled = true;
        if (model) {
            model.rotation.z = 0;
            model.scale.set(0.0002, 0.0002, 0.0002);
        }
    }
}

function animate(currentTime) {
    requestAnimationFrame(animate);

    if (model && !isInitialAnimationComplete) {
        performInitialCameraAnimation(currentTime);
    } else if (model) {
        const time = Date.now() * 0.0001;
        // Gentle floating animation after initial animation
        model.position.y = -4 + Math.sin(time) * 0.001;
        // Subtle continuous rotation
        model.rotation.y += 0.001;
    }

    controls.update();
    renderer.render(scene, camera);
}

// Handle window resize
window.addEventListener('resize', () => {
    if (camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
});

// Initialize everything
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, starting initialization...');
    init();
    initActuallyButton();
});

// Remove or comment out these exports as they might cause issues
// window.scene = scene;
// window.camera = camera;
// window.model = model;

function initActuallyButton() {
    const actuallyButton = document.querySelector('.actually-button');
    const actuallyContent = document.querySelector('.actually-content');
    const overlay = document.querySelector('.overlay');

    actuallyButton.addEventListener('mouseenter', () => {
        actuallyContent.classList.add('active');
        overlay.classList.add('active');
    });

    actuallyButton.addEventListener('mouseleave', () => {
        actuallyContent.classList.remove('active');
        overlay.classList.remove('active');
    });
} 