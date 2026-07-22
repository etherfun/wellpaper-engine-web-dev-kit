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
import { createMp3Player } from './mp3Player';
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
  LifecycleController,
  LifecycleMockController,
  MediaConfig,
  MediaController,
  MediaMockController,
  MockTrack,
  Mp3PlayerController,
  PanelConfig,
  PropertiesController,
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

function isPanelEnabled(cfg: RequiredConfig): boolean {
  const p = cfg.panel;
  return p.position.x !== 0 || p.position.y !== 0 || !p.collapsed || p.theme === 'dark';
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
// 音频帧分发
// ============================================================

function installAudioDispatch(
  audioSim: AudioSimulatorController | undefined,
  mp3Player: Mp3PlayerController | undefined,
  audioEnabledRef: { current: boolean },
  state: InternalState
): void {
  const w = window as unknown as Record<string, unknown>;

  // 回放前置补丁缓存的 audio listener 调用
  // （壁纸 bundle.js 在 dev-kit 之前加载时，回调被暂存到 __weAudioPrePatch）
  const prePatchQueue = w.__weAudioPrePatch as unknown[] | undefined;

  // 移除前置补丁的 Object.defineProperty 拦截，恢复为普通属性
  // （否则 w.wallpaperRegisterAudioListener = xxx 会被 setter 捕获，不会真正赋值）
  delete w.wallpaperRegisterAudioListener;

  const listeners = new Set<(data: Float32Array) => void>();
  const original = w.wallpaperRegisterAudioListener;

  if (Array.isArray(prePatchQueue)) {
    for (const cb of prePatchQueue) {
      if (typeof cb === 'function') {
        listeners.add(cb as (data: Float32Array) => void);
      }
    }
    delete w.__weAudioPrePatch;
  }

  w.wallpaperRegisterAudioListener = (cb: unknown) => {
    if (typeof cb === 'function') {
      listeners.add(cb as (data: Float32Array) => void);
    }
    if (typeof original === 'function') {
      (original as (cb: unknown) => void)(cb);
    }
  };

  if (audioSim) {
    audioSim.start();
  }

  const dispatchAudioFrame = (frame: Float32Array): void => {
    if ((window as unknown as Record<string, unknown>)['__weLifecyclePaused'] === true) return;
    if (!audioEnabledRef.current) return;
    for (const listener of listeners) {
      try {
        // 每个 listener 独立拷贝，避免 listener 修改数组影响其他 listener
        listener(new Float32Array(frame));
      } catch {
        /* ignore listener errors */
      }
    }
  };

  state.onDestroy(() => {
    audioSim?.stop();
    mp3Player?.destroy();
    if (zeroRafId !== null) { cancelAnimationFrame(zeroRafId); zeroRafId = null; }
    delete (w as unknown as Record<string, unknown>).__weDevKitStartZeroFade;
    if (typeof original === 'undefined') {
      delete w.wallpaperRegisterAudioListener;
    } else {
      w.wallpaperRegisterAudioListener = original;
    }
  });

  // 暴露全局 frame dispatcher 供 audioSim / mp3Player 调用
  w.__weDevKitDispatchAudio = dispatchAudioFrame;

  // 暴露全局 zero-fade 函数：持续推送全零帧约 1000ms，
  // 让壁纸视觉层的平滑/计权/峰值保持有充足时间衰减到零。
  let zeroFrameCount = 0;
  let zeroRafId: number | null = null;
  w.__weDevKitStartZeroFade = () => {
    // 清除已有动画
    if (zeroRafId !== null) { cancelAnimationFrame(zeroRafId); zeroRafId = null; }
    zeroFrameCount = 0;
    const MAX_ZERO_FRAMES = 60; // ~1000ms at 60fps

    function pushZero(): void {
      // 每帧创建新数组，避免壁纸 listener 修改数组后下一帧读到脏数据
      const zero = new Float32Array(128);
      for (const listener of listeners) {
        try { listener(zero); } catch { /* ignore */ }
      }
      zeroFrameCount++;
      if (zeroFrameCount < MAX_ZERO_FRAMES) {
        zeroRafId = requestAnimationFrame(pushZero);
      } else {
        zeroRafId = null;
      }
    }
    zeroRafId = requestAnimationFrame(pushZero);
  };
}

// ============================================================
// Properties Controller
// ============================================================

function createPropertiesController(state: InternalState): PropertiesController {
  // 简化实现：仅暴露空状态；详细逻辑由 panel 内部维护
  // 实际项目内未深度使用 PropertiesController 公共 API，保持轻量
  void state;
  return {
    getProperty: () => undefined,
    getAllProperties: () => [],
    getVisibility: (key) => ({ key, visible: true, condition: null }),
    getAllVisibility: () => [],
    checkTranslation: (key) => ({ key, i18nKey: key, missing: false, displayName: key }),
    getMissingTranslations: () => [],
    getVisibleProperties: () => [],
    getCurrentValues: () => ({}),
    async reloadProperties() {},
    addProperty: (def) => def as never,
    updateProperty: () => undefined,
    removeProperty: () => false,
  };
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

  // 5. Properties 控制器
  const propertiesController = createPropertiesController(state);

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

  // 8. 音频模拟器 + MP3 播放器 + 分派桥
  let audioSim: AudioSimulatorController | undefined;
  let mp3Player: Mp3PlayerController | undefined;

  const needsAudio = config.panel || isAudioEnabled(config);
  if (needsAudio) {
    if (isAudioEnabled(config)) {
      const ac = config.audio;
      audioSim = createAudioSimulator(
        (frame: Float32Array) => {
          const dispatcher = (window as unknown as {
            __weDevKitDispatchAudio?: (frame: Float32Array) => void;
          }).__weDevKitDispatchAudio;
          dispatcher?.(frame);
        },
        {
          amplitude: ac.amplitude,
          bassBoost: ac.bassBoost,
          variationSpeed: ac.variationSpeed,
          frameRate: ac.frameRate,
        },
        state
      );
    }

    // MP3 播放器（真实频谱），必须在 installAudioDispatch 前创建
    mp3Player = createMp3Player(
      (frame: Float32Array) => {
        const dispatcher = (window as unknown as {
          __weDevKitDispatchAudio?: (frame: Float32Array) => void;
        }).__weDevKitDispatchAudio;
        dispatcher?.(frame);
      },
      state
    );

    // 安装分派桥并启动音频（修补 wallpaperRegisterAudioListener + 暴露 __weDevKitDispatchAudio）
    installAudioDispatch(audioSim, mp3Player, audioEnabledRef, state);
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
  if (isPanelEnabled(config)) {
    let audioDisableTimer: ReturnType<typeof setTimeout> | null = null;
    let currentAudioSource: 'simulated' | 'mp3' = 'simulated';
    panelController = createPanel({
      config,
      state,
      audioSimulator: audioSim,
      mediaMock,
      lifecycleMock,
      mp3Player,
      onAudioSourceToggle: (source: 'simulated' | 'mp3') => {
        currentAudioSource = source;
        if (source === 'mp3') {
          // 切换到真实频谱时，完全停止模拟音频，避免并行输入
          audioSim?.stop();
          console.log('[WE Dev Kit] Audio source switched to: mp3 (sim stopped)');
        } else {
          // 切回模拟数据，仅在音频启用时启动
          if (audioEnabledRef.current) {
            audioSim?.start();
            audioSim?.fadeTo(config.audio.amplitude, 300);
          }
          console.log('[WE Dev Kit] Audio source switched to: simulated');
        }
      },
      setAudioEnabled: (enabled: boolean) => {
        // 如果淡出定时器还在运行，取消它（用户快速切换场景）
        if (audioDisableTimer !== null) {
          clearTimeout(audioDisableTimer);
          audioDisableTimer = null;
        }

        if (enabled) {
          audioEnabledRef.current = true;
          // 模拟模式才需启动模拟器并淡入
          if (currentAudioSource === 'simulated' && audioSim) {
            audioSim.start();
            audioSim.setAmplitude(0);
            audioSim.fadeTo(config.audio.amplitude, 800);
          }
          console.log('[WE Dev Kit] Audio enabled');
        } else {
          // 持续推送零帧让频谱回落为 0
          const w2 = window as unknown as Record<string, unknown>;
          (w2.__weDevKitStartZeroFade as (() => void) | undefined)?.();

          if (currentAudioSource === 'mp3') {
            // 真实频谱无淡出，立即停止分发
            audioEnabledRef.current = false;
            console.log('[WE Dev Kit] Audio disabled (mp3, immediate)');
          } else {
            // 模拟模式先淡出再停止分发
            if (audioSim) audioSim.fadeTo(0, 800);
            audioDisableTimer = setTimeout(() => {
              audioEnabledRef.current = false;
              audioDisableTimer = null;
              console.log('[WE Dev Kit] Audio disabled (dispatch stopped)');
            }, 1000);
            console.log('[WE Dev Kit] Audio disabling (simulated, fade out…)');
          }
        }
      },
    });

    forwardRgbFrame = (frame) => panelController!.updateRgbFrame(frame);
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
    isAudioEnabled: audioEnabledRef.current,
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
      if (audioSim) {
        audioSim.fadeTo(enabled ? config.audio.amplitude : 0, 800);
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