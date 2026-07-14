/**
 * 控制面板内联样式
 */

export const PANEL_STYLES = `
/* ---- 控制面板基础 ---- */
#__we_devkit_panel {
  all: initial;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  font-size: 13px;
  line-height: 1.4;
  color: #e0e0e0;
  box-sizing: border-box;
  position: fixed;
  z-index: 2147483647;
  width: 420px;
  max-height: 80vh;
  background: rgba(30, 30, 35, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  overflow: hidden;
  user-select: none;
  display: flex;
  flex-direction: column;
}

/* ---- 标题栏 ---- */
#__we_devkit_panel .panel-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.3);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  cursor: move;
  flex-shrink: 0;
}
#__we_devkit_panel .panel-header .status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
#__we_devkit_panel .panel-header .status-dot.we-real {
  background: #4CAF50;
  box-shadow: 0 0 6px #4CAF50;
}
#__we_devkit_panel .panel-header .status-dot.we-mock {
  background: #FFC107;
  box-shadow: 0 0 6px #FFC107;
}
#__we_devkit_panel .panel-header .status-label {
  font-size: 11px;
  color: #aaa;
}
#__we_devkit_panel .panel-header .panel-title {
  font-size: 12px;
  font-weight: 600;
  color: #ccc;
  letter-spacing: 0.5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}
#__we_devkit_panel .panel-header .panel-clock {
  font-size: 11px;
  color: #888;
  font-family: monospace;
  white-space: nowrap;
  margin-left: auto;
}
/* ---- 开关按钮（Audio toggle） ---- */
#__we_devkit_panel .toggle-btn {
  background: rgba(255,255,255,0.05);
  border: 1px solid #4CAF50;
  color: #e0e0e0;
  cursor: pointer;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 12px;
  border-radius: 4px;
  min-width: 48px;
  text-align: center;
  letter-spacing: 0.5px;
}
#__we_devkit_panel .toggle-btn:hover {
  background: rgba(255,255,255,0.12);
}
#__we_devkit_panel .toggle-btn.off {
  border-color: #e53935;
  opacity: 0.7;
}

#__we_devkit_panel .panel-header .panel-btn {
  background: none;
  border: none;
  color: #888;
  cursor: pointer;
  font-size: 16px;
  padding: 2px 6px;
  border-radius: 4px;
  line-height: 1;
}
#__we_devkit_panel .panel-header .panel-btn:hover {
  color: #fff;
  background: rgba(255,255,255,0.1);
}

/* ---- 最小化状态（仅显示标题栏） ---- */
#__we_devkit_panel.minimized .panel-body {
  display: none;
}
#__we_devkit_panel.minimized {
  width: auto;
  min-width: 200px;
  max-height: none;
  border-radius: 8px;
  cursor: pointer;
}
#__we_devkit_panel.minimized .panel-header {
  border-bottom: none;
  cursor: pointer;
}
#__we_devkit_panel.minimized .panel-header:hover {
  background: rgba(255, 255, 255, 0.08);
}

/* ---- 滚动内容区 ---- */
#__we_devkit_panel .panel-body {
  overflow-y: auto;
  overflow-x: hidden;
  flex: 1;
  padding: 4px 0;
}
#__we_devkit_panel .panel-body::-webkit-scrollbar {
  width: 4px;
}
#__we_devkit_panel .panel-body::-webkit-scrollbar-track {
  background: transparent;
}
#__we_devkit_panel .panel-body::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.15);
  border-radius: 2px;
}

/* ---- 折叠区段 ---- */
#__we_devkit_panel .section {
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
#__we_devkit_panel .section-header {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  color: #ccc;
  font-weight: 500;
  font-size: 12px;
  transition: background 0.15s;
}
#__we_devkit_panel .section-header:hover {
  background: rgba(255,255,255,0.05);
}
#__we_devkit_panel .section-header .arrow {
  margin-right: 8px;
  font-size: 10px;
  transition: transform 0.2s;
  color: #666;
}
#__we_devkit_panel .section-header .arrow.open {
  transform: rotate(90deg);
}
#__we_devkit_panel .section-header .badge {
  margin-left: auto;
  font-size: 10px;
  color: #888;
  background: rgba(255,255,255,0.08);
  padding: 1px 6px;
  border-radius: 8px;
}
#__we_devkit_panel .section-content {
  padding: 4px 12px 10px;
  display: none;
}
#__we_devkit_panel .section-content.open {
  display: block;
}

/* ---- 表单控件 ---- */
#__we_devkit_panel .row {
  display: flex;
  align-items: center;
  margin: 4px 0;
  gap: 8px;
}
#__we_devkit_panel .row label {
  flex: 0 0 70px;
  font-size: 11px;
  color: #aaa;
}
#__we_devkit_panel .row .value {
  flex: 1;
  font-size: 11px;
  color: #e0e0e0;
  text-align: right;
}
#__we_devkit_panel input[type="range"] {
  flex: 1;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: rgba(255,255,255,0.15);
  border-radius: 2px;
  outline: none;
}
#__we_devkit_panel input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #7c9aff;
  cursor: pointer;
}
#__we_devkit_panel input[type="range"]::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #7c9aff;
  cursor: pointer;
  border: none;
}
#__we_devkit_panel input[type="text"],
#__we_devkit_panel select {
  background: rgba(0,0,0,0.35);
  border: 1px solid rgba(255,255,255,0.1);
  color: #e0e0e0;
  padding: 3px 6px;
  border-radius: 4px;
  font-size: 12px;
  outline: none;
  width: 100%;
  box-sizing: border-box;
}
#__we_devkit_panel input[type="text"]:focus,
#__we_devkit_panel select:focus {
  border-color: #7c9aff;
}
#__we_devkit_panel input[type="checkbox"] {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 3px;
  cursor: pointer;
  background: rgba(0,0,0,0.3);
  display: flex;
  align-items: center;
  justify-content: center;
}
#__we_devkit_panel input[type="checkbox"]:checked {
  background: #7c9aff;
  border-color: #7c9aff;
}
#__we_devkit_panel input[type="checkbox"]:checked::after {
  content: "✓";
  color: #fff;
  font-size: 10px;
  font-weight: bold;
}
#__we_devkit_panel input[type="color"] {
  width: 28px;
  height: 20px;
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 3px;
  padding: 0;
  cursor: pointer;
  background: none;
}
#__we_devkit_panel input[type="file"] {
  font-size: 11px;
  color: #aaa;
  width: 100%;
}

/* ---- 文件/目录选择器 ---- */
#__we_devkit_panel .picker-row {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
}
#__we_devkit_panel .picker-row .picker-value {
  flex: 1;
  font-size: 10px;
  color: #aaa;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  background: rgba(0,0,0,0.35);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 4px;
  padding: 2px 6px;
  min-height: 18px;
  line-height: 18px;
  cursor: default;
}
#__we_devkit_panel .picker-row .picker-btn {
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.12);
  color: #ccc;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 10px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
  flex-shrink: 0;
}
#__we_devkit_panel .picker-row .picker-btn:hover {
  background: rgba(124, 154, 255, 0.25);
  border-color: #7c9aff;
  color: #fff;
}
#__we_devkit_panel .picker-row .picker-btn.clear-btn {
  color: #e57373;
  border-color: rgba(229, 115, 115, 0.3);
}
#__we_devkit_panel .picker-row .picker-btn.clear-btn:hover {
  background: rgba(229, 115, 115, 0.2);
  border-color: #e57373;
}

/* ---- 按钮 ---- */
#__we_devkit_panel .btn-group {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
#__we_devkit_panel .btn {
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.1);
  color: #ddd;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
}
#__we_devkit_panel .btn:hover {
  background: rgba(124, 154, 255, 0.25);
  border-color: #7c9aff;
  color: #fff;
}
#__we_devkit_panel .btn.active {
  background: #7c9aff;
  border-color: #7c9aff;
  color: #fff;
}
#__we_devkit_panel .btn.primary {
  background: #4CAF50;
  border-color: #4CAF50;
  color: #fff;
}
#__we_devkit_panel .btn.primary:hover {
  background: #45a049;
}
#__we_devkit_panel .btn.danger {
  background: #e53935;
  border-color: #e53935;
  color: #fff;
}

/* ---- 媒体封面预览 ---- */
#__we_devkit_panel .thumbnail-preview {
  width: 80px;
  height: 80px;
  border-radius: 6px;
  object-fit: cover;
  border: 1px solid rgba(255,255,255,0.1);
  flex-shrink: 0;
}
#__we_devkit_panel .thumbnail-upload-zone {
  border: 1px dashed rgba(255,255,255,0.2);
  border-radius: 6px;
  padding: 8px;
  text-align: center;
  font-size: 11px;
  color: #888;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}
#__we_devkit_panel .thumbnail-upload-zone:hover {
  border-color: #7c9aff;
  background: rgba(124,154,255,0.08);
}
#__we_devkit_panel .thumbnail-upload-zone.drag-over {
  border-color: #4CAF50;
  background: rgba(76,175,80,0.1);
}

/* ---- 进度条 ---- */
#__we_devkit_panel .timeline-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: #888;
}
#__we_devkit_panel .timeline-row input[type="range"] {
  flex: 1;
}
#__we_devkit_panel .timeline-row .time-label {
  font-family: monospace;
  min-width: 35px;
  text-align: center;
}

/* ---- Properties 面板 ---- */
#__we_devkit_panel .prop-group-title {
  font-size: 11px;
  font-weight: 600;
  color: #7c9aff;
  padding: 6px 0 2px;
  border-bottom: 1px solid rgba(124,154,255,0.15);
  margin: 4px 0;
}
#__we_devkit_panel .prop-row {
  display: grid;
  grid-template-columns: 20px 14px 1fr 1fr auto auto;
  align-items: start;
  gap: 4px;
  padding: 3px 0;
  min-height: 22px;
}
#__we_devkit_panel .prop-row .prop-key-col {
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 1px;
}
#__we_devkit_panel .prop-row .prop-key-col .prop-key {
  font-size: 11px;
  color: #aaa;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
#__we_devkit_panel .prop-row .prop-key-col .prop-i18n-row {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 9px;
  line-height: 1;
}
#__we_devkit_panel .prop-row .prop-key-col .prop-i18n-row .prop-i18n-key {
  color: #666;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
#__we_devkit_panel .prop-row .prop-key-col .prop-i18n-row .prop-i18n-shared-badge {
  color: #ffa726;
  cursor: help;
  flex-shrink: 0;
  font-size: 10px;
}
#__we_devkit_panel .prop-row .prop-control {
  min-width: 0;
}
#__we_devkit_panel .prop-row .prop-control input[type="range"] {
  width: 100%;
  box-sizing: border-box;
}
#__we_devkit_panel .prop-row .prop-control input[type="text"] {
  width: 100%;
  box-sizing: border-box;
}
#__we_devkit_panel .prop-row .prop-control select {
  width: 100%;
  box-sizing: border-box;
}
#__we_devkit_panel .prop-row .prop-control input[type="checkbox"] {
  margin: 0;
}
#__we_devkit_panel .prop-row .prop-control input[type="color"] {
  width: 100%;
  box-sizing: border-box;
  height: 22px;
}
/* slider 的内联 flex 容器占满列宽 */
#__we_devkit_panel .prop-row .prop-control > div {
  width: 100%;
}
/* color 控件后的 hex 标签 */
#__we_devkit_panel .prop-row .prop-control .color-hex {
  font-size: 10px;
  color: #888;
  margin-left: auto;
  white-space: nowrap;
}
#__we_devkit_panel .prop-search {
  width: 100%;
  margin-bottom: 6px;
  background: rgba(0,0,0,0.35);
  border: 1px solid rgba(255,255,255,0.1);
  color: #e0e0e0;
  padding: 5px 8px;
  border-radius: 4px;
  font-size: 12px;
  outline: none;
  box-sizing: border-box;
}
#__we_devkit_panel .prop-search:focus {
  border-color: #7c9aff;
}

/* ---- 配置项工具栏（sticky 固定） ---- */
#__we_devkit_panel .prop-toolbar {
  position: sticky;
  top: 0;
  z-index: 1;
  background: rgba(30, 30, 35, 0.97);
  padding: 2px 0 4px;
  margin: -4px 0 4px;
}

/* ---- 可见性指示器 ---- */
#__we_devkit_panel .visibility-dot {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  margin-right: 4px;
  flex-shrink: 0;
  cursor: help;
  transition: all 0.2s;
}
/* 无条件：纯绿色实心圆点（无文字） */
#__we_devkit_panel .visibility-dot.no-condition {
  background: #4CAF50;
  border: 1px solid #4CAF50;
  color: transparent;
  font-size: 0;
}
/* 有条件且满足：绿色圆底 + 白色对勾 */
#__we_devkit_panel .visibility-dot.visible {
  background: #4CAF50;
  border: 1px solid #4CAF50;
  color: #fff;
  font-size: 10px;
  font-weight: bold;
}
/* 有条件但不满足：红色背景 + 白色 x */
#__we_devkit_panel .visibility-dot.hidden {
  background: #E53935;
  border: 1px solid #E53935;
  color: #fff;
  font-size: 11px;
  font-weight: bold;
}

/* 翻译丢失警告标记 */
#__we_devkit_panel .translation-warn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: rgba(255,152,0,0.2);
  color: #FF9800;
  font-size: 9px;
  font-weight: bold;
  cursor: help;
  border: 1px solid rgba(255,152,0,0.25);
}
/* 翻译正常时的占位空元素 — 保持 grid 列对齐 */
#__we_devkit_panel .translation-spacer {
  display: inline-block;
  width: 14px;
  height: 14px;
}

/* 可见性过滤下拉 */
#__we_devkit_panel .visibility-filter-row {
  display: flex;
  gap: 6px;
  margin-bottom: 6px;
}
#__we_devkit_panel .visibility-filter-row select {
  flex: 0 0 90px;
  font-size: 11px;
}
#__we_devkit_panel .visibility-filter-row .vis-stats {
  font-size: 10px;
  color: #666;
  align-self: center;
  margin-left: auto;
}

/* ---- 操作行（添加 / 导出） ---- */
#__we_devkit_panel .prop-action-row {
  display: flex;
  gap: 6px;
  margin-bottom: 6px;
}
#__we_devkit_panel .prop-action-row .btn {
  flex: 1;
  font-size: 11px;
  padding: 4px 8px;
}

/* ---- 属性编辑/删除按钮 ---- */
#__we_devkit_panel .prop-edit-btn {
  background: rgba(124,154,255,0.12);
  border: 1px solid rgba(124,154,255,0.2);
  color: #7c9aff;
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 9px;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  line-height: 1.4;
  transition: all 0.15s;
}
#__we_devkit_panel .prop-edit-btn:hover {
  background: rgba(124,154,255,0.25);
}
#__we_devkit_panel .prop-del-btn {
  background: rgba(229,115,115,0.12);
  border: 1px solid rgba(229,115,115,0.2);
  color: #e57373;
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 10px;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  line-height: 1.4;
  transition: all 0.15s;
}
#__we_devkit_panel .prop-del-btn:hover {
  background: rgba(229,115,115,0.25);
}

/* ---- 属性编辑弹窗 ---- */
#__we_devkit_panel .prop-modal-overlay,
.prop-modal-overlay {
  all: initial;
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.6);
  z-index: 2147483647;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
}
#__we_devkit_panel .prop-modal-box,
.prop-modal-box {
  background: #2a2a2f;
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 10px;
  padding: 20px;
  min-width: 340px;
  max-width: 460px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.5);
  color: #e0e0e0;
  font-size: 13px;
}
#__we_devkit_panel .prop-modal-title,
.prop-modal-title {
  font-size: 15px;
  font-weight: 600;
  margin: 0 0 14px 0;
  color: #fff;
}
#__we_devkit_panel .prop-modal-label,
.prop-modal-label {
  display: block;
  font-size: 11px;
  color: #aaa;
  margin: 8px 0 3px;
}
#__we_devkit_panel .prop-modal-box input[type="text"],
.prop-modal-box input[type="text"],
#__we_devkit_panel .prop-modal-box input[type="number"],
.prop-modal-box input[type="number"],
#__we_devkit_panel .prop-modal-box select,
.prop-modal-box select {
  width: 100%;
  background: rgba(0,0,0,0.35);
  border: 1px solid rgba(255,255,255,0.1);
  color: #e0e0e0;
  padding: 6px 8px;
  border-radius: 4px;
  font-size: 12px;
  outline: none;
  box-sizing: border-box;
}
#__we_devkit_panel .prop-modal-box input:focus,
.prop-modal-box input:focus {
  border-color: #7c9aff;
}
#__we_devkit_panel .prop-modal-btn-row,
.prop-modal-btn-row {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 16px;
}
#__we_devkit_panel .prop-modal-btn-row .btn,
.prop-modal-btn-row .btn {
  padding: 6px 16px;
  font-size: 12px;
}

/* 隐藏状态的行视觉淡化（保留可见性指示器清晰可见） */
#__we_devkit_panel .prop-row.is-hidden .prop-key {
  opacity: 0.4;
}
#__we_devkit_panel .prop-row.is-hidden .prop-control {
  opacity: 0.4;
  pointer-events: none;
}
#__we_devkit_panel .prop-row.is-hidden .visibility-dot {
  opacity: 1 !important;
}
#__we_devkit_panel .prop-row .condition-tooltip {
  display: none;
  position: absolute;
  background: rgba(0,0,0,0.9);
  color: #ccc;
  font-size: 10px;
  padding: 4px 8px;
  border-radius: 4px;
  white-space: nowrap;
  z-index: 10;
  pointer-events: none;
}
#__we_devkit_panel .prop-row .visibility-dot:hover + .condition-tooltip {
  display: block;
}

/* ---- 响应式 ---- */
@media (max-width: 480px) {
  #__we_devkit_panel {
    width: calc(100vw - 16px);
    max-height: 70vh;
    left: 8px !important;
    right: 8px !important;
  }
}
`;

