/**
 * 性能基线共享助手：docs/perf-baseline.json 的读写与格式化工具。
 *
 * - size.mjs / render-bench.mjs 各自写入自己的 section，互不覆盖
 *   （load → merge → save），因此可以先后独立运行刷新。
 * - docs/perf-baseline.json 是生成物（基准数据 + 断言结果），
 *   对比口径与对照见 docs/perf-baseline.md。
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

export const ROOT = resolve(import.meta.dirname, '../../..')
export const BASELINE_PATH = resolve(ROOT, 'docs/perf-baseline.json')

/** 读取现有基线（文件不存在则空对象），供 merge 后写回 */
export function loadBaseline() {
  try {
    return JSON.parse(readFileSync(BASELINE_PATH, 'utf8'))
  } catch {
    return {}
  }
}

/** 写回基线（保持已有 section 不动，仅替换传入的 section） */
export function saveBaseline(next) {
  mkdirSync(dirname(BASELINE_PATH), { recursive: true })
  writeFileSync(BASELINE_PATH, JSON.stringify(next, null, 2) + '\n')
}

/** 合并某个 section（如 size / render）进基线文件 */
export function writeSection(key, value) {
  const baseline = loadBaseline()
  baseline[key] = value
  saveBaseline(baseline)
}

/** 本地日期 YYYY-MM-DD（基线时间戳用本地日，避免 UTC 跨日偏差） */
export function today() {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

/** 字节 → KB 文本（保留 1 位小数） */
export function fmtKB(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`
}

/** 字节 → MB 文本（保留 2 位小数） */
export function fmtMB(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

/** 字节 → 人类可读（自动选 KB/MB） */
export function fmtBytes(bytes) {
  return bytes >= 1024 * 1024 ? fmtMB(bytes) : fmtKB(bytes)
}
