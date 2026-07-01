/**
 * RGB LED 插件模拟模块
 *
 * 模拟 WE 的 LED 数据通道：
 *   - window.wpPlugins.led.setAllDevicesByImageData(imageData, width, height)
 *
 * 注意：不再自动模拟插件加载（已移除无法连接的模拟环境），
 * 项目通过 kit.rgb.simulateFrame() 手动推送帧数据，或等待真实插件加载。
 *
 * v2: 增加帧存储、解码 ImageData、回调注册等 agent 友好 API。
 */

import type { InternalState, RgbFrameData, RgbFrameCallback } from './types';

export function createRgbMock(
  state: InternalState,
  onRgbFrame?: RgbFrameCallback
) {
  let lastFrame: RgbFrameData | null = null;
  let lastImageData: ImageData | null = null;
  const frameCallbacks: Set<RgbFrameCallback> = new Set();

  /** 内部分发帧到所有回调 */
  function dispatchFrame(frame: RgbFrameData): void {
    lastFrame = frame;
    // 同时解码为 ImageData
    lastImageData = pixelsToImageData(frame.pixels, frame.width, frame.height);
    // 通知外部回调
    if (onRgbFrame) onRgbFrame(frame);
    // 通知注册的帧回调
    for (const cb of frameCallbacks) {
      try { cb(frame); } catch (_) {}
    }
  }

  /** 手动模拟一帧 */
  function simulateFrame(width = 100, height = 20, pixelData?: number[]): void {
    let pixels: number[];
    if (pixelData) {
      pixels = pixelData;
    } else {
      // 生成随机渐变帧
      pixels = [];
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const r = Math.floor((x / width) * 200 + Math.random() * 55);
          const g = Math.floor((y / height) * 200 + Math.random() * 55);
          const b = Math.floor(((x + y) / (width + height)) * 200 + Math.random() * 55);
          pixels.push(r, g, b);
        }
      }
    }
    const palette = extractPalette(pixels, width, height);
    dispatchFrame({ width, height, pixels, palette });
  }

  function install() {
    const w = window as any;

    // ---- wallpaperPluginListener — 保留项目原有的 listener 链 ----
    const devKitHandler = {
      onPluginLoaded: (_name: string, _version: string) => {
        // 保留 listener 链，不做自动标记
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
        dispatchFrame({ width, height, pixels, palette });
      },
    };

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
    /** 获取最后一帧原始数据 */
    getLastFrame: (): RgbFrameData | null => lastFrame,
    /** 获取最后一帧解码后的 ImageData */
    getDecodedImageData: (): ImageData | null => lastImageData,
    /** 获取调色板 */
    getPalette: (): { color: string; ratio: number }[] => lastFrame?.palette ?? [],
    /** 注册帧回调，返回取消注册函数 */
    onFrame: (cb: RgbFrameCallback): (() => void) => {
      frameCallbacks.add(cb);
      return () => { frameCallbacks.delete(cb); };
    },
    /** 手动模拟一帧随机数据 */
    simulateFrame,
  };
}

/** 将 RGB 像素数组转为 canvas ImageData */
function pixelsToImageData(
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
