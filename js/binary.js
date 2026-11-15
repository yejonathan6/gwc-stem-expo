// Uppercase ASCII → 8-bit binary helpers
export const MAX_LETTERS = 24;

export function cleanName(raw) {
  return raw.toUpperCase().replace(/[^A-Z]/g, "").slice(0, MAX_LETTERS);
}

export function letterToBits(ch) {
  return ch.charCodeAt(0).toString(2).padStart(8, "0");
}

export function nameToBits(name) {
  return [...name].map(letterToBits);
}

export const ALPHABET = Array.from({ length: 26 }, (_, i) => {
  const ch = String.fromCharCode(65 + i);
  return [ch, letterToBits(ch)];
});
