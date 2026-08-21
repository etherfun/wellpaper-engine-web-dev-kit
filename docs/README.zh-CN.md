# wallpaper-engine-web-dev-kit

[English](../README.md) | 简体中文

---

非官方 Wallpaper Engine **网页壁纸** 运行时模拟层 — 在浏览器中完整模拟 WE 注入的 API 行为。

## 用途

在浏览器开发 Wallpaper Engine 网页壁纸时，无需在 WE 编辑器中反复加载壁纸即可：

- 查看属性配置面板
- 调试音频可视化（模拟 128 元素频谱）
- 测试媒体集成（预置曲库 + 自定义曲目/封面）
- 预览 RGB LED 灯效（截获并解码 `setAllDevicesByImageData`）
- 模拟生命周期事件（pause/resume/FPS 变化）
- 从 `project.json` 读取属性定义，支持语言切换

## 使用方式

> 💡 **推荐方式：构建时注入** — 无需修改项目源码，自动将 dev-kit 注入已有壁纸项目。

### 构建时注入 ★ 推荐

将 we-dev-kit 注入现有壁纸项目的构建产物中，**无需修改项目源码**。适用于 CI/CD、一次性调试或为第三方项目添加开发工具。

> **前置条件：** 请先构建你的项目（例如 `vite build`、`webpack` 或 `tsc`）。`inputDir` 必须包含最终的构建产物（`index.html` + 资源文件）——`prepareDevBuild` 和 `injectIntoHtml` 操作的是**已经构建好的**产物。

**参数说明：**
- `inputDir` — **你的项目的构建产物目录**（如 `dist/`），即你的项目经过构建工具打包后生成的文件夹，里面必须有 `index.html`、JS/CSS、图片等资源文件
- `outputDir` — **开发用输出目录**（如 `dev/`）。`prepareDevBuild` 会把 `inputDir` 完整复制到这里，然后往 HTML 注入 dev-kit 脚本并复制 dev-kit 的 JS 文件。完成后直接打开此目录下的 `index.html` 即可调试，**不会修改你的原始构建产物**

> 流程：`inputDir` → 复制到 → `outputDir` → 注入 dev-kit → 打开 `outputDir/index.html` 调试

使用内置的 `inject` 模块，无需手写脚本：

```javascript
// scripts/build-dev.mjs
import { execSync } from 'node:child_process';
import { prepareDevBuild } from 'wallpaper-engine-web-dev-kit/inject';

// 1. 先构建项目（产物输出到 dist/）
execSync('vite build', { stdio: 'inherit' });
//    inputDir（'dist'）此时必须包含构建好的 index.html 等文件

// 2. 一键注入：复制构建产物 + 注入 dev-kit 脚本
prepareDevBuild({
  inputDir: 'dist',    // ← 你的项目构建产物目录
  outputDir: 'dev',    // ← 注入 dev-kit 后的开发目录
  config: { panel: true, audio: true, media: true, rgb: true, lifecycle: true },
});
```

或使用低阶 `injectIntoHtml` 自定义工作流——请确保先构建项目：

```javascript
import fs from 'node:fs';
import { injectIntoHtml } from 'wallpaper-engine-web-dev-kit/inject';

// 请确保 dist/index.html 存在（项目必须先构建）
const html = fs.readFileSync('dist/index.html', 'utf8');
fs.writeFileSync(
  'dev/index.html',
  injectIntoHtml(html, { config: { panel: true } }),
);
```

然后在 `package.json` 中添加脚本：

```json
"scripts": {
  "build:dev": "node scripts/build-dev.mjs"
}
```

执行：

```bash
npm run build:dev
```

生成的 `dev/` 目录完全自包含 — 在浏览器中打开 `dev/index.html` 即可获得所有 WE API 的模拟环境，无需修改任何源文件。

---

### 模块导入（npm / TypeScript 项目）

```bash
npm install -D wallpaper-engine-web-dev-kit
```

```typescript
import { createWeDevKit } from 'wallpaper-engine-web-dev-kit';

const kit = createWeDevKit({
  panel: { position: { x: 100, y: 50 } },
  audio: { amplitude: 0.6, bassBoost: 1.2 },
  media: { autoCycle: true, cycleIntervalMs: 8000 },
  rgb: true,
  lifecycle: true,
});

// 控制面板
kit.togglePanel();

// 媒体控制
kit.media.play();
kit.media.nextTrack();

// RGB 数据
kit.rgb.onFrame((frame) => console.log('RGB frame:', frame));

// 清理
kit.destroy();
```

### 浏览器直接引用（IIFE）

```html
<script src="./dist/index.global.js"></script>
<script>
  WeDevKit.createWeDevKit({
    panel: true,
    audio: { amplitude: 0.6 },
    media: { autoCycle: true },
    rgb: true,
    lifecycle: true,
  });
</script>
```

### 构建产物引用

```bash
# 构建 dev-kit
npm run build

# 产物位于 dist/
#   dist/index.global.js  — IIFE（浏览器 script 标签）
#   dist/index.js         — ESM
#   dist/index.cjs        — CommonJS
#   dist/index.d.ts       — 类型定义
```

