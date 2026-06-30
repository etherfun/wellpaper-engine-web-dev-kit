/**
 * 控制面板控制器
 *
 * 管理面板的显示/隐藏/销毁，以及与其他 mock 模块的数据同步。
 */

import type {
  AudioMode,
  AudioSimulatorController,
  DevKitConfig,
  InternalState,
  MediaMockController,
  MockTrack,
  PlaybackState,
  ProjectPropertyDef,
  RgbFrameCallback,
} from '../types';
import { loadProjectProperties } from './projectJsonReader';
import { renderPanel } from './renderer';

interface PanelDeps {
  config: DevKitConfig;
  state: InternalState;
  audioSimulator?: AudioSimulatorController;
  mediaMock?: MediaMockController;
  lifecycleMock?: {
    simulatePause: () => void;
    simulateResume: () => void;
    simulateFpsChange: (fps: number) => void;
  };
}

export function createPanel(deps: PanelDeps) {
  const { config, state, audioSimulator, mediaMock, lifecycleMock } = deps;
  let panelController: PanelUIController | null = null;
  let isVisible = false;
  let props: ProjectPropertyDef[] = [];
  let rawDefs: Record<string, any> = {};
  let appliedLanguage: string = 'en-us';
  let allLocalizations: Record<string, Record<string, string>> = {};
  let availableLanguages: string[] = [];
  let refreshMediaTimer: ReturnType<typeof setInterval> | null = null;

  // ---- 加载 project.json 属性 ----
  async function initProperties() {
    const result = await loadProjectProperties();
    props = result.properties;
    rawDefs = result.raw;
    appliedLanguage = result.appliedLanguage;
    allLocalizations = result.allLocalizations;
    availableLanguages = result.availableLanguages;
    console.log(`[WE Dev Kit] Panel: loaded ${props.length} properties from project.json (lang: ${appliedLanguage})`);
    return props;
  }

  // ---- 创建面板 ----
  async function create() {
    if (panelController) return;

    // 加载属性
    const initialProps = await initProperties();

    // 创建面板 DOM
    panelController = renderPanel(
      document.body,
      state,
      {
        audio: audioSimulator,
        media: mediaMock,
      },
      {
        onPropertyChange: (key, value) => {
          // 推送到 wallpaperPropertyListener
          const listener = (window as any).wallpaperPropertyListener;
          if (listener?.applyUserProperties) {
            listener.applyUserProperties({ [key]: { value } });
          }
        },
        onAudioAmplitude: (v) => audioSimulator?.setAmplitude(v),
        onAudioBassBoost: (v) => audioSimulator?.setBassBoost(v),
        onAudioSpeed: (v) => audioSimulator?.setVariationSpeed(v),
        onAudioMode: (m: AudioMode) => audioSimulator?.setMode(m),
        onMediaPlay: () => mediaMock?.play(),
        onMediaPause: () => mediaMock?.pause(),
        onMediaStop: () => mediaMock?.stop(),
        onMediaNext: () => mediaMock?.nextTrack(),
        onMediaPrev: () => mediaMock?.prevTrack(),
        onMediaTrackChange: (i) => mediaMock?.setTrack(i),
        onMediaCustomTrack: (track: Partial<MockTrack>) => mediaMock?.setCustomTrack(track),
        onMediaThumbnail: (dataUri) => mediaMock?.setCustomThumbnail(dataUri),
        onMediaSeek: (pct) => mediaMock?.seek(pct),
        onLifecyclePause: () => lifecycleMock?.simulatePause(),
        onLifecycleResume: () => lifecycleMock?.simulateResume(),
        onLifecycleFps: (fps) => lifecycleMock?.simulateFpsChange(fps),
        onClose: () => hide(),
        onMinimize: () => hide(),
      },
      initialProps,
      appliedLanguage,
      availableLanguages,
      // 语言切换回调：原地更新 props 的 displayName 和选项 label
      (newLang: string) => {
        const localeMap = allLocalizations[newLang] ?? {};
        for (const prop of props) {
          if (prop.type === 'group' || prop.type === 'text') continue;
          if (!prop.text || prop.text === prop.key) continue;
          const dn = localeMap[prop.text]?.trim();
          prop.displayName = dn || prop.key;
          prop.missingTranslation = !dn;
          // 重新解析 combo 选项 label
          if ((prop.type === 'combo') && rawDefs[prop.key]?.options) {
            const rawOpts = rawDefs[prop.key].options!;
            prop.options = rawOpts.map(opt => ({
              value: opt.value,
              label: localeMap[opt.label]?.trim() || opt.label,
            }));
          }
        }
        appliedLanguage = newLang;
      }
    );

    // 媒体刷新定时器
    if (mediaMock) {
      refreshMediaTimer = setInterval(() => {
        const track = mediaMock.getCurrentTrack();
        const pbs = mediaMock.playbackState;
        const position = mediaMock.getPosition();
        const duration = track.duration || 240;
        const trackIndex = mediaMock.currentIndex;
        updateMediaDisplay(track, pbs, position, duration, trackIndex);
      }, 500);
    }

    isVisible = true;
  }

  function updateMediaDisplay(track: MockTrack, state: PlaybackState, position: number, duration: number, trackIndex?: number) {
    if (panelController) {
      const root = (panelController as any).shadowRoot;
      if (!root) return;
      const mediaContent = root.getElementById('__we_media-content');
      if (mediaContent && (mediaContent as any).__updateMedia) {
        (mediaContent as any).__updateMedia(track, state, position, duration, trackIndex ?? -1);
      }
    }
  }

  function show() {
    if (!panelController) {
      create().catch(console.warn);
      return;
    }
    panelController.isVisible = true;
    panelController.element.style.display = '';
    isVisible = true;
  }

  function hide() {
    if (!panelController) return;
    panelController.isVisible = false;
    panelController.element.style.display = 'none';
    isVisible = false;
  }

  function toggle() {
    if (isVisible) hide();
    else show();
  }

  function destroy() {
    if (refreshMediaTimer) {
      clearInterval(refreshMediaTimer);
      refreshMediaTimer = null;
    }
    if (panelController) {
      panelController.destroy();
      panelController = null;
    }
    isVisible = false;
  }

  function updateRgbFrame(frame: import('../types').RgbFrameData) {
    if (!panelController) return;
    const root = (panelController as any).shadowRoot;
    if (!root) return;
    const el = root.getElementById('__we_rgb-content');
    if (el && (el as any).__updateRgbFrame) {
      (el as any).__updateRgbFrame(frame);
    }
  }

  function updateRazerStatus(connected: boolean, error?: string) {
    if (!panelController) return;
    const root = (panelController as any).shadowRoot;
    if (!root) return;
    const el = root.getElementById('__we_rgb-content');
    if (el && (el as any).__updateRazerStatus) {
      (el as any).__updateRazerStatus(connected, error ?? '');
    }
  }

  return {
    show,
    hide,
    toggle,
    destroy,
    updateRgbFrame,
    updateRazerStatus,
    get isVisible() {
      return isVisible;
    },
    ensureCreated: create,
    /** 刷新属性列表（当 project.json 变化时调用） */
    async refreshProperties() {
      await initProperties();
    },
  };
}

interface PanelUIController {
  element: HTMLElement;
  styleEl: HTMLElement;
  clockInterval: ReturnType<typeof setInterval>;
  isVisible: boolean;
  destroy(): void;
  updateStatus(isRealWE: boolean): void;
  updateRgbState(loaded: boolean): void;
  updateRazerStatus?(connected: boolean, error?: string): void;
}
