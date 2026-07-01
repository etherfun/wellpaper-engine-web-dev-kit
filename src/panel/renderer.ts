/**
 * 控制面板 DOM 渲染器
 *
 * 纯原生 DOM 构建完整面板 UI，零依赖。
 * 布局：标题栏 → 5 个折叠区段（Audio / Media / RGB / Lifecycle / Properties）
 */

import type {
  AudioMode,
  AudioSimulatorController,
  InternalState,
  MediaMockController,
  MockTrack,
  PlaybackState,
  ProjectPropertyDef,
} from '../types';
import { PANEL_STYLES } from './styles';
import { evaluateAllConditions, type VisibilityMap } from './conditionEvaluator';
import { resolvePanelMessages, setPanelMessages, getPanelMessages } from './i18n';
import type { PanelMessages } from './i18n';

// ---- 颜色常量 ----
const RGB_HEX = /^#?([0-9a-fA-F]{3,6})$/;

export function renderPanel(
  container: HTMLElement,
  state: InternalState,
  controllers: {
    audio?: AudioSimulatorController;
    media?: MediaMockController;
  },
  callbacks: {
    onPropertyChange: (key: string, value: unknown) => void;
    onAudioToggle: (enabled: boolean) => void;
    onAudioAmplitude: (v: number) => void;
    onAudioBassBoost: (v: number) => void;
    onAudioSpeed: (v: number) => void;
    onAudioMode: (m: AudioMode) => void;
    onMediaPlay: () => void;
    onMediaPause: () => void;
    onMediaStop: () => void;
    onMediaNext: () => void;
    onMediaPrev: () => void;
    onMediaTrackChange: (index: number) => void;
    onMediaCustomTrack: (track: Partial<MockTrack>) => void;
    onMediaThumbnail: (dataUri: string) => void;
    onMediaSeek: (pct: number) => void;
    onLifecycleToggle: (paused: boolean) => void;
    onLifecycleFps: (fps: number) => void;
    onClose: () => void;
    onMinimize: () => void;
  },
  initialProps: ProjectPropertyDef[] = [],
  appliedLanguage: string = 'en-us',
  availableLanguages: string[] = [],
  onLanguageSwitch?: (lang: string) => void,
  messages?: PanelMessages
) {
  setPanelMessages(messages ?? resolvePanelMessages());
  // ---- 创建 Shadow DOM 容器（隔离宿主页面 CSS 污染） ----
  const host = document.createElement('div');
  host.style.cssText = 'all:initial;position:fixed;z-index:2147483647;top:0;left:0;width:0;height:0;';
  const shadow = host.attachShadow({ mode: 'open' });
  container.appendChild(host);

  // ---- 在 Shadow DOM 内创建面板 ----
  const panel = document.createElement('div');
  panel.id = '__we_devkit_panel';

  // ---- 标题栏 ----
  const header = document.createElement('div');
  header.className = 'panel-header';

  const statusDot = document.createElement('span');
  statusDot.className = 'status-dot we-mock';
  header.appendChild(statusDot);

  const title = document.createElement('span');
  title.className = 'panel-title';
  title.textContent = getPanelMessages().title;
  header.appendChild(title);

  const clock = document.createElement('span');
  clock.className = 'panel-clock';
  header.appendChild(clock);

  const minimizeBtn = document.createElement('button');
  minimizeBtn.className = 'panel-btn';
  minimizeBtn.textContent = '—';
  minimizeBtn.title = getPanelMessages().minimize;
  header.appendChild(minimizeBtn);

  const closeBtn = document.createElement('button');
  closeBtn.className = 'panel-btn';
  closeBtn.textContent = '×';
  closeBtn.title = getPanelMessages().close;
  header.appendChild(closeBtn);

  panel.appendChild(header);

  // ---- 拖拽实现 ----
  let isDragging = false;
  let dragOffsetX = 0;
  let dragOffsetY = 0;

  header.addEventListener('mousedown', (e) => {
    if ((e.target as HTMLElement).closest('.panel-btn')) return;
    isDragging = true;
    dragOffsetX = e.clientX - host.offsetLeft;
    dragOffsetY = e.clientY - host.offsetTop;
    panel.style.cursor = 'grabbing';
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    host.style.left = (e.clientX - dragOffsetX) + 'px';
    host.style.top = (e.clientY - dragOffsetY) + 'px';
    host.style.right = 'auto';
  });

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      panel.style.cursor = '';
    }
  });

  // ---- 主体 ----
  const body = document.createElement('div');
  body.className = 'panel-body';
  panel.appendChild(body);

  // ---- 构建区段 ----
  const sections: {
    audio: HTMLElement;
    media: HTMLElement;
    rgb: HTMLElement;
    lifecycle: HTMLElement;
    properties: HTMLElement;
  } = {} as any;

  // Audio Section
  sections.audio = createSection(body, getPanelMessages().sectionAudio, 'audio-content', true, '');
  populateAudioSection(sections.audio, controllers.audio, callbacks);

  // Media Section
  sections.media = createSection(body, getPanelMessages().sectionMedia, 'media-content', true, '');
  populateMediaSection(sections.media, controllers.media, callbacks);

  // RGB Section
  sections.rgb = createSection(body, getPanelMessages().sectionRgb, 'rgb-content', true, '');
  populateRgbSection(sections.rgb, callbacks);

  // Lifecycle Section
  sections.lifecycle = createSection(body, getPanelMessages().sectionLifecycle, 'lifecycle-content', true, '');
  populateLifecycleSection(sections.lifecycle, callbacks);

  // Properties Section (从 project.json 加载)
  const propBadge = `${initialProps.length} ${getPanelMessages().items}`;
  sections.properties = createSection(body, getPanelMessages().sectionProperties, 'properties-content', true, propBadge);
  populatePropertiesSection(sections.properties, initialProps, callbacks, appliedLanguage, availableLanguages, onLanguageSwitch);

  // ---- 注入样式到 Shadow DOM（完全隔离宿主 CSS） ----
  const styleEl = document.createElement('style');
  styleEl.textContent = PANEL_STYLES;
  shadow.appendChild(styleEl);

  // ---- 挂载面板到 Shadow DOM ----
  shadow.appendChild(panel);

  // ---- 位置初始化 ----
  const defaultX = Math.max(10, window.innerWidth - 450);
  host.style.left = defaultX + 'px';
  host.style.top = '60px';

  // ---- 时钟 ----
  const clockInterval = setInterval(() => {
    const now = new Date();
    clock.textContent = now.toLocaleTimeString();
  }, 1000);
  clock.textContent = new Date().toLocaleTimeString();

  // ---- 按钮事件 ----
  closeBtn.addEventListener('click', () => callbacks.onClose());
  minimizeBtn.addEventListener('click', () => callbacks.onMinimize());

  // ---- Controller ----
  const controller = {
    element: host,
    styleEl,
    clockInterval,
    sections,
    statusDot,
    isVisible: true,

    updateStatus(isRealWE: boolean) {
      statusDot.className = 'status-dot ' + (isRealWE ? 'we-real' : 'we-mock');
    },

    updateAudioState(sim: AudioSimulatorController) {
      // 由外部定时刷新
    },

    get shadowRoot() { return shadow; },

    updateRgbState(loaded: boolean) {
      const el = shadow.querySelector('#rgb-status');
      if (el) el.textContent = loaded ? '✅ loaded' : '⏳ loading...';
    },

    destroy() {
      clearInterval(clockInterval);
      host.remove();
    },
  };

  return controller;
}

