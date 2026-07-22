/**
 * 控制面板 DOM 渲染器
 *
 * 纯原生 DOM 构建完整面板 UI，零依赖。
 * 布局：标题栏 → 5 个折叠区段（Audio / Media / RGB / Lifecycle / Properties）。
 *
 * 子模块：
 *   - sections/audio.ts
 *   - sections/media.ts
 *   - sections/rgb.ts
 *   - sections/lifecycle.ts
 *   - sections/properties.ts
 *   - modal/propertyEditor.ts
 */

import type {
  AudioBridge,
  AudioSimulatorController,
  InternalState,
  MediaMockController,
  ProjectPropertyDef,
} from '../types';
import { PANEL_STYLES, GLOBAL_MODAL_STYLES } from './styles';
import type { PanelMessages } from './i18n';
import { getPanelMessages, resolvePanelMessages, setPanelMessages } from './i18n';
import { createBody, createSection } from './layout';
import { populateAudioSection } from './sections/audio';
import { populateMediaSection } from './sections/media';
import { populateRgbSection } from './sections/rgb';
import { populateLifecycleSection } from './sections/lifecycle';
import { populatePropertiesSection } from './sections/properties';
import { createDraggableHost, createShadowHost } from '../utils/dom';
import type { PropertyEditorContext } from './modal/propertyEditor';
import type {
  PanelCallbacks,
  PanelMediaUpdater,
  PanelPropertiesRefresher,
  PanelRgbUpdater,
} from './callbacks';

export interface PanelController {
  element: HTMLElement;
  styleEl: HTMLElement;
  globalStyleEl: HTMLElement;
  clockInterval: ReturnType<typeof setInterval>;
  isVisible: boolean;
  shadow: ShadowRoot;
  sections: {
    audio: HTMLElement;
    media: HTMLElement;
    rgb: HTMLElement;
    lifecycle: HTMLElement;
    properties: HTMLElement;
  };
  updateStatus(isRealWE: boolean): void;
  updateRgbState(loaded: boolean): void;
  destroy(): void;
  getMediaUpdater(): PanelMediaUpdater;
  getRgbUpdater(): PanelRgbUpdater;
  getPropertiesRefresher(): PanelPropertiesRefresher;
}

