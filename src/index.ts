/**
 * @perfectwall/we-dev-kit — 主入口
 *
 * 提供 createWeDevKit() 工厂函数，一键启动所有 WE 运行时模拟。
 * v2: 新增结构化子控制器（media / rgb / lifecycle / properties）
 *
 * 使用方式:
 *   import { createWeDevKit } from '@perfectwall/we-dev-kit';
 *   const kit = createWeDevKit({ panel: true, audio: true, media: true });
 *   kit.media.play();
 *   kit.rgb.getLastFrame();
 *   kit.lifecycle.pause();
 *   kit.properties.getVisibility('some_key');
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
import {
  loadProjectProperties,
  type LoadResult,
} from './panel/projectJsonReader';
import { evaluateAllConditions } from './panel/conditionEvaluator';
import type {
  AudioConfig,
  AudioSimulatorController,
  DevKitConfig,
  DevKitInstance,
  DevKitState,
  InternalState,
  LifecycleController,
  MediaConfig,
  MediaController,
  MediaMockController,
  MockTrack,
  PanelConfig,
  PropertiesController,
  PropertyTranslationStatus,
  PropertyVisibility,
  ProjectPropertyDef,
  RequiredConfig,
  ResolvedAudioConfig,
  ResolvedMediaConfig,
  ResolvedPanelConfig,
  RgbController,
  RgbFrameData,
  RgbFrameCallback,
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
  return {
    enabled: base.enabled ?? true,
    autoDetect: base.autoDetect ?? true,
    audio,
    media,
    properties: base.properties ?? true,
    rgb: base.rgb ?? true,
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
    isAudioEnabled: true,
  };
  const noopMedia: MediaController = {
    play() {}, pause() {}, stop() {},
    nextTrack() {}, prevTrack() {}, setTrack() {},
    setCustomTrack() {}, setCustomThumbnail() {}, seek() {},
    getPosition() { return 0; },
    getCurrentTrack() { return { title: '', artist: '', duration: 240 }; },
    get currentIndex() { return 0; },
    get playbackState() { return 'stopped' as const; },
    get tracks() { return []; },
  };
  const noopRgb: RgbController = {
    getLastFrame() { return null; },
    getDecodedImageData() { return null; },
    getPalette() { return []; },
    onFrame() { return () => {}; },
    simulateFrame() {},
  };
  const noopLifecycle: LifecycleController = {
    pause() {}, resume() {}, setFps() {},
    get isPaused() { return false; },
  };
  const noopProps: PropertiesController = {
    getProperty() { return undefined; },
    getAllProperties() { return []; },
    getVisibility() { return { key: '', visible: true, condition: null }; },
    getAllVisibility() { return []; },
    checkTranslation() { return { key: '', i18nKey: '', missing: false, displayName: '' }; },
    getMissingTranslations() { return []; },
    getVisibleProperties() { return []; },
    getCurrentValues() { return {}; },
    async reloadProperties() {},
  };
  return {
    destroy() {},
    togglePanel() {},
    getConfig() { return { ...config }; },
    pushProperties() {},
    pushAudioFrame() {},
    setAudioEnabled() {},
    nextTrack() {},
    state,
    media: noopMedia,
    rgb: noopRgb,
    lifecycle: noopLifecycle,
    properties: noopProps,
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

// ---- 子控制器工厂 ----

/**
 * 创建 MediaController 包装器
 */
function createMediaController(mock: MediaMockController | undefined): MediaController {
  const noopCtrl: MediaController = {
    play() {},
    pause() {},
    stop() {},
    nextTrack() {},
    prevTrack() {},
    setTrack() {},
    setCustomTrack() {},
    setCustomThumbnail() {},
    seek() {},
    getPosition() { return 0; },
    getCurrentTrack() { return { title: '', artist: '', duration: 240 }; },
    get currentIndex() { return 0; },
    get playbackState() { return 'stopped' as const; },
    get tracks() { return []; },
  };
  if (!mock) return noopCtrl;
  return {
    play: () => mock.play(),
    pause: () => mock.pause(),
    stop: () => mock.stop(),
    nextTrack: () => mock.nextTrack(),
    prevTrack: () => mock.prevTrack(),
    setTrack: (i: number) => mock.setTrack(i),
    setCustomTrack: (t: Partial<MockTrack>) => mock.setCustomTrack(t),
    setCustomThumbnail: (d: string) => mock.setCustomThumbnail(d),
    seek: (p: number) => mock.seek(p),
    getPosition: () => mock.getPosition(),
    getCurrentTrack: () => mock.getCurrentTrack(),
    get currentIndex() { return mock.currentIndex; },
    get playbackState() { return mock.playbackState; },
    get tracks() { return mock.tracks; },
  };
}

