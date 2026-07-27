/**
 * project.json 读取器
 *
 * 从项目根目录（或指定路径）读取 project.json，解析 `general.properties`，
 * 返回标准化的属性定义列表，供控制面板渲染属性编辑控件。
 *
 * 语言策略：使用 navigator.language 作为首选语言（如 "zh-CN"），
 * 匹配 project.json 中 general.localization 的对应键。若未找到精确匹配，
 * 回退到语言前缀（如 "zh"），再回退到 "en-us"。
 */

import type { ProjectPropertyDef, RawPropertyDef } from '../types';

interface ProjectJson {
  general?: {
    properties?: Record<string, RawPropertyDef>;
    localization?: Record<string, Record<string, string>>;
  };
}

export interface LoadResult {
  properties: ProjectPropertyDef[];
  /** 所有语言的展平 localization（用作原始数据源） */
  rawLocalization: Record<string, string>;
  /** 所有语言的原始 localizations 映射（用于切换语言） */
  allLocalizations: Record<string, Record<string, string>>;
  /** 当前浏览器语言匹配到的 localization 字典 */
  activeLocalization: Record<string, string>;
  /** 实际使用的语言键（如 "zh-cn" / "en-us"） */
  appliedLanguage: string;
  /** 所有可用语言列表 */
  availableLanguages: string[];
  raw: Record<string, RawPropertyDef>;
}

/**
 * 从指定 URL 加载 project.json 并解析属性列表。
 * 默认从 ./project.json 加载。
 */
export async function loadProjectProperties(
  url: string = './project.json'
): Promise<LoadResult> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) {
      console.warn(`[WE Dev Kit] Failed to load project.json: ${resp.status}`);
      return emptyResult();
    }
    const data: ProjectJson = await resp.json();
    const rawProps = data.general?.properties;
    const localizations = data.general?.localization;

    if (!rawProps || Object.keys(rawProps).length === 0) {
      console.warn('[WE Dev Kit] project.json has no general.properties');
      return emptyResult();
    }

    // ---- 展平所有语言的 localization ----
    const rawLocalization: Record<string, string> = {};
    if (localizations) {
      for (const [, msgs] of Object.entries(localizations)) {
        if (msgs) Object.assign(rawLocalization, msgs);
      }
    }

    // ---- 所有原始 localizations（用于语言切换） ----
    const allLocalizations = localizations ?? {};

    // ---- 按浏览器语言匹配适用语言 ----
    const browserLang = (navigator.language || 'en-US').toLowerCase();
    const availableLanguages = localizations ? Object.keys(localizations) : [];
    const availableLangs = availableLanguages.map(k => k.toLowerCase());
    const appliedLang = resolveLanguage(browserLang, availableLangs, availableLanguages);
    const activeLocalization = allLocalizations[appliedLang] ?? {};

    console.log(
      `[WE Dev Kit] Locale: browser="${browserLang}", applied="${appliedLang}", available=[${availableLanguages.join(', ')}]`
    );

    // ---- 转换为标准格式 ----
    const properties: ProjectPropertyDef[] = Object.entries(rawProps)
      .filter(([key]) => !key.startsWith('_'))
      .map(([key, def]) => {
        const text = def.text || key;
        // 如果 localization 中有匹配，用翻译值；否则用 text 字段本身（可以是中文描述）
        const locDisplay = activeLocalization[text]?.trim();
        const displayName = locDisplay || text;
        // 只有存在 localization 字典且 key 不在其中时才算 missing
        const hasLocalization = Object.keys(allLocalizations).length > 0;
        const missingTranslation = hasLocalization && !locDisplay && def.type !== 'group' && def.type !== 'text';

        return {
          key,
          type: normalizeType(def.type),
          value: def.value,
          text,
          displayName: def.type === 'group' ? (def.text || key) : displayName,
          missingTranslation,
          // 解析选项 label（combo 类型）
          options: def.options ? def.options.map(opt => ({
            value: opt.value,
            label: activeLocalization[opt.label]?.trim() || opt.label,
          })) : undefined,
          condition: def.condition,
          order: def.order ?? 9999,
          index: def.index,
          step: def.step,
          precision: def.precision,
          fraction: def.fraction,
          fileType: def.fileType,
          mode: def.mode,
        };
      })
      .sort((a, b) => a.order - b.order);

    console.log(
      `[WE Dev Kit] Loaded ${properties.length} properties from project.json` +
      (properties.filter(p => p.missingTranslation).length > 0
        ? ` (${properties.filter(p => p.missingTranslation).length} missing translations)`
        : '')
    );
    return {
      properties,
      rawLocalization,
      allLocalizations,
      activeLocalization,
      appliedLanguage: appliedLang,
      availableLanguages,
      raw: rawProps as Record<string, RawPropertyDef>,
    };
  } catch (err) {
    console.warn('[WE Dev Kit] Failed to fetch project.json:', err);
    return emptyResult();
  }
}

function emptyResult(): LoadResult {
  return { properties: [], rawLocalization: {}, allLocalizations: {}, activeLocalization: {}, appliedLanguage: 'en-us', availableLanguages: [], raw: {} };
}

/**
 * 根据浏览器语言匹配合适的 project.json localization 键。
 * availableLower: 小写化的语言列表
 * availableOrig: 原始大小写的语言列表（对应 allLocalizations 的键）
 * 返回原始大小写的语言键。
 * 优先级：精确匹配 > 语言前缀匹配 > "en-us" > 第一个可用 > "en-us" 兜底。
 */
