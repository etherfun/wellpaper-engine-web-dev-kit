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

export interface RgbConfig {
  /** 是否尝试连接到真实的 Razer Chroma 硬件（需安装 Razer Synapse + Chroma SDK） */
  realRazer?: boolean;
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
  /** RGB LED 模拟（可传 RgbConfig 开启真 Razer 硬件连接） */
  rgb?: boolean | RgbConfig;
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
}

export interface DevKitState {
  isLoaded: boolean;
  isPanelVisible: boolean;
  currentTrackIndex: number;
  playbackState: PlaybackState;
  isRgbPluginLoaded: boolean;
}

export type PlaybackState = 'playing' | 'paused' | 'stopped';

// ---- 内部状态类型（不导出） ----

/** WE 属性描述（来自 project.json general.properties） */
export interface ProjectPropertyDef {
  key: string;
  type: 'bool' | 'slider' | 'combo' | 'color' | 'text' | 'textinput' | 'file' | 'directory' | 'group';
  value: unknown;
  /** i18n key（project.json 中的 text 字段，如 "ui_rgb_show"） */
  text?: string;
  /** 从 localization 解析出的可读名称，如 "RGB灯光" */
  displayName?: string;
  /** 当前语言的翻译是否存在（false 表示用 key 当 fallback） */
  missingTranslation?: boolean;
  /** 语言的 i18n key（combo 选项的 label） */
  optionLabels?: Record<string, string>;
  min?: number;
  max?: number;
  options?: { value: unknown; label: string }[];
  condition?: string;
  order?: number;
}

export interface InternalState {
  config: RequiredConfig;
  audioSimulator?: AudioSimulatorController;
  mediaMock?: MediaMockController;
  panel?: PanelController;
  cleanupFns: (() => void)[];
  isRgbPluginLoaded: boolean;  // 补充缺失字段
  onDestroy: (fn: () => void) => void;
}

export interface AudioSimulatorController {
  start(): void;
  stop(): void;
  pushFrame(): void;
  setAmplitude(v: number): void;
  setBassBoost(v: number): void;
  setVariationSpeed(v: number): void;
  setMode(mode: AudioMode): void;
  isRunning: boolean;
}

export type AudioMode = 'beats' | 'melody' | 'mixed';

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
  currentIndex: number;
  playbackState: PlaybackState;
  tracks: MockTrack[];
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
  isVisible: boolean;
}

export interface ResolvedAudioConfig extends Required<AudioConfig> {}
export interface ResolvedMediaConfig extends Required<MediaConfig> {}
export interface ResolvedPanelConfig extends Required<PanelConfig> {}
export interface ResolvedRgbConfig extends Required<RgbConfig> {}

export interface RequiredConfig extends Required<DevKitConfig> {
  audio: ResolvedAudioConfig;
  media: ResolvedMediaConfig;
  panel: ResolvedPanelConfig;
  rgb: ResolvedRgbConfig;
}
