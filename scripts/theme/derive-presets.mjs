#!/usr/bin/env node
/**
 * 预设色板 `-text` 安全档：规则推导 / 合规审计（离线工具，不进运行时依赖、不进 CI 门禁）。
 *
 * 用法：node scripts/theme/derive-presets.mjs            # 审计现状 + 打印规则推导结果
 *       node scripts/theme/derive-presets.mjs --check    # 仅审计，有违例则 exit 1
 *
 * 规则（常量真源在 packages/theme/oklab.ts，守卫测试同源）：
 *   1. 锁色相：`-text` 只允许在 L（亮度）上取档，彩度仅在出 sRGB 色域时按色域映射压缩；
 *   2. 对比度：目标底感知分 ≥ TEXT_MIN_SCORE（65，a11y 硬闸 60 + 5 分余量）；
 *      **约束**——`-text` 在 `bg-elevated` 上感知分 ≥ TEXT_ELEVATED_MIN_SCORE（60，直接取硬闸）。
 *      `bg-elevated` 是正式表面（snackbar / toolbar / app-bar / sidebar / segmented / descriptions 等
 *      在用），属真实可达组合；它不作求解目标，只在换解时做校验。
 *      light 取「达标下最浅档」（对比度余量最小、视觉变化最小），dark 取最深档；
 *   3. 相邻色距：ADJACENT_PRESET_PAIRS 内各对的 ΔE_OK ≥ TEXT_MIN_DISTANCE（8）；
 *   4. 冲突退让：相邻对冲突时**只在对比度更高（更安全）的方向上调整**（light 压深 / dark 提亮，
 *      该方向单调提升各底对比度，不会把成员推进不达标区），且取**总感知位移最小解**——谁动得少谁承担，
 *      不再固定「后序成员」退让（旧规则会把后序成员压到 elevated 硬闸以下）。
 *   5. 已合规的存量值一律保留（不追平最浅档，避免无谓视觉变更）。
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  ADJACENT_PRESET_PAIRS,
  PRESET_NAMES,
  TEXT_ELEVATED_MIN_SCORE,
  TEXT_MAX_HUE_DRIFT,
  TEXT_MIN_DISTANCE,
  TEXT_MIN_SCORE,
  contrastScore,
  feasibleLightnessRange,
  hexToOklch,
  hueDiff,
  okDistance,
  parseElevatedBg,
  parsePresetTokens,
  presetTextHexAt,
  textBgChecks,
  textBgs,
  textChecksPass,
} from '../../packages/theme/oklab.ts'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..')
const MODES = ['light', 'dark']
const CHROMA_FLOOR = 0.6 // 退让时彩度不得低于该成员当前档的 60%（防"调成近白/近灰丢色相"）
// 推导目标留 0.3 色距余量（守卫下限仍是 TEXT_MIN_DISTANCE=8，避免浮点/取整踩线）
const DERIVE_MIN_DISTANCE = TEXT_MIN_DISTANCE + 0.3
// 安全方向：对比度随 L 单调提升的一侧（light 压深、dark 提亮）
const SAFE_DIR = { light: -1, dark: 1 }

const CSS = readFileSync(join(ROOT, 'packages/theme/index.css'), 'utf8')
const tokens = parsePresetTokens(CSS)
const ELEVATED = parseElevatedBg(CSS)

// 相邻对按 PRESET_NAMES 声明序（色相环序）归一，仅用于稳定遍历顺序（判据对称）。
const ORDER = Object.fromEntries(PRESET_NAMES.map((name, i) => [name, i]))
const PAIRS = ADJACENT_PRESET_PAIRS.map(([a, b]) => (ORDER[a] <= ORDER[b] ? [a, b] : [b, a]))

const CHECKS = { light: textBgChecks('light', ELEVATED.light), dark: textBgChecks('dark', ELEVATED.dark) }
const checksOf = (mode) => CHECKS[mode]
/** 目标底（不含 bg-elevated）最低分，仅用于报表展示 */
const minTargetScore = (fg, mode) => Math.min(...textBgs(mode).map((bg) => contrastScore(fg, bg)))
const elevatedScore = (fg, mode) => contrastScore(fg, ELEVATED[mode])
const drift = (baseHex, textHex) => hueDiff(hexToOklch(baseHex).h, hexToOklch(textHex).h)
const chroma = (h) => hexToOklch(h).C
const dist = (a, b) => okDistance(hexToOklch(a), hexToOklch(b))