// ---- 区段创建辅助 ----

function createSection(
  body: HTMLElement,
  titleText: string,
  contentId: string,
  defaultOpen: boolean,
  badge: string
): HTMLElement {
  const section = document.createElement('div');
  section.className = 'section';

  const header = document.createElement('div');
  header.className = 'section-header';

  const arrow = document.createElement('span');
  arrow.className = 'arrow' + (defaultOpen ? ' open' : '');
  arrow.textContent = '▶';
  header.appendChild(arrow);

  const title = document.createElement('span');
  title.textContent = titleText;
  header.appendChild(title);

  if (badge) {
    const b = document.createElement('span');
    b.className = 'badge';
    b.textContent = badge;
    header.appendChild(b);
  }

  const content = document.createElement('div');
  content.id = '__we_' + contentId;
  content.className = 'section-content' + (defaultOpen ? ' open' : '');

  header.addEventListener('click', () => {
    const isOpen = content.classList.contains('open');
    content.classList.toggle('open');
    arrow.classList.toggle('open');
  });

  section.appendChild(header);
  section.appendChild(content);
  body.appendChild(section);

  return content;
}

// ---- Audio Section ----

function populateAudioSection(
  container: HTMLElement,
  audio: AudioSimulatorController | undefined,
  cb: any
) {
  // Audio Input 开关
  let audioEnabled = true;
  const toggleRow = document.createElement('div');
  toggleRow.className = 'row';
  const toggleLabel = document.createElement('label');
  toggleLabel.textContent = getPanelMessages().audioInput;
  toggleRow.appendChild(toggleLabel);
  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'toggle-btn on';
  toggleBtn.textContent = 'ON';
  toggleBtn.addEventListener('click', () => {
    audioEnabled = !audioEnabled;
    toggleBtn.className = 'toggle-btn ' + (audioEnabled ? 'on' : 'off');
    toggleBtn.textContent = audioEnabled ? 'ON' : 'OFF';
    toggleBtn.style.borderColor = audioEnabled ? '#4CAF50' : '#e53935';
    cb.onAudioToggle(audioEnabled);
  });
  toggleRow.appendChild(toggleBtn);
  container.appendChild(toggleRow);

  createSlider(container, getPanelMessages().amplitude, 0, 1, 0.01, 0.6, cb.onAudioAmplitude);
  createSlider(container, getPanelMessages().bassBoost, 0, 3, 0.1, 1.2, cb.onAudioBassBoost);
  createSlider(container, getPanelMessages().speed, 0.1, 5, 0.1, 1.0, cb.onAudioSpeed);

  const modeRow = document.createElement('div');
  modeRow.className = 'row';
  const modeLabel = document.createElement('label');
  modeLabel.textContent = getPanelMessages().mode;
  modeRow.appendChild(modeLabel);

  const modeSelect = document.createElement('select');
  ['mixed', 'beats', 'melody'].forEach((m) => {
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = m === 'mixed' ? getPanelMessages().mixed : m === 'beats' ? getPanelMessages().beats : getPanelMessages().melody;
    if (m === 'mixed') opt.selected = true;
    modeSelect.appendChild(opt);
  });
  modeSelect.addEventListener('change', () => {
    cb.onAudioMode(modeSelect.value as AudioMode);
  });
  modeRow.appendChild(modeSelect);
  container.appendChild(modeRow);
}

