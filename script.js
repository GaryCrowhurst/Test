// script.js for 3D Bitcoin Blockchain Visualization

// Global variables
let storedTransactions = []; // Store the transaction data
let isSphereMode = false; // Start with cube mode by default
let isPlanetaryView = false; // Default to non-planetary view
let isStandardView = false; // Default to non-standard view
let isCubeMode = false; // Default to non-cube view
let isSphericalStandardView = true; // Default to spherical standard view
let rgbPosition = 0; // Default position for RGB selection
let spreadFactor = 20; // Default spread factor for positions
let orbitSpeedFactor = 0.5; // Default orbit speed factor
let scene, camera, renderer, raycaster, mouse, controls;
let colorByTransaction = false;
let animationId = null;
let currentBlockNumber = ""; // Track current block number
let tooltip = null;

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initThreeJS();
    initEventListeners();
    initUIComponents();
    
    // Load default block 461461
    document.getElementById('blockHash').value = "461461";
    loadBlockData("461461");
});

// Initialize event listeners
function initEventListeners() {
    document.getElementById('blockForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const blockHash = document.getElementById('blockHash').value.trim();
        if (blockHash) {
            loadBlockData(blockHash);
        }
    });

    // Handle mouse move for tooltips on 3D objects
    window.addEventListener('mousemove', onMouseMove);
    
    // Handle window resize
    window.addEventListener('resize', onWindowResize);

    // Slider value display updates
    document.getElementById('rgbSlider').addEventListener('input', function() {
        document.getElementById('rgbValue').textContent = this.value;
    });
    
    document.getElementById('spreadSlider').addEventListener('input', function() {
        document.getElementById('spreadValue').textContent = this.value;
    });
    
    document.getElementById('speedSlider').addEventListener('input', function() {
        document.getElementById('speedValue').textContent = this.value;
    });
}

// Initialize UI components
function initUIComponents() {
    // Set initial values for sliders
    document.getElementById('rgbValue').textContent = document.getElementById('rgbSlider').value;
    document.getElementById('spreadValue').textContent = document.getElementById('spreadSlider').value;
    document.getElementById('speedValue').textContent = document.getElementById('speedSlider').value;
    
    // Initialize tooltip
    tooltip = document.getElementById('tooltip');
}

// Load block data from blockchain.info API
async function loadBlockData(blockHash) {
    showLoadingIndicator(true);
    clearScene();
    closeTransactionDetailsContainer();
    resetCamera();

    const apiUrl = `https://blockchain.info/rawblock/${blockHash}?cors=true`;
    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        storedTransactions = data.tx || [];
        currentBlockNumber = blockHash;
        
        // Update the UI to show current block
        document.getElementById('currentBlockDisplay').textContent = `#${blockHash}`;
        
        if (storedTransactions.length > 0) {
            renderCurrentView();
        } else {
            showError("No transactions found in this block");
        }
    } catch (error) {
        console.error("Failed to fetch block data:", error);
        storedTransactions = [];
        showError(`Failed to load block: ${error.message}`);
    }
    
    showLoadingIndicator(false);
}

// Render the current view based on mode selections
function renderCurrentView() {
    if (isPlanetaryView) {
        createPlanetarySystem(storedTransactions);
    } else if (isStandardView) {
        createStandardSystem(storedTransactions, true);
    } else if (isSphericalStandardView) {
        createSphericalStandardSystem(storedTransactions);
    } else if (isCubeMode) {
        createTransactions(storedTransactions, false, true);
    } else if (isSphereMode) {
        createTransactions(storedTransactions, true, false);
    } else {
        createTransactions(storedTransactions, false, false);
    }
}

// Reset camera position and focus
function resetCamera() {
    camera.position.set(0, 0, 500);
    if (controls) {
        controls.target.set(0, 0, 0);
        controls.update();
    }
    camera.lookAt(new THREE.Vector3(0, 0, 0));
}

// Clear all objects from the scene
function clearScene() {
    while (scene.children.length > 0) {
        const obj = scene.children[0];
        scene.remove(obj);
        
        // Dispose of geometries and materials to prevent memory leaks
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
            if (Array.isArray(obj.material)) {
                obj.material.forEach(material => material.dispose());
            } else {
                obj.material.dispose();
            }
        }
    }
}

// Close the transaction details container
function closeTransactionDetailsContainer() {
    document.getElementById('transactionDetailsContainer').classList.add('hidden');
}

// Change the visualization mode
function changeViewMode(view) {
    showLoadingIndicator(true);
    
    // Reset all view flags
    isPlanetaryView = false;
    isStandardView = false;
    isSphereMode = false;
    isCubeMode = false;
    isSphericalStandardView = false;
    
    // Set the selected view flag
    switch(view) {
        case 'planetary': isPlanetaryView = true; break;
        case 'standard': isStandardView = true; break;
        case 'sphere': isSphereMode = true; break;
        case 'cube': isCubeMode = true; break;
        case 'sphericalStandard': isSphericalStandardView = true; break;
    }
    
    setTimeout(() => {
        renderCurrentView();
        showLoadingIndicator(false);
    }, 100);
}

