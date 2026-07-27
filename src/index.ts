/**
 * wallpaper-engine-web-dev-kit — 主入口
 *
 * 提供 createWeDevKit() 工厂函数，一键启动所有 WE 运行时模拟。
 * v2: 新增结构化子控制器（media / rgb / lifecycle / properties）
 *
 * 使用方式:
 *   import { createWeDevKit } from 'wallpaper-engine-web-dev-kit';
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
import { createAudioBridge } from './audioBridge';
import type { InternalAudioBridge } from './audioBridge';
import { createMp3Player } from './mp3Player';
import { detectEnvironment } from './environment';
import { createLifecycleMock } from './lifecycleMock';
import { createMediaMock } from './mediaMock';
import { createPanel } from './panel/index';
import { installPropertyMock } from './propertyMock';
import { createRgbMock } from './rgbMock';
import { evaluateCondition } from './panel/conditionEvaluator';
import type {
  AudioConfig,
  AudioSimulatorController,
  DevKitConfig,
  DevKitInstance,
  DevKitState,
  InternalState,
  LifecycleController,
  LifecycleMockController,
  MediaConfig,
  MediaController,
  MediaMockController,
  MockTrack,
  Mp3PlayerController,
  PanelConfig,
  ProjectPropertyDef,
  PropertyDefInput,
  PropertiesController,
  PropertyTranslationStatus,
  PropertyVisibility,
  RequiredConfig,
  ResolvedAudioConfig,
  ResolvedMediaConfig,
  ResolvedPanelConfig,
  RgbController,
  RgbFrameData,
  RgbFrameCallback,
  RgbMockController,
} from './types';

// ============================================================
// 配置解析
// ============================================================

const DEFAULT_CONFIG: RequiredConfig = {
  enabled: true,
  autoDetect: true,
  audio: { amplitude: 0.6, bassBoost: 1.2, variationSpeed: 1.0, frameRate: 30 },
  media: { tracks: [], autoCycle: true, cycleIntervalMs: 8000 },
  properties: true,
  rgb: true,
  lifecycle: true,
  panel: { position: { x: 0, y: 0 }, collapsed: false, theme: 'dark' },
};

function resolveConfig(opts?: DevKitConfig): RequiredConfig {
  if (!opts) return { ...DEFAULT_CONFIG };
  const audio = resolveAudioConfig(opts.audio);
  const media = resolveMediaConfig(opts.media);
  const panel = resolvePanelConfig(opts.panel);
  return {
    enabled: opts.enabled ?? true,
    autoDetect: opts.autoDetect ?? true,
    audio,
    media,
    properties: opts.properties ?? true,
    rgb: opts.rgb ?? true,
    lifecycle: opts.lifecycle ?? true,
    panel,
  };
}

function resolveAudioConfig(audio: DevKitConfig['audio']): ResolvedAudioConfig {
  const def: ResolvedAudioConfig = { amplitude: 0.6, bassBoost: 1.2, variationSpeed: 1.0, frameRate: 30 };
  if (audio === false || audio === undefined) {
    return { ...def, amplitude: 0 };
  }
  if (typeof audio !== 'object') return def;
  return { ...def, ...audio };
}

function resolveMediaConfig(media: DevKitConfig['media']): ResolvedMediaConfig {
  const def: ResolvedMediaConfig = { tracks: [], autoCycle: true, cycleIntervalMs: 8000 };
  if (media === false || media === undefined) return { ...def, tracks: [] };
  if (typeof media !== 'object') return def;
  return { ...def, ...media };
}

function resolvePanelConfig(panel: DevKitConfig['panel']): ResolvedPanelConfig {
  const def: ResolvedPanelConfig = { position: { x: 0, y: 0 }, collapsed: false, theme: 'dark' };
  if (panel === false || panel === undefined) return def;
  if (typeof panel !== 'object') return def;
  return { ...def, ...panel };
}

function isAudioEnabled(cfg: RequiredConfig): boolean {
  const a = cfg.audio;
  return a.amplitude > 0 || a.bassBoost !== 1 || a.variationSpeed > 0;
}

function isMediaEnabled(cfg: RequiredConfig): boolean {
  const m = cfg.media;
  return m.cycleIntervalMs > 0 || m.tracks.length > 0;
}

// ============================================================
// 空实例（环境检测为真实 WE 时返回）
// ============================================================

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
    addProperty: (def) => def as never,
    updateProperty: () => undefined,
    removeProperty: () => false,
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

// ============================================================
// 子控制器包装
// ============================================================

function createMediaController(mock: MediaMockController | undefined): MediaController {
  if (!mock) {
    return {
      play() {}, pause() {}, stop() {},
      nextTrack() {}, prevTrack() {}, setTrack() {},
      setCustomTrack() {}, setCustomThumbnail() {}, seek() {},
      getPosition() { return 0; },
      getCurrentTrack() { return { title: '', artist: '', duration: 240 }; },
      get currentIndex() { return 0; },
      get playbackState() { return 'stopped' as const; },
      get tracks() { return []; },
    };
  }
  return {
    play: () => mock.play(),
    pause: () => mock.pause(),
    stop: () => mock.stop(),
    nextTrack: () => mock.nextTrack(),
    prevTrack: () => mock.prevTrack(),
    setTrack: (i) => mock.setTrack(i),
    setCustomTrack: (t: Partial<MockTrack>) => mock.setCustomTrack(t),
    setCustomThumbnail: (d) => mock.setCustomThumbnail(d),
    seek: (p) => mock.seek(p),
    getPosition: () => mock.getPosition(),
    getCurrentTrack: () => mock.getCurrentTrack(),
    get currentIndex() { return mock.currentIndex; },
    get playbackState() { return mock.playbackState; },
    get tracks() { return mock.tracks; },
  };
}

function createLifecycleController(mock: LifecycleMockController | undefined): LifecycleController {
  if (!mock) {
    return {
      pause() {}, resume() {}, setFps() {},
      get isPaused() { return false; },
    };
  }
  return {
    pause: () => mock.simulatePause(),
    resume: () => mock.simulateResume(),
    setFps: (fps) => mock.simulateFpsChange(fps),
    get isPaused() { return mock.isPaused; },
  };
}

function createRgbController(mock: RgbMockController | undefined): RgbController {
  if (!mock) {
    return {
      getLastFrame() { return null; },
      getDecodedImageData() { return null; },
      getPalette() { return []; },
      onFrame() { return () => {}; },
      simulateFrame() {},
    };
  }
  return {
    getLastFrame: () => mock.getLastFrame(),
    getDecodedImageData: () => mock.getDecodedImageData(),
    getPalette: () => mock.getPalette(),
    onFrame: (cb: RgbFrameCallback) => mock.onFrame(cb),
    simulateFrame: (w, h, d) => mock.simulateFrame(w, h, d),
  };
}

// ============================================================
// 内部状态
// ============================================================

function createInternalState(config: RequiredConfig): InternalState {
  const cleanupFns: (() => void)[] = [];
  return {
    config,
    cleanupFns,
    isRgbPluginLoaded: false,
    onDestroy: (fn) => {
      cleanupFns.push(fn);
    },
  };
}

// ============================================================
// Properties Controller（桥接面板内部属性缓存）
// ============================================================

/** 面板暴露的属性上下文快照 */
interface PropertiesContext {
  props: ProjectPropertyDef[];
  rawDefs: Record<string, unknown>;
  appliedLanguage: string;
  allLocalizations: Record<string, Record<string, string>>;
  availableLanguages: string[];
}

