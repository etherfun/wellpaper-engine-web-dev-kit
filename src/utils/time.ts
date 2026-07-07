/**
 * 时间格式化工具。
 */

/** 秒数 → "M:SS" 格式 */
export function formatTime(seconds: number): string {
  const safe = Number.isFinite(seconds) && seconds >= 0 ? seconds : 0;
  const m = Math.floor(safe / 60);
  const s = Math.floor(safe % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** "M:SS" 或 "MM:SS" 格式 → 秒数（解析失败返回 0） */
export function parseTimeLabel(label: string): number {
  const parts = label.split(':').map((p) => parseFloat(p.trim()));
  if (parts.length === 0 || parts.some((p) => Number.isNaN(p))) return 0;
  if (parts.length === 1) return parts[0] ?? 0;
  return (parts[0] ?? 0) * 60 + (parts[1] ?? 0);
}

/** 节流包装器 */
export function debounce<T extends (...args: never[]) => void>(
  fn: T,
  waitMs: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), waitMs);
  };
}