## 文档

- **[API.md](API.md)** — API 参考文档

包含完整 API 参考、类型定义、子控制器说明、构建时注入 API、Mp3Player 频谱播放器及 agent 使用示例。

## 功能特性

### 音频频谱模拟

128 元素频谱生成器，匹配 WE 规范（0-63 左声道、64-127 右声道），支持三种模式：

- **Beats** — 低频脉冲为主，带 bass boost 增益
- **Melody** — 更平滑的正弦波组合
- **Mixed** — 混合模式

支持振幅调节、帧率控制、渐进淡入淡出、帧间平滑过渡。

### 媒体集成模拟

完整模拟 WE Media Integration 全部 5 个 listener，预置 5 首曲库：

- 播放控制：播放/暂停/停止/切曲/进度控制
- 自定义元数据：覆盖曲目信息、上传封面图片
- 自动轮播：可配置轮换间隔
- 曲目切换时智能过滤（不发送 STOPPED 避免 UI 闪烁）

### RGB LED 数据

模拟 LED/CUE 插件加载机制，截获 `setAllDevicesByImageData` 调用：

- 解码原始像素数据为 `ImageData`（可用于 canvas 绘制）
- 自动提取调色板（网格量化，最多 8 色）
- 注册帧回调实时监听
- 手动模拟帧数据（无需依赖插件加载）

### 生命周期事件模拟

模拟 WE 暂停/恢复/FPS 变化等生命周期行为：

- 调用 `wallpaperPropertyListener.setPaused` 通知壁纸暂停状态
- 劫持 `requestAnimationFrame` / `setTimeout` / `setInterval`，暂停时积累队列，恢复时依次执行
- `destroy()` 时**自动恢复**所有被劫持的原始定时器函数
- FPS 变化通过 `applyGeneralProperties` 推送
- 暂停时自动注入 CSS 规则暂停动画（`animation-play-state: paused`）

### 属性配置控制

从 `project.json` 读取 `general.properties` 定义，通过 `kit.properties.*` API 提供：

- 属性定义查询：类型、值范围、选项列表
- 可见性条件求值：解析 `.value == X` / `&&` / `||` 等表达式（返回 `blockedBy`/`blockedValue`）
- 翻译键丢失检查：定位未翻译的 UI 文本
- 属性增删改：`addProperty()` / `updateProperty()` / `removeProperty()`
- 多语言匹配：按浏览器语言精确匹配 → 语言前缀 → 回退到 en-us

### 控制面板

可视化调试面板，Shadow DOM 隔离宿主页面 CSS 污染：

- **音频模拟控制** — 振幅/低频增益/速度/模式切换（Beats/Melody/Mixed），音频输入开关
- **媒体播放控制** — 播放/暂停/切曲/自定义曲目/上传封面
- **RGB 数据实时监控** — 等待状态显示
- **生命周期控制** — 暂停/恢复/FPS 限制设置
- **属性查看器** — 搜索、类型筛选（Bool/Slider/Color 等）、可见性筛选（全部/可见/隐藏）、翻译状态筛选（全部/缺失/正常）、键名/名称切换显示
- **属性编辑器弹窗 V2** — 浮动可拖拽窗口，支持添加/编辑/删除属性：
  - 键名自动生成 i18n 翻译键（驼峰 → 蛇形）
  - 翻译编辑器：批量编辑所有语言的翻译文本
  - 类型切换时 confirm 提示防误操作
  - Bool 用 checkbox 组，Slider 用 [range + number] 联动
  - Color 用 picker + WE hex 同步
  - Combo 选项表格（Label/Value 编辑，增删行）
  - 翻译键状态提示（是否在 localization 字典中存在）
- **语言管理** — 语言切换下拉、新增语言下拉（支持 35+ WE 语言代码）、翻译缺失标记
- **Localization 面板** — 查看当前语言翻译字典的所有条目
- **时钟显示**、**最小化**、拖拽标题栏移动

#### 控制面板属性编辑弹窗

属性编辑弹窗 V2 实现了完整的 project.json 属性编辑体验：

- **基础**：键名（编辑模式锁定）、类型选择（9 种 WE 类型）
- **i18n**：自动翻译键生成、翻译编辑器（多语言批量编辑）、翻译状态提示
- **值控件**：Bool 双选 / Slider [range+number] / Color picker+WE hex / Combo 下拉预览 / Text/File/Directory/Group 文本输入
- **类型专属**：Slider 范围 (Min/Max/Step/Precision/Fraction)、File 视频模式、Directory 点播模式
- **Combo 选项**：Label + Value 表格编辑，增删行
- **元数据**：Order / Index / Condition

### 国际化 (i18n)

控制面板内置 en-US / zh-CN 双语界面，基于 `navigator.language` 自动选择。所有 UI 文本通过 `PanelMessages` 接口管理：

