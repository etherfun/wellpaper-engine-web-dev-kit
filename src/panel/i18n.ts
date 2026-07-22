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

  // MP3 导入
  mp3Import: string;
  mp3SelectFile: string;
  mp3FileName: string;
  mp3SourceSimulated: string;
  mp3SourceReal: string;
  mp3Play: string;
  mp3Pause: string;
  mp3Stop: string;
  mp3NoFile: string;
  mp3Volume: string;
  mp3Sensitivity: string;
  mp3Ceiling: string;
  mp3Loop: string;
  mp3Seek: string;
  mp3Duration: string;
  mp3Position: string;

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

  // 文件/目录选择器
  browse: string;
  selectFile: string;
  selectDirectory: string;
  clearFile: string;

  // 属性编辑
  addProperty: string;
  editProperty: string;
  deleteProperty: string;
  exportJson: string;
  save: string;
  cancel: string;
  confirmDelete: string;
  propertyKey: string;
  propertyI18nKey: string;
  propertyType: string;
  propertyValue: string;
  propertyOrder: string;
  propertyIndex: string;
  propertyOptions: string;
  propertyCondition: string;
  propertyFraction: string;
  propertyMin: string;
  propertyMax: string;
  propertyStep: string;
  propertyPrecision: string;
  propertySliderLabel: string;
  propertyFileLabel: string;
  propertyDirectoryLabel: string;
  typeBool: string;
  typeSlider: string;
  typeCombo: string;
  typeColor: string;
  typeText: string;
  typeTextinput: string;
  typeFile: string;
  typeDirectory: string;
  typeGroup: string;
  typeTrue: string;
  typeFalse: string;
  optionLabel: string;
  optionValue: string;
  optionNoOptions: string;
  typeFilterAll: string;
  audioOn: string;
  audioOff: string;
  rgbLoaded: string;
  rgbLoading: string;
  saveButton: string;
  addLangPlaceholder: string;
  placeholderAutoGen: string;
  hintAutoGen: string;
  placeholderIndex: string;
  translationHeader: string;
  translationUntranslated: string;
  translationNoLoc: string;
  defaultMin: string;
  defaultMax: string;
  defaultStep: string;
  defaultPrec: string;
  editPropertyTitle: string;
  addPropertyTitle: string;
  jsonExported: string;
  addOption: string;
  propertyText: string;
  propertyDisplayName: string;
  propertyConditionHelp: string;
  typeChangeConfirm: string;
  continueChange: string;
  cancelChange: string;
  textNotInLocalization: string;
  textInLocalization: string;
  addToLocalization: string;
  typeSpecific: string;
  /** localizable default value labels (for combo/file etc) */
  groupSectionTitle: string;
  defaultLabel: string;
  sliderRange: string;
  minLabel: string;
  maxLabel: string;
  stepLabel: string;
  precisionLabel: string;
  fractionLabel: string;
  videoModeLabel: string;
  ondemandModeLabel: string;
  addRowLabel: string;
  labelLabel: string;
  valueLabel: string;
  noOptionsLabel: string;
  keyRequiredAlert: string;
  fieldRequired: string;
  sectionLocalization: string;
}

