/**
 * wallpaperPropertyListener 补齐模块
 *
 * 不替换已有的 applyUserProperties，仅补充 WE 中存在的以下方法：
 *   - applyGeneralProperties    — FPS 限制等全局设置
 *   - setPaused                 — 壁纸暂停/恢复
 *   - userDirectoryFilesAddedOrChanged — 文件目录变更
 *   - userDirectoryFilesRemoved — 文件删除
 *
 * 与 useWallpaperProperties / 三层回退完全兼容。
 */

import type { InternalState } from './types';

/**
 * 补齐 window.wallpaperPropertyListener 中缺失的方法。
 * 保留原有 applyUserProperties 不动。
 */
export function installPropertyMock(state: InternalState): void {
  const w = window as any;
  const existing = w.wallpaperPropertyListener || {};

  const patched = {
    ...existing,

    // ---- applyGeneralProperties ----
    applyGeneralProperties:
      existing.applyGeneralProperties && existing.applyGeneralProperties !== noop
        ? existing.applyGeneralProperties
        : function (properties: Record<string, any>) {
            if (properties.fps !== undefined) {
              console.log(`[WE Dev Kit] applyGeneralProperties: fps=${properties.fps}`);
            }
          },

    // ---- setPaused ----
    setPaused:
      typeof existing.setPaused === 'function'
        ? existing.setPaused
        : function (isPaused: boolean) {
            console.log(`[WE Dev Kit] setPaused(${isPaused})`);
            // 触发现有的暂停相关处理
            const evt = new CustomEvent('__we_paused_change', {
              detail: { paused: isPaused },
            });
            window.dispatchEvent(evt);
          },

    // ---- userDirectoryFilesAddedOrChanged ----
    userDirectoryFilesAddedOrChanged:
      typeof existing.userDirectoryFilesAddedOrChanged === 'function'
        ? existing.userDirectoryFilesAddedOrChanged
        : function (propertyName: string, changedFiles: string[]) {
            console.log(
              `[WE Dev Kit] userDirectoryFilesAddedOrChanged: ${propertyName} (${changedFiles.length} files)`
            );
          },

    // ---- userDirectoryFilesRemoved ----
    userDirectoryFilesRemoved:
      typeof existing.userDirectoryFilesRemoved === 'function'
        ? existing.userDirectoryFilesRemoved
        : function (propertyName: string, removedFiles: string[]) {
            console.log(
              `[WE Dev Kit] userDirectoryFilesRemoved: ${propertyName} (${removedFiles.length} files)`
            );
          },
  };

  // 标记为已由 we-dev-kit 处理（供 environment.ts 检测）
  (patched as any).__weDevKitMocked = true;

  w.wallpaperPropertyListener = patched;
  state.onDestroy(() => {
    // 恢复原始 listener（如果有）
    if (existing && existing !== patched) {
      w.wallpaperPropertyListener = existing;
    } else {
      delete w.wallpaperPropertyListener;
    }
  });

  console.log('[WE Dev Kit] propertyMock installed');
}

function noop() {}
