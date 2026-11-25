#!/usr/bin/env node
/**
 * oas-sku 匹配性能复跑脚本（纯 Node，无依赖；数据口径见 src/commerce/sku/README.md「性能（万级组合表）」）。
 *
 * 用法：node scripts/perf/sku-match.mjs [组合表行数]（默认 10 000）
 *
 * 计时口径 = 组件算法的同构复刻（src/commerce/sku/oas-sku.ts）：
 *   - isAvailable：每次调用对全表 filter 在库（组件按选项逐项调用，无缓存）
 *   - matchedSku：全表 find 精确匹配
 *   一次「纯匹配采样」= 全部选项逐个 isAvailable（组内已预置其余维度选中）+ 一次 matchedSku。
 * 数据 = 5 组真实分布子集（颜色 10 × 尺码 8 × 领型 5 × 袖长 3 × 系列 9），确定性伪随机
 * （12% 售罄），同规模同分布下数字可复现。算法若改，先改组件再同步此处。
 */

const rows = Number(process.argv[2] ?? 10_000)
const groupSizes = { color: 10, size: 8, collar: 5, sleeve: 3, series: 9 }
const keys = Object.keys(groupSizes)
const totalOptions = Object.values(groupSizes).reduce((a, b) => a + b, 0)

// 确定性伪随机（LCG）：同参数下数据可复现
let seed = 20261125
const rand = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648

const skus = []
for (let i = 0; i < rows; i++) {
  const specs = {}
  let n = i
  for (const key of [...keys].reverse()) {
    specs[key] = `${key}-${n % groupSizes[key]}`
    n = Math.floor(n / groupSizes[key])
  }
  skus.push({ specs, stock: rand() < 0.12 ? 0 : Math.ceil(rand() * 30) })
}

// 其余 4 组已预置选中（最贴近部分选择的实际成本）
const selected = Object.fromEntries(keys.slice(0, -1).map((key, i) => [key, `${key}-${i % groupSizes[key]}`]))

const isAvailable = (key, value) =>
  skus
    .filter((sku) => sku.stock > 0)
    .some(
      (sku) => sku.specs[key] === value && keys.every((k) => k === key || !selected[k] || sku.specs[k] === selected[k]),
    )
const matchedSku = () => skus.find((sku) => keys.every((k) => sku.specs[k] === selected[k])) ?? null

const median = (samples) => [...samples].sort((a, b) => a - b)[Math.floor(samples.length / 2)]
const sampleOnce = () => {
  const t0 = performance.now()
  for (const key of keys) {
    for (let v = 0; v < groupSizes[key]; v++) isAvailable(key, `${key}-${v}`)
  }
  matchedSku()
  return performance.now() - t0
}

for (let i = 0; i < 10; i++) sampleOnce() // 预热
const samples = Array.from({ length: 20 }, () => sampleOnce())
console.log(
  JSON.stringify({
    rows: skus.length,
    totalOptions,
    matchSweepMs: Number(median(samples).toFixed(2)),
    samples: samples.length,
  }),
)
