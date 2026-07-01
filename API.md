# @perfectwall/we-dev-kit API 文档

> 版本: 0.1.0 (v2)

## 目录

1. [createWeDevKit() — 工厂函数](#createwedevkit--工厂函数)
2. [DevKitInstance — 顶层实例](#devkitinstance--顶层实例)
3. [MediaController — 媒体集成控制](#mediacontroller--媒体集成控制)
4. [RgbController — RGB 数据获取](#rgbcontroller--rgb-数据获取)
5. [LifecycleController — 生命周期控制](#lifecyclecontroller--生命周期控制)
6. [PropertiesController — 配置项控制](#propertiescontroller--配置项控制)
7. [类型定义参考](#类型定义参考)
8. [Agent 使用示例](#agent-使用示例)

---

## createWeDevKit() — 工厂函数

创建 WE Dev Kit 实例，一键注入所有 WE 运行时模拟 API。

### 签名

```typescript
function createWeDevKit(options?: DevKitConfig): DevKitInstance
```

### 配置选项 (DevKitConfig)

| 字段 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `enabled` | `boolean` | `true` | 总开关 |
| `autoDetect` | `boolean` | `true` | 自动检测真实 WE 环境并跳过 |
| `audio` | `boolean \| AudioConfig` | `true` | 音频模拟配置 |
| `media` | `boolean \| MediaConfig` | `true` | 媒体集成模拟配置 |
| `properties` | `boolean` | `true` | 属性监听补齐 |
| `rgb` | `boolean` | `true` | RGB LED 模拟 |
| `lifecycle` | `boolean` | `true` | 生命周期事件 |
| `panel` | `boolean \| PanelConfig` | `true` | 控制面板配置 |

#### AudioConfig

| 字段 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `amplitude` | `number` | `0.6` | 振幅 0-1 |
| `bassBoost` | `number` | `1.2` | 低频增益 |
| `variationSpeed` | `number` | `1.0` | 变化速度 |
| `frameRate` | `number` | `30` | 帧率 |

#### MediaConfig

| 字段 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `tracks` | `MockTrack[]` | `[]` | 自定义曲库（内置 5 首默认曲库） |
| `autoCycle` | `boolean` | `true` | 自动轮换 |
| `cycleIntervalMs` | `number` | `8000` | 轮换间隔（毫秒） |

#### PanelConfig

| 字段 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `position` | `{ x: number; y: number }` | `{ x: 0, y: 0 }` | 面板初始位置 |
| `collapsed` | `boolean` | `false` | 默认折叠 |
| `theme` | `'light' \| 'dark'` | `'dark'` | 主题 |

### 示例

```typescript
// 基础用法
const kit = createWeDevKit();

// 仅启用面板和 RGB
const kit = createWeDevKit({ audio: false, media: false });

// 精细配置
const kit = createWeDevKit({
  panel: { position: { x: 100, y: 50 }, theme: 'dark' },
  audio: { amplitude: 0.8, bassBoost: 1.5, frameRate: 60 },
  media: { autoCycle: true, cycleIntervalMs: 5000 },
});

// HTML script 标签模式 (IIFE)
// <script src="./dist/index.global.js"></script>
// <script>const kit = WeDevKit.createWeDevKit({ panel: true });</script>
```

---

## DevKitInstance — 顶层实例

`createWeDevKit()` 返回的实例对象。

### 顶层方法

| 方法 | 签名 | 说明 |
|---|---|---|
| `destroy` | `(): void` | 销毁所有 mock，恢复原始状态 |
| `togglePanel` | `(): void` | 切换控制面板显示 |
| `getConfig` | `(): Readonly<DevKitConfig>` | 获取当前配置（只读快照） |
| `pushProperties` | `(props: Record<string, unknown>): void` | 手动触发一次属性推送 |
| `pushAudioFrame` | `(): void` | 手动触发音频数据推送 |
| `nextTrack` | `(): void` | 手动切换曲目 |
| `setAudioEnabled` | `(enabled: boolean): void` | **Task 0** 设置音频数据传入开关 |

### 状态 (state)

```typescript
interface DevKitState {
  isLoaded: boolean;           // 是否已加载
  isPanelVisible: boolean;     // 面板是否可见
  currentTrackIndex: number;   // 当前曲目索引
  playbackState: PlaybackState; // 播放状态
  isRgbPluginLoaded: boolean;  // RGB 插件是否已加载
  isAudioEnabled: boolean;     // Task 0 音频数据传入是否启用
}
```

### 子控制器

| 字段 | 类型 | 说明 |
|---|---|---|
| `media` | `MediaController` | 媒体集成控制 |
| `rgb` | `RgbController` | RGB 数据获取 |
| `lifecycle` | `LifecycleController` | 生命周期控制 |
| `properties` | `PropertiesController` | 配置项控制 |

---

## MediaController — 媒体集成控制

完整模拟 WE 的 Media Integration 全部 5 个 listener + 常量。内置 5 首曲库（周杰伦、Daft Punk、林俊杰、Ludovico Einaudi、邓紫棋），每首带渐变色封面 SVG。

### 方法

#### 播放控制

| 方法 | 说明 | WE 对应行为 |
|---|---|---|
| `play()` | 播放/恢复 | 推送 `wallpaperRegisterMediaPlaybackListener` 状态变化 |
| `pause()` | 暂停 | 从 `PLAYING` → `PAUSED` |
| `stop()` | 停止 | 从任意状态 → `STOPPED`，进度重置 |

**行为细节：**
- 从 `stopped` 调用 `play()`：先推送 `STOPPED` 再推送 `PLAYING`，同时推送元数据和缩略图
- 从 `paused` 调用 `play()`：只推送 `PLAYING`，不重复推送元数据
- 从 `playing` 调用 `pause()`：只推送 `PAUSED`

#### 曲目切换

| 方法 | 说明 |
|---|---|
| `nextTrack()` | 下一首（循环） |
| `prevTrack()` | 上一首（循环） |
| `setTrack(index)` | 跳转到指定索引的曲目 |

**行为细节：**
- 切换曲目不发送 `STOPPED`（避免 UI 闪烁）
- 仅更新元数据事件和缩略图事件
- 播放状态保持不变

#### 自定义元数据

| 方法 | 说明 |
|---|---|
| `setCustomTrack({ title, artist, ... })` | 覆盖当前曲目的元数据，不切换曲目 |
| `setCustomThumbnail(dataUri)` | 设置自定义封面，自动从图片提取主色 |

#### 进度控制

| 方法 | 说明 |
|---|---|
| `seek(pct)` | 按百分比 0-100 跳转到指定位置 |
| `getPosition()` | 获取当前播放位置（秒） |

#### 只读属性

| 属性 | 类型 | 说明 |
|---|---|---|
| `currentIndex` | `number` | 当前曲目索引 |
| `playbackState` | `'playing' \| 'paused' \| 'stopped'` | 当前播放状态 |
| `tracks` | `MockTrack[]` | 完整曲库列表 |

### MockTrack 结构

```typescript
interface MockTrack {
  title: string;            // 标题
  artist: string;           // 艺术家
  album?: string;           // 专辑名
  genre?: string;           // 曲风
  duration?: number;        // 时长（秒，默认 240）
  thumbnail?: string;       // Base64 data URI 封面
  primaryColor?: string;    // 主色调
  secondaryColor?: string;  // 辅色调
  tertiaryColor?: string;   // 第三色
  textColor?: string;       // 文字色
  highContrastColor?: string; // 高对比色
}
```

### WE 事件映射

| 控制器方法 | 触发的 WE Listener | 事件类型 |
|---|---|---|
| `play()` | `wallpaperRegisterMediaPlaybackListener` | `MediaPlaybackEvent` |
| `pause()` | `wallpaperRegisterMediaPlaybackListener` | `MediaPlaybackEvent` |
| `stop()` | `wallpaperRegisterMediaPlaybackListener` | `MediaPlaybackEvent` |
| `setTrack()` / `nextTrack()` / `prevTrack()` | `wallpaperRegisterMediaPropertiesListener` + `wallpaperRegisterMediaThumbnailListener` + `wallpaperRegisterMediaTimelineListener` | `MediaPropertiesEvent` + `MediaThumbnailEvent` + `MediaTimelineEvent` |
| `seek()` | `wallpaperRegisterMediaTimelineListener` | `MediaTimelineEvent` |
| 进度更新（每 100ms） | `wallpaperRegisterMediaTimelineListener` | `MediaTimelineEvent` |
| 初始化（首次推歌） | `wallpaperRegisterMediaStatusListener` | `MediaStatusEvent` |

### 常量

`window.wallpaperMediaIntegration` 包含：

```typescript
{
  PLAYBACK_PLAYING: 0,
  PLAYBACK_PAUSED: 1,
  PLAYBACK_STOPPED: 2,
}
```

---

## RgbController — RGB 数据获取

模拟 WE 的 LED / CUE 插件加载机制，截获 `setAllDevicesByImageData` 调用并提供解码后的数据访问。

### 方法

| 方法 | 返回值 | 说明 |
|---|---|---|
| `getLastFrame()` | `RgbFrameData \| null` | 获取最后一帧原始数据 |
| `getDecodedImageData()` | `ImageData \| null` | 解码为 canvas ImageData（可用于 `ctx.putImageData()`） |
| `getPalette()` | `{ color: string; ratio: number }[]` | 获取最后一帧的调色板（最多 8 色） |
| `onFrame(callback)` | `() => void` | 注册帧回调，返回取消注册函数 |
| `simulateFrame(width?, height?, pixelData?)` | `void` | 手动模拟一帧 RGB 数据 |

### RgbFrameData 结构

```typescript
interface RgbFrameData {
  width: number;              // 像素宽度
  height: number;             // 像素高度
  pixels: number[];           // RGB 像素数组 [r0,g0,b0, r1,g1,b1, ...]
  palette: {                  // 调色板（按占比降序）
    color: string;            // 十六进制颜色如 "#4A90D9"
    ratio: number;            // 占比 0-1
  }[];
}
```

### 内部机制

1. **插件加载模拟**：启动后 200ms 加载 `led` 插件，500ms 加载 `cue` 插件，通过 `wallpaperPluginListener.onPluginLoaded` 通知
2. **帧捕获**：项目通过 `window.wpPlugins.led.setAllDevicesByImageData(imageData, width, height)` 发送 LED 数据时，自动解码并存储
3. **ImageData 解码**：RGB 像素数组 → 创建 canvas `ImageData`（含 alpha 通道），可直接用于 `ctx.putImageData()`
4. **调色板提取**：将画面分为 10×10 网格，对每个格子取平均色并量化到 16 阶，聚合后取前 8 种

### 示例

```typescript
// 获取并绘制最后一帧
const frame = kit.rgb.getLastFrame();
if (frame) {
  const imgData = kit.rgb.getDecodedImageData();
  canvas.getContext('2d')!.putImageData(imgData!, 0, 0);
  console.log('调色板:', kit.rgb.getPalette());
}

// 监听帧数据
const unsub = kit.rgb.onFrame(({ width, height, pixels, palette }) => {
  console.log(`RGB 帧: ${width}x${height}, ${palette.length} 色`);
});
// 取消监听
unsub();

// 手动模拟一帧（彩虹渐变）
kit.rgb.simulateFrame(100, 20);
```

---

## LifecycleController — 生命周期控制

模拟 WE 的暂停/恢复/FPS 变化等生命周期操作。

### 方法

| 方法 | 说明 | WE 对应行为 |
|---|---|---|
| `pause()` | 模拟 WE 暂停壁纸 | 调用 `wallpaperPropertyListener.setPaused(true)` |
| `resume()` | 模拟 WE 恢复壁纸 | 调用 `wallpaperPropertyListener.setPaused(false)` |
| `setFps(fps)` | 模拟 FPS 限制变化 | 调用 `wallpaperPropertyListener.applyGeneralProperties({ fps })` |

### 只读属性

| 属性 | 类型 | 说明 |
|---|---|---|
| `isPaused` | `boolean` | 是否处于暂停状态 |

### 暂停背后的行为

`setPaused` 经过 `propertyMock` 的处理，会：
1. 调用项目中已注册的 `setPaused` 回调
2. 如果项目没有注册，触发 `__we_paused_change` 自定义事件
3. 项目内会暂停音频播放、停止 RGB 帧推送、暂停粒子/流体效果

### Task 0-1 — 暂停 CSS 注入

`kit.lifecycle.pause()` 额外模拟 WE 的 HTML/CSS 暂停行为：
1. `<html>` 元素添加 class `wpxPausePseudoAnimationAll`
2. 注入 `<style id="__we_pause_animation">` 规则：
   ```css
   .wpxPausePseudoAnimationAll * {
     animation-play-state: paused !important;
   }
   ```
3. `kit.lifecycle.resume()` 移除 class 和 style 元素
4. `kit.destroy()` 时自动清理

### FPS 变化

`applyGeneralProperties({ fps })` 会：
1. 调用项目中已注册的 `applyGeneralProperties` 回调
2. 如果项目没有注册，仅输出日志

---

## PropertiesController — 配置项控制

从 `project.json` 读取 `general.properties` 定义，提供属性可见性查询、翻译键丢失检查等功能。

### 方法

| 方法 | 返回值 | 说明 |
|---|---|---|
| `getProperty(key)` | `ProjectPropertyDef \| undefined` | 获取单个属性的定义 |
| `getAllProperties()` | `ProjectPropertyDef[]` | 获取所有属性的定义列表 |
| `getVisibility(key)` | `PropertyVisibility` | 查询单个属性的可见性状态（含条件求值） |
| `getAllVisibility()` | `PropertyVisibility[]` | 查询所有属性的可见性状态 |
| `checkTranslation(key)` | `PropertyTranslationStatus` | 检查单个属性的翻译键是否丢失 |
| `getMissingTranslations()` | `PropertyTranslationStatus[]` | 获取所有翻译丢失的属性 |
| `getVisibleProperties()` | `ProjectPropertyDef[]` | 获取当前可见的属性列表 |
| `getCurrentValues()` | `Record<string, unknown>` | 获取所有属性的当前值 |
| `reloadProperties()` | `Promise<void>` | 从 project.json 重新加载属性定义 |

### ProjectPropertyDef 结构

```typescript
interface ProjectPropertyDef {
  key: string;                          // 属性键，如 "rgb_show"
  type: 'bool' | 'slider' | 'combo' | 'color' | 'text' | 'textinput' | 'file' | 'directory' | 'group';
  value: unknown;                       // 当前值
  text?: string;                        // i18n key，如 "ui_rgb_show"
  displayName?: string;                 // 从 localization 解析的可读名称，如 "RGB灯光"
  missingTranslation?: boolean;         // 翻译是否存在（false = 用 key 当 fallback）
  min?: number;                         // slider 最小值
  max?: number;                         // slider 最大值
  options?: { value: unknown; label: string }[];  // combo 选项
  condition?: string;                   // 可见性条件表达式
  order?: number;                       // 排序
}
```

### PropertyVisibility 结构

```typescript
interface PropertyVisibility {
  key: string;              // 属性 key
  visible: boolean;         // 当前是否可见
  condition: string | null; // 条件表达式（原始字符串）
  blockedBy?: string;       // 导致不可见的属性名
  blockedValue?: unknown;   // 导致不可见的属性的当前值
}
```

### PropertyTranslationStatus 结构

```typescript
interface PropertyTranslationStatus {
  key: string;              // 属性 key
  i18nKey: string;          // i18n 翻译键
  missing: boolean;         // 翻译是否丢失
  displayName: string;      // 当前显示的名称
}
```

### 可见性条件求值

支持 project.json 中的 `condition` 表达式语法：

- 比较：`.value == X`, `.value != X`
- 布尔值：`true`, `false`
- 数字：整数和浮点数
- 字符串：`'单引号'` 或 `"双引号"`
- 组合：`&&` (AND), `||` (OR)
- 括号：`(expr)`

**示例条件：**
```
showDate.value == true && DateX.value > 0
visual_audio_model.value == 1 && ColorMode.value == 2
```

### 语言匹配策略

`projectJsonReader` 根据浏览器语言自动匹配合适的翻译：

1. 精确匹配（如 `"zh-CN"` → `"zh-cn"`）
2. 语言前缀匹配（如 `"zh-CN"` → `"zh"`）
3. 回退到 `"en-us"`
4. 首个可用语言

### 示例

```typescript
// 获取属性定义
const prop = kit.properties.getProperty('rgb_show');
console.log(prop?.displayName, prop?.value);

// 检查可见性
const vis = kit.properties.getVisibility('rgb_show');
if (!vis.visible) {
  console.log(`被 ${vis.blockedBy} = ${vis.blockedValue} 隐藏`);
}

// 检查翻译丢失
const missing = kit.properties.getMissingTranslations();
console.log(`有 ${missing.length} 个属性翻译丢失:`, missing.map(m => m.i18nKey));

// 获取当前可见的属性
const visible = kit.properties.getVisibleProperties();
console.log(`当前可见 ${visible.length} 个属性`);
```

---

## 类型定义参考

### PlaybackState

```typescript
type PlaybackState = 'playing' | 'paused' | 'stopped';
```

### Wallpaper Engine 全局 API 模拟

dev-kit 在 `window` 上注入以下全局 API：

| 全局 API | 用途 |
|---|---|
| `window.wallpaperPropertyListener` | 属性监听（applyUserProperties、setPaused、applyGeneralProperties 等） |
| `window.wallpaperPluginListener` | 插件加载监听 |
| `window.wpPlugins.led` | LED 插件 `setAllDevicesByImageData` |
| `window.wallpaperMediaIntegration` | 媒体集成常量 |
| `window.wallpaperRegisterAudioListener` | 音频监听注册 |
| `window.wallpaperRegisterMediaStatusListener` | 媒体状态监听注册 |
| `window.wallpaperRegisterMediaPropertiesListener` | 媒体属性监听注册 |
| `window.wallpaperRegisterMediaThumbnailListener` | 媒体缩略图监听注册 |
| `window.wallpaperRegisterMediaPlaybackListener` | 媒体播放状态监听注册 |
| `window.wallpaperRegisterMediaTimelineListener` | 媒体时间线监听注册 |

---

## Agent 使用示例

以下是适用于 AI agent（如 GitHub Copilot、Claude）的典型使用模式：

### 场景 1：测试媒体集成

```typescript
const kit = createWeDevKit({ panel: false, audio: false });

// 播放音乐
kit.media.play();

// 等待几秒后切曲
await new Promise(r => setTimeout(r, 3000));
kit.media.nextTrack();

// 检查当前曲目
const track = kit.media.getCurrentTrack();
console.log(`现在播放: ${track.title} - ${track.artist}`);

// 暂停
kit.media.pause();
```

### 场景 2：检查属性翻译

```typescript
const kit = createWeDevKit({ panel: false });

// 等待 project.json 加载
await new Promise(r => setTimeout(r, 1000));

// 检查哪些属性缺少翻译
const bad = kit.properties.getMissingTranslations();
if (bad.length > 0) {
  console.log('需要补充翻译的键:', bad.map(b => b.i18nKey));
}

// 检查特定属性
const vis = kit.properties.getVisibility('audio_visual_model');
if (!vis.visible) {
  console.log(`原因: ${vis.blockedBy} = ${vis.blockedValue}`);
}

// 获取所有可见属性
const visProps = kit.properties.getVisibleProperties();
```

### 场景 3：模拟 RGB 数据

```typescript
const kit = createWeDevKit({ panel: false });

// 注册 RGB 回调
kit.rgb.onFrame((frame) => {
  const ctx = document.getElementById('preview')!.getContext('2d')!;
  const imgData = new ImageData(
    new Uint8ClampedArray(frame.pixels.flatMap(p => [p, 255])),
    frame.width
  );
  ctx.putImageData(imgData, 0, 0);
});

// 手动模拟一帧
kit.rgb.simulateFrame(100, 20);
```

### 场景 4：生命周期测试

```typescript
const kit = createWeDevKit({ panel: false });

// 壁纸正常运行
console.log('暂停:', kit.lifecycle.isPaused);

// 模拟暂停
kit.lifecycle.pause();
console.log('暂停:', kit.lifecycle.isPaused);

// 模拟恢复
kit.lifecycle.resume();

// 模拟 FPS 限制
kit.lifecycle.setFps(15);
```

### 场景 5：音频开关 + 暂停 CSS

```typescript
const kit = createWeDevKit({ panel: false });

// 检查音频状态
console.log('音频开启:', kit.state.isAudioEnabled); // true

// 关闭音频（音频帧不再分发到 wallpaperRegisterAudioListener）
kit.setAudioEnabled(false);

// 重新开启
kit.setAudioEnabled(true);
```

### 场景 6：暂停 CSS 注入模拟

```typescript
const kit = createWeDevKit({ panel: false });

// 模拟 WE 暂停 — <html> 会添加 wpxPausePseudoAnimationAll class，
// 并注入 CSS 规则暂停所有元素的 animation
kit.lifecycle.pause();
console.log(kit.lifecycle.isPaused); // true
// 检查 html class
console.log(document.documentElement.classList.contains('wpxPausePseudoAnimationAll')); // true

// 恢复 — class 和 CSS 规则会被移除
kit.lifecycle.resume();
```

### 场景 7：完整初始化 + 销毁

```typescript
const kit = createWeDevKit({
  audio: { amplitude: 0.5, bassBoost: 1.0 },
  media: { autoCycle: true },
  rgb: true,
  lifecycle: true,
  properties: true,
});

// ... 使用 kit ...

// 清理所有
kit.destroy();
```
