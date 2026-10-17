# 服务端窗口取数（windowed 配方）

> 面向十万行级数据：**组件只负责算「需要哪一段」，取数、取消、合并由宿主负责**。本页给出可直接落地的四步配方与可运行示例（`oas-table` 演示；gantt / resource / tree / list 契约相同，差异见文末）。

## 契约

- 属性：`windowed`（开启）+ `total`（全量行数）+ `window-start`（`data[0]` 的绝对行号）；`data` 只承载 `[window-start, window-start + data.length)`。
- 事件：`oas-window-request`，`detail: { start, end, reason }`（半开区间、绝对行号；`reason` = `init` / `scroll` / `resize` / `data`）。**同一期望区间不重复派发**；被覆盖后复位。
- 前提：必须有可测滚动视口（`height` 或可测 `max-height`），否则组件不派发请求（`devWarn` 一次）。表格 windowed 的切片须为**扁平行**（不递归 `children`）。

## 四步配方

1. **分段取数**：把请求区间对齐到固定段（如 200 行/段），一次响应覆盖后续多个窗口——请求数通常降一个数量级。
2. **只保留最新**：连续滚动时取消在途请求（`AbortController`）或用请求序号丢弃过期响应；否则旧响应晚到会让视图回跳。
3. **按 id 合并回全量**：`oas-tasks-change` / 编辑回写只含切片；宿主必须按 id 合并，**不得整体替换**全量数据。
4. **原子回填**：先写 `data` 再写 `window-start`（同一同步段内），避免「新切片 + 旧起点」的中间态。

```ts
// 真实项目：分段拉取 + 只保留最新 + 原子回填
let seq = 0
let controller: AbortController | null = null
const SEG = 200

el.addEventListener('oas-window-request', async (event) => {
  const { start, end } = (event as CustomEvent<{ start: number; end: number }>).detail
  const my = ++seq
  controller?.abort()
  controller = new AbortController()

  const segFrom = Math.floor(start / SEG)
  const segTo = Math.floor((Math.max(start, end - 1)) / SEG)
  const from = segFrom * SEG
  const to = Math.min(total, (segTo + 1) * SEG)

  const rows = await fetch(`/api/rows?from=${from}&to=${to}`, {
    signal: controller.signal,
  }).then((r) => r.json())
  if (my !== seq) return // 过期响应，丢弃

  el.setAttribute('window-start', String(from))
  el.setAttribute('data', JSON.stringify(rows))
})
```

## 可运行示例（本地模拟服务端）

以下 demo 用本地数据模拟服务端：200 行/段、120ms 延迟、按段缓存、只保留最新请求。滚动表格观察下方计数——**段内滚动不会再发请求**（一次响应覆盖多个窗口）。