// ---- Media Section ----

function populateMediaSection(
  container: HTMLElement,
  media: MediaMockController | undefined,
  cb: any
) {
  // 控制按钮
  const btnRow = document.createElement('div');
  btnRow.className = 'btn-group';
  btnRow.style.marginBottom = '8px';

  const btnPrev = createButton('⏮', getPanelMessages().previousTrack, () => cb.onMediaPrev());
  const btnPlay = createButton('▶', getPanelMessages().play, () => cb.onMediaPlay(), 'primary');
  const btnPause = createButton('⏸', getPanelMessages().pause, () => cb.onMediaPause());
  const btnStop = createButton('⏹', getPanelMessages().stop, () => cb.onMediaStop(), 'danger');
  const btnNext = createButton('⏭', getPanelMessages().nextTrack, () => cb.onMediaNext());

  btnRow.appendChild(btnPrev);
  btnRow.appendChild(btnPlay);
  btnRow.appendChild(btnPause);
  btnRow.appendChild(btnStop);
  btnRow.appendChild(btnNext);
  container.appendChild(btnRow);

  // 曲目选择
  const trackRow = document.createElement('div');
  trackRow.className = 'row';
  const trackLabel = document.createElement('label');
  trackLabel.textContent = getPanelMessages().track;
  trackRow.appendChild(trackLabel);

  const trackSelect = document.createElement('select');
  trackSelect.style.flex = '1';
  if (media) {
    media.tracks.forEach((t, i) => {
      const opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = `${t.artist} — ${t.title}`;
      trackSelect.appendChild(opt);
    });
  }
  trackSelect.addEventListener('change', () => {
    cb.onMediaTrackChange(parseInt(trackSelect.value, 10));
  });
  trackRow.appendChild(trackSelect);
  container.appendChild(trackRow);

  // 封面 + 编辑区
  const editRow = document.createElement('div');
  editRow.className = 'row';
  editRow.style.alignItems = 'flex-start';

  const thumbnail = document.createElement('img');
  thumbnail.className = 'thumbnail-preview';
  thumbnail.alt = getPanelMessages().coverAlt;
  editRow.appendChild(thumbnail);

  const fieldsCol = document.createElement('div');
  fieldsCol.style.flex = '1';
  fieldsCol.style.display = 'flex';
  fieldsCol.style.flexDirection = 'column';
  fieldsCol.style.gap = '4px';

  const titleInput = createTextField(getPanelMessages().title_, '');
  const artistInput = createTextField(getPanelMessages().artist, '');
  const albumInput = createTextField(getPanelMessages().album, '');

  fieldsCol.appendChild(titleInput);
  fieldsCol.appendChild(artistInput);
  fieldsCol.appendChild(albumInput);
  editRow.appendChild(fieldsCol);
  container.appendChild(editRow);

  // 字段变化自动推送
  function pushCustomTrack() {
    cb.onMediaCustomTrack({
      title: titleInput.querySelector('input')?.value || '',
      artist: artistInput.querySelector('input')?.value || '',
      album: albumInput.querySelector('input')?.value || '',
    });
  }
  titleInput.querySelector('input')?.addEventListener('input', pushCustomTrack);
  artistInput.querySelector('input')?.addEventListener('input', pushCustomTrack);
  albumInput.querySelector('input')?.addEventListener('input', pushCustomTrack);

  // 封面上传
  const uploadZone = document.createElement('div');
  uploadZone.className = 'thumbnail-upload-zone';
  uploadZone.textContent = getPanelMessages().uploadCover;

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.style.display = 'none';
  uploadZone.appendChild(fileInput);

  uploadZone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    if (fileInput.files && fileInput.files[0]) {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUri = reader.result as string;
        thumbnail.src = dataUri;
        cb.onMediaThumbnail(dataUri);
      };
      reader.readAsDataURL(fileInput.files[0]);
    }
  });

  // 拖拽上传
  uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('drag-over');
  });
  uploadZone.addEventListener('dragleave', () => {
    uploadZone.classList.remove('drag-over');
  });
  uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('drag-over');
    const files = e.dataTransfer?.files;
    if (files && files[0]) {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUri = reader.result as string;
        thumbnail.src = dataUri;
        cb.onMediaThumbnail(dataUri);
      };
      reader.readAsDataURL(files[0]);
    }
  });

  container.appendChild(uploadZone);

  // 进度条
  const timelineRow = document.createElement('div');
  timelineRow.className = 'timeline-row';
  timelineRow.style.marginTop = '8px';

  const timeCurrent = document.createElement('span');
  timeCurrent.className = 'time-label';
  timeCurrent.textContent = '0:00';
  timelineRow.appendChild(timeCurrent);

  const timelineSlider = document.createElement('input');
  timelineSlider.type = 'range';
  timelineSlider.min = '0';
  timelineSlider.max = '100';
  timelineSlider.value = '0';
  timelineSlider.addEventListener('input', () => {
    const pct = parseFloat(timelineSlider.value);
    const dur = parseFloat(timeTotal.textContent.split(':').reduce((m,s)=>m*60+parseFloat(s),0) as any) || 240;
    timeCurrent.textContent = formatTime(dur * pct / 100);
  });
  timelineSlider.addEventListener('change', () => {
    cb.onMediaSeek(parseFloat(timelineSlider.value));
  });
  timelineRow.appendChild(timelineSlider);

  const timeTotal = document.createElement('span');
  timeTotal.className = 'time-label';
  timeTotal.textContent = '0:00';
  timelineRow.appendChild(timeTotal);
  container.appendChild(timelineRow);

  // ---- 公开更新方法 ----
  (container as any).__updateMedia = function (
    track: MockTrack,
    state: PlaybackState,
    position: number,
    duration: number,
    trackIndex: number
  ) {
    // 更新封面缩略图
    if (track.thumbnail) {
      thumbnail.src = track.thumbnail;
    }
    // 更新文本字段（不覆盖用户正在编辑的值）
    const ti = titleInput.querySelector('input');
    const ai = artistInput.querySelector('input');
    const al = albumInput.querySelector('input');
    if (ti && !ti.matches(':focus')) ti.value = track.title;
    if (ai && !ai.matches(':focus')) ai.value = track.artist;
    if (al && !al.matches(':focus')) al.value = track.album || '';

    // 同步下拉选中项
    if (trackIndex >= 0 && trackIndex < trackSelect.options.length) {
      trackSelect.selectedIndex = trackIndex;
    }

    // 更新进度
    const pct = duration > 0 ? (position / duration) * 100 : 0;
    timelineSlider.value = String(Math.min(100, Math.round(pct)));
    timeCurrent.textContent = formatTime(position);
    timeTotal.textContent = formatTime(duration);
  };
}