// Show or hide the loading indicator
function showLoadingIndicator(show) {
    document.getElementById('loadingIndicator').style.display = show ? 'flex' : 'none';
}

// Show error message
function showError(message) {
    alert(message);
}

// Toggle form visibility
function toggleFormVisibility() {
    const formContainer = document.getElementById('form-container');
    formContainer.classList.toggle('visible');
}

// Reset all settings to defaults
function resetToDefaults() {
    document.getElementById('rgbSlider').value = 0;
    document.getElementById('rgbValue').textContent = '0';
    rgbPosition = 0;
    
    document.getElementById('spreadSlider').value = 20;
    document.getElementById('spreadValue').textContent = '20';
    spreadFactor = 20;
    
    document.getElementById('speedSlider').value = 0.5;
    document.getElementById('speedValue').textContent = '0.5';
    orbitSpeedFactor = 0.5;
    
    document.getElementById('viewSelector').value = 'sphericalStandard';
    changeViewMode('sphericalStandard');
}

// Initialize THREE.js
function initThreeJS() {
    try {
        // Create scene
        scene = new THREE.Scene();
        
        // Create camera
        camera = new THREE.PerspectiveCamera(
            75, 
            window.innerWidth / window.innerHeight, 
            0.1, 
            2000
        );
        
        // Create renderer
        renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: true
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        document.getElementById('canvasContainer').appendChild(renderer.domElement);

        // Set initial camera position
        camera.position.z = 500;
        
        // Add orbit controls
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.minDistance = 50;
        controls.maxDistance = 1500;
        
        // Add ambient light
        scene.add(new THREE.AmbientLight(0xffffff, 0.6));
        
        // Add directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(1, 1, 1);
        scene.add(directionalLight);

        // Create raycaster for mouse interaction
        raycaster = new THREE.Raycaster();
        mouse = new THREE.Vector2();

        // Add event listener for mouse clicks
        renderer.domElement.addEventListener('mousedown', onDocumentMouseDown, false);

        // Start animation loop
        animate();
    } catch (error) {
        console.error('Error creating WebGL context:', error);
        showError('WebGL not supported or there was an error initializing the WebGL context.');
    }
}

// Handle window resize
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Create transactions visualization
function createTransactions(transactions, isSphere, isCube) {
    if (!Array.isArray(transactions) || transactions.length === 0) {
        console.error("Invalid or empty transactions data");
        return;
    }
    
    clearScene();
    
    // Add a background grid for reference
    addBackgroundGrid();

    // Create transaction objects
    transactions.forEach((transaction, index) => {
        // Calculate total output value
        let value = transaction.out.reduce((acc, cur) => acc + (cur.value || 0), 0);
        let valueInBTC = value / 100000000;
        
        // Determine size based on value
        let size = isSphere ? getSphereSize(valueInBTC) : getSquareSize(valueInBTC);
        
        // Determine color from hash
        let color = getColorFromHash(transaction.hash);
        
        // Create geometry based on mode
        let geometry = isSphere 
            ? new THREE.SphereGeometry(size, 32, 32) 
            : new THREE.BoxGeometry(size, size, size);
            
        // Create material with color
        let material = new THREE.MeshPhongMaterial({ 
            color: color,
            specular: 0x111111,
            shininess: 30,
            flatShading: false
        });
        
        // Create mesh
        let parcel = new THREE.Mesh(geometry, material);

        // Set position based on mode
        let pos;
        if (isSphere) {
            pos = getPositionInsideSphere(200, new THREE.Vector3(0, 0, 0), transaction.hash);
        } else if (isCube) {
            pos = getPositionInsideCube(200, new THREE.Vector3(0, 0, 0), transaction.hash);
        } else {
            pos = getPositionFromHash(transaction.hash, new THREE.Vector3(0, 0, 0));
        }

        // Apply position
        parcel.position.set(pos.x, pos.y, pos.z);
        
        // Store transaction data in user data
        parcel.userData = {
            ...transaction,
            btcValue: valueInBTC.toFixed(8),
            displayType: 'transaction',
            index: index
        };
        
        // Add to scene
        scene.add(parcel);
    });

    // Render scene
    renderer.render(scene, camera);
}

