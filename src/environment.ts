/**
 * WE 环境检测模块
 *
 * 判断当前运行环境：真实 Wallpaper Engine vs 浏览器开发预览。
 * 多种检测策略组合使用，提高准确率。
 *
 * 策略顺序（任一匹配即判定为真实 WE）：
 * 1. CEF userAgent 特征（"cef" / "wallpaper-engine" / "wallpaperengine"）
 * 2. dev-server 端口（5175）或 dev-kit URL 参数 — 优先于 listener 检测，
 *    防止项目自身设置的 wallpaperPropertyListener 被误判为真实 WE
 * 3. file:// 协议 + 已注入的非 mock wallpaperPropertyListener
 * 4. file:// 协议（保守回退）
 *
 * 优先级：dev-server 标记 > file:// + listener > file:// 默认行为
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

  // dev-server / dev-kit 标记优先于 listener 检测
  // 因为许多壁纸项目会在自己的 main.ts 中设置 wallpaperPropertyListener，
  // 不能仅凭其存在就判定为真实 WE
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

  // 仅在 file:// 协议下，wallpaperPropertyListener 的存在才可能是 WE 注入的
  if (isFileProtocol) {
    const listener = (window as unknown as { wallpaperPropertyListener?: { applyUserProperties?: unknown; __weDevKitMocked?: boolean } }).wallpaperPropertyListener;
    if (listener && typeof listener.applyUserProperties === 'function' && !listener.__weDevKitMocked) {
      return { isRealWE: true, reason: 'file:// protocol with pre-existing (non-mock) wallpaperPropertyListener' };
    }
    // file:// 下没有 listener 时保守回退
    return { isRealWE: true, reason: 'file:// protocol (conservative default)' };
  }

  // 非 CEF、非 file://、非 dev server → 浏览器开发模式
  return { isRealWE: false, reason: 'no WE signals detected' };
}