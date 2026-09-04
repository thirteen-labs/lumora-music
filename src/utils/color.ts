export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function withAlpha(color: string, alpha: number): string {
  if (color.startsWith('#')) return hexToRgba(color, alpha);
  const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
  if (match) {
    return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${alpha})`;
  }
  return color;
}

export function lighten(hex: string, amount: number): string {
  const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + amount);
  const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + amount);
  const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export function darken(hex: string, amount: number): string {
  const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - amount);
  const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - amount);
  const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export function mix(hexA: string, hexB: string, weight: number): string {
  const w = Math.max(0, Math.min(1, weight));
  const r = Math.round(parseInt(hexA.slice(1, 3), 16) * (1 - w) + parseInt(hexB.slice(1, 3), 16) * w);
  const g = Math.round(parseInt(hexA.slice(3, 5), 16) * (1 - w) + parseInt(hexB.slice(3, 5), 16) * w);
  const b = Math.round(parseInt(hexA.slice(5, 7), 16) * (1 - w) + parseInt(hexB.slice(5, 7), 16) * w);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export function toRgbaChannels(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

export function glassColor(hex: string, alpha: number, isDark: boolean): string {
  const [r, g, b] = toRgbaChannels(hex);
  if (isDark) {
    return `rgba(${Math.min(255, r + 12)}, ${Math.min(255, g + 12)}, ${Math.min(255, b + 12)}, ${alpha})`;
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function luminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

export function isLight(hex: string): boolean {
  return luminance(hex) > 0.5;
}