// ---- RGB Section ----

function populateRgbSection(container: HTMLElement, cb?: any) {
  // RGB 帧预览 canvas
  const canvasRow = document.createElement('div');
  canvasRow.style.cssText = 'margin: 4px 0; display: flex; flex-direction: column; gap: 4px;';

  const infoLine = document.createElement('div');
  infoLine.style.cssText = 'font-size: 10px; color: #666;';
  infoLine.textContent = getPanelMessages().waitingRgb;
  canvasRow.appendChild(infoLine);

  const canvas = document.createElement('canvas');
  canvas.id = '__we_rgb_canvas';
  canvas.style.cssText = 'width: 100%; height: 32px; border-radius: 4px; image-rendering: pixelated; background: #111;';
  canvas.width = 100;
  canvas.height = 20;
  canvasRow.appendChild(canvas);

  // 调色板行
  const paletteRow = document.createElement('div');
  paletteRow.id = '__we_rgb_palette';
  paletteRow.style.cssText = 'display: flex; gap: 3px; flex-wrap: wrap; min-height: 16px;';
  canvasRow.appendChild(paletteRow);

  container.appendChild(canvasRow);

  // 公开更新方法
  (container as any).__updateRgbFrame = function (frame: import('../types').RgbFrameData) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imgData = ctx.createImageData(frame.width, frame.height);
    for (let i = 0; i < frame.pixels.length; i += 3) {
      const idx = (i / 3) * 4;
      imgData.data[idx] = frame.pixels[i] ?? 0;
      imgData.data[idx + 1] = frame.pixels[i + 1] ?? 0;
      imgData.data[idx + 2] = frame.pixels[i + 2] ?? 0;
      imgData.data[idx + 3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);

    infoLine.textContent = `${frame.width}×${frame.height} · ${(frame.pixels.length / 1024).toFixed(1)}KB`;

    paletteRow.innerHTML = '';
    for (const swatch of frame.palette) {
      const dot = document.createElement('span');
      dot.style.cssText = `display:inline-block;width:16px;height:16px;border-radius:3px;background:${swatch.color};border:1px solid rgba(255,255,255,0.15);cursor:help;`;
      dot.title = `${swatch.color} (${(swatch.ratio * 100).toFixed(0)}%)`;
      paletteRow.appendChild(dot);
    }
  };
}