/**
 * 创建 LifecycleController 包装器
 */
function createLifecycleController(mock: ReturnType<typeof createLifecycleMock> | undefined): LifecycleController {
  const noopCtrl: LifecycleController = {
    pause() {},
    resume() {},
    setFps() {},
    get isPaused() { return false; },
  };
  if (!mock) return noopCtrl;
  return {
    pause: () => mock.simulatePause(),
    resume: () => mock.simulateResume(),
    setFps: (fps: number) => mock.simulateFpsChange(fps),
    get isPaused() { return mock.isPaused; },
  };
}

/**
 * 创建 RgbController 包装器
 */
function createRgbController(mock: ReturnType<typeof createRgbMock> | undefined): RgbController {
  const noopCtrl: RgbController = {
    getLastFrame() { return null; },
    getDecodedImageData() { return null; },
    getPalette() { return []; },
    onFrame() { return () => {}; },
    simulateFrame() {},
  };
  if (!mock) return noopCtrl;
  return {
    getLastFrame: () => mock.getLastFrame(),
    getDecodedImageData: () => mock.getDecodedImageData(),
    getPalette: () => mock.getPalette(),
    onFrame: (cb: RgbFrameCallback) => mock.onFrame(cb),
    simulateFrame: (w?: number, h?: number, d?: number[]) => mock.simulateFrame(w, h, d),
  };
}

/**
 * 创建 PropertiesController
 *
 * 从 project.json 加载属性定义，配合当前属性值提供可见性/翻译查询。
 */