const DICT_EN: PanelMessages = {
  title: 'WE Dev Kit',
  minimize: 'Minimize',
  restore: 'Restore',
  close: 'Close',

  sectionAudio: 'Audio Simulator',
  sectionMedia: 'Media Integration',
  sectionRgb: 'RGB LED',
  sectionLifecycle: 'Lifecycle',
  sectionProperties: 'Properties',

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

  mp3Import: 'MP3 Import',
  mp3SelectFile: 'Select MP3 File',
  mp3FileName: 'Filename',
  mp3SourceSimulated: 'Simulated',
  mp3SourceReal: 'Real MP3',
  mp3Play: 'Play',
  mp3Pause: 'Pause',
  mp3Stop: 'Stop',
  mp3NoFile: '(no file loaded)',
  mp3Volume: 'Volume',
  mp3Sensitivity: 'Sensitivity',
  mp3Ceiling: 'Ceiling',
  mp3Loop: 'Loop',
  mp3Seek: 'Seek',
  mp3Duration: 'Duration',
  mp3Position: 'Position',

  paused: 'Paused',
  running: 'Running',
  pauseBtn: 'Pause',
  resumeBtn: 'Resume',
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

  browse: 'Browse',
  selectFile: 'Select File',
  selectDirectory: 'Select Directory',
  clearFile: 'Clear',

  addProperty: '+ Add Property',
  editProperty: 'Edit',
  deleteProperty: 'Del',
  exportJson: '⬇ Export JSON',
  save: 'Save',
  cancel: 'Cancel',
  confirmDelete: 'Delete "{key}"?',
  propertyKey: 'Key',
  propertyI18nKey: 'i18n Key',
  propertyType: 'Type',
  propertyValue: 'Default',
  propertyOrder: 'Order',
  propertyIndex: 'Index',
  propertyOptions: 'Options',
  propertyCondition: 'Condition',
  propertyFraction: 'Allow Fraction',
  propertyMin: 'Min',
  propertyMax: 'Max',
  propertyStep: 'Step',
  propertyPrecision: 'Precision',
  propertySliderLabel: 'Slider',
  propertyFileLabel: 'File',
  propertyDirectoryLabel: 'Directory',
  typeBool: 'Bool',
  typeSlider: 'Slider',
  typeCombo: 'Combo',
  typeColor: 'Color',
  typeText: 'Text',
  typeTextinput: 'Text Input',
  typeFile: 'File',
  typeDirectory: 'Directory',
  typeGroup: 'Group',
  typeFilterAll: 'All Types',
  typeTrue: 'True',
  typeFalse: 'False',
  optionLabel: 'Label',
  optionValue: 'Value',
  optionNoOptions: '(no options)',
  audioOn: 'ON',
  audioOff: 'OFF',
  rgbLoaded: 'loaded',
  rgbLoading: 'loading…',
  saveButton: 'Save',
  addLangPlaceholder: 'Add language…',
  placeholderAutoGen: 'Leave empty for auto-generate',
  hintAutoGen: 'Auto-generated: ',
  placeholderIndex: '(optional)',
  translationHeader: 'Translation / Localization',
  translationUntranslated: '(untranslated)',
  translationNoLoc: 'project.json has no general.localization section',
  defaultMin: 'Min',
  defaultMax: 'Max',
  defaultStep: 'Step',
  defaultPrec: 'Prec',
  editPropertyTitle: 'Edit Property',
  addPropertyTitle: 'Add Property',
  jsonExported: 'JSON exported — check your downloads',
  addOption: '+ Add',
  propertyText: 'i18n key',
  propertyDisplayName: 'Display name',
  propertyConditionHelp: 'e.g. propA.value == 1 && propB.value > 0',
  typeChangeConfirm: 'Changing the type will clear the current default value. Continue?',
  continueChange: 'Continue',
  cancelChange: 'Cancel',
  textNotInLocalization: '⚠ Not found in current localization',
  textInLocalization: '✓ Found in localization',
  addToLocalization: '+ Add',
  typeSpecific: 'Type-specific',
  groupSectionTitle: '── Group ──',
  defaultLabel: 'Default',
  sliderRange: 'Range',
  minLabel: 'Min',
  maxLabel: 'Max',
  stepLabel: 'Step',
  precisionLabel: 'Precision',
  fractionLabel: 'Fractional',
  videoModeLabel: 'Video mode',
  ondemandModeLabel: 'On-demand mode',
  addRowLabel: '+ Add',
  labelLabel: 'Label',
  valueLabel: 'Value',
  noOptionsLabel: '(no options)',
  keyRequiredAlert: 'Key is required',
  fieldRequired: 'required',
  sectionLocalization: 'Localization',
};