// Create planetary system visualization
function createPlanetarySystem(transactions) {
    clearScene();
    
    // Sort transactions by value (highest first)
    transactions = [...transactions].sort((a, b) => {
        const valueA = a.out.reduce((sum, output) => sum + (output.value || 0), 0);
        const valueB = b.out.reduce((sum, output) => sum + (output.value || 0), 0);
        return valueB - valueA;
    });
    
    // Create central body (sun) from highest value transaction
    const centralTransaction = transactions[0];
    const centralValueInBTC = centralTransaction.out.reduce((sum, output) => sum + (output.value || 0), 0) / 100000000;
    const centralSphereSize = 30; // Larger size for central body
    
    // Create sun
    const sun = createCelestialBody(
        centralTransaction, 
        centralSphereSize, 
        new THREE.Vector3(0, 0, 0),
        0xFFA500 // Orange color for sun
    );
    
    // Add glow effect to sun
    addGlowEffect(sun, 0xFFA500, centralSphereSize * 1.5);
    
    // Add planets (other transactions)
    transactions.forEach((transaction, index) => {
        if (index === 0) return; // Skip the sun
        
        // Calculate planet size based on transaction value
        const valueInBTC = transaction.out.reduce((sum, output) => sum + (output.value || 0), 0) / 100000000;
        const planetSize = Math.max(3, Math.min(15, 3 + Math.log(valueInBTC + 1) * 2));
        
        // Calculate orbit radius (distance from sun)
        const orbitRadius = 50 + (index * 20);
        
        // Calculate position on orbit
        const angle = (index * 137.5) % 360; // Golden angle for nice distribution
        const x = orbitRadius * Math.cos(angle * Math.PI / 180);
        const y = orbitRadius * Math.sin(angle * Math.PI / 180);
        const z = (Math.random() - 0.5) * 20; // Small random z variation
        
        // Create planet
        const planet = createCelestialBody(
            transaction,
            planetSize,
            new THREE.Vector3(x, y, z),
            getColorFromHash(transaction.hash)
        );
        
        // Add orbit visualization
        addOrbitPath(orbitRadius, z);
        
        // Add rotation animation
        planet.userData.rotationSpeed = 0.005 + (Math.random() * 0.01);
        
        // Add orbit animation
        planet.userData.orbitCenter = new THREE.Vector3(0, 0, 0);
        planet.userData.orbitRadius = orbitRadius;
        planet.userData.orbitSpeed = 0.0005 + (0.0003 * (index % 5));
        planet.userData.orbitAngle = angle * Math.PI / 180;
        planet.userData.orbitHeight = z;
        
        // Add moons for larger planets
        if (planetSize > 6 && index % 3 === 0) {
            const numMoons = Math.floor(Math.random() * 3) + 1;
            for (let i = 0; i < numMoons; i++) {
                const moonSize = planetSize * 0.3;
                const moonOrbitRadius = planetSize * 2 + (i * 2);
                const moonAngle = Math.random() * Math.PI * 2;
                
                const moonX = moonOrbitRadius * Math.cos(moonAngle);
                const moonY = moonOrbitRadius * Math.sin(moonAngle);
                const moonZ = (Math.random() - 0.5) * 2;
                
                const moon = createCelestialBody(
                    transaction,
                    moonSize,
                    new THREE.Vector3(moonX, moonY, moonZ),
                    0xCCCCCC // Grey color for moons
                );
                
                moon.userData.rotationSpeed = 0.01 + (Math.random() * 0.02);
                moon.userData.orbitCenter = new THREE.Vector3(0, 0, 0);
                moon.userData.orbitRadius = moonOrbitRadius;
                moon.userData.orbitSpeed = 0.02 + (Math.random() * 0.01);
                moon.userData.orbitAngle = moonAngle;
                
                planet.add(moon);
            }
        }
    });
    
    // Add starfield background
    addStarfield(2000);
    
    // Render scene
    renderer.render(scene, camera);
}

