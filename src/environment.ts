/**
 * WE 环境检测模块
 *
 * 判断当前运行环境：真实 Wallpaper Engine vs 浏览器开发预览。
 * 多种检测策略组合使用，提高准确率。
 *
 * 策略顺序（任一匹配即判定为真实 WE）：
 * 1. CEF userAgent 特征（"cef" / "wallpaper-engine" / "wallpaperengine"）
 * 2. wallpaperPropertyListener 已被注入且不是 dev-kit mock
 * 3. file:// 协议加载且无 dev-kit 标记
 * 4. dev-server 端口（5175）或 dev-kit URL 参数
 *
 * 优先级：dev-server 标记 > file:// 默认行为；保守回退到真 WE 以避免误改。
 */

export interface DetectionResult {
  /** 是否运行在真实 WE 中 */
  isRealWE: boolean;
  /** 检测依据 */
  reason: string;
}

const CEF_SIGNALS = ['cef', 'wallpaper-engine', 'wallpaperengine'];

export function detectEnvironment(): DetectionResult {
  const ua = navigator.userAgent.toLowerCase();
  for (const sig of CEF_SIGNALS) {
    if (ua.includes(sig)) {
      return { isRealWE: true, reason: `userAgent contains "${sig}"` };
    }
  }

  const listener = (window as unknown as { wallpaperPropertyListener?: { applyUserProperties?: unknown; __weDevKitMocked?: boolean } }).wallpaperPropertyListener;
  if (listener && typeof listener.applyUserProperties === 'function') {
    if (listener.__weDevKitMocked) {
      return { isRealWE: false, reason: 'listener is we-dev-kit mock' };
    }
    // 真正的 WE 环境已注入了 wallpaperPropertyListener
    return { isRealWE: true, reason: 'wallpaperPropertyListener already present (non-mock)' };
  }

  const isFileProtocol = window.location.protocol === 'file:';
  const isDevKitPage =
    window.location.pathname.includes('browser-preview') ||
    window.location.search.includes('dev-kit') ||
    window.location.search.includes('dev-panel');

  const hasDevServerHost =
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === 'localhost' ||
    window.location.port === '5175';

  if (hasDevServerHost || isDevKitPage) {
    return { isRealWE: false, reason: 'dev server or dev-kit flag detected' };
  }

  if (isFileProtocol && !isDevKitPage) {
    return { isRealWE: true, reason: 'file:// protocol without dev-kit flag' };
  }

  if (isFileProtocol) {
    return { isRealWE: true, reason: 'file:// protocol (conservative default)' };
  }

  return { isRealWE: false, reason: 'no WE signals detected' };
}