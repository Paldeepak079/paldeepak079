import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { GLTFLoader } from 'https://unpkg.com/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js';

class IDCard {
    constructor() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    init() {
        let container = document.getElementById('model-container');
        if (!container) {
            container = document.createElement('canvas');
            container.id = 'model-container';
            document.body.appendChild(container);
        }

        container.style.position = 'fixed';
        container.style.top = '0';
        container.style.left = '0';
        container.style.width = '100%';
        container.style.height = '100%';
        container.style.zIndex = '-999';
        container.style.pointerEvents = 'none';
        container.style.cursor = 'default';

        const wrapper = document.createElement('div');
        wrapper.className = 'lanyard-wrapper';
        wrapper.style.pointerEvents = 'none';
        container.parentNode.insertBefore(wrapper, container);
        wrapper.appendChild(container);

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(20, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true, 
            alpha: true,
            canvas: container 
        });
        this.controls = null;
        this.card = null;
        this.isDragging = false;
        this.dragStartPosition = new THREE.Vector2();
        this.dragBounds = {
            x: { min: -25, max: 25 },
            y: { min: -15, max: 15 }
        };

        // Remove all interactive properties
        this.mouse = null;
        this.raycaster = null;
        this.isHovered = false;
        this.isFlipped = false;
        this.isFlipping = false;
        this.dragOffset = null;
        this.lastClickTime = 0;
        this.dragStartTime = 0;
        this.moveThreshold = 0;

        // Add zoom properties
        this.minZoom = 40;
        this.maxZoom = 60;
        this.zoomSpeed = 0.1;

        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.setClearColor(0x000000, 0);

        this.camera.position.set(-6.5, 20, 50);
        this.camera.lookAt(-6, -15, 0);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enabled = false;

        // Enhanced lighting setup
        const ambientLight = new THREE.AmbientLight(0xffffff, Math.PI * 1.5);
        this.scene.add(ambientLight);

