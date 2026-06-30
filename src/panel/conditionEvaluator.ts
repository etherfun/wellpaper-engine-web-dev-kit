/**
 * WE 条件表达式求值器
 *
 * 解析 project.json 中形如 `showDate.value == true` 或
 * `visual_audio_model.value == 1 && ColorMode.value == 2` 的条件表达式，
 * 根据当前属性值判断该属性对用户是否可见。
 *
 * 支持的语法：
 *   - 比较: .value == X, .value != X
 *   - 布尔值: true, false
 *   - 数字: 整数/浮点数
 *   - 字符串: '单引号' 或 "双引号"
 *   - 空字符串: ''
 *   - 组合: && (AND), || (OR)
 *   - 括号: (expr)
 */

// ---- 词法分析 ----

type Token =
  | { type: 'ident'; value: string }
  | { type: 'num'; value: number }
  | { type: 'str'; value: string }
  | { type: 'bool'; value: boolean }
  | { type: 'eq'; op: '==' }
  | { type: 'ne'; op: '!=' }
  | { type: 'and' }
  | { type: 'or' }
  | { type: 'lparen' }
  | { type: 'rparen' }
  | { type: 'dot' }
  | { type: 'eof' };

function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i]!;
    // 空白
    if (/\s/.test(ch)) { i++; continue; }
    // 括号
    if (ch === '(') { tokens.push({ type: 'lparen' }); i++; continue; }
    if (ch === ')') { tokens.push({ type: 'rparen' }); i++; continue; }
    // 点号
    if (ch === '.') { tokens.push({ type: 'dot' }); i++; continue; }
    // 比较符
    if (ch === '=' && expr[i + 1] === '=') { tokens.push({ type: 'eq', op: '==' }); i += 2; continue; }
    if (ch === '!' && expr[i + 1] === '=') { tokens.push({ type: 'ne', op: '!=' }); i += 2; continue; }
    // 逻辑符
    if (ch === '&' && expr[i + 1] === '&') { tokens.push({ type: 'and' }); i += 2; continue; }
    if (ch === '|' && expr[i + 1] === '|') { tokens.push({ type: 'or' }); i += 2; continue; }
    // 字符串（单引号或双引号）
    if (ch === "'" || ch === '"') {
      const quote = ch;
      let str = '';
      i++;
      while (i < expr.length && expr[i] !== quote) {
        str += expr[i];
        i++;
      }
      if (i < expr.length) i++; // 跳过结束引号
      tokens.push({ type: 'str', value: str });
      continue;
    }
    // true / false
    if (expr.slice(i, i + 4) === 'true') { tokens.push({ type: 'bool', value: true }); i += 4; continue; }
    if (expr.slice(i, i + 5) === 'false') { tokens.push({ type: 'bool', value: false }); i += 5; continue; }
    // 数字
    if (/[0-9]/.test(ch) || (ch === '-' && /[0-9]/.test(expr[i + 1] ?? ''))) {
      let numStr = '';
      while (i < expr.length && /[0-9.]/.test(expr[i]!)) {
        numStr += expr[i];
        i++;
      }
      tokens.push({ type: 'num', value: parseFloat(numStr) });
      continue;
    }
    // 标识符（属性名）
    if (/[a-zA-Z_]/.test(ch)) {
      let id = '';
      while (i < expr.length && /[a-zA-Z0-9_]/.test(expr[i]!)) {
        id += expr[i];
        i++;
      }
      tokens.push({ type: 'ident', value: id });
      continue;
    }
    // 跳过无法识别字符
    i++;
  }
  tokens.push({ type: 'eof' });
  return tokens;
}

// ---- 求值 ----

/**
 * 根据当前属性值求值条件表达式。
 * @param condition 条件表达式字符串，如 `"showDate.value == true && DateX.value > 0"`
 * @param getPropertyValue 获取属性当前值的回调，接收属性 key，返回其值
 * @returns 条件是否成立
 */
