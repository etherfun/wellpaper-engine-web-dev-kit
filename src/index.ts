/**
 * @perfectwall/we-dev-kit — 主入口
 *
 * 提供 createWeDevKit() 工厂函数，一键启动所有 WE 运行时模拟。
 *
 * 使用方式:
 *   import { createWeDevKit } from '@perfectwall/we-dev-kit';
 *   const kit = createWeDevKit({ panel: true, audio: true, media: true });
 *
 * 或通过 IIFE:
 *   WeDevKit.createWeDevKit({ panel: true });
 */

import { createAudioSimulator } from './audioSimulator';
import { detectEnvironment } from './environment';
import { createLifecycleMock } from './lifecycleMock';
import { createMediaMock } from './mediaMock';
import { createPanel } from './panel/index';
import { installPropertyMock } from './propertyMock';
import { createRgbMock } from './rgbMock';
import type {
  AudioConfig,
  AudioSimulatorController,
  DevKitConfig,
  DevKitInstance,
  DevKitState,
  InternalState,
  MediaConfig,
  MediaMockController,
  MockTrack,
  PanelConfig,
  RequiredConfig,
  ResolvedAudioConfig,
  ResolvedMediaConfig,
  ResolvedPanelConfig,
  ResolvedRgbConfig,
  RgbConfig,
  RgbFrameData,
} from './types';

// ---- 默认配置 ----

const DEFAULT_CONFIG: DevKitConfig = {
  enabled: true,
  autoDetect: true,
  audio: true,
  media: true,
  properties: true,
  rgb: true,
  lifecycle: true,
  panel: true,
};

const DEFAULT_AUDIO_CONFIG: AudioConfig = {
  amplitude: 0.6,
  bassBoost: 1.2,
  variationSpeed: 1.0,
  frameRate: 30,
};

const DEFAULT_MEDIA_CONFIG: MediaConfig = {
  autoCycle: true,
  cycleIntervalMs: 8000,
};

const DEFAULT_RGB_CONFIG: RgbConfig = {
  realRazer: false,
};

const DEFAULT_PANEL_CONFIG: PanelConfig = {
  position: { x: 0, y: 0 },
  collapsed: false,
  theme: 'dark',
};

// ---- 内部状态工厂 ----

function createInternalState(): InternalState {
  const cleanupFns: (() => void)[] = [];
  return {
    config: null as unknown as RequiredConfig,
    cleanupFns,
    isRgbPluginLoaded: false,
    onDestroy: (fn: () => void) => {
      cleanupFns.push(fn);
    },
  };
}

function resolveConfig(opts?: DevKitConfig): RequiredConfig {
  const base = { ...DEFAULT_CONFIG, ...(opts || {}) };
  const audio = resolveAudioConfig(base.audio as DevKitConfig['audio']);
  const media = resolveMediaConfig(base.media as DevKitConfig['media']);
  const panel = resolvePanelConfig(base.panel as DevKitConfig['panel']);
  const rgb = resolveRgbConfig(base.rgb as DevKitConfig['rgb']);
  return {
    enabled: base.enabled ?? true,
    autoDetect: base.autoDetect ?? true,
    audio,
    media,
    properties: base.properties ?? true,
    rgb,
    lifecycle: base.lifecycle ?? true,
    panel,
  };
}

function resolveAudioConfig(audio: boolean | AudioConfig | undefined): ResolvedAudioConfig {
  const def: ResolvedAudioConfig = { amplitude: 0.6, bassBoost: 1.2, variationSpeed: 1.0, frameRate: 30 };
  if (audio === false || audio === undefined) {
    return { ...def, amplitude: 0 };
  }
  if (typeof audio !== 'object') {
    return def;
  }
  return { ...def, ...audio };
}

function resolveMediaConfig(media: boolean | MediaConfig | undefined): ResolvedMediaConfig {
  const def: ResolvedMediaConfig = { tracks: [], autoCycle: true, cycleIntervalMs: 8000 };
  if (media === false || media === undefined) {
    return { ...def, tracks: [] };
  }
  if (typeof media !== 'object') {
    return def;
  }
  return { ...def, ...media };
}

function resolvePanelConfig(panel: boolean | PanelConfig | undefined): ResolvedPanelConfig {
  const def: ResolvedPanelConfig = { position: { x: 0, y: 0 }, collapsed: false, theme: 'dark' };
  if (panel === false || panel === undefined) {
    return def;
  }
  if (typeof panel !== 'object') {
    return def;
  }
  return { ...def, ...panel };
}

