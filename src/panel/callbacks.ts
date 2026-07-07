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
  onClose: () => void;
  onMinimize: () => void;
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