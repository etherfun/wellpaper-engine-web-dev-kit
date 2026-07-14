/**
 * Properties section
 */

import type { ProjectPropertyDef, PropertyType } from '../../types';
import { getPanelMessages } from '../i18n';
import { localeDisplayName } from '../i18n';
import { weColorToHex, hexToWeColor } from '../../utils/color';
import { showPropertyModal, type PropertyEditorSaveHandler } from '../modal/propertyEditor';
import { evaluateAllConditions, type VisibilityMap } from '../conditionEvaluator';
import { createRow, createLabel } from '../../utils/dom';
import { debounce } from '../../utils/time';
import type { PanelCallbacks, PanelPropertiesRefresher } from '../callbacks';

type VisibilityFilter = 'all' | 'visible' | 'hidden';
type TranslationFilter = 'all' | 'missing' | 'ok';
type TypeFilter = 'all' | PropertyType;

interface FilterState {
  search: string;
  visibility: VisibilityFilter;
  translation: TranslationFilter;
  type: TypeFilter;
}

export function populatePropertiesSection(
  container: HTMLElement,
  props: ProjectPropertyDef[],
  cb: PanelCallbacks,
  appliedLanguage: string,
  availableLanguages: string[],
  onLanguageSwitch?: (lang: string) => void,
  allLocalizations?: Record<string, Record<string, string>>
): PanelPropertiesRefresher {
  // ---- 语言切换行 ----
  const langRow = createRow();
  langRow.style.marginBottom = '4px';

  const langIcon = document.createElement('span');
  langIcon.style.cssText = 'font-size:10px;color:#666;';
  langIcon.textContent = '🌐';
  langRow.appendChild(langIcon);

  const langSelect = document.createElement('select');
  langSelect.style.cssText = 'font-size:10px;padding:1px 4px;flex:none;width:120px;';
  for (const lang of availableLanguages) {
    const opt = document.createElement('option');
    opt.value = lang;
    opt.textContent = localeDisplayName(lang);
    if (lang === appliedLanguage) opt.selected = true;
    langSelect.appendChild(opt);
  }
  langSelect.addEventListener('change', () => {
    if (onLanguageSwitch) {
      onLanguageSwitch(langSelect.value);
      renderProps(filterState);
    }
  });
  if (availableLanguages.length > 1) {
    langRow.appendChild(langSelect);
  } else {
    const langLabel = document.createElement('span');
    langLabel.style.cssText = 'font-size:10px;color:#666;';
    langLabel.textContent = appliedLanguage;
    langRow.appendChild(langLabel);
  }

  // 添加语言下拉
  const addLangSelect = document.createElement('select');
  addLangSelect.style.cssText = 'font-size:10px;padding:1px 2px;flex:none;width:105px;margin-left:2px;background:#1a1a1a;border:1px solid #444;color:#e0e0e0;border-radius:3px;outline:none;cursor:pointer;';
  // 插入一个占位选项
  const placeholderOpt = document.createElement('option');
  placeholderOpt.value = '';
  placeholderOpt.textContent = getPanelMessages().addLangPlaceholder;
  placeholderOpt.disabled = true;
  placeholderOpt.selected = true;
  addLangSelect.appendChild(placeholderOpt);
  // 所有 WE 语言代码（按 localeDisplayName 排序）
  const allLocales = [
    'ar-sa','be-by','bg-bg','cs-cz','da-dk','de-de','el-gr','en-us',
    'es-es','eu-es','fa-ir','fi-fi','fr-fr','he-il','hu-hu','id-id',
    'it-it','ja-jp','ko-kr','lt-lt','nb-no','nl-nl','pl-pl','pt-br',
    'pt-pt','ro-ro','ru-ru','sk-sk','sl-si','sv-se','th-th','tr-tr',
    'uk-ua','vi-vn','zh-chs','zh-cht',
  ];
  // 已经存在的语言排到后面
  const sortedLocales = [...allLocales].sort((a, b) => {
    const aExists = availableLanguages.includes(a) ? 1 : 0;
    const bExists = availableLanguages.includes(b) ? 1 : 0;
    return aExists - bExists;
  });
  for (const code of sortedLocales) {
    const opt = document.createElement('option');
    opt.value = code;
    opt.textContent = localeDisplayName(code);
    if (availableLanguages.includes(code)) opt.disabled = true;
    addLangSelect.appendChild(opt);
  }
  addLangSelect.addEventListener('change', () => {
    const langCode = addLangSelect.value;
    if (!langCode) return;
    addLangSelect.value = '';
    if (availableLanguages.includes(langCode)) {
      langSelect.value = langCode;
      if (onLanguageSwitch) onLanguageSwitch(langCode);
      return;
    }
    const opt = document.createElement('option');
    opt.value = langCode;
    opt.textContent = localeDisplayName(langCode);
    opt.selected = true;
    langSelect.appendChild(opt);
    availableLanguages.push(langCode);
    // 禁用添加下拉中对应的选项
    const sourceOpt = addLangSelect.querySelector(`option[value="${langCode}"]`) as HTMLOptionElement | null;
    if (sourceOpt) sourceOpt.disabled = true;
    if (onLanguageSwitch) onLanguageSwitch(langCode);
    renderProps(filterState);
    console.log(`[WE Dev Kit] Language added: "${langCode}"`);
  });
  langRow.appendChild(addLangSelect);

  let showKeys = false;
  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'btn';
  toggleBtn.style.cssText = 'margin-left:auto;font-size:10px;padding:2px 8px;';
  toggleBtn.textContent = getPanelMessages().showKeys;
  toggleBtn.title = `${getPanelMessages().showKeys} / ${getPanelMessages().showName}`;
  toggleBtn.addEventListener('click', () => {
    showKeys = !showKeys;
    toggleBtn.textContent = showKeys ? getPanelMessages().showName : getPanelMessages().showKeys;
    toggleBtn.classList.toggle('active', showKeys);
    renderProps(filterState);
  });
  langRow.appendChild(toggleBtn);

  // ---- 操作工具栏（sticky 固定） ----
  const propToolbar = document.createElement('div');
  propToolbar.className = 'prop-toolbar';
  propToolbar.appendChild(langRow);

  const searchInput = document.createElement('input');
  searchInput.className = 'prop-search';
  searchInput.type = 'text';
  searchInput.placeholder = getPanelMessages().searchPlaceholder;
  propToolbar.appendChild(searchInput);

  // ---- 过滤行 ----
  const filterRow = document.createElement('div');
  filterRow.className = 'visibility-filter-row';

  const visSelect = document.createElement('select');
  appendOption(visSelect, 'all', getPanelMessages().filterAll, true);
  appendOption(visSelect, 'visible', getPanelMessages().filterVisible);
  appendOption(visSelect, 'hidden', getPanelMessages().filterHidden);
  filterRow.appendChild(visSelect);

  const missingTransSelect = document.createElement('select');
  missingTransSelect.style.marginLeft = '4px';
  appendOption(missingTransSelect, 'all', getPanelMessages().translationAll, true);
  appendOption(missingTransSelect, 'missing', getPanelMessages().translationMissing);
  appendOption(missingTransSelect, 'ok', getPanelMessages().translationOk);
  filterRow.appendChild(missingTransSelect);

  const typeSelect = document.createElement('select');
  typeSelect.style.marginLeft = '4px';
  appendOption(typeSelect, 'all', getPanelMessages().typeFilterAll, true);
  const typeSet = new Set<string>();
  for (const p of props) {
    if (p.type && p.type !== 'group') typeSet.add(p.type);
  }
  const typeLabelMap: Record<string, string> = {
    bool: getPanelMessages().typeBool,
    slider: getPanelMessages().typeSlider,
    combo: getPanelMessages().typeCombo,
    color: getPanelMessages().typeColor,
    text: getPanelMessages().typeText,
    textinput: getPanelMessages().typeTextinput,
    file: getPanelMessages().typeFile,
    directory: getPanelMessages().typeDirectory,
    group: getPanelMessages().typeGroup,
  };
  for (const t of ['bool', 'slider', 'combo', 'color', 'text', 'textinput', 'file', 'directory']) {
    if (typeSet.has(t)) {
      appendOption(typeSelect, t, typeLabelMap[t] ?? t);
    }
  }
  filterRow.appendChild(typeSelect);

  const visStats = document.createElement('span');
  visStats.className = 'vis-stats';
  filterRow.appendChild(visStats);
  propToolbar.appendChild(filterRow);

  // ---- 操作行 ----
  const actionRow = document.createElement('div');
  actionRow.className = 'prop-action-row';
  const addBtn = document.createElement('button');
  addBtn.className = 'btn';
  addBtn.textContent = getPanelMessages().addProperty;
  addBtn.addEventListener('click', () => {
    const editorSave: PropertyEditorSaveHandler = (isNew, originalKey, def) => {
      applyEditorResult(isNew, originalKey, def);
    };
    showPropertyModal(null, editorSave, allLocalizations, availableLanguages, cb.onSaveI18nTranslation);
  });
  actionRow.appendChild(addBtn);

  const exportBtn = document.createElement('button');
  exportBtn.className = 'btn primary';
  exportBtn.textContent = getPanelMessages().saveButton;
  exportBtn.addEventListener('click', () => {
    const fn = (window as unknown as { __weDevKitSaveProps?: () => void }).__weDevKitSaveProps;
    if (typeof fn === 'function') fn();
  });
  actionRow.appendChild(exportBtn);
  propToolbar.appendChild(actionRow);

  container.appendChild(propToolbar);

  // ---- 属性列表 ----
  const listEl = document.createElement('div');
  listEl.id = '__we_prop_list';
  container.appendChild(listEl);

  // ---- 过滤状态 ----
  const filterState: FilterState = {
    search: '',
    visibility: 'all',
    translation: 'all',
    type: 'all',
  };

  const propValues: Record<string, unknown> = {};
  for (const p of props) {
    propValues[p.key] = p.value;
  }

  // ---- 应用编辑器结果 ----
  function applyEditorResult(isNew: boolean, originalKey: string | null, def: import('../../types').PropertyDefInput): void {
    if (isNew) {
      const existing = props.find((p) => p.key === def.key);
      if (existing) {
        Object.assign(existing, def);
        recomputeMissing(existing);
      } else {
        const newProp: ProjectPropertyDef = {
          key: def.key,
          type: def.type,
          value: def.value ?? defaultForType(def.type),
          text: def.text,
          displayName: def.displayName || def.text || def.key,
          missingTranslation: false,
          order: def.order ?? 9999,
          index: def.index,
          condition: def.condition,
          options: def.options,
          min: def.min,
          max: def.max,
          step: def.step,
          precision: def.precision,
          fraction: def.fraction,
          fileType: def.fileType,
          mode: def.mode,
        };
        props.push(newProp);
        propValues[newProp.key] = newProp.value;
      }
    } else if (originalKey) {
      const existing = props.find((p) => p.key === originalKey);
      if (existing) {
        existing.type = def.type;
        existing.value = def.value ?? existing.value;
        existing.order = def.order ?? existing.order;
        existing.condition = def.condition;
        existing.options = def.options;
        existing.text = def.text;
        existing.displayName = def.displayName;
        existing.min = def.min;
        existing.max = def.max;
        existing.step = def.step;
        existing.precision = def.precision;
        existing.fraction = def.fraction;
        existing.fileType = def.fileType;
        existing.mode = def.mode;
        existing.index = def.index;
        recomputeMissing(existing);
      }
    }
    notifyChange();
    renderProps(filterState);
  }

  function recomputeMissing(p: ProjectPropertyDef): void {
    p.missingTranslation = !p.displayName && !!p.text && p.text !== p.key;
  }

  function defaultForType(type: PropertyType): unknown {
    switch (type) {
      case 'bool': return false;
      case 'slider': return 50;
      default: return '';
    }
  }

  function notifyChange(): void {
    const fn = (window as unknown as { __weDevKitPropertiesChanged?: (p: ProjectPropertyDef[]) => void }).__weDevKitPropertiesChanged;
    if (typeof fn === 'function') fn([...props]);
  }

  function getPropValue(key: string): unknown {
    return propValues[key];
  }

  function evaluateVis(): VisibilityMap {
    return evaluateAllConditions(props, getPropValue);
  }

  function renderProps(filter: FilterState): void {
    listEl.innerHTML = '';
    const lowerFilter = filter.search.toLowerCase();

    const visibilityMap = evaluateVis();
    let visibleCount = 0;
    let hiddenCount = 0;
    for (const prop of props) {
      if (prop.type === 'group') continue;
      const isVis = visibilityMap[prop.key] !== false;
      if (isVis) visibleCount++;
      else hiddenCount++;
    }
    visStats.textContent = `${visibleCount}${getPanelMessages().visibleStat} / ${hiddenCount}${getPanelMessages().hiddenStat}`;

    // 统计共享的 i18n 键（text 被多个属性引用）
    const textCounts = new Map<string, number>();
    for (const prop of props) {
      const t = prop.text;
      if (t && t !== prop.key) {
        textCounts.set(t, (textCounts.get(t) ?? 0) + 1);
      }
    }
    const sharedTextKeys = new Set<string>();
    for (const [t, count] of textCounts) {
      if (count > 1) sharedTextKeys.add(t);
    }

    for (const prop of props) {
      if (lowerFilter && !prop.key.toLowerCase().includes(lowerFilter)) continue;

      const isVis = visibilityMap[prop.key] !== false;
      if (filter.visibility === 'visible' && !isVis) continue;
      if (filter.visibility === 'hidden' && isVis) continue;

      if (filter.translation === 'missing' && !prop.missingTranslation) continue;
      if (filter.translation === 'ok' && prop.missingTranslation) continue;

      if (filter.type !== 'all' && prop.type !== filter.type) continue;

      if (prop.type === 'group') {
        const groupTitle = document.createElement('div');
        groupTitle.className = 'prop-group-title';
        const groupLabel = showKeys ? prop.key : (prop.displayName || prop.key);
        groupTitle.textContent = `── ${groupLabel} ──`;
        listEl.appendChild(groupTitle);
        continue;
      }

      listEl.appendChild(createPropRow(prop, isVis, sharedTextKeys));
    }
  }

  function createPropRow(prop: ProjectPropertyDef, isVis: boolean, sharedTextKeys?: Set<string>): HTMLElement {
    const row = document.createElement('div');
    row.className = 'prop-row' + (isVis ? '' : ' is-hidden');
    row.style.position = 'relative';

    // 可见性指示器
    const visDot = document.createElement('span');
    if (prop.condition && isVis) {
      visDot.className = 'visibility-dot visible'; visDot.textContent = '✓';
    } else if (prop.condition && !isVis) {
      visDot.className = 'visibility-dot hidden'; visDot.textContent = 'x';
    } else {
      visDot.className = 'visibility-dot no-condition'; visDot.textContent = '';
    }
    visDot.title = prop.condition
      ? (isVis ? getPanelMessages().conditionMet : getPanelMessages().conditionNotMet)
      : getPanelMessages().noCondition;
    row.appendChild(visDot);

    if (prop.condition) {
      const tooltip = document.createElement('span');
      tooltip.className = 'condition-tooltip';
      tooltip.textContent = prop.condition;
      row.appendChild(tooltip);
    }

    // 翻译丢失提示
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

    // 键名 + i18n 键行
    const keyCol = document.createElement('div');
    keyCol.className = 'prop-key-col';

    const keyEl = document.createElement('span');
    keyEl.className = 'prop-key';
    const labelText = showKeys ? prop.key : (prop.displayName || prop.key);
    keyEl.textContent = labelText;
    keyEl.title = showKeys
      ? (prop.displayName && prop.displayName !== prop.key ? `${prop.key} (${prop.displayName})` : prop.key)
      : `${prop.key}${prop.displayName && prop.displayName !== prop.key ? ` (${prop.displayName})` : ''}${prop.condition ? `\ncondition: ${prop.condition}` : ''}`;
    keyCol.appendChild(keyEl);

    // i18n 键副标题（当 text 与 key 不同时显示）
    if (prop.text && prop.text !== prop.key) {
      const i18nRow = document.createElement('div');
      i18nRow.className = 'prop-i18n-row';

      if (sharedTextKeys?.has(prop.text)) {
        const sharedBadge = document.createElement('span');
        sharedBadge.className = 'prop-i18n-shared-badge';
        sharedBadge.textContent = '⛁';
        sharedBadge.title = `i18n 键 "${prop.text}" 被多个配置项共享`;
        i18nRow.appendChild(sharedBadge);
      }

      const i18nLabel = document.createElement('span');
      i18nLabel.className = 'prop-i18n-key';
      i18nLabel.textContent = prop.text;
      i18nLabel.title = `翻译键: ${prop.text}`;
      i18nRow.appendChild(i18nLabel);
      keyCol.appendChild(i18nRow);
    }

    row.appendChild(keyCol);

    // 控件
    const control = createPropControl(prop);
    row.appendChild(control);

    // 编辑 / 删除
    const editBtn = document.createElement('button');
    editBtn.className = 'prop-edit-btn';
    editBtn.textContent = getPanelMessages().editProperty;
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      showPropertyModal(prop, (isNew, originalKey, def) => {
        applyEditorResult(isNew, originalKey, def);
      }, allLocalizations, availableLanguages, cb.onSaveI18nTranslation);
    });
    row.appendChild(editBtn);

    const delBtn = document.createElement('button');
    delBtn.className = 'prop-del-btn';
    delBtn.textContent = '✕';
    delBtn.title = getPanelMessages().deleteProperty;
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const msg = getPanelMessages().confirmDelete.replace('{key}', prop.key);
      if (confirm(msg)) {
        const idx = props.findIndex((p) => p.key === prop.key);
        if (idx !== -1) props.splice(idx, 1);
        notifyChange();
        renderProps(filterState);
      }
    });
    row.appendChild(delBtn);

    return row;
  }

  function createPropControl(prop: ProjectPropertyDef): HTMLElement {
    const control = document.createElement('div');
    control.className = 'prop-control';

    switch (prop.type) {
      case 'bool': {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = Boolean(prop.value);
        checkbox.addEventListener('change', () => {
          prop.value = checkbox.checked;
        });
        control.appendChild(checkbox);
        break;
      }
      case 'slider': {
        const sliderRow = document.createElement('div');
        sliderRow.style.cssText = 'display:flex;align-items:center;gap:6px;';
        const step = prop.step ?? (prop.fraction ? 0.1 : 1);
        const precision = prop.precision ?? (step < 1 ? 2 : 0);

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = String(prop.min ?? 0);
        slider.max = String(prop.max ?? 100);
        slider.step = String(step);
        slider.value = String(prop.value ?? 50);

        const numInput = document.createElement('input');
        numInput.type = 'text';
        numInput.style.width = '55px';
        numInput.value = precision > 0 ? Number(prop.value ?? 50).toFixed(precision) : String(prop.value ?? 50);

        slider.addEventListener('input', () => {
          const val = parseFloat(slider.value);
          numInput.value = precision > 0 ? val.toFixed(precision) : String(val);
          prop.value = val;
        });
        numInput.addEventListener('change', () => {
          const v = parseFloat(numInput.value);
          if (!Number.isNaN(v)) {
            const clamped = Math.max(prop.min ?? 0, Math.min(prop.max ?? 100, v));
            slider.value = String(clamped);
            numInput.value = precision > 0 ? clamped.toFixed(precision) : String(clamped);
            prop.value = clamped;
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
          const numVal = Number(select.value);
          prop.value = Number.isNaN(numVal) ? select.value : numVal;
        });
        control.appendChild(select);
        break;
      }
      case 'color': {
        const colorRow = document.createElement('div');
        colorRow.style.cssText = 'display:flex;align-items:center;gap:6px;';
        const colorPicker = document.createElement('input');
        colorPicker.type = 'color';
        colorPicker.value = weColorToHex(prop.value ? String(prop.value) : '1 1 1', '#ffffff');
        const hexLabel = document.createElement('span');
        hexLabel.style.cssText = 'font-size:10px;color:#888;';
        hexLabel.textContent = colorPicker.value;
        colorPicker.addEventListener('input', () => {
          hexLabel.textContent = colorPicker.value;
          prop.value = hexToWeColor(colorPicker.value);
        });
        colorRow.appendChild(colorPicker);
        colorRow.appendChild(hexLabel);
        control.appendChild(colorRow);
        break;
      }
      case 'text': {
        const textEl = document.createElement('div');
        textEl.style.cssText = 'font-size:11px;color:#888;word-break:break-all;max-height:40px;overflow:hidden;';
        textEl.textContent = String(prop.value ?? '');
        control.appendChild(textEl);
        break;
      }
      case 'textinput': {
        const textInput = document.createElement('input');
        textInput.type = 'text';
        textInput.value = String(prop.value ?? '');
        textInput.addEventListener('input', () => { prop.value = textInput.value; });
        control.appendChild(textInput);
        break;
      }
      case 'file':
      case 'directory': {
        const row = buildFilePickerRow(prop);
        control.appendChild(row);
        break;
      }
      default: {
        const fallback = document.createElement('span');
        fallback.style.cssText = 'font-size:10px;color:#666;';
        fallback.textContent = `[${prop.type}] ${String(prop.value ?? '')}`;
        control.appendChild(fallback);
      }
    }

    return control;
  }

  function buildFilePickerRow(prop: ProjectPropertyDef): HTMLElement {
    const row = document.createElement('div');
    row.className = 'picker-row';

    const valueLabel = document.createElement('span');
    valueLabel.className = 'picker-value';
    valueLabel.textContent = prop.value ? String(prop.value) : '';
    row.appendChild(valueLabel);

    const browseBtn = document.createElement('button');
    browseBtn.className = 'picker-btn';
    browseBtn.textContent = getPanelMessages().browse;
    row.appendChild(browseBtn);

    const clearBtn = document.createElement('button');
    clearBtn.className = 'picker-btn clear-btn';
    clearBtn.textContent = getPanelMessages().clearFile;
    row.appendChild(clearBtn);

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.style.display = 'none';
    if (prop.type === 'directory') {
      (fileInput as unknown as { webkitdirectory: boolean }).webkitdirectory = true;
    }
    fileInput.addEventListener('change', () => {
      if (!fileInput.files || fileInput.files.length === 0) return;
      const first = fileInput.files[0];
      const name = prop.type === 'directory'
        ? (first.webkitRelativePath?.split('/')[0] ?? first.name)
        : first.name;
      valueLabel.textContent = name;
      pushPropertyChange(prop.key, name);

      if (prop.type === 'directory') {
        const listener = (window as unknown as {
          wallpaperPropertyListener?: { userDirectoryFilesAddedOrChanged?: (key: string, files: string[]) => void };
        }).wallpaperPropertyListener;
        if (listener?.userDirectoryFilesAddedOrChanged) {
          const files = Array.from(fileInput.files).map((f) => f.webkitRelativePath || f.name);
          listener.userDirectoryFilesAddedOrChanged(prop.key, files);
        }
      }
    });

    browseBtn.addEventListener('click', () => fileInput.click());
    clearBtn.addEventListener('click', () => {
      valueLabel.textContent = '';
      fileInput.value = '';
      pushPropertyChange(prop.key, '');
    });

    row.appendChild(fileInput);
    return row;
  }

  function pushPropertyChange(key: string, value: unknown): void {
    propValues[key] = value;
    const prop = props.find((p) => p.key === key);
    if (prop) prop.value = value;
  }

  // ---- 监听过滤变化 ----
  visSelect.addEventListener('change', () => {
    filterState.visibility = visSelect.value as VisibilityFilter;
    renderProps(filterState);
  });
  missingTransSelect.addEventListener('change', () => {
    filterState.translation = missingTransSelect.value as TranslationFilter;
    renderProps(filterState);
  });
  typeSelect.addEventListener('change', () => {
    filterState.type = typeSelect.value as TypeFilter;
    renderProps(filterState);
  });

  const debouncedSearch = debounce((v: string) => {
    filterState.search = v;
    renderProps(filterState);
  }, 200);
  searchInput.addEventListener('input', () => debouncedSearch(searchInput.value));

  renderProps(filterState);

  const refresher: PanelPropertiesRefresher = (newProps) => {
    if (newProps) {
      props.length = 0;
      props.push(...newProps);
      for (const p of props) propValues[p.key] = p.value;
    }
    renderProps(filterState);
  };

  (container as unknown as { __refreshProperties: PanelPropertiesRefresher }).__refreshProperties = refresher;
  return refresher;
}

function appendOption(select: HTMLSelectElement, value: string, text: string, selected = false): void {
  const opt = document.createElement('option');
  opt.value = value;
  opt.textContent = text;
  if (selected) opt.selected = true;
  select.appendChild(opt);
}