// Create standard system visualization
function createStandardSystem(transactions, initialCloserSpread = false) {
    clearScene();
    
    // Sort transactions by value
    transactions = [...transactions].sort((a, b) => {
        const valueA = a.out.reduce((sum, output) => sum + (output.value || 0), 0);
        const valueB = b.out.reduce((sum, output) => sum + (output.value || 0), 0);
        return valueB - valueA;
    });
    
    // Create central body
    const centralTransaction = transactions[0];
    const centralSphereSize = 25;
    const centralBody = createCelestialBody(
        centralTransaction,
        centralSphereSize,
        new THREE.Vector3(0, 0, 0),
        0xFFA500
    );
    
    // Add glow effect to central body
    addGlowEffect(centralBody, 0xFFA500, centralSphereSize * 1.3);
    
    // Set rotation speed for central body
    centralBody.userData.rotationSpeed = calculateRotationSpeed(centralTransaction.time);
    
    // Add surrounding bodies
    transactions.forEach((transaction, index) => {
        if (index === 0) return; // Skip the central transaction
        
        // Calculate size based on transaction value
        const valueInBTC = transaction.out.reduce((sum, output) => sum + (output.value || 0), 0) / 100000000;
        const sphereSize = getSphereSize(valueInBTC);
        
        // Calculate position in a galaxy-like spiral
        const spreadMultiplier = initialCloserSpread ? spreadFactor : spreadFactor * 2;
        const position = calculateGalacticPosition(transaction, centralTransaction, index, spreadMultiplier);
        
        // Create celestial body
        const celestialBody = createCelestialBody(
            transaction,
            sphereSize,
            position,
            getColorFromHash(transaction.hash)
        );
        
        // Add rings to larger bodies
        if (shouldHaveRings(transaction)) {
            addRings(celestialBody, sphereSize);
        }
        
        // Add moons
        const numMoons = determineMoons(transaction.hash);
        for (let i = 0; i < numMoons; i++) {
            const moonSize = sphereSize * 0.2;
            const moonPosition = calculateMoonPosition(transaction.hash, i, sphereSize);
            
            const moon = createCelestialBody(
                transaction,
                moonSize,
                moonPosition,
                0xCCCCCC
            );
            
            // Set orbit parameters for moon
            moon.userData = {
                orbitSpeed: calculateOrbitSpeed(transaction.time, i),
                orbitAxis: new THREE.Vector3(
                    parseInt(transaction.hash.charAt(i % transaction.hash.length), 16) % 2 ? 1 : -1,
                    parseInt(transaction.hash.charAt((i + 1) % transaction.hash.length), 16) % 2 ? 1 : -1,
                    parseInt(transaction.hash.charAt((i + 2) % transaction.hash.length), 16) % 2 ? 1 : -1
                ).normalize(),
                displayType: 'moon'
            };
            
            celestialBody.add(moon);
        }
        
        // Set rotation speed for body
        celestialBody.userData.rotationSpeed = calculateRotationSpeed(transaction.time);
    });
    
    // Add galaxy center glow
    addGalacticCore();
    
    // Add starfield background
    addStarfield(2000);
    
    // Render scene
    renderer.render(scene, camera);
}

// Create spherical standard system visualization
function createSphericalStandardSystem(transactions) {
    clearScene();
    
    // Sort transactions by value
    transactions = [...transactions].sort((a, b) => {
        const valueA = a.out.reduce((sum, output) => sum + (output.value || 0), 0);
        const valueB = b.out.reduce((sum, output) => sum + (output.value || 0), 0);
        return valueB - valueA;
    });
    
    // Create central body
    const centralTransaction = transactions[0];
    const centralSphereSize = 25;
    const centralBody = createCelestialBody(
        centralTransaction,
        centralSphereSize,
        new THREE.Vector3(0, 0, 0),
        0xFFA500
    );
    
    // Add glow effect to central body
    addGlowEffect(centralBody, 0xFFA500, centralSphereSize * 1.3);
    
    // Set rotation speed for central body
    centralBody.userData.rotationSpeed = calculateRotationSpeed(centralTransaction.time);
    
    // Create spherical distribution of bodies
    transactions.forEach((transaction, index) => {
        if (index === 0) return; // Skip the central transaction
        
        // Calculate size based on transaction value
        const valueInBTC = transaction.out.reduce((sum, output) => sum + (output.value || 0), 0) / 100000000;
        const sphereSize = getSphereSize(valueInBTC);
        
        // Calculate position in a spherical distribution
        const position = getPositionInsideSphere(spreadFactor * 10, new THREE.Vector3(0, 0, 0), transaction.hash);
        
        // Create celestial body
        const celestialBody = createCelestialBody(
            transaction,
            sphereSize,
            position,
            getColorFromHash(transaction.hash)
        );
        
        // Add rings to larger bodies
        if (shouldHaveRings(transaction)) {
            addRings(celestialBody, sphereSize);
        }
        
        // Add moons
        const numMoons = determineMoons(transaction.hash);
        for (let i = 0; i < numMoons; i++) {
            const moonSize = sphereSize * 0.2;
            const moonPosition = calculateMoonPosition(transaction.hash, i, sphereSize);
            
            const moon = createCelestialBody(
                transaction,
                moonSize,
                moonPosition,
                0xCCCCCC
            );
            
            // Set orbit parameters for moon
            moon.userData = {
                orbitSpeed: calculateOrbitSpeed(transaction.time, i),
                orbitAxis: new THREE.Vector3(
                    parseInt(transaction.hash.charAt(i % transaction.hash.length), 16) % 2 ? 1 : -1,
                    parseInt(transaction.hash.charAt((i + 1) % transaction.hash.length), 16) % 2 ? 1 : -1,
                    parseInt(transaction.hash.charAt((i + 2) % transaction.hash.length), 16) % 2 ? 1 : -1
                ).normalize(),
                displayType: 'moon'
            };
            
            celestialBody.add(moon);
        }
        
        // Set rotation speed for body
        celestialBody.userData.rotationSpeed = calculateRotationSpeed(transaction.time);
    });
    
    // Add starfield background
    addStarfield(2000);
    
    // Render scene
    renderer.render(scene, camera);
}

// Add a glow effect to an object
function addGlowEffect(object, color, size) {
    const glowGeometry = new THREE.SphereGeometry(size, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.2,
        side: THREE.BackSide
    });
    
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    object.add(glow);
}

