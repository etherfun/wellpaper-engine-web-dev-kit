/**
 * WE Dev Kit — Build-Time Injection Utilities
 *
 * 将 we-dev-kit 注入到现有壁纸项目的构建产物中，
 * 无需修改项目源码。适用于 CI/CD、一键调试、为第三方项目添加开发工具。
 *
 * @example
 * ```ts
 * // 程序化 API — 一行搞定
 * import { prepareDevBuild } from 'wallpaper-engine-web-dev-kit/inject';
 *
 * prepareDevBuild({
 *   inputDir: 'dist',
 *   outputDir: 'dev',
 *   config: { panel: true, audio: true, media: true },
 * });
 * ```
 *
 * @example
 * ```ts
 * // 低阶 API — 仅注入 HTML
 * import { injectIntoHtml } from 'wallpaper-engine-web-dev-kit/inject';
 * import fs from 'node:fs';
 *
 * const html = fs.readFileSync('dist/index.html', 'utf8');
 * const modified = injectIntoHtml(html, { config: { panel: true } });
 * fs.writeFileSync('dev/index.html', modified);
 * ```
 */

import fs from 'node:fs';
import path from 'node:path';

// ---- Types ----

export interface InjectOptions {
  /** DevKit 配置对象（传给 createWeDevKit），默认启用全部功能 */
  config?: Record<string, unknown>;
  /** script src 路径（相对于 HTML），默认 './we-dev-kit/index.global.js' */
  scriptSrc?: string;
  /** 是否自动创建 DevKit 实例，默认 true */
  autoCreate?: boolean;
  /** 插入位置，默认 'before-body-end' */
  insertAt?: 'before-body-end' | 'after-body-start' | 'before-head-end';
}

export interface DevBuildOptions {
  /** 项目构建产物目录（如 dist/） */
  inputDir: string;
  /** 输出目录（如 dev/），默认 'dev' */
  outputDir?: string;
  /** DevKit 配置（传给 createWeDevKit） */
  config?: Record<string, unknown>;
  /** script src（相对于 HTML），默认 './we-dev-kit/index.global.js' */
  scriptSrc?: string;
  /** DevKit dist 目录路径（默认自动从 node_modules 查找） */
  kitDistPath?: string;
  /** dev-kit 文件放置的子目录名，默认 'we-dev-kit' */
  targetDirName?: string;
}

// ---- Helpers ----

function defaultConfig(): Record<string, unknown> {
  return {
    panel: true,
    audio: { amplitude: 0.6 },
    media: { autoCycle: true },
    rgb: true,
    lifecycle: true,
  };
}

function buildSnippet(options: InjectOptions): string {
  const src = options.scriptSrc ?? './we-dev-kit/index.global.js';
  const raw = options.config ?? defaultConfig();
  const configStr = JSON.stringify(raw, null, 4);

  const parts: string[] = [];
  parts.push(`    <script src="${src}"></script>`);
  if (options.autoCreate !== false) {
    parts.push('    <script>');
    parts.push(`        WeDevKit.createWeDevKit(${configStr});`);
    parts.push('    </script>');
  }
  return '\n' + parts.join('\n') + '\n';
}

// ============================================================
// Public API
// ============================================================

/**
 * 将 we-dev-kit 脚本注入到 HTML 字符串中。
 *
 * 纯字符串变换，无副作用，浏览器/Node 均可使用。
 *
 * @param html  原始 HTML 字符串
 * @param options  注入选项
 * @returns  注入后的 HTML 字符串
 */
