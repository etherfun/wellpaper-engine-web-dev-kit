// ============================================================
// WE Dev Kit — Type definitions
// ============================================================

// ---- Configuration ----

export interface AudioConfig {
  /** 振幅 0-1, 默认 0.6 */
  amplitude?: number;
  /** 低频增益, 默认 1.2 */
  bassBoost?: number;
  /** 变化速度, 默认 1.0 */
  variationSpeed?: number;
  /** 帧率, 默认 30 */
  frameRate?: number;
}

export interface MediaConfig {
  /** 自定义曲库, 不传则使用内置默认曲库 */
  tracks?: MockTrack[];
  /** 自动轮换, 默认 true */
  autoCycle?: boolean;
  /** 轮换间隔 ms, 默认 8000 */
  cycleIntervalMs?: number;
}

export interface MockTrack {
  title: string;
  artist: string;
  album?: string;
  genre?: string;
  /** 时长（秒）, 默认 240 */
  duration?: number;
  /** Base64 data URI 封面 */
  thumbnail?: string;
  primaryColor?: string;
  secondaryColor?: string;
  tertiaryColor?: string;
  textColor?: string;
  highContrastColor?: string;
}

export interface PanelConfig {
  /** 面板初始位置 */
  position?: { x: number; y: number };
  /** 默认折叠, 默认 false */
  collapsed?: boolean;
  /** 暗色/亮色主题, 默认 'dark' */
  theme?: 'light' | 'dark';
}

export interface DevKitConfig {
  /** 总开关, 默认 true */
  enabled?: boolean;
  /** 自动检测 WE 环境并跳过, 默认 true */
  autoDetect?: boolean;
  /** 音频模拟 */
  audio?: boolean | AudioConfig;
  /** 媒体集成模拟 */
  media?: boolean | MediaConfig;
  /** 属性监听补齐 */
  properties?: boolean;
  /** RGB LED 模拟 */
  rgb?: boolean;
  /** 生命周期事件 */
  lifecycle?: boolean;
  /** 控制面板 */
  panel?: boolean | PanelConfig;
}

// ---- DevKitInstance (返回值) ----

export interface DevKitInstance {
  /** 销毁所有 mock，恢复原始状态 */
  destroy(): void;
  /** 切换控制面板显示 */
  togglePanel(): void;
  /** 获取当前配置（只读快照） */
  getConfig(): Readonly<DevKitConfig>;
  /** 手动触发一次属性推送 */
  pushProperties(props: Record<string, unknown>): void;
  /** 手动触发音频数据推送 */
  pushAudioFrame(): void;
  /** 手动切换曲目 */
  nextTrack(): void;
  /** 当前模拟状态 */
  state: DevKitState;

  // ---- 子控制器（结构化 API，方便 agent 使用） ----

  /** 设置音频数据传入开关（Task 0） */
  setAudioEnabled(enabled: boolean): void;
  /** 媒体集成控制：自定义 track、播放控制等 */
  media: MediaController;
  /** RGB 数据获取：原始像素、解码图片、调色板 */
  rgb: RgbController;
  /** 生命周期控制：暂停/恢复/FPS */
  lifecycle: LifecycleController;
  /** 配置项控制：可见性查询、翻译丢失查询 */
  properties: PropertiesController;
}

export interface DevKitState {
  isLoaded: boolean;
  isPanelVisible: boolean;
  currentTrackIndex: number;
  playbackState: PlaybackState;
  isRgbPluginLoaded: boolean;
  /** 音频数据传入是否启用（Task 0） */
  isAudioEnabled: boolean;
}

export type PlaybackState = 'playing' | 'paused' | 'stopped';

// ---- 结构化子控制器（agent 友好 API） ----

/**
 * 媒体集成控制器
 * 提供自定义 track、暂停/播放/停止、进度控制等完整媒体控制能力。
 */
export interface MediaController {
  /** 播放 */
  play(): void;
  /** 暂停 */
  pause(): void;
  /** 停止 */
  stop(): void;
  /** 下一首 */
  nextTrack(): void;
  /** 上一首 */
  prevTrack(): void;
  /** 跳转到指定索引的曲目 */
  setTrack(index: number): void;
  /** 覆盖当前曲目的元数据（不切换曲目） */
  setCustomTrack(track: Partial<MockTrack>): void;
  /** 设置自定义封面（data URI），自动提取颜色 */
  setCustomThumbnail(dataUri: string): void;
  /** 按百分比 (0-100) 跳转到指定位置 */
  seek(pct: number): void;
  /** 获取当前播放位置（秒） */
  getPosition(): number;
  /** 获取当前曲目信息 */
  getCurrentTrack(): MockTrack;
  /** 当前曲目索引 */
  readonly currentIndex: number;
  /** 当前播放状态 */
  readonly playbackState: PlaybackState;
  /** 曲库列表 */
  readonly tracks: MockTrack[];
}

