import fs from "node:fs";
import path from "node:path";

// ====== Parametri base ======
const OUT_DIR = "dist";
const OUT_FILE = "space-invaders-contribution-graph.svg";

const today = new Date();
const start = new Date(Date.UTC(today.getUTCFullYear(), 0, 1));
const dayOfYear = Math.floor((today - start) / 86400000) + 1;

// Griglia stile contribution (7 x 53)
const ROWS = 7;
const COLS = 53;
const CELL = 12;
const GAP = 3;
const PAD = 20;

const width  = PAD * 2 + COLS * CELL + (COLS - 1) * GAP;
const height = PAD * 2 + ROWS * CELL + (ROWS - 1) * GAP;

// Palette “GitHub-like”
const palette = ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"];

// Finto livello contribution (se vuoi: sostituisci con dati reali)
function fakeContributionLevel(col, row) {
  const seed = (dayOfYear * 131 + col * 17 + row * 7) % 100;
  if (seed > 85) return 4;
  if (seed > 65) return 3;
  if (seed > 40) return 2;
  if (seed > 15) return 1;
  return 0;
}

// Sprite
const invader = [
  "0011100",
  "0111110",
  "1111111",
  "1011101",
  "1111111",
  "0100010",
  "1011101"
].map(r => r.split("").map(Number));

const cannon = [
  "0001000",
  "0011100",
  "0111110",
  "1111111"
].map(r => r.split("").map(Number));

// ====== Costruzione griglia background ======
let bgCells = "";
for (let r = 0; r < ROWS; r++) {
  for (let c = 0; c < COLS; c++) {
    const x = PAD + c * (CELL + GAP);
    const y = PAD + r * (CELL + GAP);
    const level = fakeContributionLevel(c, r);
    bgCells += `<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="2" ry="2" fill="${palette[level]}"/>`;
  }
}

// INVADER in alto (puoi animarlo orizzontalmente)
const invW = invader[0].length, invH = invader.length;
let invaderRects = "";
for (let r = 0; r < invH; r++) {
  for (let c = 0; c < invW; c++) if (invader[r][c]) {
    const x = c * (CELL + GAP);
    const y = r * (CELL + GAP);
    invaderRects += `<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="2" ry="2" fill="#0b1f2a"/>`;
  }
}
const invStartX = PAD;
const invStartY = PAD;
const invMaxShift = (COLS - invW) * (CELL + GAP); // quanto può marciare a dx

// CANNON: dimensioni locali (prima della rotazione)
const cannonW = cannon[0].length, cannonH = cannon.length;
let cannonRects = "";
for (let r = 0; r < cannonH; r++) {
  for (let c = 0; c < cannonW; c++) if (cannon[r][c]) {
    const x = c * (CELL + GAP);
    const y = r * (CELL + GAP);
    cannonRects += `<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="2" ry="2" fill="#0b1f2a"/>`;
  }
}

// Bounding box (in px) del cannon prima della rotazione
const cannonBoxW = cannonW * (CELL + GAP) - GAP;
const cannonBoxH = cannonH * (CELL + GAP) - GAP;

// POSIZIONE nave: **in basso a sinistra**
// La ruotiamo di 90° in senso orario per “puntare a destra”.
// Mettiamo l’origine del gruppo alla base sinistra del rettangolo di gioco.
const leftX   = PAD;
const bottomY = PAD + ROWS * (CELL + GAP) - GAP;

// Oscillazione su/giù
const bobAmplitude = 8;   // px
const bobSeconds   = 3.5; // durata

// PROIETTILE: parte dal “naso” della nave e va a destra
const bulletSize   = Math.floor(CELL / 3);
const noseX        = leftX + cannonBoxH;              // fronte dopo rotate(90)
const noseYCenter  = bottomY - cannonBoxW / 2;        // centro verticale della nave
const bulletStartX = noseX + 2;
const bulletStartY = noseYCenter - bulletSize / 2;
const bulletTravel = width - PAD - bulletStartX - bulletSize; // fino al margine destro

// Etichetta
const label = `${process.env.GITHUB_USER_NAME ?? "user"} • Space Invaders • ${today.toISOString().slice(0,10)}`;

// Animazioni
const marchSeconds  = 8;    // invader orizzontale (opzionale)
const bulletSeconds = 2.5;  // proiettile

// ====== SVG COMPLETO ======
const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height + 40}" viewBox="0 0 ${width} ${height + 40}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${label}">
  <title>${label}</title>
  <style>
    @keyframes march {
      0%   { transform: translateX(0); }
      50%  { transform: translateX(${invMaxShift}px); }
      100% { transform: translateX(0); }
    }
    @keyframes bob {
      0%   { transform: translateY(0); }
      50%  { transform: translateY(-${bobAmplitude}px); }
      100% { transform: translateY(0); }
    }
    @keyframes shootRight {
      0%   { transform: translateX(0); opacity: 1; }
      90%  { opacity: 1; }
      100% { transform: translateX(${bulletTravel}px); opacity: 0; }
    }
    #invaderGroup { animation: march ${marchSeconds}s ease-in-out infinite; transform-origin: 0 0; will-change: transform; }
    #shipBob      { animation: bob ${bobSeconds}s ease-in-out infinite; transform-origin: 0 0; will-change: transform; }
    #bullet       { animation: shootRight ${bulletSeconds}s linear infinite; transform-origin: 0 0; will-change: transform; }
    text { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
  </style>

  <rect x="0" y="0" width="${width}" height="${height + 40}" fill="#ffffff"/>
  <!-- Griglia contribution -->
  ${bgCells}

  <!-- Invader in alto (marcia orizzontale) -->
  <g id="invaderGroup" transform="translate(${invStartX}, ${invStartY})">
    ${invaderRects}
  </g>

  <!-- Nave in basso a sinistra: prima posizioniamo, poi ruotiamo per puntare a destra -->
  <!-- L'oscillazione verticale è applicata a shipBob (wrapper) -->
  <g transform="translate(${leftX}, ${bottomY})">
    <g id="shipBob">
      <g id="ship" transform="rotate(90)">
        ${cannonRects}
      </g>
      <!-- Proiettile che parte dal naso e va a destra, seguendo anche l'oscillazione -->
      <g transform="translate(${bulletStartX - leftX}, ${bulletStartY - bottomY})">
        <g id="bullet">
          <rect x="0" y="0" width="${bulletSize}" height="${bulletSize}" rx="1" ry="1" fill="#0b1f2a"/>
        </g>
      </g>
    </g>
  </g>

  <text x="${width/2}" y="${height + 28}" font-size="14" text-anchor="middle" fill="#0b1f2a">${label}</text>
</svg>`;

// Scrive su dist/
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, OUT_FILE), svg, "utf8");
console.log(`Creato (animato): ${path.join(OUT_DIR, OUT_FILE)}`);
