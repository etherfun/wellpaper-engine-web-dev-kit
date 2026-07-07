/**
 * 媒体集成模拟模块
 *
 * 完整模拟 WE Media Integration 全部 5 个 listener + 常量：
 *   - wallpaperRegisterMediaStatusListener
 *   - wallpaperRegisterMediaPropertiesListener
 *   - wallpaperRegisterMediaThumbnailListener
 *   - wallpaperRegisterMediaPlaybackListener
 *   - wallpaperRegisterMediaTimelineListener
 *   - wallpaperMediaIntegration.PLAYBACK_* 常量
 *
 * 预置 5 首曲库 + 自定义曲目支持 + 封面图片上传。
 */

import { extractColorsFromDataUri, generateThumbnailSvg } from './utils/imageData';
import { interceptWindowSetter, type WindowPatch } from './utils/windowPatching';
import type { InternalState, MediaMockController, MockTrack, PlaybackState } from './types';

// ---- 内置曲库 ----

const BUILTIN_TRACKS: MockTrack[] = [
  {
    title: '晴天',
    artist: '周杰伦',
    album: '叶惠美',
    genre: 'pop',
    duration: 277,
    primaryColor: '#4A90D9',
    secondaryColor: '#2C5F8A',
    tertiaryColor: '#7AB8F5',
    textColor: '#FFFFFF',
    highContrastColor: '#FFFFFF',
  },
  {
    title: 'Something About Us',
    artist: 'Daft Punk',
    album: 'Discovery',
    genre: 'electronic',
    duration: 232,
    primaryColor: '#E84057',
    secondaryColor: '#8B1A2B',
    tertiaryColor: '#F5A0AB',
    textColor: '#FFFFFF',
    highContrastColor: '#FFFFFF',
  },
  {
    title: '不为谁而作的歌',
    artist: '林俊杰',
    album: '和自己对话',
    genre: 'pop',
    duration: 244,
    primaryColor: '#50B86C',
    secondaryColor: '#2D6B3F',
    tertiaryColor: '#8DE8A5',
    textColor: '#FFFFFF',
    highContrastColor: '#FFFFFF',
  },
  {
    title: 'Nuvole Bianche',
    artist: 'Ludovico Einaudi',
    album: 'Islands',
    genre: 'classical',
    duration: 360,
    primaryColor: '#9B8EC0',
    secondaryColor: '#5A4F7A',
    tertiaryColor: '#C4B8E8',
    textColor: '#FFFFFF',
    highContrastColor: '#FFFFFF',
  },
  {
    title: '光年之外',
    artist: '邓紫棋',
    album: '光年之外',
    genre: 'pop',
    duration: 250,
    primaryColor: '#F5A623',
    secondaryColor: '#B87A1A',
    tertiaryColor: '#FFD47A',
    textColor: '#1A1A1A',
    highContrastColor: '#FFFFFF',
  },
];

const PLAYBACK_PLAYING = 0;
const PLAYBACK_PAUSED = 1;
const PLAYBACK_STOPPED = 2;

const REGISTER_FNS = [
  'wallpaperRegisterMediaStatusListener',
  'wallpaperRegisterMediaPropertiesListener',
  'wallpaperRegisterMediaThumbnailListener',
  'wallpaperRegisterMediaPlaybackListener',
  'wallpaperRegisterMediaTimelineListener',
] as const;
type RegisterFn = (typeof REGISTER_FNS)[number];

interface PropertiesEvent {
  title: string;
  artist: string;
  subTitle: string;
  albumTitle: string;
  albumArtist: string;
  genres: string;
  contentType: 'music' | 'video';
}

interface ThumbnailEvent {
  thumbnail: string;
  primaryColor: string;
  secondaryColor: string;
  tertiaryColor: string;
  textColor: string;
  highContrastColor: string;
}

interface PlaybackEvent {
  state: 0 | 1 | 2;
}

interface TimelineEvent {
  position: number;
  duration: number;
}

type MediaEvent = PropertiesEvent | ThumbnailEvent | PlaybackEvent | TimelineEvent;

function buildPropertiesEvent(track: MockTrack): PropertiesEvent {
  return {
    title: track.title,
    artist: track.artist,
    subTitle: track.album ?? '',
    albumTitle: track.album ?? '',
    albumArtist: track.artist,
    genres: track.genre ?? '',
    contentType: track.genre === 'video' ? 'video' : 'music',
  };
}

function buildThumbnailEvent(track: MockTrack, thumbUri: string): ThumbnailEvent {
  return {
    thumbnail: thumbUri,
    primaryColor: track.primaryColor ?? '#000000',
    secondaryColor: track.secondaryColor ?? '#000000',
    tertiaryColor: track.tertiaryColor ?? '#000000',
    textColor: track.textColor ?? '#FFFFFF',
    highContrastColor: track.highContrastColor ?? '#FFFFFF',
  };
}