/** hex 取整可能把边界值挤出达标区：沿「更达标」方向微调到重新通过全部底约束 */
function enforceScore(baseHex, L, mode) {
  const checks = checksOf(mode)
  const dir = mode === 'light' ? -0.0005 : 0.0005
  for (let i = 0; i < 400; i++) {
    const cand = presetTextHexAt(baseHex, L)
    if (textChecksPass(cand, checks)) return { L, hex: cand }
    L += dir
    if (L < 0 || L > 1) break
  }
  return { L, hex: presetTextHexAt(baseHex, L) }
}

/** 相邻对里除 exclude 外的邻居（用其已定值作额外硬约束） */
function otherNeighbors(name, exclude) {
  const out = []
  for (const [a, b] of PAIRS) {
    if (a === name && b !== exclude) out.push(b)
    if (b === name && a !== exclude) out.push(a)
  }
  return out
}

function refsOf(name, exclude, values) {
  return otherNeighbors(name, exclude).map((n) => ({ name: n, hex: values[n] }))
}

/** 候选是否满足：全部底约束 + 彩度保底 + 与其它已定邻居的色距 ≥ 下限 */
function candidateOk(mode, cand, refs, chromaFloorHex) {
  if (!textChecksPass(cand, checksOf(mode))) return false
  if (chroma(cand) < CHROMA_FLOOR * chroma(chromaFloorHex)) return false
  return refs.every((r) => dist(cand, r.hex) >= DERIVE_MIN_DISTANCE)
}

/** 沿安全方向枚举某成员的可行候选（hex 去重，按 L 升序） */
function candidatesAlong(mode, baseHex, bounds, refs, chromaFloorHex) {
  const out = []
  const step = 0.0005
  let last = null
  for (let L = bounds.lo; L <= bounds.hi + 1e-9; L += step) {
    const { hex } = enforceScore(baseHex, L, mode)
    if (hex === last) continue
    last = hex
    if (!candidateOk(mode, hex, refs, chromaFloorHex)) continue
    out.push({ L, hex })
  }
  return out
}

/**
 * 解一对相邻冲突：只在安全方向（light 压深 / dark 提亮）上调整两成员，取总感知位移最小解。
 * 安全方向单调提升各底对比度，故候选天然满足 `bg-elevated` 硬闸；无需再按「后序成员」硬性指定退让方。
 */
function solvePair(mode, a, b, values) {
  const dir = SAFE_DIR[mode]
  const baseA = tokens[mode].base[a]
  const baseB = tokens[mode].base[b]
  const currentA = values[a]
  const currentB = values[b]
  const rangeA = feasibleLightnessRange(baseA, mode, ELEVATED[mode])
  const rangeB = feasibleLightnessRange(baseB, mode, ELEVATED[mode])
  if (!rangeA || !rangeB) return null
  const refsA = refsOf(a, b, values)
  const refsB = refsOf(b, a, values)

  // 安全方向上的 L 子区间（以当前值为起点，只许朝更达标一侧）
  const bounds = (range, current) => {
    const l = hexToOklch(current).L
    return dir > 0 ? { lo: Math.max(range.lo, l), hi: range.hi } : { lo: range.lo, hi: Math.min(range.hi, l) }
  }
  const candsA = candidatesAlong(mode, baseA, bounds(rangeA, currentA), refsA, currentA)
  const candsB = candidatesAlong(mode, baseB, bounds(rangeB, currentB), refsB, currentB)

  let best = null
  for (const ca of candsA) {
    for (const cb of candsB) {
      if (dist(ca.hex, cb.hex) < DERIVE_MIN_DISTANCE) continue
      const cost = dist(ca.hex, currentA) + dist(cb.hex, currentB)
      if (!best || cost < best.cost - 1e-9) best = { cost, [a]: ca.hex, [b]: cb.hex }
    }
  }
  if (!best) return null
  best.moved = [a, b].filter((n) => best[n] !== values[n])
  return best
}

