/**
 * 媒体集成模拟模块
 *
 * 完整模拟 WE Media Integration 全部 4 个 listener + 常量：
 *   - wallpaperRegisterMediaStatusListener
 *   - wallpaperRegisterMediaPropertiesListener
 *   - wallpaperRegisterMediaThumbnailListener
 *   - wallpaperRegisterMediaPlaybackListener
 *   - wallpaperRegisterMediaTimelineListener
 *   - wallpaperMediaIntegration.PLAYBACK_* 常量
 *
 * 预置 5 首曲库 + 自定义曲目支持 + 封面图片上传。
 */

import type { InternalState, MockTrack, PlaybackState } from './types';

// ---- 内嵌封面生成辅助 ----

/**
 * 生成纯色渐变的 Base64 SVG data URI（作为占位封面）。
 * 不同曲目使用不同调色板，方便视觉区分。
 */
function generateThumbnailSvg(colors: {
  primary: string;
  secondary: string;
  tertiary: string;
}): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${colors.primary}"/>
        <stop offset="100%" style="stop-color:${colors.secondary}"/>
      </linearGradient>
    </defs>
    <rect width="300" height="300" fill="url(#bg)"/>
    <circle cx="150" cy="150" r="80" fill="${colors.tertiary}" opacity="0.3"/>
    <circle cx="150" cy="150" r="40" fill="${colors.primary}" opacity="0.2"/>
  </svg>`;

  return 'data:image/svg+xml;base64,' + btoa(svg);
}

// ---- 预置曲库 ----

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

// 补充封面 SVG
for (const track of BUILTIN_TRACKS) {
  if (!track.thumbnail) {
    track.thumbnail = generateThumbnailSvg({
      primary: track.primaryColor!,
      secondary: track.secondaryColor!,
      tertiary: track.tertiaryColor!,
    });
  }
}

// ---- WE Media Integration 常量 ----

const PLAYBACK_PLAYING = 0;
const PLAYBACK_PAUSED = 1;
const PLAYBACK_STOPPED = 2;

// ---- 媒体模拟器 ----

export function createMediaMock(
  tracks: MockTrack[],
  state: InternalState
) {
  const effectiveTracks = tracks.length > 0 ? tracks : BUILTIN_TRACKS;
  let currentIndex = 0;
  let pbState: PlaybackState = 'stopped';
  let position = 0;
  let duration = effectiveTracks[0]?.duration ?? 240;
  let customTrack: Partial<MockTrack> | null = null;
  let timelineTimer: ReturnType<typeof setInterval> | null = null;

  // ---- 获取当前曲目（合并自定义覆盖） ----

  function getCurrentTrack(): MockTrack {
    const base = effectiveTracks[currentIndex] || effectiveTracks[0];
    if (!customTrack) return base;
    return { ...base, ...customTrack };
  }

  // ---- 推送事件 ----

  /** 切换曲目时：只更新元数据和缩略图，不改变播放状态。真实 WE 切曲不发 STOPPED。 */
  function pushTrackSwitch() {
    const track = getCurrentTrack();
    const thumbUri = customTrack?.thumbnail || track.thumbnail || '';

    // MediaPropertiesEvent
    const propEvent = {
      title: track.title,
      artist: track.artist,
      subTitle: track.album || '',
      albumTitle: track.album || '',
      albumArtist: track.artist,
      genres: track.genre || '',
      contentType: track.genre === 'video' ? 'video' : 'music',
    };
    invokeMediaListeners('wallpaperRegisterMediaPropertiesListener', propEvent);

    // MediaThumbnailEvent
    const thumbEvent = {
      thumbnail: thumbUri,
      primaryColor: track.primaryColor || '#000000',
      secondaryColor: track.secondaryColor || '#000000',
      tertiaryColor: track.tertiaryColor || '#000000',
      textColor: track.textColor || '#FFFFFF',
      highContrastColor: track.highContrastColor || '#FFFFFF',
    };
    invokeMediaListeners('wallpaperRegisterMediaThumbnailListener', thumbEvent);

    // 不发送 STOPPED→PLAYING，播放状态保持不变
    // 重置进度
    position = 0;
    duration = track.duration || 240;
    pushTimeline();
  }

  /** 首次加载/停止后播放：先 STOPPED 再 PLAYING */
  function pushInitialPlay() {
    const track = getCurrentTrack();
    const thumbUri = customTrack?.thumbnail || track.thumbnail || '';

    const propEvent = {
      title: track.title,
      artist: track.artist,
      subTitle: track.album || '',
      albumTitle: track.album || '',
      albumArtist: track.artist,
      genres: track.genre || '',
      contentType: track.genre === 'video' ? 'video' : 'music',
    };
    invokeMediaListeners('wallpaperRegisterMediaPropertiesListener', propEvent);

    const thumbEvent = {
      thumbnail: thumbUri,
      primaryColor: track.primaryColor || '#000000',
      secondaryColor: track.secondaryColor || '#000000',
      tertiaryColor: track.tertiaryColor || '#000000',
      textColor: track.textColor || '#FFFFFF',
      highContrastColor: track.highContrastColor || '#FFFFFF',
    };
    invokeMediaListeners('wallpaperRegisterMediaThumbnailListener', thumbEvent);

    // 从停止到播放：发 STOPPED→PLAYING
    invokeMediaListeners('wallpaperRegisterMediaPlaybackListener', { state: PLAYBACK_STOPPED });
    pbState = 'playing';
    invokeMediaListeners('wallpaperRegisterMediaPlaybackListener', { state: PLAYBACK_PLAYING });

    position = 0;
    duration = track.duration || 240;
    pushTimeline();
  }

  function pushTimeline() {
    invokeMediaListeners('wallpaperRegisterMediaTimelineListener', {
      position,
      duration,
    });
  }

  function invokeMediaListeners(registerFnName: string, event: any) {
    // 通过注册时保存的回调来调用
    const listeners = registeredListeners.get(registerFnName);
    if (listeners) {
      for (const fn of listeners) {
        try {
          fn(event);
        } catch (e) {
          console.warn(`[WE Dev Kit] ${registerFnName} listener error:`, e);
        }
      }
    }
  }

  // ---- 注册监听器保存 ----

  const registeredListeners = new Map<string, Set<Function>>();

  function patchRegisterFunction(fnName: string) {
    const original = (window as any)[fnName];
    (window as any)[fnName] = (callback: Function) => {
      if (!registeredListeners.has(fnName)) {
        registeredListeners.set(fnName, new Set());
      }
      registeredListeners.get(fnName)!.add(callback);
      // 如果是 MediaStatusListener，立即推 enabled = true
      if (fnName === 'wallpaperRegisterMediaStatusListener') {
        setTimeout(() => {
          try { callback({ enabled: true }); } catch (_) {}
        }, 100);
      }
      // 保留原始调用方式（如果有）
      if (original) original(callback);
    };
  }

  // ---- 启动/停止 ----

  function startTimeline() {
    stopTimeline();
    timelineTimer = setInterval(() => {
      if (pbState === 'playing') {
        position += 0.1;
        if (position >= duration) {
          // 当前曲目播放完毕 → 自然过渡到下一首
          stopTimeline();
          autoAdvance();
          return;
        }
        pushTimeline();
      }
    }, 100);
  }

  function stopTimeline() {
    if (timelineTimer !== null) {
      clearInterval(timelineTimer);
      timelineTimer = null;
    }
  }

  /** 自动切曲：曲目播完时自然过渡，只更新元数据，不改变播放状态（不发 STOPPED） */
  function autoAdvance() {
    const next = (currentIndex + 1) % effectiveTracks.length;
    currentIndex = next;
    customTrack = null;
    duration = effectiveTracks[currentIndex]?.duration ?? 240;
    position = 0;

    // 只推送新曲目的元数据和缩略图，播放状态保持 PLAYING
    const track = getCurrentTrack();
    invokeMediaListeners('wallpaperRegisterMediaPropertiesListener', {
      title: track.title,
      artist: track.artist,
      subTitle: track.album || '',
      albumTitle: track.album || '',
      albumArtist: track.artist,
      genres: track.genre || '',
      contentType: 'music',
    });
    invokeMediaListeners('wallpaperRegisterMediaThumbnailListener', {
      thumbnail: track.thumbnail || '',
      primaryColor: track.primaryColor || '#000000',
      secondaryColor: track.secondaryColor || '#000000',
      tertiaryColor: track.tertiaryColor || '#000000',
      textColor: track.textColor || '#FFFFFF',
      highContrastColor: track.highContrastColor || '#FFFFFF',
    });
    pushTimeline();
    startTimeline();
  }

  // ---- 公开 API ----

  function play() {
    if (pbState === 'paused') {
      pbState = 'playing';
      invokeMediaListeners('wallpaperRegisterMediaPlaybackListener', { state: PLAYBACK_PLAYING });
      startTimeline();
    } else if (pbState === 'stopped') {
      pushInitialPlay();
      startTimeline();
    }
  }

  function pause() {
    if (pbState === 'playing') {
      pbState = 'paused';
      invokeMediaListeners('wallpaperRegisterMediaPlaybackListener', { state: PLAYBACK_PAUSED });
    }
  }

  function stop() {
    if (pbState !== 'stopped') {
      pbState = 'stopped';
      invokeMediaListeners('wallpaperRegisterMediaPlaybackListener', { state: PLAYBACK_STOPPED });
      stopTimeline();
      position = 0;
      pushTimeline();
    }
  }

  /** 切曲：只更新元数据，不改变播放状态（不发 STOPPED，避免 UI 闪烁） */
  function switchTrack(newIndex: number) {
    currentIndex = newIndex;
    customTrack = null;
    duration = effectiveTracks[currentIndex]?.duration ?? 240;
    position = 0;

    if (pbState === 'playing') {
      pushTrackSwitch();
      position = 0;
      startTimeline();
    } else if (pbState === 'paused') {
      pushTrackSwitch();
      position = 0;
    } else {
      // stopped 状态：推送元数据和缩略图，但不改变播放状态
      pushTrackSwitch();
      position = 0;
      pushTimeline();
    }
  }

  function nextTrack() {
    const next = (currentIndex + 1) % effectiveTracks.length;
    switchTrack(next);
  }

  function prevTrack() {
    const prev = (currentIndex - 1 + effectiveTracks.length) % effectiveTracks.length;
    switchTrack(prev);
  }

  function setTrack(index: number) {
    if (index >= 0 && index < effectiveTracks.length) {
      switchTrack(index);
    }
  }

  function setCustomTrack(track: Partial<MockTrack>) {
    customTrack = { ...(customTrack || {}), ...track };
    // 重新推送元数据（不切换曲目）
    if (pbState !== 'stopped') {
      const merged = getCurrentTrack();
      const thumbUri = customTrack?.thumbnail || merged.thumbnail || '';
      invokeMediaListeners('wallpaperRegisterMediaPropertiesListener', {
        title: merged.title,
        artist: merged.artist,
        subTitle: merged.album || '',
        albumTitle: merged.album || '',
        albumArtist: merged.artist,
        genres: merged.genre || '',
        contentType: 'music',
      });
      if (thumbUri) {
        invokeMediaListeners('wallpaperRegisterMediaThumbnailListener', {
          thumbnail: thumbUri,
          primaryColor: merged.primaryColor || '#000000',
          secondaryColor: merged.secondaryColor || '#000000',
          tertiaryColor: merged.tertiaryColor || '#000000',
          textColor: merged.textColor || '#FFFFFF',
          highContrastColor: merged.highContrastColor || '#FFFFFF',
        });
      }
    }
  }

  function setCustomThumbnail(dataUri: string) {
    customTrack = { ...(customTrack || {}), thumbnail: dataUri };
    // 从图片提取简单主色
    extractColorsFromDataUri(dataUri).then((colors) => {
      if (colors) {
        customTrack = { ...customTrack, ...colors };
      }
      // 重新推送缩略图事件
      if (pbState !== 'stopped') {
        const merged = getCurrentTrack();
        invokeMediaListeners('wallpaperRegisterMediaThumbnailListener', {
          thumbnail: dataUri,
          primaryColor: colors?.primaryColor || merged.primaryColor || '#000000',
          secondaryColor: colors?.secondaryColor || merged.secondaryColor || '#000000',
          tertiaryColor: colors?.tertiaryColor || merged.tertiaryColor || '#000000',
          textColor: colors?.textColor || merged.textColor || '#FFFFFF',
          highContrastColor: colors?.highContrastColor || merged.highContrastColor || '#FFFFFF',
        });
      }
    });
  }

  /** 从 data URI 提取颜色（使用 canvas 平均分块法） */
  async function extractColorsFromDataUri(
    dataUri: string
  ): Promise<{
    primaryColor: string;
    secondaryColor: string;
    tertiaryColor: string;
    textColor: string;
  } | null> {
    try {
      const img = new Image();
      const loaded = new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Image load failed'));
      });
      img.src = dataUri;
      await loaded;

      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(img, 0, 0, 100, 100);

      const imageData = ctx.getImageData(0, 0, 100, 100);
      const pixels = imageData.data;

      // 分 4 块取平均颜色
      const quadSize = 50;
      const colors: string[] = [];
      for (let q = 0; q < 4; q++) {
        const startX = (q % 2) * quadSize;
        const startY = Math.floor(q / 2) * quadSize;
        let r = 0, g = 0, b = 0, count = 0;

        for (let y = startY; y < startY + quadSize; y++) {
          for (let x = startX; x < startX + quadSize; x++) {
            const idx = (y * 100 + x) * 4;
            r += pixels[idx] ?? 0;
            g += pixels[idx + 1] ?? 0;
            b += pixels[idx + 2] ?? 0;
            count++;
          }
        }

        if (count > 0) {
          colors.push(rgbToHex(Math.round(r / count), Math.round(g / count), Math.round(b / count)));
        }
      }

      if (colors.length >= 3) {
        return {
          primaryColor: colors[0]!,
          secondaryColor: colors[1]!,
          tertiaryColor: colors[2]!,
          textColor: luminance(colors[0]!) > 128 ? '#1A1A1A' : '#FFFFFF',
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  function rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('');
  }

  function luminance(hex: string): number {
    const c = hex.replace('#', '');
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    return 0.299 * r + 0.587 * g + 0.114 * b;
  }

  // ---- 安装 WE API ----

  function install() {
    // 设置常量
    (window as any).wallpaperMediaIntegration = {
      PLAYBACK_PLAYING,
      PLAYBACK_PAUSED,
      PLAYBACK_STOPPED,
    };

    // 修补 5 个注册函数
    const registerFns = [
      'wallpaperRegisterMediaStatusListener',
      'wallpaperRegisterMediaPropertiesListener',
      'wallpaperRegisterMediaThumbnailListener',
      'wallpaperRegisterMediaPlaybackListener',
      'wallpaperRegisterMediaTimelineListener',
    ];
    for (const fn of registerFns) {
      patchRegisterFunction(fn);
    }

    // 延迟首次推歌（从 stopped 到 playing）
    setTimeout(() => {
      pushInitialPlay();
      startTimeline();
    }, 1500);

    state.onDestroy(() => {
      stop();
      stopTimeline();
      registeredListeners.clear();
      for (const fn of registerFns) {
      }
      delete (window as any).wallpaperMediaIntegration;
    });

    console.log(`[WE Dev Kit] MediaMock installed (${effectiveTracks.length} tracks)`);
  }

  // ---- 附加 API（由面板调用） ----

  /** 进度条拖拽：按百分比 (0-100) 设置播放位置 */
  function seek(pct: number) {
    const dur = effectiveTracks[currentIndex]?.duration ?? 240;
    position = dur * pct / 100;
    if (pbState === 'playing' || pbState === 'paused') {
      pushTimeline();
    }
  }

  install();

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
    getCurrentTrack,
    /** 获取当前播放位置（秒） */
    getPosition: () => position,
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
