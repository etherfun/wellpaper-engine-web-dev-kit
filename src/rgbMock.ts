/**
 * RGB LED 插件模拟模块
 *
 * 模拟 WE 的 LED / CUE 插件加载机制：
 *   - window.wallpaperPluginListener.onPluginLoaded(name, version)
 *   - window.wpPlugins.led.setAllDevicesByImageData(imageData, width, height)
 *
 * 开发套件无法真实连接到 LED 硬件，因此截获 RGB 数据并解码为像素矩阵，
 * 通过 onRgbFrame 回调传递给面板显示。
 */

import type { InternalState, RgbFrameCallback } from './types';

export function createRgbMock(state: InternalState, onRgbFrame?: RgbFrameCallback) {
  let pluginLoaded = false;

  function install() {
    const w = window as any;

    // ---- wallpaperPluginListener ----
    w.wallpaperPluginListener = {
      onPluginLoaded: (name: string, version: string) => {
        console.log(`[WE Dev Kit] pluginLoaded: ${name} v${version}`);
        if (name === 'led') {
          state.isRgbPluginLoaded = true;
          pluginLoaded = true;
        }
      },
    };

    // ---- wpPlugins.led ----
    if (!w.wpPlugins) w.wpPlugins = {};

    w.wpPlugins.led = {
      setAllDevicesByImageData: (imageData: string, width: number, height: number) => {
        // 解码 imageData（RGB.ts 用 String.fromCharCode 编码的 RGBA→RGB 流）
        const pixels: number[] = [];
        for (let i = 0; i < imageData.length; i++) {
          pixels.push(imageData.charCodeAt(i) & 0xff);
        }

        // 提取简化调色板（降采样 + 去重取前 8 种主色）
        const palette = extractPalette(pixels, width, height);

        const frame = { width, height, pixels, palette };

        // 回调通知面板
        if (onRgbFrame) {
          onRgbFrame(frame);
        }
      },
    };

    // 模拟插件加载延迟
    setTimeout(() => {
      if (w.wallpaperPluginListener?.onPluginLoaded) {
        w.wallpaperPluginListener.onPluginLoaded('led', '1.0');
      }
    }, 200);
    setTimeout(() => {
      if (w.wallpaperPluginListener?.onPluginLoaded) {
        w.wallpaperPluginListener.onPluginLoaded('cue', '1.0');
      }
    }, 500);

    state.onDestroy(() => {
      delete w.wallpaperPluginListener;
      if (w.wpPlugins) {
        delete w.wpPlugins.led;
      }
    });

    console.log('[WE Dev Kit] RGB Mock installed');
  }

  install();

  return {
    get pluginLoaded() {
      return pluginLoaded;
    },
    reloadPlugin() {
      const w = window as any;
      if (w.wallpaperPluginListener?.onPluginLoaded) {
        w.wallpaperPluginListener.onPluginLoaded('led', '1.0');
      }
    },
  };
}

/**
 * 从 RGB 像素数组提取简化调色板。
 * 将图片降采样到 10×10 网格，取平均色，去重合并相近色。
 */
function extractPalette(
  pixels: number[],
  width: number,
  height: number
): { color: string; ratio: number }[] {
  if (pixels.length === 0 || width === 0 || height === 0) return [];

  const gridW = Math.min(10, width);
  const gridH = Math.min(10, height);
  const stepX = Math.max(1, Math.floor(width / gridW));
  const stepY = Math.max(1, Math.floor(height / gridH));

  const colorMap = new Map<string, number>();

  for (let gy = 0; gy < gridH; gy++) {
    for (let gx = 0; gx < gridW; gx++) {
      let r = 0, g = 0, b = 0, count = 0;
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
        const hex = rgbToHex(
          Math.round(r / count),
          Math.round(g / count),
          Math.round(b / count)
        );
        // 将相近色合并（量化到 16 级）
        const quantized = quantizeHex(hex);
        colorMap.set(quantized, (colorMap.get(quantized) || 0) + 1);
      }
    }
  }

  // 按占比排序取前 8 种
  const total = gridW * gridH;
  const sorted = [...colorMap.entries()]
    .map(([color, count]) => ({ color, ratio: count / total }))
    .sort((a, b) => b.ratio - a.ratio)
    .slice(0, 8);

  return sorted;
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('');
}

/** 将颜色量化到 16 级（#RRGGBB → #XYXYXY），用于合并相近色 */
function quantizeHex(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const qr = Math.round(r / 16) * 16;
  const qg = Math.round(g / 16) * 16;
  const qb = Math.round(b / 16) * 16;
  return `#${qr.toString(16).padStart(2, '0')}${qg.toString(16).padStart(2, '0')}${qb.toString(16).padStart(2, '0')}`;
}
