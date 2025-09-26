// scripts/generate-space-invaders.mjs
import fs from "node:fs";
import path from "node:path";

// ====== Parametri base ======
const OUT_DIR  = "dist";
const OUT_FILE = "space-invaders-contribution-graph.svg";

const today = new Date();
const start = new Date(Date.UTC(today.getUTCFullYear(), 0, 1));
const dayOfYear = Math.floor((today - start) / 86400000) + 1;

// Griglia stile contribution
const ROWS = 7;
const COLS = 53;
const CELL = 12;
const GAP  = 3;
const PAD  = 20;

const gridW = COLS * CELL + (COLS - 1) * GAP;
const gridH = ROWS * CELL + (ROWS - 1) * GAP;
const width  = PAD * 2 + gridW;
const height = PAD * 2 + gridH;

const palette = ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"];

// contribution fake (solo estetica)
function fakeContributionLevel(col, row) {
  const seed = (dayOfYear * 131 + col * 17 + row * 7) % 100;
  if (seed > 85) return 4;
  if (seed > 65) return 3;
  if (seed > 40) return 2;
  if (seed > 15) return 1;
  return 0;
}

// ====== Background griglia ======
let bg = "";
for (let r = 0; r < ROWS; r++) {
  for (let c = 0; c < COLS; c++) {
    const x = PAD + c * (CELL + GAP);
    const y = PAD + r * (CELL + GAP);
    const lvl = fakeContributionLevel(c, r);
    bg += `<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="2" ry="2" fill="${palette[lvl]}"/>`;
  }
}

// ====== Sprite (7x7) ======
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

// Rettangoli alieno (in coords locali)
function buildInvaderRects(fill = "#0b1f2a") {
  let s = "";
  for (let r = 0; r < invader.length; r++) {
    for (let c = 0; c < invader[0].length; c++) {
      if (invader[r][c]) {
        const x = c * (CELL + GAP);
        const y = r * (CELL + GAP);
        s += `<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="2" ry="2" fill="${fill}"/>`;
      }
    }
  }
  return s;
}

// Rettangoli nave (in coords locali)
function buildCannonRects(fill = "#0b1f2a") {
  let s = "";
  for (let r = 0; r < cannon.length; r++) {
    for (let c = 0; c < cannon[0].length; c++) {
      if (cannon[r][c]) {
        const x = c * (CELL + GAP);
        const y = r * (CELL + GAP);
        s += `<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="2" ry="2" fill="${fill}"/>`;
      }
    }
  }
  return s;
}

// ====== Formazione alieni (più piccoli e tanti) ======
const invLocalW = invader[0].length * (CELL + GAP) - GAP;
const invLocalH = invader.length    * (CELL + GAP) - GAP;

const INV_SCALE     = 0.55;            // scala per rimpicciolire ogni alieno
const FORM_COLS     = 10;              // colonne di alieni
const FORM_ROWS     = 3;               // righe di alieni
const FORM_SP_X     = 8;               // spazio extra orizzontale tra alieni (px, dopo la scala)
const FORM_SP_Y     = 10;              // spazio extra verticale tra righe (px, dopo la scala)

const invStepX = invLocalW * INV_SCALE + FORM_SP_X;
const invStepY = invLocalH * INV_SCALE + FORM_SP_Y;

const formationW = FORM_COLS * invLocalW * INV_SCALE + (FORM_COLS - 1) * FORM_SP_X;
const formationH = FORM_ROWS * invLocalH * INV_SCALE + (FORM_ROWS - 1) * FORM_SP_Y;

// Costruiamo i cloni
const invaderRects = buildInvaderRects();
let formation = "";
for (let rr = 0; rr < FORM_ROWS; rr++) {
  for (let cc = 0; cc < FORM_COLS; cc++) {
    const tx = cc * invStepX;
    const ty = rr * invStepY;
    formation += `<g transform="translate(${tx}, ${ty}) scale(${INV_SCALE})">${invaderRects}</g>`;
  }
}

