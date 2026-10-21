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

onMounted(async () => {
  // Components are registered by the theme via dynamic import: wait for custom element definitions before writing properties to an unupgraded element (an own property would shadow the setter and lose data)
  await Promise.all([
    customElements.whenDefined('oas-table'),
    customElements.whenDefined('oas-gantt'),
    customElements.whenDefined('oas-resource'),
  ])
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

  // ===== gantt windowed: segmented rows + host-managed axis (range-*) + range requests =====
  const setupGantt = () => {
    const g = document.getElementById('guide-windowed-gantt')
    const gLog = document.getElementById('guide-windowed-gantt-log')
    if (!g || !gLog) return
    const TOTAL = 8000
    const SEG = 200
    const DAY = 86400000
    const segments = new Map()
    let gSeq = 0
    let axisStart = '2026-01-01'
    let axisEnd = '2026-09-30'
    const stats = { rows: 0, ranges: 0 }
    const pad = (n) => String(n).padStart(2, '0')
    const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    const parse = (s) => {
      const [y, m, d] = s.split('-').map(Number)
      return new Date(y, m - 1, d)
    }
    const makeTask = (i) => {
      const start = new Date(2026, 0, 1 + ((i * 7) % 355))
      return {
        id: `g${i}`,
        name: `Task ${i + 1}`,
        start: iso(start),
        end: iso(new Date(start.getTime() + (2 + (i % 6)) * DAY)),
        progress: (i * 13) % 100,
      }
    }
    const fetchSegment = (seg) =>
      new Promise((resolve) => {
        const cached = segments.get(seg)
        if (cached) return resolve(cached)
        setTimeout(() => {
          const from = seg * SEG
          const rows = Array.from({ length: Math.max(0, Math.min(SEG, TOTAL - from)) }, (_, k) => makeTask(from + k))
          segments.set(seg, rows)
          resolve(rows)
        }, LATENCY)
      })
    const render = () => {
      const ws = Number(g.getAttribute('window-start') ?? 0)
      gLog.textContent = `Row requests ${stats.rows} · range requests ${stats.ranges} · axis ${axisStart} ~ ${axisEnd} · slice start ${ws} · loaded ${g.tasks.length} rows (total ${TOTAL})`
    }
    const load = async (start, end) => {
      stats.rows++
      const my = ++gSeq
      const segFrom = Math.floor(start / SEG)
      const segTo = Math.floor((Math.max(start, end - 1)) / SEG)
      const list = await Promise.all(
        Array.from({ length: segTo - segFrom + 1 }, (_, k) => fetchSegment(segFrom + k)),
      )
      if (my !== gSeq) return
      g.tasks = list.flat()
      g.setAttribute('window-start', String(segFrom * SEG))
      render()
    }
    g.addEventListener('oas-window-request', (e) => load(e.detail.start, e.detail.end))
    g.addEventListener('oas-range-request', (e) => {
      // Extend only when the right edge is exceeded; ignore left overflow (extending left loops at scrollLeft=0)
      const needEnd = e.detail.endMs
      if (needEnd <= parse(axisEnd).getTime()) return
      stats.ranges++
      axisEnd = iso(new Date(needEnd))
      // Defer the write: never re-enter update synchronously from the handler
      queueMicrotask(() => {
        g.setAttribute('range-start', axisStart)
        g.setAttribute('range-end', axisEnd)
        render()
      })
    })
    g.setAttribute('range-start', axisStart)
    g.setAttribute('range-end', axisEnd)
    load(0, SEG)
  }

  // ===== resource windowed: segmented resource rows + host-managed axis + range requests =====
  const setupResource = () => {
    const r = document.getElementById('guide-windowed-resource')
    const rLog = document.getElementById('guide-windowed-resource-log')
    if (!r || !rLog) return
    const TOTAL = 400
    const SEG = 50
    const DAY = 86400000
    const segments = new Map()
    let rSeq = 0
    let axisStart = '2026-01-01'
    let axisEnd = '2026-06-30'
    const stats = { rows: 0, ranges: 0 }
    const pad = (n) => String(n).padStart(2, '0')
    const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    const parse = (s) => {
      const [y, m, d] = s.split('-').map(Number)
      return new Date(y, m - 1, d)
    }
    const makeResource = (i) => ({ id: `r${i}`, name: `Resource ${i + 1}`, capacity: 1 + (i % 2) })
    const makeTasks = (res) => {
      const base = Number(res.id.slice(1))
      return Array.from({ length: 2 }, (_, k) => {
        const start = new Date(2026, 0, 1 + ((base * 11 + k * 47) % 170))
        return {
          id: `${res.id}-${k}`,
          name: `${res.name} · task ${k + 1}`,
          start: iso(start),
          end: iso(new Date(start.getTime() + (2 + (k % 4)) * DAY)),
          resources: [res.id],
        }
      })
    }
    const fetchSegment = (seg) =>
      new Promise((resolve) => {
        const cached = segments.get(seg)
        if (cached) return resolve(cached)
        setTimeout(() => {
          const from = seg * SEG
          const rows = Array.from({ length: Math.max(0, Math.min(SEG, TOTAL - from)) }, (_, k) =>
            makeResource(from + k),
          )
          segments.set(seg, rows)
          resolve(rows)
        }, LATENCY)
      })
    const render = () => {
      const ws = Number(r.getAttribute('window-start') ?? 0)
      rLog.textContent = `Row requests ${stats.rows} · range requests ${stats.ranges} · axis ${axisStart} ~ ${axisEnd} · slice start ${ws} · resources ${r.resources.length} · tasks ${r.tasks.length} (total ${TOTAL} resources)`
    }
    const load = async (start, end) => {
      stats.rows++
      const my = ++rSeq
      const segFrom = Math.floor(start / SEG)
      const segTo = Math.floor((Math.max(start, end - 1)) / SEG)
      const list = await Promise.all(
        Array.from({ length: segTo - segFrom + 1 }, (_, k) => fetchSegment(segFrom + k)),
      )
      if (my !== rSeq) return
      const resources = list.flat()
      r.resources = resources
      r.tasks = resources.flatMap(makeTasks)
      r.setAttribute('window-start', String(segFrom * SEG))
      render()
    }
    r.addEventListener('oas-window-request', (e) => load(e.detail.start, e.detail.end))
    r.addEventListener('oas-range-request', (e) => {
      // Extend only when the right edge is exceeded; ignore left overflow (extending left loops at scrollLeft=0)
      const needEnd = e.detail.endMs
      if (needEnd <= parse(axisEnd).getTime()) return
      stats.ranges++
      axisEnd = iso(new Date(needEnd))
      queueMicrotask(() => {
        r.setAttribute('range-start', axisStart)
        r.setAttribute('range-end', axisEnd)
        render()
      })
    })
    r.setAttribute('range-start', axisStart)
    r.setAttribute('range-end', axisEnd)
    load(0, SEG)
  }

  // First paint: the component is already mounted, load one screen (equivalent to catching init)
  load(0, SEG)
  setupGantt()
  setupResource()
})
</script>

