/**
 * RGB LED 插件模拟模块
 *
 * 模拟 WE 的 LED / CUE 插件加载机制：
 *   - window.wallpaperPluginListener.onPluginLoaded(name, version)
 *   - window.wpPlugins.led.setAllDevicesByImageData(imageData, width, height)
 */

import type { InternalState, RgbFrameCallback } from './types';

export function createRgbMock(
  state: InternalState,
  onRgbFrame?: RgbFrameCallback
) {
  let pluginLoaded = false;

  function install() {
    const w = window as any;

    // ---- wallpaperPluginListener — 保留项目原有的 listener 链 ----
    const devKitHandler = {
      onPluginLoaded: (name: string, version: string) => {
        console.log(`[WE Dev Kit] pluginLoaded: ${name} v${version}`);
        if (name === 'led') {
          state.isRgbPluginLoaded = true;
          pluginLoaded = true;
        }
      },
    };

    let projectListener: any = null;
    function createWrappedListener(project: any): any {
      if (!project) return devKitHandler;
      return {
        onPluginLoaded: (name: string, version: string) => {
          if (devKitHandler.onPluginLoaded) {
            devKitHandler.onPluginLoaded(name, version);
          }
          if (project?.onPluginLoaded) {
            project.onPluginLoaded(name, version);
          }
        },
      };
    }

    let _storedListener = createWrappedListener(null);
    Object.defineProperty(w, 'wallpaperPluginListener', {
      get() {
        return _storedListener;
      },
      set(val: any) {
        projectListener = val;
        _storedListener = createWrappedListener(val);
      },
      configurable: true,
      enumerable: true,
    });

    // ---- wpPlugins.led ----
    if (!w.wpPlugins) w.wpPlugins = {};

    w.wpPlugins.led = {
      setAllDevicesByImageData: (imageData: string, width: number, height: number) => {
        const pixels: number[] = [];
        for (let i = 0; i < imageData.length; i++) {
          pixels.push(imageData.charCodeAt(i) & 0xff);
        }

        const palette = extractPalette(pixels, width, height);
        const frame = { width, height, pixels, palette };

        if (onRgbFrame) {
          onRgbFrame(frame);
        }
      },
    };

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

    setTimeout(() => {
      const current = w.wallpaperPluginListener;
      if (current?.onPluginLoaded) {
        current.onPluginLoaded('led', '1.0');
        current.onPluginLoaded('cue', '1.0');
      }
    }, 3000);

    state.onDestroy(() => {
      try {
        delete w.wallpaperPluginListener;
      } catch {}
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
    .slice(0, 8);
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('');
}

function quantizeHex(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const qr = Math.round(r / 16) * 16;
  const qg = Math.round(g / 16) * 16;
  const qb = Math.round(b / 16) * 16;
  return `#${qr.toString(16).padStart(2, '0')}${qg.toString(16).padStart(2, '0')}${qb.toString(16).padStart(2, '0')}`;
}
