/**
 * 通用 window 注入/还原工具。
 *
 * 模块安装时用 defineProperty 或直接赋值；destroy 时还原原始值或 delete。
 */

export interface WindowPatch {
  /** 还原函数：destroy 时调用 */
  restore: () => void;
}

/** 修补 window[key]：记录原值并允许还原 */
export function patchWindow<T>(key: string, value: T): WindowPatch {
  const w = window as unknown as Record<string, unknown>;
  const original = w[key];
  w[key] = value;
  return {
    restore: () => {
      if (typeof original === 'undefined') {
        delete w[key];
      } else {
        w[key] = original;
      }
    },
  };
}

/**
 * 用 Object.defineProperty 的 setter 拦截对 window[key] 的赋值，
 * 每次赋值都调用 ensureValid 保证对象满足某些 invariant。
 */
export function interceptWindowSetter<T>(key: string, ensureValid: (obj: T) => T): WindowPatch {
  const w = window as unknown as Record<string, unknown>;
  const initial = (w[key] as T | undefined) ?? ({} as T);
  let stored: T = ensureValid(initial);

  Object.defineProperty(w, key, {
    get() {
      return stored;
    },
    set(val: unknown) {
      if (val && (val as unknown) !== stored) {
        stored = ensureValid(val as T);
      }
    },
    configurable: true,
    enumerable: true,
  });

  return {
    restore: () => {
      try {
        delete w[key];
      } catch {
        /* ignore */
      }
    },
  };
}