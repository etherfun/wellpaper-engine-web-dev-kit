/**
 * RGB LED 插件模拟模块
 *
 * 模拟 WE 的 LED / CUE 插件加载机制：
 *   - window.wallpaperPluginListener.onPluginLoaded(name, version)
 *   - window.wpPlugins.led.setAllDevicesByImageData(imageData, width, height)
 *
 * 可选：通过 realRazer 选项连接到真实的 Razer Chroma 硬件（需安装 Razer Synapse）。
 * 使用 Razer Chroma REST API（localhost:54235）直接通信，不依赖额外 SDK 包。
 */

import type { InternalState, RgbFrameCallback } from './types';

const CHROMA_SDK_URI = 'http://localhost:54235/razer/chromasdk';
const HEARTBEAT_INTERVAL_MS = 10000;

// Razer Chroma REST API 设备类型
const DEVICE_KEYBOARD = 'keyboard';
const DEVICE_MOUSE = 'mouse';
const DEVICE_MOUSEPAD = 'mousemat';
const DEVICE_HEADSET = 'headset';
const DEVICE_KEYPAD = 'keypad';
const DEVICE_CHROMALINK = 'chromalink';

const ALL_DEVICES = [DEVICE_KEYBOARD, DEVICE_MOUSE, DEVICE_MOUSEPAD, DEVICE_HEADSET];

export function createRgbMock(
  state: InternalState,
  onRgbFrame?: RgbFrameCallback,
  realRazer?: boolean
) {
  let pluginLoaded = false;

  // ---- 真实的 Razer Chroma 连接 ----
  let razerSessionUri: string | null = null;
  let razerSessionId: number | null = null;
  let razerHeartbeatTimer: ReturnType<typeof setInterval> | null = null;
  let razerConnected = false;
  let razerError = '';

  async function initRazerChroma() {
    if (!realRazer) return;

    try {
      const resp = await fetch(CHROMA_SDK_URI, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'PerfectWall Dev Kit',
          description: 'WE Dev Kit - RGB simulation',
          author: { name: 'PerfectWall', contact: '' },
          device_supported: ALL_DEVICES,
          category: 'application',
        }),
      });

      if (!resp.ok) {
        razerError = `Razer SDK init failed: HTTP ${resp.status}`;
        console.warn(`[WE Dev Kit] ${razerError}`);
        return;
      }

      const data = await resp.json();
      razerSessionUri = data.uri;
      razerSessionId = data.sessionid;
      razerConnected = true;
      razerError = '';
      console.log(
        `[WE Dev Kit] Razer Chroma connected: session=${razerSessionId} uri=${razerSessionUri}`
      );

      // 启动心跳
      razerHeartbeatTimer = setInterval(doHeartbeat, HEARTBEAT_INTERVAL_MS);
    } catch (err: any) {
      razerError = `Razer SDK unavailable: ${err.message}`;
      console.warn(`[WE Dev Kit] ${razerError} — 请确认已安装 Razer Synapse`);
    }
  }

  async function doHeartbeat() {
    if (!razerSessionUri) return;
    try {
      await fetch(`${razerSessionUri}/heartbeat`, { method: 'PUT' });
    } catch {
      // 忽略心跳失败
    }
  }

  /** 将 RGB 像素数据转发到 Razer Chroma 硬件 */
  async function forwardToRazer(pixels: number[], width: number, height: number) {
    if (!razerConnected || !razerSessionUri) return;

    // 计算整体主色（全像素平均）
    let totalR = 0, totalG = 0, totalB = 0, count = 0;
    for (let i = 0; i < pixels.length; i += 3) {
      totalR += pixels[i] ?? 0;
      totalG += pixels[i + 1] ?? 0;
      totalB += pixels[i + 2] ?? 0;
      count++;
    }
    if (count === 0) return;

    const avgR = Math.round(totalR / count);
    const avgG = Math.round(totalG / count);
    const avgB = Math.round(totalB / count);
    // Razer 使用 BGR 格式 0x00BBGGRR
    const color = (avgB << 16) | (avgG << 8) | avgR;

    const effectBody = {
      effect: 'CHROMA_STATIC',
      param: { color },
    };

    for (const device of ALL_DEVICES) {
      try {
        const resp = await fetch(`${razerSessionUri}/${device}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(effectBody),
        });
        if (!resp.ok) {
          // 某些设备可能不存在，静默跳过
        }
      } catch {
        // 静默跳过
      }
    }
  }

  /** 断开 Razer Chroma 连接 */
  async function uninitRazer() {
    if (razerHeartbeatTimer) {
      clearInterval(razerHeartbeatTimer);
      razerHeartbeatTimer = null;
    }
    if (razerSessionUri) {
      try {
        await fetch(razerSessionUri, { method: 'DELETE' });
      } catch {}
    }
    razerConnected = false;
    razerSessionUri = null;
    razerSessionId = null;
  }

  // ---- 安装 ----

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
        // 解码 imageData
        const pixels: number[] = [];
        for (let i = 0; i < imageData.length; i++) {
          pixels.push(imageData.charCodeAt(i) & 0xff);
        }

        // 提取调色板供面板显示
        const palette = extractPalette(pixels, width, height);
        const frame = { width, height, pixels, palette };

        // 回调通知面板
        if (onRgbFrame) {
          onRgbFrame(frame);
        }

        // 如果开启了 Razer 硬件转发
        if (realRazer) {
          forwardToRazer(pixels, width, height);
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

    // 如果需要真实 Razer 硬件，初始化连接
    if (realRazer) {
      // 延迟初始化，等插件加载后再尝试
      setTimeout(() => {
        initRazerChroma();
      }, 1000);
    }

    state.onDestroy(() => {
      uninitRazer();
      delete w.wallpaperPluginListener;
      if (w.wpPlugins) {
        delete w.wpPlugins.led;
      }
    });

    console.log(
      `[WE Dev Kit] RGB Mock installed${realRazer ? ' (real Razer Chroma enabled)' : ''}`
    );
  }

  install();

  return {
    get pluginLoaded() {
      return pluginLoaded;
    },
    get razerConnected() {
      return razerConnected;
    },
    get razerError() {
      return razerError;
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
 * 从 RGB 像素数组提取简化调色板
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
