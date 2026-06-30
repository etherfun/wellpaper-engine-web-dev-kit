# @perfectwall/we-dev-kit

Wallpaper Engine 运行时模拟层 — 在浏览器中完整模拟 WE 注入的 API 行为。

## 用途

在浏览器开发完美壁纸时，无需在 WE 编辑器中反复加载壁纸即可：

- 查看属性配置面板
- 调试音频可视化（模拟 128 元素频谱）
- 测试媒体集成（预置曲库 + 自定义曲目/封面）
- 预览 RGB LED 灯效（截获并解码 `setAllDevicesByImageData`）
- 模拟生命周期事件（pause/resume/FPS 变化）
- 从 `project.json` 读取属性定义，支持语言切换

## 使用方式

### 在 perfectwall 项目中

```bash
# 构建 dev-kit
cd packages/we-dev-kit && npm run build

# 分步时直接用 bundle 加载：
# <script src="./packages/we-dev-kit/dist/index.global.js"></script>

# 推荐使用 build-dev.mjs（在 perfectwall 根目录）:
# cd .. && node scripts/build-dev.mjs
```

```html
<script src="./we-dev-kit/index.global.js"></script>
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

### API

```typescript
import { createWeDevKit } from '@perfectwall/we-dev-kit';

const kit = createWeDevKit({
  panel: { position: { x: 100, y: 50 } },
  audio: { amplitude: 0.6, bassBoost: 1.2 },
  media: { autoCycle: true, cycleIntervalMs: 8000 },
  rgb: true,
  lifecycle: true,
});

kit.destroy();      // 清理所有 mock
kit.togglePanel();  // 切换控制面板
kit.nextTrack();    // 手动切曲
```

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
  lifecycleMock.ts       # 生命周期事件
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

MIT
