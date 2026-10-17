# Server-side windowed data (recipe)

> For hundreds of thousands of rows: **the component only computes which slice it needs; fetching, cancelling and merging are the host's job**. This page gives a four-step recipe plus a runnable example (`oas-table` demoed; gantt / resource / tree / list share the contract — differences below).

## Contract

- Attributes: `windowed` (enable) + `total` (full row count) + `window-start` (absolute row index of `data[0]`); `data` carries only `[window-start, window-start + data.length)`.
- Event: `oas-window-request` with `detail: { start, end, reason }` (half-open, absolute row indices; `reason` = `init` / `scroll` / `resize` / `data`). **The same expected window is never emitted twice**; it resets after the window is covered.
- Prerequisite: a measurable scroll viewport (`height` or a measurable `max-height`); otherwise no request is emitted (one `devWarn`). A windowed table slice must be **flat** (children are not recursed).

## Four steps

1. **Fetch by segment**: align requests to fixed segments (e.g. 200 rows) so one response covers many windows — typically an order of magnitude fewer requests.
2. **Keep only the latest**: abort in-flight fetches (`AbortController`) or drop stale responses with a request sequence number; otherwise an old response arriving late makes the view jump back.
3. **Merge by id into the full dataset**: edits/`oas-tasks-change` carry only the slice; the host must merge by id and **never replace** the full dataset wholesale.
4. **Refill atomically**: write `data` first, then `window-start` (within the same synchronous step) to avoid a "new slice + old start" intermediate state.

```ts
// Real project: segment fetch + latest-only + atomic refill
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
  if (my !== seq) return // stale response, drop it

  el.setAttribute('window-start', String(from))
  el.setAttribute('data', JSON.stringify(rows))
})
```

## Runnable example (local mock server)

The demo simulates a server with local data: 200 rows per segment, 120ms latency, per-segment cache and latest-only. Scroll the table and watch the counters — **scrolling within a loaded segment issues no new request** (one response covers many windows).

<DemoBlock title="windowed + segment cache + latest-only (mock 50k rows)">
  <div style="width: 100%">
    <oas-table
      id="guide-windowed-demo"
      windowed
      total="50000"
      window-start="0"
      height="320"
      row-key="id"
      columns='[{"key":"id","title":"ID","width":"90px"},{"key":"name","title":"Name","width":"200px"},{"key":"owner","title":"Owner","width":"120px"},{"key":"status","title":"Status","width":"120px"}]'
    ></oas-table>
    <p id="guide-windowed-demo-log" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin-top: var(--oas-space-2)">
      Waiting for the first window request…
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
  const segments = new Map() // segment index → rows (mock server cache)
  const stats = { requests: 0, cacheHits: 0, stale: 0 }
  let seq = 0
  let timer = 0

  const makeRow = (i) => ({
    id: i,
    name: `Task ${i + 1}`,
    owner: ['Alice', 'Bob', 'Carol', 'Dave'][i % 4],
    status: ['Todo', 'Doing', 'Done'][i % 3],
  })

  // Mock server: per-segment fetch with latency; cached segments resolve immediately
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
    log.textContent = `Requests ${stats.requests} · segment cache hits ${stats.cacheHits} · stale dropped ${stats.stale} · window [${windowStart}, ${windowStart + rows.length}) · loaded ${rows.length} rows (total ${TOTAL})`
  }

  const load = async (start, end) => {
    stats.requests++
    const my = ++seq
    if (timer) {
      clearTimeout(timer)
      stats.stale++ // simulates aborting in-flight requests
    }

    const segFrom = Math.floor(start / SEG)
    const segTo = Math.floor((Math.max(start, end - 1)) / SEG)
    const list = await Promise.all(
      Array.from({ length: segTo - segFrom + 1 }, (_, k) => fetchSegment(segFrom + k)),
    )
    if (my !== seq) return // stale response: drop
    timer = 0

    const windowStart = segFrom * SEG
    const rows = list.flat()
    // Atomic refill: data first, then window-start (the component indexes by window-start + data)
    el.setAttribute('data', JSON.stringify(rows))
    el.setAttribute('window-start', String(windowStart))
    renderLog(windowStart, rows)
  }

  el.addEventListener('oas-window-request', (event) => {
    const { start, end } = event.detail
    load(start, end)
  })

  // First paint: the component is already mounted, load one screen (equivalent to catching init)
  load(0, SEG)
})
</script>

## Component differences

| Component | windowed semantics | Extra prerequisites |
| --- | --- | --- |
| `oas-table` | row slice; `total` reused as the full row count | `height`; flat slice; local sort/filter/group/pagination are the host's job |
| `oas-gantt` | row slice | `height`; flat slice; `range-start`/`range-end` for a host-managed axis; `auto-schedule`/critical path/row reorder skipped |
| `oas-resource` | resource-row slice | `height`; `range-start`/`range-end` for a host-managed axis; load stats cover the loaded slice only |
| `oas-tree` | **root-node** slice (children travel with the root) | `height`; local `filter`/`check-all` skipped; refill by widening |
| `oas-list` | row slice | `height` or a measurable `max-height`; list semantics are owned by the component (no host `role` needed) |

gantt / resource also emit `oas-range-request` (`detail: { startMs, endMs, reason }`) when the visible time window approaches an axis edge — follow the same "latest-only + merge" rules.

## Common pitfalls

- **Refilling less than the expected window**: the component keeps requesting. Return a segment covering `[start, end)` (or a superset).
- **Replacing the whole dataset**: edit write-backs (`oas-tasks-change`) contain only the slice; a wholesale replace loses unloaded rows.
- **Forgetting `window-start`**: data and absolute indices drift (wrong rows rendered, wrong ARIA indices).
- **Writing other attributes synchronously in the handler** (e.g. `loading`): re-enters update (scrollTop may be transiently clamped to 0 mid-render, causing extra requests). Refill after fetching; if you need a loading state, set it in a microtask or after the fetch resolves.
- **Fetching per window**: request count grows linearly with scrolling; segment fetching cuts it by an order of magnitude.
- **No `height`**: no requests are emitted (no scroll viewport) — not a bug, the viewport must exist first.

## See also

- Component contracts: [Table](/en/components/table) · [Gantt](/en/components/gantt) · [Resource](/en/components/resource) · [Tree](/en/components/tree) · [List](/en/components/list)