// Add a galactic core glow
function addGalacticCore() {
    const coreGeometry = new THREE.SphereGeometry(30, 32, 32);
    const coreMaterial = new THREE.MeshBasicMaterial({
        color: 0xFFA500,
        transparent: true,
        opacity: 0.3
    });
    
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    scene.add(core);
    
    // Add outer glow
    const outerGeometry = new THREE.SphereGeometry(60, 32, 32);
    const outerMaterial = new THREE.MeshBasicMaterial({
        color: 0xFFA500,
        transparent: true,
        opacity: 0.1,
        side: THREE.BackSide
    });
    
    const outerGlow = new THREE.Mesh(outerGeometry, outerMaterial);
    scene.add(outerGlow);
}

// Add ring system to a planet
function addRings(planet, planetSize) {
    const ringGeometry = new THREE.RingGeometry(planetSize * 1.3, planetSize * 1.8, 64);
    const ringMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xCCCCCC, 
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7
    });
    
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = Math.PI / 2;
    planet.add(ring);
}

// Add orbit path visualization
function addOrbitPath(radius, height = 0) {
    const curve = new THREE.EllipseCurve(
        0, 0,                       // Center x, y
        radius, radius,             // x radius, y radius
        0, 2 * Math.PI,             // Start angle, end angle
        false,                      // Clockwise
        0                           // Rotation
    );
    
    const points = curve.getPoints(128);
    const orbitGeometry = new THREE.BufferGeometry().setFromPoints(points);
    
    // Convert 2D points to 3D
    const positions = new Float32Array(points.length * 3);
    for (let i = 0; i < points.length; i++) {
        positions[i * 3] = points[i].x;
        positions[i * 3 + 1] = points[i].y;
        positions[i * 3 + 2] = height;
    }
    
    orbitGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const orbitMaterial = new THREE.LineBasicMaterial({ 
        color: 0x666666, 
        transparent: true, 
        opacity: 0.3 
    });
    
    const orbit = new THREE.Line(orbitGeometry, orbitMaterial);
    scene.add(orbit);
}