// ---- Lifecycle Section ----

function populateLifecycleSection(container: HTMLElement, cb: any) {
  // 暂停状态指示 + 单个切换按钮
  let lifecyclePaused = false;
  const statusRow = document.createElement('div');
  statusRow.className = 'row';
  const statusLabel = document.createElement('label');
  statusLabel.textContent = getPanelMessages().paused;
  statusRow.appendChild(statusLabel);
  const statusEl = document.createElement('span');
  statusEl.id = '__we_lifecycle_status';
  statusEl.textContent = getPanelMessages().running;
  statusEl.style.fontSize = '11px';
  statusEl.style.color = '#4CAF50';
  statusRow.appendChild(statusEl);
  container.appendChild(statusRow);

  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'toggle-btn on';
  toggleBtn.textContent = getPanelMessages().pauseBtn;
  toggleBtn.style.width = '100%';
  toggleBtn.style.padding = '4px 12px';
  toggleBtn.addEventListener('click', () => {
    lifecyclePaused = !lifecyclePaused;
    cb.onLifecycleToggle(lifecyclePaused);
    if (lifecyclePaused) {
      toggleBtn.className = 'toggle-btn off';
      toggleBtn.textContent = getPanelMessages().resumeBtn;
      toggleBtn.style.borderColor = '#FFC107';
      statusEl.textContent = getPanelMessages().paused;
      statusEl.style.color = '#FFC107';
    } else {
      toggleBtn.className = 'toggle-btn on';
      toggleBtn.textContent = getPanelMessages().pauseBtn;
      toggleBtn.style.borderColor = '';
      statusEl.textContent = getPanelMessages().running;
      statusEl.style.color = '#4CAF50';
    }
  });
  container.appendChild(toggleBtn);

  const fpsRow = document.createElement('div');
  fpsRow.className = 'row';
  const fpsLabel = document.createElement('label');
  fpsLabel.textContent = getPanelMessages().fpsLimit;
  fpsRow.appendChild(fpsLabel);

  const fpsSelect = document.createElement('select');
  [0, 30, 60, 120, 144].forEach((fps) => {
    const opt = document.createElement('option');
    opt.value = String(fps);
    opt.textContent = fps === 0 ? getPanelMessages().unlimited : `${fps} FPS`;
    if (fps === 60) opt.selected = true;
    fpsSelect.appendChild(opt);
  });
  fpsSelect.addEventListener('change', () => {
    cb.onLifecycleFps(parseInt(fpsSelect.value, 10));
  });
  fpsRow.appendChild(fpsSelect);
  container.appendChild(fpsRow);
}

// ---- Properties Section ----

