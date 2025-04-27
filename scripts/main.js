// Setup scena e camera
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

let spacing = 3.5; 
const finalSpacing = 1.05;
const spacingStep = 0.03;
let rotationSpeed = 0.01;
//const moves = ['R', 'L', 'U', 'D', 'F', 'B'];
//let scrambleMoves = [];

// Salviamo i cubetti per aggiornarli durante l'animazione
const cubelets = [];

// Modifica la funzione createCube per aggiungere texture pixel e bordi
function createCube(x, y, z, colors) {
  // Utilizziamo un BoxGeometry con bordi leggermente più piccoli
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  
  // Determina quali facce sono esterne (le facce sono nell'ordine: +x, -x, +y, -y, +z, -z)
  const isExternal = [
      x === 1,  // Faccia destra (+x)
      x === -1, // Faccia sinistra (-x)
      y === 1,  // Faccia superiore (+y)
      y === -1, // Faccia inferiore (-y)
      z === 1,  // Faccia frontale (+z)
      z === -1  // Faccia posteriore (-z)
  ];
    
  function createPixelTexture(color) {
    const canvas = document.createElement('canvas');
    canvas.width = 128; // Aumentata risoluzione per più dettagli
    canvas.height = 128;
    const context = canvas.getContext('2d');
    
    // Converti il colore hex in RGB per manipolazioni più facili
    const r = (color >> 16) & 255;
    const g = (color >> 8) & 255;
    const b = color & 255;
    
    // Riempi con colore di base
    context.fillStyle = '#' + color.toString(16).padStart(6, '0');
    context.fillRect(0, 0, 128, 128);
    
    // Crea una griglia di base per il pattern pixel
    const gridSize = 16; // Dimensione della griglia base
    const pixelVariation = 4; // Variazione di luminosità tra i pixel
    
    // Crea un pattern più dettagliato e vario
    for (let x = 0; x < 128; x += gridSize) {
      for (let y = 0; y < 128; y += gridSize) {
        // Crea pixel di dimensioni diverse per un effetto più dettagliato
        const pxSize = gridSize - 2; // Piccolo spazio tra i pixel
        
        // Calcola variazione di colore per questo pixel
        const variation = Math.random() * pixelVariation - pixelVariation/2;
        const pixelColor = `rgb(
          ${Math.max(0, Math.min(255, r + variation * 3))},
          ${Math.max(0, Math.min(255, g + variation * 3))},
          ${Math.max(0, Math.min(255, b + variation * 3))})`;
        
        context.fillStyle = pixelColor;
        context.fillRect(x + 1, y + 1, pxSize, pxSize);
        
        // Aggiungi dettagli all'interno di ogni pixel
        if (pxSize > 8) {
          // Dettagli interni per pixel grandi
          context.fillStyle = `rgba(${r+10}, ${g+10}, ${b+10}, 0.3)`;
          context.fillRect(x + 3, y + 3, pxSize/2, pxSize/2);
        }
      }
    }
    
    // Aggiungi un pattern di rumore per texture
    for (let i = 0; i < 300; i++) {
      const rx = Math.floor(Math.random() * 128);
      const ry = Math.floor(Math.random() * 128);
      const size = Math.floor(Math.random() * 3) + 1;
      
      // Pixel di rumore più chiari o più scuri
      const noiseType = Math.random() > 0.5;
      context.fillStyle = noiseType 
        ? `rgba(255, 255, 255, 0.1)` 
        : `rgba(0, 0, 0, 0.1)`;
      context.fillRect(rx, ry, size, size);
    }
    
    // Aggiungi bordi più definiti
    context.strokeStyle = '#000000';
    context.lineWidth = 2;
    context.strokeRect(1, 1, 126, 126);
    
    // Aggiungi sottili linee di griglia all'interno
    //context.strokeStyle = `rgba(0, 0, 0, 0.2)`;
   // context.lineWidth = 1;
    //for (let i = gridSize; i < 128; i += gridSize) {
      //context.beginPath();
      //context.moveTo(0, i);
      //context.lineTo(128, i);
      //context.stroke();
      
      //context.beginPath();
      //context.moveTo(i, 0);
      //context.lineTo(i, 128);
      //context.stroke();
    //}
    
    // Effetto di vignettatura agli angoli per dare più profondità
    const gradient = context.createRadialGradient(64, 64, 32, 64, 64, 128);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.3)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 128, 128);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter; // Mantiene l'aspetto pixelato
    
    return texture;

  }
  
  // Funzione di utilità per schiarire/scurire un colore
  function shadeColor(color, percent) {
    const num = parseInt(color, 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    
    return (0x1000000 + (R < 255 ? (R < 0 ? 0 : R) : 255) * 0x10000 +
      (G < 255 ? (G < 0 ? 0 : G) : 255) * 0x100 +
      (B < 255 ? (B < 0 ? 0 : B) : 255))
      .toString(16).slice(1);
  }
  
  // Crea materiali basati su quali facce sono esterne
  const materials = isExternal.map((isExt, index) => {
    if (isExt) {
      // Crea texture pixelata per facce esterne
      const texture = createPixelTexture(colors[index]);
      return new THREE.MeshStandardMaterial({ 
        map: texture,
        roughness: 0.8, 
        metalness: 0.2,
        bumpMap: texture,
        bumpScale: 0.02,
        side: THREE.DoubleSide 
      });
    } else {
      // Per le facce interne, usa un materiale scuro
      return new THREE.MeshStandardMaterial({ 
        color: 0x111111, 
        roughness: 0,
        metalness: 0,
        side: THREE.DoubleSide 
      });
    }
  });
  
  const cube = new THREE.Mesh(geometry, materials);
  cube.userData.gridPosition = { x, y, z };
  cube.userData.originalColors = [...colors];
  return cube;
}