function createPropertiesController(state: InternalState): PropertiesController {
  let loadResult: LoadResult | null = null;
  let props: ProjectPropertyDef[] = [];
  let loadPromise: Promise<void> | null = null;

  /** 延迟加载 project.json */
  async function ensureLoaded(): Promise<void> {
    if (loadResult) return;
    if (loadPromise) return loadPromise;
    loadPromise = (async () => {
      try {
        loadResult = await loadProjectProperties();
        props = loadResult.properties;
      } catch {
        loadResult = { properties: [], rawLocalization: {}, allLocalizations: {}, activeLocalization: {}, appliedLanguage: 'en-us', availableLanguages: [], raw: {} };
        props = [];
      }
    })();
    return loadPromise;
  }

  /** 获取属性当前值（从已推送的 wallpaperPropertyListener 状态） */
  function getCurrentValue(key: string): unknown {
    // 尝试从 window 上的 listener 状态获取
    // 如果是通过 we-dev-kit 注入的，属性值会被存储在 listener 中
    // 但我们没有集中存储，所以提供一个兜底读取方式
    return undefined;
  }

  /** 获取所有属性的当前值（读取 wallpaperPropertyListener 的 applyUserProperties 最后推送的值） */
  function collectCurrentValues(): Record<string, unknown> {
    // 返回空对象，实际值需用户通过 pushProperties 设置
    return {};
  }

  const controller: PropertiesController = {
    getProperty(key: string): ProjectPropertyDef | undefined {
      return props.find(p => p.key === key);
    },

    getAllProperties(): ProjectPropertyDef[] {
      return [...props];
    },

    getVisibility(key: string): PropertyVisibility {
      const prop = props.find(p => p.key === key);
      if (!prop) {
        return { key, visible: true, condition: null };
      }
      if (!prop.condition) {
        return { key, visible: true, condition: null };
      }
      const visibilityMap = evaluateAllConditions(props, (k: string) => {
        const p = props.find(pp => pp.key === k);
        return p?.value;
      });
      const visible = visibilityMap[key] ?? true;
      // 找到导致不可见的属性
      let blockedBy: string | undefined;
      let blockedValue: unknown;
      if (!visible) {
        for (const [ck, cv] of Object.entries(visibilityMap)) {
          if (!cv && ck !== key) {
            blockedBy = ck;
            blockedValue = props.find(p => p.key === ck)?.value;
            break;
          }
        }
      }
      return { key, visible, condition: prop.condition ?? null, blockedBy, blockedValue };
    },

    getAllVisibility(): PropertyVisibility[] {
      const visibilityMap = evaluateAllConditions(props, (k: string) => {
        const p = props.find(pp => pp.key === k);
        return p?.value;
      });
      return props.map(p => ({
        key: p.key,
        visible: visibilityMap[p.key] ?? true,
        condition: p.condition ?? null,
      }));
    },

    checkTranslation(key: string): PropertyTranslationStatus {
      const prop = props.find(p => p.key === key);
      if (!prop) {
        return { key, i18nKey: key, missing: false, displayName: key };
      }
      return {
        key: prop.key,
        i18nKey: prop.text ?? prop.key,
        missing: prop.missingTranslation ?? false,
        displayName: prop.displayName ?? prop.key,
      };
    },

    getMissingTranslations(): PropertyTranslationStatus[] {
      return props
        .filter(p => p.missingTranslation)
        .map(p => ({
          key: p.key,
          i18nKey: p.text ?? p.key,
          missing: true,
          displayName: p.displayName ?? p.key,
        }));
    },

    getVisibleProperties(): ProjectPropertyDef[] {
      const visibilityMap = evaluateAllConditions(props, (k: string) => {
        const p = props.find(pp => pp.key === k);
        return p?.value;
      });
      return props.filter(p => visibilityMap[p.key] ?? true);
    },

    getCurrentValues(): Record<string, unknown> {
      const values: Record<string, unknown> = {};
      for (const p of props) {
        values[p.key] = p.value;
      }
      return values;
    },

    async reloadProperties() {
      loadPromise = null;
      loadResult = null;
      await ensureLoaded();
    },
  };

  // 初始化加载（不阻塞构造）
  ensureLoaded().catch(() => {});

  return controller;
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

  // Task 0: 音频数据传入开关
  let _audioEnabled = true;

  // 修补 wallpaperRegisterAudioListener 以收集回调
  const origRegisterAudio = (window as any).wallpaperRegisterAudioListener;
  (window as any).wallpaperRegisterAudioListener = (cb: (data: Float32Array) => void) => {
    if (typeof cb === 'function') {
      audioListeners.add(cb);
    }
    if (origRegisterAudio) origRegisterAudio(cb);
  };

  function dispatchAudioFrame(frame: Float32Array) {
    // 生命周期暂停时停止分发（可视化直接暂停，不归零）
    if ((window as any).__weLifecyclePaused === true) return;
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

  // ---- 子控制器（先于模块创建，但暴露在实例上） ----
  let propertiesController = createPropertiesController(state);

  // 可变的 RGB 帧转发引用（在 panel 创建后设置）
  let forwardRgbFrame: ((frame: RgbFrameData) => void) | null = null;

  let rgbMock: ReturnType<typeof createRgbMock> | undefined;
  if (config.rgb) {
    rgbMock = createRgbMock(state, (frame) => {
      if (forwardRgbFrame) forwardRgbFrame(frame);
    });
  }
  const rgbController = createRgbController(rgbMock);

  let lifecycleMock: ReturnType<typeof createLifecycleMock> | undefined;
  if (config.lifecycle) {
    lifecycleMock = createLifecycleMock(state);
  }
  const lifecycleController = createLifecycleController(lifecycleMock);

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
  const mediaController = createMediaController(mediaMock);

  // 4. 控制面板（最后加载）
  let panelController: ReturnType<typeof createPanel> | undefined;
  if (isPanelEnabled(config)) {
    panelController = createPanel({
      config,
      state,
      audioSimulator: audioSim,
      mediaMock,
      lifecycleMock,
      setAudioEnabled: (enabled: boolean) => {
        _audioEnabled = enabled;
        if (audioSim) {
          audioSim.fadeTo(enabled ? (config.audio as ResolvedAudioConfig).amplitude : 0, 800);
        }
        console.log(`[WE Dev Kit] Audio ${enabled ? 'enabled' : 'disabled'} (from panel, fade ${enabled ? 'in' : 'out'})`);
      },
    });

    // 连接 RGB 帧数据到面板
    forwardRgbFrame = (frame) => panelController!.updateRgbFrame(frame);

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

    setAudioEnabled(enabled: boolean) {
      _audioEnabled = enabled;
      if (audioSim) {
        audioSim.fadeTo(enabled ? (config.audio as ResolvedAudioConfig).amplitude : 0, 800);
      }
      console.log(`[WE Dev Kit] Audio ${enabled ? 'enabled' : 'disabled'} (fade ${enabled ? 'in' : 'out'})`);
    },

    pushAudioFrame() {
      if (audioSim && _audioEnabled) {
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
      isAudioEnabled: true,
    } as DevKitState,

    // ---- 子控制器 ----
    media: mediaController,
    rgb: rgbController,
    lifecycle: lifecycleController,
    properties: propertiesController,
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
  Object.defineProperty(instance.state, 'isAudioEnabled', {
    get: () => _audioEnabled,
    enumerable: true,
  });

  // 挂载到全局（方便控制台调试）
  (window as any).__weDevKit = instance;

  console.log('[WE Dev Kit] 初始化完成');
  return instance;
}
