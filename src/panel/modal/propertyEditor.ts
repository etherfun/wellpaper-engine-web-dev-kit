/**
 * 属性编辑弹窗 — V2
 *
 * 浮动可拖拽窗口，支持添加新属性 / 编辑已有属性。
 *
 * 字段布局：
 *   1. 基础：键名 (key)
 *   2. i18n：标题(text) + 显示名(displayName)
 *   3. 类型 + 默认值（按类型动态渲染专属控件）
 *   4. 类型专属区域：slider 范围 / file video / directory mode / combo options
 *   5. 元数据：order + index + condition
 *
 * 改进：
 *   - text / displayName 拆分为独立字段
 *   - text 字段联动 localization 状态提示
 *   - 类型切换时 confirm 防止误删
 *   - Bool 用 checkbox 组而非 select
 *   - Slider 用 [slider + number] 联动
 *   - Color 用 picker + WE hex 同步
 *   - Combo 用统一 widget
 */

import type { PropertyDefInput, ProjectPropertyDef, PropertyType } from '../../types';
import { getPanelMessages } from '../i18n';
import { hexToWeColor, weColorToHex } from '../../utils/color';
import { createDraggableHost } from '../../utils/dom';

export type PropertyEditorSaveHandler = (
  isNew: boolean,
  originalKey: string | null,
  def: PropertyDefInput
) => void;

const TYPE_OPTIONS: PropertyType[] = [
  'bool',
  'slider',
  'combo',
  'color',
  'text',
  'textinput',
  'file',
  'directory',
  'group',
];

const DEFAULT_TYPE: PropertyType = 'text';

/** 上下文：外部传入的 localization 字典（用于 text 字段的状态提示） */
export interface PropertyEditorContext {
  activeLocalization: Record<string, string>;
  allLocalizations: Record<string, Record<string, string>>;
  /** 当前语言键 */
  activeLanguage: string;
  /** 所有可用语言键 */
  availableLanguages: string[];
}

