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
// Manteniamo una mappa finta/semplice per non dipendere dall’API.
// Se vuoi usare davvero le contribution, vedi la sezione “Estensione GraphQL” più sotto.
function fakeContributionLevel(col, row) {
  // pattern pseudocasuale, stabile per giorno/col/row
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

// Offset orizzontale che “marcia” ogni giorno
const step = dayOfYear % (Math.max(0, COLS - invader[0].length));

// Posizioni (riga/colonna) sulla griglia contribution
const invaderTop = 0;           // in alto
const invaderLeft = step;       // si sposta col tempo

const cannonRow = ROWS - cannon.length; // in basso
const cannonCol = Math.max(0, Math.min(COLS - cannon[0].length, Math.floor(COLS / 2) - 2));

// Colonna del “proiettile” che sale
const bulletCol = cannonCol + Math.floor(cannon[0].length / 2);
const bulletHeight = (dayOfYear % (ROWS - 2)) + 1; // si muove giorno per giorno

// ====== SVG ======
let cells = "";

// Sfondo a griglia “contribution”
for (let r = 0; r < ROWS; r++) {
  for (let c = 0; c < COLS; c++) {
    const x = PAD + c * (CELL + GAP);
    const y = PAD + r * (CELL + GAP);
    const level = fakeContributionLevel(c, r);
    cells += `<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="2" ry="2" fill="${palette[level]}"/>`;
  }
}

// Disegna invader
for (let r = 0; r < invader.length; r++) {
  for (let c = 0; c < invader[0].length; c++) {
    if (invader[r][c] === 1) {
      const gridR = invaderTop + r;
      const gridC = invaderLeft + c;
      if (gridR < ROWS && gridC < COLS) {
        const x = PAD + gridC * (CELL + GAP);
        const y = PAD + gridR * (CELL + GAP);
        cells += `<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="2" ry="2" fill="#0b1f2a"/>`;
      }
    }
  }
}

// Disegna cannon
for (let r = 0; r < cannon.length; r++) {
  for (let c = 0; c < cannon[0].length; c++) {
    if (cannon[r][c] === 1) {
      const gridR = cannonRow + r;
      const gridC = cannonCol + c;
      const x = PAD + gridC * (CELL + GAP);
      const y = PAD + gridR * (CELL + GAP);
      cells += `<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="2" ry="2" fill="#0b1f2a"/>`;
    }
  }
}

// Proiettile che “sale”
for (let r = 0; r < bulletHeight; r++) {
  const gridR = cannonRow - 1 - r;
  if (gridR < 0) break;
  const gridC = bulletCol;
  const x = PAD + gridC * (CELL + GAP) + CELL / 3;
  const y = PAD + gridR * (CELL + GAP) + CELL / 3;
  cells += `<rect x="${x}" y="${y}" width="${CELL / 3}" height="${CELL / 3}" rx="1" ry="1" fill="#0b1f2a"/>`;
}

// Titolo e data
const label = `${process.env.GITHUB_USER_NAME ?? "user"} • Space Invaders • ${today.toISOString().slice(0,10)}`;

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height + 40}" viewBox="0 0 ${width} ${height + 40}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${label}">
  <title>${label}</title>
  <rect x="0" y="0" width="${width}" height="${height + 40}" fill="#ffffff"/>
  ${cells}
  <text x="${width/2}" y="${height + 28}" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="14" text-anchor="middle" fill="#0b1f2a">${label}</text>
</svg>`;

// Scrive su dist/
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, OUT_FILE), svg, "utf8");
console.log(`Creato: ${path.join(OUT_DIR, OUT_FILE)}`);
