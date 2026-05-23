const gridContainer = document.getElementById('grid');
const searchBtn = document.getElementById('searchBtn');
const rotateBtn = document.getElementById('rotateBtn');
const clearBtn = document.getElementById('clearBtn');
const resultDiv = document.getElementById('result');
const imageInput = document.getElementById('imageInput');
const canvas = document.getElementById('processCanvas');
const ctx = canvas.getContext('2d');

const gridSize = 16;
let bedrockMatrix = Array(gridSize).fill().map(() => Array(gridSize).fill(0));

// Build visual board items
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

// Automatically process uploaded image pixels
imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const img = new Image();
    img.onload = () => {
        // Squish image data into a raw 16x16 sample layout
        canvas.width = gridSize;
        canvas.height = gridSize;
        ctx.drawImage(img, 0, 0, gridSize, gridSize);
        
        const imgData = ctx.getImageData(0, 0, gridSize, gridSize).data;
        
        for (let r = 0; r < gridSize; r++) {
            for (let c = 0; c < gridSize; c++) {
                const idx = (r * gridSize + c) * 4;
                const rVal = imgData[idx];
                const gVal = imgData[idx + 1];
                const bVal = imgData[idx + 2];
                
                // Calculate brightness value
                const brightness = (rVal + gVal + bVal) / 3;
                
                // Bedrock blocks are notably darker than surrounding stone/netherrack layers
                bedrockMatrix[r][c] = brightness < 75 ? 1 : 0;
            }
        }
        createGrid();
    };
    img.src = URL.createObjectURL(file);
});

// Java LCG engine replicating Minecraft's layout formulas
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

function isBedrockAt(worldSeed, x, z, dimension) {
    let blockSeed = BigInt(x) * 341873128712N + BigInt(z) * 132897987541N + BigInt(worldSeed);
    let rand = new MinecraftRandom(blockSeed);
    let randValue = rand.nextInt(5);
    return randValue === 0 ? 1 : 0;
}

function searchForPattern(worldSeed, targetMatrix, dimension) {
    const searchLimit = 4000; 
    
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

rotateBtn.addEventListener('click', () => {
    bedrockMatrix = bedrockMatrix.map((val, index) => bedrockMatrix.map(row => row[index]).reverse());
    createGrid();
});

clearBtn.addEventListener('click', () => {
    bedrockMatrix = Array(gridSize).fill().map(() => Array(gridSize).fill(0));
    createGrid();
    resultDiv.style.display = 'none';
    imageInput.value = "";
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
    resultDiv.innerText = "Scanning coordinate maps... (This may take a moment)";
    
    setTimeout(() => {
        const result = searchForPattern(seedInput, bedrockMatrix, dimension);
        if (result) {
            resultDiv.className = 'success';
            resultDiv.innerHTML = `📍 Match Found!<br>Chunk Coordinates: X: <strong>${result.x}</strong>, Z: <strong>${result.z}</strong>`;
        } else {
            resultDiv.className = 'error';
            resultDiv.innerText = "No matching coordinates found within 4000 blocks. Try rotating the grid or cleaning up misread blocks.";
        }
    }, 50);
});

createGrid();