function initializeRubiksCube() {
  // Colori più vivaci per uno stile "eye catching"
  const ROSSO = 0xff0055;   // Rosa acceso
  const ARANCIONE = 0xff8800; // Arancione acceso
  const BIANCO = 0xf0f0f0;  // Bianco leggermente sporco per texture
  const GIALLO = 0xffff00;  // Giallo brillante
  const VERDE = 0x00ff88;   // Verde acqua brillante
  const BLU = 0x0088ff;     // Blu elettrico
  
  // Pulisci gli array esistenti se necessario
  if (cubelets.length > 0) {
      cubelets.forEach(cube => rubikCube.remove(cube));
      cubelets.length = 0;
  }
  
  // Resto del codice come prima
  positions.forEach(pos => {
      const x = pos[0];
      const y = pos[1];
      const z = pos[2];
      
      // Colori di default (tutti neri inizialmente)
      const faceColors = [BIANCO, BIANCO, BIANCO, BIANCO, BIANCO, BIANCO];
      
      // Assegna colori solo alle facce esterne
      if (x === 1) faceColors[0] = ROSSO;      // Faccia destra (+x)
      if (x === -1) faceColors[1] = ARANCIONE; // Faccia sinistra (-x)
      if (y === 1) faceColors[2] = BIANCO;     // Faccia superiore (+y)
      if (y === -1) faceColors[3] = GIALLO;    // Faccia inferiore (-y)
      if (z === 1) faceColors[4] = VERDE;      // Faccia frontale (+z)
      if (z === -1) faceColors[5] = BLU;       // Faccia posteriore (-z)
      
      const cubelet = createCube(x, y, z, faceColors);
      cubelets.push(cubelet);
      rubikCube.add(cubelet);
  });
  
  // Aggiorna le posizioni iniziali
  cubelets.forEach(cube => {
      const gp = cube.userData.gridPosition;
      cube.position.set(gp.x * spacing, gp.y * spacing, gp.z * spacing);
  });
}

// Modifica l'illuminazione per migliorare l'effetto visivo
function setupLighting() {
  // Aggiungi luci per migliorare l'aspetto 3D
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);
  
  // Luce direzionale principale
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(5, 10, 7);
  scene.add(directionalLight);
  
  // Luce di riempimento per ridurre le ombre troppo scure
  const fillLight = new THREE.DirectionalLight(0x9999ff, 0.3);
  fillLight.position.set(-5, -10, -7);
  scene.add(fillLight);
}

// Modifica il renderer e la scena per un effetto migliore
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.setClearColor(0x191e29); // Colore di sfondo scuro

// Aggiungi questa funzione dopo aver creato il renderer
setupLighting();


// Funzione per ruotare un layer di cubetti (simula la rotazione di una faccia)
function rotateLayer(layer, direction) {
    const newPositions = layer.map(cube => cube.position.clone());

    // Ruota i cubetti della faccia in senso orario o antiorario
    if (direction === 'clockwise') {
        newPositions.forEach(pos => {
            const tempX = pos.x;
            pos.x = -pos.y;
            pos.y = tempX;
        });
    } else if (direction === 'counterclockwise') {
        newPositions.forEach(pos => {
            const tempX = pos.x;
            pos.x = pos.y;
            pos.y = -tempX;
        });
    }

    return newPositions;
}

