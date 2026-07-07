/**
 * RGB LED 插件模拟模块
 *
 * 模拟 WE 的 LED 数据通道：
 *   window.wpPlugins.led.setAllDevicesByImageData(imageData, width, height)
 *
 * 不自动模拟插件加载（已移除无法连接的模拟环境）；
 * 项目通过 kit.rgb.simulateFrame() 手动推送帧数据，或等待真实插件加载。
 *
 * v2: 增加帧存储、解码 ImageData、回调注册等 agent 友好 API。
 */

import { extractPalette, rgbToHex } from './utils/color';
import { pixelsToImageData } from './utils/imageData';
import type { InternalState, RgbFrameData, RgbFrameCallback, RgbMockController } from './types';

interface FrameSources {
  lastFrame: RgbFrameData | null;
  lastImageData: ImageData | null;
  frameCallbacks: Set<RgbFrameCallback>;
  externalCallback: RgbFrameCallback | undefined;
}

function buildRandomPixels(width: number, height: number): number[] {
  const pixels: number[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const r = Math.floor((x / width) * 200 + Math.random() * 55);
      const g = Math.floor((y / height) * 200 + Math.random() * 55);
      const b = Math.floor(((x + y) / (width + height)) * 200 + Math.random() * 55);
      pixels.push(r, g, b);
    }
  }
  return pixels;
}

function dispatchFrame(sources: FrameSources, frame: RgbFrameData): void {
  sources.lastFrame = frame;
  sources.lastImageData = pixelsToImageData(frame.pixels, frame.width, frame.height);
  if (sources.externalCallback) sources.externalCallback(frame);
  for (const cb of sources.frameCallbacks) {
    try {
      cb(frame);
    } catch {
      /* ignore */
    }
  }
}

export function createRgbMock(
  state: InternalState,
  onRgbFrame?: RgbFrameCallback
): RgbMockController {
  const sources: FrameSources = {
    lastFrame: null,
    lastImageData: null,
    frameCallbacks: new Set(),
    externalCallback: onRgbFrame,
  };

  function simulateFrame(width = 100, height = 20, pixelData?: number[]): void {
    const pixels = pixelData ?? buildRandomPixels(width, height);
    const palette = extractPalette(pixels, width, height);
    dispatchFrame(sources, { width, height, pixels, palette });
  }

  // ---- 安装 window 钩子 ----
  const w = window as unknown as Record<string, unknown>;

  const devKitHandler = {
    onPluginLoaded: (_name: unknown, _version: unknown): void => {
      /* 保留 listener 链 */
    },
  };

  let _storedListener: { onPluginLoaded?: (...args: unknown[]) => void } = devKitHandler;
  Object.defineProperty(w, 'wallpaperPluginListener', {
    get() {
      return _storedListener;
    },
    set(val: unknown) {
      if (!val) {
        _storedListener = devKitHandler;
        return;
      }
      const project = val as { onPluginLoaded?: (...args: unknown[]) => void };
      const devkitCb = devKitHandler.onPluginLoaded;
      _storedListener = {
        onPluginLoaded: (name: unknown, version: unknown) => {
          if (devkitCb) devkitCb(name, version);
          if (project.onPluginLoaded) project.onPluginLoaded(name, version);
        },
      };
    },
    configurable: true,
    enumerable: true,
  });

  const wpPlugins = ((w.wpPlugins as Record<string, unknown> | undefined) ?? {});
  wpPlugins.led = {
    setAllDevicesByImageData: (imageData: string, width: number, height: number) => {
      const pixels: number[] = [];
      for (let i = 0; i < imageData.length; i++) {
        pixels.push(imageData.charCodeAt(i) & 0xff);
      }
      const palette = extractPalette(pixels, width, height);
      dispatchFrame(sources, { width, height, pixels, palette });
    },
  };
  w.wpPlugins = wpPlugins;

  state.onDestroy(() => {
    try {
      delete w.wallpaperPluginListener;
    } catch {
      /* ignore */
    }
    const plugins = w.wpPlugins as Record<string, unknown> | undefined;
    if (plugins && 'led' in plugins) {
      delete plugins.led;
    }
  });

  console.log('[WE Dev Kit] RGB Mock installed');

  return {
    getLastFrame: () => sources.lastFrame,
    getDecodedImageData: () => sources.lastImageData,
    getPalette: () => sources.lastFrame?.palette ?? [],
    onFrame: (cb: RgbFrameCallback) => {
      sources.frameCallbacks.add(cb);
      return () => sources.frameCallbacks.delete(cb);
    },
    simulateFrame,
  };
}

/** 抑制未使用：rgbToHex 在 rgbMock 当前未直接使用，保留供扩展 */
export const _rgbToHex = rgbToHex;