```typescript
import { getPanelMessages } from './panel/i18n';
// 自动根据浏览器语言返回对应翻译
console.log(getPanelMessages().amplitude); // "Amplitude" / "振幅"
```

属性编辑弹窗支持 **翻译编辑器**，可从 project.json 的 `general.localization` 中读取所有语言的翻译，并在编辑属性时批量修改多语言文本。

**语言策略**（project.json 读取时）：

1. 精确匹配 `navigator.language`（如 `zh-CN`）
2. 语言前缀匹配（如 `zh`）
3. 回退到 `en-us`
4. 第一个可用语言

### 条件表达式求值器

`conditionEvaluator.ts` 完整支持 project.json 属性可见性条件语法：

- 比较：`.value == X`、`.value != X`
- 布尔值：`true`、`false`
- 数字：整数和浮点数
- 字符串：`'单引号'` 或 `"双引号"`
- 组合：`&&` (AND)、`||` (OR)
- 括号：`(expr)` 分组

```typescript
import { evaluateCondition } from './panel/conditionEvaluator';

// 检查 "showDate" 属性是否可见
const visible = evaluateCondition(
  'showDate.value == true',
  (key) => properties.find(p => p.key === key)?.value
);
```

### 环境自动检测

启动时自动判断运行环境，3 种检测策略：

1. CEF userAgent 特征
2. `wallpaperPropertyListener` 是否已被 WE 注入（区分 real WE 和 dev-kit mock）
3. 加载协议 + dev-kit 标志位

检测为真实 WE 环境时自动跳过模拟，不干扰正常壁纸运行。

### MP3 频谱播放器

Web Audio API 真实 MP3 播放与频谱提取，内置 DSP 处理流水线：

- 高斯平滑 + bin 级 EMA 时间计权消除突刺和闪烁
- 对数频带 RMS 合并（64 band，等比频率宽度）
- 频带间水平平滑 + band 级 EMA
- 峰值保持归一化，输出 Float32Array[128]
- 支持灵敏度/输出上限/循环播放等参数调节

### 音频数据传入开关

支持动态控制音频帧分发，启用时频谱数据推送到 `wallpaperRegisterAudioListener` 注册的回调，关闭时停止推送，不影响其他模块运行。

### wallpaperPropertyListener 补齐

自动补充 `setPaused`、`applyGeneralProperties`、`userDirectoryFilesAddedOrChanged`、`userDirectoryFilesRemoved` 方法，确保项目代码在浏览器中不会因缺少 WE API 而报错。使用 `Object.defineProperty` setter 拦截后续赋值，始终补齐缺失方法。

### 属性序列化

支持将当前属性列表序列化为 project.json 格式并导出下载。

## 项目结构

```
src/
  index.ts               # 主入口 createWeDevKit()
  types.ts               # 全部类型定义
  inject.ts              # 构建时注入工具（prepareDevBuild / injectIntoHtml）
  environment.ts         # 真实 WE 环境检测
  propertyMock.ts        # wallpaperPropertyListener 补充
  audioSimulator.ts      # 128 元素频谱生成器
  audioBridge.ts         # 音频状态机中枢（收敛 listener/帧分发/零帧归零/源切换）
  mp3Player.ts           # MP3 播放器 + 真实频谱提取（DSP 流水线）
  mediaMock.ts           # 媒体集成模拟（5 listener + 预置曲库）
  rgbMock.ts             # RGB LED 插件模拟
  lifecycleMock.ts       # 生命周期事件（含暂停 CSS 注入 + JS 定时器恢复）
  panel/
    index.ts             # 控制面板控制器
    renderer.ts          # DOM 渲染（Shadow DOM 隔离）
    styles.ts            # 内联样式（含 V2 弹窗、翻译编辑器 CSS）
    projectJsonReader.ts # project.json 属性解析 + 语言匹配 + 序列化导出
    conditionEvaluator.ts# 条件表达式求值器（lexer + parser）
    i18n.ts              # 国际化字典（en-US / zh-CN）
    callbacks.ts         # 面板回调契约 + 类型定义
    layout.ts            # DOM 布局工具函数
    sections/
      audio.ts           # 音频模拟控制 UI
      media.ts           # 媒体集成控制 UI
      lifecycle.ts       # 生命周期控制 UI
      properties.ts      # 属性查看器 UI（搜索/筛选/翻译/语言管理）
      rgb.ts             # RGB 数据监控 UI
    modal/
      propertyEditor.ts  # 属性编辑弹窗 V2（拖拽/翻译编辑器/类型控件）
  utils/
    color.ts             # 颜色工具（hex 转换、调色板提取）
    dom.ts               # DOM 工具（可拖拽宿主、Shadow DOM 容器）
    imageData.ts         # 像素 ↔ ImageData 互转 + SVG 封面生成
    time.ts              # 时间格式化 + debounce
    windowPatching.ts    # 通用 window 注入/还原工具
```

## 构建

```bash
npm install
npm run build        # → dist/index.global.js + index.js + index.cjs + .d.ts
npm run dev          # → watch 模式
```

## 许可证

GPL-3.0
