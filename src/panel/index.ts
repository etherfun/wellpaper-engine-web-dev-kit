/**
 * 控制面板控制器
 *
 * 管理面板的显示/隐藏/销毁，以及与其他 mock 模块的数据同步。
 */

import type {
  AudioMode,
  AudioSimulatorController,
  InternalState,
  LifecycleMockController,
  MediaMockController,
  MockTrack,
  Mp3PlayerController,
  ProjectPropertyDef,
  RgbFrameData,
} from '../types';
import {
  loadProjectProperties,
  serializePropertiesToJson,
  downloadJsonFile,
} from './projectJsonReader';
import { renderPanel, type PanelController } from './renderer';
import { resolvePanelMessages } from './i18n';

export interface PanelDeps {
  config: import('../types').DevKitConfig;
  state: InternalState;
  audioSimulator?: AudioSimulatorController;
  mediaMock?: MediaMockController;
  lifecycleMock?: LifecycleMockController;
  /** MP3 播放器（真实频谱） */
  mp3Player?: Mp3PlayerController;
  /** Task 0: 音频数据传入开关 */
  setAudioEnabled?: (enabled: boolean) => void;
  /** 音频源切换 */
  onAudioSourceToggle?: (source: 'simulated' | 'mp3') => void;
}

export function createPanel(deps: PanelDeps) {
  const { config, state, audioSimulator, mediaMock, lifecycleMock, mp3Player, setAudioEnabled, onAudioSourceToggle } = deps;
  let panelController: PanelController | null = null;
  let isVisible = false;
  let props: ProjectPropertyDef[] = [];
  let rawDefs: Record<string, unknown> = {};
  let appliedLanguage = 'en-us';
  let allLocalizations: Record<string, Record<string, string>> = {};
  let availableLanguages: string[] = [];
  let refreshMediaTimer: ReturnType<typeof setInterval> | null = null;

  async function initProperties(): Promise<ProjectPropertyDef[]> {
    const result = await loadProjectProperties();
    props = result.properties;
    rawDefs = result.raw as Record<string, unknown>;
    appliedLanguage = result.appliedLanguage;
    allLocalizations = result.allLocalizations;
    availableLanguages = result.availableLanguages;
    console.log(`[WE Dev Kit] Panel: loaded ${props.length} properties from project.json (lang: ${appliedLanguage})`);
    return props;
  }

  async function create(): Promise<void> {
    if (panelController) return;
    const initialProps = await initProperties();

    panelController = renderPanel(
      document.body,
      state,
      { audio: audioSimulator, media: mediaMock },
      {
        onPropertyChange: (key, value) => {
          const listener = (window as unknown as { wallpaperPropertyListener?: { applyUserProperties?: (p: Record<string, unknown>) => void } }).wallpaperPropertyListener;
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
        onAudioToggle: (enabled) => setAudioEnabled?.(enabled),
        onMp3LoadFile: (file: File) => {
          void mp3Player?.loadFile(file).then(() => {
            // 加载后自动播放
            mp3Player?.play();
            // 通知 UI 更新
            if (panelController) {
              const audioSection = panelController.sections.audio as unknown as Record<string, unknown>;
              const fns = audioSection.__mp3UpdateFns as Record<string, () => void> | undefined;
              fns?.onMp3Load();
              fns?.onMp3Play();
            }
          });
        },
        onMp3Play: () => mp3Player?.play(),
        onMp3Pause: () => {
          mp3Player?.pause();
          // 发送零帧让频谱回落为 0
          const w = window as unknown as Record<string, unknown>;
          (w.__weDevKitZeroFrame as (() => void) | undefined)?.();
        },
        onMp3Stop: () => {
          mp3Player?.stop();
          // 发送零帧让频谱回落为 0
          const w = window as unknown as Record<string, unknown>;
          (w.__weDevKitZeroFrame as (() => void) | undefined)?.();
        },
        onMp3Seek: (pct: number) => mp3Player?.seek(pct),
        onMp3Volume: (v: number) => mp3Player?.setVolume(v),
        onMp3Sensitivity: (v: number) => mp3Player?.setSensitivity(v),
        onMp3Ceiling: (v: number) => mp3Player?.setCeiling(v),
        onMp3LoopToggle: (enabled: boolean) => mp3Player?.setLoop(enabled),
        onAudioSourceToggle: (() => {
          let lastSource: 'simulated' | 'mp3' = 'simulated';
          return (source: 'simulated' | 'mp3') => {
            if (source === lastSource) return; // 幂等：同一源不重复触发
            lastSource = source;
            mp3Player?.setActive(source === 'mp3');
            onAudioSourceToggle?.(source);
          };
        })(),
        onLifecycleToggle: (paused: boolean) => {
          if (paused) lifecycleMock?.simulatePause();
          else lifecycleMock?.simulateResume();
        },
        onLifecycleFps: (fps) => lifecycleMock?.simulateFpsChange(fps),
        onClose: () => hide(),
        onMinimize: () => hide(),
        onSaveI18nTranslation: (i18nKey: string, translations: Record<string, string>) => {
          // 更新内存中的 allLocalizations
          for (const [lang, text] of Object.entries(translations)) {
            if (!allLocalizations[lang]) allLocalizations[lang] = {};
            allLocalizations[lang]![i18nKey] = text;
          }
          // 刷新当前语言的所有属性 displayName
          const currentLocale = allLocalizations[appliedLanguage] ?? {};
          for (const prop of props) {
            if (!prop.text || prop.text === prop.key) continue;
            const dn = currentLocale[prop.text]?.trim();
            prop.displayName = dn || prop.text;
            prop.missingTranslation = !dn;
            if (prop.type === 'combo') {
              const rawOpts = (rawDefs[prop.key] as { options?: { value: unknown; label: string }[] } | undefined)?.options;
              if (rawOpts) {
                prop.options = rawOpts.map((opt) => ({
                  value: opt.value,
                  label: currentLocale[opt.label]?.trim() || opt.label,
                }));
              }
            }
          }
          if (panelController?.getPropertiesRefresher) {
            panelController.getPropertiesRefresher()();
          }
          console.log(`[WE Dev Kit] i18n translation saved: "${i18nKey}"`, translations);
        },
      },
      initialProps,
      appliedLanguage,
      availableLanguages,
      (newLang: string) => {
        const localeMap = allLocalizations[newLang] ?? {};
        const hasAnyKeys = Object.keys(localeMap).length > 0;
        for (const prop of props) {
          if (prop.type === 'group' || prop.type === 'text') continue;
          if (!prop.text || prop.text === prop.key) continue;
          const dn = localeMap[prop.text]?.trim();
          prop.displayName = dn || prop.text;
          prop.missingTranslation = hasAnyKeys && !dn;
          prop.missingTranslation = !dn;
          if (prop.type === 'combo') {
            const rawOpts = (rawDefs[prop.key] as { options?: { value: unknown; label: string }[] } | undefined)?.options;
            if (rawOpts) {
              prop.options = rawOpts.map((opt) => ({
                value: opt.value,
                label: localeMap[opt.label]?.trim() || opt.label,
              }));
            }
          }
        }
        appliedLanguage = newLang;
        // 通知所有 modal 实例更新（如果当前打开的话）
        const evt = new CustomEvent('__weDevKitLocaleChanged', { detail: { lang: newLang } });
        window.dispatchEvent(evt);
      },
      resolvePanelMessages(),
      {
        activeLocalization: allLocalizations[appliedLanguage] ?? {},
        allLocalizations,
        activeLanguage: appliedLanguage,
        availableLanguages,
      },
      allLocalizations
    );

    if (mediaMock) {
      refreshMediaTimer = setInterval(() => {
        const track = mediaMock.getCurrentTrack();
        const pbs = mediaMock.playbackState;
        const position = mediaMock.getPosition();
        const duration = track.duration ?? 240;
        const trackIndex = mediaMock.currentIndex;
        const updater = panelController!.getMediaUpdater();
        updater(track, pbs, position, duration, trackIndex);
      }, 500);
    }

    // MP3 播放器进度刷新
    if (mp3Player && panelController) {
      const mp3RefreshTimer = setInterval(() => {
        if (!mp3Player.isLoaded) return;
        const ct = mp3Player.currentTime;
        const dur = mp3Player.duration;
        const audioSection = panelController!.sections.audio as unknown as Record<string, unknown>;
        const fns = audioSection.__mp3UpdateFns as
          | { updatePosition: (ct: number, dur: number) => void; onMp3Stop: () => void }
          | undefined;
        if (fns) {
          if (dur > 0) {
            fns.updatePosition(ct, dur);
          }
          // 检测播放结束
          if (mp3Player.isLoaded && !mp3Player.isPlaying && ct > 0 && dur > 0 && ct >= dur - 0.5) {
            fns.onMp3Stop();
          }
        }
      }, 250);
      state.onDestroy(() => clearInterval(mp3RefreshTimer));
    }

    (window as unknown as { __weDevKitPropertiesChanged?: (p: ProjectPropertyDef[]) => void }).__weDevKitPropertiesChanged = (newProps: ProjectPropertyDef[]) => {
      props = newProps;
      panelController!.getPropertiesRefresher()(newProps);
    };
    (window as unknown as { __weDevKitSaveProps?: () => void }).__weDevKitSaveProps = () => {
      const json = serializePropertiesToJson(props, rawDefs);
      downloadJsonFile({ general: { properties: json } }, 'project.json');
      console.log(`[WE Dev Kit] Properties saved: ${Object.keys(json).length} properties`);
    };

    isVisible = true;
    void config;
  }

  function show(): void {
    if (!panelController) {
      void create();
      return;
    }
    panelController.isVisible = true;
    panelController.element.style.display = '';
    isVisible = true;
  }

  function hide(): void {
    if (!panelController) return;
    panelController.isVisible = false;
    panelController.element.style.display = 'none';
    isVisible = false;
  }

  function toggle(): void {
    if (isVisible) hide();
    else show();
  }

  function destroy(): void {
    if (refreshMediaTimer) {
      clearInterval(refreshMediaTimer);
      refreshMediaTimer = null;
    }
    if (panelController) {
      panelController.destroy();
      panelController = null;
    }
    delete (window as unknown as Record<string, unknown>).__weDevKitPropertiesChanged;
    delete (window as unknown as Record<string, unknown>).__weDevKitExportJson;
    isVisible = false;
  }

  function updateRgbFrame(frame: RgbFrameData): void {
    if (!panelController) return;
    const updater = panelController.getRgbUpdater();
    updater(frame);
  }

  function refreshProperties(newProps?: ProjectPropertyDef[]): void {
    if (!panelController) return;
    panelController.getPropertiesRefresher()(newProps);
  }

  return {
    show,
    hide,
    toggle,
    destroy,
    updateRgbFrame,
    refreshProperties,
    get isVisible() {
      return isVisible;
    },
    ensureCreated: create,
  };
}