function populatePropertiesSection(
  container: HTMLElement,
  props: ProjectPropertyDef[],
  cb: any,
  appliedLanguage: string = 'en-us',
  availableLanguages: string[] = [],
  onLanguageSwitch?: (lang: string) => void
) {
  // 语言标签 + 语言切换下拉 + 键名/翻译切换
  const langRow = document.createElement('div');
  langRow.className = 'row';
  langRow.style.marginBottom = '4px';

  const langIcon = document.createElement('span');
  langIcon.style.cssText = 'font-size:10px;color:#666;';
  langIcon.textContent = '🌐';
  langRow.appendChild(langIcon);

  const langSelect = document.createElement('select');
  langSelect.style.cssText = 'font-size:10px;padding:1px 4px;flex:none;width:70px;';
  for (const lang of availableLanguages) {
    const opt = document.createElement('option');
    opt.value = lang;
    opt.textContent = lang;
    if (lang === appliedLanguage) opt.selected = true;
    langSelect.appendChild(opt);
  }
  langSelect.addEventListener('change', () => {
    if (onLanguageSwitch) {
      onLanguageSwitch(langSelect.value);
      renderProps(searchInput.value, visSelect.value as 'all' | 'visible' | 'hidden');
    }
  });
  if (availableLanguages.length > 1) langRow.appendChild(langSelect);
  else {
    const langLabel = document.createElement('span');
    langLabel.style.cssText = 'font-size:10px;color:#666;';
    langLabel.textContent = appliedLanguage;
    langRow.appendChild(langLabel);
  }

  let showKeys = false;
  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'btn';
  toggleBtn.style.cssText = 'margin-left:auto;font-size:10px;padding:2px 8px;';
  toggleBtn.textContent = getPanelMessages().showKeys;
  toggleBtn.title = getPanelMessages().showKeys + ' / ' + getPanelMessages().showName;
  toggleBtn.addEventListener('click', () => {
    showKeys = !showKeys;
    toggleBtn.textContent = showKeys ? getPanelMessages().showName : getPanelMessages().showKeys;
    toggleBtn.classList.toggle('active', showKeys);
    renderProps(searchInput.value, visSelect.value as 'all' | 'visible' | 'hidden');
  });
  langRow.appendChild(toggleBtn);
  container.appendChild(langRow);

  // 搜索框
  const searchInput = document.createElement('input');
  searchInput.className = 'prop-search';
  searchInput.type = 'text';
  searchInput.placeholder = getPanelMessages().searchPlaceholder;
  container.appendChild(searchInput);

  // 可见性过滤行
  const filterRow = document.createElement('div');
  filterRow.className = 'visibility-filter-row';

  const visSelect = document.createElement('select');
  const visAll = document.createElement('option'); visAll.value = 'all'; visAll.textContent = getPanelMessages().filterAll; visAll.selected = true;
  const visVisible = document.createElement('option'); visVisible.value = 'visible'; visVisible.textContent = getPanelMessages().filterVisible;
  const visHidden = document.createElement('option'); visHidden.value = 'hidden'; visHidden.textContent = getPanelMessages().filterHidden;
  visSelect.appendChild(visAll);
  visSelect.appendChild(visVisible);
  visSelect.appendChild(visHidden);
  filterRow.appendChild(visSelect);

  // 翻译丢失过滤
  const missingTransSelect = document.createElement('select');
  missingTransSelect.style.marginLeft = '4px';
  const mtAll = document.createElement('option'); mtAll.value = 'all'; mtAll.textContent = getPanelMessages().translationAll; mtAll.selected = true;
  const mtMissing = document.createElement('option'); mtMissing.value = 'missing'; mtMissing.textContent = getPanelMessages().translationMissing;
  const mtOk = document.createElement('option'); mtOk.value = 'ok'; mtOk.textContent = getPanelMessages().translationOk;
  missingTransSelect.appendChild(mtAll);
  missingTransSelect.appendChild(mtMissing);
  missingTransSelect.appendChild(mtOk);
  filterRow.appendChild(missingTransSelect);

  const visStats = document.createElement('span');
  visStats.className = 'vis-stats';
  filterRow.appendChild(visStats);
  container.appendChild(filterRow);

  // 属性列表容器
  const listEl = document.createElement('div');
  listEl.id = '__we_prop_list';
  container.appendChild(listEl);

  // 可见性筛选变更
  visSelect.addEventListener('change', () => {
    renderProps(searchInput.value, visSelect.value as 'all' | 'visible' | 'hidden', missingTransSelect.value as 'all' | 'missing' | 'ok');
  });

  missingTransSelect.addEventListener('change', () => {
    renderProps(searchInput.value, visSelect.value as 'all' | 'visible' | 'hidden', missingTransSelect.value as 'all' | 'missing' | 'ok');
  });

  // ---- 可见性求值 ----
  // 存储当前属性值快照（用于 condition 求值）
  const propValues: Record<string, unknown> = {};
  for (const p of props) {
    propValues[p.key] = p.value;
  }

  // 从 panel controller 注册的属性变更回调更新 propValues 和 props
  const origOnPropChange = cb.onPropertyChange;
  cb.onPropertyChange = (key: string, value: unknown) => {
    propValues[key] = value;
    // 同步更新 props 数组中的 value，使 renderProps 能读到最新值
    const prop = props.find(p => p.key === key);
    if (prop) prop.value = value;
    // 重新求值所有条件的可见性 + 刷新 UI
    refreshVisibility();
    if (origOnPropChange) origOnPropChange(key, value);
  };

  function getPropValue(key: string): unknown {
    return propValues[key];
  }

  // 求值所有条件的可见性
  let visibilityMap: VisibilityMap = {};
  function evaluateVis(): VisibilityMap {
    return evaluateAllConditions(props, getPropValue);
  }

  // ---- 渲染函数 ----
  function renderProps(filter: string = '', visFilter: string = 'all', mtFilter: string = 'all') {
    listEl.innerHTML = '';
    const lowerFilter = filter.toLowerCase();

    // 重新求值可见性
    visibilityMap = evaluateVis();

    // 统计数据
    let visibleCount = 0;
    let hiddenCount = 0;

    for (const prop of props) {
      if (prop.type === 'group') continue;
      const isVis = visibilityMap[prop.key] !== false;
      if (isVis) visibleCount++;
      else hiddenCount++;
    }
    visStats.textContent = `${visibleCount}${getPanelMessages().visibleStat} / ${hiddenCount}${getPanelMessages().hiddenStat}`;

    let currentGroup = '';

    for (const prop of props) {
      // 搜索过滤
      if (lowerFilter && !prop.key.toLowerCase().includes(lowerFilter)) {
        continue;
      }

      // 可见性过滤
      const isVis = visibilityMap[prop.key] !== false;
      if (visFilter === 'visible' && !isVis) continue;
      if (visFilter === 'hidden' && isVis) continue;

      // 翻译丢失过滤
      if (mtFilter === 'missing' && !prop.missingTranslation) continue;
      if (mtFilter === 'ok' && prop.missingTranslation) continue;

      // group 类型渲染为分组标题
      if (prop.type === 'group') {
        currentGroup = prop.key;
        const groupTitle = document.createElement('div');
        groupTitle.className = 'prop-group-title';
        const groupLabel = showKeys ? prop.key : (prop.displayName || prop.key);
        groupTitle.textContent = `── ${groupLabel} ──`;
        listEl.appendChild(groupTitle);
        continue;
      }

      const row = document.createElement('div');
      row.className = 'prop-row' + (isVis ? '' : ' is-hidden');
      row.style.position = 'relative';

      // 可见性指示器圆点 — 由 CSS class 控制样式
      const visDot = document.createElement('span');
      if (prop.condition && isVis) {
        visDot.className = 'visibility-dot visible';
        visDot.textContent = '✓';
      } else if (prop.condition && !isVis) {
        visDot.className = 'visibility-dot hidden';
        visDot.textContent = 'x';
      } else {
        visDot.className = 'visibility-dot no-condition';
        visDot.textContent = '';
      }
      visDot.title = prop.condition
        ? (isVis ? getPanelMessages().conditionMet : getPanelMessages().conditionNotMet)
        : getPanelMessages().noCondition;
      row.appendChild(visDot);

      // condition tooltip
      if (prop.condition) {
        const tooltip = document.createElement('span');
        tooltip.className = 'condition-tooltip';
        tooltip.textContent = prop.condition;
        row.appendChild(tooltip);
      }

      // 遗漏翻译提示
      if (prop.missingTranslation) {
        const warnDot = document.createElement('span');
        warnDot.className = 'translation-warn';
        warnDot.textContent = '!';
        warnDot.title = getPanelMessages().missingTransTitle.replace('{key}', prop.text ?? prop.key);
        row.appendChild(warnDot);
      } else {
        const spacer = document.createElement('span');
        spacer.className = 'translation-spacer';
        row.appendChild(spacer);
      }

      const keyEl = document.createElement('span');
      keyEl.className = 'prop-key';
      // 根据 showKeys 切换显示键名或 displayName
      const labelText = showKeys ? prop.key : (prop.displayName || prop.key);
      keyEl.textContent = labelText;
      keyEl.title = showKeys
        ? (prop.displayName && prop.displayName !== prop.key ? `${prop.key} (${prop.displayName})` : prop.key)
        : (prop.key + (prop.displayName && prop.displayName !== prop.key ? ` (${prop.displayName})` : '') + (prop.condition ? `\ncondition: ${prop.condition}` : ''));
      row.appendChild(keyEl);

      const control = document.createElement('div');
      control.className = 'prop-control';

      // 按 type 渲染控件
      switch (prop.type) {
        case 'bool': {
          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.checked = !!prop.value;
          checkbox.addEventListener('change', () => {
            cb.onPropertyChange(prop.key, checkbox.checked);
          });
          control.appendChild(checkbox);
          break;
        }
        case 'slider': {
          const sliderRow = document.createElement('div');
          sliderRow.style.display = 'flex';
          sliderRow.style.alignItems = 'center';
          sliderRow.style.gap = '6px';

          const slider = document.createElement('input');
          slider.type = 'range';
          slider.min = String(prop.min ?? 0);
          slider.max = String(prop.max ?? 100);
          slider.value = String(prop.value ?? 50);

          const numInput = document.createElement('input');
          numInput.type = 'text';
          numInput.style.width = '45px';
          numInput.value = String(prop.value ?? 50);

          let debounceTimer: ReturnType<typeof setTimeout> | null = null;
          function pushValue(v: number) {
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
              cb.onPropertyChange(prop.key, v);
            }, 300);
          }

          slider.addEventListener('input', () => {
            numInput.value = slider.value;
            pushValue(parseFloat(slider.value));
          });
          numInput.addEventListener('change', () => {
            const v = parseFloat(numInput.value);
            if (!isNaN(v)) {
              slider.value = String(Math.max(prop.min ?? 0, Math.min(prop.max ?? 100, v)));
              pushValue(v);
            }
          });

          sliderRow.appendChild(slider);
          sliderRow.appendChild(numInput);
          control.appendChild(sliderRow);
          break;
        }
        case 'combo': {
          const select = document.createElement('select');
          if (prop.options) {
            for (const opt of prop.options) {
              const el = document.createElement('option');
              el.value = String(opt.value);
              el.textContent = opt.label;
              if (opt.value === prop.value) el.selected = true;
              select.appendChild(el);
            }
          }
          select.addEventListener('change', () => {
            const val = select.value;
            // 尝试数字转换
            const numVal = Number(val);
            cb.onPropertyChange(prop.key, isNaN(numVal) ? val : numVal);
          });
          control.appendChild(select);
          break;
        }
        case 'color': {
          const colorRow = document.createElement('div');
          colorRow.style.display = 'flex';
          colorRow.style.alignItems = 'center';
          colorRow.style.gap = '6px';

          const colorPicker = document.createElement('input');
          colorPicker.type = 'color';
          // WE 颜色格式 "R G B" (0-1) → hex
          const weColor = String(prop.value || '1 1 1');
          const parts = weColor.split(' ').map(Number);
          if (parts.length >= 3) {
            const r = Math.round((parts[0] ?? 1) * 255);
            const g = Math.round((parts[1] ?? 1) * 255);
            const b = Math.round((parts[2] ?? 1) * 255);
            colorPicker.value = rgbToHex(r, g, b);
          }

          colorPicker.addEventListener('input', () => {
            const hex = colorPicker.value;
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            const weFormat = `${(r / 255).toFixed(2)} ${(g / 255).toFixed(2)} ${(b / 255).toFixed(2)}`;
            cb.onPropertyChange(prop.key, weFormat);
          });
          colorRow.appendChild(colorPicker);

          const hexLabel = document.createElement('span');
          hexLabel.style.fontSize = '10px';
          hexLabel.style.color = '#888';
          hexLabel.textContent = colorPicker.value;
          colorRow.appendChild(hexLabel);
          control.appendChild(colorRow);
          break;
        }
        case 'text': {
          // 纯展示
          const textEl = document.createElement('div');
          textEl.style.fontSize = '11px';
          textEl.style.color = '#888';
          textEl.style.wordBreak = 'break-all';
          textEl.style.maxHeight = '40px';
          textEl.style.overflow = 'hidden';
          textEl.textContent = String(prop.value || '');
          control.appendChild(textEl);
          break;
        }
        case 'textinput': {
          const textInput = document.createElement('input');
          textInput.type = 'text';
          textInput.value = String(prop.value || '');
          let debounceTimer: ReturnType<typeof setTimeout> | null = null;
          textInput.addEventListener('input', () => {
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
              cb.onPropertyChange(prop.key, textInput.value);
            }, 400);
          });
          control.appendChild(textInput);
          break;
        }
        default: {
          const fallback = document.createElement('span');
          fallback.style.fontSize = '10px';
          fallback.style.color = '#666';
          fallback.textContent = `[${prop.type}] ${prop.value}`;
          control.appendChild(fallback);
        }
      }

      row.appendChild(control);
      listEl.appendChild(row);
    }
  }

  // 刷新可见性（属性值变更后调用）
  function refreshVisibility() {
    renderProps(searchInput.value, visSelect.value as 'all' | 'visible' | 'hidden', missingTransSelect.value as 'all' | 'missing' | 'ok');
  }

  // 搜索
  let searchTimer: ReturnType<typeof setTimeout> | null = null;
  searchInput.addEventListener('input', () => {
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => renderProps(searchInput.value, visSelect.value as 'all' | 'visible' | 'hidden', missingTransSelect.value as 'all' | 'missing' | 'ok'), 200);
  });

  renderProps('', 'all', 'all');

  // 刷新属性值
  (container as any).__refreshProperties = function (newProps: ProjectPropertyDef[]) {
    // 重新渲染保持搜索状态
    renderProps(searchInput.value, visSelect.value as 'all' | 'visible' | 'hidden', missingTransSelect.value as 'all' | 'missing' | 'ok');
  };
}