const DICT_ZH: PanelMessages = {
  title: 'WE Dev Kit',
  minimize: '最小化',
  restore: '还原',
  close: '关闭',

  sectionAudio: '音频模拟',
  sectionMedia: '媒体集成',
  sectionRgb: 'RGB 灯光',
  sectionLifecycle: '生命周期',
  sectionProperties: '配置项',

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

  mp3Import: 'MP3 导入',
  mp3SelectFile: '选择 MP3 文件',
  mp3FileName: '文件名',
  mp3SourceSimulated: '模拟数据',
  mp3SourceReal: '真实频谱',
  mp3Play: '播放',
  mp3Pause: '暂停',
  mp3Stop: '停止',
  mp3NoFile: '（未加载文件）',
  mp3Volume: '音量',
  mp3Sensitivity: '灵敏度',
  mp3Ceiling: '上限',
  mp3Loop: '循环播放',
  mp3Seek: '进度',
  mp3Duration: '时长',
  mp3Position: '位置',

  paused: '已暂停',
  running: '运行中',
  pauseBtn: '暂停',
  resumeBtn: '继续',
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
  propertyText: 'i18n 键名',
  propertyDisplayName: '显示名称',
  propertyConditionHelp: '例：propA.value == 1 && propB.value > 0',
  typeChangeConfirm: '切换类型会清空当前默认值，确定继续吗？',
  continueChange: '继续',
  cancelChange: '取消',
  textNotInLocalization: '⚠ 当前翻译字典中未找到',
  textInLocalization: '✓ 已收录到翻译字典',
  addToLocalization: '+ 添加',
  typeSpecific: '类型专属',
  groupSectionTitle: '── 分组 ──',
  defaultLabel: '默认值',
  sliderRange: '范围',
  minLabel: '最小',
  maxLabel: '最大',
  stepLabel: '步进',
  precisionLabel: '精度',
  fractionLabel: '允许小数',
  videoModeLabel: '视频模式',
  ondemandModeLabel: '点播模式',
  addRowLabel: '+ 添加',
  labelLabel: '显示',
  valueLabel: '值',
  noOptionsLabel: '（无选项）',
  keyRequiredAlert: '键名不能为空',
  fieldRequired: '必填',
  sectionLocalization: '翻译',
  hiddenStat: '隐藏',
  conditionMet: '条件满足，用户可见',
  conditionNotMet: '条件未满足，用户隐藏',
  noCondition: '无条件限制',
  missingTransTitle: '缺失翻译: "{key}" → 回退到键名',

  browse: '浏览',
  selectFile: '选择文件',
  selectDirectory: '选择目录',
  clearFile: '清除',

  addProperty: '+ 添加配置项',
  editProperty: '编辑',
  deleteProperty: '删除',
  exportJson: '⬇ 导出 JSON',
  save: '保存',
  cancel: '取消',
  confirmDelete: '删除 "{key}"？',
  propertyKey: '键名',
  propertyI18nKey: '翻译键',
  propertyType: '类型',
  propertyValue: '默认值',
  propertyOrder: '排序',
  propertyIndex: '索引',
  propertyOptions: '选项',
  propertyCondition: '条件',
  propertyFraction: '允许小数',
  propertyMin: '最小值',
  propertyMax: '最大值',
  propertyStep: '步进值',
  propertyPrecision: '小数精度',
  propertySliderLabel: '滑块',
  propertyFileLabel: '文件',
  propertyDirectoryLabel: '目录',
  typeBool: '复选框',
  typeSlider: '滑块',
  typeCombo: '下拉菜单',
  typeColor: '颜色',
  typeText: '文本',
  typeTextinput: '文本框',
  typeFile: '文件',
  typeDirectory: '目录',
  typeGroup: '分组',
  typeFilterAll: '全部类型',
  typeTrue: '开启',
  typeFalse: '关闭',
  optionLabel: '标签',
  optionValue: '值',
  optionNoOptions: '(无选项)',
  audioOn: '开启',
  audioOff: '关闭',
  rgbLoaded: '已加载',
  rgbLoading: '加载中…',
  saveButton: '保存修改',
  addLangPlaceholder: '添加语言…',
  placeholderAutoGen: '留空则使用键名自动生成',
  hintAutoGen: '自动生成: ',
  placeholderIndex: '(可选)',
  translationHeader: '翻译/本地化',
  translationUntranslated: '(未翻译)',
  translationNoLoc: 'project.json 中未定义通用章节 (general.localization)',
  defaultMin: '最小值',
  defaultMax: '最大值',
  defaultStep: '步进值',
  defaultPrec: '小数精度',
  editPropertyTitle: '编辑配置项',
  addPropertyTitle: '添加配置项',
  jsonExported: 'JSON 已导出 — 请查看下载文件夹',
  addOption: '+ 添加',
};

/** 根据浏览器语言选择字典 */
export function resolvePanelMessages(fallback?: PanelLocale): PanelMessages {
  const lang = fallback ?? navigator.language;
  if (lang.toLowerCase().startsWith('zh')) return DICT_ZH;
  return DICT_EN;
}

/** Wallpaper Engine 语言代码 → 本地化显示名 */
const LOCALE_NAMES: Record<string, string> = {
  'ar-sa': 'العربية',
  'be-by': 'Беларуская',
  'bg-bg': 'Български',
  'cs-cz': 'Čeština',
  'da-dk': 'Dansk',
  'de-de': 'Deutsch',
  'el-gr': 'Ελληνικά',
  'en-us': 'English',
  'es-es': 'Español',
  'eu-es': 'Euskara',
  'fa-ir': 'فارسی',
  'fi-fi': 'Suomi',
  'fr-fr': 'Français',
  'he-il': 'עברית',
  'hu-hu': 'Magyar',
  'id-id': 'Bahasa Indonesia',
  'it-it': 'Italiano',
  'ja-jp': '日本語',
  'ko-kr': '한국어',
  'lt-lt': 'Lietuvių',
  'nb-no': 'Norsk Bokmål',
  'nl-nl': 'Nederlands',
  'pl-pl': 'Polski',
  'pt-br': 'Português (Brasil)',
  'pt-pt': 'Português (Portugal)',
  'ro-ro': 'Română',
  'ru-ru': 'Русский',
  'sk-sk': 'Slovenčina',
  'sl-si': 'Slovenščina',
  'sv-se': 'Svenska',
  'th-th': 'ไทย',
  'tr-tr': 'Türkçe',
  'uk-ua': 'Українська',
  'vi-vn': 'Tiếng Việt',
  'zh-chs': '简体中文',
  'zh-cht': '繁體中文',
};

/** 获取语言代码的显示名（如 "zh-chs | 简体中文"） */
export function localeDisplayName(code: string): string {
  const name = LOCALE_NAMES[code];
  return name ? `${code} | ${name}` : code;
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
