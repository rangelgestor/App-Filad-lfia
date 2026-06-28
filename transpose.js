// ============================================================
//  Motor de transpose + conversor de cifra
// ============================================================
export const SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
export const FLAT = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
export const FLAT_KEYS = new Set(["F", "Bb", "Eb", "Ab", "Db", "Gb"]);

function noteIndex(n) {
  let i = SHARP.indexOf(n);
  if (i >= 0) return i;
  return FLAT.indexOf(n);
}
export function transposeNote(n, steps, useFlat) {
  const i = noteIndex(n);
  if (i < 0) return n;
  const j = ((i + steps) % 12 + 12) % 12;
  return useFlat ? FLAT[j] : SHARP[j];
}
export function transposeChord(chord, steps, useFlat) {
  const m = chord.match(/^([A-G][#b]?)([^/]*)(?:\/([A-G][#b]?))?$/);
  if (!m) return chord;
  const root = transposeNote(m[1], steps, useFlat);
  const bass = m[3] ? "/" + transposeNote(m[3], steps, useFlat) : "";
  return root + (m[2] || "") + bass;
}
export function transposeKey(key, steps) {
  const m = (key || "").match(/^([A-G][#b]?)(m?)$/);
  if (!m) return key;
  const useFlat = FLAT_KEYS.has(m[1]);
  return transposeNote(m[1], steps, useFlat) + m[2];
}
export function keyDistance(from, to) {
  const a = noteIndex((from || "").replace(/m$/, ""));
  const b = noteIndex((to || "").replace(/m$/, ""));
  if (a < 0 || b < 0) return 0;
  let d = ((b - a) % 12 + 12) % 12;
  if (d > 6) d -= 12;
  return d;
}

// ---- conversor: texto "acordes em cima da letra" -> linhas ancoradas ----
function isChord(t) {
  return /^[A-G][#b]?(?:m|maj|min|M|sus|dim|aug|add|°|ø|\+|-|\d|\(|\)|\/[A-G][#b]?)*$/.test(t) && /[A-G]/.test(t[0]);
}
function extractChords(line) {
  const out = [];
  const re = /\S+/g;
  let m;
  while ((m = re.exec(line)) !== null) if (isChord(m[0])) out.push({ col: m.index, chord: m[0] });
  return out;
}
function isChordLine(line) {
  const toks = line.trim().split(/\s+/).filter(Boolean);
  if (!toks.length) return false;
  const hits = toks.filter(isChord).length;
  return hits >= 1 && hits / toks.length >= 0.6;
}
export function parseCifra(raw) {
  const lines = (raw || "").replace(/\r/g, "").split("\n");
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (isChordLine(line)) {
      const acordes = extractChords(line);
      const next = lines[i + 1];
      if (next !== undefined && !isChordLine(next) && next.trim() !== "") {
        out.push({ acordes, letra: next });
        i += 2;
      } else {
        out.push({ acordes, letra: "" });
        i += 1;
      }
    } else {
      out.push({ acordes: [], letra: line });
      i += 1;
    }
  }
  return out;
}

export const CIFRA_EXEMPLO = `Intro: C  G  Am  F

C              G
Em Tua presença eu quero estar
Am             F
Adorar o Teu nome, Senhor
C            G
Tua bondade me alcançou
F           G        C
E a minha vida se rendeu`;