/**
 * RGB 数据控制器
 * 获取原始像素数据、解码后的 ImageData、调色板，注册帧回调。
 */
export interface RgbController {
  /** 获取最后一帧的原始数据（含 pixels + palette） */
  getLastFrame(): RgbFrameData | null;
  /** 获取最后一帧解码后的 ImageData（可用于 canvas 绘制） */
  getDecodedImageData(): ImageData | null;
  /** 获取最后一帧的调色板（最多 8 色 + 占比） */
  getPalette(): { color: string; ratio: number }[];
  /** 注册帧回调，返回取消注册函数 */
  onFrame(callback: RgbFrameCallback): () => void;
  /** 手动模拟一帧 RGB 数据（不依赖插件） */
  simulateFrame(width?: number, height?: number, pixelData?: number[]): void;
}

/**
 * 生命周期控制器
 * 模拟 WE 的暂停/恢复/FPS 变化等生命周期操作。
 */
export interface LifecycleController {
  /** 模拟 WE 暂停壁纸 */
  pause(): void;
  /** 模拟 WE 恢复壁纸 */
  resume(): void;
  /** 模拟 FPS 限制变化 */
  setFps(fps: number): void;
  /** 是否处于暂停状态 */
  readonly isPaused: boolean;
}

/**
 * 单个属性的可见性状态
 */
export interface PropertyVisibility {
  /** 属性 key */
  key: string;
  /** 当前是否可见 */
  visible: boolean;
  /** 条件表达式（原始字符串） */
  condition: string | null;
  /** 导致不可见的属性名（如果因条件不满足） */
  blockedBy?: string;
  /** 导致不可见的属性的当前值 */
  blockedValue?: unknown;
}

/**
 * 单个属性的翻译丢失状态
 */
export interface PropertyTranslationStatus {
  /** 属性 key */
  key: string;
  /** i18n 翻译键 */
  i18nKey: string;
  /** 翻译是否丢失（true = 用 key 当 fallback） */
  missing: boolean;
  /** 当前显示的名称 */
  displayName: string;
}

/**
 * 配置项控制器
 * 查询配置项可见性、翻译键丢失状态、获取属性定义列表。
 * 支持添加/编辑/删除属性定义（影响内存中的缓存，可使用 saveToJsonFile 导出）。
 */
export interface PropertiesController {
  /** 获取单个属性的定义 */
  getProperty(key: string): ProjectPropertyDef | undefined;
  /** 获取所有属性的定义列表 */
  getAllProperties(): ProjectPropertyDef[];
  /** 查询单个属性的可见性状态 */
  getVisibility(key: string): PropertyVisibility;
  /** 查询所有属性的可见性状态 */
  getAllVisibility(): PropertyVisibility[];
  /** 检查单个属性的翻译键是否丢失 */
  checkTranslation(key: string): PropertyTranslationStatus;
  /** 获取所有翻译丢失的属性 */
  getMissingTranslations(): PropertyTranslationStatus[];
  /** 获取当前可见的属性列表 */
  getVisibleProperties(): ProjectPropertyDef[];
  /** 获取所有属性的当前值（{ key: value } 格式） */
  getCurrentValues(): Record<string, unknown>;
  /** 从 project.json 重新加载属性定义 */
  reloadProperties(): Promise<void>;
  /** 添加一个新的属性定义 */
  addProperty(def: PropertyDefInput): ProjectPropertyDef;
  /** 更新一个已有属性的定义 */
  updateProperty(key: string, def: Partial<PropertyDefInput>): ProjectPropertyDef | undefined;
  /** 删除一个属性定义 */
  removeProperty(key: string): boolean;
  /** 注册属性变更通知回调（面板使用） */
  _onChange?: (props: ProjectPropertyDef[]) => void;
}

