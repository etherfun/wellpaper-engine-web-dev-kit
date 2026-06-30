/**
 * WE 环境检测模块
 *
 * 判断当前运行环境：真实 Wallpaper Engine vs 浏览器开发预览。
 * 多种检测策略组合使用，提高准确率。
 */

export interface DetectionResult {
  /** 是否运行在真实 WE 中 */
  isRealWE: boolean;
  /** 检测依据 */
  reason: string;
}

/**
 * 检测是否运行在真实 Wallpaper Engine 中。
 * 使用 3 种策略组合判断，任一匹配即判定为真实 WE。
 */
export function detectEnvironment(): DetectionResult {
  // 策略 1: CEF userAgent 特征
  const ua = navigator.userAgent.toLowerCase();
  const cefSignals = ['cef', 'wallpaper-engine', 'wallpaperengine'];
  for (const sig of cefSignals) {
    if (ua.includes(sig)) {
      return { isRealWE: true, reason: `userAgent contains "${sig}"` };
    }
  }

  // 策略 2: 检查 wallpaperPropertyListener 是否已被 WE 注入为 native 函数
  const listener = (window as any).wallpaperPropertyListener;
  if (listener && typeof listener.applyUserProperties === 'function') {
    const fnStr = listener.applyUserProperties.toString();
    // WE 注入的监听器通常不是 "function () { [native code] }"，
    // 但如果是来自 WE C++ 绑定则可能是原生函数。
    // 更可靠的检测：检查是否被我们的 mock 覆盖 - 如果是我们的 mock
    // 函数，会有特定标记
    if ((listener as any).__weDevKitMocked) {
      return { isRealWE: false, reason: 'listener is we-dev-kit mock' };
    }
    // 如果 listener 有 applyUserProperties 但不是我们设置的，
    // 且不是 noop（函数体长度 > 20），可能是真实 WE
    if (fnStr.length > 20 && !fnStr.includes('noop')) {
      // 不立刻下结论，继续检查其他策略
    }
  }

  // 策略 3: 检查加载方式 — WE 使用 file:// 协议加载壁纸
  // 但 dev preview 也可能用 file://，所以需要排除 browser-preview.html
  const isFileProtocol = window.location.protocol === 'file:';
  const isDevKitPage = window.location.pathname.includes('browser-preview')
    || window.location.search.includes('dev-kit')
    || window.location.search.includes('dev-panel');

  if (isFileProtocol && !isDevKitPage) {
    // 通过 file:// 加载且不是预览页 → 大概率是真实 WE
    // (但也不绝对，某些本地服务器也会用 file://)
    return { isRealWE: true, reason: 'file:// protocol without dev-kit flag' };
  }

  // 策略 4: 检查是否在浏览器预览服务器中
  const hasDevServerHost = window.location.hostname === '127.0.0.1'
    || window.location.hostname === 'localhost'
    || window.location.port === '5175';  // preview-server.mjs 默认端口

  if (hasDevServerHost || isDevKitPage) {
    return { isRealWE: false, reason: 'dev server or dev-kit flag detected' };
  }

  // 默认：安全起见，如果在 file:// 下且没有明确的 dev 标志，
  // 保守地认为是真实 WE
  if (isFileProtocol) {
    return { isRealWE: true, reason: 'file:// protocol (conservative default)' };
  }

  return { isRealWE: false, reason: 'no WE signals detected' };
}