/** 从条件表达式提取第一个属性名（如 "showDate.value == true" → "showDate"） */
function extractFirstPropFromCondition(condition: string | null | undefined): string | undefined {
  if (!condition) return undefined;
  const m = condition.match(/^([a-zA-Z_]\w*)/);
  return m ? m[1] : undefined;
}

function createPropertiesController(
  getCtx: () => PropertiesContext | null,
  state: InternalState,
): PropertiesController {
  const getProps = (): ProjectPropertyDef[] => getCtx()?.props ?? [];
  const getDefs = (): Record<string, unknown> => getCtx()?.rawDefs ?? {};

  function getPropValue(key: string): unknown {
    const p = getProps().find(p => p.key === key);
    return p?.value;
  }

  const controller: PropertiesController = {

    getProperty(key: string): ProjectPropertyDef | undefined {
      return getProps().find(p => p.key === key);
    },

    getAllProperties(): ProjectPropertyDef[] {
      return [...getProps()];
    },

    getVisibility(key: string): PropertyVisibility {
      const prop = getProps().find(p => p.key === key);
      if (!prop) return { key, visible: true, condition: null };
      if (!prop.condition) return { key, visible: true, condition: null };
      const visible = evaluateCondition(prop.condition, getPropValue);
      const blockedBy = visible ? undefined : extractFirstPropFromCondition(prop.condition);
      const blockedValue = blockedBy ? getPropValue(blockedBy) : undefined;
      return { key, visible, condition: prop.condition, blockedBy, blockedValue };
    },

    getAllVisibility(): PropertyVisibility[] {
      return getProps().map(p => this.getVisibility(p.key));
    },

    checkTranslation(key: string): PropertyTranslationStatus {
      const prop = getProps().find(p => p.key === key);
      if (!prop) return { key, i18nKey: key, missing: false, displayName: key };
      const i18nKey = prop.text ?? key;
      return {
        key,
        i18nKey,
        missing: prop.missingTranslation ?? false,
        displayName: prop.displayName ?? key,
      };
    },

    getMissingTranslations(): PropertyTranslationStatus[] {
      return getProps()
        .filter(p => p.missingTranslation)
        .map(p => this.checkTranslation(p.key));
    },

    getVisibleProperties(): ProjectPropertyDef[] {
      return getProps().filter(p => this.getVisibility(p.key).visible);
    },

    getCurrentValues(): Record<string, unknown> {
      const out: Record<string, unknown> = {};
      for (const p of getProps()) out[p.key] = p.value;
      return out;
    },

    async reloadProperties(): Promise<void> {
      const ctx = getCtx();
      if (!ctx) return;
      // 触发面板重新加载 project.json
      const { loadProjectProperties } = await import('./panel/projectJsonReader');
      const result = await loadProjectProperties();
      // 更新面板内部缓存（通过 __weDevKitPropertiesChanged）
      (ctx.props as ProjectPropertyDef[]).length = 0;
      ctx.props.push(...result.properties);
      ctx.rawDefs = result.raw as Record<string, unknown>;
      ctx.allLocalizations = result.allLocalizations;
      ctx.appliedLanguage = result.appliedLanguage;
      ctx.availableLanguages = result.availableLanguages;
      controller._onChange?.(result.properties);
    },

    addProperty(def: PropertyDefInput): ProjectPropertyDef {
      const newProp: ProjectPropertyDef = {
        key: def.key,
        type: def.type,
        value: def.value ?? '',
        text: def.text,
        displayName: def.displayName ?? def.text ?? def.key,
        missingTranslation: false,
        order: def.order ?? 9999,
        index: def.index,
        condition: def.condition,
        options: def.options,
        min: def.min,
        max: def.max,
        step: def.step,
        precision: def.precision,
        fraction: def.fraction,
        fileType: def.fileType,
        mode: def.mode,
      };
      const ctx = getCtx();
      if (ctx) {
        const existing = ctx.props.findIndex(p => p.key === def.key);
        if (existing >= 0) {
          ctx.props[existing] = newProp;
        } else {
          ctx.props.push(newProp);
        }
        controller._onChange?.(ctx.props);
      }
      return newProp;
    },

    updateProperty(key: string, def: Partial<PropertyDefInput>): ProjectPropertyDef | undefined {
      const ctx = getCtx();
      if (!ctx) return undefined;
      const existing = ctx.props.find(p => p.key === key);
      if (!existing) return undefined;
      if (def.type !== undefined) existing.type = def.type;
      if (def.value !== undefined) existing.value = def.value;
      if (def.text !== undefined) existing.text = def.text;
      if (def.displayName !== undefined) existing.displayName = def.displayName;
      if (def.order !== undefined) existing.order = def.order;
      if (def.condition !== undefined) existing.condition = def.condition;
      if (def.options !== undefined) existing.options = def.options;
      if (def.min !== undefined) existing.min = def.min;
      if (def.max !== undefined) existing.max = def.max;
      if (def.step !== undefined) existing.step = def.step;
      if (def.precision !== undefined) existing.precision = def.precision;
      if (def.fraction !== undefined) existing.fraction = def.fraction;
      if (def.fileType !== undefined) existing.fileType = def.fileType;
      if (def.mode !== undefined) existing.mode = def.mode;
      if (def.index !== undefined) existing.index = def.index;
      controller._onChange?.(ctx.props);
      return existing;
    },

    removeProperty(key: string): boolean {
      const ctx = getCtx();
      if (!ctx) return false;
      const idx = ctx.props.findIndex(p => p.key === key);
      if (idx < 0) return false;
      ctx.props.splice(idx, 1);
      controller._onChange?.(ctx.props);
      return true;
    },
  };

  void state;
  void getDefs;
  return controller;
}