        // Main directional light (brighter)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
        directionalLight.position.set(5, 5, 5);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);

        // Additional bright light from front
        const frontLight = new THREE.DirectionalLight(0xffffff, 1.5);
        frontLight.position.set(0, 0, 10);
        this.scene.add(frontLight);

        // Additional bright light from top
        const topLight = new THREE.DirectionalLight(0xffffff, 1.5);
        topLight.position.set(0, 10, 0);
        this.scene.add(topLight);

        // Back light (slightly increased)
        const backLight = new THREE.DirectionalLight(0xffffff, 0.8);
        backLight.position.set(-5, 5, -5);
        this.scene.add(backLight);

        // Set card position
        this.cardPoint = new THREE.Vector3(-19, -3, -20);

        // Create lanyard points
        this.lanyardPoints = [];
        const numPoints = 20;
        for (let i = 0; i < numPoints; i++) {
            this.lanyardPoints.push(new THREE.Vector3(0, 0, 0));
        }

        // Create lanyard curve
        this.lanyardCurve = new THREE.CatmullRomCurve3(this.lanyardPoints);
        
        // Load lanyard texture
        const textureLoader = new THREE.TextureLoader();
        const lanyardTexture = textureLoader.load('../models/lanyard.png');
        lanyardTexture.wrapS = THREE.RepeatWrapping;
        lanyardTexture.wrapT = THREE.RepeatWrapping;
        lanyardTexture.repeat.set(1, 1);

        // Create lanyard material
        this.lanyardMaterial = new THREE.MeshStandardMaterial({
            map: lanyardTexture,
            transparent: true,
            opacity: 0.9,
            metalness: 0.1,
            roughness: 0.8
        });

        // Create lanyard geometry
        const lanyardGeometry = new THREE.TubeGeometry(this.lanyardCurve, numPoints - 1, 0.1, 8, false);
        this.lanyard = new THREE.Mesh(lanyardGeometry, this.lanyardMaterial);
        this.scene.add(this.lanyard);

        // Load model
        const loader = new GLTFLoader();
        const modelPath = '../models/card/card.glb';
        console.log('Loading model from:', modelPath);
        
        loader.load(modelPath, 
            (gltf) => {
                console.log('Model loaded successfully');
                this.card = gltf.scene;
                this.card.scale.set(7, 7, 7);
                this.card.position.copy(this.cardPoint);
                this.card.rotation.set(0, 0, 0);
                this.scene.add(this.card);
                
                this.card.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                        child.material.transparent = false;
                        child.material.opacity = 1;
                        child.material.metalness = 0.1;
                        child.material.roughness = 0.5;
                    }
                });

                // Add initial 360 rotation
                this.initialRotation = true;
                this.rotationStartTime = Date.now();
                this.initialRotationDuration = 1500; // Increased to 1.5 seconds for smoother effect

                // Mouse events for dragging
                document.addEventListener('mousedown', (e) => {
                    if (!this.initialRotation) {  // Only allow dragging after initial rotation
                        this.isDragging = true;
                        this.dragStartPosition.set(
                            (e.clientX / window.innerWidth) * 2 - 1,
                            -(e.clientY / window.innerHeight) * 2 + 1
                        );
                    }
                });

                document.addEventListener('mousemove', (e) => {
                    if (this.isDragging && !this.isFlipping) {
                        const x = (e.clientX / window.innerWidth) * 2 - 1;
                        const y = -(e.clientY / window.innerHeight) * 2 + 1;
                        
                        const deltaX = (x - this.dragStartPosition.x) * 20;
                        const deltaY = (y - this.dragStartPosition.y) * 20;
                        
                        const newX = THREE.MathUtils.clamp(
                            this.cardPoint.x + deltaX,
                            this.dragBounds.x.min,
                            this.dragBounds.x.max
                        );
                        const newY = THREE.MathUtils.clamp(
                            this.cardPoint.y + deltaY,
                            this.dragBounds.y.min,
                            this.dragBounds.y.max
                        );
                        
                        this.cardPoint.set(newX, newY, this.cardPoint.z);
                        this.dragStartPosition.set(x, y);
                    }
                });

                document.addEventListener('mouseup', () => {
                    this.isDragging = false;
                });

                // Click event for flipping (now checks if it's a quick click)
                let clickStartTime = 0;
                document.addEventListener('mousedown', () => {
                    clickStartTime = Date.now();
                });

                document.addEventListener('mouseup', () => {
                    const clickDuration = Date.now() - clickStartTime;
                    if (clickDuration < 200 && !this.isFlipping) {  // If it's a quick click
                        this.isFlipping = true;
                        this.flipCard();
                    }
                });

                // Existing wheel event for zooming
                document.addEventListener('wheel', (event) => {
                    event.preventDefault();
                    
                    const zoomDelta = event.deltaY * this.zoomSpeed;
                    const currentDistance = this.camera.position.distanceTo(this.cardPoint);
                    const newDistance = THREE.MathUtils.clamp(
                        currentDistance + zoomDelta,
                        this.minZoom,
                        this.maxZoom
                    );
                    
                    const zoomRatio = newDistance / currentDistance;
                    const newCameraPosition = this.camera.position.clone()
                        .sub(this.cardPoint)
                        .multiplyScalar(zoomRatio)
                        .add(this.cardPoint);
                    
                    this.camera.position.copy(newCameraPosition);
                    this.camera.updateProjectionMatrix();
                });
            },
            (xhr) => {
                console.log((xhr.loaded / xhr.total * 100) + '% loaded');
            },
            (error) => {
                console.error('Error loading model:', error);
                console.error('Model path:', modelPath);
            }
        );

        // Only keep window resize event listener
        window.addEventListener('resize', this.onWindowResize.bind(this));

        this.animate();
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));
        
        if (this.card) {
            // Handle initial rotation
            if (this.initialRotation) {
                const elapsed = Date.now() - this.rotationStartTime;
                if (elapsed < this.initialRotationDuration) {
                    // Use easing function for smoother animation
                    const progress = elapsed / this.initialRotationDuration;
                    const easedProgress = this.easeInOutCubic(progress);
                    this.card.rotation.y = easedProgress * Math.PI * 2;
                } else {
                    this.initialRotation = false;
                    this.card.rotation.y = 0;
                }
            }

            // Update card position
            this.card.position.copy(this.cardPoint);
            
            if (this.lanyard) {
                // Update lanyard points
                this.lanyardPoints[0].set(
                    this.card.position.x,
                    this.card.position.y + 2,
                    this.card.position.z
                );
                
                for (let i = 1; i < this.lanyardPoints.length; i++) {
                    const t = i / (this.lanyardPoints.length - 1);
                    const y = this.lanyardPoints[0].y + (i * 0.5);
                    const x = this.card.position.x + Math.sin(t * Math.PI) * 0.5;
                    this.lanyardPoints[i].set(x, y, this.card.position.z);
                }

                this.lanyardCurve.points = this.lanyardPoints;
                this.lanyard.geometry.dispose();
                this.lanyard.geometry = new THREE.TubeGeometry(
                    this.lanyardCurve,
                    this.lanyardPoints.length - 1,
                    0.1,
                    8,
                    false
                );
                this.lanyard.geometry.computeBoundingSphere();
            }
        }
        
        this.renderer.render(this.scene, this.camera);
    }

    flipCard() {
        const targetRotation = this.isFlipped ? 0 : Math.PI;
        const currentRotation = this.card.rotation.y;
        const rotationDiff = targetRotation - currentRotation;
        
        // Store original position
        const originalPosition = this.card.position.clone();
        
        if (Math.abs(rotationDiff) < 0.05) {
            this.card.rotation.y = targetRotation;
            this.isFlipped = !this.isFlipped;
            this.isFlipping = false;
            this.card.position.copy(originalPosition);
            return;
        }

        // Smooth flip animation
        const flipEase = 0.08;
        this.card.rotation.y += rotationDiff * flipEase;
        this.card.position.copy(originalPosition);
        
        requestAnimationFrame(() => this.flipCard());
    }

    // Add easing function for smooth animation
    easeInOutCubic(t) {
        return t < 0.5
            ? 4 * t * t * t
            : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
}

// Initialize the ID card
new IDCard();