// Crea il cubo di Rubik 3x3x3
const rubikCube = new THREE.Group();
const positions = [
    [-1, 1, 1], [0, 1, 1], [1, 1, 1],
    [-1, 0, 1], [0, 0, 1], [1, 0, 1],
    [-1, -1, 1], [0, -1, 1], [1, -1, 1],

    [-1, 1, 0], [0, 1, 0], [1, 1, 0],
    [-1, 0, 0], [0, 0, 0], [1, 0, 0],
    [-1, -1, 0], [0, -1, 0], [1, -1, 0],

    [-1, 1, -1], [0, 1, -1], [1, 1, -1],
    [-1, 0, -1], [0, 0, -1], [1, 0, -1],
    [-1, -1, -1], [0, -1, -1], [1, -1, -1]
];

// Crea cubi in posizioni con spazio iniziale
initializeRubiksCube();

// Aggiungi il cubo di Rubik alla scena
scene.add(rubikCube);

// Imposta la posizione della camera
camera.position.z = 5;

// Aggiungi OrbitControls per il controllo del cubo
const controls = new THREE.OrbitControls(camera, renderer.domElement);

// Animazione di assemblaggio
function animateAssembly() {
  if (spacing > finalSpacing) {
      spacing -= spacingStep;

      cubelets.forEach(cube => {
          const gp = cube.userData.gridPosition;
          cube.position.set(gp.x * spacing, gp.y * spacing, gp.z * spacing);
      });

  }
}

// Funzione di animazione principale
function animate() {
  requestAnimationFrame(animate);
  animateAssembly();
  controls.update();
  renderer.render(scene, camera);
}

animate();

function rotateGridPosition(gp, axis, direction) {
  const { x, y, z } = gp;
  const dir = direction === 'clockwise' ? 1 : -1;

  // Crea una copia della posizione nella griglia
  const newPos = { x, y, z };

  // Applica la rotazione in base all'asse
  if (axis === 'x') {
    // Rotazione attorno all'asse X (y e z cambiano)
    newPos.y = z * dir * -1;
    newPos.z = y * dir;
  } else if (axis === 'y') {
    // Rotazione attorno all'asse Y (x e z cambiano)
    newPos.x = z * dir;
    newPos.z = x * dir * -1;
  } else if (axis === 'z') {
    // Rotazione attorno all'asse Z (x e y cambiano)
    newPos.x = y * dir * -1;
    newPos.y = x * dir;
  }

  return newPos;
}


// Modifica la funzione rotateFaceRealistic per gestire correttamente i colori
let isRotating = false;

// Modifica la funzione rotateFaceRealistic per usare il blocco
function rotateFaceRealistic(axis, gridValue, direction) {
  // Se una rotazione è già in corso, ignora la richiesta
  if (isRotating) {
    console.log("Wait, executing rotation...");
    return;
  }
  
  // Imposta il flag di rotazione
  isRotating = true;
  
  // Il resto della funzione rimane simile
  const layer = cubelets.filter(c => c.userData.gridPosition[axis] === gridValue);
  
  const center = new THREE.Vector3();
  layer.forEach(cube => center.add(cube.position));
  center.divideScalar(layer.length);
  
  const tempGroup = new THREE.Group();
  rubikCube.add(tempGroup);
  tempGroup.position.copy(center);
  
  const originalData = new Map();
  layer.forEach(cube => {
    originalData.set(cube, {
      gridPosition: { ...cube.userData.gridPosition },
      rotation: cube.rotation.clone()
    });
    
    cube.position.sub(center);
    tempGroup.add(cube);
  });
  
  const angle = (direction === 'clockwise' ? -1 : 1) * Math.PI / 2;
  const duration = 270; // Aumentato leggermente per una rotazione più fluida
  const startTime = performance.now();
  
  const rotationAxis = new THREE.Vector3();
  if (axis === 'x') rotationAxis.set(1, 0, 0);
  if (axis === 'y') rotationAxis.set(0, 1, 0);
  if (axis === 'z') rotationAxis.set(0, 0, 1);
  
  function animateRotation(time) {
    const elapsed = time - startTime;
    const t = Math.min(elapsed / duration, 1);
    
    tempGroup.setRotationFromAxisAngle(rotationAxis, angle * t);
    
    if (t < 1) {
      requestAnimationFrame(animateRotation);
    } else {
      // Animazione completata
      layer.forEach(cube => {
        cube.updateMatrixWorld(true);
        
        const worldPos = new THREE.Vector3();
        const worldQuat = new THREE.Quaternion();
        const worldScale = new THREE.Vector3();
        
        cube.matrixWorld.decompose(worldPos, worldQuat, worldScale);
        
        const newGridPos = {
          x: Math.round(worldPos.x / spacing),
          y: Math.round(worldPos.y / spacing),
          z: Math.round(worldPos.z / spacing)
        };
        
        cube.userData.gridPosition = newGridPos;
        
        rubikCube.attach(cube);
        
        cube.position.set(
          newGridPos.x * spacing,
          newGridPos.y * spacing,
          newGridPos.z * spacing
        );
      });
      
      rubikCube.remove(tempGroup);
      
      // Aggiungi un ritardo di sicurezza prima di permettere un'altra rotazione
      setTimeout(() => {
        isRotating = false;
        console.log("Ready");
      }, 20); // 100ms di delay extra dopo la fine dell'animazione
    }
  }
  
  requestAnimationFrame(animateRotation);
}