// ============================================================
// Public API
// ============================================================

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

  // 2. 内部状态
  const state = createInternalState(config);

  // 3. 音频数据传入开关
  const audioEnabledRef = { current: true };

  // 4. 属性监听补齐
  if (config.properties) {
    installPropertyMock(state);
  }

  // 5. Properties 控制器（延迟注入面板数据上下文）
  let propertiesCtx: (() => PropertiesContext | null) | null = null;
  const propertiesController = createPropertiesController(
    () => propertiesCtx?.() ?? null,
    state,
  );

  // 6. RGB Mock（panel 装载前必须先就绪，否则面板无法接收帧）
  let forwardRgbFrame: ((frame: RgbFrameData) => void) | null = null;
  let rgbMock: RgbMockController | undefined;
  if (config.rgb) {
    rgbMock = createRgbMock(state, (frame) => {
      forwardRgbFrame?.(frame);
    });
  }
  const rgbController = createRgbController(rgbMock);

  // 7. 生命周期 Mock
  let lifecycleMock: LifecycleMockController | undefined;
  if (config.lifecycle) {
    lifecycleMock = createLifecycleMock(state);
  }
  const lifecycleController = createLifecycleController(lifecycleMock);

  // 8. AudioBridge（统一音频状态机 + 分发中枢）
  let audioSim: AudioSimulatorController | undefined;
  let mp3Player: Mp3PlayerController | undefined;
  let audioBridge: InternalAudioBridge | undefined;

  const needsAudio = config.panel || isAudioEnabled(config);
  if (needsAudio) {
    audioBridge = createAudioBridge(config.audio.amplitude, state);

    // 回放前置补丁缓存的 audio listener 调用
    const prePatch = (window as unknown as Record<string, unknown>).__weAudioPrePatch as unknown[] | undefined;
    if (Array.isArray(prePatch)) {
      for (const cb of prePatch) {
        if (typeof cb === 'function') audioBridge.addListener(cb as (d: Float32Array) => void);
      }
    }
    delete (window as unknown as Record<string, unknown>).__weAudioPrePatch;

    // 接管 wallpaperRegisterAudioListener
    const w = window as unknown as Record<string, unknown>;
    const original = w.wallpaperRegisterAudioListener;
    delete w.wallpaperRegisterAudioListener;

    state.onDestroy(() => {
      if (typeof original === 'undefined') {
        delete (window as unknown as Record<string, unknown>).wallpaperRegisterAudioListener;
      } else {
        (window as unknown as Record<string, unknown>).wallpaperRegisterAudioListener = original;
      }
    });

    w.wallpaperRegisterAudioListener = (cb: unknown) => {
      if (typeof cb === 'function') audioBridge!.addListener(cb as (d: Float32Array) => void);
      if (typeof original === 'function') (original as (cb: unknown) => void)(cb);
    };

    // 创建模拟音频生成器（通过 bridge 内部 dispatch 发送帧）
    if (isAudioEnabled(config)) {
      const ac = config.audio;
      audioSim = createAudioSimulator(
        (frame: Float32Array) => { audioBridge!._onFrame(frame); },
        {
          amplitude: ac.amplitude,
          bassBoost: ac.bassBoost,
          variationSpeed: ac.variationSpeed,
          frameRate: ac.frameRate,
        },
        state
      );
      audioBridge.setAudioSimulator(audioSim);
    }

    // 创建 MP3 播放器（通过 bridge 内部 dispatch 发送帧）
    mp3Player = createMp3Player(
      (frame: Float32Array) => { audioBridge!._onFrame(frame); },
      state
    );
    audioBridge.setMp3Player(mp3Player);

    // 默认启动模拟器
    if (audioSim) audioSim.start();
  }

  // 11. 媒体 Mock
  let mediaMock: MediaMockController | undefined;
  if (isMediaEnabled(config)) {
    const tracks = config.media.tracks;
    mediaMock = createMediaMock(tracks, state);
  }
  const mediaController = createMediaController(mediaMock);

  // 12. 控制面板
  let panelController: ReturnType<typeof createPanel> | undefined;
  if (options?.panel !== false) {
    panelController = createPanel({
      config,
      state,
      audioSimulator: audioSim,
      mediaMock,
      lifecycleMock,
      mp3Player,
      bridge: audioBridge,
      onAudioSourceToggle: (source: 'simulated' | 'mp3') => {
        audioBridge?.setSource(source);
      },
      setAudioEnabled: (enabled: boolean) => {
        audioBridge?.setEnabled(enabled);
      },
    });

    forwardRgbFrame = (frame) => panelController!.updateRgbFrame(frame);
    propertiesCtx = () => panelController!.getPropertiesContext();
    propertiesController._onChange = (newProps) => {
      panelController?.refreshProperties(newProps);
    };

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('dev-panel') === 'true' || urlParams.get('dev-kit') === 'true') {
      panelController.show();
    }
  }

  // 13. 状态 + 实例装配
  let destroyed = false;

  const stateRef: DevKitState = {
    isLoaded: true,
    isPanelVisible: panelController ? panelController.isVisible : false,
    currentTrackIndex: mediaMock ? mediaMock.currentIndex : 0,
    playbackState: mediaMock ? mediaMock.playbackState : 'stopped',
    isRgbPluginLoaded: state.isRgbPluginLoaded,
    isAudioEnabled: audioBridge?.getState().enabled ?? true,
  };

  Object.defineProperty(stateRef, 'isPanelVisible', {
    get: () => panelController?.isVisible ?? false,
    enumerable: true,
  });
  Object.defineProperty(stateRef, 'currentTrackIndex', {
    get: () => mediaMock?.currentIndex ?? 0,
    enumerable: true,
  });
  Object.defineProperty(stateRef, 'playbackState', {
    get: () => mediaMock?.playbackState ?? 'stopped',
    enumerable: true,
  });
  Object.defineProperty(stateRef, 'isRgbPluginLoaded', {
    get: () => state.isRgbPluginLoaded,
    enumerable: true,
  });
  Object.defineProperty(stateRef, 'isAudioEnabled', {
    get: () => audioEnabledRef.current,
    enumerable: true,
  });

  const instance: DevKitInstance = {
    destroy() {
      if (destroyed) return;
      destroyed = true;
      for (const fn of state.cleanupFns) {
        try {
          fn();
        } catch {
          /* ignore */
        }
      }
      state.cleanupFns.length = 0;
      if (panelController) panelController.destroy();

      // 清理全局桥接
      const w = window as unknown as Record<string, unknown>;
      delete w.__weDevKit;
      delete w.__weDevKitDispatchAudio;
      console.log('[WE Dev Kit] Destroyed');
    },

    togglePanel() {
      panelController?.toggle();
    },

    getConfig() {
      return { ...config };
    },

    pushProperties(props: Record<string, unknown>) {
      const listener = (window as unknown as {
        wallpaperPropertyListener?: { applyUserProperties?: (p: Record<string, unknown>) => void };
      }).wallpaperPropertyListener;
      if (listener?.applyUserProperties) {
        const formatted: Record<string, { value: unknown }> = {};
        for (const [key, value] of Object.entries(props)) {
          formatted[key] = { value };
        }
        listener.applyUserProperties(formatted);
      }
    },

    setAudioEnabled(enabled: boolean) {
      audioEnabledRef.current = enabled;
      // 委托给 AudioBridge 统一管理（零帧归零 + 状态同步）
      if (audioBridge) {
        audioBridge.setEnabled(enabled);
      } else {
        // 无 bridge 时的兜底（仅直接操作模拟器）
        if (audioSim) {
          audioSim.fadeTo(enabled ? config.audio.amplitude : 0, 800);
        }
      }
      console.log(`[WE Dev Kit] Audio ${enabled ? 'enabled' : 'disabled'} (fade ${enabled ? 'in' : 'out'})`);
    },

    pushAudioFrame() {
      if (audioSim && audioEnabledRef.current) {
        audioSim.pushFrame();
      }
    },

    nextTrack() {
      mediaMock?.nextTrack();
    },

    state: stateRef,
    media: mediaController,
    rgb: rgbController,
    lifecycle: lifecycleController,
    properties: propertiesController,
  };

  (window as unknown as Record<string, unknown>).__weDevKit = instance;
  console.log('[WE Dev Kit] 初始化完成');
  return instance;
}

// 抑制未使用警告
void createAudioSimulator;