/** 添加/编辑属性时的输入类型 */
export interface PropertyDefInput {
  key: string;
  type: ProjectPropertyDef['type'];
  value?: unknown;
  text?: string;
  displayName?: string;
  min?: number;
  max?: number;
  /** slider 步进值 */
  step?: number;
  /** slider 小类精度 */
  precision?: number;
  /** slider 是否允许小数 */
  fraction?: boolean;
  /** file/directory 的文件类型过滤（如 "video"） */
  fileType?: string;
  /** directory 加载模式（"ondemand" | "fetchall"） */
  mode?: string;
  options?: { value: unknown; label: string }[];
  condition?: string;
  order?: number;
  /** WE project.json 中的 index 字段，影响 UI 渲染排序 */
  index?: number;
}

export type PropertyType =
  | 'bool'
  | 'slider'
  | 'combo'
  | 'color'
  | 'text'
  | 'textinput'
  | 'file'
  | 'directory'
  | 'group';

export interface ProjectPropertyDef {
  key: string;
  type: PropertyType;
  value: unknown;
  /** project.json 中的 text 字段（可以是 i18n key 如 "ui_rgb_show"，也可以是直接的中文描述如 "颜色配置项"） */
  text?: string;
  /** 从 localization 解析出的可读名称，如 "RGB灯光"；无匹配时回退到 text 字段本身 */
  displayName?: string;
  /** 当前语言的翻译是否存在（false 表示用 text 当 fallback） */
  missingTranslation?: boolean;
  /** 语言的 i18n key（combo 选项的 label） */
  optionLabels?: Record<string, string>;
  min?: number;
  max?: number;
  /** slider 步进值 */
  step?: number;
  /** slider 小类精度 */
  precision?: number;
  /** slider 是否允许小数 */
  fraction?: boolean;
  /** file/directory 的文件类型过滤（如 "video"） */
  fileType?: string;
  /** directory 加载模式（"ondemand" | "fetchall"） */
  mode?: string;
  options?: { value: unknown; label: string }[];
  condition?: string;
  order?: number;
  /** WE project.json 中的 index 字段，影响 UI 渲染排序 */
  index?: number;
}

/** project.json 中属性定义的原始结构 */
export interface RawPropertyDef {
  type: string;
  value?: unknown;
  text?: string;
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
  fraction?: boolean;
  fileType?: string;
  mode?: string;
  options?: { value: unknown; label: string }[];
  condition?: string;
  order?: number;
  index?: number;
}

export interface InternalState {
  config: RequiredConfig;
  audioSimulator?: AudioSimulatorController;
  mediaMock?: MediaMockController;
  panel?: PanelController;
  rgbMock?: RgbMockController;
  cleanupFns: (() => void)[];
  isRgbPluginLoaded: boolean;
  onDestroy: (fn: () => void) => void;
}

export interface AudioSimulatorController {
  start(): void;
  stop(): void;
  pushFrame(): void;
  setAmplitude(v: number): void;
  fadeTo(target: number, durationMs?: number): void;
  setBassBoost(v: number): void;
  setVariationSpeed(v: number): void;
  setMode(mode: AudioMode): void;
  readonly isRunning: boolean;
}

export type AudioMode = 'beats' | 'melody' | 'mixed';

/** 音频源类型：模拟数据 或 真实 MP3 频谱 */
export type AudioSourceType = 'simulated' | 'mp3';

/**
 * AudioBridge 可观测状态（UI 订阅用）。
 * 收敛所有音频相关状态到单一来源。
 */
export interface AudioBridgeState {
  enabled: boolean;
  source: AudioSourceType;
  mp3Loaded: boolean;
  mp3Playing: boolean;
}

/**
 * AudioBridge — 音频模块唯一状态机和调度中枢。
 *
 * 接管所有音频相关状态（启用/源/播放），收敛 listener 注册、
 * 帧分发、零帧归零、源切换协调等逻辑，消除 window 全局变量
 * 和分散在 index.ts / panel 中的协调闭包。
 */
export interface AudioBridge {
  /** 注入模拟音频生成器 */
  setAudioSimulator(sim: AudioSimulatorController): void;
  /** 注入 MP3 播放器 */
  setMp3Player(mp3: Mp3PlayerController): void;

  /** 注册 wallpaper 音频回调（替代 window.wallpaperRegisterAudioListener） */
  addListener(cb: (data: Float32Array) => void): () => void;

  /** 全局音频开关（关闭后通知 UI + 停止所有源 + 零帧归零） */
  setEnabled(enabled: boolean): void;
  /** 切换音频源（模拟 ↔ 真实频谱） */
  setSource(source: AudioSourceType): void;

