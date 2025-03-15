import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

document.addEventListener('DOMContentLoaded', () => {
    const puzzleGrid = document.querySelector('.puzzle-grid');
    const loadingIndicator = document.querySelector('.loading');
    const GRID = { ROWS: 2, COLS: 3 };
    let tiles = [];
    let selectedTile = null;
    let imageLoaded = false;
    let isAnimating = false;
    let startTime = 0;
    let hintShown = false;
    let projectListContainer; // Add global variable

    let scene, camera, renderer, model;

    function init3DScene() {
        try {
            scene = new THREE.Scene();
            camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
            renderer = new THREE.WebGLRenderer({ 
                alpha: true,
                antialias: true,
                powerPreference: "high-performance"
            });
            
            // Create a new container for 3D content
            const modelContainer = document.createElement('div');
            modelContainer.id = 'model-container';
            document.body.appendChild(modelContainer);
            
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.domElement.style.position = 'fixed';
            renderer.domElement.style.top = '0';
            renderer.domElement.style.left = '0';
            renderer.domElement.style.zIndex = '1000';
            modelContainer.appendChild(renderer.domElement);

            // Enhanced lighting
            const light = new THREE.DirectionalLight(0xffffff, 1.0);
            light.position.set(2, 2, 2);
            scene.add(light);
            scene.add(new THREE.AmbientLight(0x404040));

            camera.position.set(0, 1.5, 3);
            camera.lookAt(0, 0.5, 0);
        } catch (error) {
            console.error('3D initialization failed:', error);
        }
    }

    function loadModel() {
        const loader = new GLTFLoader();
        loader.load(
            '../models/cycle/cycleprj.glb',
            (gltf) => {
                model = gltf.scene;
                model.scale.set(1.2, 1.2, 1.2);
                model.position.set(0.3, -0.8, 0);
                scene.add(model);
                
                // Add keyboard controls
                document.addEventListener('keydown', (e) => {
                    if (e.key === 'ArrowLeft') {
                        model.position.x -= 0.1;
                    } else if (e.key === 'ArrowRight') {
                        model.position.x += 0.1;
                    }
                });
            },
            undefined,
            (error) => console.error('Model loading error:', error)
        );
    }

    function animate() {
        requestAnimationFrame(animate);
        renderer.render(scene, camera);
    }

    function createPuzzle() {
        const img = new Image();
        img.src = '../assets/hkhp.jpg';
        img.onload = () => {
            imageLoaded = true;
            if (loadingIndicator) {
                loadingIndicator.style.display = 'none';
            }
            initializeTiles(img);
            setTimeout(shuffleTiles, 500);
        };
        img.onerror = () => {
            console.error('Failed to load puzzle image');
            if (loadingIndicator) {
                loadingIndicator.textContent = 'Failed to load puzzle';
            }
        };
    }

    function initializeTiles(img) {
        puzzleGrid.innerHTML = '';
        tiles = [];
        
        // Calculate exact tile dimensions
        const tileWidth = 100 / GRID.COLS;  // 33.33% for 3 columns
        const tileHeight = 100 / GRID.ROWS; // 50% for 2 rows

        // Create tiles with precise background positioning
        for (let row = 0; row < GRID.ROWS; row++) {
            for (let col = 0; col < GRID.COLS; col++) {
                const tile = document.createElement('div');
                tile.className = 'puzzle-tile';
                
                // Calculate background position percentages
                const xPos = col * (100 / (GRID.COLS - 1)); // 0%, 50%, 100%
                const yPos = row * (100 / (GRID.ROWS - 1)); // 0%, 100%
                
                tile.style.backgroundImage = `url(${img.src})`;
                tile.style.backgroundSize = `${GRID.COLS * 100}% ${GRID.ROWS * 100}%`;
                tile.style.backgroundPosition = `${xPos}% ${yPos}%`;
                
                // Store original positions
                tile.dataset.originalIndex = row * GRID.COLS + col;
                tile.dataset.currentIndex = row * GRID.COLS + col;
                
                // Add interaction handlers
                tile.addEventListener('click', handleTileClick);
                tile.addEventListener('dragstart', handleDragStart);
                tile.addEventListener('dragover', handleDragOver);
                tile.addEventListener('drop', handleDrop);
                tile.addEventListener('dragend', handleDragEnd);
                
                puzzleGrid.appendChild(tile);
                tiles.push(tile);
            }
        }
    }

    // Click handling
    function handleTileClick(e) {
        if (!imageLoaded || isAnimating) return;
        
        const clickedTile = e.target;
        if (selectedTile === null) {
            selectedTile = clickedTile;
            selectedTile.classList.add('selected');
        } else {
            selectedTile.classList.remove('selected');
            if (selectedTile !== clickedTile) {
                swapTiles(selectedTile, clickedTile);
                setTimeout(() => checkWin(), 300);
            }
            selectedTile = null;
        }
        checkWin();
    }

    function handleDragStart(e) {
        if (isAnimating) {
            e.preventDefault();
            return;
        }
        e.dataTransfer.setData('text/plain', e.target.dataset.currentIndex);
        e.target.classList.add('dragging');
    }

    function handleDragEnd(e) {
        e.target.classList.remove('dragging');
    }

    function handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }

    function handleDrop(e) {
        e.preventDefault();
        const draggedIndex = e.dataTransfer.getData('text/plain');
        const targetIndex = e.target.dataset.currentIndex;
        
        const draggedTile = tiles.find(t => t.dataset.currentIndex === draggedIndex);
        const targetTile = tiles.find(t => t.dataset.currentIndex === targetIndex);
        
        if (draggedTile && targetTile) {
            swapTiles(draggedTile, targetTile);
        }
    }

    function swapTiles(tile1, tile2) {
        // Swap current indices
        const temp = tile1.dataset.currentIndex;
        tile1.dataset.currentIndex = tile2.dataset.currentIndex;
        tile2.dataset.currentIndex = temp;
        
        // Swap DOM positions
        const tempDiv = document.createElement('div');
        tile1.parentNode.insertBefore(tempDiv, tile2);
        tile1.parentNode.insertBefore(tile2, tile1);
        tempDiv.parentNode.insertBefore(tile1, tempDiv);
        tempDiv.remove();
        
        checkWin();
    }

    function shuffleTiles() {
        if (!imageLoaded) return;
        isAnimating = true;
        
        // Create new array of tile elements in DOM order
        tiles = Array.from(puzzleGrid.children).filter(el => el.classList.contains('puzzle-tile'));
        
        let shuffleCount = 50;
        const shuffle = () => {
            if (shuffleCount <= 0) {
                setTimeout(() => {
                    isAnimating = false;
                    if (checkWin()) shuffleTiles();
                }, 300);
                return;
            }

            const idx1 = Math.floor(Math.random() * tiles.length);
            const idx2 = Math.floor(Math.random() * tiles.length);
            
            if (idx1 !== idx2) {
                const tile1 = tiles[idx1];
                const tile2 = tiles[idx2];
                
                // Add null checks for parent nodes
                if (tile1.parentNode && tile2.parentNode) {
                    // Swap current indices
                    const tempIndex = tile1.dataset.currentIndex;
                    tile1.dataset.currentIndex = tile2.dataset.currentIndex;
                    tile2.dataset.currentIndex = tempIndex;
                    
                    // Swap DOM positions
                    const temp = document.createElement('div');
                    try {
                        tile2.parentNode.insertBefore(temp, tile2);
                        tile1.parentNode.insertBefore(tile2, tile1);
                        temp.parentNode.insertBefore(tile1, temp);
                        temp.parentNode.removeChild(temp);
                    } catch (error) {
                        console.error('DOM manipulation error:', error);
                    }

                    // Update tiles array after swap
                    tiles = Array.from(puzzleGrid.children)
                               .filter(el => el.classList.contains('puzzle-tile'));
                }

                shuffleCount--;
                requestAnimationFrame(shuffle);
            } else {
                shuffle();
            }
        };
        
        shuffle();
        startTime = 0;
        hintShown = false;
    }

    // Add keyboard event listener
    document.addEventListener('keydown', (e) => {
        if (e.key.toLowerCase() === 's') solvePuzzle();
    });

    function solvePuzzle() {
        // Align current indices with original positions
        tiles.forEach(tile => {
            tile.dataset.currentIndex = tile.dataset.originalIndex;
        });
        
        // Trigger win animation
        checkWin();
    }

    // Modified animation function
    function triggerSuccessAnimation(hideAfter = false) {
        // Force redraw before animation
        tiles.forEach(tile => {
            tile.style.transform = 'translate(0, 0)';
            void tile.offsetHeight;
        });

        // Animation properties
        tiles.forEach(tile => {
            tile.style.transition = 'all 1s cubic-bezier(0.68, -0.55, 0.27, 1.55)';
            tile.style.opacity = '0';
            tile.style.transform = 'scale(0) rotate(720deg)';
            tile.style.border = '2px solid #00ff00 !important';
        });

        // Restore after animation
        setTimeout(() => {
            if (!hideAfter) {
                tiles.forEach(tile => {
                    tile.style.transition = 'none';
                    tile.style.opacity = '1';
                    tile.style.transform = 'scale(1) rotate(0deg)';
                });
                shuffleTiles();
            }
        }, 1000);
    }

    // Update checkWin call
    function checkWin() {
        if (!imageLoaded) return false;
        
        let isWin = true;
        tiles.forEach((tile, i) => {
            if (parseInt(tile.dataset.currentIndex) !== parseInt(tile.dataset.originalIndex)) {
                isWin = false;
            }
        });
        
        if (isWin) {
            triggerSuccessAnimation(true);
            setTimeout(() => {
                displayProjectWords(); // This will now use our updated function
            }, 2000);
        }
        
        return isWin;
    }

    function showHint() {
        const hint = document.createElement('div');
        hint.className = 'hint-message';
        hint.innerHTML = `
            <p>Stuck? Press <kbd>S</kbd> or double tap to solve!</p>
        `;
        document.querySelector('.puzzle-container').appendChild(hint);
    }

    // Add mobile double-tap support
    let lastTap = 0;
    document.addEventListener('touchend', (e) => {
        const now = Date.now();
        if (now - lastTap < 300) solvePuzzle();
        lastTap = now;
    });

    // Project words to display
    const projectWords = [
        "To-Do List Software",
        "Browser Extension",
        "Gesture-Based Music Control",
        "RFID Attendance System",
        "Automatic Room Lighting & Occupancy Display",
        "Object Detection System with Arduino Uno",
        "PCB Shaker",
        "Mini Drone",
        "FDP",
        "CAD Design",
        "IIT BOMBAY Techfest",
        "IIT PATNA Techfest",
        "Certificates",
        "Blender",
        "Internship",
        "working..."
    ];

    // Map of project words to their URLs or content identifiers
    const projectLinks = {
        "To-Do List Software": "todo-list",
        "Browser Extension": "browser-extension",
        "Gesture-Based Music Control": "gesture-music",
        "RFID Attendance System": "rfid-attendance",
        "Automatic Room Lighting & Occupancy Display": "room-lighting",
        "Object Detection System with Arduino Uno": "object-detection",
        "PCB Shaker": "pcb-shaker",
        "Mini Drone": "mini-drone",
        "FDP": "fdp",
        "CAD Design": "cad-design",
        "IIT BOMBAY Techfest": "iit-bombay",
        "IIT PATNA Techfest": "iit-patna",
        "Certificates": "certificates",
        "Blender": "blender",
        "Internship": "internship",
        "working...": "working"
    };

    // Add project URLs mapping
    const projectUrls = {
        "Object Detection System with Arduino Uno": "https://www.instagram.com/reel/Cwy7DmUNUwf/",
        "RFID Attendance System": "https://www.instagram.com/reel/Cw68nPFtBam/",
        "To-Do List Software": "https://drive.google.com/drive/folders/1CuD2DNfGB0qWM8Lgu1_82MbPTnuEUr2V",
        "Automatic Room Lighting & Occupancy Display": "https://www.instagram.com/reel/CwlFk_7r08X/"
    };

    // Function to display floating project words
    function displayProjectWords() {
        // Hide puzzle container
        const puzzleContainer = document.querySelector('.puzzle-container');
        puzzleContainer.style.display = 'none';
        
        // Create container for floating words
        const floatingContainer = document.createElement('div');
        floatingContainer.className = 'floating-words-container';
        document.body.appendChild(floatingContainer);
        
        // Add CSS for floating words container
        const style = document.createElement('style');
        style.textContent = `
            .floating-words-container {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 10;
                overflow: hidden;
                background: rgba(0, 0, 0, 0.9);
            }
            
            .floating-word {
                position: absolute;
                cursor: pointer;
                padding: 10px 20px;
                background: rgba(0, 0, 0, 0.7);
                color: white;
                border-radius: 50px;
                font-family: 'Poppins', sans-serif;
                font-weight: 500;
                box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
                transition: left 0.2s ease, top 0.2s ease, transform 0.3s ease, box-shadow 0.3s ease;
                user-select: none;
                display: flex;
                align-items: center;
                justify-content: center;
                text-align: center;
                animation: fadeIn 0.5s ease forwards;
                opacity: 0;
                border: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .floating-word:hover {
                background: rgba(50, 50, 50, 0.9);
                box-shadow: 0 8px 25px rgba(0, 0, 0, 0.5);
                transform: scale(1.1);
                z-index: 15;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }
        `;
        document.head.appendChild(style);
        
        // Shuffle the array to randomize the order
        const shuffledWords = [...projectWords].sort(() => Math.random() - 0.5);
        
        // Store positioned words to check for overlaps
        const placedWords = [];
        
        // Create and position each word with collision detection
        shuffledWords.forEach((word, index) => {
            const wordElement = document.createElement('div');
            wordElement.className = 'floating-word';
            wordElement.textContent = word;
            wordElement.dataset.project = projectLinks[word] || '';
            
            // Add to DOM temporarily to get dimensions
            wordElement.style.visibility = 'hidden';
            floatingContainer.appendChild(wordElement);
            
            // Get word dimensions
            const wordWidth = wordElement.offsetWidth;
            const wordHeight = wordElement.offsetHeight;
            
            // Remove from DOM
            floatingContainer.removeChild(wordElement);
            wordElement.style.visibility = 'visible';
            
            // Minimum distance between words (for spacing)
            const minDistance = 70;
            
            // Try to find a position without overlaps (max 20 attempts)
            let validPosition = false;
            let attempts = 0;
            let randomX, randomY;
            
            while (!validPosition && attempts < 20) {
                // Random position within viewport (with padding)
                randomX = Math.random() * (window.innerWidth - wordWidth - 40) + 20;
                randomY = Math.random() * (window.innerHeight - wordHeight - 40) + 20;
                
                // Check if this position overlaps with any placed word
                validPosition = true;
                for (const placed of placedWords) {
                    const dx = randomX - placed.x;
                    const dy = randomY - placed.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    // If too close to another word, reject this position
                    if (distance < minDistance + placed.width/2 + wordWidth/2) {
                        validPosition = false;
                        break;
                    }
                }
                
                attempts++;
            }
            
            // Store this word's position
            placedWords.push({
                x: randomX,
                y: randomY,
                width: wordWidth,
                height: wordHeight
            });
            
            // Set the word's position
            wordElement.style.left = `${randomX}px`;
            wordElement.style.top = `${randomY}px`;
            wordElement.style.animationDelay = `${index * 0.1}s`;
            
            // Add data attributes for original position (for magnetic effect)
            wordElement.dataset.originalX = randomX;
            wordElement.dataset.originalY = randomY;
            
            // Add click event to navigate
            wordElement.addEventListener('click', () => navigateToProject(word));
            
            // Append to container
            floatingContainer.appendChild(wordElement);
        });
        
        // Add mouse move event for magnetic effect
        document.addEventListener('mousemove', handleMagneticEffect);
        console.log('Magnetic effect initialized');
    }

    // Function to handle magnetic effect for floating words
    function handleMagneticEffect(e) {
        const mouseX = e.clientX;
        const mouseY = e.clientY;
        const words = document.querySelectorAll('.floating-word');
        
        words.forEach(word => {
            // Get original position from data attributes
            const originalX = parseFloat(word.dataset.originalX) || 0;
            const originalY = parseFloat(word.dataset.originalY) || 0;
            
            // Get word dimensions and position
            const rect = word.getBoundingClientRect();
            const wordCenterX = rect.left + rect.width / 2;
            const wordCenterY = rect.top + rect.height / 2;
            
            // Calculate distance between mouse and word center
            const distanceX = mouseX - wordCenterX;
            const distanceY = mouseY - wordCenterY;
            const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
            
            // Apply magnetic effect based on distance
            if (distance < 200) { // Attraction zone
                // Stronger pull when closer
                const strength = 60;
                const factor = strength / Math.max(5, distance);
                
                // Calculate movement (stronger pull when closer)
                const moveX = distanceX * factor;
                const moveY = distanceY * factor;
                
                // Apply transform relative to original position
                const newX = originalX + moveX;
                const newY = originalY + moveY;
                
                // Update position with direct style for better performance
                word.style.left = `${newX}px`;
                word.style.top = `${newY}px`;
                word.style.zIndex = '12'; // Bring to front when active
            } 
            else if (distance < 300) { // Repulsion zone
                const repulsionStrength = 20;
                const factor = repulsionStrength / distance;
                
                // Calculate movement (away from mouse)
                const moveX = -distanceX * factor;
                const moveY = -distanceY * factor;
                
                // Apply transform relative to original position
                const newX = originalX + moveX;
                const newY = originalY + moveY;
                
                // Update position
                word.style.left = `${newX}px`;
                word.style.top = `${newY}px`;
                word.style.zIndex = '11'; // Slightly elevated
            } 
            else { // Neutral zone
                // Return to original position
                word.style.left = `${originalX}px`;
                word.style.top = `${originalY}px`;
                word.style.zIndex = '10'; // Default z-index
            }
        });
    }

    // Update the project navigation function
    function navigateToProject(projectName) {
        console.log(`Navigating to project: ${projectName}`);
        
        // Direct handler for To-Do List Software
        if (projectName === "To-Do List Software") {
            window.open("https://drive.google.com/drive/folders/1CuD2DNfGB0qWM8Lgu1_82MbPTnuEUr2V", "_blank");
            return;
        }
        
        // Map specific projects to Instagram URLs
        const instagramProjects = {
            "Object Detection System with Arduino Uno": "https://www.instagram.com/reel/Cwy7DmUNUwf/",
            "RFID Attendance System": "https://www.instagram.com/reel/Cw68nPFtBam/",
            "Automatic Room Lighting & Occupancy Display": "https://www.instagram.com/reel/CwlFk_7r08X/"
        };
        
        // If this is one of the Instagram projects, open the URL
        if (instagramProjects[projectName]) {
            window.open(instagramProjects[projectName], '_blank');
            return; // Exit the function after opening the URL
        }
        
        // Check if project is one of the ones that should not have animation
        const noAnimationProjects = [
            "RFID Attendance System",
            "Object Detection System with Arduino Uno",
            "Automatic Room Lighting & Occupancy Display",
            "To-Do List Software"  // Added this entry
        ];
        
        const skipAnimation = noAnimationProjects.includes(projectName);
        
        // For projects that should open immediately without animation
        if (skipAnimation) {
            // Find the relevant project handling case and modify it to remove animations
            
            // Example for typical project opening:
            const projectContainer = document.createElement('div');
            projectContainer.className = 'project-container';
            
            // Skip the fade-in animation
            projectContainer.style.opacity = '1'; 
            
            // For image galleries, load with no animation delay
            const galleryContainer = document.createElement('div');
            galleryContainer.className = 'gallery-container active'; // Add active immediately
            
            // ...rest of project specific code
            
            // Skip the setTimeout for animation
            // Instead of:
            // setTimeout(() => {
            //     galleryContainer.classList.add('active');
            // }, 50);
            
            // Just add the class immediately or set opacity directly
            galleryContainer.classList.add('active');
            
            return; // Skip the rest of the function after handling these projects
        }
        
        // Special handling for projects with direct URLs
        if (projectUrls[projectName]) {
            const clickedElement = document.querySelector(`.floating-word[data-project="${projectLinks[projectName]}"]`);
            if (!clickedElement) return;
            
            const rect = clickedElement.getBoundingClientRect();
            
            // Create animation container
            const animContainer = document.createElement('div');
            animContainer.className = 'project-link-animation';
            document.body.appendChild(animContainer);
            
            // Add animation styles
            const style = document.createElement('style');
            style.textContent = `
                .project-link-animation {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100vw;
                    height: 100vh;
                    background: rgba(0, 0, 0, 0.9);
                    z-index: 9999;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    opacity: 0;
                    animation: fadeIn 0.5s ease forwards;
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                
                .project-icon {
                    width: 100px;
                    height: 100px;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 50%;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    margin-bottom: 20px;
                    animation: pulse 2s infinite;
                }
                
                @keyframes pulse {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.1); }
                    100% { transform: scale(1); }
                }
                
                .project-icon img {
                    width: 50px;
                    height: 50px;
                    filter: brightness(0) invert(1);
                }
                
                .project-title {
                    color: white;
                    font-size: 24px;
                    margin-bottom: 10px;
                    text-align: center;
                    opacity: 0;
                    transform: translateY(20px);
                    animation: slideUp 0.5s ease forwards 0.3s;
                }
                
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                
                .project-description {
                    color: rgba(255, 255, 255, 0.7);
                    text-align: center;
                    max-width: 400px;
                    margin: 0 auto;
                    opacity: 0;
                    transform: translateY(20px);
                    animation: slideUp 0.5s ease forwards 0.5s;
                }
                
                .loading-bar {
                    width: 200px;
                    height: 4px;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 2px;
                    margin-top: 20px;
                    overflow: hidden;
                    opacity: 0;
                    animation: slideUp 0.5s ease forwards 0.7s;
                }
                
                .loading-progress {
                    width: 0%;
                    height: 100%;
                    background: linear-gradient(90deg, #00ff00, #00ffff);
                    animation: progress 2s ease forwards 1s;
                }
                
                @keyframes progress {
                    from { width: 0%; }
                    to { width: 100%; }
                }
            `;
            document.head.appendChild(style);
            
            // Create content
            const content = document.createElement('div');
            content.style.textAlign = 'center';
            
            // Add icon based on project type
            const icon = document.createElement('div');
            icon.className = 'project-icon';
            const iconImg = document.createElement('img');
            
            if (projectName.includes('Instagram')) {
                iconImg.src = '../assets/instagram-icon.png';
            } else if (projectName.includes('Drive')) {
                iconImg.src = '../assets/drive-icon.png';
            } else {
                iconImg.src = '../assets/link-icon.png';
            }
            
            icon.appendChild(iconImg);
            content.appendChild(icon);
            
            // Add title
            const title = document.createElement('div');
            title.className = 'project-title';
            title.textContent = projectName;
            content.appendChild(title);
            
            // Add description
            const description = document.createElement('div');
            description.className = 'project-description';
            description.textContent = 'Opening project...';
            content.appendChild(description);
            
            // Add loading bar
            const loadingBar = document.createElement('div');
            loadingBar.className = 'loading-bar';
            const progress = document.createElement('div');
            progress.className = 'loading-progress';
            loadingBar.appendChild(progress);
            content.appendChild(loadingBar);
            
            animContainer.appendChild(content);
            
            // Open link after animation
            setTimeout(() => {
                window.open(projectUrls[projectName], '_blank');
                
                // Fade out and remove animation
                animContainer.style.animation = 'fadeOut 0.5s ease forwards';
                setTimeout(() => {
                    if (document.body.contains(animContainer)) {
                        document.body.removeChild(animContainer);
                    }
                }, 500);
            }, 3000);
            
            return;
        }
        
        // Special handling for Internship
        if (projectName === "Internship") {
            // Find the clicked word element to get its position
            const clickedElement = document.querySelector(`.floating-word[data-project="${projectLinks[projectName]}"]`);
            if (!clickedElement) return;
            
            const rect = clickedElement.getBoundingClientRect();
            
            // Create mindmap container
            const mindmapContainer = document.createElement('div');
            mindmapContainer.className = 'mindmap-container';
            document.body.appendChild(mindmapContainer);
            
            // Add CSS for mindmap
            if (!document.querySelector('#mindmap-styles')) {
                const mindmapStyles = document.createElement('style');
                mindmapStyles.id = 'mindmap-styles';
                mindmapStyles.textContent = `
                    .mindmap-container {
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100vw;
                        height: 100vh;
                        background: rgba(0, 0, 0, 0.85);
                        z-index: 1000;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        overflow: hidden;
                    }
                    
                    .mindmap-node {
                        position: absolute;
                        background: rgba(30, 30, 30, 0.8);
                        border: 2px solid rgba(100, 100, 255, 0.5);
                        border-radius: 12px;
                        padding: 12px 24px;
                        color: white;
                        font-family: 'Poppins', sans-serif;
                        font-weight: 500;
                        font-size: 18px;
                        cursor: pointer;
                        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
                        transition: all 0.3s ease;
                        opacity: 0;
                        transform: scale(0.5);
                        text-align: center;
                        min-width: 120px;
                    }
                    
                    .mindmap-node.active {
                        opacity: 1;
                        transform: scale(1);
                    }
                    
                    .mindmap-node:hover {
                        background: rgba(50, 50, 80, 0.9);
                        border-color: rgba(120, 120, 255, 0.8);
                        box-shadow: 0 0 20px rgba(100, 100, 255, 0.4);
                        transform: scale(1.05);
                    }
                    
                    .mindmap-arrow {
                        position: absolute;
                        background: linear-gradient(90deg, rgba(100, 100, 255, 0.2), rgba(100, 100, 255, 0.6));
                        height: 2px;
                        transform-origin: left center;
                        opacity: 0;
                        transition: opacity 0.5s ease;
                        z-index: -1;
                    }
                    
                    .mindmap-arrow:after {
                        content: '';
                        position: absolute;
                        right: 0;
                        top: -3px;
                        width: 0;
                        height: 0;
                        border-left: 8px solid rgba(100, 100, 255, 0.6);
                        border-top: 4px solid transparent;
                        border-bottom: 4px solid transparent;
                    }
                    
                    .mindmap-arrow.active {
                        opacity: 1;
                    }
                    
                    .mindmap-close {
                        position: fixed;
                        top: 20px;
                        right: 20px;
                        width: 40px;
                        height: 40px;
                        border-radius: 50%;
                        background: rgba(30, 30, 30, 0.9);
                        color: white;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        cursor: pointer;
                        font-size: 24px;
                        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
                        z-index: 3000 !important; /* Highest z-index */
                        transition: all 0.3s ease;
                    }
                    
                    .mindmap-close:hover {
                        background: rgba(60, 60, 60, 0.9);
                        transform: scale(1.1);
                    }
                    
                    .gallery-container {
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100vw;
                        height: 100vh;
                        background: rgba(0, 0, 0, 0.95);
                        z-index: 2500;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        opacity: 0;
                        transition: opacity 0.3s ease;
                    }
                    
                    .gallery-container.active {
                        opacity: 1;
                    }
                    
                    .gallery-grid {
                        display: flex;
                        flex-direction: column;
                        gap: 2rem;
                        padding: 2rem;
                        max-width: 90vw;
                        max-height: 90vh;
                        overflow: hidden;
                    }
                    
                    .gallery-row {
                        display: flex;
                        gap: 2rem;
                        animation: scroll 60s linear infinite;
                    }
                    
                    .gallery-row:nth-child(2) {
                        animation-direction: reverse;
                    }
                    
                    @keyframes scroll {
                        0% { transform: translateX(0); }
                        100% { transform: translateX(-100%); }
                    }
                    
                    .gallery-item {
                        width: 300px;
                        height: 200px;
                        object-fit: cover;
                        border-radius: 15px;
                        cursor: pointer;
                        position: relative;
                        transition: transform 0.3s ease, box-shadow 0.3s ease;
                        transform-style: preserve-3d;
                        perspective: 1000px;
                    }
                    
                    .gallery-item::before {
                        content: '';
                        position: absolute;
                        inset: 0;
                        border-radius: 15px;
                        background: radial-gradient(
                            800px circle at var(--mouse-x) var(--mouse-y),
                            rgba(255, 255, 255, 0.1),
                            transparent 40%
                        );
                        opacity: 0;
                        transition: opacity 0.3s ease;
                    }
                    
                    .gallery-item:hover {
                        transform: translateY(-10px) rotateX(10deg) rotateY(10deg);
                        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
                        animation: bounce 0.5s ease;
                    }
                    
                    .gallery-item:hover::before {
                        opacity: 1;
                    }
                    
                    @keyframes bounce {
                        0%, 100% { transform: translateY(-10px); }
                        50% { transform: translateY(-20px); }
                    }
                    
                    .mindmap-close {
                        position: fixed;
                        top: 20px;
                        right: 20px;
                        width: 40px;
                        height: 40px;
                        background: rgba(30, 30, 30, 0.9);
                        color: white;
                        border-radius: 50%;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        cursor: pointer;
                        font-size: 24px;
                        z-index: 3000;
                        transition: background-color 0.3s ease, transform 0.3s ease;
                    }
                    
                    .mindmap-close:hover {
                        background: rgba(50, 50, 50, 0.9);
                        transform: scale(1.1);
                    }
                `;
                document.head.appendChild(mindmapStyles);
            }
            
            // Add close button
            const closeButton = document.createElement('div');
            closeButton.className = 'mindmap-close';
            closeButton.innerHTML = '&times;';
            closeButton.addEventListener('click', () => {
                mindmapContainer.style.opacity = '0';
                setTimeout(() => {
                    if (document.body.contains(mindmapContainer)) {
                        document.body.removeChild(mindmapContainer);
                    }
                    
                    // Clean up any open galleries
                    const galleries = document.querySelectorAll('.gallery-container');
                    galleries.forEach(gallery => {
                        document.body.removeChild(gallery);
                    });
                    
                    // Remove cursor trails
                    const trails = document.querySelectorAll('.cursor-trail');
                    trails.forEach(trail => {
                        document.body.removeChild(trail);
                    });
                }, 500);
            });
            mindmapContainer.appendChild(closeButton);
            
            // Create the mindmap nodes
            const centerX = window.innerWidth / 2;
            const centerY = window.innerHeight / 2;
            
            // Create main node (Internship)
            const mainNode = createMindmapNode('Internship', centerX, centerY);
            mainNode.classList.add('pulse-node');
            mindmapContainer.appendChild(mainNode);
            
            setTimeout(() => {
                mainNode.classList.add('active');
                
                // Create first level nodes
                const onlineNode = createMindmapNode('Online', centerX - 200, centerY - 100);
                const offlineNode = createMindmapNode('Offline', centerX + 200, centerY - 100);
                
                mindmapContainer.appendChild(onlineNode);
                mindmapContainer.appendChild(offlineNode);
                
                // Create arrows connecting to first level
                const arrowToOnline = createArrow(mainNode, onlineNode);
                const arrowToOffline = createArrow(mainNode, offlineNode);
                
                mindmapContainer.appendChild(arrowToOnline);
                mindmapContainer.appendChild(arrowToOffline);
                
                setTimeout(() => {
                    onlineNode.classList.add('active');
                    offlineNode.classList.add('active');
                    arrowToOnline.classList.add('active');
                    arrowToOffline.classList.add('active');
                    
                    // Add click handlers for first level nodes
                    onlineNode.addEventListener('click', () => {
                        // Only create subnodes if they don't exist already
                        if (!document.querySelector('[data-node="codsoft"]')) {
                            // Create second level nodes for Online
                            const codsoftNode = createMindmapNode('CodSoft', centerX - 300, centerY + 70);
                            codsoftNode.dataset.node = 'codsoft';
                            const educatifiedNode = createMindmapNode('Educatified', centerX - 100, centerY + 70);
                            educatifiedNode.dataset.node = 'educatified';
                            
                            mindmapContainer.appendChild(codsoftNode);
                            mindmapContainer.appendChild(educatifiedNode);
                            
                            // Create arrows connecting to second level
                            const arrowToCodesoft = createArrow(onlineNode, codsoftNode);
                            const arrowToEducatified = createArrow(onlineNode, educatifiedNode);
                            
                            mindmapContainer.appendChild(arrowToCodesoft);
                            mindmapContainer.appendChild(arrowToEducatified);
                            
                            setTimeout(() => {
                                codsoftNode.classList.add('active');
                                educatifiedNode.classList.add('active');
                                arrowToCodesoft.classList.add('active');
                                arrowToEducatified.classList.add('active');
                                
                                // Add click handlers for leaf nodes
                                codsoftNode.addEventListener('click', () => {
                                    showGallery('projects/internship/online/codesoft/', 'CodSoft Internship');
                                });
                                
                                educatifiedNode.addEventListener('click', () => {
                                    showGallery('projects/internship/online/educatified/', 'Educatified Internship');
                                });
                            }, 200);
                        }
                    });
                    
                    offlineNode.addEventListener('click', () => {
                        // Only create subnode if it doesn't exist already
                        if (!document.querySelector('[data-node="rai"]')) {
                            // Create second level node for Offline
                            const raiNode = createMindmapNode('Robotics and AI', centerX + 200, centerY + 70);
                            raiNode.dataset.node = 'rai';
                            
                            mindmapContainer.appendChild(raiNode);
                            
                            // Create arrow connecting to second level
                            const arrowToRai = createArrow(offlineNode, raiNode);
                            
                            mindmapContainer.appendChild(arrowToRai);
                            
                            setTimeout(() => {
                                raiNode.classList.add('active');
                                arrowToRai.classList.add('active');
                                
                                // Add click handler for leaf node
                                raiNode.addEventListener('click', () => {
                                    showGallery('projects/internship/offline/RAI/', 'Robotics and AI Internship');
                                });
                            }, 200);
                        }
                    });
                }, 300);
            }, 300);
            
            // Function to create a mindmap node
            function createMindmapNode(text, x, y) {
                const node = document.createElement('div');
                node.className = 'mindmap-node';
                node.textContent = text;
                
                // Add some randomization to position (±20px)
                const randomOffsetX = (Math.random() - 0.5) * 40;
                const randomOffsetY = (Math.random() - 0.5) * 40;
                
                node.style.left = `${x + randomOffsetX}px`;
                node.style.top = `${y + randomOffsetY}px`;
                return node;
            }
            
            // Function to create an arrow between two nodes
            function createArrow(fromNode, toNode) {
                const fromRect = fromNode.getBoundingClientRect();
                const toRect = toNode.getBoundingClientRect();
                
                const fromX = fromRect.left + fromRect.width / 2;
                const fromY = fromRect.top + fromRect.height / 2;
                const toX = toRect.left + toRect.width / 2;
                const toY = toRect.top + toRect.height / 2;
                
                const angle = Math.atan2(toY - fromY, toX - fromX);
                const length = Math.sqrt(Math.pow(toX - fromX, 2) + Math.pow(toY - fromY, 2));
                
                const arrow = document.createElement('div');
                arrow.className = 'mindmap-arrow';
                arrow.style.left = `${fromX}px`;
                arrow.style.top = `${fromY}px`;
                arrow.style.width = `${length}px`;
                arrow.style.transform = `rotate(${angle}rad)`;
                
                return arrow;
            }
            
            // Function to show gallery with hover to expand effect
            function showGallery(folderPath, title) {
                console.log(`Opening gallery for: ${title} with path: ${folderPath}`);
                
                // Check if this is one of the projects that should skip animation
                const noAnimationProjects = [
                    "RFID Attendance System",
                    "Object Detection System with Arduino Uno",
                    "Automatic Room Lighting & Occupancy Display",
                    "To-Do List Software"  // Added this entry
                ];
                
                const skipAnimation = noAnimationProjects.includes(title);
                
                // Create gallery container
                const galleryContainer = document.createElement('div');
                galleryContainer.className = 'gallery-container';
                
                if (skipAnimation) {
                    galleryContainer.classList.add('active'); // Add active class immediately
                    galleryContainer.style.opacity = '1'; // Set full opacity right away
                }
                
                document.body.appendChild(galleryContainer);
                
                // Add CSS for gallery with masonry layout
                if (!document.querySelector('#gallery-style')) {
                    const galleryStyle = document.createElement('style');
                    galleryStyle.id = 'gallery-style';
                    galleryStyle.textContent = `
                        .gallery-container {
                            position: fixed;
                            top: 0;
                            left: 0;
                            width: 100vw;
                            height: 100vh;
                            background: rgba(0, 0, 0, 0.95);
                            z-index: 1100;
                            display: flex;
                            flex-direction: column;
                            justify-content: flex-start;
                            align-items: center;
                            padding: 20px;
                            overflow-y: auto;
                            opacity: 0;
                            transition: opacity 0.5s ease;
                            /* Hide scrollbars but keep functionality */
                            scrollbar-width: none; /* Firefox */
                            -ms-overflow-style: none; /* IE/Edge */
                        }
                        
                        /* Hide webkit scrollbar */
                        .gallery-container::-webkit-scrollbar {
                            display: none;
                        }
                        
                        .gallery-container.active {
                            opacity: 1;
                        }
                        
                        .gallery-title {
                            color: white;
                            font-size: 2.5em;
                            text-transform: uppercase;
                            text-align: center;
                            margin-bottom: 20px;
                            background: linear-gradient(45deg, #ffffff, #4079ff);
                            -webkit-background-clip: text;
                            background-clip: text;
                            color: transparent;
                            position: relative;
                            cursor: pointer;
                        }
                        
                        /* Add shine underline effect on hover */
                        .gallery-title::after {
                            content: '';
                            position: absolute;
                            bottom: -5px;
                            left: 0;
                            width: 100%;
                            height: 2px;
                            background: linear-gradient(90deg, 
                                transparent 0%,
                                rgba(255, 255, 255, 0) 0%,
                                rgba(255, 255, 255, 0) 100%,
                                transparent 100%
                            );
                            transition: background 0.3s ease;
                        }
                        
                        .gallery-title:hover::after {
                            background: linear-gradient(90deg, 
                                transparent 0%,
                                rgba(255, 255, 255, 0.8) 50%,
                                transparent 100%
                            );
                            background-size: 200% auto;
                            animation: shine 2s infinite linear;
                        }
                        
                        @keyframes shine {
                            0% { background-position: -200% center; }
                            100% { background-position: 200% center; }
                        }
                        
                        .gallery-masonry {
                            columns: 4;
                            column-gap: 1px;
                            max-width: 1400px;
                            margin: 0 auto;
                            padding: 10px;
                        }
                        
                        @media (max-width: 1400px) { .gallery-masonry { columns: 3; } }
                        @media (max-width: 900px) { .gallery-masonry { columns: 2; } }
                        @media (max-width: 600px) { .gallery-masonry { columns: 1; } }
                        
                        .gallery-item-container {
                            break-inside: avoid;
                            margin-bottom: 1px;
                            position: relative;
                            border-radius: 10px;
                            overflow: hidden;
                            cursor: pointer;
                            transform: translateZ(0);
                            transition: transform 0.3s ease;
                        }
                        
                        /* Reduce size for RAI section specifically */
                        [data-section="Robotics and AI Internship"] .gallery-item-container {
                            max-height: 350px;
                        }
                        
                        .gallery-item-container img,
                        .gallery-item-container video {
                            width: 100%;
                            height: auto;
                            display: block;
                            border-radius: 10px;
                            transition: transform 0.3s ease;
                        }
                        
                        /* Ensure RAI images maintain aspect ratio but stay contained */
                        [data-section="Robotics and AI Internship"] .gallery-item-container img,
                        [data-section="Robotics and AI Internship"] .gallery-item-container video {
                            object-fit: cover;
                            max-height: 350px;
                        }
                        
                        .gallery-item-container:hover {
                            transform: scale(1.02);
                            z-index: 10;
                        }
                        
                        .gallery-item-container:hover img,
                        .gallery-item-container:hover video {
                            transform: scale(1.1);
                        }
                        
                        .gallery-section {
                            width: 100%;
                            margin-bottom: 30px;
                        }
                        
                        .gallery-section-title {
                            color: white;
                            font-size: 1.8em;
                            margin-bottom: 15px;
                            padding-left: 20px;
                            border-left: 4px solid #4079ff;
                        }
                        
                        .gallery-close-button {
                            position: fixed;
                            top: 20px;
                            right: 20px;
                            width: 50px;
                            height: 50px;
                            background: rgba(64, 121, 255, 0.3);
                            color: white;
                            border-radius: 50%;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            cursor: pointer;
                            font-size: 35px;
                            transition: all 0.3s ease;
                            z-index: 1101;
                            border: 2px solid rgba(255, 255, 255, 0.2);
                        }
                        
                        .gallery-close-button:hover {
                            background: rgba(64, 121, 255, 0.5);
                            transform: scale(1.1) rotate(90deg);
                            border-color: rgba(255, 255, 255, 0.4);
                        }
                    `;
                    document.head.appendChild(galleryStyle);
                }
                
                // Add gallery title
                const galleryTitle = document.createElement('div');
                galleryTitle.className = 'gallery-title';
                galleryTitle.textContent = title;
                galleryContainer.appendChild(galleryTitle);
                
                // Create sections for Online and Offline Internships
                let onlineSection, offlineSection;
                
                // Use consistent file paths for all gallery types
                let certificateFiles = [];
                if (title.includes('CodSoft')) {
                    onlineSection = createSection('CodSoft Internship');
                    certificateFiles = [
                        '../projects/internship/online/codesoft/c++.jpg',
                        '../projects/internship/online/codesoft/py.jpg',
                        '../projects/internship/online/codesoft/ui.jpg',
                        '../projects/internship/online/codesoft/wd.jpg'
                    ];
                    populateMasonryGrid(onlineSection, certificateFiles);
                    galleryContainer.appendChild(onlineSection);
                } else if (title.includes('Educatified')) {
                    onlineSection = createSection('Educatified Internship');
                    certificateFiles = [
                        '../projects/internship/online/educatified/ed.jpg'
                    ];
                    populateMasonryGrid(onlineSection, certificateFiles);
                    galleryContainer.appendChild(onlineSection);
                } else { // Robotics and AI
                    offlineSection = createSection('Robotics and AI Internship');
                    certificateFiles = [
                        '../projects/internship/offline/RAI/1.jpg',
                        '../projects/internship/offline/RAI/2.jpg',
                        '../projects/internship/offline/RAI/3.jpg',
                        
                        '../projects/internship/offline/RAI/5.jpg',
                        '../projects/internship/offline/RAI/6.jpg',
                        '../projects/internship/offline/RAI/7.jpg',
                        '../projects/internship/offline/RAI/8.jpg',
                        '../projects/internship/offline/RAI/9.jpg',
                        '../projects/internship/offline/RAI/10.jpg',
                        '../projects/internship/offline/RAI/11.jpg',
                        '../projects/internship/offline/RAI/12.jpg',
                        '../projects/internship/offline/RAI/13.jpg',
                        '../projects/internship/offline/RAI/14.jpg',
                        '../projects/internship/offline/RAI/15.jpg',
                        '../projects/internship/offline/RAI/16.jpg'
                    ];
                    populateMasonryGrid(offlineSection, certificateFiles);
                    galleryContainer.appendChild(offlineSection);
                }
                
                // Helper function to create a section
                function createSection(title) {
                    const section = document.createElement('div');
                    section.className = 'gallery-section';
                    section.dataset.section = title; // Add data attribute for targeting specific sections
                    
                    // We'll create the section title element but not display it
                    const sectionTitle = document.createElement('div');
                    sectionTitle.className = 'gallery-section-title';
                    sectionTitle.textContent = title;
                    sectionTitle.style.display = 'none'; // Hide the section title
                    section.appendChild(sectionTitle);
                    
                    return section;
                }
                
                // Helper function to populate masonry grid
                function populateMasonryGrid(section, files) {
                    const masonryGrid = document.createElement('div');
                    masonryGrid.className = 'gallery-masonry';
                    
                    // Add CSS for randomized masonry layout
                    if (!document.querySelector('#random-masonry-style')) {
                        const randomStyle = document.createElement('style');
                        randomStyle.id = 'random-masonry-style';
                        randomStyle.textContent = `
                            .gallery-masonry {
                                columns: 4;
                                column-gap: 0px; /* Reduced from 2px to 0px */
                                max-width: 1400px;
                                margin: 0 auto;
                                padding: 10px;
                            }
                            
                            @media (max-width: 1400px) { .gallery-masonry { columns: 3; } }
                            @media (max-width: 900px) { .gallery-masonry { columns: 2; } }
                            @media (max-width: 600px) { .gallery-masonry { columns: 1; } }
                            
                            .gallery-item-container {
                                break-inside: avoid;
                                margin-bottom: 0px; /* Reduced from 2px to 0px */
                                position: relative;
                                border-radius: 10px;
                                overflow: hidden;
                                cursor: pointer;
                                transform: translateZ(0);
                                transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                                transform-origin: center;
                                scale: 0.92;
                                opacity: 0.85;
                            }
                            
                            .gallery-item-container img,
                            .gallery-item-container video {
                                width: 100%;
                                height: 100%;
                                object-fit: cover;
                                border-radius: 10px;
                                transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                            }
                            
                            .gallery-item-container:hover {
                                transform: scale(1.08); /* Larger hover expansion */
                                z-index: 10;
                                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
                                opacity: 1;
                            }
                            
                            .gallery-item-container:hover img,
                            .gallery-item-container:hover video {
                                transform: scale(1.05);
                            }
                        `;
                        document.head.appendChild(randomStyle);
                    }
                    
                    files.forEach(file => {
                        const itemContainer = document.createElement('div');
                        itemContainer.className = 'gallery-item-container';
                        
                        // Randomize dimensions for masonry effect
                        const randomHeight = Math.floor(Math.random() * (400 - 180) + 180); // Random height between 180-400px
                        const randomAspect = [4/3, 16/9, 3/2, 1/1, 2/3, 9/16][Math.floor(Math.random() * 6)]; // Random aspect ratios
                        
                        itemContainer.style.height = `${randomHeight}px`;
                        
                        // Add shadow effect for depth
                        itemContainer.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.2)';
                        
                        const isVideo = file.endsWith('.mp4');
                        const element = isVideo ? document.createElement('video') : document.createElement('img');
                    element.src = file;
                        element.loading = 'lazy';
                        
                        // Set object-fit based on aspect ratio
                        const objectFitOptions = ['cover', 'contain'];
                        element.style.objectFit = objectFitOptions[Math.floor(Math.random() * 2)];
                        
                        if (isVideo) {
                        element.controls = true;
                            element.muted = true;
                            element.loop = true;
                            element.playsInline = true;
                            
                            // Add hover events for video
                            itemContainer.addEventListener('mouseenter', () => {
                                element.play().catch(err => {
                                    console.log('Autoplay failed:', err);
                                    element.muted = true;
                                    element.play().catch(e => console.log('Retry failed:', e));
                                });
                            });
                            
                            itemContainer.addEventListener('mouseleave', () => {
                                element.pause();
                            });
                        }
                        
                        // Add click handler for fullscreen view
                        itemContainer.addEventListener('click', () => {
                            const fullscreenView = document.createElement('div');
                            fullscreenView.className = 'fullscreen-view';
                            fullscreenView.style.cssText = `
                                position: fixed;
                                top: 0;
                                left: 0;
                                width: 100vw;
                                height: 100vh;
                                background: rgba(0, 0, 0, 0.95);
                                display: flex;
                                justify-content: center;
                                align-items: center;
                                z-index: 2000;
                                opacity: 0;
                                transition: opacity 0.3s ease;
                            `;
                            
                            const fullscreenElement = isVideo ? document.createElement('video') : document.createElement('img');
                            fullscreenElement.src = file;
                            fullscreenElement.style.cssText = `
                                max-width: 90vw;
                                max-height: 90vh;
                                object-fit: contain;
                                border-radius: 10px;
                                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
                            `;
                            
                            if (isVideo) {
                                fullscreenElement.controls = true;
                                fullscreenElement.autoplay = true;
                                fullscreenElement.loop = true;
                                fullscreenElement.muted = false;
                            }
                            
                            // Add title with shine effect
                            const fullscreenTitle = document.createElement('div');
                            fullscreenTitle.className = 'fullscreen-title';
                            fullscreenTitle.textContent = file.split('/').pop().split('.')[0]; // Extract filename as title
                            
                            const closeButton = document.createElement('div');
                            closeButton.innerHTML = '&times;';
                            closeButton.style.cssText = `
                                position: fixed;
                                top: 20px;
                                right: 20px;
                                width: 50px;
                                height: 50px;
                                background: rgba(64, 121, 255, 0.3);
                                color: white;
                                border-radius: 50%;
                                display: flex;
                                justify-content: center;
                                align-items: center;
                                cursor: pointer;
                                font-size: 35px;
                                transition: all 0.3s ease;
                                z-index: 2001;
                                border: 2px solid rgba(255, 255, 255, 0.2);
                            `;
                            
                            closeButton.addEventListener('click', () => {
                                fullscreenView.style.opacity = '0';
                                setTimeout(() => document.body.removeChild(fullscreenView), 300);
                            });
                            
                            fullscreenView.addEventListener('click', (e) => {
                                if (e.target === fullscreenView) {
                                    fullscreenView.style.opacity = '0';
                                    setTimeout(() => document.body.removeChild(fullscreenView), 300);
                                }
                            });
                            
                            fullscreenView.appendChild(fullscreenElement);
                            fullscreenView.appendChild(fullscreenTitle);
                            fullscreenView.appendChild(closeButton);
                            document.body.appendChild(fullscreenView);
                            
                            // Add title style
                            if (!document.querySelector('#fullscreen-title-style')) {
                                const titleStyle = document.createElement('style');
                                titleStyle.id = 'fullscreen-title-style';
                                titleStyle.textContent = `
                                    .fullscreen-title {
                                        position: absolute;
                                        bottom: 20px;
                                        left: 50%;
                                        transform: translateX(-50%);
                                        font-size: 1.5em;
                                        text-transform: uppercase;
                                        background: linear-gradient(45deg, #ffffff, #4079ff);
                                        -webkit-background-clip: text;
                                        background-clip: text;
                                        color: transparent;
                                        position: relative;
                                        cursor: pointer;
                                        padding: 5px 10px;
                                    }
                                    
                                    .fullscreen-title::after {
                                        content: '';
                                        position: absolute;
                                        bottom: -5px;
                                        left: 0;
                                        width: 100%;
                                        height: 2px;
                                        background: linear-gradient(90deg, 
                                            transparent 0%,
                                            rgba(255, 255, 255, 0) 0%,
                                            rgba(255, 255, 255, 0) 100%,
                                            transparent 100%
                                        );
                                        transition: background 0.3s ease;
                                    }
                                    
                                    .fullscreen-title:hover::after {
                                        background: linear-gradient(90deg, 
                                            transparent 0%,
                                            rgba(255, 255, 255, 0.8) 50%,
                                            transparent 100%
                                        );
                                        background-size: 200% auto;
                                        animation: shine 2s infinite linear;
                                    }
                                `;
                                document.head.appendChild(titleStyle);
                            }
                            
                            setTimeout(() => {
                                fullscreenView.style.opacity = '1';
                            }, 50);
                        });
                        
                        itemContainer.appendChild(element);
                        masonryGrid.appendChild(itemContainer);
                    });
                    
                    section.appendChild(masonryGrid);
                }
                
                // Add close button
                const closeButton = document.createElement('div');
                closeButton.className = 'gallery-close-button';
                closeButton.innerHTML = '&times;';
                closeButton.addEventListener('click', () => {
                    galleryContainer.style.opacity = '0';
                    setTimeout(() => document.body.removeChild(galleryContainer), 300);
                });
                galleryContainer.appendChild(closeButton);
                
                // Show gallery with animation
                if (!skipAnimation) {
                    // Only use animation timeout if not skipping animation
                setTimeout(() => {
                    galleryContainer.classList.add('active');
                    }, 50);
                }
            }
            
            return;
        }
        
        // Special handling for Blender
        if (projectName === "Blender") {
            showBlenderGallery();
            return;
        }
        
        // Special handling for Gesture-Based Music Control
        if (projectName === "Gesture-Based Music Control") {
            // Find the clicked word element to get its position
            const clickedElement = document.querySelector(`.floating-word[data-project="${projectLinks[projectName]}"]`);
            const rect = clickedElement.getBoundingClientRect();
            
            // Calculate the center position of the clicked word
            const startX = rect.left + rect.width / 2;
            const startY = rect.top + rect.height / 2;
            
            // Create special animation container
            const animContainer = document.createElement('div');
            animContainer.className = 'music-control-animation';
            document.body.appendChild(animContainer);
            
            // Add the animated elements (music particles and hand gesture)
            const particleCount = 40;
            for (let i = 0; i < particleCount; i++) {
                const particle = document.createElement('div');
                particle.className = 'music-particle';
                
                // Randomize particle properties
                const size = Math.random() * 30 + 10;
                const delay = Math.random() * 0.5;
                const duration = Math.random() * 1 + 1;
                const hue = Math.floor(Math.random() * 360);
                
                // Position particles around the clicked word
                const offsetX = (Math.random() - 0.5) * 60;
                const offsetY = (Math.random() - 0.5) * 60;
                
                // Apply styles
                particle.style.width = `${size}px`;
                particle.style.height = `${size}px`;
                particle.style.left = `${startX + offsetX}px`;
                particle.style.top = `${startY + offsetY}px`;
                particle.style.backgroundColor = `hsla(${hue}, 100%, 60%, 0.8)`;
                particle.style.animationDelay = `${delay}s`;
                particle.style.animationDuration = `${duration}s`;
                
                animContainer.appendChild(particle);
            }
            
            // Add advanced hand gesture animation with waves
            const handGesture = document.createElement('div');
            handGesture.className = 'hand-gesture';
            
            // More advanced SVG with animated waves and detailed hand
            handGesture.innerHTML = `
                <svg viewBox="0 0 200 200" width="100%" height="100%">
                    <!-- Sound Waves (animated) -->
                    <g class="sound-waves">
                        <path class="wave wave1" d="M90,60 C95,50 105,50 110,60 C115,70 125,70 130,60" stroke="#00FFFF" fill="none" stroke-width="2" />
                        <path class="wave wave2" d="M80,50 C90,35 110,35 120,50 C130,65 150,65 160,50" stroke="#FF00FF" fill="none" stroke-width="2" />
                        <path class="wave wave3" d="M70,40 C85,20 115,20 130,40 C145,60 165,60 180,40" stroke="#FFFF00" fill="none" stroke-width="2" />
                    </g>
                    
                    <!-- Hand Base -->
                    <path class="hand" d="M100,180 C80,180 65,165 65,140 C65,130 67,122 70,115 L75,95 C77,85 80,80 85,80 C92,80 95,85 95,95 L95,120 M95,120 L95,95 C95,85 98,80 103,80 C110,80 113,85 113,95 L113,120 M113,120 L113,90 C113,83 116,78 120,78 C127,78 130,83 130,90 L130,120 M130,120 L130,95 C130,85 135,80 140,80 C147,80 150,85 150,95 L145,140 C145,165 125,180 100,180Z" fill="white" />
                    
                    <!-- Gesture Motion Animation -->
                    <g class="motion-circles">
                        <circle class="motion-circle circle1" cx="120" cy="60" r="5" fill="#00FFFF" />
                        <circle class="motion-circle circle2" cx="130" cy="40" r="3" fill="#FF00FF" />
                        <circle class="motion-circle circle3" cx="110" cy="50" r="4" fill="#FFFF00" />
                    </g>
                    
                    <!-- Music Notes -->
                    <g class="music-notes">
                        <path class="note note1" d="M60,40 L65,35 L65,20 C70,15 75,20 70,25 L70,40 C75,35 80,40 75,45 C70,50 60,45 60,40Z" fill="#FF00FF" />
                        <path class="note note2" d="M140,30 L145,25 L145,10 C150,5 155,10 150,15 L150,30 C155,25 160,30 155,35 C150,40 140,35 140,30Z" fill="#00FFFF" />
                    </g>
                </svg>
            `;
            
            // Position the gesture animation at the clicked word position
            handGesture.style.left = `${startX}px`;
            handGesture.style.top = `${startY}px`;
            
            animContainer.appendChild(handGesture);
            
            // Add animation styles
            const style = document.createElement('style');
            style.textContent = `
                .music-control-animation {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100vw;
                    height: 100vh;
                    background: rgba(0, 0, 0, 0.8);
                    z-index: 9999;
                    overflow: hidden;
                    animation: fadeIn 0.5s ease forwards;
                    pointer-events: none; /* Allow clicking through the animation container */
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                
                .music-particle {
                    position: absolute;
                    border-radius: 50%;
                    opacity: 0;
                    filter: blur(2px);
                    animation: particleMove 2s ease-out forwards;
                }
                
                @keyframes particleMove {
                    0% {
                        transform: scale(0) translate(0, 0);
                        opacity: 0;
                    }
                    20% {
                        opacity: 0.8;
                    }
                    100% {
                        transform: scale(1) translate(calc(var(--direction-x, 1) * 100px), calc(var(--direction-y, 1) * 100px));
                        opacity: 0;
                    }
                }
                
                .hand-gesture {
                    position: absolute;
                    width: 250px;
                    height: 250px;
                    transform: translate(-50%, -50%) scale(0);
                    animation: gestureAppear 1.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                    filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.5));
                }
                
                @keyframes gestureAppear {
                    0% {
                        transform: translate(-50%, -50%) scale(0) rotate(-45deg);
                        opacity: 0;
                    }
                    20% {
                        transform: translate(-50%, -50%) scale(1.2) rotate(0deg);
                        opacity: 1;
                    }
                    60% {
                        transform: translate(-50%, -50%) scale(1) rotate(0deg);
                        opacity: 1;
                    }
                    100% {
                        transform: translate(-50%, -50%) scale(20) rotate(0deg);
                        opacity: 0;
                    }
                }
                
                /* Sound wave animations */
                .sound-waves path {
                    stroke-dasharray: 50;
                    stroke-dashoffset: 50;
                    animation: dash 1s linear forwards;
                }
                
                .wave1 { animation-delay: 0.1s; }
                .wave2 { animation-delay: 0.2s; }
                .wave3 { animation-delay: 0.3s; }
                
                @keyframes dash {
                    to {
                        stroke-dashoffset: 0;
                    }
                }
                
                /* Motion circles animation */
                .motion-circle {
                    animation: pulse 0.8s ease-in-out infinite alternate;
                }
                
                .circle1 { animation-delay: 0s; }
                .circle2 { animation-delay: 0.3s; }
                .circle3 { animation-delay: 0.6s; }
                
                @keyframes pulse {
                    0% { transform: scale(0.8); opacity: 0.5; }
                    100% { transform: scale(1.5); opacity: 1; }
                }
                
                /* Music notes animation */
                .music-notes path {
                    animation: float 1s ease-in-out infinite alternate;
                }
                
                .note1 { animation-delay: 0.2s; }
                .note2 { animation-delay: 0.5s; }
                
                @keyframes float {
                    0% { transform: translateY(0); }
                    100% { transform: translateY(-10px); }
                }
                
                /* Hand animation */
                .hand {
                    animation: glow 1s ease-in-out infinite alternate;
                }
                
                @keyframes glow {
                    0% { filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.8)); }
                    100% { filter: drop-shadow(0 0 8px rgba(255, 255, 255, 1)); }
                }
            `;
            document.head.appendChild(style);
            
            // Assign random directions to particles
            document.querySelectorAll('.music-particle').forEach(particle => {
                particle.style.setProperty('--direction-x', (Math.random() * 2 - 1).toFixed(2));
                particle.style.setProperty('--direction-y', (Math.random() * 2 - 1).toFixed(2));
            });
            
            // Open the link after animation completes
            setTimeout(() => {
                window.open('https://tunebydp.netlify.app/', '_blank');
                
                // Remove animation container after a delay
                setTimeout(() => {
                    animContainer.style.opacity = '0';
                    setTimeout(() => {
                        if (document.body.contains(animContainer)) {
                            document.body.removeChild(animContainer);
                        }
                    }, 500);
                }, 500);
            }, 2000); // Increased to 2000ms to give more time to enjoy the advanced animation
            
            return;
        }
        
        // Standard navigation for other projects
        // Just navigate to the project without removing floating words container
        const projectIdentifier = projectLinks[projectName];
        if (projectIdentifier) {
            // Create a highlight effect for the clicked word
            const clickedElement = document.querySelector(`.floating-word[data-project="${projectIdentifier}"]`);
            if (clickedElement) {
                // Add a quick pulse animation to the clicked word
                clickedElement.style.animation = 'none';
                void clickedElement.offsetWidth; // Trigger reflow
                clickedElement.style.animation = 'wordClick 0.5s ease-out';
            }
            
            // Add click animation style if not already added
            if (!document.querySelector('#word-click-style')) {
                const clickStyle = document.createElement('style');
                clickStyle.id = 'word-click-style';
                clickStyle.textContent = `
                    @keyframes wordClick {
                        0% { transform: scale(1); box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3); }
                        50% { transform: scale(1.2); box-shadow: 0 10px 30px rgba(255, 255, 255, 0.5); }
                        100% { transform: scale(1); box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3); }
                    }
                `;
                document.head.appendChild(clickStyle);
            }
            
            // Open the target in a new tab or navigate in the current page
            const projectElement = document.getElementById(projectIdentifier);
            if (projectElement) {
                // Scroll to the element with smooth behavior
                setTimeout(() => {
                    projectElement.scrollIntoView({ behavior: 'smooth' });
                }, 300);
            }
        }

        // Add new condition for techfest projects
        if (projectName === "IIT BOMBAY Techfest" || projectName === "IIT PATNA Techfest") {
            showTechfestGallery(projectName);
            return;
        }

        // Add certificates data
        const certificatesData = {
            name: 'Certificates',
            files: [
                '../projects/certificates/c++.jpg',
                '../projects/certificates/ed.jpg',
                '../projects/certificates/fdp1.jpg',
                '../projects/certificates/fdp2.jpg',
                '../projects/certificates/fdp3.jpg',
                '../projects/certificates/fdp4.jpg',
                '../projects/certificates/jnv.jpg',
                '../projects/certificates/py.jpg',
                '../projects/certificates/rai.jpg',
                '../projects/certificates/u1.jpg',
                '../projects/certificates/u2.jpg',
                '../projects/certificates/u3.jpg',
                '../projects/certificates/u4.jpg',
                '../projects/certificates/ui.jpg',
                '../projects/certificates/wd.jpg'
            ]
        };

        // Add function to show certificates gallery
        function showCertificatesGallery() {
            const galleryContainer = document.createElement('div');
            galleryContainer.className = 'certificates-gallery';
            document.body.appendChild(galleryContainer);

            // Add CSS for certificates gallery
            if (!document.querySelector('#certificates-style')) {
                const style = document.createElement('style');
                style.id = 'certificates-style';
                style.textContent = `
                    .certificates-gallery {
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100vw;
                        height: 100vh;
                        background: rgba(0, 0, 0, 0.95);
                        z-index: 2000;
                        padding: 40px;
                        opacity: 0;
                        transition: opacity 0.3s ease;
                        overflow-y: auto;
                        scrollbar-width: none;
                    }

                    .certificates-gallery::-webkit-scrollbar {
                        display: none;
                    }

                    .certificates-gallery.active {
                        opacity: 1;
                    }

                    .certificates-title {
                        color: white;
                        font-size: 2.5em;
                        text-transform: uppercase;
                        text-align: center;
                        margin-bottom: 30px;
                        background: linear-gradient(45deg, #ffffff, #4079ff);
                        -webkit-background-clip: text;
                        background-clip: text;
                        color: transparent;
                        position: relative;
                        cursor: pointer;
                    }

                    .certificates-title::after {
                        content: '';
                        position: absolute;
                        bottom: -5px;
                        left: 0;
                        width: 100%;
                        height: 2px;
                        background: linear-gradient(90deg, 
                            transparent 0%,
                            rgba(255, 255, 255, 0) 0%,
                            rgba(255, 255, 255, 0) 100%,
                            transparent 100%
                        );
                        transition: background 0.3s ease;
                    }

                    .certificates-title:hover::after {
                        background: linear-gradient(90deg, 
                            transparent 0%,
                            rgba(255, 255, 255, 0.8) 50%,
                            transparent 100%
                        );
                        background-size: 200% auto;
                        animation: shine 2s infinite linear;
                    }

                    @keyframes shine {
                        0% { background-position: -200% center; }
                        100% { background-position: 200% center; }
                    }

                    /* Fullscreen view styles */
                    .certificates-fullscreen {
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100vw;
                        height: 100vh;
                        background: rgba(0, 0, 0, 0.95);
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        z-index: 2500;
                        opacity: 0;
                        transition: opacity 0.3s ease;
                    }

                    .certificates-fullscreen.active {
                        opacity: 1;
                    }

                    .certificates-fullscreen img {
                        max-width: 90vw;
                        max-height: 90vh;
                        object-fit: contain;
                        border-radius: 15px;
                        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
                    }

                    .certificates-fullscreen .close-button {
                        position: fixed;
                        top: 20px;
                        right: 20px;
                        width: 50px;
                        height: 50px;
                        background: rgba(50, 50, 50, 0.9);
                        color: white;
                        border-radius: 50%;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        cursor: pointer;
                        font-size: 35px;
                        transition: all 0.3s ease;
                        z-index: 2501;
                    }

                    .certificates-fullscreen .close-button:hover {
                        background: rgba(80, 80, 80, 0.9);
                        transform: scale(1.1);
                    }

                    .certificates-grid {
                        columns: 4;
                        column-gap: 20px;
                        max-width: 1600px;
                        margin: 0 auto;
                    }

                    @media (max-width: 1600px) { .certificates-grid { columns: 3; } }
                    @media (max-width: 1200px) { .certificates-grid { columns: 2; } }
                    @media (max-width: 768px) { .certificates-grid { columns: 1; } }

                    .certificate-card {
                        break-inside: avoid;
                        margin-bottom: 20px;
                        position: relative;
                        border-radius: 15px;
                        overflow: hidden;
                        cursor: pointer;
                        transform: translateZ(0);
                        transition: transform 0.3s ease;
                    }

                    .certificate-card::before {
                        content: '';
                        position: absolute;
                        inset: -10px;
                        background: inherit;
                        backdrop-filter: blur(10px);
                        -webkit-backdrop-filter: blur(10px);
                        mask-image: radial-gradient(
                            circle at var(--mouse-x, 50%) var(--mouse-y, 50%),
                            transparent 30%,
                            black 70%
                        );
                        -webkit-mask-image: radial-gradient(
                            circle at var(--mouse-x, 50%) var(--mouse-y, 50%),
                            transparent 30%,
                            black 70%
                        );
                        transition: all 0.3s ease;
                        z-index: 1;
                    }

                    .certificate-card img {
                        width: 100%;
                        height: auto;
                        display: block;
                        border-radius: 15px;
                        transition: transform 0.3s ease;
                    }

                    .certificate-card:hover {
                        transform: scale(1.02);
                    }

                    .certificate-card:hover::before {
                        mask-image: radial-gradient(
                            circle at var(--mouse-x, 50%) var(--mouse-y, 50%),
                            transparent 40%,
                            black 60%
                        );
                        -webkit-mask-image: radial-gradient(
                            circle at var(--mouse-x, 50%) var(--mouse-y, 50%),
                            transparent 40%,
                            black 60%
                        );
                    }

                    .certificate-card:hover img {
                        transform: scale(1.1);
                    }
                `;
                document.head.appendChild(style);
            }

            // Create gallery content
            const title = document.createElement('div');
            title.className = 'certificates-title';
            title.textContent = 'Certificates';
            galleryContainer.appendChild(title);

            const grid = document.createElement('div');
            grid.className = 'certificates-grid';

            certificatesData.files.forEach((path, index) => {
                const card = document.createElement('div');
                card.className = 'certificate-card';

                const img = document.createElement('img');
                img.src = path;
                img.loading = 'lazy';
                img.alt = `Certificate ${index + 1}`;

                // Add mouse move effect
                card.addEventListener('mousemove', (e) => {
                    const rect = card.getBoundingClientRect();
                    const x = ((e.clientX - rect.left) / rect.width) * 100;
                    const y = ((e.clientY - rect.top) / rect.height) * 100;
                    
                    card.style.setProperty('--mouse-x', `${x}%`);
                    card.style.setProperty('--mouse-y', `${y}%`);
                });

                // Add click handler for fullscreen view
                card.addEventListener('click', () => {
                    const fullscreenView = document.createElement('div');
                    fullscreenView.className = 'certificates-fullscreen';
                    
                    const fullscreenImg = document.createElement('img');
                    fullscreenImg.src = path;
                    
                    const closeButton = document.createElement('div');
                    closeButton.className = 'close-button';
                    closeButton.innerHTML = '&times;';
                    
                    const closeFullscreen = () => {
                        fullscreenView.style.opacity = '0';
                        setTimeout(() => document.body.removeChild(fullscreenView), 300);
                    };
                    
                    closeButton.addEventListener('click', closeFullscreen);
                    fullscreenView.addEventListener('click', (e) => {
                        if (e.target === fullscreenView) closeFullscreen();
                    });
                    
                    fullscreenView.appendChild(fullscreenImg);
                    fullscreenView.appendChild(closeButton);
                    document.body.appendChild(fullscreenView);
                    
                    requestAnimationFrame(() => fullscreenView.classList.add('active'));
                });

                card.appendChild(img);
                grid.appendChild(card);
            });

            galleryContainer.appendChild(grid);

            // Add close button
            const closeButton = document.createElement('div');
            closeButton.className = 'close-button';
            closeButton.innerHTML = '&times;';
            closeButton.addEventListener('click', () => {
                galleryContainer.style.opacity = '0';
                setTimeout(() => document.body.removeChild(galleryContainer), 300);
            });
            galleryContainer.appendChild(closeButton);

            // Show gallery with animation
            requestAnimationFrame(() => galleryContainer.classList.add('active'));
        }

        // Update navigateToProject function to handle certificates
        if (projectName === "Certificates") {
            showCertificatesGallery();
            return;
        }

        // Add browserExtension data after certificatesData
        const browserExtensionData = {
            name: 'Browser Extension',
            files: [
                '../projects/BrowserExtension/befocus.mp4'
            ]
        };

        // Add function to show browser extension gallery
        function showBrowserExtensionGallery() {
            const galleryContainer = document.createElement('div');
            galleryContainer.className = 'browser-extension-gallery';
            document.body.appendChild(galleryContainer);

            // Add CSS for browser extension gallery
            if (!document.querySelector('#browser-extension-style')) {
                const style = document.createElement('style');
                style.id = 'browser-extension-style';
                style.textContent = `
                    .browser-extension-gallery {
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100vw;
                        height: 100vh;
                        background: rgba(0, 0, 0, 0.95);
                        z-index: 2000;
                        padding: 40px;
                        opacity: 0;
                        transition: opacity 0.3s ease;
                        overflow-y: auto;
                        scrollbar-width: none;
                    }

                    .browser-extension-gallery::-webkit-scrollbar {
                        display: none;
                    }

                    .browser-extension-gallery.active {
                        opacity: 1;
                    }

                    .browser-extension-title {
                        color: white;
                        font-size: 2.5em;
                        text-transform: uppercase;
                        text-align: center;
                        margin-bottom: 30px;
                        background: linear-gradient(45deg, #ffffff, #4079ff);
                        -webkit-background-clip: text;
                        background-clip: text;
                        color: transparent;
                        position: relative;
                        cursor: pointer;
                    }

                    .browser-extension-title::after {
                        content: '';
                        position: absolute;
                        bottom: -5px;
                        left: 0;
                        width: 100%;
                        height: 2px;
                        background: linear-gradient(90deg, 
                            transparent 0%,
                            rgba(255, 255, 255, 0) 0%,
                            rgba(255, 255, 255, 0) 100%,
                            transparent 100%
                        );
                        transition: background 0.3s ease;
                    }

                    .browser-extension-title:hover::after {
                        background: linear-gradient(90deg, 
                            transparent 0%,
                            rgba(255, 255, 255, 0.8) 50%,
                            transparent 100%
                        );
                        background-size: 200% auto;
                        animation: shine 2s infinite linear;
                    }

                    .browser-extension-card {
                        position: relative;
                        width: 80%;
                        max-width: 1200px;
                        margin: 0 auto;
                        border-radius: 15px;
                        overflow: hidden;
                        cursor: pointer;
                        transform: translateZ(0);
                        transition: transform 0.3s ease;
                    }

                    .browser-extension-card video {
                        width: 100%;
                        height: auto;
                        display: block;
                        border-radius: 15px;
                        transition: transform 0.3s ease;
                    }

                    .browser-extension-card:hover video {
                        transform: scale(1.05);
                    }
                `;
                document.head.appendChild(style);
            }

            // Create gallery content
            const title = document.createElement('div');
            title.className = 'browser-extension-title';
            title.textContent = 'Browser Extension';
            galleryContainer.appendChild(title);

            const card = document.createElement('div');
            card.className = 'browser-extension-card';

            const video = document.createElement('video');
            video.src = browserExtensionData.files[0];
            video.controls = true;
            video.muted = true;
            video.loop = true;
            video.playsInline = true;
            video.loading = 'lazy';

            // Add mouse move effect
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * 100;
                const y = ((e.clientY - rect.top) / rect.height) * 100;
                
                card.style.setProperty('--mouse-x', `${x}%`);
                card.style.setProperty('--mouse-y', `${y}%`);
            });

            // Add hover events for video
            card.addEventListener('mouseenter', () => {
                video.play().catch(err => {
                    console.log('Autoplay failed:', err);
                    video.muted = true;
                    video.play().catch(e => console.log('Retry failed:', e));
                });
            });

            card.addEventListener('mouseleave', () => {
                video.pause();
            });

            card.appendChild(video);
            galleryContainer.appendChild(card);

            // Add close button
            const closeButton = document.createElement('div');
            closeButton.className = 'close-button';
            closeButton.innerHTML = '&times;';
            closeButton.addEventListener('click', () => {
                galleryContainer.style.opacity = '0';
                setTimeout(() => document.body.removeChild(galleryContainer), 300);
            });
            galleryContainer.appendChild(closeButton);

            // Show gallery with animation
            requestAnimationFrame(() => galleryContainer.classList.add('active'));
        }

        // Update navigateToProject function to handle browser extension
        if (projectName === "Browser Extension") {
            showBrowserExtensionGallery();
            return;
        }

        // Add FDP data
        const fdpData = {
            name: 'FDP',
            categories: {
                'FDP 1': [
                    '../projects/FDP/fdp1/fdp1.jpg',
                    '../projects/FDP/fdp1/fdp2.jpg',
                    '../projects/FDP/fdp1/fdp3.jpg'
                ],
                'FDP 2': [
                    '../projects/FDP/fdp2/fdp4.jpg',
                    '../projects/FDP/fdp2/fdp5.jpg',
                    '../projects/FDP/fdp2/fdp6.jpg',
                    '../projects/FDP/fdp2/fdp7.jpg'
                ]
            }
        };

        // Add function to show FDP gallery
        function showFDPGallery() {
            const galleryContainer = document.createElement('div');
            galleryContainer.className = 'fdp-gallery';
            document.body.appendChild(galleryContainer);

            // Add CSS for FDP gallery
            if (!document.querySelector('#fdp-style')) {
                const style = document.createElement('style');
                style.id = 'fdp-style';
                style.textContent = `
                    .fdp-gallery {
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100vw;
                        height: 100vh;
                        background: rgba(0, 0, 0, 0.95);
                        z-index: 2000;
                        padding: 40px;
                        opacity: 0;
                        transition: opacity 0.3s ease;
                        overflow-y: auto;
                        scrollbar-width: none;
                    }

                    .fdp-gallery::-webkit-scrollbar {
                        display: none;
                    }

                    .fdp-gallery.active {
                        opacity: 1;
                    }

                    .fdp-title-container {
                        text-align: center;
                        margin-bottom: 40px;
                    }

                    .fdp-title {
                        color: white;
                        font-size: 2.8em;
                        text-transform: uppercase;
                        text-align: center;
                        margin-bottom: 10px;
                        background: linear-gradient(45deg, #ffffff, #4079ff);
                        -webkit-background-clip: text;
                        background-clip: text;
                        color: transparent;
                        position: relative;
                        cursor: pointer;
                    }

                    .fdp-subtitle {
                        color: #4079ff;
                        font-size: 1.6em;
                        font-style: italic;
                        text-transform: capitalize;
                        opacity: 0.9;
                        margin-top: 15px;
                        background: linear-gradient(45deg, #4079ff, #ffffff);
                        -webkit-background-clip: text;
                        background-clip: text;
                        color: transparent;
                        letter-spacing: 1px;
                    }

                    .fdp-title::after {
                        content: '';
                        position: absolute;
                        bottom: -5px;
                        left: 0;
                        width: 100%;
                        height: 2px;
                        background: linear-gradient(90deg, 
                            transparent 0%,
                            rgba(255, 255, 255, 0) 0%,
                            rgba(255, 255, 255, 0) 100%,
                            transparent 100%
                        );
                        transition: background 0.3s ease;
                    }

                    .fdp-title:hover::after {
                        background: linear-gradient(90deg, 
                            transparent 0%,
                            rgba(255, 255, 255, 0.8) 50%,
                            transparent 100%
                        );
                        background-size: 200% auto;
                        animation: shine 2s infinite linear;
                    }

                    .fdp-category {
                        margin-bottom: 40px;
                    }

                    .fdp-category-title {
                        color: white;
                        font-size: 1.8em;
                        margin-bottom: 20px;
                        padding-left: 20px;
                        border-left: 4px solid #4079ff;
                    }

                    .fdp-grid {
                        columns: 4;
                        column-gap: 15px;
                        max-width: 1400px;
                        margin: 0 auto;
                        padding: 20px;
                    }

                    @media (max-width: 1600px) { .fdp-grid { columns: 3; } }
                    @media (max-width: 1200px) { .fdp-grid { columns: 2; } }
                    @media (max-width: 768px) { .fdp-grid { columns: 1; } }

                    .fdp-card {
                        break-inside: avoid;
                        margin-bottom: 15px;
                        position: relative;
                        border-radius: 15px;
                        overflow: hidden;
                        cursor: pointer;
                        transform: translateZ(0);
                        transition: transform 0.3s ease;
                        height: ${Math.random() * (400 - 250) + 250}px; // Random height between 250-400px
                    }

                    .fdp-card img {
                        width: 100%;
                        height: 100%;
                        object-fit: cover;
                        border-radius: 15px;
                        transition: transform 0.3s ease;
                    }

                    .fdp-card:hover {
                        transform: scale(1.02);
                        z-index: 1;
                    }

                    .fdp-card:hover img {
                        transform: scale(1.1);
                    }

                    /* Fullscreen view styles */
                    .fdp-fullscreen {
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100vw;
                        height: 100vh;
                        background: rgba(0, 0, 0, 0.95);
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        z-index: 2500;
                        opacity: 0;
                        transition: opacity 0.3s ease;
                    }

                    .fdp-fullscreen.active {
                        opacity: 1;
                    }

                    .fdp-fullscreen img {
                        max-width: 90vw;
                        max-height: 90vh;
                        object-fit: contain;
                        border-radius: 15px;
                        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
                    }

                    .fdp-close-button {
                        position: fixed;
                        top: 20px;
                        right: 20px;
                        width: 50px;
                        height: 50px;
                        background: rgba(64, 121, 255, 0.3);
                        color: white;
                        border-radius: 50%;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        cursor: pointer;
                        font-size: 35px;
                        transition: all 0.3s ease;
                        z-index: 2501;
                        border: 2px solid rgba(255, 255, 255, 0.2);
                        backdrop-filter: blur(5px);
                    }

                    .fdp-close-button:hover {
                        background: rgba(64, 121, 255, 0.5);
                        transform: scale(1.1) rotate(90deg);
                        border-color: rgba(255, 255, 255, 0.4);
                    }
                `;
                document.head.appendChild(style);
            }

            // Create gallery content
            const titleContainer = document.createElement('div');
            titleContainer.className = 'fdp-title-container';

            const title = document.createElement('div');
            title.className = 'fdp-title';
            title.textContent = 'Faculty Development Programs';

            const subtitle = document.createElement('div');
            subtitle.className = 'fdp-subtitle';
            subtitle.textContent = 'Organising Autodesk Fusion 360 Workshop';

            titleContainer.appendChild(title);
            titleContainer.appendChild(subtitle);
            galleryContainer.appendChild(titleContainer);

            // Remove category titles by modifying the forEach loop
            Object.entries(fdpData.categories).forEach(([_, images]) => {
                const grid = document.createElement('div');
                grid.className = 'fdp-grid';

                images.forEach((path, index) => {
                    const card = document.createElement('div');
                    card.className = 'fdp-card';
                    card.style.height = `${Math.random() * (400 - 250) + 250}px`; // Random height

                    const img = document.createElement('img');
                    img.src = path;
                    img.loading = 'lazy';
                    img.alt = `FDP Image ${index + 1}`;

                    // Add click handler for fullscreen view
                    card.addEventListener('click', () => {
                        const fullscreenView = document.createElement('div');
                        fullscreenView.className = 'fdp-fullscreen';
                        
                        const fullscreenImg = document.createElement('img');
                        fullscreenImg.src = path;
                        
                        const closeButton = document.createElement('div');
                        closeButton.className = 'fdp-close-button';
                        closeButton.innerHTML = '&times;';
                        
                        const closeFullscreen = () => {
                            fullscreenView.style.opacity = '0';
                            setTimeout(() => document.body.removeChild(fullscreenView), 300);
                        };
                        
                        closeButton.addEventListener('click', closeFullscreen);
                        fullscreenView.addEventListener('click', (e) => {
                            if (e.target === fullscreenView) closeFullscreen();
                        });
                        
                        fullscreenView.appendChild(fullscreenImg);
                        fullscreenView.appendChild(closeButton);
                        document.body.appendChild(fullscreenView);
                        
                        requestAnimationFrame(() => fullscreenView.classList.add('active'));
                    });

                    card.appendChild(img);
                    grid.appendChild(card);
                });

                galleryContainer.appendChild(grid);
            });

            // Add close button
            const closeButton = document.createElement('div');
            closeButton.className = 'close-button';
            closeButton.innerHTML = '&times;';
            closeButton.addEventListener('click', () => {
                galleryContainer.style.opacity = '0';
                setTimeout(() => document.body.removeChild(galleryContainer), 300);
            });
            galleryContainer.appendChild(closeButton);

            // Show gallery with animation
            requestAnimationFrame(() => galleryContainer.classList.add('active'));
        }

        // Update navigateToProject function to handle FDP
        if (projectName === "FDP") {
            showFDPGallery();
            return;
        }

        // Add PCB Shaker data
        const pcbShakerData = {
            name: 'PCB Shaker',
            files: [
                '../projects/PCBShaker/pcb1.jpg',
                '../projects/PCBShaker/pcb2.mp4',
                '../projects/PCBShaker/pcb3.mp4',
                '../projects/PCBShaker/pcb4.mp4',
                '../projects/PCBShaker/pcb5.mp4'
            ]
        };

        // Add function to show PCB Shaker gallery
        function showPCBShakerGallery() {
            const galleryContainer = document.createElement('div');
            galleryContainer.className = 'pcb-gallery';
            document.body.appendChild(galleryContainer);

            // Add CSS for PCB Shaker gallery
            if (!document.querySelector('#pcb-style')) {
                const style = document.createElement('style');
                style.id = 'pcb-style';
                style.textContent = `
                    .pcb-gallery {
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100vw;
                        height: 100vh;
                        background: rgba(0, 0, 0, 0.95);
                        z-index: 2000;
                        padding: 40px;
                        opacity: 0;
                        transition: opacity 0.3s ease;
                        overflow-y: auto;
                        scrollbar-width: none;
                    }

                    .pcb-gallery::-webkit-scrollbar {
                        display: none;
                    }

                    .pcb-gallery.active {
                        opacity: 1;
                    }

                    .pcb-title {
                        color: white;
                        font-size: 2.8em;
                        text-transform: uppercase;
                        text-align: center;
                        margin-bottom: 30px;
                        background: linear-gradient(45deg, #ffffff, #4079ff);
                        -webkit-background-clip: text;
                        background-clip: text;
                        color: transparent;
                        position: relative;
                        cursor: pointer;
                    }

                    .pcb-title::after {
                        content: '';
                        position: absolute;
                        bottom: -5px;
                        left: 0;
                        width: 100%;
                        height: 2px;
                        background: linear-gradient(90deg, 
                            transparent 0%,
                            rgba(255, 255, 255, 0) 0%,
                            rgba(255, 255, 255, 0) 100%,
                            transparent 100%
                        );
                        transition: background 0.3s ease;
                    }

                    .pcb-title:hover::after {
                        background: linear-gradient(90deg, 
                            transparent 0%,
                            rgba(255, 255, 255, 0.8) 50%,
                            transparent 100%
                        );
                        background-size: 200% auto;
                        animation: shine 2s infinite linear;
                    }

                    .pcb-grid {
                        columns: 3;
                        column-gap: 15px;
                        max-width: 1400px;
                        margin: 0 auto;
                        padding: 20px;
                    }

                    @media (max-width: 1600px) { .pcb-grid { columns: 2; } }
                    @media (max-width: 768px) { .pcb-grid { columns: 1; } }

                    .pcb-card {
                        break-inside: avoid;
                        margin-bottom: 15px;
                        position: relative;
                        border-radius: 15px;
                        overflow: hidden;
                        cursor: pointer;
                        transform: translateZ(0);
                        transition: transform 0.3s ease;
                    }

                    .pcb-card img,
                    .pcb-card video {
                        width: 100%;
                        height: auto;
                        display: block;
                        border-radius: 15px;
                        transition: transform 0.3s ease;
                    }

                    .pcb-card:hover {
                        transform: scale(1.02);
                        z-index: 1;
                    }

                    .pcb-card:hover img,
                    .pcb-card:hover video {
                        transform: scale(1.1);
                    }

                    .pcb-fullscreen {
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100vw;
                        height: 100vh;
                        background: rgba(0, 0, 0, 0.95);
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        z-index: 2500;
                        opacity: 0;
                        transition: opacity 0.3s ease;
                    }

                    .pcb-fullscreen.active {
                        opacity: 1;
                    }

                    .pcb-fullscreen img,
                    .pcb-fullscreen video {
                        max-width: 90vw;
                        max-height: 90vh;
                        object-fit: contain;
                        border-radius: 15px;
                        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
                    }

                    .pcb-close-button {
                        position: fixed;
                        top: 20px;
                        right: 20px;
                        width: 50px;
                        height: 50px;
                        background: rgba(64, 121, 255, 0.3);
                        color: white;
                        border-radius: 50%;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        cursor: pointer;
                        font-size: 35px;
                        transition: all 0.3s ease;
                        z-index: 2501;
                        border: 2px solid rgba(255, 255, 255, 0.2);
                        backdrop-filter: blur(5px);
                    }

                    .pcb-close-button:hover {
                        background: rgba(64, 121, 255, 0.5);
                        transform: scale(1.1) rotate(90deg);
                        border-color: rgba(255, 255, 255, 0.4);
                    }
                `;
                document.head.appendChild(style);
            }

            // Create gallery content
            const title = document.createElement('div');
            title.className = 'pcb-title';
            title.textContent = 'PCB Shaker Project';
            galleryContainer.appendChild(title);

            const grid = document.createElement('div');
            grid.className = 'pcb-grid';

            pcbShakerData.files.forEach((path, index) => {
                const card = document.createElement('div');
                card.className = 'pcb-card';

                const isVideo = path.toLowerCase().endsWith('.mp4');
                const element = isVideo ? document.createElement('video') : document.createElement('img');
                
                element.src = path;
                element.loading = 'lazy';
                element.alt = isVideo ? `PCB Shaker Video ${index + 1}` : `PCB Shaker Image ${index + 1}`;

                if (isVideo) {
                    element.controls = true;
                    element.muted = true;
                    element.loop = true;
                    element.playsInline = true;

                    // Add hover events for video
                    card.addEventListener('mouseenter', () => {
                        element.play().catch(err => {
                            console.log('Autoplay failed:', err);
                            element.muted = true;
                            element.play().catch(e => console.log('Retry failed:', e));
                        });
                    });

                    card.addEventListener('mouseleave', () => {
                        element.pause();
                        element.currentTime = 0;
                    });
                }

                // Add click handler for fullscreen view
                card.addEventListener('click', () => {
                    const fullscreenView = document.createElement('div');
                    fullscreenView.className = 'pcb-fullscreen';
                    
                    const fullscreenElement = isVideo ? document.createElement('video') : document.createElement('img');
                    fullscreenElement.src = path;
                    
                    if (isVideo) {
                        fullscreenElement.controls = true;
                        fullscreenElement.autoplay = true;
                        fullscreenElement.loop = true;
                        fullscreenElement.muted = false;
                    }
                    
                    const closeButton = document.createElement('div');
                    closeButton.className = 'pcb-close-button';
                    closeButton.innerHTML = '&times;';
                    
                    const closeFullscreen = () => {
                        fullscreenView.style.opacity = '0';
                        setTimeout(() => document.body.removeChild(fullscreenView), 300);
                    };
                    
                    closeButton.addEventListener('click', closeFullscreen);
                    fullscreenView.addEventListener('click', (e) => {
                        if (e.target === fullscreenView) closeFullscreen();
                    });
                    
                    fullscreenView.appendChild(fullscreenElement);
                    fullscreenView.appendChild(closeButton);
                    document.body.appendChild(fullscreenView);
                    
                    requestAnimationFrame(() => fullscreenView.classList.add('active'));
                });

                card.appendChild(element);
                grid.appendChild(card);
            });

            galleryContainer.appendChild(grid);

            // Add close button
            const closeButton = document.createElement('div');
            closeButton.className = 'pcb-close-button';
            closeButton.innerHTML = '&times;';
            closeButton.addEventListener('click', () => {
                galleryContainer.style.opacity = '0';
                setTimeout(() => document.body.removeChild(galleryContainer), 300);
            });
            galleryContainer.appendChild(closeButton);

            // Show gallery with animation
            requestAnimationFrame(() => galleryContainer.classList.add('active'));
        }

        // Update navigateToProject function to handle PCB Shaker
        if (projectName === "PCB Shaker") {
            showPCBShakerGallery();
            return;
        }

        // Add CAD Design gallery handler in navigateToProject
        if (projectName === "CAD Design") {
            showCADGallery();
            return;
        }

        // Add this showCADGallery function in the appropriate location in your file
        function showCADGallery() {
            // Create gallery container
            const galleryContainer = document.createElement('div');
            galleryContainer.className = 'gallery-container';
            document.body.appendChild(galleryContainer);
            
            // Add CSS specific to CAD gallery
            if (!document.querySelector('#cad-gallery-style')) {
                const cadStyle = document.createElement('style');
                cadStyle.id = 'cad-gallery-style';
                cadStyle.textContent = `
                    .gallery-container {
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100vw;
                        height: 100vh;
                        background: rgba(0, 0, 0, 0.95);
                        z-index: 1100;
                        display: flex;
                        flex-direction: column;
                        justify-content: flex-start;
                        align-items: center;
                        padding: 20px;
                        overflow-y: auto;
                        opacity: 0;
                        transition: opacity 0.5s ease;
                        scrollbar-width: none;
                        -ms-overflow-style: none;
                    }
                    
                    .gallery-container::-webkit-scrollbar {
                        display: none;
                    }
                    
                    .gallery-container.active {
                        opacity: 1;
                    }
                    
                    .cad-title {
                        color: white;
                        font-size: 2.5em;
                        text-transform: uppercase;
                        text-align: center;
                        margin-bottom: 30px;
                        background: linear-gradient(45deg, #ffffff, #4079ff);
                        -webkit-background-clip: text;
                        background-clip: text;
                        color: transparent;
                        position: relative;
                        cursor: pointer;
                    }
                    
                    .cad-title::after {
                        content: '';
                        position: absolute;
                        bottom: -5px;
                        left: 0;
                        width: 100%;
                        height: 2px;
                        background: linear-gradient(90deg, 
                            transparent 0%,
                            rgba(255, 255, 255, 0) 0%,
                            rgba(255, 255, 255, 0) 100%,
                            transparent 100%
                        );
                        transition: background 0.3s ease;
                    }
                    
                    .cad-title:hover::after {
                        background: linear-gradient(90deg, 
                            transparent 0%,
                            rgba(255, 255, 255, 0.8) 50%,
                            transparent 100%
                        );
                        background-size: 200% auto;
                        animation: shine 2s infinite linear;
                    }
                    
                    .cad-category {
                        width: 100%;
                        max-width: 1400px;
                        margin-bottom: 40px;
                    }
                    
                    .cad-category-title {
                        color: white;
                        font-size: 1.8em;
                        text-transform: uppercase;
                        margin-bottom: 20px;
                        background: linear-gradient(45deg, #ffffff, #4079ff);
                        -webkit-background-clip: text;
                        background-clip: text;
                        color: transparent;
                        position: relative;
                        display: inline-block;
                        cursor: pointer;
                    }
                    
                    .cad-category-title::after {
                        content: '';
                        position: absolute;
                        bottom: -5px;
                        left: 0;
                        width: 100%;
                        height: 2px;
                        background: linear-gradient(90deg, 
                            transparent 0%,
                            rgba(255, 255, 255, 0) 0%,
                            rgba(255, 255, 255, 0) 100%,
                            transparent 100%
                        );
                        transition: background 0.3s ease;
                    }
                    
                    .cad-category-title:hover::after {
                        background: linear-gradient(90deg, 
                            transparent 0%,
                            rgba(255, 255, 255, 0.8) 50%,
                            transparent 100%
                        );
                        background-size: 200% auto;
                        animation: shine 2s infinite linear;
                    }
                    
                    @keyframes shine {
                        0% { background-position: -200% center; }
                        100% { background-position: 200% center; }
                    }
                    
                    /* Update gallery-masonry class for CAD gallery */
                    .cad-category .gallery-masonry {
                        columns: 4;
                        column-gap: 5px; /* Added gap between columns */
                        max-width: 1400px;
                        margin: 0 auto;
                        padding: 10px;
                    }
                    
                    @media (max-width: 1400px) { .cad-category .gallery-masonry { columns: 3; } }
                    @media (max-width: 900px) { .cad-category .gallery-masonry { columns: 2; } }
                    @media (max-width: 600px) { .cad-category .gallery-masonry { columns: 1; } }
                    
                    /* Update gallery-item-container for CAD gallery */
                    .cad-category .gallery-item-container {
                        break-inside: avoid;
                        margin-bottom: 5px; /* Added gap between rows */
                        position: relative;
                        border-radius: 10px;
                        overflow: hidden;
                        cursor: pointer;
                        transform: translateZ(0);
                        transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                        transform-origin: center;
                        scale: 0.92; /* Make images slightly smaller by default */
                        opacity: 0.85;
                    }
                    
                    .cad-category .gallery-item-container img {
                        width: 100%;
                        height: 100%;
                        object-fit: cover;
                        border-radius: 10px;
                        transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    }
                    
                    .cad-category .gallery-item-container:hover {
                        transform: scale(1.08); /* Larger hover expansion */
                        z-index: 10;
                        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
                        opacity: 1;
                    }
                    
                    .cad-category .gallery-item-container:hover img {
                        transform: scale(1.05);
                    }
                `;
                document.head.appendChild(cadStyle);
            }
            
            // Add main title
            const mainTitle = document.createElement('div');
            mainTitle.className = 'cad-title';
            mainTitle.textContent = 'CAD Designs';
            galleryContainer.appendChild(mainTitle);
            
            // Define CAD categories with their images
            const cadCategories = {
                'Boat CAD': [
                    '../projects/cad/solidwork/BoatCAD/boat1.png',
                    '../projects/cad/solidwork/BoatCAD/boat2.png',
                    
                    
                    '../projects/cad/solidwork/BoatCAD/boat5.png',
                    '../projects/cad/solidwork/BoatCAD/boat6.png'
                ],
                'Gripping Mechanism': [
                    '../projects/cad/solidwork/GrippingMech/GM (1).png',
                    '../projects/cad/solidwork/GrippingMech/GM (2).png',
                    '../projects/cad/solidwork/GrippingMech/GM (3).png',
                    '../projects/cad/solidwork/GrippingMech/GM (4).png',
                    '../projects/cad/solidwork/GrippingMech/GM (5).png',
                    '../projects/cad/solidwork/GrippingMech/GM (6).png'
                ],
                'Mini Drone': [
                    '../projects/cad/solidwork/MiniDrone/MD1.png',
                    '../projects/cad/solidwork/MiniDrone/MD2.png',
                    '../projects/cad/solidwork/MiniDrone/MD3.png',
                    '../projects/cad/solidwork/MiniDrone/MD4.png',
                    '../projects/cad/solidwork/MiniDrone/MD5.jpg'
                ],
                'Aero-Model': [
                    '../projects/cad/solidwork/Plane/Aero (1).jpg',
                    '../projects/cad/solidwork/Plane/Aero (2).jpg',
                    '../projects/cad/solidwork/Plane/Aero (3).jpg',
                    '../projects/cad/solidwork/Plane/Aero (4).jpg',
                    '../projects/cad/solidwork/Plane/Aero (5).jpg',
                    '../projects/cad/solidwork/Plane/Aero (6).jpg'
                ],
                'Remote Box': [
                    '../projects/cad/solidwork/RemoteBox/RB (1).png',
                    '../projects/cad/solidwork/RemoteBox/RB (2).png'
                ]
            };
            
            // Create each category section
            Object.entries(cadCategories).forEach(([category, images]) => {
                const categorySection = document.createElement('div');
                categorySection.className = 'cad-category';
                
                const categoryTitle = document.createElement('div');
                categoryTitle.className = 'cad-category-title';
                categoryTitle.textContent = category;
                categorySection.appendChild(categoryTitle);
                
                // Create masonry grid for images
                const masonryGrid = document.createElement('div');
                masonryGrid.className = 'gallery-masonry';
                
                // Add images to grid with same masonry layout as other galleries
                images.forEach(imagePath => {
                    const itemContainer = document.createElement('div');
                    itemContainer.className = 'gallery-item-container';
                    
                    // More varied random heights for better masonry effect
                    const randomHeight = Math.floor(Math.random() * (400 - 180) + 180); // Random height between 180-400px
                    const randomAspect = [4/3, 16/9, 3/2, 1/1, 2/3, 9/16][Math.floor(Math.random() * 6)]; // Random aspect ratios
                    
                    itemContainer.style.height = `${randomHeight}px`;
                    itemContainer.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.2)';
                    
                    const img = document.createElement('img');
                    img.src = imagePath;
                    img.alt = `${category} - ${imagePath.split('/').pop().split('.')[0]}`;
                    img.loading = 'lazy';
                    
                    // Randomize object-fit for more variety
                    const objectFitOptions = ['cover', 'contain'];
                    img.style.objectFit = objectFitOptions[Math.floor(Math.random() * 2)];
                    
                    // Add click handler for fullscreen view
                    itemContainer.addEventListener('click', () => {
                        const fullscreenView = document.createElement('div');
                        fullscreenView.className = 'fullscreen-view';
                        fullscreenView.style.cssText = `
                            position: fixed;
                            top: 0;
                            left: 0;
                            width: 100vw;
                            height: 100vh;
                            background: rgba(0, 0, 0, 0.95);
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            z-index: 2000;
                            opacity: 0;
                            transition: opacity 0.3s ease;
                        `;
                        
                        const fullscreenImg = document.createElement('img');
                        fullscreenImg.src = imagePath;
                        fullscreenImg.style.cssText = `
                            max-width: 90vw;
                            max-height: 90vh;
                            object-fit: contain;
                            border-radius: 20px; /* Add curved corners */
                            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
                        `;
                        
                        // Remove or comment out these lines to hide title
                        // const fullscreenTitle = document.createElement('div');
                        // fullscreenTitle.className = 'fullscreen-title';
                        // fullscreenTitle.textContent = imagePath.split('/').pop().split('.')[0];
                        
                        const closeButton = document.createElement('div');
                        closeButton.innerHTML = '&times;';
                        closeButton.style.cssText = `
                            position: fixed;
                            top: 20px;
                            right: 20px;
                            width: 50px;
                            height: 50px;
                            background: rgba(64, 121, 255, 0.3);
                            color: white;
                            border-radius: 50%;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            cursor: pointer;
                            font-size: 35px;
                            transition: all 0.3s ease;
                            z-index: 2001;
                            border: 2px solid rgba(255, 255, 255, 0.2);
                        `;
                        
                        closeButton.addEventListener('click', () => {
                            fullscreenView.style.opacity = '0';
                            setTimeout(() => document.body.removeChild(fullscreenView), 300);
                        });
                        
                        fullscreenView.addEventListener('click', (e) => {
                            if (e.target === fullscreenView) {
                                fullscreenView.style.opacity = '0';
                                setTimeout(() => document.body.removeChild(fullscreenView), 300);
                            }
                        });
                        
                        fullscreenView.appendChild(fullscreenImg);
                        // Remove this line
                        // fullscreenView.appendChild(fullscreenTitle);
                        fullscreenView.appendChild(closeButton);
                        document.body.appendChild(fullscreenView);
                        
                        setTimeout(() => {
                            fullscreenView.style.opacity = '1';
                        }, 50);
                    });
                    
                    itemContainer.appendChild(img);
                    masonryGrid.appendChild(itemContainer);
                });
                
                categorySection.appendChild(masonryGrid);
                galleryContainer.appendChild(categorySection);
            });
            
            // Add close button
            const closeButton = document.createElement('div');
            closeButton.className = 'gallery-close-button';
            closeButton.innerHTML = '&times;';
            closeButton.addEventListener('click', () => {
                galleryContainer.style.opacity = '0';
                setTimeout(() => document.body.removeChild(galleryContainer), 300);
            });
            galleryContainer.appendChild(closeButton);
            
            // Show gallery with animation
            setTimeout(() => {
                galleryContainer.classList.add('active');
            }, 50);
        }
    }

    // Add Blender projects data with actual file paths
    const blenderProjects = [
        {
            name: 'Apple',
            files: [
                '../projects/blender/apple/a.png',
                '../projects/blender/apple/a1.png',
                '../projects/blender/apple/a2.mp4',
                '../projects/blender/apple/a3.png',
                '../projects/blender/apple/a4.png',
                '../projects/blender/apple/a2.png'
            ]
        },
        {
            name: 'Aquabot',
            files: [
                '../projects/blender/aquabot/aqua1.png',
                '../projects/blender/aquabot/aqua2.mp4',
                '../projects/blender/aquabot/aqua3.png'
            ]
        },
        {
            name: 'Basketball',
            files: [
                '../projects/blender/basketball/bb1.mp4',
                '../projects/blender/basketball/bb1.png',
                '../projects/blender/basketball/bb2.png',
                '../projects/blender/basketball/bb3.png',
                '../projects/blender/basketball/bb4.png',
                '../projects/blender/basketball/bb5.png'
            ]
        },
        {
            name: 'CCTV',
            files: [
                
                '../projects/blender/cctv/cctv1.mp4',
                '../projects/blender/cctv/cctv2.mp4',
                '../projects/blender/cctv/cctv3.mp4',
                '../projects/blender/cctv/cctv4.png',
                '../projects/blender/cctv/cctv5.png',
                '../projects/blender/cctv/cctv6.png',
                '../projects/blender/cctv/cctv7.png'
            ]
        },
        {
            name: 'Cube',
            files: [
                '../projects/blender/cube/CUBE1.png',
                '../projects/blender/cube/CUBE2.png',
                '../projects/blender/cube/CUBE3.png',
                '../projects/blender/cube/CUBE4.png',
                '../projects/blender/cube/CUBE5.png',
                '../projects/blender/cube/CUBE6.png'
            ],
            model: '../models/cube/cube.glb'
        },
        {
            name: 'Octopus',
            files: [
                '../projects/blender/octopus/oct1.png',
                '../projects/blender/octopus/oct2.png',
                '../projects/blender/octopus/oct3.mp4',
                '../projects/blender/octopus/oct4.png',
                '../projects/blender/octopus/oct5.png',
                '../projects/blender/octopus/oct6.png',
                '../projects/blender/octopus/oct7.png'
            ]
        },
        {
            name: 'Parametric Design',
            files: [
                '../projects/blender/perametricdesign/p3.mp4',
                '../projects/blender/perametricdesign/pd1.png',
                '../projects/blender/perametricdesign/pd2.png',
                '../projects/blender/perametricdesign/pd4.png',
                '../projects/blender/perametricdesign/pd5.png',
                '../projects/blender/perametricdesign/pd6.png'
            ]
        },
        {
            name: 'Robot',
            files: [
                '../projects/blender/robot/r1.png',
                '../projects/blender/robot/r2.png',
                '../projects/blender/robot/r3.png',
                '../projects/blender/robot/r4.png',
                '../projects/blender/robot/r5.mp4',
                '../projects/blender/robot/r5.png'
            ]
        },
        {
            name: 'Scenery',
            files: [
                '../projects/blender/scenery/s1.png',
                '../projects/blender/scenery/s2.png',
                '../projects/blender/scenery/s3.png',
                '../projects/blender/scenery/s4.png',
                '../projects/blender/scenery/s5.png',
                '../projects/blender/scenery/s6.png',
                '../projects/blender/scenery/s7.png',
                '../projects/blender/scenery/s8.png'
            ]
        },
        {
            name: 'Spider',
            files: [
                '../projects/blender/spider/spider1.png',
                '../projects/blender/spider/spider2.png',
                '../projects/blender/spider/spider3.png',
                '../projects/blender/spider/spider4.png',
                '../projects/blender/spider/spider5.mp4',
                '../projects/blender/spider/spider5.png'
            ],
            model: '../models/spidercube/spidercube.glb'
        },
        {
            name: 'Sword',
            files: [
                '../projects/blender/sword/sw1.mp4',
                '../projects/blender/sword/sw2.png',
                '../projects/blender/sword/sw3.png'
            ]
        },
        {
            name: 'Team Robolution',
            files: [
                '../projects/blender/teamrobolution/tr1.mp4',
                '../projects/blender/teamrobolution/tr2.png',
                '../projects/blender/teamrobolution/tr3.png'
            ]
        },
        {
            name: 'Low Poly Working Man',
            files: [], // Empty files array since we only want to show the 3D model
            model: '../models/man/man.glb'
        },
        {
            name: 'List lambi hai',
            files: ['../assets/llm.jpg']
        }
    ];

    // Function to check which items are visible and handle model visibility
    function checkVisibleItems() {
        if (!projectListContainer) return null; // Add safety check
        
        const containerRect = projectListContainer.getBoundingClientRect();
        const projectNames = projectListContainer.querySelectorAll('.project-name');
        
        // Make all project names visible
        projectNames.forEach(name => {
            name.style.opacity = '1';
            name.style.color = 'rgba(255, 255, 255, 0.7)';
        });
        
        // Find the most centered item
        let bestMatch = null;
        let bestDistance = Infinity;
        
        projectNames.forEach(name => {
            const nameRect = name.getBoundingClientRect();
            const nameCenter = nameRect.top + nameRect.height / 2;
            const containerCenter = containerRect.top + containerRect.height / 2;
            const distance = Math.abs(nameCenter - containerCenter);
            
            if (distance < bestDistance) {
                bestDistance = distance;
                bestMatch = name;
            }
        });
        
        // Highlight the centered item and handle model visibility
        if (bestMatch) {
            bestMatch.style.color = 'white';
            bestMatch.style.textShadow = '0 0 20px rgba(255, 255, 255, 0.8)';
            
            // Find the corresponding project
            const projectName = bestMatch.textContent;
            const project = blenderProjects.find(p => p.name === projectName);
            
            // Handle 3D model visibility
            const existingContainer = document.querySelector('.model-container');
            if (project && project.model) {
                if (!existingContainer || existingContainer.dataset.modelPath !== project.model) {
                    // Clear existing model if it's different
                    if (existingContainer) {
                        if (existingContainer.cleanup && typeof existingContainer.cleanup === 'function') {
                            existingContainer.cleanup();
                        }
                        document.body.removeChild(existingContainer);
                    }
                    
                    // Create and load new model
                    const modelContainer = document.createElement('div');
                    modelContainer.className = 'model-container';
                    modelContainer.dataset.modelPath = project.model;
                    modelContainer.style.zIndex = '2000'; // Ensure model is on top
                    document.body.appendChild(modelContainer);
                    
                    modelContainer.cleanup = loadProjectModel(project.model, modelContainer);
                }
            } else if (existingContainer) {
                // Remove model if centered project doesn't have one
                if (existingContainer.cleanup && typeof existingContainer.cleanup === 'function') {
                    existingContainer.cleanup();
                }
                document.body.removeChild(existingContainer);
            }
        }
        
        return bestMatch;
    }

    // Function to resize container based on project name
    function resizeContainer() {
        const centerProject = checkVisibleItems();
        if (centerProject) {
            // Create temporary span to measure text width accurately
            const tempSpan = document.createElement('span');
            tempSpan.style.visibility = 'hidden';
            tempSpan.style.position = 'absolute';
            tempSpan.style.font = window.getComputedStyle(centerProject).font;
            tempSpan.style.fontWeight = 'bold';
            tempSpan.textContent = centerProject.textContent;
            document.body.appendChild(tempSpan);
            
            // Calculate width with padding
            const textWidth = tempSpan.offsetWidth;
            const paddingWidth = 80;
            const minWidth = 200;
            const maxWidth = 500;
            
            // Set width between min and max
            const calculatedWidth = Math.min(maxWidth, Math.max(minWidth, textWidth + paddingWidth));
            projectListContainer.style.width = `${calculatedWidth}px`;
            
            // Clean up
            document.body.removeChild(tempSpan);
        }
    }

    // Enhanced loadProjectModel function with improved lighting
    function loadProjectModel(modelPath, container) {
        let modelScene, modelCamera, modelRenderer, modelObject;
        let isMouseDown = false;
        let previousMouseX = 0;
        let previousMouseY = 0;
        let targetZoom = 5;
        let currentZoom = 5;
        let autoRotationSpeed = 0.002;
        let isCubeModel = modelPath.includes('cube/cube');
        let isSpiderModel = modelPath.includes('spidercube');
        let isManModel = modelPath.includes('man/man');
        
        // Set up scene
        modelScene = new THREE.Scene();
        modelCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        
        // High-quality renderer setup
        modelRenderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true,
            powerPreference: "high-performance"
        });
        modelRenderer.setSize(window.innerWidth, window.innerHeight);
        modelRenderer.setClearColor(0x000000, 0);
        modelRenderer.setPixelRatio(window.devicePixelRatio);
        modelRenderer.shadowMap.enabled = true;
        modelRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // Create render container
        const modelRenderContainer = document.createElement('div');
        modelRenderContainer.style.position = 'fixed';
        modelRenderContainer.style.top = '10%';  // Changed from 0 to 10%
        modelRenderContainer.style.left = '10%';  // Changed from 0 to 10%
        modelRenderContainer.style.width = '80%';  // Changed from 100% to 80%
        modelRenderContainer.style.height = '80%';  // Changed from 100% to 80%
        modelRenderContainer.style.zIndex = '2000';
        modelRenderContainer.appendChild(modelRenderer.domElement);
        document.body.appendChild(modelRenderContainer);
        
        // Enhanced lighting setup
        // Ambient light for base illumination
        const ambientLight = new THREE.AmbientLight(0xffffff, 2.0);
        modelScene.add(ambientLight);
        
        // Key light (main directional light)
        const keyLight = new THREE.DirectionalLight(0xffffff, 3.0);
        keyLight.position.set(5, 5, 5);
        keyLight.castShadow = true;
        modelScene.add(keyLight);
        
        // Fill light (softer light from opposite direction)
        const fillLight = new THREE.DirectionalLight(0xaaeeff, 2.0);
        fillLight.position.set(-5, 2, -5);
        modelScene.add(fillLight);
        
        // Rim light (edge highlight)
        const rimLight = new THREE.DirectionalLight(0xffffee, 2.0);
        rimLight.position.set(0, -5, -5);
        modelScene.add(rimLight);
        
        // Ground plane for shadow casting
        const groundGeometry = new THREE.PlaneGeometry(100, 100);
        const groundMaterial = new THREE.ShadowMaterial({ opacity: 0.3 });
        const groundPlane = new THREE.Mesh(groundGeometry, groundMaterial);
        groundPlane.rotation.x = -Math.PI / 2;
        groundPlane.position.y = -2;
        groundPlane.receiveShadow = true;
        modelScene.add(groundPlane);
        
        // Position camera
        modelCamera.position.set(0, 1, 5);
        modelCamera.lookAt(0, 0, 0);
        
        // Load model
        const loader = new GLTFLoader();
        loader.load(modelPath, (gltf) => {
            modelObject = gltf.scene;
            
            // Center model
            const box = new THREE.Box3().setFromObject(modelObject);
            const center = box.getCenter(new THREE.Vector3());
            modelObject.position.sub(center);
            
            // Enable shadows
            modelObject.traverse((node) => {
                if (node.isMesh) {
                    node.castShadow = true;
                    node.receiveShadow = true;
                    if (node.material) {
                        node.material.emissive = new THREE.Color(0x222222);
                    }
                }
            });
            
            // Model-specific adjustments
            if (isSpiderModel) {
                modelObject.scale.set(1.0, 1.0, 1.0); // Reduced from 2.0
                modelObject.rotation.y = Math.PI / 4;
                
                // Add extra lights for spider model
                const spiderLight1 = new THREE.PointLight(0x00ffff, 2.0, 10);
                spiderLight1.position.set(2, 2, 2);
                modelScene.add(spiderLight1);
                
                const spiderLight2 = new THREE.PointLight(0xff00ff, 2.0, 10);
                spiderLight2.position.set(-2, 1, 2);
                modelScene.add(spiderLight2);
            } 
            else if (isCubeModel) {
                modelObject.scale.set(2.5, 2.5, 2.5);
                
                // Add extra lights for cube model
                const cubeLight1 = new THREE.PointLight(0x66ffaa, 2.0, 10);
                cubeLight1.position.set(2, 2, 2);
                modelScene.add(cubeLight1);
                
                const cubeLight2 = new THREE.PointLight(0x6699ff, 2.0, 10);
                cubeLight2.position.set(-2, -2, 2);
                modelScene.add(cubeLight2);
            }
            else if (isManModel) {
                modelObject.scale.set(0.4, 0.4, 0.4);
                modelObject.rotation.y = Math.PI / 6;
                modelObject.position.y = -1.0; // Move the model down to bottom center
                
                // Add extra lights for man model
                const manLight1 = new THREE.SpotLight(0xffffcc, 2.0);
                manLight1.position.set(3, 3, 3);
                manLight1.angle = Math.PI / 6;
                manLight1.castShadow = true;
                modelScene.add(manLight1);
                
                const manLight2 = new THREE.PointLight(0xaaccff, 1.5, 10);
                manLight2.position.set(-2, 1, 2);
                modelScene.add(manLight2);
            }
            
            modelScene.add(modelObject);
            animate();
        });
        
        // Animation function
        function animate() {
            const animationId = requestAnimationFrame(animate);
            container.dataset.animationId = animationId;
            
            if (modelObject) {
                // Smooth camera zoom
                currentZoom += (targetZoom - currentZoom) * 0.1;
                modelCamera.position.z = currentZoom;
                
                // Auto-rotation when not being dragged
                if (!isMouseDown) {
                    modelObject.rotation.y += autoRotationSpeed;
                }
            }
            
            modelRenderer.render(modelScene, modelCamera);
        }
        
        // Mouse interaction setup
        const modelInteractionArea = document.createElement('div');
        modelInteractionArea.style.position = 'fixed';
        modelInteractionArea.style.left = '20%';
        modelInteractionArea.style.top = '20%';
        modelInteractionArea.style.width = '60%';
        modelInteractionArea.style.height = '60%';
        modelInteractionArea.style.zIndex = '2001';
        modelInteractionArea.style.cursor = 'grab';
        document.body.appendChild(modelInteractionArea);
        
        // Mouse event handlers
        modelInteractionArea.addEventListener('mousedown', (e) => {
            if (e.button === 0) {
                isMouseDown = true;
                previousMouseX = e.clientX;
                previousMouseY = e.clientY;
                modelInteractionArea.style.cursor = 'grabbing';
            }
        });
        
        document.addEventListener('mouseup', () => {
            isMouseDown = false;
            modelInteractionArea.style.cursor = 'grab';
        });
        
        modelInteractionArea.addEventListener('mousemove', (e) => {
            if (isMouseDown && modelObject) {
                const deltaX = (e.clientX - previousMouseX) * 0.01;
                const deltaY = (e.clientY - previousMouseY) * 0.01;
                modelObject.rotation.y += deltaX;
                modelObject.rotation.x += deltaY;
                previousMouseX = e.clientX;
                previousMouseY = e.clientY;
            }
        });
        
        modelInteractionArea.addEventListener('wheel', (e) => {
            e.preventDefault();
            targetZoom = Math.max(3, Math.min(8, targetZoom + e.deltaY * 0.005));
        });
        
        // Create close button for model
        const modelCloseButton = document.createElement('div');
        modelCloseButton.className = 'mindmap-close';
        modelCloseButton.innerHTML = '&times;';
        modelCloseButton.style.position = 'fixed';
        modelCloseButton.style.top = '20px';
        modelCloseButton.style.right = '20px';
        modelCloseButton.style.zIndex = '2002';
        modelCloseButton.addEventListener('click', () => {
            // First remove the model container
            if (document.body.contains(modelRenderContainer)) {
                document.body.removeChild(modelRenderContainer);
            }
            
            // Then remove the interaction area
            if (document.body.contains(modelInteractionArea)) {
                document.body.removeChild(modelInteractionArea);
            }
            
            // Finally remove the close button itself
            if (document.body.contains(modelCloseButton)) {
                document.body.removeChild(modelCloseButton);
            }
            
            // Call cleanup function if it exists
            if (container.cleanup && typeof container.cleanup === 'function') {
                container.cleanup();
            }
            
            // Remove the container itself
            if (document.body.contains(container)) {
                document.body.removeChild(container);
            }
        });
        document.body.appendChild(modelCloseButton);
        
        // Update cleanup function to also remove close button
        const originalCleanup = container.cleanup;
        container.cleanup = function() {
            if (document.body.contains(modelCloseButton)) {
                document.body.removeChild(modelCloseButton);
            }
            if (originalCleanup) {
                originalCleanup();
            }
        };
        
        // Adjust model sizes
        if (isSpiderModel) {
            modelObject.scale.set(1.0, 1.0, 1.0); // Reduced from 2.0
            modelObject.rotation.y = Math.PI / 4;
        } 
        else if (isManModel) {
            modelObject.scale.set(0.4, 0.4, 0.4);
            modelObject.rotation.y = Math.PI / 6;
            modelObject.position.y = -1.0; // Move the model down to bottom center
        }
        else if (isCubeModel) {
            modelObject.scale.set(2.5, 2.5, 2.5);
        }
        
        // Cleanup function
        return function cleanup() {
            if (container.dataset.animationId) {
                cancelAnimationFrame(parseInt(container.dataset.animationId));
            }
            if (document.body.contains(modelRenderContainer)) {
                document.body.removeChild(modelRenderContainer);
            }
            if (document.body.contains(modelInteractionArea)) {
                document.body.removeChild(modelInteractionArea);
            }
            modelRenderer.dispose();
        };
    }

    // Update showBlenderGallery function
    function showBlenderGallery() {
        const galleryContainer = document.createElement('div');
        galleryContainer.className = 'blender-gallery';
        document.body.appendChild(galleryContainer);

        // Add CSS for blender gallery
        if (!document.querySelector('#blender-style')) {
            const blenderStyle = document.createElement('style');
            blenderStyle.id = 'blender-style';
            blenderStyle.textContent = `
                .blender-gallery {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100vw;
                    height: 100vh;
                    background: rgba(0, 0, 0, 0.95);
                    z-index: 1100;
                    display: flex;
                    justify-content: flex-start;
                    align-items: center;
                    opacity: 0;
                    transition: opacity 0.5s ease;
                }

                .blender-gallery.active {
                    opacity: 1;
                }

                .blender-container {
                    display: flex;
                    align-items: center;
                    margin-left: 50px;
                    position: relative;
                }

                .blender-title {
                    color: white;
                    font-size: 2.5em;
                    text-transform: uppercase;
                    letter-spacing: 3px;
                    text-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
                    position: relative;
                    z-index: 2;
                    transition: color 0.3s ease;
                }

                .blender-title:hover {
                    background-image: linear-gradient(90deg, #40ffaa, #4079ff, #40ffaa, #4079ff, #40ffaa);
                    background-size: 400% 100%;
                    background-clip: text;
                    -webkit-background-clip: text;
                    color: transparent;
                    animation: gradient-shine 3s linear infinite;
                }

                @keyframes gradient-shine {
                    0% {
                        background-position: 0% 50%;
                    }
                    100% {
                        background-position: 100% 50%;
                    }
                }

                .blender-title::after {
                    content: '';
                    position: absolute;
                    bottom: -5px;
                    left: 0;
                    width: 100%;
                    height: 2px;
                    background: linear-gradient(90deg, 
                        transparent 0%,
                        rgba(255, 255, 255, 0.8) 50%,
                        transparent 100%
                    );
                    background-size: 200% auto;
                    animation: shine 2s infinite linear;
                }

                @keyframes shine {
                    0% {
                        background-position: -200% center;
                    }
                    100% {
                        background-position: 200% center;
                    }
                }

                .project-list-container {
                    height: auto;
                    max-height: 60px;
                    overflow: hidden;
                    margin-left: 20px;
                    position: relative;
                    width: auto;
                    min-width: 200px;
                    max-width: 400px;
                    background: rgba(0, 0, 0, 0);
                    border-radius: 30px;
                    transition: width 0.3s ease, height 0.3s ease;
                    z-index: 1999;
                }

                .project-list-container:hover {
                    overflow-y: auto;
                }

                .project-list {
                    position: relative;
                    display: flex;
                    flex-direction: column;
                    padding: 10px;
                    transition: transform 0.3s ease;
                }

                .project-name {
                    color: rgba(255, 255, 255, 0.7);
                    font-size: 1.2em;
                    font-weight: bold;
                    padding: 10px 20px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    text-transform: capitalize;
                    position: relative;
                    white-space: nowrap;
                    opacity: 1;
                }

                .project-name:hover {
                    color: white;
                    text-shadow: 0 0 20px rgba(255, 255, 255, 0.8);
                    transform: translateX(10px);
                }

                .project-name:hover::after {
                    content: '';
                    position: absolute;
                    bottom: 5px;
                    left: 20px;
                    width: 70%;
                    height: 2px;
                    background: linear-gradient(90deg, 
                        rgba(255, 255, 255, 0.2) 0%,
                        rgba(255, 255, 255, 0.8) 50%,
                        rgba(255, 255, 255, 0.2) 100%
                    );
                    background-size: 200% auto;
                    animation: shine 1.5s infinite linear;
                }

                /* Custom scrollbar for project list */
                .project-list-container::-webkit-scrollbar {
                    width: 5px;
                }

                .project-list-container::-webkit-scrollbar-track {
                    background: transparent;
                }

                .project-list-container::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.2);
                    border-radius: 10px;
                }

                .project-list-container::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.4);
                }

                /* Gallery container styles */
                .gallery-container {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100vw;
                    height: 100vh;
                    background: rgba(0, 0, 0, 0.95);
                    z-index: 2500;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    opacity: 0;
                    transition: opacity 0.3s ease;
                }

                .gallery-container.active {
                    opacity: 1;
                }

                .gallery-grid {
                    display: flex;
                    flex-direction: column;
                    gap: 2rem;
                    padding: 2rem;
                    max-width: 90vw;
                    max-height: 90vh;
                    overflow: hidden;
                }

                .gallery-row {
                    display: flex;
                    gap: 2rem;
                    animation: scroll 60s linear infinite;
                }

                .gallery-row:nth-child(2) {
                    animation-direction: reverse;
                }

                @keyframes scroll {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-100%); }
                }

                .gallery-item {
                    width: 300px;
                    height: 200px;
                    object-fit: cover;
                    border-radius: 15px;
                    cursor: pointer;
                    position: relative;
                    transition: transform 0.3s ease, box-shadow 0.3s ease;
                    transform-style: preserve-3d;
                    perspective: 1000px;
                }

                .gallery-item::before {
                    content: '';
                    position: absolute;
                    inset: 0;
                    border-radius: 15px;
                    background: radial-gradient(
                        800px circle at var(--mouse-x) var(--mouse-y),
                        rgba(255, 255, 255, 0.1),
                        transparent 40%
                    );
                    opacity: 0;
                    transition: opacity 0.3s ease;
                }

                .gallery-item:hover {
                    transform: translateY(-10px) rotateX(10deg) rotateY(10deg);
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
                    animation: bounce 0.5s ease;
                }

                .gallery-item:hover::before {
                    opacity: 1;
                }

                @keyframes bounce {
                    0%, 100% { transform: translateY(-10px); }
                    50% { transform: translateY(-20px); }
                }

                .mindmap-close {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    width: 40px;
                    height: 40px;
                    background: rgba(30, 30, 30, 0.9);
                    color: white;
                    border-radius: 50%;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    cursor: pointer;
                    font-size: 24px;
                    z-index: 3000;
                    transition: background-color 0.3s ease, transform 0.3s ease;
                }

                .mindmap-close:hover {
                    background: rgba(50, 50, 50, 0.9);
                    transform: scale(1.1);
                }
            `;
            document.head.appendChild(blenderStyle);
        }

        // Create the container for Blender title and project list
        const blenderContainer = document.createElement('div');
        blenderContainer.className = 'blender-container';

        // Create the horizontal "Blender" title
        const blenderTitle = document.createElement('div');
        blenderTitle.className = 'blender-title';
        blenderTitle.textContent = 'Blender';
        blenderTitle.style.cursor = 'pointer';
        blenderTitle.addEventListener('click', () => {
            window.open('https://drive.google.com/drive/folders/1PVrpcL7b9y6y_-NsI3hm_a2y52bPhnnE', '_blank');
        });
        blenderContainer.appendChild(blenderTitle);

        // Create transparent container for project list
        const projectListContainer = document.createElement('div');
        projectListContainer.className = 'project-list-container';

        // Create project list
        const projectList = document.createElement('div');
        projectList.className = 'project-list';

        // Add projects
        blenderProjects.forEach((project, index) => {
            const projectName = document.createElement('div');
            projectName.className = 'project-name';
            projectName.textContent = project.name;
            
            projectName.addEventListener('click', () => {
                // Special handling for "List lambi hai"
                if (project.name === "List lambi hai") {
                    openFullView('../assets/llm.jpg', false);
                    return;
                }
                
                showProjectGallery(project);
                
                // Check if this project has a 3D model
                if (project.model) {
                    // Clear any existing model container
                    const existingContainer = document.querySelector('.model-container');
                    if (existingContainer) {
                        // Cancel any running animation before removing
                        if (existingContainer.dataset.animationId) {
                            cancelAnimationFrame(parseInt(existingContainer.dataset.animationId));
                        }
                        if (existingContainer.cleanup && typeof existingContainer.cleanup === 'function') {
                            existingContainer.cleanup();
                        }
                        document.body.removeChild(existingContainer);
                    }
                    
                    console.log("Loading 3D model:", project.model);
                    
                    // Create container for 3D model
                    const modelContainer = document.createElement('div');
                    modelContainer.className = 'model-container';
                    document.body.appendChild(modelContainer);
                    
                    // Load the 3D model and store cleanup function
                    modelContainer.cleanup = loadProjectModel(project.model, modelContainer);
                }
            });

            projectList.appendChild(projectName);
        });

        // Initial check for visible items
        setTimeout(() => {
            checkVisibleItems();
            resizeContainer();
        }, 100);

        // Add scroll event listener to handle project visibility
        projectListContainer.addEventListener('scroll', () => {
            const centerProject = checkVisibleItems();
            resizeContainer();
            
            // Auto-load 3D models when scrolling to their names
            if (centerProject) {
                const projectName = centerProject.textContent;
                const project = blenderProjects.find(p => p.name === projectName);
                
                // If this project has a 3D model, automatically load it
                if (project && project.model) {
                    // Clear any existing model container
                    const existingContainer = document.querySelector('.model-container');
                    if (existingContainer) {
                        // Skip if the same model is already loaded
                        if (existingContainer.dataset.modelPath === project.model) {
                            return;
                        }
                        
                        // Cancel any running animation before removing
                        if (existingContainer.dataset.animationId) {
                            cancelAnimationFrame(parseInt(existingContainer.dataset.animationId));
                        }
                        if (existingContainer.cleanup && typeof existingContainer.cleanup === 'function') {
                            existingContainer.cleanup();
                        }
                        document.body.removeChild(existingContainer);
                    }
                    
                    console.log("Auto-loading 3D model:", project.model);
                    
                    // Create container for 3D model
                    const modelContainer = document.createElement('div');
                    modelContainer.className = 'model-container';
                    modelContainer.dataset.modelPath = project.model;
                    document.body.appendChild(modelContainer);
                    
                    // Load the 3D model and store cleanup function
                    modelContainer.cleanup = loadProjectModel(project.model, modelContainer);
                }
            }
        });

        projectListContainer.appendChild(projectList);
        blenderContainer.appendChild(projectListContainer);
        galleryContainer.appendChild(blenderContainer);

        // Add close button
        const closeButton = document.createElement('div');
        closeButton.className = 'mindmap-close';
        closeButton.innerHTML = '&times;';
        closeButton.addEventListener('click', () => {
            galleryContainer.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(galleryContainer);
                
                // Remove any model container and ensure proper cleanup
                const modelContainer = document.querySelector('.model-container');
                if (modelContainer) {
                    if (modelContainer.cleanup && typeof modelContainer.cleanup === 'function') {
                        modelContainer.cleanup();
                    }
                    if (document.body.contains(modelContainer)) {
                        document.body.removeChild(modelContainer);
                    }
                }
            }, 300);
        });
        galleryContainer.appendChild(closeButton);

        // Function to show project gallery
        function showProjectGallery(project) {
            const galleryContainer = document.createElement('div');
            galleryContainer.className = 'gallery-container';
            
            // Determine the gallery style based on project name
            let selectedStyle;
            if (project.name === 'Octopus' || ['CCTV', 'Cube', 'Aquabot', 'Robot', 'Apple', 'Basketball', 'Spider'].includes(project.name)) {
                selectedStyle = 'stack';
            } else {
                selectedStyle = 'stack';
            }
            
            galleryContainer.dataset.style = selectedStyle;
            
            const galleryGrid = document.createElement('div');
            galleryGrid.className = `gallery-grid ${selectedStyle}`;
            galleryGrid.dataset.style = selectedStyle;
            
            // Add style-specific container and elements
            if (selectedStyle === 'horizontal-cards') {
                const horizontalTrack = document.createElement('div');
                horizontalTrack.className = 'horizontal-track';
                
                // Clone items for infinite scroll
                const items = project.files.map(file => {
                    const wrapper = document.createElement('div');
                    wrapper.className = 'horizontal-item';
                    
                    const element = file.endsWith('.mp4') ? 
                        document.createElement('video') : 
                        document.createElement('img');
                    element.className = 'gallery-item';
                    element.src = file;
                    
                    if (file.endsWith('.mp4')) {
                        setupVideoElement(element);
                    }
                    
                    wrapper.appendChild(element);
                    
                    // Add click event to wrapper only
                    wrapper.addEventListener('click', (e) => {
                        e.stopPropagation();
                        openFullView(file, file.endsWith('.mp4'));
                    });
                    
                    return wrapper;
                });
                
                // Add original items
                items.forEach(item => horizontalTrack.appendChild(item.cloneNode(true)));
                // Add cloned items for smooth infinite scroll
                items.forEach(item => horizontalTrack.appendChild(item.cloneNode(true)));
                
                galleryGrid.appendChild(horizontalTrack);
            } else {
                // Create a container for all files
                const filesContainer = document.createElement('div');
                filesContainer.className = 'files-container';
                filesContainer.style.display = 'flex';
                filesContainer.style.flexDirection = 'column';
                filesContainer.style.gap = '10px';
                filesContainer.style.width = '100%';
                filesContainer.style.maxHeight = '90vh';
                filesContainer.style.overflowY = 'auto';
                filesContainer.style.padding = '20px';
                
                project.files.forEach(file => {
                    const wrapper = document.createElement('div');
                    wrapper.className = 'gallery-wrapper';
                    wrapper.style.width = '100%';
                    wrapper.style.height = '200px'; // Increased height for better visibility
                    wrapper.style.overflow = 'hidden';
                    wrapper.style.transition = 'height 0.3s ease';
                    wrapper.style.marginBottom = '10px';
                    
                    const element = file.endsWith('.mp4') ? 
                        document.createElement('video') : 
                        document.createElement('img');
                    element.className = 'gallery-item';
                    element.src = file;
                    element.style.width = '100%';
                    element.style.height = '100%';
                    element.style.objectFit = 'cover';
                    element.style.transition = 'transform 0.3s ease';
                    
                    if (file.endsWith('.mp4')) {
                        setupVideoElement(element);
                    }
                    
                    wrapper.appendChild(element);
                    
                    // Add click event to wrapper
                    wrapper.addEventListener('click', (e) => {
                        e.stopPropagation();
                        openFullView(file, file.endsWith('.mp4'));
                    });
                    
                    // Add hover effect
                    wrapper.addEventListener('mouseenter', () => {
                        wrapper.style.height = '400px'; // Increased expanded height
                        element.style.transform = 'scale(1.05)';
                    });
                    
                    wrapper.addEventListener('mouseleave', () => {
                        wrapper.style.height = '200px';
                        element.style.transform = 'scale(1)';
                    });
                    
                    filesContainer.appendChild(wrapper);
                });
                
                galleryGrid.appendChild(filesContainer);
            }
            
            // Add or update style-specific CSS
            if (!document.querySelector('#gallery-styles')) {
                const styleSheet = document.createElement('style');
                styleSheet.id = 'gallery-styles';
                styleSheet.textContent = `
                    /* Horizontal Cards Style */
                    .horizontal-track {
                        display: flex;
                        flex-wrap: nowrap;
                        gap: 1px;
                        padding: 10px;
                        overflow-x: auto;
                        scroll-snap-type: x mandatory;
                        -webkit-overflow-scrolling: touch;
                        width: 100%;
                        position: relative;
                        justify-content: center;
                        scrollbar-width: none; /* Firefox */
                        -ms-overflow-style: none; /* IE and Edge */
                        height: 200px; /* Increased height */
                    }
                    
                    .horizontal-track::-webkit-scrollbar {
                        display: none; /* Chrome, Safari, Opera */
                    }
                    
                    .horizontal-item {
                        flex: 0 0 auto;
                        width: 300px; /* Increased width */
                        height: 200px; /* Increased height */
                        scroll-snap-align: center;
                        position: relative;
                        transition: all 0.3s ease;
                        margin: 0 1px;
                        overflow: hidden;
                        cursor: pointer;
                    }
                    
                    .horizontal-item:hover {
                        height: 300px; /* Increased expanded height */
                        z-index: 2;
                    }
                    
                    .horizontal-item .gallery-item {
                        width: 100%;
                        height: 100%;
                        object-fit: cover;
                        border-radius: 4px;
                        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
                        transition: transform 0.3s ease;
                    }
                    
                    .horizontal-item:hover .gallery-item {
                        transform: scale(1.05);
                    }

                    /* Ensure click events work properly */
                    .horizontal-item,
                    .horizontal-item .gallery-item {
                        pointer-events: auto;
                    }

                    .horizontal-item * {
                        pointer-events: auto;
                    }

                    /* Full Screen View */
                    .full-screen-view {
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100vw;
                        height: 100vh;
                        background: rgba(0, 0, 0, 0.95);
                        z-index: 3000;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        opacity: 0;
                        transition: opacity 0.3s ease;
                        cursor: pointer;
                    }

                    .full-screen-view.active {
                        opacity: 1;
                    }

                    .full-screen-view img,
                    .full-screen-view video {
                        max-width: 90vw;
                        max-height: 90vh;
                        object-fit: contain;
                        border-radius: 4px;
                        box-shadow: 0 0 30px rgba(0, 0, 0, 0.5);
                    }

                    .full-screen-view .close-button {
                        position: absolute;
                        top: 20px;
                        right: 20px;
                        width: 40px;
                        height: 40px;
                        background: rgba(255, 255, 255, 0.1);
                        border-radius: 50%;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        color: white;
                        font-size: 24px;
                        cursor: pointer;
                        transition: all 0.3s ease;
                    }

                    .full-screen-view .close-button:hover {
                        background: rgba(255, 255, 255, 0.2);
                        transform: scale(1.1);
                    }

                    /* Vertical Cards Style (for all non-horizontal galleries) */
                    .gallery-grid {
                        display: flex;
                        flex-direction: column;
                        gap: 1px;
                        padding: 20px;
                        overflow-y: auto;
                        max-height: 90vh;
                        width: 100%;
                        box-sizing: border-box;
                    }

                    .gallery-wrapper {
                        width: 100%;
                        height: 100px;
                        overflow: hidden;
                        transition: height 0.3s ease;
                        margin-bottom: 1px;
                    }

                    .gallery-wrapper:hover {
                        height: 300px;
                        z-index: 10;
                    }

                    .gallery-item {
                        width: 100%;
                        height: 100%;
                        object-fit: cover;
                        transition: transform 0.3s ease;
                    }

                    .gallery-wrapper:hover .gallery-item {
                        transform: scale(1.05);
                    }

                    .gallery-grid::-webkit-scrollbar {
                        display: none;
                    }

                    /* Ensure images stay within viewport */
                    .gallery-container {
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100vw;
                        height: 100vh;
                        background: rgba(0, 0, 0, 0.95);
                        z-index: 2500;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        padding: 20px;
                        box-sizing: border-box;
                        overflow: hidden;
                    }

                    .gallery-grid {
                        width: 100%;
                        max-width: 1200px;
                        margin: 0 auto;
                    }

                    /* Full view adjustments */
                    .gallery-container.full-view {
                        padding: 40px;
                    }

                    .gallery-container.full-view img,
                    .gallery-container.full-view video {
                        max-width: 90vw;
                        max-height: 90vh;
                        width: auto;
                        height: auto;
                        object-fit: contain;
                    }
                `;
                document.head.appendChild(styleSheet);
            }
            
            galleryContainer.appendChild(galleryGrid);
            
            // Add close button
            const closeButton = document.createElement('div');
            closeButton.className = 'mindmap-close';
            closeButton.innerHTML = '&times;';
            closeButton.addEventListener('click', () => {
                galleryContainer.style.opacity = '0';
                setTimeout(() => {
                    document.body.removeChild(galleryContainer);
                }, 300);
            });
            
            galleryContainer.appendChild(closeButton);
            document.body.appendChild(galleryContainer);
            
            setTimeout(() => {
                galleryContainer.classList.add('active');
            }, 100);
        }

        function setupVideoElement(element) {
            element.controls = true;
            element.muted = true;
            element.addEventListener('mouseenter', () => {
                element.play();
            });
            element.addEventListener('mouseleave', () => {
                element.pause();
            });
        }

        // Function to open full view
        function openFullView(src, isVideo) {
            const fullView = document.createElement('div');
            fullView.className = 'full-screen-view';
            
            const element = isVideo ? document.createElement('video') : document.createElement('img');
            element.src = src;
            
            if (isVideo) {
                element.controls = true;
                element.autoplay = true;
                element.muted = false;
            }
            
            // Add close button
            const closeButton = document.createElement('div');
            closeButton.className = 'close-button';
            closeButton.innerHTML = '&times;';
            closeButton.addEventListener('click', () => {
                fullView.style.opacity = '0';
                setTimeout(() => {
                    document.body.removeChild(fullView);
                }, 300);
            });
            
            fullView.appendChild(element);
            fullView.appendChild(closeButton);
            document.body.appendChild(fullView);
            
            // Close on background click
            fullView.addEventListener('click', (e) => {
                if (e.target === fullView) {
                    fullView.style.opacity = '0';
                    setTimeout(() => {
                        document.body.removeChild(fullView);
                    }, 300);
                }
            });
            
            setTimeout(() => {
                fullView.classList.add('active');
            }, 100);
        }

        setTimeout(() => {
            galleryContainer.classList.add('active');
        }, 100);
    }

    // After the blenderProjects array, add:
    const techfestProjects = {
        'IIT BOMBAY Techfest': {
            name: 'IIT BOMBAY Techfest',
            categories: {
                '': [
                    '../projects/iitbombay/iitb1.jpg',
                    '../projects/iitbombay/iitb2.jpg',
                    '../projects/iitbombay/iitb3.jpg',
                    '../projects/iitbombay/iitb4.mp4',
                    '../projects/iitbombay/aero/iitb1.jpg',
                    '../projects/iitbombay/aero/iitb2.jpg',
                    '../projects/iitbombay/aero/iitb3.jpg',
                    '../projects/iitbombay/aero/iitb4.jpg',
                    '../projects/iitbombay/aero/iitb5.jpg',
                    '../projects/iitbombay/aero/iitb6.jpg',
                    '../projects/iitbombay/aero/iitb7.mp4',
                     
                    '../projects/iitbombay/boat/iitb5.mp4' // Updated from jpg to mp4
                ]
            }
        },
        'IIT PATNA Techfest': {
            name: 'IIT PATNA Techfest',
            categories: {
                '': [
                    '../projects/iitpatna/iitp1.jpg',
                    '../projects/iitpatna/iitp8.jpg',
                    '../projects/iitpatna/iitp9.jpg',
                    '../projects/iitpatna/iitp10.jpg',
                    '../projects/iitpatna/iitp11.jpg',
                    '../projects/iitpatna/iitp12.jpg',
                    '../projects/iitpatna/iitp13.mp4', // Added new mp4
                    '../projects/iitpatna/iitp14.jpg' // Added new jpg
                ]
            }
        }
    };

    // Add new function to show techfest gallery
    function showTechfestGallery(techfestName) {
        // Add safety check
        if (!techfestProjects[techfestName]) {
            console.error('Techfest not found:', techfestName);
            return;
        }

        const galleryContainer = document.createElement('div');
        galleryContainer.className = 'techfest-gallery';
        document.body.appendChild(galleryContainer);

        // Add CSS for techfest gallery
        if (!document.querySelector('#techfest-style')) {
            const techfestStyle = document.createElement('style');
            techfestStyle.id = 'techfest-style';
            techfestStyle.textContent = `
                .techfest-gallery {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100vw;
                    height: 100vh;
                    background: rgba(0, 0, 0, 0.95);
                    z-index: 1100;
                    display: flex;
                    opacity: 0;
                    transition: opacity 0.5s ease;
                }

                .techfest-gallery.active {
                    opacity: 1;
                }

                .techfest-container {
                    display: flex;
                    flex-direction: column;
                    width: 100%;
                    padding: 40px;
                    overflow-y: auto;
                    scrollbar-width: none; /* Firefox */
                    -ms-overflow-style: none; /* IE and Edge */
                }

                .techfest-container::-webkit-scrollbar {
                    display: none; /* Chrome, Safari, Opera */
                }

                .techfest-title {
                    color: white;
                    font-size: 2.5em;
                    text-transform: uppercase;
                    letter-spacing: 3px;
                    margin-bottom: 30px;
                    text-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
                    text-align: center;
                    position: relative;
                    cursor: pointer;
                    transition: all 0.3s ease;
                }

                .techfest-title::after {
                    content: '';
                    position: absolute;
                    bottom: -5px;
                    left: 0;
                    width: 100%;
                    height: 2px;
                    background: linear-gradient(90deg, 
                        transparent 0%,
                        rgba(255, 255, 255, 0) 0%,
                        rgba(255, 255, 255, 0) 100%,
                        transparent 100%
                    );
                    transition: background 0.3s ease;
                }

                .techfest-title:hover {
                    background-image: linear-gradient(90deg, #ffffff, #4079ff, #ffffff);
                    background-size: 400% 100%;
                    background-clip: text;
                    -webkit-background-clip: text;
                    color: transparent;
                    animation: gradient-shine 3s linear infinite;
                }

                .techfest-title:hover::after {
                    background: linear-gradient(90deg, 
                        transparent 0%,
                        rgba(255, 255, 255, 0.8) 50%,
                        transparent 100%
                    );
                    background-size: 200% auto;
                    animation: shine 2s infinite linear;
                }

                @keyframes gradient-shine {
                    0% { background-position: 0% 50%; }
                    100% { background-position: 100% 50%; }
                }

                @keyframes shine {
                    0% { background-position: -200% center; }
                    100% { background-position: 200% center; }
                }

                .category-container {
                    margin-bottom: 40px;
                }

                .category-title {
                    display: none; /* Hide category titles */
                }

                .image-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                    gap: 1px;
                    padding: 20px;
                    justify-content: center;
                    position: relative;
                }

                /* Masonry layout styles */
                .masonry-grid {
                    columns: 3;
                    column-gap: 1px;
                    padding: 20px;
                    margin: 0 auto;
                }

                @media (max-width: 1200px) {
                    .masonry-grid {
                        columns: 2;
                    }
                }

                @media (max-width: 768px) {
                    .masonry-grid {
                        columns: 1;
                    }
                }

                .image-card {
                    position: relative;
                    break-inside: avoid;
                    margin-bottom: 1px;
                    border-radius: 20px;
                    overflow: hidden;
                    transform: translateZ(0);
                    backface-visibility: hidden;
                    transition: all 0.3s ease;
                    cursor: pointer;
                }

                /* Circular focus effect with blur */
                .image-card::before {
                    content: '';
                    position: absolute;
                    inset: -10px;
                    background: inherit;
                    backdrop-filter: blur(8px);
                    -webkit-backdrop-filter: blur(8px);
                    mask-image: radial-gradient(
                        circle at center,
                        transparent 30%,
                        black 70%
                    );
                    -webkit-mask-image: radial-gradient(
                        circle at center,
                        transparent 30%,
                        black 70%
                    );
                    transition: all 0.3s ease;
                    z-index: 1;
                }

                .image-card::after {
                    content: '';
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(
                        45deg,
                        rgba(255, 255, 255, 0.2),
                        rgba(64, 121, 255, 0.3)
                    );
                    border-radius: 20px;
                    opacity: 0.5;
                    transition: opacity 0.3s ease;
                    z-index: 2;
                }

                .image-card img,
                .image-card video {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    border-radius: 20px;
                    transition: transform 0.3s ease;
                    position: relative;
                    z-index: 0;
                }

                .image-card:hover::before {
                    mask-image: radial-gradient(
                        circle at center,
                        transparent 40%,
                        black 60%
                    );
                    -webkit-mask-image: radial-gradient(
                        circle at center,
                        transparent 40%,
                        black 60%
                    );
                }

                .image-card:hover::after {
                    opacity: 0.7;
                }

                .image-card:hover img,
                .image-card:hover video {
                    transform: scale(1.1);
                }

                /* Make the blur effect follow the mouse */
                .image-card.mouse-move::before {
                    mask-image: radial-gradient(
                        circle at var(--mouse-x) var(--mouse-y),
                        transparent 30%,
                        black 70%
                    );
                    -webkit-mask-image: radial-gradient(
                        circle at var(--mouse-x) var(--mouse-y),
                        transparent 30%,
                        black 70%
                    );
                }

                /* Center IIT PATNA Techfest images */
                [data-techfest="IIT PATNA Techfest"] .masonry-grid {
                    max-width: 1000px;
                    margin: 0 auto;
                }

                /* Fullscreen view enhancements */
                .fullscreen-view {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100vw;
                    height: 100vh;
                    background: rgba(0, 0, 0, 0.95);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 2000;
                    opacity: 0;
                    transition: opacity 0.3s ease;
                    backdrop-filter: blur(10px);
                }

                .fullscreen-view.active {
                    opacity: 1;
                }

                .fullscreen-view img,
                .fullscreen-view video {
                    max-width: 90vw;
                    max-height: 90vh;
                    object-fit: contain;
                    border-radius: 15px;
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
                    cursor: pointer;
                }

                .fullscreen-view .close-button {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    width: 50px;
                    height: 50px;
                    background: rgba(50, 50, 50, 0.9);
                    color: white;
                    border-radius: 50%;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    cursor: pointer;
                    font-size: 35px;
                    transition: all 0.3s ease;
                    z-index: 2001;
                }

                .fullscreen-view .close-button:hover {
                    background: rgba(80, 80, 80, 0.9);
                    transform: scale(1.1);
                }

                .image-card {
                    cursor: pointer; // Add cursor pointer to indicate clickability
                }
            `;
            document.head.appendChild(techfestStyle);
        }

        const techfestContainer = document.createElement('div');
        techfestContainer.className = 'techfest-container';
        techfestContainer.dataset.techfest = techfestName; // Add data attribute for specific styling

        // Add title with null check
        const title = document.createElement('div');
        title.className = 'techfest-title';
        title.textContent = techfestProjects[techfestName]?.name || techfestName;
        techfestContainer.appendChild(title);

        // Add categories and images
        Object.entries(techfestProjects[techfestName].categories).forEach(([category, images]) => {
            const categoryContainer = document.createElement('div');
            categoryContainer.className = 'category-container';

            const categoryTitle = document.createElement('div');
            categoryTitle.className = 'category-title';
            categoryTitle.textContent = category;
            categoryContainer.appendChild(categoryTitle);

            const imageGrid = document.createElement('div');
            imageGrid.className = 'masonry-grid'; // Changed from 'image-grid' to 'masonry-grid'

            images.forEach(imagePath => {
                const imageCard = document.createElement('div');
                imageCard.className = 'image-card';

                // Add mouse move handler for dynamic blur effect
                imageCard.addEventListener('mousemove', (e) => {
                    const rect = imageCard.getBoundingClientRect();
                    const x = ((e.clientX - rect.left) / rect.width) * 100;
                    const y = ((e.clientY - rect.top) / rect.height) * 100;
                    
                    imageCard.style.setProperty('--mouse-x', `${x}%`);
                    imageCard.style.setProperty('--mouse-y', `${y}%`);
                    imageCard.classList.add('mouse-move');
                });

                imageCard.addEventListener('mouseleave', () => {
                    imageCard.classList.remove('mouse-move');
                });

                const isVideo = imagePath.toLowerCase().endsWith('.mp4');
                const element = isVideo ? document.createElement('video') : document.createElement('img');
                
                element.src = imagePath;
                element.loading = 'lazy'; // Add lazy loading for better performance
                
                if (isVideo) {
                    element.muted = true;
                    element.loop = true;
                    element.playsInline = true;
                    element.preload = 'metadata';
                    element.setAttribute('muted', '');
                    
                    // Add hover events for video
                    imageCard.addEventListener('mouseenter', () => {
                        element.muted = true;
                        element.play().catch(err => {
                            console.log('Autoplay failed:', err);
                            element.muted = true;
                            element.play().catch(e => console.log('Retry failed:', e));
                        });
                    });
                    
                    imageCard.addEventListener('mouseleave', () => {
                        element.pause();
                        element.currentTime = 0;
                    });
                }

                imageCard.appendChild(element);
                
                // Add click handler for fullscreen view
                imageCard.addEventListener('click', () => {
                    const fullscreenView = document.createElement('div');
                    fullscreenView.className = 'fullscreen-view';
                    
                    const fullscreenElement = isVideo ? document.createElement('video') : document.createElement('img');
                    fullscreenElement.src = imagePath;
                    
                    if (isVideo) {
                        fullscreenElement.controls = true;
                        fullscreenElement.autoplay = true;
                        fullscreenElement.loop = true;
                        fullscreenElement.muted = false;
                        fullscreenElement.playsInline = true;
                        fullscreenElement.style.maxWidth = '90vw';
                        fullscreenElement.style.maxHeight = '90vh';
                        
                        fullscreenElement.play().catch(err => console.log('Fullscreen play failed:', err));
                    }
                    
                    // Add close button
                    const closeButton = document.createElement('div');
                    closeButton.className = 'close-button';
                    closeButton.innerHTML = '&times;';
                    
                    // Add click handlers
                    const closeFullscreen = () => {
                        fullscreenView.style.opacity = '0';
                        setTimeout(() => {
                            document.body.removeChild(fullscreenView);
                        }, 300);
                    };
                    
                    closeButton.addEventListener('click', closeFullscreen);
                    fullscreenView.addEventListener('click', (e) => {
                        if (e.target === fullscreenView) {
                            closeFullscreen();
                        }
                    });
                    
                    fullscreenView.appendChild(fullscreenElement);
                    fullscreenView.appendChild(closeButton);
                    document.body.appendChild(fullscreenView);
                    
                    // Show with animation
                    requestAnimationFrame(() => {
                        fullscreenView.classList.add('active');
                    });
                });

                imageGrid.appendChild(imageCard);
            });

            categoryContainer.appendChild(imageGrid);
            techfestContainer.appendChild(categoryContainer);
        });

        galleryContainer.appendChild(techfestContainer);

        // Add close button
        const closeButton = document.createElement('div');
        closeButton.className = 'mindmap-close';
        closeButton.innerHTML = '&times;';
        closeButton.addEventListener('click', () => {
            galleryContainer.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(galleryContainer);
            }, 300);
        });
        galleryContainer.appendChild(closeButton);

        setTimeout(() => {
            galleryContainer.classList.add('active');
        }, 100);
    }

    createPuzzle();

    // Add blur effect on hover to CAD gallery
    if (!document.querySelector('#cad-blur-style')) {
        const blurStyle = document.createElement('style');
        blurStyle.id = 'cad-blur-style';
        blurStyle.textContent = `
            /* Container to apply hover effects */
            .cad-category .gallery-masonry {
                position: relative;
            }
            
            /* Blur effect on non-hovered items */
            .cad-category .gallery-masonry:hover .gallery-item-container:not(:hover) {
                filter: blur(5px);
                opacity: 0.5;
                transform: scale(0.9);
                transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            }
            
            /* Enhanced focus effect on hovered item */
            .cad-category .gallery-masonry .gallery-item-container:hover {
                filter: blur(0);
                opacity: 1;
                transform: scale(1.1) !important;
                z-index: 15;
                box-shadow: 0 15px 30px rgba(0, 0, 0, 0.7) !important;
            }
            
            /* Smooth transition */
            .cad-category .gallery-masonry .gallery-item-container {
                transition: filter 0.4s ease, transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.4s ease, box-shadow 0.4s ease;
                border-radius: 15px; /* Adding curved corners to image containers */
                overflow: hidden;
            }
            
            /* Add curved corners to images */
            .cad-category .gallery-item-container img {
                border-radius: 15px;
            }
            
            /* Add curved corners to fullscreen images */
            .fullscreen-view img {
                border-radius: 20px !important;
            }
            
            /* Hide fullscreen titles */
            .fullscreen-title {
                display: none !important;
            }
        `;
        document.head.appendChild(blurStyle);
    }

    // Add a subtle blur effect for Robotics and AI Internship images
    if (!document.querySelector('#rai-blur-style')) {
        const raiBlurStyle = document.createElement('style');
        raiBlurStyle.id = 'rai-blur-style';
        raiBlurStyle.textContent = `
            /* Container to apply subtle hover effects for RAI */
            [data-section="Robotics and AI Internship"] .gallery-masonry {
                position: relative;
            }
            
            /* Very light blur effect on non-hovered items */
            [data-section="Robotics and AI Internship"] .gallery-masonry:hover .gallery-item-container:not(:hover) {
                filter: blur(2px);
                opacity: 0.7;
                transform: scale(0.95);
                transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            }
            
            /* Subtle focus effect on hovered item */
            [data-section="Robotics and AI Internship"] .gallery-masonry .gallery-item-container:hover {
                filter: blur(0);
                opacity: 1;
                transform: scale(1.05) !important;
                z-index: 10;
                box-shadow: 0 8px 20px rgba(0, 0, 0, 0.5) !important;
            }
            
            /* Smooth transition */
            [data-section="Robotics and AI Internship"] .gallery-masonry .gallery-item-container {
                transition: filter 0.4s ease, transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.4s ease, box-shadow 0.4s ease;
            }
        `;
        document.head.appendChild(raiBlurStyle);
    }

    // Add subtle blur effect for CodSoft gallery images
    if (!document.querySelector('#codsoft-blur-style')) {
        const codsoftBlurStyle = document.createElement('style');
        codsoftBlurStyle.id = 'codsoft-blur-style';
        codsoftBlurStyle.textContent = `
            /* Container to apply subtle hover effects for CodSoft */
            [data-section="CodSoft"] .gallery-masonry {
                position: relative;
            }
            
            /* Very light blur effect on non-hovered items */
            [data-section="CodSoft"] .gallery-masonry:hover .gallery-item-container:not(:hover) {
                filter: blur(2px);
                opacity: 0.7;
                transform: scale(0.95);
                transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            }
            
            /* Subtle focus effect on hovered item */
            [data-section="CodSoft"] .gallery-masonry .gallery-item-container:hover {
                filter: blur(0);
                opacity: 1;
                transform: scale(1.05) !important;
                z-index: 10;
                box-shadow: 0 8px 20px rgba(0, 0, 0, 0.5) !important;
            }
            
            /* Smooth transition */
            [data-section="CodSoft"] .gallery-masonry .gallery-item-container {
                transition: filter 0.4s ease, transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.4s ease, box-shadow 0.4s ease;
            }
        `;
        document.head.appendChild(codsoftBlurStyle);
    }

    // Add subtle blur effect for Educatified gallery images
    if (!document.querySelector('#educatified-blur-style')) {
        const educatifiedBlurStyle = document.createElement('style');
        educatifiedBlurStyle.id = 'educatified-blur-style';
        educatifiedBlurStyle.textContent = `
            /* Container to apply subtle hover effects for Educatified */
            [data-section="Educatified"] .gallery-masonry {
                position: relative;
            }
            
            /* Very light blur effect on non-hovered items */
            [data-section="Educatified"] .gallery-masonry:hover .gallery-item-container:not(:hover) {
                filter: blur(2px);
                opacity: 0.7;
                transform: scale(0.95);
                transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            }
            
            /* Subtle focus effect on hovered item */
            [data-section="Educatified"] .gallery-masonry .gallery-item-container:hover {
                filter: blur(0);
                opacity: 1;
                transform: scale(1.05) !important;
                z-index: 10;
                box-shadow: 0 8px 20px rgba(0, 0, 0, 0.5) !important;
            }
            
            /* Smooth transition */
            [data-section="Educatified"] .gallery-masonry .gallery-item-container {
                transition: filter 0.4s ease, transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.4s ease, box-shadow 0.4s ease;
            }
        `;
        document.head.appendChild(educatifiedBlurStyle);
    }

    // Add the working GIF modal styles
    if (!document.querySelector('#working-gif-modal-style')) {
        const workingGifStyle = document.createElement('style');
        workingGifStyle.id = 'working-gif-modal-style';
        workingGifStyle.textContent = `
            #working-gif-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.8);
                display: none;
                z-index: 1000;
                cursor: pointer;
            }
            
            #working-gif-card {
                position: absolute;
                width: 300px;
                height: 250px;
                background: url("https://res.cloudinary.com/practicaldev/image/fetch/s--8mUhEkXE--/c_limit%2Cf_auto%2Cfl_progressive%2Cq_66%2Cw_800/https://dev-to-uploads.s3.amazonaws.com/uploads/articles/km2w1ppw3yw9pd9na7mu.gif");
                background-size: cover;
                background-position: center;
                border-radius: 15px;
                box-shadow: 0px 10px 30px -5px rgba(0, 0, 0, 0.5);
                transition: transform 0.2s ease-out, box-shadow 0.3s ease;
                will-change: transform;
                transform-origin: center center;
                z-index: 1001;
            }
            
            #working-gif-card::after {
                content: 'Literally me when working on projects.';
                position: absolute;
                width: 100%;
                text-align: center;
                bottom: -40px;
                color: #fff;
                font-weight: bold;
                font-size: 16px;
            }
            
            #close-gif-button {
                position: absolute;
                bottom: 15px;
                left: 15px;
                color: white;
                background: rgba(0, 0, 0, 0.5);
                border: none;
                border-radius: 50%;
                width: 40px;
                height: 40px;
                font-size: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                z-index: 1002;
                transition: background 0.3s;
            }
            
            #close-gif-button:hover {
                background: rgba(255, 0, 0, 0.7);
            }
        `;
        document.head.appendChild(workingGifStyle);
    }
    
    // Create the working GIF modal elements
    const overlay = document.createElement('div');
    overlay.id = 'working-gif-overlay';
    
    const gifCard = document.createElement('div');
    gifCard.id = 'working-gif-card';
    
    const closeButton = document.createElement('button');
    closeButton.id = 'close-gif-button';
    closeButton.innerHTML = '&times;';
    
    overlay.appendChild(gifCard);
    overlay.appendChild(closeButton);
    document.body.appendChild(overlay);
    
    // Function to handle cursor following with improved animation
    function handleCursorFollow(e) {
        const card = document.getElementById('working-gif-card');
        const rotationFactor = 35; // Increased for more visible effect
        
        // Get cursor position relative to viewport
        const mouseX = e.clientX;
        const mouseY = e.clientY;
        
        // Calculate position for the card - offset to right side of cursor
        const cardX = mouseX + 20;
        const cardY = mouseY - 125;
        
        // Calculate rotation with enhanced effect
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        
        const rotateY = ((mouseX / windowWidth) - 0.5) * rotationFactor;
        const rotateX = ((mouseY / windowHeight) - 0.5) * -rotationFactor;
        
        // Remove all transitions for immediate tilt response
        card.style.transition = 'none';
        card.style.transform = `translate3d(${cardX}px, ${cardY}px, 50px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    }
    
    // Update the event listener for working... text
    document.addEventListener('click', (e) => {
        // Check if the clicked element contains the text "working..."
        if (e.target.textContent && e.target.textContent.toLowerCase().includes('working')) {
            // Show the overlay
            const overlay = document.getElementById('working-gif-overlay');
            overlay.style.display = 'block';
            
            // Set initial position of the card to the right of cursor
            const card = document.getElementById('working-gif-card');
            card.style.transform = `translate3d(${e.clientX + 20}px, ${e.clientY - 125}px, 0)`;
            
            // Add mousemove event for cursor following
            document.addEventListener('mousemove', handleCursorFollow);
        }
    });
    
    // Update the CSS to enhance 3D effect
    if (!document.querySelector('#working-gif-modal-style')) {
        const workingGifStyle = document.createElement('style');
        workingGifStyle.id = 'working-gif-modal-style';
        workingGifStyle.textContent = `
            #working-gif-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.8);
                display: none;
                z-index: 1000;
                cursor: pointer;
            }
            
            #working-gif-card {
                position: absolute;
                width: 300px;
                height: 250px;
                background: url("https://res.cloudinary.com/practicaldev/image/fetch/s--8mUhEkXE--/c_limit%2Cf_auto%2Cfl_progressive%2Cq_66%2Cw_800/https://dev-to-uploads.s3.amazonaws.com/uploads/articles/km2w1ppw3yw9pd9na7mu.gif");
                background-size: cover;
                background-position: center;
                border-radius: 15px;
                box-shadow: 0px 15px 35px -5px rgba(0, 0, 0, 0.5);
                will-change: transform;
                transform-origin: center center;
                transform-style: preserve-3d;
                backface-visibility: hidden;
                z-index: 1001;
                perspective: 800px;
            }
            
            #working-gif-card::after {
                content: 'Literally me when working on projects.';
                position: absolute;
                width: 100%;
                text-align: center;
                bottom: -40px;
                color: #fff;
                font-weight: bold;
                font-size: 16px;
                text-shadow: 0 2px 10px rgba(0,0,0,0.5);
            }
        `;
        document.head.appendChild(workingGifStyle);
    }
    
    // Close the modal when clicking on overlay or close button
    document.getElementById('working-gif-overlay').addEventListener('click', (e) => {
        if (e.target.id === 'working-gif-overlay' || e.target.id === 'close-gif-button') {
            document.getElementById('working-gif-overlay').style.display = 'none';
            // Remove mousemove event listener when modal is closed
            document.removeEventListener('mousemove', handleCursorFollow);
        }
    });
});


