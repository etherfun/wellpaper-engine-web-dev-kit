/**
 * wallpaper-engine-web-dev-kit — Panel 国际化字典
 *
 * 支持 en-US / zh-CN，基于 navigator.language 自动选择。
 */

export type PanelLocale = 'en-US' | 'zh-CN';

export interface PanelMessages {
  // 标题栏
  title: string;
  minimize: string;
  restore: string;
  close: string;

  // 区段标题
  sectionAudio: string;
  sectionMedia: string;
  sectionRgb: string;
  sectionLifecycle: string;
  sectionProperties: string;

  // 音频
  audioInput: string;
  amplitude: string;
  bassBoost: string;
  speed: string;
  mode: string;
  mixed: string;
  beats: string;
  melody: string;

  // 媒体
  previousTrack: string;
  play: string;
  pause: string;
  stop: string;
  nextTrack: string;
  track: string;
  title_: string;
  artist: string;
  album: string;
  uploadCover: string;
  coverAlt: string;

  // RGB
  waitingRgb: string;

  // 生命周期
  paused: string;
  running: string;
  pauseBtn: string;
  resumeBtn: string;
  fpsLimit: string;
  unlimited: string;

  // 属性
  items: string;
  showKeys: string;
  showName: string;
  searchPlaceholder: string;
  filterAll: string;
  filterVisible: string;
  filterHidden: string;
  translationAll: string;
  translationMissing: string;
  translationOk: string;
  visibleStat: string;
  hiddenStat: string;
  conditionMet: string;
  conditionNotMet: string;
  noCondition: string;
  missingTransTitle: string;
}

const DICT_EN: PanelMessages = {
  title: 'WE Dev Kit',
  minimize: 'Minimize',
  restore: 'Restore',
  close: 'Close',

  sectionAudio: '▶ Audio Simulator',
  sectionMedia: '▶ Media Integration',
  sectionRgb: '▶ RGB LED',
  sectionLifecycle: '▶ Lifecycle',
  sectionProperties: '▶ Properties',

  audioInput: 'Audio Input',
  amplitude: 'Amplitude',
  bassBoost: 'Bass Boost',
  speed: 'Speed',
  mode: 'Mode',
  mixed: 'Mixed',
  beats: 'Beats',
  melody: 'Melody',

  previousTrack: 'Previous track',
  play: 'Play',
  pause: 'Pause',
  stop: 'Stop',
  nextTrack: 'Next track',
  track: 'Track',
  title_: 'Title',
  artist: 'Artist',
  album: 'Album',
  uploadCover: 'Click to select cover or drag image here',
  coverAlt: 'cover',

  waitingRgb: 'Waiting for RGB data…',

  paused: 'Paused',
  running: '▶ Running',
  pauseBtn: '⏸ Pause',
  resumeBtn: '▶ Resume',
  fpsLimit: 'FPS Limit',
  unlimited: 'Unlimited',

  items: 'items',
  showKeys: 'Show Keys',
  showName: 'Show Names',
  searchPlaceholder: 'Search properties...',
  filterAll: 'All',
  filterVisible: 'Visible',
  filterHidden: 'Hidden',
  translationAll: 'All Translations',
  translationMissing: '⚠ Missing',
  translationOk: 'OK',
  visibleStat: 'visible',
  hiddenStat: 'hidden',
  conditionMet: 'Condition met, visible to user',
  conditionNotMet: 'Condition not met, hidden from user',
  noCondition: 'No condition',
  missingTransTitle: 'Missing translation: "{key}" → falls back to key name',
};

const DICT_ZH: PanelMessages = {
  title: 'WE Dev Kit',
  minimize: '最小化',
  restore: '还原',
  close: '关闭',

  sectionAudio: '▶ 音频模拟',
  sectionMedia: '▶ 媒体集成',
  sectionRgb: '▶ RGB 灯光',
  sectionLifecycle: '▶ 生命周期',
  sectionProperties: '▶ 配置项',

  audioInput: '音频输入',
  amplitude: '振幅',
  bassBoost: '低频增益',
  speed: '变化速度',
  mode: '模式',
  mixed: '混合',
  beats: '节拍',
  melody: '旋律',

  previousTrack: '上一首',
  play: '播放',
  pause: '暂停',
  stop: '停止',
  nextTrack: '下一首',
  track: '曲目',
  title_: '标题',
  artist: '艺术家',
  album: '专辑',
  uploadCover: '点击选择封面 或 拖拽图片到此处',
  coverAlt: '封面',

  waitingRgb: '等待 RGB 数据…',

  paused: '已暂停',
  running: '▶ 运行中',
  pauseBtn: '⏸ 暂停',
  resumeBtn: '▶ 继续',
  fpsLimit: 'FPS 限制',
  unlimited: '不限',

  items: '项',
  showKeys: '显示键名',
  showName: '显示名称',
  searchPlaceholder: '搜索配置项…',
  filterAll: '全部',
  filterVisible: '可见',
  filterHidden: '隐藏',
  translationAll: '全部翻译',
  translationMissing: '⚠ 翻译丢失',
  translationOk: '翻译正常',
  visibleStat: '可见',
  hiddenStat: '隐藏',
  conditionMet: '条件满足，用户可见',
  conditionNotMet: '条件未满足，用户隐藏',
  noCondition: '无条件限制',
  missingTransTitle: '缺失翻译: "{key}" → 回退到键名',
};

/** 根据浏览器语言选择字典 */
export function resolvePanelMessages(fallback?: PanelLocale): PanelMessages {
  const lang = fallback ?? navigator.language;
  if (lang.toLowerCase().startsWith('zh')) return DICT_ZH;
  return DICT_EN;
}

// ---- 可变当前语言（避免 tsup 闭包重命名问题） ----
let _currentMessages: PanelMessages = DICT_EN;

/** 设置当前面板语言 */
export function setPanelMessages(msgs: PanelMessages): void {
  _currentMessages = msgs;
}

/** 获取当前面板语言 */
export function getPanelMessages(): PanelMessages {
  return _currentMessages;
}
