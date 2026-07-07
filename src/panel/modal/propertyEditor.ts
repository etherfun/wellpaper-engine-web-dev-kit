/**
 * 属性编辑弹窗
 *
 * 浮动可拖拽窗口，支持添加新属性 / 编辑已有属性。
 * 通过回调通知外部更新 props 数组。
 */

import type { PropertyDefInput, ProjectPropertyDef, PropertyType } from '../../types';
import { getPanelMessages } from '../i18n';
import { weColorToHex, hexToWeColor } from '../../utils/color';
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

interface SliderFields {
  min: HTMLInputElement;
  max: HTMLInputElement;
  step: HTMLInputElement;
  precision: HTMLInputElement;
  fraction: HTMLInputElement;
}

interface FileFields {
  video: HTMLInputElement;
}

interface DirectoryFields {
  video: HTMLInputElement;
  ondemand: HTMLInputElement;
}

export function showPropertyModal(
  prop: ProjectPropertyDef | null,
  onSave: PropertyEditorSaveHandler
): void {
  const isNew = prop === null;

  const { host, destroy } = createDraggableHost({
    className: 'prop-modal-float',
    cssText: 'all:initial;position:fixed;z-index:2147483646;top:80px;left:60px;width:380px;',
    handleSelector: '.prop-modal-float-header',
  });

  const panel = document.createElement('div');
  panel.className = 'prop-modal-float-inner';

  // ---- 标题栏 ----
  const header = document.createElement('div');
  header.className = 'prop-modal-float-header';

  const title = document.createElement('span');
  title.className = 'prop-modal-float-title';
  title.textContent = isNew ? getPanelMessages().addPropertyTitle : getPanelMessages().editPropertyTitle;
  header.appendChild(title);

  const closeBtn = document.createElement('button');
  closeBtn.className = 'panel-btn';
  closeBtn.textContent = '×';
  closeBtn.title = getPanelMessages().close;
  closeBtn.addEventListener('click', () => {
    destroy();
    host.remove();
  });
  header.appendChild(closeBtn);

  panel.appendChild(header);

  // ---- Body ----
  const body = document.createElement('div');
  body.className = 'prop-modal-float-body';

  function addField(labelText: string, control: HTMLElement): void {
    const row = document.createElement('div');
    row.className = 'prop-modal-row';
    const lbl = document.createElement('span');
    lbl.className = 'prop-modal-row-label';
    lbl.textContent = labelText;
    row.appendChild(lbl);
    const wrap = document.createElement('div');
    wrap.className = 'prop-modal-row-control';
    wrap.appendChild(control);
    row.appendChild(wrap);
    body.appendChild(row);
  }

  // 键名
  const keyInput = document.createElement('input');
  keyInput.type = 'text';
  keyInput.value = prop?.key ?? '';
  if (!isNew) keyInput.disabled = true;
  addField(getPanelMessages().propertyKey, keyInput);

  // 类型
  const typeSelect = document.createElement('select');
  typeSelect.className = 'prop-modal-select';
  for (const t of TYPE_OPTIONS) {
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = t.charAt(0).toUpperCase() + t.slice(1);
    if (prop?.type === t) opt.selected = true;
    typeSelect.appendChild(opt);
  }
  addField(getPanelMessages().propertyType, typeSelect);

  // 默认值（动态）
  let currentValControl: HTMLElement;
  const valRow = document.createElement('div');
  valRow.className = 'prop-modal-row';
  const valLabelEl = document.createElement('span');
  valLabelEl.className = 'prop-modal-row-label';
  valLabelEl.textContent = getPanelMessages().propertyValue;
  valRow.appendChild(valLabelEl);
  const valWrap = document.createElement('div');
  valWrap.className = 'prop-modal-row-control';
  valRow.appendChild(valWrap);
  body.appendChild(valRow);

  function rebuildValueControl(): void {
    valWrap.innerHTML = '';
    const t = typeSelect.value as PropertyType;
    if (t === 'bool') {
      const sel = document.createElement('select');
      sel.className = 'prop-modal-select';
      for (const v of ['true', 'false']) {
        const opt = document.createElement('option');
        opt.value = v;
        opt.textContent = v.charAt(0).toUpperCase() + v.slice(1);
        if (prop?.value !== undefined && String(prop.value).toLowerCase() === v) opt.selected = true;
        sel.appendChild(opt);
      }
      currentValControl = sel;
      valWrap.appendChild(sel);
    } else if (t === 'slider') {
      const inp = document.createElement('input');
      inp.type = 'number';
      inp.step = 'any';
      inp.value = prop?.value !== undefined ? String(prop.value) : '50';
      applyFieldStyle(inp);
      currentValControl = inp;
      valWrap.appendChild(inp);
    } else if (t === 'color') {
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.style.gap = '6px';
      const picker = document.createElement('input');
      picker.type = 'color';
      picker.style.cssText = 'width:32px;height:24px;border:1px solid #444;border-radius:3px;padding:0;cursor:pointer;background:none;';
      const weColor = prop?.value ? String(prop.value) : '1 1 1';
      picker.value = weColorToHex(weColor, '#ffffff');
      const hexLabel = document.createElement('span');
      hexLabel.style.cssText = 'font-size:10px;color:#888;';
      hexLabel.textContent = picker.value;
      picker.addEventListener('input', () => {
        hexLabel.textContent = picker.value;
        weHidden.value = hexToWeColor(picker.value);
      });
      const weHidden = document.createElement('input');
      weHidden.type = 'hidden';
      weHidden.value = weColor;
      row.appendChild(picker);
      row.appendChild(hexLabel);
      row.appendChild(weHidden);
      currentValControl = weHidden;
      valWrap.appendChild(row);
    } else if (t === 'combo') {
      const sel = document.createElement('select');
      sel.className = 'prop-modal-select';
      currentValControl = sel;
      valWrap.appendChild(sel);
      refreshComboOptions(sel);
      const obs = new MutationObserver(() => refreshComboOptions(sel));
      obs.observe(tbody, { childList: true, subtree: true });
    } else {
      const inp = document.createElement('input');
      inp.type = 'text';
      inp.value = prop?.value !== undefined ? String(prop.value) : '';
      applyFieldStyle(inp);
      currentValControl = inp;
      valWrap.appendChild(inp);
    }
  }

  function applyFieldStyle(inp: HTMLInputElement): void {
    inp.style.cssText = 'width:100%;background:#1a1a1a;border:1px solid #444;color:#e0e0e0;padding:4px 8px;border-radius:3px;font-size:12px;outline:none;box-sizing:border-box;height:24px;';
  }

  function refreshComboOptions(sel: HTMLSelectElement): void {
    const current = sel.value;
    sel.innerHTML = '';
    const rows = tbody.querySelectorAll('.prop-opts-row');
    let hasOptions = false;
    for (const r of Array.from(rows)) {
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
      opt.textContent = '(no options)';
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

  // 排序 + 条件
  const orderInput = document.createElement('input');
  orderInput.type = 'number';
  orderInput.value = String(prop?.order ?? 9999);
  addField(getPanelMessages().propertyOrder, orderInput);

  const condInput = document.createElement('input');
  condInput.type = 'text';
  condInput.value = prop?.condition ?? '';
  addField(getPanelMessages().propertyCondition, condInput);

  // ---- 类型专属字段 ----
  const typeSpecificRow = document.createElement('div');
  typeSpecificRow.className = 'prop-modal-row';
  const typeSpecificLabel = document.createElement('span');
  typeSpecificLabel.className = 'prop-modal-row-label';
  typeSpecificRow.appendChild(typeSpecificLabel);
  const typeSpecificWrap = document.createElement('div');
  typeSpecificWrap.className = 'prop-modal-row-control';
  typeSpecificWrap.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;';
  typeSpecificRow.appendChild(typeSpecificWrap);
  body.appendChild(typeSpecificRow);

  const sliderFields = buildSliderFields(prop);
  const fileFields = buildFileFields(prop);
  const dirFields = buildDirectoryFields(prop);

  function rebuildTypeSpecificFields(): void {
    typeSpecificWrap.innerHTML = '';
    const t = typeSelect.value;
    if (t === 'slider') {
      typeSpecificLabel.textContent = 'Slider';
      const labelRow = document.createElement('div');
      labelRow.style.cssText = 'display:flex;gap:6px;width:100%;font-size:10px;color:#888;';
      for (const lbl of ['Min', 'Max', 'Step', 'Prec', '']) {
        const s = document.createElement('span');
        s.textContent = lbl;
        s.style.width = '56px';
        s.style.textAlign = 'center';
        labelRow.appendChild(s);
      }
      typeSpecificWrap.appendChild(labelRow);
      const inputRow = document.createElement('div');
      inputRow.style.cssText = 'display:flex;gap:6px;align-items:center;width:100%;';
      for (const el of [sliderFields.min, sliderFields.max, sliderFields.step, sliderFields.precision, sliderFields.fraction]) {
        inputRow.appendChild(el);
      }
      typeSpecificWrap.appendChild(inputRow);
    } else if (t === 'file') {
      typeSpecificLabel.textContent = 'File';
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;gap:6px;align-items:center;flex-wrap:wrap;';
      row.appendChild(wrapCheckbox('视频模式 (Video)', fileFields.video));
      typeSpecificWrap.appendChild(row);
    } else if (t === 'directory') {
      typeSpecificLabel.textContent = 'Directory';
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;gap:6px;align-items:center;flex-wrap:wrap;';
      row.appendChild(wrapCheckbox('视频模式 (Video)', dirFields.video));
      row.appendChild(wrapCheckbox('点播模式 (Ondemand)', dirFields.ondemand));
      typeSpecificWrap.appendChild(row);
    } else {
      typeSpecificLabel.textContent = '';
    }
  }

  rebuildTypeSpecificFields();
  typeSelect.addEventListener('change', rebuildTypeSpecificFields);

  // ---- 选项表格（combo） ----
  const optsRow = document.createElement('div');
  optsRow.className = 'prop-modal-row';
  const optsLabel = document.createElement('span');
  optsLabel.className = 'prop-modal-row-label';
  optsLabel.textContent = getPanelMessages().propertyOptions;
  optsRow.appendChild(optsLabel);

  const optsWrap = document.createElement('div');
  optsWrap.className = 'prop-modal-row-control';

  const optsTable = document.createElement('div');
  optsTable.className = 'prop-opts-table';

  const thead = document.createElement('div');
  thead.className = 'prop-opts-thead';
  for (const [text, cls] of [
    ['Label', 'prop-opts-th'],
    ['Value', 'prop-opts-th'],
    ['', 'prop-opts-th prop-opts-th-action'],
  ] as const) {
    const span = document.createElement('span');
    span.textContent = text;
    span.className = cls;
    thead.appendChild(span);
  }
  optsTable.appendChild(thead);

  const tbody = document.createElement('div');
  tbody.className = 'prop-opts-tbody';
  optsTable.appendChild(tbody);

  function addOptionRow(optLabel: string, optValue: string): void {
    const row = document.createElement('div');
    row.className = 'prop-opts-row';

    const inpLabel = document.createElement('input');
    inpLabel.type = 'text';
    inpLabel.className = 'prop-opts-input';
    inpLabel.value = optLabel;
    inpLabel.placeholder = 'Label';

    const inpValue = document.createElement('input');
    inpValue.type = 'text';
    inpValue.className = 'prop-opts-input';
    inpValue.value = optValue;
    inpValue.placeholder = 'Value';

    const delBtn = document.createElement('button');
    delBtn.className = 'prop-opts-del-btn';
    delBtn.textContent = '✕';
    delBtn.addEventListener('click', () => row.remove());

    row.appendChild(inpLabel);
    row.appendChild(inpValue);
    row.appendChild(delBtn);
    tbody.appendChild(row);
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
  addOptBtn.textContent = getPanelMessages().addOption;
  addOptBtn.addEventListener('click', () => addOptionRow('', ''));

  optsWrap.appendChild(optsTable);
  optsWrap.appendChild(addOptBtn);
  optsRow.appendChild(optsWrap);
  body.appendChild(optsRow);

  rebuildValueControl();
  if (typeSelect.value !== 'combo') optsRow.style.display = 'none';
  typeSelect.addEventListener('change', () => {
    rebuildValueControl();
    optsRow.style.display = typeSelect.value === 'combo' ? '' : 'none';
  });

  // ---- 按钮 ----
  const btnRow = document.createElement('div');
  btnRow.className = 'prop-modal-btn-row';

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn';
  cancelBtn.textContent = getPanelMessages().cancel;
  cancelBtn.addEventListener('click', () => {
    destroy();
    host.remove();
  });
  btnRow.appendChild(cancelBtn);

  const saveBtn = document.createElement('button');
  saveBtn.className = 'btn primary';
  saveBtn.textContent = getPanelMessages().save;
  saveBtn.addEventListener('click', () => {
    const newKey = keyInput.value.trim();
    if (!newKey) {
      alert('Key is required');
      return;
    }
    const newType = typeSelect.value as PropertyType;
    const newOrder = parseInt(orderInput.value, 10) || 9999;

    let options: PropertyDefInput['options'];
    if (newType === 'combo') {
      const rows = tbody.querySelectorAll('.prop-opts-row');
      const collected: { value: unknown; label: string }[] = [];
      for (const r of Array.from(rows)) {
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
      if (newType === 'color') {
        defaultVal = (currentValControl as HTMLInputElement).value || '1 1 1';
      } else if (newType === 'bool') {
        defaultVal = (currentValControl as HTMLSelectElement).value === 'true';
      } else if (newType === 'slider') {
        defaultVal = parseFloat((currentValControl as HTMLInputElement).value) || 50;
      } else if (newType === 'combo') {
        defaultVal = (currentValControl as HTMLSelectElement).value;
      } else {
        defaultVal = (currentValControl as HTMLInputElement).value || undefined;
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
      const min = parseFloat(sliderFields.min.value);
      const max = parseFloat(sliderFields.max.value);
      const step = parseFloat(sliderFields.step.value);
      const prec = parseInt(sliderFields.precision.value, 10);
      sliderMinVal = Number.isFinite(min) ? min : undefined;
      sliderMaxVal = Number.isFinite(max) ? max : undefined;
      sliderStepVal = Number.isFinite(step) ? step : undefined;
      sliderPrecisionVal = Number.isFinite(prec) ? prec : undefined;
      sliderFractionVal = sliderFields.fraction.checked || undefined;
    } else if (newType === 'file' || newType === 'directory') {
      if (fileFields.video.checked) fileTypeVal = 'video';
      if (newType === 'directory' && dirFields.ondemand.checked) modeVal = 'ondemand';
    }

    const def: PropertyDefInput = {
      key: newKey,
      type: newType,
      value: defaultVal || undefined,
      text: prop?.text || newKey,
      displayName: prop?.displayName || prop?.text || newKey,
      order: newOrder,
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
    destroy();
    host.remove();
  });
  btnRow.appendChild(saveBtn);

  body.appendChild(btnRow);
  panel.appendChild(body);
  host.appendChild(panel);
  document.body.appendChild(host);
}

function wrapCheckbox(text: string, input: HTMLInputElement): HTMLElement {
  const label = document.createElement('label');
  label.style.cssText = 'display:flex;align-items:center;gap:3px;font-size:11px;color:#aaa;cursor:pointer;';
  label.appendChild(input);
  label.appendChild(document.createTextNode(text));
  return label;
}

function buildSliderFields(prop: ProjectPropertyDef | null): SliderFields {
  const min = document.createElement('input');
  min.type = 'number'; min.step = 'any';
  min.placeholder = 'Min'; min.value = String(prop?.min ?? 0);
  min.style.width = '56px';

  const max = document.createElement('input');
  max.type = 'number'; max.step = 'any';
  max.placeholder = 'Max'; max.value = String(prop?.max ?? 100);
  max.style.width = '56px';

  const step = document.createElement('input');
  step.type = 'number'; step.step = 'any';
  step.placeholder = 'Step'; step.value = String(prop?.step ?? 1);
  step.style.width = '56px';

  const precision = document.createElement('input');
  precision.type = 'number'; precision.min = '0'; precision.step = '1';
  precision.placeholder = 'Prec'; precision.value = String(prop?.precision ?? 0);
  precision.style.width = '56px';

  const fractionWrap = document.createElement('label');
  fractionWrap.style.cssText = 'display:flex;align-items:center;gap:3px;font-size:11px;color:#aaa;cursor:pointer;';
  const fraction = document.createElement('input');
  fraction.type = 'checkbox';
  fraction.checked = prop?.fraction ?? false;
  fractionWrap.appendChild(fraction);
  fractionWrap.appendChild(document.createTextNode('Frac'));

  return { min, max, step, precision, fraction };
}

function buildFileFields(prop: ProjectPropertyDef | null): FileFields {
  const wrap = document.createElement('label');
  wrap.style.cssText = 'display:flex;align-items:center;gap:4px;font-size:11px;color:#aaa;cursor:pointer;';
  const video = document.createElement('input');
  video.type = 'checkbox';
  video.checked = prop?.fileType === 'video';
  video.title = 'Video mode';
  wrap.appendChild(video);
  return { video };
}

function buildDirectoryFields(prop: ProjectPropertyDef | null): DirectoryFields {
  const wrap = document.createElement('label');
  wrap.style.cssText = 'display:flex;align-items:center;gap:4px;font-size:11px;color:#aaa;cursor:pointer;';
  const video = document.createElement('input');
  video.type = 'checkbox';
  video.checked = prop?.fileType === 'video';
  video.title = 'Video mode';
  wrap.appendChild(video);

  const ondemandWrap = document.createElement('label');
  ondemandWrap.style.cssText = 'display:flex;align-items:center;gap:4px;font-size:11px;color:#aaa;cursor:pointer;';
  const ondemand = document.createElement('input');
  ondemand.type = 'checkbox';
  ondemand.checked = prop?.mode === 'ondemand';
  ondemand.title = 'Ondemand mode';
  ondemandWrap.appendChild(ondemand);
  ondemandWrap.appendChild(document.createTextNode('点播模式 (Ondemand)'));

  // 注：原代码中使用 cloneNode(true) 是冗余的；此处直接复用 modal 已构建元素
  void ondemandWrap;
  return { video, ondemand };
}