// Add starfield background
function addStarfield(count) {
    const vertices = [];
    
    for (let i = 0; i < count; i++) {
        // Random positions in a sphere
        const radius = 1000;
        const theta = 2 * Math.PI * Math.random();
        const phi = Math.acos(2 * Math.random() - 1);
        
        const x = radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.sin(phi) * Math.sin(theta);
        const z = radius * Math.cos(phi);
        
        vertices.push(x, y, z);
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    
    const material = new THREE.PointsMaterial({
        color: 0xFFFFFF,
        size: 1,
        sizeAttenuation: false
    });
    
    const stars = new THREE.Points(geometry, material);
    scene.add(stars);
}

// Add a reference grid
function addBackgroundGrid() {
    const gridHelper = new THREE.GridHelper(400, 20, 0x444444, 0x333333);
    gridHelper.position.y = -100;
    scene.add(gridHelper);
}

// Check if a celestial body should have rings
function shouldHaveRings(transaction) {
    // Example: Transactions with value > 10 BTC get rings
    const value = transaction.out.reduce((sum, output) => sum + (output.value || 0), 0);
    return value > 1000000000; // 10 BTC in satoshis
}

// Calculate rotation speed based on timestamp
function calculateRotationSpeed(timestamp) {
    if (!timestamp) return 0.005;
    
    const date = new Date(timestamp * 1000);
    return 0.002 + (0.003 * (date.getSeconds() / 60));
}

// Calculate orbit speed based on timestamp
function calculateOrbitSpeed(timestamp, index) {
    if (!timestamp) return 0.01 * orbitSpeedFactor;
    
    const date = new Date(timestamp * 1000);
    return orbitSpeedFactor * 0.01 * (1 + (date.getSeconds() / 120) + (index * 0.2));
}

// Determine number of moons based on transaction hash
function determineMoons(hash) {
    if (!hash) return 0;
    
    const seed = parseInt(hash.slice(0, 2), 16);
    return seed % 5; // 0-4 moons
}

// Animate the scene
function animate() {
    animationId = requestAnimationFrame(animate);
    
    // Apply orbit controls damping
    if (controls) controls.update();
    
    // Animate objects in scene
    scene.children.forEach(obj => {
        if (obj.userData) {
            // Handle object rotation
            if (obj.userData.rotationSpeed) {
                obj.rotation.y += obj.userData.rotationSpeed * orbitSpeedFactor;
            }
            
            // Handle orbital movement
            if (obj.userData.orbitCenter && obj.userData.orbitRadius) {
                obj.userData.orbitAngle += obj.userData.orbitSpeed * orbitSpeedFactor;
                
                const x = obj.userData.orbitRadius * Math.cos(obj.userData.orbitAngle);
                const y = obj.userData.orbitRadius * Math.sin(obj.userData.orbitAngle);
                
                obj.position.set(x, y, obj.userData.orbitHeight || 0);
            }
            
            // Handle children (moons)
            obj.children.forEach(moon => {
                if (moon.userData && moon.userData.orbitSpeed && moon.userData.orbitAxis) {
                    moon.position.applyAxisAngle(
                        moon.userData.orbitAxis, 
                        moon.userData.orbitSpeed * orbitSpeedFactor
                    );
                }
                
                if (moon.userData && moon.userData.rotationSpeed) {
                    moon.rotation.y += moon.userData.rotationSpeed * orbitSpeedFactor;
                }
            });
        }
    });
    
    // Render scene
    renderer.render(scene, camera);
}

// Create a celestial body
function createCelestialBody(transaction, sphereSize, position, customColor = null) {
    const geometry = new THREE.SphereGeometry(sphereSize, 32, 32);
    
    // Use custom color if provided, otherwise get from hash
    const color = customColor || getColorFromHash(transaction.hash);
    
    // Create material with color and lighting
    const material = new THREE.MeshPhongMaterial({ 
        color: color,
        shininess: 30,
        specular: 0x111111
    });
    
    // Create mesh
    const celestialBody = new THREE.Mesh(geometry, material);
    
    // Set position
    celestialBody.position.copy(position);
    
    // Store transaction data and display info
    const totalValue = transaction.out.reduce((sum, output) => sum + (output.value || 0), 0);
    celestialBody.userData = {
        ...transaction,
        btcValue: (totalValue / 100000000).toFixed(8),
        displaySize: sphereSize,
        displayType: 'celestialBody'
    };
    
    // Add to scene
    scene.add(celestialBody);
    
    return celestialBody;
}

// Get sphere size based on BTC value
function getSphereSize(valueInBTC) {
    if (!valueInBTC) return 1;
    
    if (valueInBTC >= 100000) return 20;
    if (valueInBTC >= 10000) return 16;
    if (valueInBTC >= 1000) return 12;
    if (valueInBTC >= 100) return 8;
    if (valueInBTC >= 10) return 6;
    if (valueInBTC >= 1) return 4;
    if (valueInBTC >= 0.1) return 3;
    if (valueInBTC >= 0.01) return 2;
    return 1;
}

// Get cube size based on BTC value
function getSquareSize(valueInBTC) {
    if (!valueInBTC) return 1;
    
    if (valueInBTC >= 100000) return 20;
    if (valueInBTC >= 10000) return 16;
    if (valueInBTC >= 1000) return 12;
    if (valueInBTC >= 100) return 8;
    if (valueInBTC >= 10) return 6;
    if (valueInBTC >= 1) return 4;
    if (valueInBTC >= 0.1) return 3;
    if (valueInBTC >= 0.01) return 2;
    return 1;
}

// Get color from hash
function getColorFromHash(hash) {
    if (!hash || hash.length < 6) return 0xFFFFFF;
    
    // Extract RGB values from different positions in hash
    let r = parseInt(hash.slice(rgbPosition, rgbPosition + 2), 16);
    let g = parseInt(hash.slice(rgbPosition + 2, rgbPosition + 4), 16);
    let b = parseInt(hash.slice(rgbPosition + 4, rgbPosition + 6), 16);
    
    return (r << 16) + (g << 8) + b;
}

// Get position inside a sphere
function getPositionInsideSphere(radius, center, hash) {
    if (!hash) return new THREE.Vector3(0, 0, 0);
    
    const seed = hashToSeed(hash);
    const rng = new LCG(seed);
    
    const u = rng.next();
    const v = rng.next();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    const r = radius * Math.cbrt(rng.next());
    
    const x = center.x + r * Math.sin(phi) * Math.cos(theta);
    const y = center.y + r * Math.sin(phi) * Math.sin(theta);
    const z = center.z + r * Math.cos(phi);
    
    return new THREE.Vector3(x, y, z);
}

// Get position inside a cube
function getPositionInsideCube(size, center, hash) {
    if (!hash) return new THREE.Vector3(0, 0, 0);
    
    const seed = hashToSeed(hash);
    const rng = new LCG(seed);
    
    const x = center.x + (rng.next() * size - size / 2);
    const y = center.y + (rng.next() * size - size / 2);
    const z = center.z + (rng.next() * size - size / 2);
    
    return new THREE.Vector3(x, y, z);
}

// Calculate moon position
function calculateMoonPosition(transactionHash, moonIndex, planetSize) {
    if (!transactionHash) return new THREE.Vector3(0, 0, 0);
    
    let seed = parseInt(transactionHash.substring(5 + moonIndex, 8 + moonIndex), 16);
    const angle = (seed % 360) * (Math.PI / 180);
    const radius = planetSize * 2 + (moonIndex * 0.5); // Vary radius for each moon
    
    const x = radius * Math.cos(angle);
    const y = radius * Math.sin(angle);
    const z = (seed % 10) - 5; // Vary height slightly
    
    return new THREE.Vector3(x, y, z);
}

// Calculate galactic position
function calculateGalacticPosition(transaction, centralTransaction, index, spreadMultiplier = 20) {
    if (!transaction || !centralTransaction) return new THREE.Vector3(0, 0, 0);
    
    let timeDiff = (transaction.time || 0) - (centralTransaction.time || 0);
    let radius = spreadMultiplier + Math.log(index + 1) * 10 + Math.abs(timeDiff) * 0.01;
    let angle = (index * 137.5) % 360; // Golden angle for spiral layout
    
    let x = radius * Math.cos(angle * Math.PI / 180);
    let y = radius * Math.sin(angle * Math.PI / 180);
    let z = (Math.random() * 10 - 5) + (index % 5); // Add some variation in z
    
    return new THREE.Vector3(x, y, z);
}

// Get position from hash
function getPositionFromHash(hash, center) {
    if (!hash) return new THREE.Vector3(0, 0, 0);
    
    center = center || new THREE.Vector3(0, 0, 0);
    let x = 0, y = 0, z = 0;
    
    for (let i = 0; i < hash.length; i++) {
        x += hash.charCodeAt(i) * (i % 3);
        y += hash.charCodeAt(i) * (i % 5);
        z += hash.charCodeAt(i) * (i % 7);
    }
    
    let spread = 200;
    x = (x % spread) - (spread / 2) + center.x;
    y = (y % spread) - (spread / 2) + center.y;
    z = (z % spread) - (spread / 2) + center.z;
    
    return new THREE.Vector3(x, y, z);
}

// Linear Congruential Generator for random numbers
function LCG(seed = 0) {
    this.seed = seed;
    const a = 1664525;
    const c = 1013904223;
    const m = Math.pow(2, 32);
    
    this.next = function() {
        this.seed = (a * this.seed + c) % m;
        return this.seed / m;
    };
}

// Convert hash to seed for LCG
function hashToSeed(hash) {
    if (typeof hash !== 'string' || hash.length < 8) {
        console.error('Invalid hash for seed:', hash);
        return 0;
    }
    return parseInt(hash.slice(0, 8), 16);
}

// Handle mouse clicks for selecting objects
function onDocumentMouseDown(event) {
    if (event.target.closest('#blockForm') || event.target.closest('#form-container')) {
        return;
    }
    
    event.preventDefault();
    
    mouse.x = (event.clientX / renderer.domElement.clientWidth) * 2 - 1;
    mouse.y = -(event.clientY / renderer.domElement.clientHeight) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);
    
    if (intersects.length > 0) {
        // Check for userData to find transaction data
        let object = intersects[0].object;
        let userData = null;
        
        // Traverse up the parent hierarchy to find transaction data
        while (object && !userData) {
            if (object.userData && (object.userData.hash || object.userData.displayType)) {
                userData = object.userData;
                break;
            }
            object = object.parent;
        }
        
        if (userData && userData.hash) {
            showTransactionDetails(userData);
        }
    }
}

