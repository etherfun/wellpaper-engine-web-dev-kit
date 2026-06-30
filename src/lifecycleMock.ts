/**
 * 生命周期事件模拟模块
 *
 * 模拟 WE 的以下行为：
 *   1. 从 project.json 读取属性默认值，首次推送（模拟 WE 启动）
 *   2. 模拟 setPaused / setResume
 *   3. 模拟 FPS 变化 → applyGeneralProperties
 */

import type { InternalState } from './types';

export function createLifecycleMock(state: InternalState) {
  let isPaused = false;

  function install() {
    const w = window as any;

    // 1. 从 window.__weDevKitDefaults（build-dev.mjs 注入）或 project.json 加载默认值
    const initTimer = setTimeout(() => {
      const listener = w.wallpaperPropertyListener;
      if (!listener || typeof listener.applyUserProperties !== 'function') return;

      // 优先使用 build-dev.mjs 注入的 window.__weDevKitDefaults
      //（避免 file:// 协议下 fetch 不可用的问题）
      let properties = w.__weDevKitDefaults;

      if (properties && Object.keys(properties).length > 0) {
        listener.applyUserProperties(properties);
        console.log(
          `[WE Dev Kit] Lifecycle: pushed ${Object.keys(properties).length} defaults`
        );
      } else {
        // 兜底：推空对象
        listener.applyUserProperties({});
        console.log('[WE Dev Kit] Lifecycle: fallback empty push');
      }
    }, 800);

    state.onDestroy(() => {
      clearTimeout(initTimer);
    });

    console.log('[WE Dev Kit] LifecycleMock installed');
  }

  install();

  return {
    /** 模拟 WE 暂停壁纸 */
    simulatePause() {
      if (isPaused) return;
      isPaused = true;
      const listener = (window as any).wallpaperPropertyListener;
      if (listener && typeof listener.setPaused === 'function') {
        listener.setPaused(true);
      }
      console.log('[WE Dev Kit] Lifecycle: simulatePause');
    },

    /** 模拟 WE 恢复壁纸 */
    simulateResume() {
      if (!isPaused) return;
      isPaused = false;
      const listener = (window as any).wallpaperPropertyListener;
      if (listener && typeof listener.setPaused === 'function') {
        listener.setPaused(false);
      }
      console.log('[WE Dev Kit] Lifecycle: simulateResume');
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