<DemoBlock title="windowed + 分段缓存 + 只保留最新（模拟 5 万行）">
  <div style="width: 100%">
    <oas-table
      id="guide-windowed-demo"
      windowed
      total="50000"
      window-start="0"
      height="320"
      row-key="id"
      columns='[{"key":"id","title":"ID","width":"90px"},{"key":"name","title":"名称","width":"200px"},{"key":"owner","title":"负责人","width":"120px"},{"key":"status","title":"状态","width":"120px"}]'
    ></oas-table>
    <p id="guide-windowed-demo-log" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin-top: var(--oas-space-2)">
      等待首个窗口请求…
    </p>
  </div>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  const el = document.getElementById('guide-windowed-demo')
  const log = document.getElementById('guide-windowed-demo-log')
  if (!el || !log) return

  const TOTAL = 50000
  const SEG = 200
  const LATENCY = 120
  const segments = new Map() // 段号 → 行数组（模拟服务端缓存）
  const stats = { requests: 0, cacheHits: 0, stale: 0 }
  let seq = 0
  let timer = 0

  const makeRow = (i) => ({
    id: i,
    name: `任务 ${i + 1}`,
    owner: ['张三', '李四', '王五', '赵六'][i % 4],
    status: ['待开始', '进行中', '已完成'][i % 3],
  })

  // 模拟服务端：按段返回（含 120ms 延迟），段缓存命中则即时返回
  const fetchSegment = (segIndex) =>
    new Promise((resolve) => {
      const cached = segments.get(segIndex)
      if (cached) {
        stats.cacheHits++
        resolve(cached)
        return
      }
      setTimeout(() => {
        const from = segIndex * SEG
        const rows = Array.from({ length: Math.max(0, Math.min(SEG, TOTAL - from)) }, (_, k) => makeRow(from + k))
        segments.set(segIndex, rows)
        resolve(rows)
      }, LATENCY)
    })

  const renderLog = (windowStart, rows) => {
    log.textContent = `请求 ${stats.requests} 次 · 段缓存命中 ${stats.cacheHits} · 丢弃过期响应 ${stats.stale} · 当前窗口 [${windowStart}, ${windowStart + rows.length}) · 已装载 ${rows.length} 行（总 ${TOTAL}）`
  }

  const load = async (start, end) => {
    stats.requests++
    const my = ++seq
    if (timer) {
      clearTimeout(timer)
      stats.stale++ // 模拟取消在途请求
    }

    const segFrom = Math.floor(start / SEG)
    const segTo = Math.floor((Math.max(start, end - 1)) / SEG)
    const list = await Promise.all(
      Array.from({ length: segTo - segFrom + 1 }, (_, k) => fetchSegment(segFrom + k)),
    )
    if (my !== seq) return // 过期响应：丢弃
    timer = 0

    const windowStart = segFrom * SEG
    const rows = list.flat()
    // 原子回填：先 data 后 window-start（组件按 window-start + data 索引渲染）
    el.setAttribute('data', JSON.stringify(rows))
    el.setAttribute('window-start', String(windowStart))
    renderLog(windowStart, rows)
  }

  el.addEventListener('oas-window-request', (event) => {
    const { start, end } = event.detail
    load(start, end)
  })

  // 页面首次进入：组件已挂载，主动装一屏（等价于捕获 init）
  load(0, SEG)
})
</script>

## 各组件差异

| 组件 | windowed 语义 | 额外前提 |
| --- | --- | --- |
| `oas-table` | 行切片；`total` 复用为全量行数 | `height`；切片扁平行；本地排序/筛选/分组/分页交宿主 |
| `oas-gantt` | 行切片 | `height`；切片须扁平行；`range-start`/`range-end` 托管时间轴；`auto-schedule`/关键路径/行重排跳过 |
| `oas-resource` | 资源行切片 | `height`；`range-start`/`range-end` 托管时间轴；负载统计仅覆盖已装载切片 |
| `oas-tree` | **根节点**切片（子节点随根携带） | `height`；本地 `filter`/`check-all` 跳过；回填建议「扩窗累积」 |
| `oas-list` | 行切片 | `height` 或可测 `max-height`；列表语义由组件自持（宿主无需 `role`） |

gantt / resource 在可视时间窗接近轴端时还会派发 `oas-range-request`（`detail: { startMs, endMs, reason }`），用于扩展时间范围——同样遵循「只保留最新 + 合并」原则。

## 常见坑

- **回填不足期望区间**：宿主只回一小片 → 组件继续请求。请返回覆盖 `[start, end)` 的段（或超集）。
- **整体替换数据**：编辑回写（`oas-tasks-change`）只含切片；整体替换会丢未装载行。
- **忘记 `window-start`**：数据与绝对行号错位（渲染到错误行、a11y 行号错误）。
- **在事件回调里同步写其它属性**（如 `loading`）：会重入 update（渲染中途 `scrollTop` 可能瞬时归零，并多发请求）。请在取数完成后再回填；确需 loading 等状态，放到微任务或取数完成后再写。
- **逐窗口取数**：请求数会随滚动线性增长；按段取数可降一个数量级。
- **无 `height`**：组件不会派发请求（无滚动视口），不是 bug，是需要先给视口。

## 相关

- 组件契约：[表格](/components/table) · [甘特](/components/gantt) · [资源](/components/resource) · [树](/components/tree) · [列表](/components/list)