// Show transaction details in UI
function showTransactionDetails(transactionData) {
    const detailsContainer = document.getElementById('transactionDetailsContainer');
    const detailsContent = document.getElementById('transactionDetailsContent');
    
    // Clear previous content
    detailsContent.innerHTML = '';
    
    // Format and display transaction data
    const hash = transactionData.hash || 'Unknown';
    const btcValue = transactionData.btcValue || 'Unknown';
    const time = transactionData.time ? new Date(transactionData.time * 1000).toLocaleString() : 'Unknown';
    
    // Create sections for details
    createDetailSection(detailsContent, 'Transaction Hash', formatHash(hash));
    createDetailSection(detailsContent, 'Value', `${btcValue} BTC`);
    createDetailSection(detailsContent, 'Time', time);
    
    // Add input details if available
    if (transactionData.inputs && transactionData.inputs.length > 0) {
        const inputsSection = document.createElement('div');
        inputsSection.className = 'detail-section';
        
        const inputsTitle = document.createElement('div');
        inputsTitle.className = 'detail-label';
        inputsTitle.textContent = `Inputs (${transactionData.inputs.length})`;
        inputsSection.appendChild(inputsTitle);
        
        const inputsList = document.createElement('div');
        transactionData.inputs.slice(0, 5).forEach((input, index) => {
            const inputItem = document.createElement('div');
            inputItem.style.marginBottom = '5px';
            
            if (input.prev_out && input.prev_out.addr) {
                inputItem.textContent = `${index + 1}. ${formatHash(input.prev_out.addr)}`;
            } else {
                inputItem.textContent = `${index + 1}. [No address]`;
            }
            
            inputsList.appendChild(inputItem);
        });
        
        if (transactionData.inputs.length > 5) {
            const moreInputs = document.createElement('div');
            moreInputs.textContent = `... and ${transactionData.inputs.length - 5} more`;
            inputsList.appendChild(moreInputs);
        }
        
        inputsSection.appendChild(inputsList);
        detailsContent.appendChild(inputsSection);
    }
    
    // Add output details if available
    if (transactionData.out && transactionData.out.length > 0) {
        const outputsSection = document.createElement('div');
        outputsSection.className = 'detail-section';
        
        const outputsTitle = document.createElement('div');
        outputsTitle.className = 'detail-label';
        outputsTitle.textContent = `Outputs (${transactionData.out.length})`;
        outputsSection.appendChild(outputsTitle);
        
        const outputsList = document.createElement('div');
        transactionData.out.slice(0, 5).forEach((output, index) => {
            const outputItem = document.createElement('div');
            outputItem.style.marginBottom = '5px';
            
            if (output.addr) {
                const valueBTC = (output.value / 100000000).toFixed(8);
                outputItem.textContent = `${index + 1}. ${formatHash(output.addr)} - ${valueBTC} BTC`;
            } else {
                outputItem.textContent = `${index + 1}. [No address]`;
            }
            
            outputsList.appendChild(outputItem);
        });
        
        if (transactionData.out.length > 5) {
            const moreOutputs = document.createElement('div');
            moreOutputs.textContent = `... and ${transactionData.out.length - 5} more`;
            outputsList.appendChild(moreOutputs);
        }
        
        outputsSection.appendChild(outputsList);
        detailsContent.appendChild(outputsSection);
    }
    
    // Show the details container
    detailsContainer.classList.remove('hidden');
    
    // Make container draggable
    makeElementMovable(detailsContainer);
}