function scrambleCube(moves = 20) {
  if (isRotating) return; // Non avviare se è già in corso un'animazione
  
  const axes = ['x', 'y', 'z'];
  const values = [-1, 0, 1];
  const directions = ['clockwise', 'counterclockwise'];
  
  let moveCount = 0;
  
  function executeNextMove() {
    if (moveCount >= moves || isRotating) {
      if (moveCount >= moves) console.log("Scramble completato!");
      return;
    }
    
    const randomAxis = axes[Math.floor(Math.random() * axes.length)];
    const randomValue = values[Math.floor(Math.random() * values.length)];
    const randomDirection = directions[Math.floor(Math.random() * directions.length)];
    
    rotateFaceRealistic(randomAxis, randomValue, randomDirection);
    moveCount++;
    
    // La prossima mossa verrà eseguita solo quando isRotating sarà di nuovo false
    const checkInterval = setInterval(() => {
      if (!isRotating) {
        clearInterval(checkInterval);
        setTimeout(executeNextMove, 50); // Piccolo ritardo tra le mosse
      }
    }, 100);
  }
  
  executeNextMove();
}

function resetCubePositions() {
  cubelets.forEach(cube => {
    const gp = cube.userData.gridPosition;
    cube.position.set(gp.x * spacing, gp.y * spacing, gp.z * spacing);
    cube.rotation.set(0, 0, 0);
  });
}

function resetCube() {
  // Reimposta tutti i cubetti alle posizioni originali
  cubelets.forEach((cube, index) => {
    const pos = positions[index];
    cube.userData.gridPosition = { x: pos[0], y: pos[1], z: pos[2] };
    cube.position.set(pos[0] * spacing, pos[1] * spacing, pos[2] * spacing);
    cube.rotation.set(0, 0, 0);
  });
}



document.addEventListener('keydown', (event) => {
  if (event.key === 'O' && event.shiftKey) {
    resetCube(); // Shift+O per resettare il cubo
    console.log("Cubo reimpostato");
  }
});

// Controller tastiera per rotazioni multiple
document.addEventListener('keydown', (event) => {
  // Verifica che il cubo si sia assemblato completamente
  if (spacing <= finalSpacing + 0.01) {
    const key = event.key.toLowerCase();
    const isShift = event.shiftKey;

    switch(key) {
      case 'f':
        rotateFaceRealistic('z', 1, isShift ? 'counterclockwise' : 'clockwise');
        break;
      case 'r':
        rotateFaceRealistic('x', 1, isShift ? 'counterclockwise' : 'clockwise');
        break;
      case 'u':
        rotateFaceRealistic('y', 1, isShift ? 'counterclockwise' : 'clockwise');
        break;
      case 'b':
        rotateFaceRealistic('z', -1, isShift ? 'counterclockwise' : 'clockwise');
        break;
      case 'l':
        rotateFaceRealistic('x', -1, isShift ? 'counterclockwise' : 'clockwise');
        break;
      case 'd':
        rotateFaceRealistic('y', -1, isShift ? 'counterclockwise' : 'clockwise');
        break;
   }
  }
});

document.addEventListener('keydown', (event) => {
  if (spacing <= finalSpacing + 0.01) { // Verifica che il cubo sia assemblato
    if (event.key === 's' || event.key === 'S') {
      scrambleCube(25); // 25 mosse casuali come di norma
    }
  }
});

// Funzione di utilità per debug
function printCubeState() {
  console.log("Current cube state:");
  cubelets.forEach(cube => {
    console.log(`Cube at position: `, cube.userData.gridPosition);
  });
}

// Gestione ridimensionamento finestra
window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
});