// ---- 辅助 UI 组件 ----

function createSlider(
  container: HTMLElement,
  label: string,
  min: number,
  max: number,
  step: number,
  defaultValue: number,
  onChange: (v: number) => void
): HTMLInputElement {
  const row = document.createElement('div');
  row.className = 'row';

  const labelEl = document.createElement('label');
  labelEl.textContent = label;
  row.appendChild(labelEl);

  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = String(min);
  slider.max = String(max);
  slider.step = String(step);
  slider.value = String(defaultValue);
  row.appendChild(slider);

  const valueEl = document.createElement('span');
  valueEl.className = 'value';
  valueEl.textContent = String(defaultValue);
  row.appendChild(valueEl);

  slider.addEventListener('input', () => {
    const v = parseFloat(slider.value);
    valueEl.textContent = String(step >= 0.1 ? v.toFixed(1) : v.toFixed(2));
    onChange(v);
  });

  container.appendChild(row);
  return slider;
}

function createTextField(
  label: string,
  placeholder: string
): HTMLElement {
  const row = document.createElement('div');
  row.style.display = 'flex';
  row.style.alignItems = 'center';
  row.style.gap = '6px';

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = placeholder;
  input.style.flex = '1';
  row.appendChild(input);
  return row;
}

function createButton(
  text: string,
  title: string,
  onClick: () => void,
  type?: string
): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.className = 'btn' + (type ? ' ' + type : '');
  btn.textContent = text;
  btn.title = title;
  btn.addEventListener('click', onClick);
  return btn;
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('');
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
