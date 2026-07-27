/**
 * RGB 像素数组 ↔ ImageData 互转。
 */

export function pixelsToImageData(
  pixels: number[],
  width: number,
  height: number
): ImageData | null {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const imageData = ctx.createImageData(width, height);
    for (let i = 0; i < pixels.length / 3; i++) {
      const pi = i * 3;
      const di = i * 4;
      imageData.data[di] = pixels[pi] ?? 0;
      imageData.data[di + 1] = pixels[pi + 1] ?? 0;
      imageData.data[di + 2] = pixels[pi + 2] ?? 0;
      imageData.data[di + 3] = 255;
    }
    return imageData;
  } catch {
    return null;
  }
}

function base64Encode(svg: string): string {
  // 服务端环境（Node Buffer）
  const buf = (globalThis as unknown as { Buffer?: { from: (s: string) => { toString: (enc: string) => string } } }).Buffer;
  if (buf) return buf.from(svg).toString('base64');
  // 浏览器环境：使用 TextEncoder 替代已废弃的 unescape
  const encoder = new TextEncoder();
  const bytes = encoder.encode(svg);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

/** 从 data URI 提取图片的 4 块主色 */
export async function extractColorsFromDataUri(dataUri: string): Promise<{
  primaryColor: string;
  secondaryColor: string;
  tertiaryColor: string;
  textColor: string;
  highContrastColor: string;
} | null> {
  try {
    const img = new Image();
    const loaded = new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Image load failed'));
    });
    img.src = dataUri;
    await loaded;

    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, 100, 100);

    const imageData = ctx.getImageData(0, 0, 100, 100);
    const pixels = imageData.data;
    const quadSize = 50;
    const colors: string[] = [];

    for (let q = 0; q < 4; q++) {
      const startX = (q % 2) * quadSize;
      const startY = Math.floor(q / 2) * quadSize;
      let r = 0;
      let g = 0;
      let b = 0;
      let count = 0;

      for (let y = startY; y < startY + quadSize; y++) {
        for (let x = startX; x < startX + quadSize; x++) {
          const idx = (y * 100 + x) * 4;
          r += pixels[idx] ?? 0;
          g += pixels[idx + 1] ?? 0;
          b += pixels[idx + 2] ?? 0;
          count++;
        }
      }

      if (count > 0) {
        const { rgbToHex } = await import('./color');
        colors.push(rgbToHex(Math.round(r / count), Math.round(g / count), Math.round(b / count)));
      }
    }

    if (colors.length < 3) return null;

    const { luminance } = await import('./color');
    return {
      primaryColor: colors[0]!,
      secondaryColor: colors[1]!,
      tertiaryColor: colors[2]!,
      textColor: luminance(colors[0]!) > 128 ? '#1A1A1A' : '#FFFFFF',
      highContrastColor: '#FFFFFF',
    };
  } catch {
    return null;
  }
}

/** 生成纯色渐变 SVG 封面 */
export function generateThumbnailSvg(colors: {
  primary: string;
  secondary: string;
  tertiary: string;
}): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${colors.primary}"/>
        <stop offset="100%" style="stop-color:${colors.secondary}"/>
      </linearGradient>
    </defs>
    <rect width="300" height="300" fill="url(#bg)"/>
    <circle cx="150" cy="150" r="80" fill="${colors.tertiary}" opacity="0.3"/>
    <circle cx="150" cy="150" r="40" fill="${colors.primary}" opacity="0.2"/>
  </svg>`;
  return 'data:image/svg+xml;base64,' + (typeof btoa === 'function' ? btoa(svg) : base64Encode(svg));
}