## Gantt / Resource windowed (host-managed axis)

Beyond row windows, timeline components support a **host-managed axis** via `range-start` / `range-end`; when the visible time window approaches an axis edge, `oas-range-request` is emitted so the host can extend the range. The two demos below show "segmented rows + extend the axis on demand".

### Gantt (8000 tasks / 1-year axis / segments of 200)

<DemoBlock title="gantt windowed + auto-extend the axis at the edge">
  <div style="width: 100%">
    <oas-gantt
      id="guide-windowed-gantt"
      windowed
      total="8000"
      window-start="0"
      range-start="2026-01-01"
      range-end="2026-09-30"
      height="280"
      scale="week"
    ></oas-gantt>
    <p id="guide-windowed-gantt-log" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin-top: var(--oas-space-2)">
      Waiting for the first window request…
    </p>
  </div>
</DemoBlock>

### Resource (400 resources / half-year axis / segments of 50)

<DemoBlock title="resource windowed + auto-extend the axis at the edge">
  <div style="width: 100%">
    <oas-resource
      id="guide-windowed-resource"
      windowed
      total="400"
      window-start="0"
      range-start="2026-01-01"
      range-end="2026-06-30"
      height="300"
      scale="week"
    ></oas-resource>
    <p id="guide-windowed-resource-log" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin-top: var(--oas-space-2)">
      Waiting for the first window request…
    </p>
  </div>