// 判断各模块是否启用
function resolveRgbConfig(rgb: boolean | RgbConfig | undefined): ResolvedRgbConfig {
  const def: ResolvedRgbConfig = { realRazer: false };
  if (rgb === false || rgb === undefined) {
    return def;
  }
  if (typeof rgb !== 'object') {
    return def;
  }
  return { ...def, ...rgb };
}

// 判断各模块是否启用
function isAudioEnabled(cfg: RequiredConfig): boolean {
  const a = cfg.audio;
  return a.amplitude > 0 || a.bassBoost !== 1 || a.variationSpeed > 0;
}
function isMediaEnabled(cfg: RequiredConfig): boolean {
  const m = cfg.media;
  return m.cycleIntervalMs > 0 || m.tracks.length > 0;
}
function isPanelEnabled(cfg: RequiredConfig): boolean {
  const p = cfg.panel;
  return p.position.x !== 0 || p.position.y !== 0 || !p.collapsed || p.theme === 'dark';
}

// ---- 空实例（用于静默退出） ----

function createNoopInstance(config: DevKitConfig): DevKitInstance {
  const state: DevKitState = {
    isLoaded: true,
    isPanelVisible: false,
    currentTrackIndex: 0,
    playbackState: 'stopped',
    isRgbPluginLoaded: false,
  };
  return {
    destroy() {},
    togglePanel() {},
    getConfig() {
      return { ...config };
    },
    pushProperties() {},
    pushAudioFrame() {},
    nextTrack() {},
    state,
  };
}

// ---- 音频监听器安装 ----

/**
 * 将音频模拟器的帧数据推送到 WE 的 audioListener。
 * 查找通过 wallpaperRegisterAudioListener 注册的回调。
 */
function installAudioCallback(sim: AudioSimulatorController, state: InternalState) {
  const listeners: Set<(data: Float32Array) => void> = new Set();

  // 修补 wallpaperRegisterAudioListener
  const original = (window as any).wallpaperRegisterAudioListener;
  (window as any).wallpaperRegisterAudioListener = (cb: (data: Float32Array) => void) => {
    listeners.add(cb);
    if (original) original(cb);
  };

  // 如果已有监听器（setupWallpaperPropertyListener 注册的），需要通知它
  // 通过 window.wallpaperRegisterAudioListener 的回调被调用

  // 启动模拟器 — 每帧推给所有已注册的监听器
  sim.start();

  state.onDestroy(() => {
    sim.stop();
    (window as any).wallpaperRegisterAudioListener = original;
  });
}

// ---- 公有 API ----

/**
 * 创建 WE Dev Kit 实例，注入所有模拟 API。
 *
 * @param options 配置选项（全部可选）
 * @returns DevKitInstance
 */