/**
 * 浮动属性编辑窗口样式 — 注入到 document.head。
 * 不含 #__we_devkit_panel 前缀，确保在全局生效。
 */
export const GLOBAL_MODAL_STYLES = `
.prop-modal-float {
  all: initial;
  position: fixed;
  z-index: 2147483646;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
}
.prop-modal-float-inner {
  background: rgba(30, 30, 35, 0.95);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 10px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.5);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  overflow: hidden;
  user-select: none;
}
.prop-modal-float-header {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background: rgba(0,0,0,0.3);
  border-bottom: 1px solid rgba(255,255,255,0.08);
  cursor: move;
}
.prop-modal-float-title {
  font-size: 12px;
  font-weight: 600;
  color: #ccc;
  letter-spacing: 0.5px;
  flex: 1;
}
.prop-modal-float-header .panel-btn {
  background: none;
  border: none;
  color: #888;
  cursor: pointer;
  font-size: 16px;
  padding: 2px 6px;
  border-radius: 4px;
  line-height: 1;
}
.prop-modal-float-header .panel-btn:hover {
  color: #fff;
  background: rgba(255,255,255,0.1);
}
.prop-modal-float-body {
  padding: 0;
  color: #e0e0e0;
  font-size: 13px;
}

/* ---- 双列行 ---- */
.prop-modal-row {
  display: flex;
  align-items: center;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  min-height: 32px;
}
.prop-modal-row:last-of-type {
  border-bottom: none;
}
.prop-modal-row-label {
  flex: 0 0 90px;
  font-size: 11px;
  color: #aaa;
  padding: 0 8px;
  text-align: right;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.prop-modal-row-control {
  flex: 1;
  padding: 3px 8px 3px 0;
  min-width: 0;
}

/* ---- 控件统一样式 ---- */
.prop-modal-row-control input[type="text"],
.prop-modal-row-control input[type="number"] {
  width: 100%;
  background: #1a1a1a;
  border: 1px solid #444;
  color: #e0e0e0;
  padding: 4px 8px;
  border-radius: 3px;
  font-size: 12px;
  outline: none;
  box-sizing: border-box;
  height: 24px;
}
.prop-modal-row-control input:focus {
  border-color: #7c9aff;
}
.prop-modal-row-control input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ---- 自定义下拉框（带箭头） ---- */
.prop-modal-select {
  width: 100%;
  height: 24px;
  background: #1a1a1a;
  border: 1px solid #444;
  color: #e0e0e0;
  padding: 0 24px 0 8px;
  border-radius: 3px;
  font-size: 12px;
  outline: none;
  box-sizing: border-box;
  cursor: pointer;
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23888'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
}
.prop-modal-select:focus {
  border-color: #7c9aff;
}
.prop-modal-select option {
  background: #1a1a1a;
  color: #e0e0e0;
}

/* ---- 选项表格 ---- */
.prop-opts-table {
  border: 1px solid #444;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 4px;
}
.prop-opts-thead {
  display: flex;
  background: rgba(255,255,255,0.05);
  border-bottom: 1px solid #444;
}
.prop-opts-th {
  flex: 1 1 0;
  min-width: 0;
  font-size: 10px;
  color: #888;
  padding: 3px 6px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.prop-opts-th-action {
  flex: 0 0 28px;
  text-align: center;
}
.prop-opts-tbody {
}
.prop-opts-row {
  display: flex;
  align-items: center;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.prop-opts-row:last-child {
  border-bottom: none;
}
.prop-opts-input {
  flex: 1 1 0;
  min-width: 0;
  background: transparent !important;
  border: none !important;
  color: #e0e0e0;
  padding: 3px 6px !important;
  font-size: 12px;
  outline: none;
  height: 24px;
  box-sizing: border-box;
}
.prop-opts-input:focus {
  background: rgba(124,154,255,0.08) !important;
}
.prop-opts-del-btn {
  flex: 0 0 28px;
  background: none;
  border: none;
  color: #e57373;
  cursor: pointer;
  font-size: 12px;
  padding: 2px;
  text-align: center;
  line-height: 1;
  opacity: 0.6;
}
.prop-opts-del-btn:hover {
  opacity: 1;
  color: #f44336;
}
.prop-opts-add-btn {
  background: rgba(255,255,255,0.06);
  border: 1px dashed #555;
  color: #aaa;
  padding: 3px 10px;
  border-radius: 3px;
  font-size: 11px;
  cursor: pointer;
  width: 100%;
  box-sizing: border-box;
  transition: all 0.15s;
}
.prop-opts-add-btn:hover {
  background: rgba(124,154,255,0.12);
  border-color: #7c9aff;
  color: #7c9aff;
}

/* ---- 按钮行 ---- */
.prop-modal-btn-row {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  padding: 10px 12px;
  border-top: 1px solid rgba(255,255,255,0.08);
}
.prop-modal-btn-row .btn {
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.1);
  color: #ddd;
  padding: 5px 18px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
}
.prop-modal-btn-row .btn:hover {
  background: rgba(124,154,255,0.25);
  border-color: #7c9aff;
  color: #fff;
}
.prop-modal-btn-row .btn.primary {
  background: #4CAF50;
  border-color: #4CAF50;
  color: #fff;
}
.prop-modal-btn-row .btn.primary:hover {
  background: #45a049;
}

/* ---- 翻译编辑区 ---- */
.prop-modal-trans-section {
  margin: 0;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  background: rgba(0,0,0,0.1);
}
.prop-modal-trans-header {
  font-size: 11px;
  font-weight: 600;
  color: #999;
  padding: 4px 8px;
  letter-spacing: 0.3px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  text-align: center;
}
.prop-modal-trans-row {
  display: flex;
  align-items: center;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  min-height: 29px;
}
.prop-modal-trans-row:last-child {
  border-bottom: none;
}
.prop-modal-trans-label {
  flex: 0 0 90px;
  font-size: 11px;
  color: #aaa;
  padding: 0 8px;
  text-align: right;
  white-space: nowrap;
  overflow: hidden;
}
.prop-modal-trans-input {
  flex: 1;
  background: #1a1a1a;
  border: 1px solid #444;
  color: #e0e0e0;
  padding: 4px 8px;
  border-radius: 3px;
  font-size: 12px;
  outline: none;
  height: 24px;
  box-sizing: border-box;
  margin: 0 8px 0 0;
}
.prop-modal-trans-input:focus {
  border-color: #7c9aff;
}
.prop-modal-trans-input::placeholder {
  color: #555;
}
.prop-modal-trans-empty {
  padding: 6px 8px;
  font-size: 10px;
  color: #555;
  font-style: italic;
}
`;