/** 推导：单点违规（对比度/色相）先修，再逐对解相邻冲突（迭代到收敛或无可动） */
function derive(mode) {
  const originals = { ...tokens[mode].text }
  const values = { ...originals }
  const reasons = new Map()
  const addReason = (name, why) => reasons.set(name, [...(reasons.get(name) ?? []), why])
  const unsolved = []

  for (const name of PRESET_NAMES) {
    const cur = values[name]
    const badScore = !textChecksPass(cur, checksOf(mode))
    const badHue = drift(tokens[mode].base[name], cur) > TEXT_MAX_HUE_DRIFT
    if (!badScore && !badHue) continue
    const range = feasibleLightnessRange(tokens[mode].base[name], mode, ELEVATED[mode])
    if (!range) {
      unsolved.push(`${mode} ${name}：本色相下无满足全部底约束的 L 区间`)
      continue
    }
    // 「离本色 L 最近」= 对比度余量最小档（light 最浅 / dark 最深）
    const L = Math.min(Math.max(hexToOklch(tokens[mode].base[name]).L, range.lo), range.hi)
    const { hex: cand } = enforceScore(tokens[mode].base[name], L, mode)
    addReason(name, badScore ? '底约束（目标底 ≥65 / bg-elevated ≥60）' : '色相漂移')
    values[name] = cand
  }

  // 相邻冲突：迭代到收敛（安全方向单调，通常 1-2 轮即稳）
  for (let pass = 0; pass < 10; pass++) {
    let moved = false
    for (const [a, b] of PAIRS) {
      const before = dist(values[a], values[b])
      if (before >= DERIVE_MIN_DISTANCE) continue
      const sol = solvePair(mode, a, b, values)
      if (!sol) {
        unsolved.push(
          `${mode} ${a}↔${b}：安全方向下无法把色距从 ${before.toFixed(1)} 拉到 ≥${DERIVE_MIN_DISTANCE.toFixed(1)}`,
        )
        continue
      }
      for (const n of sol.moved) {
        addReason(n, `相邻色距 ${a}↔${b}（${before.toFixed(1)} → ${dist(sol[a], sol[b]).toFixed(1)}）`)
        values[n] = sol[n]
      }
      if (sol.moved.length) moved = true
    }
    if (!moved) break
  }

  const changes = PRESET_NAMES.filter((n) => values[n] !== originals[n]).map((n) => ({
    mode,
    name: n,
    from: originals[n],
    to: values[n],
    reason: (reasons.get(n) ?? ['—']).join('；'),
  }))
  return { values, changes, unsolved }
}

