/**
 * 生命周期事件模拟模块
 *
 * 模拟 WE 的以下行为：
 *   1. 从 project.json 读取属性默认值，首次推送（模拟 WE 启动）
 *   2. 模拟 setPaused / setResume（含 JS 逻辑暂停）
 *   3. 模拟 FPS 变化 → applyGeneralProperties
 *
 * 注意：所有副作用（定时器劫持、CSS 注入、initTimer）都延迟到
 * install() 调用时才执行，避免在模块 import 时污染宿主 window。
 */

import type { InternalState, LifecycleMockController } from './types';

const PAUSE_STYLE_ID = '__we_pause_animation';
const PAUSE_INLINE_MARKER = '__we_paused_inline';
const LIFECYCLE_PAUSED_FLAG = '__weLifecyclePaused';

type AnyWindow = Window & {
  requestAnimationFrame: (cb: FrameRequestCallback) => number;
  cancelAnimationFrame: (id: number) => void;
  setTimeout: (cb: (...args: unknown[]) => void, delay?: number, ...args: unknown[]) => number;
  clearTimeout: (id: number) => void;
  setInterval: (cb: (...args: unknown[]) => void, delay?: number, ...args: unknown[]) => number;
  clearInterval: (id: number) => void;
};

interface TimerQueueItem {
  id: number;
  cb: (...args: unknown[]) => void;
  delay: number;
}

interface RafQueueItem {
  id: number;
  cb: FrameRequestCallback;
}

interface JsTimerHooks {
  pause: () => void;
  resume: () => void;
  /** 恢复 window 上的原始定时器函数（仅 destroy 时调用） */
  restore: () => void;
  installed: boolean;
}

/**
 * 安装全局定时器劫持（仅一次）。
 * 后续通过 pause()/resume() 控制是否拦截。
 */
function installJsTimerHooks(): JsTimerHooks {
  const w = window as unknown as AnyWindow;
  const origRaf = w.requestAnimationFrame.bind(window);
  const origSetTimeout = w.setTimeout.bind(window);
  const origClearTimeout = w.clearTimeout.bind(window);
  const origSetInterval = w.setInterval.bind(window);
  const origClearInterval = w.clearInterval.bind(window);
  const origCancelRaf = w.cancelAnimationFrame.bind(window);

  let jsPaused = false;
  const pausedRaf: RafQueueItem[] = [];
  const pausedTimeouts: TimerQueueItem[] = [];
  const pausedIntervals: TimerQueueItem[] = [];
  let rafCounter = 0;
  let timerCounter = 0;

  w.requestAnimationFrame = (cb: FrameRequestCallback): number => {
    if (jsPaused) {
      const id = --rafCounter;
      pausedRaf.push({ id, cb });
      return id;
    }
    return origRaf(cb);
  };
  w.cancelAnimationFrame = (id: number): void => {
    if (jsPaused) {
      const idx = pausedRaf.findIndex((q) => q.id === id);
      if (idx >= 0) pausedRaf.splice(idx, 1);
      return;
    }
    origCancelRaf(id);
  };

  w.setTimeout = (cb: (...args: unknown[]) => void, delay?: number): number => {
    if (jsPaused) {
      const id = --timerCounter;
      pausedTimeouts.push({ id, cb, delay: delay ?? 0 });
      return id;
    }
    return origSetTimeout(cb, delay);
  };
  w.clearTimeout = (id: number): void => {
    if (jsPaused) {
      const idx = pausedTimeouts.findIndex((q) => q.id === id);
      if (idx >= 0) pausedTimeouts.splice(idx, 1);
      return;
    }
    origClearTimeout(id);
  };

  w.setInterval = (cb: (...args: unknown[]) => void, delay?: number): number => {
    if (jsPaused) {
      const id = --timerCounter;
      pausedIntervals.push({ id, cb, delay: delay ?? 0 });
      return id;
    }
    return origSetInterval(cb, delay);
  };
  w.clearInterval = (id: number): void => {
    if (jsPaused) {
      const idx = pausedIntervals.findIndex((q) => q.id === id);
      if (idx >= 0) pausedIntervals.splice(idx, 1);
      return;
    }
    origClearInterval(id);
  };

  return {
    pause(): void {
      jsPaused = true;
      (window as unknown as Record<string, unknown>)[LIFECYCLE_PAUSED_FLAG] = true;
    },
    resume(): void {
      jsPaused = false;
      (window as unknown as Record<string, unknown>)[LIFECYCLE_PAUSED_FLAG] = false;
      const rafQueue = pausedRaf.splice(0, pausedRaf.length);
      for (const item of rafQueue) origRaf(item.cb);
      const toQueue = pausedTimeouts.splice(0, pausedTimeouts.length);
      for (const item of toQueue) origSetTimeout(item.cb, item.delay);
      const ivQueue = pausedIntervals.splice(0, pausedIntervals.length);
      for (const item of ivQueue) origSetInterval(item.cb, item.delay);
    },
    /** 恢复 window 上的原始定时器函数（仅 destroy 时调用） */
    restore(): void {
      jsPaused = false;
      (window as unknown as Record<string, unknown>)[LIFECYCLE_PAUSED_FLAG] = false;
      w.requestAnimationFrame = origRaf;
      w.cancelAnimationFrame = origCancelRaf;
      w.setTimeout = origSetTimeout;
      w.clearTimeout = origClearTimeout;
      w.setInterval = origSetInterval;
      w.clearInterval = origClearInterval;
      pausedRaf.length = 0;
      pausedTimeouts.length = 0;
      pausedIntervals.length = 0;
    },
    installed: true,
  };
}

