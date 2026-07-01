/**
 * 生命周期事件模拟模块
 *
 * 模拟 WE 的以下行为：
 *   1. 从 project.json 读取属性默认值，首次推送（模拟 WE 启动）
 *   2. 模拟 setPaused / setResume（含 JS 逻辑暂停）
 *   3. 模拟 FPS 变化 → applyGeneralProperties
 */

import type { InternalState } from './types';

// =============================================================
// 暂停 JS 逻辑 — 劫持 requestAnimationFrame / setInterval / setTimeout
// =============================================================

/** 原始的定时器函数 */
const _origRaf = window.requestAnimationFrame.bind(window);
const _origSetInterval = window.setInterval.bind(window);
const _origSetTimeout = window.setTimeout.bind(window);
const _origClearInterval = window.clearInterval.bind(window);
const _origClearTimeout = window.clearTimeout.bind(window);
const _origCancelRaf = window.cancelAnimationFrame.bind(window);

/** 暂停时积累的 RAF 回调队列 */
let _pausedRafQueue: Array<{ cb: FrameRequestCallback; id: number }> = [];
let _rafIdCounter = 0;

/** 暂停时积累的 setTimeout 回调 */
let _pausedTimeoutQueue: Array<{
  id: number;
  cb: (...args: any[]) => void;
  delay: number;
  elapsed: number;
}> = [];
let _timeoutIdCounter = 0;

/** 暂停时积累的 setInterval 回调 */
let _pausedIntervalQueue: Array<{
  id: number;
  cb: (...args: any[]) => void;
  delay: number;
  elapsed: number;
}> = [];
let _intervalIdCounter = 0;

/**
 * 安装劫持的定时器（仅在首次调用时执行一次）。
 * 此后通过 pauseJsTimers / resumeJsTimers 控制停/启。
 */
let _jsTimerHooked = false;
let _jsPaused = false;

function installJsTimerHooks(): void {
  if (_jsTimerHooked) return;
  _jsTimerHooked = true;

  const w = window as any;

  w.requestAnimationFrame = function (cb: FrameRequestCallback): number {
    if (_jsPaused) {
      const id = --_rafIdCounter;
      _pausedRafQueue.push({ cb, id });
      return id;
    }
    return _origRaf(cb);
  };

  w.cancelAnimationFrame = function (id: number) {
    if (_jsPaused) {
      _pausedRafQueue = _pausedRafQueue.filter(q => q.id !== id);
      return;
    }
    _origCancelRaf(id);
  };

  w.setTimeout = function (cb: (...args: any[]) => void, delay?: number, ...args: any[]): number {
    if (_jsPaused) {
      const id = --_timeoutIdCounter;
      _pausedTimeoutQueue.push({ id, cb, delay: delay ?? 0, elapsed: 0 });
      return id;
    }
    return _origSetTimeout(cb, delay, ...args);
  };

  w.clearTimeout = function (id: number) {
    if (_jsPaused) {
      _pausedTimeoutQueue = _pausedTimeoutQueue.filter(q => q.id !== id);
      return;
    }
    _origClearTimeout(id);
  };

  w.setInterval = function (cb: (...args: any[]) => void, delay?: number, ...args: any[]): number {
    if (_jsPaused) {
      const id = --_intervalIdCounter;
      _pausedIntervalQueue.push({ id, cb, delay: delay ?? 0, elapsed: 0 });
      return id;
    }
    return _origSetInterval(cb, delay, ...args);
  };

  w.clearInterval = function (id: number) {
    if (_jsPaused) {
      _pausedIntervalQueue = _pausedIntervalQueue.filter(q => q.id !== id);
      return;
    }
    _origClearInterval(id);
  };
}

function pauseJsTimers(): void {
  _jsPaused = true;
  // 暴露全局暂停标记供 dispatchAudioFrame 检查
  (window as any).__weLifecyclePaused = true;
}

function resumeJsTimers(): void {
  _jsPaused = false;
  (window as any).__weLifecyclePaused = false;

  // 放行积累的 RAF 回调
  const rafQueue = _pausedRafQueue;
  _pausedRafQueue = [];
  for (const item of rafQueue) {
    _origRaf(item.cb);
  }

  // 放行积累的 setTimeout
  const toQueue = _pausedTimeoutQueue;
  _pausedTimeoutQueue = [];
  for (const item of toQueue) {
    _origSetTimeout(item.cb, item.delay);
  }

  // 放行积累的 setInterval
  const ivQueue = _pausedIntervalQueue;
  _pausedIntervalQueue = [];
  for (const item of ivQueue) {
    _origSetInterval(item.cb, item.delay);
  }
}

