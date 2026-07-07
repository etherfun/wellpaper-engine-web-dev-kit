/**
 * wallpaperPropertyListener 补齐模块
 *
 * 不替换已有的 applyUserProperties，仅补充 WE 中存在的以下方法：
 *   - applyGeneralProperties    — FPS 限制等全局设置
 *   - setPaused                 — 壁纸暂停/恢复
 *   - userDirectoryFilesAddedOrChanged — 文件目录变更
 *   - userDirectoryFilesRemoved — 文件删除
 *
 * 用 Object.defineProperty 的 setter 拦截后续赋值，
 * 项目替换 listener 时自动合并缺失方法。
 */

import { interceptWindowSetter } from './utils/windowPatching';
import type { InternalState } from './types';

const MOCK_METHODS = [
  'applyGeneralProperties',
  'setPaused',
  'userDirectoryFilesAddedOrChanged',
  'userDirectoryFilesRemoved',
] as const;

type MockMethodName = (typeof MOCK_METHODS)[number];
type MockListener = Record<MockMethodName, (...args: unknown[]) => void> & {
  __weDevKitMocked?: boolean;
};

function createDefaultSetPaused(): (...args: unknown[]) => void {
  return (isPaused: unknown) => {
    const paused = Boolean(isPaused);
    console.log(`[WE Dev Kit] setPaused(${paused})`);
    window.dispatchEvent(new CustomEvent('__we_paused_change', { detail: { paused } }));
  };
}

function createDefaultApplyGeneralProperties(): (...args: unknown[]) => void {
  return (properties: unknown) => {
    const props = properties as { fps?: number } | undefined;
    if (props?.fps !== undefined) {
      console.log(`[WE Dev Kit] applyGeneralProperties: fps=${props.fps}`);
    }
  };
}

function createDefaultFilesAddedOrChanged(): (...args: unknown[]) => void {
  return (propertyName: unknown, changedFiles: unknown) => {
    const files = Array.isArray(changedFiles) ? changedFiles : [];
    console.log(`[WE Dev Kit] userDirectoryFilesAddedOrChanged: ${String(propertyName)} (${files.length} files)`);
  };
}

function createDefaultFilesRemoved(): (...args: unknown[]) => void {
  return (propertyName: unknown, removedFiles: unknown) => {
    const files = Array.isArray(removedFiles) ? removedFiles : [];
    console.log(`[WE Dev Kit] userDirectoryFilesRemoved: ${String(propertyName)} (${files.length} files)`);
  };
}

const DEFAULT_IMPLS: Record<MockMethodName, () => (...args: unknown[]) => void> = {
  setPaused: createDefaultSetPaused,
  applyGeneralProperties: createDefaultApplyGeneralProperties,
  userDirectoryFilesAddedOrChanged: createDefaultFilesAddedOrChanged,
  userDirectoryFilesRemoved: createDefaultFilesRemoved,
};

function ensureMockMethods(obj: unknown): MockListener {
  const target = (obj && typeof obj === 'object' ? obj : {}) as MockListener;
  for (const methodName of MOCK_METHODS) {
    if (typeof target[methodName] !== 'function') {
      target[methodName] = DEFAULT_IMPLS[methodName]();
    }
  }
  target.__weDevKitMocked = true;
  return target;
}

export function installPropertyMock(state: InternalState): { patch: { restore: () => void } } {
  const patch = interceptWindowSetter<MockListener>('wallpaperPropertyListener', ensureMockMethods);
  state.onDestroy(() => patch.restore());
  console.log('[WE Dev Kit] propertyMock installed (v2 — persistent patch)');
  return { patch };
}