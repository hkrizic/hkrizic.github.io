// Illustrative singular isothermal sphere plus external shear, in relative angular units.
export const EINSTEIN_RADIUS = 0.7;
export const SHEAR = 0.18;
export const SIMULATED_DELAY_DAYS = 24;

// The homepage keeps its moving source safely inside the four-image caustic.
export const HERO_QUASAR = Object.freeze({
  radius: 0.68,
  shear: 0.18,
  angle: 25 * Math.PI / 180,
  sourceX: 0.02,
  sourceY: 0.012,
  limitX: 0.06,
  limitY: 0.05
});

export function sourcePosition(x, y, radius = EINSTEIN_RADIUS, shear = SHEAR) {
  const r = Math.max(Math.hypot(x, y), 1e-10);
  return [(1 - shear) * x - radius * x / r, (1 + shear) * y - radius * y / r];
}

function jacobian(x, y, radius, shear) {
  const r3 = Math.max(Math.hypot(x, y) ** 3, 1e-15);
  const a = 1 - shear - radius * y * y / r3;
  const d = 1 + shear - radius * x * x / r3;
  const b = radius * x * y / r3;
  return { a, b, d, determinant: a * d - b * b };
}

export function solveQuasarImages(bx, by, radius = EINSTEIN_RADIUS, shear = SHEAR) {
  const images = [];
  for (const startRadius of [0.35, 0.7, 1.2, 1.7]) {
    for (let n = 0; n < 72; n++) {
      const angle = n * Math.PI / 36;
      let x = startRadius * Math.cos(angle), y = startRadius * Math.sin(angle);
      for (let step = 0; step < 80; step++) {
        const [sx, sy] = sourcePosition(x, y, radius, shear);
        const fx = sx - bx, fy = sy - by;
        if (Math.hypot(fx, fy) < 1e-9) break;
        const { a, b, d, determinant } = jacobian(x, y, radius, shear);
        if (Math.abs(determinant) < 1e-11) break;
        let dx = (d * fx - b * fy) / determinant;
        let dy = (a * fy - b * fx) / determinant;
        const damping = Math.min(1, 0.6 / Math.max(Math.hypot(dx, dy), 1e-10));
        x -= dx * damping; y -= dy * damping;
        if (!Number.isFinite(x + y) || Math.hypot(x, y) > 5) break;
      }
      const [sx, sy] = sourcePosition(x, y, radius, shear);
      if (Math.hypot(sx - bx, sy - by) > 1e-7 || Math.hypot(x, y) < 1e-6) continue;
      if (images.some(image => Math.hypot(image.x - x, image.y - y) < 1e-4)) continue;
      const { determinant } = jacobian(x, y, radius, shear);
      const potential = radius * Math.hypot(x, y) + shear * (x * x - y * y) / 2;
      const arrival = ((x - bx) ** 2 + (y - by) ** 2) / 2 - potential;
      images.push({ x, y, magnification: 1 / determinant, arrival });
    }
  }
  return images.sort((a, b) => a.arrival - b.arrival);
}

// A deterministic synthetic variability signal; it is not an observed quasar dataset.
export function intrinsicFlux(day) {
  return 1 + 0.12 * Math.sin(day * 0.088 + 0.2)
    + 0.055 * Math.sin(day * 0.23 + 1) + 0.045 * Math.cos(day * 0.047 - 0.5)
    + 0.3 * Math.exp(-(((day - 42) / 7) ** 2))
    + 0.23 * Math.exp(-(((day - 89) / 10) ** 2));
}

export function imageFlux(day, shiftEarlier = 0) {
  return intrinsicFlux(day + shiftEarlier - SIMULATED_DELAY_DAYS);
}