</DemoBlock>

## React / Vue host wrappers

Custom-element bridging notes: Vue needs `isCustomElement: (tag) => tag.startsWith('oas-')` in the compiler options; React 19+ supports custom elements natively (below 19, use a ref + `addEventListener`). **Do not write attributes synchronously inside the event handler** (it re-enters update) — refill after the fetch resolves.

### React

```tsx
import { useEffect, useRef } from 'react'

const SEG = 200

export function WindowedTable({ total }: { total: number }) {
  const ref = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let seq = 0
    let controller: AbortController | null = null

    const onRequest = async (event: Event) => {
      const { start, end } = (event as CustomEvent<{ start: number; end: number }>).detail
      const my = ++seq
      controller?.abort()
      controller = new AbortController()
      const from = Math.floor(start / SEG) * SEG
      const to = Math.min(total, from + SEG)
      const rows = await fetch(`/api/rows?from=${from}&to=${to}`, { signal: controller.signal })
        .then((r) => r.json())
        .catch(() => null)
      if (!rows || my !== seq) return
      el.setAttribute('data', JSON.stringify(rows))
      el.setAttribute('window-start', String(from))
    }

    el.addEventListener('oas-window-request', onRequest)
    return () => {
      controller?.abort()
      el.removeEventListener('oas-window-request', onRequest)
    }
  }, [total])

  return (
    <oas-table
      ref={ref}
      windowed=""
      total={String(total)}
      window-start="0"
      height="320"
      row-key="id"
      columns={JSON.stringify([{ key: 'id', title: 'ID' }, { key: 'name', title: 'Name' }])}
    />
  )
}
```

> TypeScript needs JSX intrinsic-element augmentation for custom elements (or `// @ts-expect-error` on the tag).

### Vue 3

```vue
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

const SEG = 200
const table = ref<HTMLElement | null>(null)
let seq = 0
let controller: AbortController | null = null

async function onWindowRequest(event: Event) {
  const el = table.value
  if (!el) return
  const { start, end } = (event as CustomEvent<{ start: number; end: number }>).detail
  const my = ++seq
  controller?.abort()
  controller = new AbortController()
  const from = Math.floor(start / SEG) * SEG
  const to = Math.min(50000, from + SEG)
  const rows = await fetch(`/api/rows?from=${from}&to=${to}`, { signal: controller.signal })
    .then((r) => r.json())
    .catch(() => null)
  if (!rows || my !== seq) return
  el.setAttribute('data', JSON.stringify(rows))
  el.setAttribute('window-start', String(from))
}

onMounted(() => table.value?.addEventListener('oas-window-request', onWindowRequest))
onBeforeUnmount(() => {
  controller?.abort()
  table.value?.removeEventListener('oas-window-request', onWindowRequest)
})
</script>

<template>
  <oas-table
    ref="table"
    windowed
    total="50000"
    window-start="0"
    height="320"
    row-key="id"
    :columns="JSON.stringify([{ key: 'id', title: 'ID' }, { key: 'name', title: 'Name' }])"
  />
</template>
```

> In templates you can also write `@oas-window-request="onWindowRequest"` (Vue 3 forwards `oas-window-request` as a custom event).

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
- **Property writes before upgrade**: before assigning properties such as `el.tasks` / `el.resources` from page scripts, `await customElements.whenDefined('oas-gantt')` (or the matching tag) — on an unupgraded element the property becomes a plain own field that shadows the upgraded setter, silently losing data (the demos on this page already do this; the attribute channel avoids the issue).

## See also

- Component contracts: [Table](/en/components/table) · [Gantt](/en/components/gantt) · [Resource](/en/components/resource) · [Tree](/en/components/tree) · [List](/en/components/list)