export function showPropertyModal(
  prop: ProjectPropertyDef | null,
  onSave: PropertyEditorSaveHandler,
  context?: PropertyEditorContext
): void {
  const isNew = prop === null;
  const ctx: PropertyEditorContext = context ?? {
    activeLocalization: {},
    allLocalizations: {},
    activeLanguage: 'en-us',
    availableLanguages: [],
  };

  const { host, destroy } = createDraggableHost({
    className: 'prop-modal-float',
    cssText: 'all:initial;position:fixed;z-index:2147483646;top:80px;left:60px;width:420px;',
    handleSelector: '.prop-modal-float-header',
  });

  const panel = document.createElement('div');
  panel.className = 'prop-modal-float-inner';

  // ---- 标题栏 ----
  const header = document.createElement('div');
  header.className = 'prop-modal-float-header';

  const title = document.createElement('span');
  title.className = 'prop-modal-float-title';
  title.textContent = isNew
    ? getPanelMessages().addPropertyTitle
    : getPanelMessages().editPropertyTitle;
  header.appendChild(title);

  const closeBtn = document.createElement('button');
  closeBtn.className = 'panel-btn';
  closeBtn.textContent = '×';
  closeBtn.title = getPanelMessages().close;
  closeBtn.addEventListener('click', closeModal);
  header.appendChild(closeBtn);

  panel.appendChild(header);

  const body = document.createElement('div');
  body.className = 'prop-modal-float-body';
  panel.appendChild(body);

  function closeModal(): void {
    destroy();
    host.remove();
  }

  function addField(labelText: string, control: HTMLElement, helper?: string): void {
    const row = document.createElement('div');
    row.className = 'prop-modal-row';

    const lbl = document.createElement('span');
    lbl.className = 'prop-modal-row-label';
    lbl.textContent = labelText;
    row.appendChild(lbl);

    const wrap = document.createElement('div');
    wrap.className = 'prop-modal-row-control';
    wrap.appendChild(control);
    if (helper) {
      const help = document.createElement('div');
      help.className = 'prop-modal-helper';
      help.textContent = helper;
      wrap.appendChild(help);
    }
    row.appendChild(wrap);

    body.appendChild(row);
  }

  function addSeparator(text: string): void {
    const sep = document.createElement('div');
    sep.className = 'prop-modal-sep';
    sep.textContent = text;
    body.appendChild(sep);
  }

  // ---- 1. 键名（基础） ----
  const keyInput = document.createElement('input');
  keyInput.type = 'text';
  keyInput.className = 'prop-modal-input';
  keyInput.value = prop?.key ?? '';
  keyInput.placeholder = 'rgb_show';
  if (!isNew) keyInput.disabled = true;
  addField(getPanelMessages().propertyKey, keyInput, isNew ? '' : '（编辑模式不可修改）');

  // ---- 2. i18n ----
  addSeparator('🌐 ' + (ctx.activeLanguage || 'localization'));

  // text (i18n key)
  const textInput = document.createElement('input');
  textInput.type = 'text';
  textInput.className = 'prop-modal-input';
  textInput.value = prop?.text ?? '';
  textInput.placeholder = 'ui_color';

  const textStatus = document.createElement('div');
  textStatus.className = 'prop-modal-text-status';

  function refreshTextStatus(): void {
    const key = textInput.value.trim();
    if (!key) {
      textStatus.textContent = '';
      textStatus.className = 'prop-modal-text-status';
      return;
    }
    const exists = key in ctx.activeLocalization;
    if (exists) {
      textStatus.textContent = `${getPanelMessages().textInLocalization} → "${ctx.activeLocalization[key]}"`;
      textStatus.className = 'prop-modal-text-status ok';
    } else {
      textStatus.textContent = getPanelMessages().textNotInLocalization;
      textStatus.className = 'prop-modal-text-status warn';
    }
  }
  textInput.addEventListener('input', refreshTextStatus);
  refreshTextStatus();

  const textWrap = document.createElement('div');
  textWrap.appendChild(textInput);
  textWrap.appendChild(textStatus);
  addField(getPanelMessages().propertyText, textWrap);

  // displayName (直接显示名)
  const displayNameInput = document.createElement('input');
  displayNameInput.type = 'text';
  displayNameInput.className = 'prop-modal-input';
  displayNameInput.value = prop?.displayName ?? '';
  displayNameInput.placeholder = 'RGB 灯光';
  addField(getPanelMessages().propertyDisplayName, displayNameInput);

  // ---- 3. 类型 + 默认值 ----
  addSeparator('📦 ' + getPanelMessages().sectionProperties);

  const typeSelect = document.createElement('select');
  typeSelect.className = 'prop-modal-select';
  for (const t of TYPE_OPTIONS) {
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = t.charAt(0).toUpperCase() + t.slice(1);
    if (prop?.type === t) opt.selected = true;
    typeSelect.appendChild(opt);
  }
  if (!prop) {
    typeSelect.value = DEFAULT_TYPE;
  }

  const typeRow = document.createElement('div');
  typeRow.className = 'prop-modal-row';
  const typeLabel = document.createElement('span');
  typeLabel.className = 'prop-modal-row-label';
  typeLabel.textContent = getPanelMessages().propertyType;
  typeRow.appendChild(typeLabel);
  const typeWrap = document.createElement('div');
  typeWrap.className = 'prop-modal-row-control';
  typeWrap.appendChild(typeSelect);
  typeRow.appendChild(typeWrap);
  body.appendChild(typeRow);

  // 默认值容器
  let currentValControl: HTMLElement | null = null;
  const valRow = document.createElement('div');
  valRow.className = 'prop-modal-row';
  const valLabel = document.createElement('span');
  valLabel.className = 'prop-modal-row-label';
  valLabel.textContent = getPanelMessages().propertyValue;
  valRow.appendChild(valLabel);
  const valWrap = document.createElement('div');
  valWrap.className = 'prop-modal-row-control';
  valRow.appendChild(valWrap);
  body.appendChild(valRow);

  function applyFieldStyle(inp: HTMLInputElement): void {
    inp.style.cssText =
      'width:100%;background:#1a1a1a;border:1px solid #444;color:#e0e0e0;padding:4px 8px;border-radius:3px;font-size:12px;outline:none;box-sizing:border-box;height:24px;';
  }

  function makeBoolControl(): HTMLElement {
    const row = document.createElement('div');
    row.className = 'prop-bool-group';

    const trueLabel = document.createElement('label');
    trueLabel.className = 'prop-bool-option';
    const trueRadio = document.createElement('input');
    trueRadio.type = 'radio';
    trueRadio.name = '__prop_bool';
    trueRadio.value = 'true';
    trueLabel.appendChild(trueRadio);
    trueLabel.appendChild(document.createTextNode('✓ True'));

    const falseLabel = document.createElement('label');
    falseLabel.className = 'prop-bool-option';
    const falseRadio = document.createElement('input');
    falseRadio.type = 'radio';
    falseRadio.name = '__prop_bool';
    falseRadio.value = 'false';
    falseLabel.appendChild(falseRadio);
    falseLabel.appendChild(document.createTextNode('✗ False'));

    const currentVal = prop?.value;
    if (currentVal === false) falseRadio.checked = true;
    else trueRadio.checked = true;

    row.appendChild(trueLabel);
    row.appendChild(falseLabel);

    const hidden = document.createElement('input');
    hidden.type = 'hidden';
    Object.defineProperty(hidden, 'value', {
      get() {
        return trueRadio.checked ? 'true' : 'false';
      },
      set(v) {
        const target = String(v).toLowerCase() === 'true' ? trueRadio : falseRadio;
        target.checked = true;
      },
    });
    row.appendChild(hidden);
    return row;
  }

  function makeSliderControl(): HTMLElement {
    const initial =
      typeof prop?.value === 'number' ? prop.value : parseFloat(prop?.value as string) || 50;
    const wrap = document.createElement('div');
    wrap.className = 'prop-slider-group';
    wrap.style.cssText = 'display:flex;gap:6px;align-items:center;';

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(prop?.min ?? 0);
    slider.max = String(prop?.max ?? 100);
    slider.step = String(prop?.step ?? 1);
    slider.value = String(initial);
    slider.style.cssText = 'flex:1;';

    const numInput = document.createElement('input');
    numInput.type = 'number';
    numInput.className = 'prop-modal-input';
    numInput.value = String(initial);
    numInput.style.cssText = 'width:60px;height:24px;background:#1a1a1a;border:1px solid #444;color:#e0e0e0;padding:2px 6px;border-radius:3px;font-size:12px;outline:none;';
    slider.addEventListener('input', () => {
      numInput.value = slider.value;
    });
    numInput.addEventListener('input', () => {
      const v = parseFloat(numInput.value);
      if (!Number.isNaN(v)) slider.value = String(v);
    });

    wrap.appendChild(slider);
    wrap.appendChild(numInput);

    const hidden = document.createElement('input');
    hidden.type = 'hidden';
    Object.defineProperty(hidden, 'value', {
      get() {
        return numInput.value;
      },
    });
    wrap.appendChild(hidden);
    return wrap;
  }

  function makeColorControl(): HTMLElement {
    const weColor = prop?.value ? String(prop.value) : '1 1 1';
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;align-items:center;gap:8px;';

    const picker = document.createElement('input');
    picker.type = 'color';
    picker.value = weColorToHex(weColor, '#ffffff');
    picker.style.cssText = 'width:36px;height:28px;border:1px solid #444;border-radius:3px;padding:0;cursor:pointer;background:none;';

    const hexLabel = document.createElement('span');
    hexLabel.style.cssText = 'font-size:11px;color:#aaa;font-family:monospace;';
    hexLabel.textContent = picker.value.toUpperCase();

    const weLabel = document.createElement('span');
    weLabel.style.cssText = 'font-size:10px;color:#666;font-family:monospace;';
    weLabel.textContent = `WE: ${weColor}`;

    picker.addEventListener('input', () => {
      hexLabel.textContent = picker.value.toUpperCase();
      weHidden.value = hexToWeColor(picker.value);
      weLabel.textContent = `WE: ${weHidden.value}`;
    });

    const weHidden = document.createElement('input');
    weHidden.type = 'hidden';
    weHidden.value = weColor;

    wrap.appendChild(picker);
    wrap.appendChild(hexLabel);
    wrap.appendChild(weLabel);
    wrap.appendChild(weHidden);
    return wrap;
  }

  function makeComboControl(getRows: () => NodeListOf<Element>): HTMLElement {
    const sel = document.createElement('select');
    sel.className = 'prop-modal-select';
    refreshComboOptions(sel);
    const obs = new MutationObserver(() => refreshComboOptions(sel));
    obs.observe(getRows() as unknown as Node, { childList: true, subtree: true });
    // also observe tbody directly (more reliable than the nodelist snapshot)
    const observer = new MutationObserver(() => refreshComboOptions(sel));
    // observer attached later once tbody is created
    (sel as unknown as { __attachObserver: (n: Node) => void }).__attachObserver = (n) =>
      observer.observe(n, { childList: true, subtree: true });
    return sel;
  }

  function refreshComboOptions(sel: HTMLSelectElement): void {
    const current = sel.value;
    sel.innerHTML = '';
    const rows = (comboRowsRef ?? []).slice();
    let hasOptions = false;
    for (const r of rows) {
      const inputs = r.querySelectorAll('input');
      const label = (inputs[0] as HTMLInputElement | undefined)?.value.trim() ?? '';
      const value = (inputs[1] as HTMLInputElement | undefined)?.value.trim() ?? '';
      if (!label && !value) continue;
      const opt = document.createElement('option');
      opt.value = value || label;
      opt.textContent = label || value;
      sel.appendChild(opt);
      hasOptions = true;
    }
    if (!hasOptions) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = getPanelMessages().noOptionsLabel;
      opt.disabled = true;
      sel.appendChild(opt);
    }
    for (const opt of Array.from(sel.options)) {
      if (opt.value === current) {
        opt.selected = true;
        break;
      }
    }
  }

  function makeTextControl(): HTMLElement {
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.className = 'prop-modal-input';
    inp.value = prop?.value !== undefined ? String(prop.value) : '';
    applyFieldStyle(inp);
    return inp;
  }

  function rebuildValueControl(): void {
    valWrap.innerHTML = '';
    const t = typeSelect.value as PropertyType;
    switch (t) {
      case 'bool':
        currentValControl = makeBoolControl();
        break;
      case 'slider':
        currentValControl = makeSliderControl();
        break;
      case 'color':
        currentValControl = makeColorControl();
        break;
      case 'combo':
        currentValControl = makeComboControl(() => comboTbody.querySelectorAll('.prop-opts-row'));
        break;
      case 'text':
      case 'textinput':
      case 'file':
      case 'directory':
      case 'group':
      default:
        currentValControl = makeTextControl();
        break;
    }
    valWrap.appendChild(currentValControl);
  }

  // ---- 4. 类型专属区域（slider range / file video / directory mode） ----
  addSeparator('⚙ ' + getPanelMessages().typeSpecific);

  const typeSpecificRow = document.createElement('div');
  typeSpecificRow.className = 'prop-modal-row';
  const typeSpecificLabel = document.createElement('span');
  typeSpecificLabel.className = 'prop-modal-row-label';
  typeSpecificLabel.textContent = '';
  typeSpecificRow.appendChild(typeSpecificLabel);
  const typeSpecificWrap = document.createElement('div');
  typeSpecificWrap.className = 'prop-modal-row-control';
  typeSpecificWrap.style.cssText = 'display:flex;flex-direction:column;gap:6px;width:100%;';
  typeSpecificRow.appendChild(typeSpecificWrap);
  body.appendChild(typeSpecificRow);

  // slider 范围
  const sliderMin = document.createElement('input');
  sliderMin.type = 'number'; sliderMin.step = 'any';
  sliderMin.className = 'prop-modal-input-sm';
  sliderMin.placeholder = getPanelMessages().minLabel;
  sliderMin.value = String(prop?.min ?? 0);

  const sliderMax = document.createElement('input');
  sliderMax.type = 'number'; sliderMax.step = 'any';
  sliderMax.className = 'prop-modal-input-sm';
  sliderMax.placeholder = getPanelMessages().maxLabel;
  sliderMax.value = String(prop?.max ?? 100);

  const sliderStep = document.createElement('input');
  sliderStep.type = 'number'; sliderStep.step = 'any';
  sliderStep.className = 'prop-modal-input-sm';
  sliderStep.placeholder = getPanelMessages().stepLabel;
  sliderStep.value = String(prop?.step ?? 1);

  const sliderPrecision = document.createElement('input');
  sliderPrecision.type = 'number'; sliderPrecision.min = '0'; sliderPrecision.step = '1';
  sliderPrecision.className = 'prop-modal-input-sm';
  sliderPrecision.placeholder = getPanelMessages().precisionLabel;
  sliderPrecision.value = String(prop?.precision ?? 0);

  const sliderFractionLabel = document.createElement('label');
  sliderFractionLabel.className = 'prop-modal-check-label';
  const sliderFraction = document.createElement('input');
  sliderFraction.type = 'checkbox';
  sliderFraction.checked = prop?.fraction ?? false;
  sliderFractionLabel.appendChild(sliderFraction);
  sliderFractionLabel.appendChild(document.createTextNode(getPanelMessages().fractionLabel));

  // file video
  const fileVideoLabel = document.createElement('label');
  fileVideoLabel.className = 'prop-modal-check-label';
  const fileVideo = document.createElement('input');
  fileVideo.type = 'checkbox';
  fileVideo.checked = prop?.fileType === 'video';
  fileVideoLabel.appendChild(fileVideo);
  fileVideoLabel.appendChild(document.createTextNode(getPanelMessages().videoModeLabel));

  // directory ondemand
  const dirOndemandLabel = document.createElement('label');
  dirOndemandLabel.className = 'prop-modal-check-label';
  const dirOndemand = document.createElement('input');
  dirOndemand.type = 'checkbox';
  dirOndemand.checked = prop?.mode === 'ondemand';
  dirOndemandLabel.appendChild(dirOndemand);
  dirOndemandLabel.appendChild(document.createTextNode(getPanelMessages().ondemandModeLabel));

  function rebuildTypeSpecificFields(): void {
    typeSpecificWrap.innerHTML = '';
    const t = typeSelect.value;
    typeSpecificLabel.textContent = t.charAt(0).toUpperCase() + t.slice(1);
    if (t === 'slider') {
      // 2-column grid: label / input pairs
      const grid = document.createElement('div');
      grid.className = 'prop-modal-grid-2col';

      const fields: Array<[string, HTMLElement]> = [
        [getPanelMessages().minLabel, sliderMin],
        [getPanelMessages().maxLabel, sliderMax],
        [getPanelMessages().stepLabel, sliderStep],
        [getPanelMessages().precisionLabel, sliderPrecision],
      ];
      for (const [lbl, inp] of fields) {
        const labelEl = document.createElement('span');
        labelEl.className = 'prop-modal-grid-label';
        labelEl.textContent = lbl;
        grid.appendChild(labelEl);
        grid.appendChild(inp);
      }
      typeSpecificWrap.appendChild(grid);
      typeSpecificWrap.appendChild(sliderFractionLabel);
    } else if (t === 'file') {
      const row = document.createElement('div');
      row.className = 'prop-modal-inline-row';
      row.appendChild(fileVideoLabel);
      typeSpecificWrap.appendChild(row);
    } else if (t === 'directory') {
      const row = document.createElement('div');
      row.className = 'prop-modal-inline-row';
      row.appendChild(fileVideoLabel);
      row.appendChild(dirOndemandLabel);
      typeSpecificWrap.appendChild(row);
    } else {
      typeSpecificLabel.textContent = '—';
    }
  }

  rebuildTypeSpecificFields();

  // ---- 5. Combo 选项表格（仅 combo 类型显示） ----
  addSeparator('📋 ' + getPanelMessages().propertyOptions);

  const optsWrap = document.createElement('div');
  optsWrap.className = 'prop-opts-container';

  const optsTable = document.createElement('div');
  optsTable.className = 'prop-opts-table';

  const thead = document.createElement('div');
  thead.className = 'prop-opts-thead';
  for (const [text, cls] of [
    [getPanelMessages().labelLabel, 'prop-opts-th'],
    [getPanelMessages().valueLabel, 'prop-opts-th'],
    ['', 'prop-opts-th prop-opts-th-action'],
  ] as const) {
    const span = document.createElement('span');
    span.textContent = text;
    span.className = cls;
    thead.appendChild(span);
  }
  optsTable.appendChild(thead);

  const comboTbody = document.createElement('div');
  comboTbody.className = 'prop-opts-tbody';
  optsTable.appendChild(comboTbody);

  let comboRowsRef: Element[] = [];
  function refreshComboRowsRef(): void {
    comboRowsRef = Array.from(comboTbody.querySelectorAll('.prop-opts-row'));
  }

  function addOptionRow(optLabel: string, optValue: string): void {
    const row = document.createElement('div');
    row.className = 'prop-opts-row';

    const inpLabel = document.createElement('input');
    inpLabel.type = 'text';
    inpLabel.className = 'prop-opts-input';
    inpLabel.value = optLabel;
    inpLabel.placeholder = getPanelMessages().labelLabel;

    const inpValue = document.createElement('input');
    inpValue.type = 'text';
    inpValue.className = 'prop-opts-input';
    inpValue.value = optValue;
    inpValue.placeholder = getPanelMessages().valueLabel;

    const delBtn = document.createElement('button');
    delBtn.className = 'prop-opts-del-btn';
    delBtn.textContent = '✕';
    delBtn.addEventListener('click', () => {
      row.remove();
      refreshComboRowsRef();
    });

    row.appendChild(inpLabel);
    row.appendChild(inpValue);
    row.appendChild(delBtn);
    comboTbody.appendChild(row);
    refreshComboRowsRef();
  }

  if (prop?.options && prop.options.length > 0) {
    for (const o of prop.options) {
      addOptionRow(o.label, String(o.value));
    }
  } else {
    addOptionRow('', '');
  }

  const addOptBtn = document.createElement('button');
  addOptBtn.className = 'prop-opts-add-btn';
  addOptBtn.textContent = getPanelMessages().addRowLabel;
  addOptBtn.addEventListener('click', () => addOptionRow('', ''));

  optsWrap.appendChild(optsTable);
  optsWrap.appendChild(addOptBtn);

  // 整体作为一个 row 放进 body
  const optsRow = document.createElement('div');
  optsRow.className = 'prop-modal-row';
  optsRow.appendChild(optsWrap);
  body.appendChild(optsRow);

  // ---- 6. 元数据（order + index + condition） ----
  addSeparator('🗂 ' + getPanelMessages().sectionProperties);

  const orderInput = document.createElement('input');
  orderInput.type = 'number';
  orderInput.className = 'prop-modal-input-sm';
  orderInput.value = String(prop?.order ?? 9999);
  addField(getPanelMessages().propertyOrder, orderInput);

  const indexInput = document.createElement('input');
  indexInput.type = 'number';
  indexInput.className = 'prop-modal-input-sm';
  indexInput.value = String(prop?.index ?? 0);
  addField(getPanelMessages().propertyIndex, indexInput);

  const condInput = document.createElement('input');
  condInput.type = 'text';
  condInput.className = 'prop-modal-input';
  condInput.value = prop?.condition ?? '';
  condInput.placeholder = 'propA.value == 1 && propB.value > 0';
  addField(getPanelMessages().propertyCondition, condInput, getPanelMessages().propertyConditionHelp);

  // ---- 类型切换 confirm ----
  typeSelect.addEventListener('change', () => {
    const hasValue =
      currentValControl &&
      !(currentValControl instanceof HTMLInputElement && currentValControl.value === '');
    if (hasValue && !confirm(getPanelMessages().typeChangeConfirm)) {
      // 还原选择
      typeSelect.value = prop?.type ?? DEFAULT_TYPE;
      return;
    }
    rebuildValueControl();
    rebuildTypeSpecificFields();
    optsRow.style.display = typeSelect.value === 'combo' ? '' : 'none';
  });

  rebuildValueControl();
  optsRow.style.display = typeSelect.value === 'combo' ? '' : 'none';

  // ---- 按钮行 ----
  const btnRow = document.createElement('div');
  btnRow.className = 'prop-modal-btn-row';

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'prop-modal-btn prop-modal-btn-secondary';
  cancelBtn.textContent = getPanelMessages().cancel;
  cancelBtn.addEventListener('click', closeModal);
  btnRow.appendChild(cancelBtn);

  const saveBtn = document.createElement('button');
  saveBtn.className = 'prop-modal-btn prop-modal-btn-primary';
  saveBtn.textContent = getPanelMessages().save;
  saveBtn.addEventListener('click', () => {
    const newKey = keyInput.value.trim();
    if (!newKey) {
      alert(getPanelMessages().keyRequiredAlert);
      return;
    }
    const newType = typeSelect.value as PropertyType;
    const newOrder = parseInt(orderInput.value, 10) || 9999;
    const newIndex = parseInt(indexInput.value, 10) || 0;

    let options: PropertyDefInput['options'];
    if (newType === 'combo') {
      const collected: { value: unknown; label: string }[] = [];
      for (const r of comboRowsRef) {
        const inputs = r.querySelectorAll('input');
        const label = (inputs[0] as HTMLInputElement | undefined)?.value.trim() ?? '';
        const value = (inputs[1] as HTMLInputElement | undefined)?.value.trim() ?? '';
        if (label || value) {
          const numVal = Number(value);
          collected.push({ label, value: Number.isNaN(numVal) ? value : numVal });
        }
      }
      if (collected.length > 0) options = collected;
    }

    let defaultVal: unknown;
    if (currentValControl) {
      if (newType === 'bool') {
        defaultVal =
          (currentValControl as HTMLElement).querySelector<HTMLInputElement>(
            'input[name="__prop_bool"]:checked'
          )?.value === 'true';
      } else if (newType === 'slider') {
        const numInp = currentValControl.querySelector<HTMLInputElement>(
          'input[type="number"]'
        );
        defaultVal = numInp ? parseFloat(numInp.value) || 50 : 50;
      } else if (newType === 'color') {
        const hidden = currentValControl.querySelector<HTMLInputElement>(
          'input[type="hidden"]'
        );
        defaultVal = hidden?.value || '1 1 1';
      } else if (newType === 'combo') {
        defaultVal = (currentValControl as HTMLSelectElement).value;
      } else {
        defaultVal =
          (currentValControl as HTMLInputElement).value || undefined;
      }
    }

    let sliderMinVal: number | undefined;
    let sliderMaxVal: number | undefined;
    let sliderStepVal: number | undefined;
    let sliderPrecisionVal: number | undefined;
    let sliderFractionVal: boolean | undefined;
    let fileTypeVal: string | undefined;
    let modeVal: string | undefined;

    if (newType === 'slider') {
      const min = parseFloat(sliderMin.value);
      const max = parseFloat(sliderMax.value);
      const step = parseFloat(sliderStep.value);
      const prec = parseInt(sliderPrecision.value, 10);
      sliderMinVal = Number.isFinite(min) ? min : undefined;
      sliderMaxVal = Number.isFinite(max) ? max : undefined;
      sliderStepVal = Number.isFinite(step) ? step : undefined;
      sliderPrecisionVal = Number.isFinite(prec) ? prec : undefined;
      sliderFractionVal = sliderFraction.checked || undefined;
    } else if (newType === 'file' || newType === 'directory') {
      if (fileVideo.checked) fileTypeVal = 'video';
      if (newType === 'directory' && dirOndemand.checked) modeVal = 'ondemand';
    }

    const def: PropertyDefInput = {
      key: newKey,
      type: newType,
      value: defaultVal,
      text: textInput.value.trim() || newKey,
      displayName: displayNameInput.value.trim() || textInput.value.trim() || newKey,
      order: newOrder,
      index: newIndex,
      condition: condInput.value.trim() || undefined,
      options,
      min: sliderMinVal,
      max: sliderMaxVal,
      step: sliderStepVal,
      precision: sliderPrecisionVal,
      fraction: sliderFractionVal,
      fileType: fileTypeVal,
      mode: modeVal,
    };

    onSave(isNew, isNew ? null : prop!.key, def);
    closeModal();
  });
  btnRow.appendChild(saveBtn);

  body.appendChild(btnRow);

  host.appendChild(panel);
  document.body.appendChild(host);
}