export function createMediaMock(
  tracks: MockTrack[],
  state: InternalState
): MediaMockController {
  const effectiveTracks =
    tracks.length > 0 ? tracks : BUILTIN_TRACKS.map(attachThumbnail);

  // ---- 状态 ----
  let currentIndex = 0;
  let pbState: PlaybackState = 'stopped';
  let position = 0;
  let duration = effectiveTracks[0]?.duration ?? 240;
  let customTrack: Partial<MockTrack> | null = null;
  let timelineTimer: ReturnType<typeof setInterval> | null = null;

  // ---- 监听器注册 ----
  const registeredListeners = new Map<RegisterFn, Set<(event: MediaEvent) => void>>();
  const patches: WindowPatch[] = [];

  function invokeMediaListeners(name: RegisterFn, event: MediaEvent): void {
    const listeners = registeredListeners.get(name);
    if (!listeners) return;
    for (const fn of listeners) {
      try {
        fn(event);
      } catch (e) {
        console.warn(`[WE Dev Kit] ${name} listener error:`, e);
      }
    }
  }

  function patchRegisterFunction(name: RegisterFn): WindowPatch {
    const w = window as unknown as Record<string, unknown>;
    const original = w[name];
    w[name] = (callback: unknown) => {
      if (typeof callback === 'function') {
        if (!registeredListeners.has(name)) {
          registeredListeners.set(name, new Set());
        }
        registeredListeners.get(name)!.add(callback as (event: MediaEvent) => void);

        if (name === 'wallpaperRegisterMediaStatusListener') {
          setTimeout(() => {
            try {
              (callback as (event: { enabled: boolean }) => void)({ enabled: true });
            } catch {
              /* ignore */
            }
          }, 100);
        }
      }
      if (typeof original === 'function') {
        (original as (cb: unknown) => void)(callback);
      }
    };
    return {
      restore: () => {
        if (typeof original === 'undefined') {
          delete w[name];
        } else {
          w[name] = original;
        }
      },
    };
  }

  // ---- 事件推送辅助 ----

  function getCurrentTrack(): MockTrack {
    const base = effectiveTracks[currentIndex] ?? effectiveTracks[0]!;
    if (!customTrack) return base;
    return { ...base, ...customTrack };
  }

  function pushPropertiesAndThumbnail(): void {
    const track = getCurrentTrack();
    const thumbUri = customTrack?.thumbnail ?? track.thumbnail ?? '';
    invokeMediaListeners('wallpaperRegisterMediaPropertiesListener', buildPropertiesEvent(track));
    invokeMediaListeners('wallpaperRegisterMediaThumbnailListener', buildThumbnailEvent(track, thumbUri));
  }

  function pushTimeline(): void {
    invokeMediaListeners('wallpaperRegisterMediaTimelineListener', { position, duration });
  }

  function pushTrackSwitch(): void {
    pushPropertiesAndThumbnail();
    position = 0;
    duration = getCurrentTrack().duration ?? 240;
    pushTimeline();
  }

  function pushInitialPlay(): void {
    pushPropertiesAndThumbnail();
    invokeMediaListeners('wallpaperRegisterMediaPlaybackListener', { state: PLAYBACK_STOPPED });
    pbState = 'playing';
    invokeMediaListeners('wallpaperRegisterMediaPlaybackListener', { state: PLAYBACK_PLAYING });
    position = 0;
    duration = getCurrentTrack().duration ?? 240;
    pushTimeline();
  }

  // ---- Timeline 自动推进 ----

  function stopTimeline(): void {
    if (timelineTimer !== null) {
      clearInterval(timelineTimer);
      timelineTimer = null;
    }
  }

  function startTimeline(): void {
    stopTimeline();
    timelineTimer = setInterval(() => {
      if (pbState !== 'playing') return;
      position += 0.1;
      if (position >= duration) {
        autoAdvance();
        return;
      }
      pushTimeline();
    }, 100);
  }

  function autoAdvance(): void {
    const next = (currentIndex + 1) % effectiveTracks.length;
    currentIndex = next;
    customTrack = null;
    duration = effectiveTracks[currentIndex]?.duration ?? 240;
    position = 0;
    const track = getCurrentTrack();
    invokeMediaListeners('wallpaperRegisterMediaPropertiesListener', buildPropertiesEvent(track));
    invokeMediaListeners('wallpaperRegisterMediaThumbnailListener', buildThumbnailEvent(track, track.thumbnail ?? ''));
    pushTimeline();
    startTimeline();
  }

  // ---- 安装 ----

  (window as unknown as { wallpaperMediaIntegration?: object }).wallpaperMediaIntegration = {
    PLAYBACK_PLAYING,
    PLAYBACK_PAUSED,
    PLAYBACK_STOPPED,
  };

  for (const fn of REGISTER_FNS) {
    patches.push(patchRegisterFunction(fn));
  }

  setTimeout(() => {
    pushInitialPlay();
    startTimeline();
  }, 1500);

  state.onDestroy(() => {
    if (pbState !== 'stopped') {
      invokeMediaListeners('wallpaperRegisterMediaPlaybackListener', { state: PLAYBACK_STOPPED });
    }
    pbState = 'stopped';
    stopTimeline();
    registeredListeners.clear();
    for (const p of patches) p.restore();
    try {
      delete (window as unknown as Record<string, unknown>).wallpaperMediaIntegration;
    } catch {
      /* ignore */
    }
  });

  console.log(`[WE Dev Kit] MediaMock installed (${effectiveTracks.length} tracks)`);

  // ---- 公开 API ----

  function play(): void {
    if (pbState === 'paused') {
      pbState = 'playing';
      invokeMediaListeners('wallpaperRegisterMediaPlaybackListener', { state: PLAYBACK_PLAYING });
      startTimeline();
    } else if (pbState === 'stopped') {
      pushInitialPlay();
      startTimeline();
    }
  }

  function pause(): void {
    if (pbState === 'playing') {
      pbState = 'paused';
      invokeMediaListeners('wallpaperRegisterMediaPlaybackListener', { state: PLAYBACK_PAUSED });
    }
  }

  function stop(): void {
    if (pbState === 'stopped') return;
    pbState = 'stopped';
    invokeMediaListeners('wallpaperRegisterMediaPlaybackListener', { state: PLAYBACK_STOPPED });
    stopTimeline();
    position = 0;
    pushTimeline();
  }

  function switchTrack(newIndex: number): void {
    currentIndex = newIndex;
    customTrack = null;
    duration = effectiveTracks[currentIndex]?.duration ?? 240;
    position = 0;
    if (pbState === 'playing') {
      pushTrackSwitch();
      startTimeline();
    } else if (pbState === 'paused') {
      pushTrackSwitch();
    } else {
      pushTrackSwitch();
    }
  }

  function nextTrack(): void {
    switchTrack((currentIndex + 1) % effectiveTracks.length);
  }

  function prevTrack(): void {
    switchTrack((currentIndex - 1 + effectiveTracks.length) % effectiveTracks.length);
  }

  function setTrack(index: number): void {
    if (index >= 0 && index < effectiveTracks.length) {
      switchTrack(index);
    }
  }

  function setCustomTrack(track: Partial<MockTrack>): void {
    customTrack = { ...(customTrack ?? {}), ...track };
    if (pbState === 'stopped') return;
    const merged = getCurrentTrack();
    const thumbUri = customTrack.thumbnail ?? merged.thumbnail ?? '';
    invokeMediaListeners('wallpaperRegisterMediaPropertiesListener', buildPropertiesEvent(merged));
    invokeMediaListeners('wallpaperRegisterMediaThumbnailListener', buildThumbnailEvent(merged, thumbUri));
  }

  function setCustomThumbnail(dataUri: string): void {
    customTrack = { ...(customTrack ?? {}), thumbnail: dataUri };
    extractColorsFromDataUri(dataUri).then((colors) => {
      if (colors) {
        customTrack = { ...(customTrack ?? {}), ...colors };
      }
      if (pbState === 'stopped') return;
      const merged = getCurrentTrack();
      invokeMediaListeners('wallpaperRegisterMediaThumbnailListener', buildThumbnailEvent(merged, dataUri));
    });
  }

  function seek(pct: number): void {
    const dur = effectiveTracks[currentIndex]?.duration ?? 240;
    position = (dur * pct) / 100;
    if (pbState === 'playing' || pbState === 'paused') {
      pushTimeline();
    }
  }

  return {
    play,
    pause,
    stop,
    nextTrack,
    prevTrack,
    setTrack,
    setCustomTrack,
    setCustomThumbnail,
    seek,
    getPosition: () => position,
    getCurrentTrack,
    get currentIndex() {
      return currentIndex;
    },
    get playbackState() {
      return pbState;
    },
    get tracks() {
      return effectiveTracks;
    },
  };
}

function attachThumbnail(track: MockTrack): MockTrack {
  if (track.thumbnail) return track;
  return {
    ...track,
    thumbnail: generateThumbnailSvg({
      primary: track.primaryColor ?? '#000000',
      secondary: track.secondaryColor ?? '#000000',
      tertiary: track.tertiaryColor ?? '#000000',
    }),
  };
}