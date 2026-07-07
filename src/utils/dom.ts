/**
 * DOM 工具：行/列布局、字段、按钮、拖拽宿主。
 * 控制面板和属性编辑弹窗复用。
 */

export function createRow(className = 'row'): HTMLElement {
  const row = document.createElement('div');
  row.className = className;
  return row;
}

export function createLabel(text: string): HTMLElement {
  const lbl = document.createElement('label');
  lbl.textContent = text;
  return lbl;
}

export function createButton(text: string, title: string, onClick: () => void, variant?: string): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.className = 'btn' + (variant ? ' ' + variant : '');
  btn.textContent = text;
  btn.title = title;
  btn.addEventListener('click', onClick);
  return btn;
}

export function createSlider(
  container: HTMLElement,
  labelText: string,
  min: number,
  max: number,
  step: number,
  defaultValue: number,
  onChange: (v: number) => void
): HTMLInputElement {
  const row = createRow();

  const labelEl = createLabel(labelText);
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

export function createTextFieldRow(labelText: string, placeholder: string): { row: HTMLElement; input: HTMLInputElement } {
  const row = document.createElement('div');
  row.style.display = 'flex';
  row.style.alignItems = 'center';
  row.style.gap = '6px';

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = placeholder;
  input.style.flex = '1';
  row.appendChild(input);

  if (labelText) {
    const label = createLabel(labelText);
    row.insertBefore(label, input);
  }

  return { row, input };
}

/**
 * 可拖拽宿主：返回 { host, destroy }。
 * 触发条件：按下 host 内的 drag-handle 元素开始拖动；document 级 mousemove/mouseup。
 */
export function createDraggableHost(opts: {
  className: string;
  cssText: string;
  handleSelector: string;
}): { host: HTMLElement; destroy: () => void } {
  const host = document.createElement('div');
  host.className = opts.className;
  host.style.cssText = opts.cssText;

  let isDragging = false;
  let dragOffsetX = 0;
  let dragOffsetY = 0;

  const handleMouseDown = (e: MouseEvent): void => {
    if ((e.target as HTMLElement).closest('.panel-btn')) return;
    isDragging = true;
    dragOffsetX = e.clientX - host.offsetLeft;
    dragOffsetY = e.clientY - host.offsetTop;
    host.style.cursor = 'grabbing';
  };
  const handleMouseMove = (e: MouseEvent): void => {
    if (!isDragging) return;
    host.style.left = `${e.clientX - dragOffsetX}px`;
    host.style.top = `${e.clientY - dragOffsetY}px`;
    host.style.right = 'auto';
  };
  const handleMouseUp = (): void => {
    if (!isDragging) return;
    isDragging = false;
    host.style.cursor = '';
  };

  // 等 host 挂到 DOM 后再绑 handle
  const observer = new MutationObserver(() => {
    const handle = host.querySelector(opts.handleSelector);
    if (handle) {
      handle.addEventListener('mousedown', handleMouseDown as EventListener);
      observer.disconnect();
    }
  });
  observer.observe(host, { childList: true, subtree: true });

  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);

  return {
    host,
    destroy: () => {
      observer.disconnect();
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    },
  };
}

/** Shadow DOM 容器工厂 */
export function createShadowHost(zIndex = 2147483647): { host: HTMLElement; shadow: ShadowRoot } {
  const host = document.createElement('div');
  host.style.cssText = `all:initial;position:fixed;z-index:${zIndex};top:0;left:0;width:0;height:0;`;
  const shadow = host.attachShadow({ mode: 'open' });
  return { host, shadow };
}

/** 创建带阴影样式类 + 拖拽的内联样式片段 */
export const PANEL_BASE_CSS = `
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
`;