/** 审计：逐预设目标底 / bg-elevated 感知分 + 色相漂移 + 逐对色距，列出违例 */
function audit() {
  const out = {}
  for (const mode of MODES) {
    const bgs = textBgs(mode)
    const rows = PRESET_NAMES.map((name) => {
      const baseHex = tokens[mode].base[name]
      const textHex = tokens[mode].text[name]
      return {
        name,
        base: baseHex,
        text: textHex,
        minScore: minTargetScore(textHex, mode),
        elevated: elevatedScore(textHex, mode),
        drift: drift(baseHex, textHex),
      }
    })
    const pairs = ADJACENT_PRESET_PAIRS.map(([a, b]) => ({
      pair: `${a}↔${b}`,
      distance: dist(tokens[mode].text[a], tokens[mode].text[b]),
    }))
    const violations = [
      ...rows
        .filter((r) => r.minScore < TEXT_MIN_SCORE)
        .map((r) => `${r.name} 目标底感知分 ${r.minScore.toFixed(1)} < ${TEXT_MIN_SCORE}`),
      ...rows
        .filter((r) => r.elevated < TEXT_ELEVATED_MIN_SCORE)
        .map(
          (r) =>
            `${r.name} 在 bg-elevated(${ELEVATED[mode]}) 上感知分 ${r.elevated.toFixed(1)} < ${TEXT_ELEVATED_MIN_SCORE}`,
        ),
      ...rows
        .filter((r) => r.drift > TEXT_MAX_HUE_DRIFT)
        .map((r) => `${r.name} 色相漂移 ${r.drift.toFixed(1)}° > ${TEXT_MAX_HUE_DRIFT}°`),
      ...pairs
        .filter((p) => p.distance < TEXT_MIN_DISTANCE)
        .map((p) => `${p.pair} 色距 ${p.distance.toFixed(1)} < ${TEXT_MIN_DISTANCE}`),
    ]
    out[mode] = { rows, pairs, violations }
  }
  return out
}

const checkOnly = process.argv.includes('--check')
const report = audit()
let hasViolation = false
for (const mode of MODES) {
  const bgs = textBgs(mode)
  console.log(`\n### ${mode}（目标底 ${bgs.join(' / ')}；bg-elevated ${ELEVATED[mode]}）`)
  console.log('name       text      目标底感知分        elevated   色相漂移  本色')
  for (const r of report[mode].rows) {
    const scores = bgs.map((bg) => contrastScore(r.text, bg).toFixed(1)).join(' / ')
    const flag =
      r.minScore < TEXT_MIN_SCORE || r.elevated < TEXT_ELEVATED_MIN_SCORE || r.drift > TEXT_MAX_HUE_DRIFT ? '  ✗' : ''
    console.log(
      `${r.name.padEnd(9)} ${r.text}  ${scores.padEnd(15)} min=${r.minScore.toFixed(1).padStart(5)}  ${r.elevated.toFixed(1).padStart(5)}  ${r.drift.toFixed(1).padStart(5)}°  ${r.base}${flag}`,
    )
  }
  console.log('相邻对     色距')
  for (const p of report[mode].pairs) {
    console.log(`${p.pair.padEnd(10)} ${p.distance.toFixed(1)}${p.distance < TEXT_MIN_DISTANCE ? '  ✗' : ''}`)
  }
  if (report[mode].violations.length) {
    hasViolation = true
    console.log('违例：')
    for (const v of report[mode].violations) console.log(`  - ${v}`)
  } else {
    console.log('违例：无')
  }
}

if (checkOnly) {
  console.log(`\n[theme:derive] ${hasViolation ? 'FAIL —— 存在违例' : 'PASS'}`)
  process.exit(hasViolation ? 1 : 0)
}

console.log('\n### 规则推导（仅列需要变更的项）')
console.log('mode   name     旧值      新值      目标底min  elevated  相邻色距(新)  原因')
for (const mode of MODES) {
  const { values, changes, unsolved } = derive(mode)
  if (!changes.length && !unsolved.length) {
    console.log(`${mode}  —        无变更`)
    continue
  }
  for (const c of changes) {
    const ds = ADJACENT_PRESET_PAIRS.filter(([a, b]) => a === c.name || b === c.name)
      .map(([a, b]) => `${a}↔${b}=${dist(values[a], values[b]).toFixed(1)}`)
      .join(' ')
    console.log(
      `${mode.padEnd(6)} ${c.name.padEnd(9)} ${c.from.padEnd(9)} ${c.to.padEnd(9)} ${minTargetScore(c.to, mode)
        .toFixed(1)
        .padStart(8)}  ${elevatedScore(c.to, mode).toFixed(1).padStart(7)}  ${ds.padEnd(22)} ${c.reason}`,
    )
  }
  for (const u of unsolved) console.log(`${mode.padEnd(6)} 无解：${u}`)
}