export function injectIntoHtml(html: string, options?: InjectOptions): string {
  const opts: InjectOptions = options ?? {};
  const snippet = buildSnippet(opts);
  const insertAt = opts.insertAt ?? 'before-body-end';

  switch (insertAt) {
    case 'before-body-end': {
      const idx = html.lastIndexOf('</body>');
      if (idx !== -1) return html.slice(0, idx) + snippet + html.slice(idx);
      return html + snippet;
    }
    case 'after-body-start': {
      const m = html.match(/<body[^>]*>/i);
      if (m && m.index != null) {
        const pos = m.index + m[0].length;
        return html.slice(0, pos) + snippet + html.slice(pos);
      }
      return html + snippet;
    }
    case 'before-head-end': {
      const idx = html.lastIndexOf('</head>');
      if (idx !== -1) return html.slice(0, idx) + snippet + html.slice(idx);
      // fallback: inject before first <body>
      const body = html.indexOf('<body');
      if (body !== -1) return html.slice(0, body) + snippet + html.slice(body);
      return snippet + html;
    }
    default:
      return html + snippet;
  }
}

/**
 * 一键准备开发构建：复制项目产物 + 注入 dev-kit 脚本。
 *
 * 等效于 README 中 30 行构建脚本的功能，但只需一行调用。
 *
 * 需要 Node.js 环境。
 *
 * @param options  构建选项
 *
 * @example
 * ```ts
 * // 最简单的用法
 * import { prepareDevBuild } from 'wallpaper-engine-web-dev-kit/inject';
 * prepareDevBuild({ inputDir: 'dist' });
 * ```
 *
 * @example
 * ```ts
 * // 完整配置
 * prepareDevBuild({
 *   inputDir: 'dist',
 *   outputDir: 'dev',
 *   config: {
 *     panel: true,
 *     audio: { amplitude: 0.8 },
 *     media: { autoCycle: true },
 *     rgb: false,
 *     lifecycle: true,
 *   },
 * });
 * ```
 */
export function prepareDevBuild(options: DevBuildOptions): void {
  const {
    inputDir,
    outputDir = 'dev',
    config,
    scriptSrc,
    targetDirName = 'we-dev-kit',
    kitDistPath,
  } = options;

  // 1) 校验输入目录
  if (!fs.existsSync(inputDir)) {
    throw new Error(`[we-dev-kit/inject] 输入目录不存在: ${inputDir}`);
  }

  // 2) 复制项目产物
  fs.mkdirSync(outputDir, { recursive: true });
  copyDirSync(inputDir, outputDir);

  // 3) 注入 HTML
  const htmlPath = path.join(outputDir, 'index.html');
  if (fs.existsSync(htmlPath)) {
    const original = fs.readFileSync(htmlPath, 'utf8');
    const modified = injectIntoHtml(original, {
      config,
      scriptSrc: scriptSrc ?? `./${targetDirName}/index.global.js`,
    });
    fs.writeFileSync(htmlPath, modified, 'utf8');
    console.log(`[we-dev-kit/inject]  ✓ index.html 注入完成`);
  } else {
    console.warn(`[we-dev-kit/inject]  ⚠ 未找到 index.html，跳过注入`);
  }

  // 4) 复制 dev-kit dist
  const kitSrc = kitDistPath ?? findKitDist(process.cwd());
  if (!kitSrc || !fs.existsSync(kitSrc)) {
    console.warn(
      `[we-dev-kit/inject]  ⚠ 未找到 we-dev-kit dist。\n` +
      `   请通过 kitDistPath 指定，或确保 wallpaper-engine-web-dev-kit 已安装。`
    );
    return;
  }

  const kitTarget = path.join(outputDir, targetDirName);
  fs.mkdirSync(kitTarget, { recursive: true });
  copyDirSync(kitSrc, kitTarget);
  console.log(`[we-dev-kit/inject]  ✓ dev-kit 文件已复制到 ${kitTarget}`);
  console.log(`[we-dev-kit/inject]  ✓ 开发构建已就绪: ${path.resolve(outputDir)}/`);
}

// ---- 内部工具 ----

function copyDirSync(src: string, dest: string): void {
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      fs.mkdirSync(d, { recursive: true });
      copyDirSync(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}

function findKitDist(fromDir: string): string | null {
  let dir = path.resolve(fromDir);
  for (;;) {
    const candidate = path.join(dir, 'node_modules', 'wallpaper-engine-web-dev-kit', 'dist');
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}
