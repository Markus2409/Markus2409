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

// INVADER in alto (statico come prima — opzionale)
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
// Rotiamo il cannon di 90° in senso orario per “puntare a destra”.
// Con rotate(90) attorno a (0,0), l’oggetto occupa x:[0..H], y:[-W..0].
// Portiamo l’origine (0,0) a (leftX, bottomY) così la base tocca il fondo.
const leftX   = PAD;
const bottomY = PAD + ROWS * (CELL + GAP) - GAP;

// Wrapper che oscilla su/giù
const bobAmplitude = 8;            // px
const bobSeconds   = 3.5;          // durata oscillazione

// PROIETTILE: parte dal “naso” (fronte destro dopo la rotazione) e va a destra
const bulletSize   = Math.floor(CELL / 3);
const noseX        = leftX + cannonBoxH;                    // fronte dopo rotate(90)
const noseYCenter  = bottomY - cannonBoxW / 2;              // centro verticale della nave
const bulletStartX = noseX + 2;                             
const bulletStartY = noseYCenter - bulletSize / 2;
const bulletTravel = width - PAD - bulletStartX - bulletSize; // fino al margine destro

// Etichetta
const label = `${process.env.GITHUB_USER_NAME ?? "user"} • Space Invaders • ${today.toISOString().slice(0,10)}`;

// Animazioni
const marchSeconds  = 8;  // (opzionale: invader che marcia orizzontalmente)
const bulletSeconds = 2.5;

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height + 40}" viewBox="0 0 ${
