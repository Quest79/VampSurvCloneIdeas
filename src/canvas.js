export const canvas = document.getElementById('gameCanvas');
export const ctx = canvas.getContext('2d');
export const baseWidth = 2400;
export const baseHeight = 1350;

canvas.width = baseWidth;
canvas.height = baseHeight;

export function resizeCanvas() {
  const scale = Math.min(window.innerWidth / baseWidth, window.innerHeight / baseHeight);
  canvas.style.width = `${Math.round(baseWidth * scale)}px`;
  canvas.style.height = `${Math.round(baseHeight * scale)}px`;
}