  /** MP3 生命周期通知（由 panel 回调调用） */
  onMp3Loaded(): void;
  onMp3Play(): void;
  onMp3Pause(): void;
  onMp3Stop(): void;

  /** 获取只读状态快照 */
  getState(): AudioBridgeState;
  /** 订阅状态变更（供 UI 同步），首次调用时自动推送当前状态 */
  subscribe(cb: (state: AudioBridgeState) => void): () => void;

  /** 销毁，清理所有资源和定时器 */
  destroy(): void;
}

/**
 * MP3 播放器控制器
 * 提供 MP3 文件加载、播放控制和真实频谱数据提取。
 */
export interface Mp3PlayerController {
  /** 加载 MP3 文件（自动解码） */
  loadFile(file: File): Promise<void>;
  /** 播放 */
  play(): void;
  /** 暂停 */
  pause(): void;
  /** 停止 */
  stop(): void;
  /** 按百分比 (0-100) 跳转 */
  seek(percent: number): void;
  /** 设置音量 0-1 */
  setVolume(v: number): void;
  /** 设置频谱响应灵敏度 0.1–1（越低越平滑），默认 0.5 */
  setSensitivity(v: number): void;
  /** 设置输出上限 0.1–1（限制最大幅值），默认 1.0 */
  setCeiling(v: number): void;
  /** 设置是否循环播放，默认 true */
  setLoop(enabled: boolean): void;
  /** 切换是否使用真实频谱替代模拟数据 */
  setActive(active: boolean): void;
  /** 销毁清理 */
  destroy(): void;
  /** 是否正在播放 */
  readonly isPlaying: boolean;
  /** 是否已加载文件 */
  readonly isLoaded: boolean;
  /** 真实频谱是否处于激活状态 */
  readonly isActive: boolean;
  /** 当前播放位置（秒） */
  readonly currentTime: number;
  /** 总时长（秒） */
  readonly duration: number;
  /** 文件名 */
  readonly fileName: string;
}

export interface MediaMockController {
  play(): void;
  pause(): void;
  stop(): void;
  nextTrack(): void;
  prevTrack(): void;
  setTrack(index: number): void;
  setCustomTrack(track: Partial<MockTrack>): void;
  setCustomThumbnail(dataUri: string): void;
  seek(pct: number): void;
  /** 获取当前播放位置（秒） */
  getPosition(): number;
  getCurrentTrack(): MockTrack;
  readonly currentIndex: number;
  readonly playbackState: PlaybackState;
  readonly tracks: MockTrack[];
}

export interface RgbMockController {
  getLastFrame(): RgbFrameData | null;
  getDecodedImageData(): ImageData | null;
  getPalette(): { color: string; ratio: number }[];
  onFrame(cb: RgbFrameCallback): () => void;
  simulateFrame(width?: number, height?: number, pixelData?: number[]): void;
}

export interface LifecycleMockController {
  simulatePause(): void;
  simulateResume(): void;
  simulateFpsChange(fps: number): void;
  readonly isPaused: boolean;
}

export interface PropertyMockController {
  readonly patch: { restore: () => void };
}

export interface RgbFrameData {
  /** 像素宽度 */
  width: number;
  /** 像素高度 */
  height: number;
  /** RGB 像素数组 [r0,g0,b0, r1,g1,b1, ...] */
  pixels: number[];
  /** 简化色彩块（每种颜色及占比），最多 8 种 */
  palette: { color: string; ratio: number }[];
}

export type RgbFrameCallback = (frame: RgbFrameData) => void;

export interface PanelController {
  show(): void;
  hide(): void;
  toggle(): void;
  destroy(): void;
  readonly isVisible: boolean;
  updateRgbFrame(frame: RgbFrameData): void;
  refreshProperties(props: ProjectPropertyDef[]): void;
}

export interface ResolvedAudioConfig extends Required<AudioConfig> {}
export interface ResolvedMediaConfig extends Required<MediaConfig> {}
export interface ResolvedPanelConfig extends Required<PanelConfig> {}

export interface RequiredConfig {
  enabled: boolean;
  autoDetect: boolean;
  audio: ResolvedAudioConfig;
  media: ResolvedMediaConfig;
  properties: boolean;
  rgb: boolean;
  lifecycle: boolean;
  panel: ResolvedPanelConfig;
}