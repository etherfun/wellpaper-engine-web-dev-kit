/**
 * wallpaperPropertyListener 补齐模块
 *
 * 不替换已有的 applyUserProperties，仅补充 WE 中存在的以下方法：
 *   - applyGeneralProperties    — FPS 限制等全局设置
 *   - setPaused                 — 壁纸暂停/恢复
 *   - userDirectoryFilesAddedOrChanged — 文件目录变更
 *   - userDirectoryFilesRemoved — 文件删除
 *
 * v2: 改用 Object.defineProperty 的 setter，当项目代码后续整个替换
 *     wallpaperPropertyListener 对象时自动补齐缺失方法。
 */

import type { InternalState } from './types';

const MOCK_METHODS = [
  'applyGeneralProperties',
  'setPaused',
  'userDirectoryFilesAddedOrChanged',
  'userDirectoryFilesRemoved',
] as const;

/** 创建 setPaused 默认实现（触发自定义事件） */
function createDefaultSetPaused() {
  return function (isPaused: boolean) {
    console.log(`[WE Dev Kit] setPaused(${isPaused})`);
    const evt = new CustomEvent('__we_paused_change', {
      detail: { paused: isPaused },
    });
    window.dispatchEvent(evt);
  };
}

/** 创建 applyGeneralProperties 默认实现 */
function createDefaultApplyGeneralProperties() {
  return function (properties: Record<string, any>) {
    if (properties.fps !== undefined) {
      console.log(`[WE Dev Kit] applyGeneralProperties: fps=${properties.fps}`);
    }
  };
}

/** 创建 userDirectoryFilesAddedOrChanged 默认实现 */
function createDefaultFilesAddedOrChanged() {
  return function (propertyName: string, changedFiles: string[]) {
    console.log(
      `[WE Dev Kit] userDirectoryFilesAddedOrChanged: ${propertyName} (${changedFiles.length} files)`
    );
  };
}

/** 创建 userDirectoryFilesRemoved 默认实现 */
function createDefaultFilesRemoved() {
  return function (propertyName: string, removedFiles: string[]) {
    console.log(
      `[WE Dev Kit] userDirectoryFilesRemoved: ${propertyName} (${removedFiles.length} files)`
    );
  };
}

type MockMethodName = (typeof MOCK_METHODS)[number];

const DEFAULT_IMPLS: Record<MockMethodName, () => (...args: any[]) => void> = {
  setPaused: createDefaultSetPaused,
  applyGeneralProperties: createDefaultApplyGeneralProperties,
  userDirectoryFilesAddedOrChanged: createDefaultFilesAddedOrChanged,
  userDirectoryFilesRemoved: createDefaultFilesRemoved,
};

/** 确保 listener 对象包含所有 mock 方法，保留项目已有的实现 */
function ensureMockMethods(obj: any): void {
  for (const methodName of MOCK_METHODS) {
    if (typeof obj[methodName] !== 'function') {
      obj[methodName] = DEFAULT_IMPLS[methodName]();
    }
  }
  (obj as any).__weDevKitMocked = true;
}

/**
 * 补齐 window.wallpaperPropertyListener 中缺失的方法。
 * 使用 Object.defineProperty 的 setter 拦截项目后续的全部替换操作，
 * 确保 setPaused / applyGeneralProperties 等方法始终存在。
 */
export function installPropertyMock(state: InternalState): void {
  const w = window as any;
  const initial = w.wallpaperPropertyListener || {};

  // 首次补齐
  ensureMockMethods(initial);
  let _stored = initial;

  // 用 setter 拦截后续赋值
  Object.defineProperty(w, 'wallpaperPropertyListener', {
    get() {
      return _stored;
    },
    set(val: any) {
      if (val && val !== _stored) {
        // 复制项目的新方法（如 applyUserProperties），再补齐缺失方法
        const merged: any = { ...val };
        ensureMockMethods(merged);
        _stored = merged;
        console.log('[WE Dev Kit] propertyMock: project replaced listener, auto-patched setPaused');
      } else if (val) {
        _stored = val;
      }
    },
    configurable: true,
    enumerable: true,
  });

  state.onDestroy(() => {
    try {
      delete w.wallpaperPropertyListener;
    } catch {}
  });

  console.log('[WE Dev Kit] propertyMock installed (v2 — persistent patch)');
}
