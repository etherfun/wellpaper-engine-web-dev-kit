/**
 * 面板回调契约：所有 section 共享的回调签名。
 */

import type {
  AudioMode,
  MockTrack,
  PlaybackState,
  ProjectPropertyDef,
  RgbFrameData,
} from '../types';

export interface PanelCallbacks {
  onPropertyChange: (key: string, value: unknown) => void;
  onAudioToggle: (enabled: boolean) => void;
  onAudioAmplitude: (v: number) => void;
  onAudioBassBoost: (v: number) => void;
  onAudioSpeed: (v: number) => void;
  onAudioMode: (m: AudioMode) => void;
  onMediaPlay: () => void;
  onMediaPause: () => void;
  onMediaStop: () => void;
  onMediaNext: () => void;
  onMediaPrev: () => void;
  onMediaTrackChange: (index: number) => void;
  onMediaCustomTrack: (track: Partial<MockTrack>) => void;
  onMediaThumbnail: (dataUri: string) => void;
  onMediaSeek: (pct: number) => void;
  onLifecycleToggle: (paused: boolean) => void;
  onLifecycleFps: (fps: number) => void;
  /** MP3 文件加载 */
  onMp3LoadFile: (file: File) => void;
  /** MP3 播放 */
  onMp3Play: () => void;
  /** MP3 暂停 */
  onMp3Pause: () => void;
  /** MP3 停止 */
  onMp3Stop: () => void;
  /** MP3 跳转（百分比） */
  onMp3Seek: (percent: number) => void;
  /** MP3 音量 */
  onMp3Volume: (v: number) => void;
  /** 切换音频源（simulated | mp3） */
  onAudioSourceToggle: (source: 'simulated' | 'mp3') => void;
  /** MP3 频谱灵敏度 0.1-1 */
  onMp3Sensitivity: (v: number) => void;
  /** MP3 输出上限 0.1-1 */
  onMp3Ceiling: (v: number) => void;
  /** MP3 循环播放开关 */
  onMp3LoopToggle: (enabled: boolean) => void;
  onClose: () => void;
  onMinimize: () => void;
  /** 保存 i18n 翻译（当用户在属性编辑器中编辑翻译时触发） */
  onSaveI18nTranslation?: (i18nKey: string, translations: Record<string, string>) => void;
}

export interface PanelMediaUpdater {
  (track: MockTrack, state: PlaybackState, position: number, duration: number, trackIndex: number): void;
}

export interface PanelRgbUpdater {
  (frame: RgbFrameData): void;
}

export interface PanelPropertiesRefresher {
  (newProps?: ProjectPropertyDef[]): void;
}