export function evaluateCondition(
  condition: string | undefined,
  getPropertyValue: (key: string) => unknown
): boolean {
  if (!condition || condition.trim() === '') return true;

  try {
    const tokens = tokenize(condition);
    let pos = 0;

    function peek(): Token { return tokens[pos] ?? { type: 'eof' }; }
    function consume(): Token { return tokens[pos++] ?? { type: 'eof' }; }

    function parseOr(): boolean {
      let left = parseAnd();
      while (peek().type === 'or') {
        consume();
        const right = parseAnd();
        left = left || right;
      }
      return left;
    }

    function parseAnd(): boolean {
      let left = parseComparison();
      while (peek().type === 'and') {
        consume();
        const right = parseComparison();
        left = left && right;
      }
      return left;
    }

    function parseComparison(): boolean {
      // (expr) 优先级
      if (peek().type === 'lparen') {
        consume();
        const val = parseOr();
        if (peek().type === 'rparen') consume();
        return val;
      }

      // key.value == X
      // key.value != X
      // true / false 裸布尔
      // 数字/字符串 裸值

      const leftToken = peek();

      // 裸布尔值
      if (leftToken.type === 'bool') {
        consume();
        // 可能后接 ==/!= 比较
        if (peek().type === 'eq' || peek().type === 'ne') {
          const op = consume();
          const right = consume();
          const rv = right.type === 'bool' ? right.value
            : right.type === 'num' ? right.value
            : right.type === 'str' ? right.value
            : null;
          if (op.type === 'eq') return leftToken.value === rv;
          return leftToken.value !== rv;
        }
        return leftToken.value;
      }

      // 裸数字/字符串
      if (leftToken.type === 'num' || leftToken.type === 'str') {
        consume();
        if (peek().type === 'eq' || peek().type === 'ne') {
          const op = consume();
          const right = consume();
          const lv = leftToken.type === 'num' ? leftToken.value : leftToken.value;
          const rv = right.type === 'num' ? right.value
            : right.type === 'str' ? right.value
            : right.type === 'bool' ? right.value
            : null;
          if (op.type === 'eq') return lv === rv;
          if (op.type === 'ne') return lv !== rv;
        }
        // 没有比较符，裸值视为 true（非空/非零）
        if (leftToken.type === 'str') return leftToken.value !== '';
        return leftToken.value !== 0;
      }

      // ident(.value)? ==/!= X
      if (leftToken.type === 'ident') {
        consume();
        // 跳过可选的 .value
        if (peek().type === 'dot') {
          consume(); // .
          const propToken = consume(); // value 或其他
          const propName = leftToken.value;
          const actualValue = getPropertyValue(propName);

          if (peek().type === 'eq' || peek().type === 'ne') {
            const op = consume();
            const rightToken = consume();
            const expected = tokenToValue(rightToken);
            if (op.type === 'eq') return looseEqual(actualValue, expected);
            if (op.type === 'ne') return !looseEqual(actualValue, expected);
          }

          // 没有比较符，检查值的 truthiness
          return isTruthy(actualValue);
        }

        // ident 后没有 .value — 视为裸标识符布尔检查
        if (peek().type === 'eq' || peek().type === 'ne') {
          const op = consume();
          const rightToken = consume();
          const propName = leftToken.value;
          const actualValue = getPropertyValue(propName);
          const expected = tokenToValue(rightToken);
          if (op.type === 'eq') return looseEqual(actualValue, expected);
          if (op.type === 'ne') return !looseEqual(actualValue, expected);
        }

        // 裸标识符：检查属性是否存在且 truthy
        const propName = leftToken.value;
        const actualValue = getPropertyValue(propName);
        return isTruthy(actualValue);
      }

      // 裸值无法求值 — 默认可见
      return true;
    }

    const result = parseOr();
    return result;
  } catch (e) {
    console.warn(`[WE Dev Kit] Failed to evaluate condition "${condition}":`, e);
    return true; // 出错时默认可见
  }
}

function tokenToValue(t: Token): unknown {
  switch (t.type) {
    case 'bool': return t.value;
    case 'num': return t.value;
    case 'str': return t.value;
    default: return null;
  }
}

/**
 * 宽松比较：比较属性实际值与期望值。
 * WE 属性值可能是 { value: X } 格式也可能是原始值。
 */
function looseEqual(actual: unknown, expected: unknown): boolean {
  // 解包 { value: X }
  let a = actual;
  if (a && typeof a === 'object' && 'value' in (a as any)) {
    a = (a as any).value;
  }

  // 数字比较
  if (typeof a === 'number' && typeof expected === 'number') return a === expected;
  if (typeof a === 'number' && typeof expected === 'string') {
    const num = Number(expected);
    if (!isNaN(num)) return a === num;
    return String(a) === expected;
  }
  // 字符串比较
  if (typeof a === 'string' && typeof expected === 'string') return a === expected;
  if (typeof a === 'string' && typeof expected === 'number') {
    const num = Number(a);
    if (!isNaN(num)) return num === expected;
    return a === String(expected);
  }
  // 布尔比较
  if (typeof a === 'boolean' && typeof expected === 'boolean') return a === expected;
  if (typeof a === 'boolean' && typeof expected === 'string') {
    return a === (expected === 'true');
  }
  // 数字与布尔
  if (typeof a === 'number' && typeof expected === 'boolean') {
    return (a !== 0) === expected;
  }

  return a === expected;
}

function isTruthy(val: unknown): boolean {
  if (val === null || val === undefined) return false;
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return val !== 0;
  if (typeof val === 'string') return val !== '' && val !== '0';
  if (typeof val === 'object') {
    const v = (val as any).value;
    if (v !== undefined) return isTruthy(v);
    return true;
  }
  return true;
}

// ---- 批量求值所有属性条件 ----

export interface VisibilityMap {
  [key: string]: boolean;
}

/**
 * 对一组属性批量求值 condition，返回每个属性是否可见。
 * 同时处理属性 value 变化后的递归条件（一个属性变化可能影响其他属性的可见性）。
 */
export function evaluateAllConditions(
  props: { key: string; condition?: string }[],
  getPropertyValue: (key: string) => unknown
): VisibilityMap {
  const map: VisibilityMap = {};

  // 条件可能形成依赖链，需要迭代求值直到稳定
  for (const prop of props) {
    if (!prop.condition) {
      map[prop.key] = true;
    }
  }

  // 最多迭代 10 次直到稳定
  let changed = true;
  let iterations = 0;
  while (changed && iterations < 10) {
    changed = false;
    iterations++;
    for (const prop of props) {
      if (!prop.condition) continue;
      const visible = evaluateCondition(prop.condition, getPropertyValue);
      if (map[prop.key] !== visible) {
        map[prop.key] = visible;
        changed = true;
      }
    }
  }

  return map;
}