// Posizionamento formazione (in alto, centrata orizzontalmente)
const formationY = PAD; // parte alta della griglia
const formationX = PAD + Math.max(0, (gridW - formationW) / 2);

// Quanto può marciare orizzontalmente (quasi tutta la griglia)
const formationMaxShift = Math.max(0, gridW - formationW);

// ====== Nave (patrol orizzontale + bob verticale) ======
const cannonWpx = cannon[0].length * (CELL + GAP) - GAP;
const cannonHpx = cannon.length    * (CELL + GAP) - GAP;

// La nave punta a destra (rotate 90°). La mettiamo vicino al bordo sinistro, in basso.
const shipBaseX = PAD + 2;                          // margine sinistro
const shipBaseY = PAD + gridH - 2;                  // margine inferiore
// Spazio che la nave può percorrere orizzontalmente (quasi tutta la riga)
const shipMaxPatrol = Math.max(0, gridW - cannonHpx - 6); // -6 px di margine destro
// Oscillazione verticale
const BOB_PX = 10;

// Proiettile: parte dal “naso” (fronte destro dopo rotate 90) e viaggia verso destra
const bulletSize = Math.floor(CELL / 3);
const bulletTravel = Math.max(0, gridW - (cannonHpx + 8) - bulletSize); // quanto corre il colpo fuori dalla nave

// Etichetta
const label = `${process.env.GITHUB_USER_NAME ?? "user"} • Space Invaders • ${today.toISOString().slice(0,10)}`;

// Tempi animazioni (regolabili)
const marchSec   = 6.5; // alieni
const patrolSec  = 7.0; // nave orizzontale
const bobSec     = 3.2; // nave bob
const bulletSec  = 2.0; // proiettile

// ====== SVG ======
const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height + 42}" viewBox="0 0 ${width} ${height + 42}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${label}">
  <title>${label}</title>
  <style>
    @keyframes march {
      0%   { transform: translateX(0); }
      50%  { transform: translateX(${formationMaxShift}px); }
      100% { transform: translateX(0); }
    }
    @keyframes patrol {
      0%   { transform: translateX(0); }
      50%  { transform: translateX(${shipMaxPatrol}px); }
      100% { transform: translateX(0); }
    }
    @keyframes bob {
      0%   { transform: translateY(0); }
      50%  { transform: translateY(-${BOB_PX}px); }
      100% { transform: translateY(0); }
    }
    @keyframes shootRight {
      0%   { transform: translateX(0); opacity: 1; }
      90%  { opacity: 1; }
      100% { transform: translateX(${bulletTravel}px); opacity: 0; }
    }
    #formation { animation: march ${marchSec}s ease-in-out infinite; transform-origin: 0 0; }
    #shipPatrol { animation: patrol ${patrolSec}s ease-in-out infinite; transform-origin: 0 0; }
    #shipBob    { animation: bob ${bobSec}s ease-in-out infinite; transform-origin: 0 0; }
    #bullet     { animation: shootRight ${bulletSec}s linear infinite; transform-origin: 0 0; }
    text { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
  </style>

  <rect x="0" y="0" width="${width}" height="${height + 42}" fill="#ffffff"/>
  <!-- Griglia di sfondo -->
  ${bg}

  <!-- FORMAZIONE DI ALIENI (piccoli, 3x10), che marcia quasi su tutta la larghezza -->
  <g transform="translate(${formationX}, ${formationY})">
    <g id="formation">
      ${formation}
    </g>
  </g>

  <!-- NAVE: in basso, fa patrol sinistra<->destra e bob verticale, punta a destra -->
  <g transform="translate(${shipBaseX}, ${shipBaseY})">
    <g id="shipPatrol">
      <g id="shipBob">
        <!-- sistema ruotato per puntare a destra -->
        <g transform="rotate(90)">
          ${buildCannonRects("#0b1f2a")}
          <!-- Proiettile ancorato dentro la nave, parte dal “naso” -->
          <g id="bullet" transform="translate(${cannonHpx + 2}, ${-cannonWpx / 2})">
            <rect x="0" y="0" width="${bulletSize}
