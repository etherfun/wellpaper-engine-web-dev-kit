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
  grid-template-columns: 20px 14px 1fr 1.2fr;
  align-items: center;
  gap: 4px;
  padding: 3px 0;
  min-height: 22px;
}
#__we_devkit_panel .prop-row .prop-key {
  font-size: 11px;
  color: #aaa;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
