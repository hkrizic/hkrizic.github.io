// Monochrome theme shared by canvas renderers (matches the ALPACA logo: black line art on white).
export const THEME = {
  bg: "#ffffff",
  fg: "#000000",
  fg2: "#2a2a2a",
  muted: "#6f6f6f",
  faint: "#c4c4c4",
  grid: "#ededed",
  border: "#d6d6d6",
  series: ["#000000", "#8c8c8c", "#c8c8c8", "#555555"],
  prior: "#9c9c9c",
  overlay: "#ffffff",
  overlayDark: "#000000",
  halo: "rgba(0,0,0,0.55)",
  font: "'Jost', 'Helvetica Neue', Helvetica, Arial, sans-serif",
  mono: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
};

export function series(i) { return THEME.series[i % THEME.series.length]; }

export function alpha(hex, a) {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

export const F = {
  tick: `10px ${THEME.font}`,
  small: `11px ${THEME.font}`,
  label: `12px ${THEME.font}`,
};