function resolveLanguage(
  browserLang: string,
  availableLower: string[],
  availableOrig: string[]
): string {
  if (availableLower.length === 0) return 'en-us';

  const idx = (() => {
    // 1. 精确匹配
    const exact = availableLower.indexOf(browserLang);
    if (exact !== -1) return exact;

    // 2. 语言前缀匹配（如 "zh-CN" → "zh"）
    const prefix = browserLang.split('-')[0]!;
    const prefixIdx = availableLower.findIndex(l => l.startsWith(prefix));
    if (prefixIdx !== -1) return prefixIdx;

    // 3. 回退到 "en-us"
    const enIdx = availableLower.indexOf('en-us');
    if (enIdx !== -1) return enIdx;

    // 4. 首个可用
    return 0;
  })();

  return availableOrig[idx] ?? 'en-us';
}

/**
 * 使用指定语言的 localization 重新解析属性列表的 displayName。
 * 返回新数组，不修改原 props。
 */
export function resolveDisplayNames(
  props: ProjectPropertyDef[],
  localeMap: Record<string, string>,
): ProjectPropertyDef[] {
  const hasAnyKeys = Object.keys(localeMap).length > 0;
  return props.map(prop => {
    if (!prop.text || prop.type === 'group') return prop;
    const displayName = localeMap[prop.text]?.trim();
    return {
      ...prop,
      displayName: displayName || prop.text,
      missingTranslation: hasAnyKeys && !displayName,
    };
  });
}

/** 解析选项 label：根据 localeMap 重写 options 的 label */
export function resolveOptionLabels(
  options: { value: unknown; label: string }[] | undefined,
  localeMap: Record<string, string>
): { value: unknown; label: string }[] | undefined {
  if (!options) return undefined;
  return options.map(opt => ({
    ...opt,
    label: localeMap[opt.label]?.trim() || opt.label,
  }));
}

/**
 * 将 WE type 映射为标准化 type
 */
function normalizeType(rawType: string): ProjectPropertyDef['type'] {
  const t = rawType.toLowerCase();
  const knownTypes: Record<string, ProjectPropertyDef['type']> = {
    bool: 'bool',
    checkbox: 'bool',
    slider: 'slider',
    combo: 'combo',
    dropdown: 'combo',
    color: 'color',
    text: 'text',
    textinput: 'textinput',
    input: 'textinput',
    file: 'file',
    directory: 'directory',
    group: 'group',
  };
  return knownTypes[t] || 'text';
}

/**
 * 将当前属性列表序列化为 project.json general.properties 格式。
 *
 * @param props 当前属性定义列表
 * @param rawRaw 上次加载的原始 raw 字段（保留原始未解析的字段）
 * @returns 可直接写入 project.json 的 general.properties 对象
 */
export function serializePropertiesToJson(
  props: ProjectPropertyDef[],
  rawRaw?: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  for (const prop of props) {
    if (prop.type === 'group') {
      // group 按 project.json 格式输出
      const entry: Record<string, unknown> = {
        type: 'group',
        text: prop.text || prop.key,
        order: prop.order ?? 9999,
        index: prop.index ?? 0,
      };
      // 如果有原始记录，保留其它字段
      const orig = rawRaw?.[prop.key] as Record<string, unknown> | undefined;
      if (orig) {
        for (const [k, v] of Object.entries(orig)) {
          if (!(k in entry)) entry[k] = v;
        }
      }
      out[prop.key] = entry;
      continue;
    }

    const entry: Record<string, unknown> = {
      type: denormalizeType(prop.type),
      text: prop.text || prop.key,
      order: prop.order ?? 9999,
      index: prop.index ?? 0,
    };

    // 添加默认值
    if (prop.value !== undefined && prop.value !== null) {
      entry.value = prop.value;
    }

    // 类型特定字段
    switch (prop.type) {
      case 'slider': {
        if (prop.min !== undefined) entry.min = prop.min;
        if (prop.max !== undefined) entry.max = prop.max;
        if (prop.step !== undefined) entry.step = prop.step;
        if (prop.precision !== undefined) entry.precision = prop.precision;
        if (prop.fraction !== undefined) entry.fraction = prop.fraction;
        break;
      }
      case 'color': {
        // color 类型需要特定处理 — 确保 value 是 "R G B" 格式
        break;
      }
      case 'combo': {
        if (prop.options && prop.options.length > 0) {
          entry.options = prop.options.map(opt => ({
            label: opt.label,
            value: opt.value,
          }));
        }
        break;
      }
      case 'file':
      case 'directory': {
        if (prop.fileType) entry.fileType = prop.fileType;
        if (prop.mode) entry.mode = prop.mode;
        break;
      }
    }

    // 条件
    if (prop.condition) {
      entry.condition = prop.condition;
    }

    out[prop.key] = entry;
  }

  return out;
}

/**
 * 将标准 type 映射回 WE project.json 的 type 字符串
 */
function denormalizeType(type: ProjectPropertyDef['type']): string {
  const map: Record<string, string> = {
    bool: 'bool',
    slider: 'slider',
    combo: 'combo',
    color: 'color',
    text: 'text',
    textinput: 'textinput',
    file: 'file',
    directory: 'directory',
    group: 'group',
  };
  return map[type] || 'text';
}

/**
 * 下载对象为 JSON 文件
 */
export function downloadJsonFile(data: unknown, filename: string): void {
  const json = JSON.stringify(data, null, '\t');
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
