// Tiny event bus so any feature can make Bitsy react: bitsy("cheer", "You got it!")
export function bitsy(kind, line) {
  window.dispatchEvent(new CustomEvent("bitsy", { detail: { kind, line } }));
}