export function renderPanel(
  container: HTMLElement,
  state: InternalState,
  controllers: {
    audio?: AudioSimulatorController;
    media?: MediaMockController;
  },
  callbacks: PanelCallbacks,
  initialProps: ProjectPropertyDef[] = [],
  appliedLanguage: string = 'en-us',
  availableLanguages: string[] = [],
  onLanguageSwitch?: (lang: string) => void,
  messages?: PanelMessages,
  editorContext?: PropertyEditorContext,
  allLocalizations?: Record<string, Record<string, string>>,
  bridge?: AudioBridge
): PanelController {
  setPanelMessages(messages ?? resolvePanelMessages());

  // ---- Shadow DOM 容器 ----
  const { host, shadow } = createShadowHost();
  container.appendChild(host);

  // ---- 面板 + 标题栏 ----
  const panel = document.createElement('div');
  panel.id = '__we_devkit_panel';

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
  minimizeBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="2" y="5.5" width="8" height="1" rx="0.5" fill="currentColor"/></svg>';
  minimizeBtn.title = getPanelMessages().minimize;
  header.appendChild(minimizeBtn);

  const closeBtn = document.createElement('button');
  closeBtn.className = 'panel-btn';
  closeBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 3L9 9M9 3L3 9" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>';
  closeBtn.title = getPanelMessages().close;
  header.appendChild(closeBtn);

  panel.appendChild(header);

  // ---- 拖拽：使用 utils/dom 中的可拖拽宿主模式 ----
  attachHeaderDrag(host, header);

  // ---- 区段 ----
  const body = createBody(panel);

  const audioSection = createSection(body, getPanelMessages().sectionAudio, 'audio-content', true, '');
  populateAudioSection(audioSection, controllers.audio, callbacks, bridge);

  const mediaSection = createSection(body, getPanelMessages().sectionMedia, 'media-content', true, '');
  const mediaUpdater = populateMediaSection(mediaSection, controllers.media, callbacks);

  const rgbSection = createSection(body, getPanelMessages().sectionRgb, 'rgb-content', true, '');
  const rgbUpdater = populateRgbSection(rgbSection);

  const lifecycleSection = createSection(body, getPanelMessages().sectionLifecycle, 'lifecycle-content', true, '');
  populateLifecycleSection(lifecycleSection, callbacks);

  const propBadge = `${initialProps.length} ${getPanelMessages().items}`;
  const propertiesSection = createSection(body, getPanelMessages().sectionProperties, 'properties-content', true, propBadge);
  const propertiesRefresher = populatePropertiesSection(
    propertiesSection,
    initialProps,
    callbacks,
    appliedLanguage,
    availableLanguages,
    onLanguageSwitch,
    editorContext,
    allLocalizations
  );

  // ---- 样式注入 ----
  const styleEl = document.createElement('style');
  styleEl.textContent = PANEL_STYLES;
  shadow.appendChild(styleEl);

  const globalStyleEl = document.createElement('style');
  globalStyleEl.id = '__we_devkit_modal_styles';
  globalStyleEl.textContent = GLOBAL_MODAL_STYLES;
  document.head.appendChild(globalStyleEl);

  shadow.appendChild(panel);

  // 初始位置
  const defaultX = Math.max(10, window.innerWidth - 450);
  host.style.left = `${defaultX}px`;
  host.style.top = '60px';

  // 时钟
  const clockInterval = setInterval(() => {
    clock.textContent = new Date().toLocaleTimeString();
  }, 1000);
  clock.textContent = new Date().toLocaleTimeString();

  closeBtn.addEventListener('click', () => callbacks.onClose());

  let isMinimized = false;
  minimizeBtn.addEventListener('click', () => {
    isMinimized = !isMinimized;
    panel.classList.toggle('minimized', isMinimized);
    minimizeBtn.innerHTML = isMinimized
      ? '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="2" y="3" width="8" height="6" rx="1" stroke="currentColor" stroke-width="1"/><rect x="3.5" y="4.5" width="5" height="3" rx="0.5" fill="currentColor"/></svg>'
      : '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="2" y="5.5" width="8" height="1" rx="0.5" fill="currentColor"/></svg>';
    minimizeBtn.title = isMinimized ? getPanelMessages().restore : getPanelMessages().minimize;
  });

  void state;

  const controller: PanelController = {
    element: host,
    styleEl,
    globalStyleEl,
    clockInterval,
    isVisible: true,
    shadow,
    sections: {
      audio: audioSection,
      media: mediaSection,
      rgb: rgbSection,
      lifecycle: lifecycleSection,
      properties: propertiesSection,
    },
    updateStatus(isRealWE) {
      statusDot.className = 'status-dot ' + (isRealWE ? 'we-real' : 'we-mock');
    },
    updateRgbState(loaded) {
      const el = shadow.querySelector('#rgb-status');
      if (el) el.textContent = loaded ? getPanelMessages().rgbLoaded : getPanelMessages().rgbLoading;
    },
    destroy() {
      clearInterval(clockInterval);
      const gs = document.getElementById('__we_devkit_modal_styles');
      if (gs) gs.remove();
      host.remove();
    },
    getMediaUpdater: () => mediaUpdater,
    getRgbUpdater: () => rgbUpdater,
    getPropertiesRefresher: () => propertiesRefresher,
  };

  return controller;
}

/** 标题栏拖拽（轻量内联实现，避免影响 Shadow DOM 探测） */
function attachHeaderDrag(host: HTMLElement, header: HTMLElement): void {
  let isDragging = false;
  let dragOffsetX = 0;
  let dragOffsetY = 0;

  header.addEventListener('mousedown', (e) => {
    if ((e.target as HTMLElement).closest('.panel-btn')) return;
    isDragging = true;
    dragOffsetX = e.clientX - host.offsetLeft;
    dragOffsetY = e.clientY - host.offsetTop;
    host.style.cursor = 'grabbing';
  });
  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    host.style.left = `${e.clientX - dragOffsetX}px`;
    host.style.top = `${e.clientY - dragOffsetY}px`;
    host.style.right = 'auto';
  });
  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      host.style.cursor = '';
    }
  });

  // 抑制 lint：createDraggableHost 是 utils/dom 提供的通用版本，title bar 用内联简化版
  void createDraggableHost;
}