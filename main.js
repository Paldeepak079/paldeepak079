import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, model, controls;

function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    // Position camera closer and higher
    camera.position.set(0, 0.5, 2); // Reduced z distance for smaller appearance
    camera.lookAt(0, 0, 0);

    // Renderer setup
    renderer = new THREE.WebGLRenderer({
        canvas: document.querySelector('#model-container'),
        alpha: true,
        antialias: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    // Add focused lighting for the headset
    const spotLight = new THREE.SpotLight(0xffffff, 2);
    spotLight.position.set(0, 2, 2);
    spotLight.angle = Math.PI / 4;
    spotLight.penumbra = 0.1;
    spotLight.decay = 2;
    spotLight.distance = 10;
    spotLight.target.position.set(0, 0, 0);
    scene.add(spotLight);
    scene.add(spotLight.target);

    // Add subtle ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    scene.add(ambientLight);

    // Add rim light for depth
    const rimLight = new THREE.DirectionalLight(0x404040, 1);
    rimLight.position.set(-2, 0, -2);
    scene.add(rimLight);

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.5;
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 2;

    // Load the model with error handling
    const loader = new GLTFLoader();
    loader.load(
        './models/headset/scene.gltf', // Make sure this path matches your file location
        (gltf) => {
            model = gltf.scene;
            
            // Scale down the model
            model.scale.set(0.4, 0.4, 0.4);
            
            // Center the model
            const box = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            model.position.sub(center);
            
            scene.add(model);
            console.log('Model loaded successfully');
        },
        (progress) => {
            console.log('Loading progress:', (progress.loaded / progress.total * 100) + '%');
        },
        (error) => {
            console.error('Error loading model:', error);
        }
    );
}

function animate() {
    requestAnimationFrame(animate);
    
    if (controls) {
        controls.update();
    }
    
    if (model) {
        // Subtle floating motion
        const time = Date.now() * 0.0005;
        model.position.y = Math.sin(time) * 0.05; // Reduced floating amplitude
    }
    
    renderer.render(scene, camera);
}

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Add pointer-events back to the canvas for interaction
document.querySelector('#model-container').style.pointerEvents = 'auto';

function initTextAnimations() {
    const elements = document.querySelectorAll('.name, .pronunciation, .section');
    
    elements.forEach(element => {
        element.addEventListener('mousemove', (e) => {
            const rect = element.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const moveX = (x - centerX) / centerX * 10;
            const moveY = (y - centerY) / centerY * 5;
            
            requestAnimationFrame(() => {
                if (element.classList.contains('name')) {
                    element.style.transform = `translateX(${moveX}px) translateY(${moveY}px) scale(1.05)`;
                } else if (element.classList.contains('pronunciation')) {
                    element.style.transform = `translateX(${-moveX}px) translateY(${moveY}px)`;
                } else if (element.classList.contains('section')) {
                    element.style.transform = `translate(${moveX/2}px, ${moveY/2}px)`;
                }
            });
        });

        element.addEventListener('mouseleave', () => {
            requestAnimationFrame(() => {
                element.style.transform = 'translate(0, 0)';
            });
        });
    });
}

// Optimize the actually button interactions
let isActuallyHovered = false;
let actuallyTimeout;

function handleActuallyInteraction() {
    const actuallyButton = document.querySelector('.actually-button');
    const actuallyContent = document.querySelector('.actually-content');
    const overlay = document.querySelector('.overlay');

    actuallyButton.addEventListener('mouseenter', () => {
        isActuallyHovered = true;
        clearTimeout(actuallyTimeout);
        
        requestAnimationFrame(() => {
            actuallyContent.classList.add('active');
            overlay.classList.add('active');
        });
    });

    actuallyButton.addEventListener('mouseleave', () => {
        isActuallyHovered = false;
        
        // Add a small delay before hiding to prevent flickering
        actuallyTimeout = setTimeout(() => {
            if (!isActuallyHovered) {
                requestAnimationFrame(() => {
                    actuallyContent.classList.remove('active');
                    overlay.classList.remove('active');
                });
            }
        }, 50);
    });
}

// Initialize everything
document.addEventListener('DOMContentLoaded', () => {
    init();
    initTextAnimations();
    handleActuallyInteraction();
    animate();
}); 