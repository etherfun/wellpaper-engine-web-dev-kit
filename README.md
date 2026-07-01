# wallpaper-engine-web-dev-kit

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

### 模块导入（npm / TypeScript 项目）

```bash
npm install wallpaper-engine-web-dev-kit
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

完整 API 参考文档、类型定义、子控制器说明及 agent 使用示例请参见 **[API.md](API.md)**。

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
- FPS 变化通过 `applyGeneralProperties` 推送
- 暂停时自动注入 CSS 规则暂停动画（`animation-play-state: paused`）

### 属性配置控制

从 `project.json` 读取 `general.properties` 定义，提供：

- 属性定义查询：类型、值范围、选项列表
- 可见性条件求值：解析 `.value == X` / `&&` / `||` 等表达式
- 翻译键丢失检查：定位未翻译的 UI 文本
- 多语言匹配：按浏览器语言精确匹配 → 语言前缀 → 回退到 en-us

### 控制面板

可视化调试面板，Shadow DOM 隔离宿主页面 CSS 污染：

- 音频模拟控制（振幅/低频增益/速度/模式）
- 媒体播放控制（播放/暂停/切曲/自定义曲目/上传封面）
- RGB 数据实时监控
- 生命周期控制（暂停/恢复/FPS）
- 属性查看器（可见性/翻译状态筛选）
- 拖拽标题栏移动、时钟显示

### 环境自动检测

启动时自动判断运行环境，3 种检测策略：

1. CEF userAgent 特征
2. `wallpaperPropertyListener` 是否已被 WE 注入
3. 加载协议 + dev-kit 标志位

检测为真实 WE 环境时自动跳过模拟，不干扰正常壁纸运行。

### 音频数据传入开关

支持动态控制音频帧分发，启用时频谱数据推送到 `wallpaperRegisterAudioListener` 注册的回调，关闭时停止推送，不影响其他模块运行。

### wallpaperPropertyListener 补齐

自动补充 `setPaused`、`applyGeneralProperties`、`userDirectoryFilesAddedOrChanged`、`userDirectoryFilesRemoved` 方法，确保项目代码在浏览器中不会因缺少 WE API 而报错。使用 `Object.defineProperty` setter 拦截后续赋值，始终补齐缺失方法。

## 项目结构

```
src/
  index.ts               # 主入口 createWeDevKit()
  types.ts               # 全部类型定义
  environment.ts         # 真实 WE 环境检测
  propertyMock.ts        # wallpaperPropertyListener 补充
  audioSimulator.ts      # 128 元素频谱生成器
  mediaMock.ts           # 媒体集成模拟（4 listener + 预置曲库）
  rgbMock.ts             # RGB LED 插件模拟
  lifecycleMock.ts       # 生命周期事件（含暂停 CSS 注入）
  panel/
    index.ts             # 控制面板控制器
    renderer.ts          # DOM 渲染（Shadow DOM 隔离）
    styles.ts            # 内联样式
    projectJsonReader.ts # project.json 属性解析 + 语言匹配
    conditionEvaluator.ts# 条件表达式求值器
```

## 构建

```bash
npm install
npm run build        # → dist/index.global.js + index.js + index.cjs + .d.ts
npm run dev          # → watch 模式
```

## 许可证

GPL-3.0