const gridContainer = document.getElementById('grid');
const searchBtn = document.getElementById('searchBtn');
const rotateBtn = document.getElementById('rotateBtn');
const clearBtn = document.getElementById('clearBtn');
const resultDiv = document.getElementById('result');

const gridSize = 16;
let bedrockMatrix = Array(gridSize).fill().map(() => Array(gridSize).fill(0));

// Generate the interactive UI grid
function createGrid() {
    gridContainer.innerHTML = '';
    for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            if (bedrockMatrix[r][c] === 1) cell.classList.add('bedrock');
            
            cell.addEventListener('click', () => {
                bedrockMatrix[r][c] = bedrockMatrix[r][c] === 0 ? 1 : 0;
                cell.classList.toggle('bedrock');
            });
            gridContainer.appendChild(cell);
        }
    }
}

// Java LCG random engine mapping Minecraft's native world-gen behavior
class MinecraftRandom {
    constructor(seed) {
        this.seed = BigInt(seed);
        this.multiplier = 0x5DEECE66DNn;
        this.addend = 0xBLn;
        this.mask = (1N << 48N) - 1N;
        this.seed = (this.seed ^ this.multiplier) & this.mask;
    }

    nextBits(bits) {
        this.seed = (this.seed * this.multiplier + this.addend) & this.mask;
        return Number(this.seed >> (48N - BigInt(bits)));
    }

    nextInt(bound) {
        if ((bound & -bound) === bound) {
            return Number((BigInt(bound) * BigInt(this.nextBits(31))) >> 31N);
        }
        let bits, val;
        do {
            bits = this.nextBits(31);
            val = bits % bound;
        } while (bits - val + (bound - 1) < 0);
        return val;
    }
}

// Computes bedrock layouts based on chunk coordinates and type
function isBedrockAt(worldSeed, x, z, dimension) {
    let blockSeed = BigInt(x) * 341873128712N + BigInt(z) * 132897987541N + BigInt(worldSeed);
    let rand = new MinecraftRandom(blockSeed);
    let randValue = rand.nextInt(5);
    
    if (dimension === "overworld_floor" || dimension === "nether_floor") {
        return randValue === 0 ? 1 : 0; // Bedrock at specific bottom layers
    } else if (dimension === "nether_roof") {
        return randValue === 0 ? 1 : 0; // Mirrored generation profile
    }
    return 0;
}

// Scans surrounding world grid coordinates
function searchForPattern(worldSeed, targetMatrix, dimension) {
    const searchLimit = 3000; // Search within +/- 3000 blocks
    
    for (let x = -searchLimit; x < searchLimit; x += 16) {
        for (let z = -searchLimit; z < searchLimit; z += 16) {
            let match = true;
            
            for (let r = 0; r < 16; r++) {
                for (let c = 0; c < 16; c++) {
                    let generated = isBedrockAt(worldSeed, x + r, z + c, dimension);
                    if (generated !== targetMatrix[r][c]) {
                        match = false;
                        break;
                    }
                }
                if (!match) break;
            }
            if (match) return { x, z };
        }
    }
    return null;
}

// Handle UI controls
rotateBtn.addEventListener('click', () => {
    // Transpose matrix for 90 degree pattern turns
    bedrockMatrix = bedrockMatrix[0].map((val, index) => bedrockMatrix.map(row => row[index]).reverse());
    createGrid();
});

clearBtn.addEventListener('click', () => {
    bedrockMatrix = Array(gridSize).fill().map(() => Array(gridSize).fill(0));
    createGrid();
    resultDiv.style.display = 'none';
});

searchBtn.addEventListener('click', () => {
    const seedInput = document.getElementById('seed').value;
    const dimension = document.getElementById('dimension').value;
    
    if (!seedInput) {
        alert("Please enter your world seed!");
        return;
    }
    
    resultDiv.className = 'searching';
    resultDiv.style.display = 'block';
    resultDiv.innerText = "Scanning chunk arrays... (This may take a moment)";
    
    setTimeout(() => {
        const result = searchForPattern(seedInput, bedrockMatrix, dimension);
        if (result) {
            resultDiv.className = 'success';
            resultDiv.innerHTML = `📍 Match Found!<br>Chunk Origin: X: <strong>${result.x}</strong>, Z: <strong>${result.z}</strong>`;
        } else {
            resultDiv.className = 'error';
            resultDiv.innerText = "No matching coordinates found within 3000 blocks. Try rotating or adjusting the pattern.";
        }
    }, 50);
});

createGrid();