export function createWeDevKit(options?: DevKitConfig): DevKitInstance {
  const config = resolveConfig(options);

  // 1. 环境检测
  if (config.autoDetect) {
    const env = detectEnvironment();
    if (env.isRealWE) {
      console.log(`[WE Dev Kit] 真实 WE 环境 (${env.reason})，已跳过`);
      return createNoopInstance(config);
    }
    console.log(`[WE Dev Kit] 浏览器开发模式 (${env.reason})`);
  }

  // 2. 初始化内部状态
  const state = createInternalState();
  (state as any).config = config;

  // ---- 音频帧分发（必须先定义，audioSimulator 启动时会立即回调） ----
  const audioListeners: Set<(data: Float32Array) => void> = new Set();

  // 修补 wallpaperRegisterAudioListener 以收集回调
  const origRegisterAudio = (window as any).wallpaperRegisterAudioListener;
  (window as any).wallpaperRegisterAudioListener = (cb: (data: Float32Array) => void) => {
    if (typeof cb === 'function') {
      audioListeners.add(cb);
    }
    if (origRegisterAudio) origRegisterAudio(cb);
  };

  function dispatchAudioFrame(frame: Float32Array) {
    // 结果转为普通数组以兼容 WE API（有些项目用 Array 而非 Float32Array）
    const arr: number[] = Array.from(frame);
    // 推给所有注册的监听器
    for (const listener of audioListeners) {
      try {
        listener(arr as unknown as Float32Array);
      } catch (_) {}
    }
  }

  // 3. 安装各模块
  // 顺序：properties → rgb → lifecycle → audio → media → panel

  if (config.properties) {
    installPropertyMock(state);
  }

  // 可变的 RGB 帧转发引用（在 panel 创建后设置）
  let forwardRgbFrame: ((frame: RgbFrameData) => void) | null = null;

  let rgbMock: ReturnType<typeof createRgbMock> | undefined;
  if (config.rgb) {
    const rc = config.rgb as ResolvedRgbConfig;
    rgbMock = createRgbMock(state, (frame) => {
      if (forwardRgbFrame) forwardRgbFrame(frame);
    }, rc.realRazer);
  }

  let lifecycleMock: ReturnType<typeof createLifecycleMock> | undefined;
  if (config.lifecycle) {
    lifecycleMock = createLifecycleMock(state);
  }

  let audioSim: AudioSimulatorController | undefined;
  if (isAudioEnabled(config)) {
    const ac = config.audio as ResolvedAudioConfig;
    audioSim = createAudioSimulator(
      (frame: Float32Array) => {
        dispatchAudioFrame(frame);
      },
      {
        amplitude: ac.amplitude,
        bassBoost: ac.bassBoost,
        variationSpeed: ac.variationSpeed,
        frameRate: ac.frameRate,
      },
      state
    );
    installAudioCallback(audioSim, state);
  }

  let mediaMock: MediaMockController | undefined;
  if (isMediaEnabled(config)) {
    const mc = config.media as ResolvedMediaConfig;
    const tracks: MockTrack[] = mc.tracks;
    mediaMock = createMediaMock(tracks, state);
  }

  // 4. 控制面板（最后加载）
  let panelController: ReturnType<typeof createPanel> | undefined;
  if (isPanelEnabled(config)) {
    panelController = createPanel({
      config,
      state,
      audioSimulator: audioSim,
      mediaMock,
      lifecycleMock,
    });

    // 连接 RGB 帧数据到面板
    forwardRgbFrame = (frame) => panelController!.updateRgbFrame(frame);
    // 连接 Razer 状态到面板
    if (rgbMock && ('razerConnected' in rgbMock)) {
      panelController!.updateRazerStatus(rgbMock.razerConnected, rgbMock.razerError);
    }

    // URL 参数检测：?dev-panel=true / ?dev-kit=true → 自动显示
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('dev-panel') === 'true' || urlParams.get('dev-kit') === 'true') {
      panelController.show();
    }
  }

  // ---- 构建返回实例 ----

  let destroyed = false;

  const instance: DevKitInstance = {
    destroy() {
      if (destroyed) return;
      destroyed = true;
      // 执行所有 cleanup
      for (const fn of state.cleanupFns) {
        try {
          fn();
        } catch (_) {}
      }
      state.cleanupFns.length = 0;
      if (panelController) {
        panelController.destroy();
      }
      console.log('[WE Dev Kit] Destroyed');
    },

    togglePanel() {
      if (panelController) {
        panelController.toggle();
      }
    },

    getConfig() {
      return { ...config } as Required<DevKitConfig>;
    },

    pushProperties(props: Record<string, unknown>) {
      const listener = (window as any).wallpaperPropertyListener;
      if (listener?.applyUserProperties) {
        const formatted: Record<string, { value: unknown }> = {};
        for (const [key, value] of Object.entries(props)) {
          formatted[key] = { value };
        }
        listener.applyUserProperties(formatted);
      }
    },

    pushAudioFrame() {
      if (audioSim) {
        audioSim.pushFrame();
      }
    },

    nextTrack() {
      if (mediaMock) {
        mediaMock.nextTrack();
      }
    },

    state: {
      isLoaded: true,
      isPanelVisible: panelController ? panelController.isVisible : false,
      currentTrackIndex: mediaMock ? mediaMock.currentIndex : 0,
      playbackState: mediaMock ? mediaMock.playbackState : 'stopped',
      isRgbPluginLoaded: state.isRgbPluginLoaded,
    } as DevKitState,
  };

  // 状态引用更新
  Object.defineProperty(instance.state, 'isPanelVisible', {
    get: () => panelController?.isVisible ?? false,
    enumerable: true,
  });
  Object.defineProperty(instance.state, 'currentTrackIndex', {
    get: () => mediaMock?.currentIndex ?? 0,
    enumerable: true,
  });
  Object.defineProperty(instance.state, 'playbackState', {
    get: () => mediaMock?.playbackState ?? 'stopped',
    enumerable: true,
  });
  Object.defineProperty(instance.state, 'isRgbPluginLoaded', {
    get: () => state.isRgbPluginLoaded,
    enumerable: true,
  });

  // 挂载到全局（方便控制台调试）
  (window as any).__weDevKit = instance;

  console.log('[WE Dev Kit] 初始化完成');
  return instance;
}