// Create a detail section
function createDetailSection(parent, label, value) {
    const section = document.createElement('div');
    section.className = 'detail-section';
    
    const labelElement = document.createElement('div');
    labelElement.className = 'detail-label';
    labelElement.textContent = label;
    
    const valueElement = document.createElement('div');
    valueElement.className = 'detail-value';
    valueElement.textContent = value;
    
    section.appendChild(labelElement);
    section.appendChild(valueElement);
    parent.appendChild(section);
}

// Format hash for display (truncate with ellipsis)
function formatHash(hash) {
    if (!hash || hash.length < 10) return hash || '';
    return `${hash.substring(0, 8)}...${hash.substring(hash.length - 8)}`;
}

// Make an element movable by drag and drop
function makeElementMovable(element) {
    let posX = 0, posY = 0, mouseX = 0, mouseY = 0;
    
    // Get the header element to use as drag handle
    const header = element.querySelector('.details-header');
    if (!header) return;
    
    header.style.cursor = 'move';
    header.onmousedown = dragMouseDown;
    
    function dragMouseDown(e) {
        e.preventDefault();
        
        // Get mouse position
        mouseX = e.clientX;
        mouseY = e.clientY;
        
        // Add event listeners for movement and release
        document.onmouseup = stopElementDrag;
        document.onmousemove = elementDrag;
    }
    
    function elementDrag(e) {
        e.preventDefault();
        
        // Calculate new position
        posX = mouseX - e.clientX;
        posY = mouseY - e.clientY;
        mouseX = e.clientX;
        mouseY = e.clientY;
        
        // Set element's new position
        element.style.top = (element.offsetTop - posY) + "px";
        element.style.left = (element.offsetLeft - posX) + "px";
    }
    
    function stopElementDrag() {
        // Remove event listeners
        document.onmouseup = null;
        document.onmousemove = null;
    }
}

// Handle mousemove for tooltips
function onMouseMove(event) {
    // Update mouse coordinates for raycasting
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    // Cast ray from camera through mouse position
    raycaster.setFromCamera(mouse, camera);
    
    // Find intersections with objects in scene
    const intersects = raycaster.intersectObjects(scene.children, true);
    
    if (intersects.length > 0) {
        // Look for transaction data in the intersected object or its parents
        let object = intersects[0].object;
        let userData = null;
        
        while (object && !userData) {
            if (object.userData && (object.userData.hash || object.userData.displayType)) {
                userData = object.userData;
                break;
            }
            object = object.parent;
        }
        
        if (userData && userData.btcValue) {
            // Show tooltip with basic info
            tooltip.textContent = `${userData.btcValue} BTC`;
            tooltip.style.left = (event.clientX + 10) + 'px';
            tooltip.style.top = (event.clientY + 10) + 'px';
            tooltip.classList.remove('hidden');
            
            // Change cursor to pointer to indicate clickable
            document.body.style.cursor = 'pointer';
        } else {
            hideTooltip();
        }
    } else {
        hideTooltip();
    }
}

// Hide tooltip
function hideTooltip() {
    tooltip.classList.add('hidden');
    document.body.style.cursor = 'default';
}

// Adjust RGB position in color calculation
function adjustRGBPosition(position) {
    rgbPosition = parseInt(position);
    renderCurrentView();
}

// Adjust spread factor for positioning
function adjustSpread(factor) {
    spreadFactor = parseInt(factor);
    renderCurrentView();
}

// Adjust orbit speed factor
function adjustOrbitSpeed(speed) {
    orbitSpeedFactor = parseFloat(speed);
}