// =============================================================
// CSS 暂停
// =============================================================

const PAUSE_STYLE_ID = '__we_pause_animation';
const PAUSE_INLINE_MARKER = '__we_paused_inline';

function isPauseable(el: Element): boolean {
  return el instanceof HTMLElement || el instanceof SVGElement;
}

function applyPauseStyles(): HTMLStyleElement | null {
  document.documentElement.classList.add('wpxPausePseudoAnimationAll');

  const existing = document.getElementById(PAUSE_STYLE_ID);
  if (!existing) {
    const style = document.createElement('style');
    style.id = PAUSE_STYLE_ID;
    style.textContent = `.wpxPausePseudoAnimationAll * { animation-play-state: paused !important; }`;
    document.head.appendChild(style);
  }

  const all = document.querySelectorAll('*');
  for (const el of all) {
    if (isPauseable(el)) {
      (el as HTMLElement).style.animationPlayState = 'paused';
      (el as any)[PAUSE_INLINE_MARKER] = true;
    }
  }

  return document.getElementById(PAUSE_STYLE_ID) as HTMLStyleElement | null;
}

function removePauseStyles(styleEl?: HTMLStyleElement | null): void {
  document.documentElement.classList.remove('wpxPausePseudoAnimationAll');

  const el = styleEl ?? document.getElementById(PAUSE_STYLE_ID);
  if (el) el.remove();

  const all = document.querySelectorAll('*');
  for (const el of all) {
    if ((el as any)[PAUSE_INLINE_MARKER]) {
      if (isPauseable(el)) {
        (el as HTMLElement).style.animationPlayState = '';
      }
      delete (el as any)[PAUSE_INLINE_MARKER];
    }
  }
}

export function createLifecycleMock(state: InternalState) {
  let isPaused = false;
  let pauseStyleEl: HTMLStyleElement | null = null;

  function install() {
    const w = window as any;

    // 安装 JS 定时器劫持（始终安装，停启用由 pauseJsTimers/resumeJsTimers 控制）
    installJsTimerHooks();

    // 1. 从 window.__weDevKitDefaults（build-dev.mjs 注入）或 project.json 加载默认值
    const initTimer = _origSetTimeout(() => {
      const listener = w.wallpaperPropertyListener;
      if (!listener || typeof listener.applyUserProperties !== 'function') return;

      let properties = w.__weDevKitDefaults;

      if (properties && Object.keys(properties).length > 0) {
        listener.applyUserProperties(properties);
        console.log(
          `[WE Dev Kit] Lifecycle: pushed ${Object.keys(properties).length} defaults`
        );
      } else {
        listener.applyUserProperties({});
        console.log('[WE Dev Kit] Lifecycle: fallback empty push');
      }
    }, 800);

    state.onDestroy(() => {
      _origClearTimeout(initTimer);
      removePauseStyles(pauseStyleEl);
      delete (window as any).__weLifecyclePaused;
    });

    console.log('[WE Dev Kit] LifecycleMock installed (JS timer hooks active)');
  }

  install();

  return {
    /** 模拟 WE 暂停壁纸 — 暂停 CSS + JS 全逻辑（RAF / setTimeout / setInterval） */
    simulatePause() {
      if (isPaused) return;
      isPaused = true;

      // Task 0-1: 暂停 CSS 注入 + 全元素内联暂停
      pauseStyleEl = applyPauseStyles();

      // 暂停 JS 逻辑：后续 RAF / setTimeout / setInterval 将被拦截不再执行
      pauseJsTimers();

      const listener = (window as any).wallpaperPropertyListener;
      if (listener && typeof listener.setPaused === 'function') {
        listener.setPaused(true);
      }
      console.log('[WE Dev Kit] Lifecycle: simulatePause (CSS + JS paused)');
    },

    /** 模拟 WE 恢复壁纸 — 清理暂停样式 + 恢复 JS 逻辑 */
    simulateResume() {
      if (!isPaused) return;
      isPaused = false;

      // Task 0-1: 清理暂停样式
      removePauseStyles(pauseStyleEl);
      pauseStyleEl = null;

      // 恢复 JS 逻辑：放行积累的 RAF / setTimeout / setInterval
      resumeJsTimers();

      const listener = (window as any).wallpaperPropertyListener;
      if (listener && typeof listener.setPaused === 'function') {
        listener.setPaused(false);
      }
      console.log('[WE Dev Kit] Lifecycle: simulateResume (JS resumed)');
    },

    /** 模拟 FPS 限制变化 */
    simulateFpsChange(fps: number) {
      const listener = (window as any).wallpaperPropertyListener;
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
