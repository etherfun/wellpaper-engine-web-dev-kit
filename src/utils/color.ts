/**
 * 颜色工具：hex 转换、调色板量化、主色提取。
 * 在 mediaMock 和 rgbMock 之间共享。
 */

export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('');
}

/** 16 阶量化（降低调色板噪声） */
export function quantizeHex(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const qr = Math.round(r / 16) * 16;
  const qg = Math.round(g / 16) * 16;
  const qb = Math.round(b / 16) * 16;
  return `#${qr.toString(16).padStart(2, '0')}${qg.toString(16).padStart(2, '0')}${qb.toString(16).padStart(2, '0')}`;
}

/** 0-1 RGB "R G B" 字符串 → hex */
export function weColorToHex(value: string | number | undefined, fallback = '#ffffff'): string {
  if (typeof value !== 'string') return fallback;
  const parts = value.split(/\s+/).map(Number);
  if (parts.length < 3 || parts.some((n) => Number.isNaN(n))) return fallback;
  const r = Math.round((parts[0] ?? 1) * 255);
  const g = Math.round((parts[1] ?? 1) * 255);
  const b = Math.round((parts[2] ?? 1) * 255);
  return rgbToHex(r, g, b);
}

/** hex → "R G B" (0-1) 字符串 */
export function hexToWeColor(hex: string): string {
  const safe = hex.startsWith('#') ? hex : `#${hex}`;
  const r = parseInt(safe.slice(1, 3), 16);
  const g = parseInt(safe.slice(3, 5), 16);
  const b = parseInt(safe.slice(5, 7), 16);
  return `${(r / 255).toFixed(2)} ${(g / 255).toFixed(2)} ${(b / 255).toFixed(2)}`;
}

/** 相对亮度 (0-255)，用于决定对比色 */
export function luminance(hex: string): number {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/**
 * 从 RGB 像素数组提取调色板（按 grid 网格分块 → 量化 → 占比排序）。
 * 最多返回 8 种颜色。
 */
export function extractPalette(
  pixels: number[],
  width: number,
  height: number,
  maxColors = 8
): { color: string; ratio: number }[] {
  if (pixels.length === 0 || width === 0 || height === 0) return [];

  const gridW = Math.min(10, width);
  const gridH = Math.min(10, height);
  const stepX = Math.max(1, Math.floor(width / gridW));
  const stepY = Math.max(1, Math.floor(height / gridH));

  const colorMap = new Map<string, number>();

  for (let gy = 0; gy < gridH; gy++) {
    for (let gx = 0; gx < gridW; gx++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let count = 0;
      const startY = gy * stepY;
      const startX = gx * stepX;
      const endY = Math.min(startY + stepY, height);
      const endX = Math.min(startX + stepX, width);

      for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
          const idx = (y * width + x) * 3;
          r += pixels[idx] ?? 0;
          g += pixels[idx + 1] ?? 0;
          b += pixels[idx + 2] ?? 0;
          count++;
        }
      }

      if (count > 0) {
        const hex = rgbToHex(Math.round(r / count), Math.round(g / count), Math.round(b / count));
        const quantized = quantizeHex(hex);
        colorMap.set(quantized, (colorMap.get(quantized) || 0) + 1);
      }
    }
  }

  const total = gridW * gridH;
  return [...colorMap.entries()]
    .map(([color, count]) => ({ color, ratio: count / total }))
    .sort((a, b) => b.ratio - a.ratio)
    .slice(0, maxColors);
}