function isPauseable(el: Element): el is HTMLElement | SVGElement {
  return el instanceof HTMLElement || el instanceof SVGElement;
}

function applyPauseStyles(): HTMLStyleElement | null {
  document.documentElement.classList.add('wpxPausePseudoAnimationAll');

  let styleEl = document.getElementById(PAUSE_STYLE_ID) as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = PAUSE_STYLE_ID;
    styleEl.textContent = `.wpxPausePseudoAnimationAll * { animation-play-state: paused !important; }`;
    document.head.appendChild(styleEl);
  }

  for (const el of document.querySelectorAll('*')) {
    if (isPauseable(el)) {
      el.style.animationPlayState = 'paused';
      (el as unknown as Record<string, unknown>)[PAUSE_INLINE_MARKER] = true;
    }
  }

  return styleEl;
}

function removePauseStyles(styleEl?: HTMLStyleElement | null): void {
  document.documentElement.classList.remove('wpxPausePseudoAnimationAll');
  const el = styleEl ?? (document.getElementById(PAUSE_STYLE_ID) as HTMLStyleElement | null);
  if (el) el.remove();

  for (const el of document.querySelectorAll('*')) {
    const marker = (el as unknown as Record<string, unknown>)[PAUSE_INLINE_MARKER];
    if (marker && isPauseable(el)) {
      el.style.animationPlayState = '';
      delete (el as unknown as Record<string, unknown>)[PAUSE_INLINE_MARKER];
    }
  }
}

export function createLifecycleMock(state: InternalState): LifecycleMockController {
  let isPaused = false;
  let pauseStyleEl: HTMLStyleElement | null = null;

  // 立即安装定时器劫持（不依赖 lifecycle 是否启用）
  const hooks = installJsTimerHooks();

  // 800ms 后推送 project.json 默认值
  const initTimer = setTimeout(() => {
    const w = window as unknown as {
      wallpaperPropertyListener?: { applyUserProperties?: (props: Record<string, unknown>) => void };
      __weDevKitDefaults?: Record<string, unknown>;
    };
    const listener = w.wallpaperPropertyListener;
    if (!listener || typeof listener.applyUserProperties !== 'function') return;

    const properties = w.__weDevKitDefaults;
    if (properties && Object.keys(properties).length > 0) {
      listener.applyUserProperties(properties);
      console.log(`[WE Dev Kit] Lifecycle: pushed ${Object.keys(properties).length} defaults`);
    } else {
      listener.applyUserProperties({});
      console.log('[WE Dev Kit] Lifecycle: fallback empty push');
    }
  }, 800);

  state.onDestroy(() => {
    clearTimeout(initTimer);
    removePauseStyles(pauseStyleEl);
    hooks.restore();
    delete (window as unknown as Record<string, unknown>)[LIFECYCLE_PAUSED_FLAG];
  });

  console.log('[WE Dev Kit] LifecycleMock installed (JS timer hooks active)');

  return {
    simulatePause(): void {
      if (isPaused) return;
      isPaused = true;
      pauseStyleEl = applyPauseStyles();
      hooks.pause();
      const listener = (window as unknown as { wallpaperPropertyListener?: { setPaused?: (b: boolean) => void } })
        .wallpaperPropertyListener;
      if (listener && typeof listener.setPaused === 'function') {
        listener.setPaused(true);
      }
      console.log('[WE Dev Kit] Lifecycle: simulatePause (CSS + JS paused)');
    },

    simulateResume(): void {
      if (!isPaused) return;
      isPaused = false;
      removePauseStyles(pauseStyleEl);
      pauseStyleEl = null;
      hooks.resume();
      const listener = (window as unknown as { wallpaperPropertyListener?: { setPaused?: (b: boolean) => void } })
        .wallpaperPropertyListener;
      if (listener && typeof listener.setPaused === 'function') {
        listener.setPaused(false);
      }
      console.log('[WE Dev Kit] Lifecycle: simulateResume (JS resumed)');
    },

    simulateFpsChange(fps: number): void {
      const listener = (window as unknown as {
        wallpaperPropertyListener?: { applyGeneralProperties?: (p: { fps: number }) => void };
      }).wallpaperPropertyListener;
      if (listener && typeof listener.applyGeneralProperties === 'function') {
        listener.applyGeneralProperties({ fps });
        console.log(`[WE Dev Kit] Lifecycle: FPS changed to ${fps}`);
      }
    },

    get isPaused() {
      return isPaused;
    },
  };
}