import fs from "node:fs";
import path from "node:path";

// ====== Parametri base ======
const OUT_DIR = "dist";
const OUT_FILE = "space-invaders-contribution-graph.svg";

// Per dare “vita” quotidiana: posizione alieni dipende dal giorno dell’anno
const today = new Date();
const start = new Date(Date.UTC(today.getUTCFullYear(), 0, 1));
const dayOfYear = Math.floor((today - start) / 86400000) + 1;

// Griglia stile contribution (7 righe x 53 colonne ~ 371 giorni)
const ROWS = 7;
const COLS = 53;
const CELL = 12;      // lato cella
const GAP = 3;        // gap tra celle
const PAD = 20;       // padding esterno

const width = PAD * 2 + COLS * CELL + (COLS - 1) * GAP;
const height = PAD * 2 + ROWS * CELL + (ROWS - 1) * GAP;

// Palette “GitHub-like” (chiaro → scuro)
const palette = ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"];

// ====== (Facoltativo) Colori dalle contribution reali ======
// Mappa finta/semplice per non dipendere dall’API.
function fakeContributionLevel(col, row) {
  const seed = (dayOfYear * 131 + col * 17 + row * 7) % 100;
  if (seed > 85) return 4;
  if (seed > 65) return 3;
  if (seed > 40) return 2;
  if (seed > 15) return 1;
  return 0;
}

// ====== Sprite Space Invaders (matrice 0/1) ======
const invader = [
  "0011100",
  "0111110",
  "1111111",
  "1011101",
  "1111111",
  "0100010",
  "1011101"
].map(row => row.split("").map(Number));

const cannon = [
  "0001000",
  "0011100",
  "0111110",
  "1111111"
].map(r => r.split("").map(Number));

// ====== COSTRUZIONE CONTENUTO ======

// 1) Griglia "background" statica
let bgCells = "";
for (let r = 0; r < ROWS; r++) {
  for (let c = 0; c < COLS; c++) {
    const x = PAD + c * (CELL + GAP);
    const y = PAD + r * (CELL + GAP);
    const level = fakeContributionLevel(c, r);
    bgCells += `<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="2" ry="2" fill="${palette[level]}"/>`;
  }
}

// 2) Disegniamo INVADER e CANNON in coordinate "locali" (0,0) del loro gruppo;
// poi li muoviamo con animazioni CSS
const invW = invader[0].length;
const invH = invader.length;
const cannonW = cannon[0].length;
const cannonH = cannon.length;

let invaderRects = "";
for (let r = 0; r < invH; r++) {
  for (let c = 0; c < invW; c++) {
    if (invader[r][c]) {
      const x = c * (CELL + GAP);
      const y = r * (CELL + GAP);
      invaderRects += `<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="2" ry="2" fill="#0b1f2a"/>`;
    }
  }
}

let cannonRects = "";
for (let r = 0; r < cannonH; r++) {
  for (let c = 0; c < cannonW; c++) {
    if (cannon[r][c]) {
      const x = c * (CELL + GAP);
      const y = r * (CELL + GAP);
      cannonRects += `<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="2" ry="2" fill="#0b1f2a"/>`;
    }
  }
}

// 3) Posizioni di partenza (in pixel) dei gruppi
const invStartX = PAD;                         // a sinistra
const invStartY = PAD;                         // in alto
const invMaxShift = (COLS - invW) * (CELL + GAP); // quanto può marciare a dx

const cannonStartX = PAD + Math.floor((COLS - cannonW) / 2) * (CELL + GAP);
const cannonStartY = PAD + (ROWS - cannonH) * (CELL + GAP);

// 4) Proiettile che sale in loop; posizionato sopra al cannon e mosso con translateY
const bulletSize = Math.floor(CELL / 3);
const bulletLocalX = Math.floor((cannonW * (CELL + GAP) - bulletSize) / 2);
const bulletStartY = - (ROWS - cannonH - 1) * (CELL + GAP); // fino in alto

// Etichetta
const label = `${process.env.GITHUB_USER_NAME ?? "user"} • Space Invaders • ${today.toISOString().slice(0,10)}`;

// Durate animazioni (regolabili)
const marchSeconds = 8;   // avanti-indietro dell’invader
const bulletSeconds = 4;  // salita del proiettile

// ====== SVG ANIMATO ======
const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height + 40}" viewBox="0 0 ${width} ${height + 40}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${label}">
  <title>${label}</title>
  <style>
    @keyframes march {
      0%   { transform: translateX(0); }
      50%  { transform: translateX(${invMaxShift}px); }
      100% { transform: translateX(0); }
    }
    @keyframes shoot {
      0%   { transform: translateY(0); opacity: 1; }
      90%  { opacity: 1; }
      100% { transform: translateY(${bulletStartY}px); opacity: 0; }
    }
    #invader { animation: march ${marchSeconds}s ease-in-out infinite; transform-origin: 0 0; will-change: transform; }
    #bullet  { animation: shoot ${bulletSeconds}s linear infinite; transform-origin: 0 0; will-change: transform; }
  </style>

  <rect x="0" y="0" width="${width}" height="${height + 40}" fill="#ffffff"/>
  <!-- Griglia contribution -->
  ${bgCells}

  <!-- Gruppo INVADER che marcia orizzontalmente -->
  <g id="invader" transform="translate(${invStartX}, ${invStartY})">
    ${invaderRects}
  </g>

  <!-- CANNON fisso in basso -->
  <g id="cannon" transform="translate(${cannonStartX}, ${cannonStartY})">
    ${cannonRects}
    <!-- Bullet animato che sale -->
    <g id="bullet" transform="translate(${bulletLocalX}, ${-bulletSize})">
      <rect x="0" y="0" width="${bulletSize}" height="${bulletSize}" rx="1" ry="1" fill="#0b1f2a"/>
    </g>
  </g>

  <text x="${width/2}" y="${height + 28}" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="14" text-anchor="middle" fill="#0b1f2a">${label}</text>
</svg>`;

// Scrive su dist/
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, OUT_FILE), svg, "utf8");
console.log(`Creato (animato): ${path.join(OUT_DIR, OUT_FILE)}`);
