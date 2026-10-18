# Resource Load

Resource load / swimlane view (new component, data family): given **resources** and **tasks** (tasks carrying assigned resources), it renders **resource swimlanes** (one row per resource, showing its assigned task bars on a shared timeline) and a **load histogram** (parallel task count per period by scale, highlighting overload above capacity). It is a pure view layer — no scheduling/leveling engine; leveling is exported as a pure function `levelResources()`, and the host decides whether to write back.

## Basic Usage

<DemoBlock title="Resource swimlanes + load histogram: resources (with capacity) + tasks (with resources assignment)">
  <oas-resource id="res-basic" scale="day" height="320" capacity="1"
    resources='[{"id":"zhang","name":"Alice","capacity":1},{"id":"li","name":"Bob","capacity":1},{"id":"wang","name":"Cara","capacity":2}]'
    tasks='[{"id":"t1","name":"Requirement review","start":"2026-03-02","end":"2026-03-03","resources":["zhang","li"]},{"id":"t2","name":"API design","start":"2026-03-03","end":"2026-03-05","resources":["zhang"]},{"id":"t3","name":"Backend","start":"2026-03-04","end":"2026-03-08","resources":["li"]},{"id":"t4","name":"Frontend","start":"2026-03-04","end":"2026-03-08","resources":["wang"]},{"id":"t5","name":"Integration test","start":"2026-03-09","end":"2026-03-11","resources":["li","wang"]},{"id":"t6","name":"Docs","start":"2026-03-02","end":"2026-03-04","resources":["wang"]}]'></oas-resource>
  <div id="res-basic-output" style="color:var(--oas-color-text-secondary);font-size:var(--oas-font-size-sm);margin-top:var(--oas-space-2)"></div>
</DemoBlock>

- `resources`: `[{ id, name, capacity? }]`; `capacity` = parallel tasks **per period** (per day in the `day` scale; falls back to the `capacity` attribute, ultimately 1).
- `tasks`: `[{ id, name, start, end, resources?: string[] }]` — `start/end` are `YYYY-MM-DD` (**day precision only**, inclusive `end`; time-bearing input is treated as that day); `resources` is the assigned resource id array; assignments pointing to unknown resources are ignored.
- `scale`: `day` (default) / `week` / `month` — controls the histogram period granularity and axis labels.
- Swimlanes and histogram **share column width and horizontal scroll**; overload bars get `.over` (color via `--oas-color-danger`); overlapping task bars within a resource are **stacked in sub-rows** (no mutual occlusion, clicking a bar hits that bar).
- The lane-gap token `--oas-resource-lane-gap` is derived from row height and bar height (`--oas-resource-row-height` participates; a multi-segment track's real height = segments × bar height + (segments + 1) × gap). The token is declared on the component host element: only **element-level** overrides take effect — inline style or a class rule hitting the host element (e2e-verified: a host class setting `--oas-resource-lane-gap:4px` → single-segment track height 36 → 28); `:root` / ancestor-level declarations do not (the host already declares its own value, so the inherited value is overridden).

## Overload & Leveling

<DemoBlock title="Detect overload (oas-overload) → one-click leveling: levelResources() keeps durations and shifts later tasks in overloaded periods; the host writes tasks back">
  <oas-button id="res-level-btn" size="small">Level resources</oas-button>
  <oas-resource id="res-level" scale="day" height="320"></oas-resource>
  <div id="res-level-output" style="color:var(--oas-color-text-secondary);font-size:var(--oas-font-size-sm);margin-top:var(--oas-space-2)"></div>
</DemoBlock>

Leveling is a **host decision**: the component only exports a pure function

```ts
import { levelResources } from '@oas-ui/ui'

const moved = levelResources(resources, tasks, { scale: 'day' })
// moved = the shifted tasks (new dates); merge by id and write back
el.tasks = tasks.map((t) => moved.find((m) => m.id === t.id) ?? t)
```

`levelResources` guarantees: each task keeps its duration, later-only shifts, deterministic (same input → same output), iterates until no overload or `maxIter`; it does **not** mutate the input. The component never calls it automatically.

> In `week` scale the step is one week period, but the pure function has no locale context (week start defaults to Monday); for tasks crossing week boundaries pass `{ weekStart: <matching the page locale> }` (0=Sunday … 6=Saturday) explicitly to avoid a boundary mismatch with the histogram's week granularity.

## Readability (opt-in switches)

<DemoBlock title="Readability switches (opt-in): load values on pillars (show-load-values) + overload badge (show-overload-badge) + bar labels (bar-label)">
  <oas-resource id="res-readable" scale="day" height="420" capacity="1" show-load-values show-overload-badge bar-label header-sticky
    resources='[{"id":"zhang","name":"Alice","capacity":1},{"id":"li","name":"Bob","capacity":1},{"id":"wang","name":"Cara","capacity":2}]'
    tasks='[{"id":"t1","name":"Requirement review","start":"2026-03-02","end":"2026-03-03","resources":["zhang","li"]},{"id":"t2","name":"API design","start":"2026-03-03","end":"2026-03-05","resources":["zhang"]},{"id":"t3","name":"Backend","start":"2026-03-04","end":"2026-03-08","resources":["li"]},{"id":"t4","name":"Frontend","start":"2026-03-04","end":"2026-03-08","resources":["wang"]},{"id":"t5","name":"Integration test","start":"2026-03-09","end":"2026-03-11","resources":["li","wang"]},{"id":"t6","name":"Docs","start":"2026-03-02","end":"2026-03-04","resources":["wang"]}]'></oas-resource>
  <div id="res-readable-output" style="color:var(--oas-color-text-secondary);font-size:var(--oas-font-size-sm);margin-top:var(--oas-space-2)">All three switches on: pillar tops show the parallel task count per period (overloaded in red); Alice's row header shows an "Overloaded 1 period" badge; task bars show their names.</div>
</DemoBlock>

All three readability capabilities are **opt-in** (off by default, zero extra nodes): `show-load-values` displays the parallel task count on top of every load > 0 pillar (decorative numbers, `aria-hidden`; overloaded pillars get `.over` using `--oas-color-danger`); `show-overload-badge` shows an "Overloaded N periods" badge on the swimlane row header of overloaded resources (visible information, not `aria-hidden`, copy follows the global locale instantly); `bar-label` shows the task name inside the bar (rendered as plain text against injection, single-line clipped on narrow bars; does not affect aria-label or click hit-testing).

## Localization & Scrolling

<DemoBlock title="locale=&quot;en-US&quot; (Sunday-based) + scale=&quot;week&quot;: labels and week start follow en-US; scrollToDate scrolls the timeline to a given date">
  <oas-button id="res-scroll-btn" size="small">Scroll to 03-15</oas-button>
  <oas-resource id="res-locale" locale="en-US" scale="week" height="240" capacity="2"
    resources='[{"id":"zhang","name":"Alice","capacity":1},{"id":"li","name":"Bob","capacity":2}]'
    tasks='[{"id":"w1","name":"Iteration 1","start":"2026-03-01","end":"2026-03-06","resources":["zhang"]},{"id":"w2","name":"Iteration 2","start":"2026-03-04","end":"2026-03-12","resources":["zhang","li"]},{"id":"w3","name":"Iteration 3","start":"2026-03-10","end":"2026-03-18","resources":["li"]}]'></oas-resource>
  <div id="res-locale-output" style="color:var(--oas-color-text-secondary);font-size:var(--oas-font-size-sm);margin-top:var(--oas-space-2)"></div>
</DemoBlock>

Instance method **`scrollToDate(date)`**: horizontally scrolls the timeline to the given date (`YYYY-MM-DD`, centered in the viewport, minus the sticky resource name column width). Invalid dates / no data are no-ops; RTL layouts use the negative `scrollLeft` model (same as gantt).

## Server-side row window (windowed)

> For thousands of resources / hundreds of thousands of tasks: the host supplies only the resource-row slice near the visible window and the component **holds no full dataset**. The row window is computed from the scroll position and, when not covered by the loaded range, `oas-window-request` is emitted; the host refills and rows render by **absolute row index**.

Attributes: `windowed` (enable) + `total` (full resource row count) + `window-start` (absolute row index of the slice's first row) + `range-start` / `range-end` (host-managed time-axis extent, ISO dates, `range-end` inclusive). Events:

- `oas-window-request`: `detail: { start, end, reason }` (half-open, absolute row indices); the same expected window is not emitted twice.
- `oas-range-request`: emitted when the visible time window approaches an axis edge; `detail: { startMs, endMs, reason }`.

```html
<oas-resource windowed total="5000" window-start="0" range-start="2026-01-01" range-end="2026-12-31"
  scale="day" height="360"></oas-resource>
<script>
  const el = document.querySelector('oas-resource[windowed]')
  el.addEventListener('oas-window-request', (e) => {
    const { start, end } = e.detail
    el.setAttribute('window-start', String(start))
    el.setAttribute('resources', JSON.stringify(fetchResources(start, end))) // fetch from your backend
  })
</script>
```

Conventions in windowed mode: load/overload stats cover **the loaded slice only** (full-dataset stats are the host's job) with a devWarn; without `range-start` / `range-end` the time axis falls back to deriving from loaded tasks with a devWarn; `oas-tasks-change` carries only the slice in `detail.tasks` — the host must **merge by id** into the full dataset, never replace it wholesale.

> For the full host recipe (segment fetch, abort in-flight, merge by id, atomic refill) and a runnable example, see [Server-side windowed data](/en/guide/windowed-data).

## API

### oas-resource

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `bar-label` | Show the task name inside the bar (boolean, off by default): single line with ellipsis, clipped on narrow bars; aria-label and click/drag hit-testing are unchanged | `boolean` | — |
| `capacity` | Default capacity when a resource declares none (default 1) | `string` | `1` |
| `header-sticky` | Lane header sticks to the top while scrolling lanes (on by default): week/day ticks stay visible; `header-sticky="false"` disables it (the header scrolls with content). The corner name column always stays pinned on horizontal scroll (LTR/RTL) | — | — |
| `height` | Component height in px (default 320; accepts a plain number or Npx): mapped to the custom property --oas-resource-height (the host's own inline height always wins and is never overwritten by the component). While the height attribute is present and valid (>0 plain number or Npx) the component takes over this variable — writing it inline on the host and overriding any --oas-resource-height the host set itself; an empty/whitespace value is treated as unset; an invalid value writes nothing and only clears a value this instance wrote earlier, so a host token is never affected; after the attribute is removed the component-written value is cleared to zero, so the height falls back to the token default (320) or host CSS, and the host's previous inline value is not restored; when the height attribute was never set the component never writes the variable, and a --oas-resource-height set by the host (inline or via class rules) is left completely untouched | `string` | `320` |
| `locale` | Localization (overrides config-provider injection and global locale) | `string` | — |
| `range-end` | Host-managed time-axis end (ISO date YYYY-MM-DD, inclusive); pair with range-start. If only one is given, reversed or invalid, the axis is not host-managed and a devWarn is emitted | `string` | — |
| `range-start` | Host-managed time-axis start (ISO date YYYY-MM-DD): when provided the period range is no longer derived from loaded tasks | `string` | — |
| `resources` | Resources (JSON [{ id, name, capacity? }]) — capacity = parallel tasks per period for that resource (per day in the day scale; falls back to the capacity attribute, ultimately 1); a resource may carry an optional `color` (CSS color or token, e.g. `var(--oas-color-success)`) used to tint its lane bars and load bars; when absent the unified `--oas-resource-bar-bg` / `--oas-resource-load-bg` applies | `ResourceItem[]` | `[]` |
| `scale` | Histogram period granularity and axis labels: day (default) / week / month; invalid falls back to day | `string` | — |
| `show-load-values` | Show the load value above each histogram bar (boolean, off by default): only for load > 0; overload values use text-on-primary (white in light / dark in dark) for contrast on the danger bar. The number is visual redundancy (aria-hidden); screen readers still get the column load description | `boolean` | — |
| `show-overload-badge` | Show an "Overloaded ×N" badge in the lane header (boolean, off by default): only for resources with overloaded periods; text comes from the i18n key resource.overBadge | `boolean` | — |
| `tasks` | Resource tasks (JSON [{ id, name, start, end, resources? }]); start/end are day precision YYYY-MM-DD only (end inclusive; time-bearing input is treated as that day), resources is the assigned resource id array (assignments to unknown resources are ignored) | `ResourceTask[]` | `[]` |
| `total` | Full resource row count in windowed mode; 0 or invalid disables windowed (falls back to local mode) | `string` | — |
| `window-start` | Absolute row index (within the full dataset) of the first row (resource) in the slice (windowed mode) | `string` | `0` |
| `windowed` | Server-side row-window mode (boolean, off by default): with total / window-start the host supplies only the visible window slice (rendered by absolute row index); when the expected row window is not covered, oas-window-request is emitted for the host to refill. Load/overload stats cover the loaded slice only (full-dataset stats are the host's job) with a devWarn; when range-start / range-end are absent the time axis falls back to deriving from loaded tasks with a devWarn. Non-windowed behavior unchanged | `boolean` | — |

#### Property (JS property; see each row for attribute reflection)

| Property | Description | Type | Default |
| --- | --- | --- | --- |
| `resources` | Resources (reads a copy: nested plain objects/arrays are deep-cloned — cycle-safe; shared references stay shared within a single read result; Date is copied by value (not kept shared); exotic objects such as class instances/Set are shared by reference; writing syncs the attribute + re-renders; unserializable custom keys are dropped individually from the attribute, the property read-back keeps the full data); a resource may carry an optional `color` (CSS color or token, e.g. `var(--oas-color-success)`) used to tint its lane bars and load bars; when absent the unified `--oas-resource-bar-bg` / `--oas-resource-load-bg` applies | `ResourceItem[]` | `[]` |
| `tasks` | Resource tasks (reads a copy: nested plain objects/arrays are deep-cloned — cycle-safe; shared references stay shared within a single read result; Date is copied by value (not kept shared); exotic objects such as class instances/Set are shared by reference; writing syncs the attribute + re-renders + dispatches oas-tasks-change; unserializable custom keys are dropped individually from the attribute, the property read-back keeps the full data) | `ResourceTask[]` | `[]` |

#### Events

| Event | Description |
| --- | --- |
| `oas-overload` | Dispatched when the overload state changes (at most once per update; the same overload state is not re-dispatched), detail: { overloads: [{ resourceId, period, load, capacity }] } (period is the period start date); not dispatched when there is no overload |
| `oas-range-request` | Emitted when the time axis is host-managed (range-start/range-end) and the visible time window approaches an axis edge; detail: { startMs, endMs, reason } (the neighbouring range requested). The same expected range is not emitted twice |
| `oas-task-click` | Dispatched when a task bar in a resource swimlane is clicked, detail: { id, task, resourceId } |
| `oas-tasks-change` | Emitted when the tasks property is written programmatically; detail: { tasks }. **In windowed mode detail.tasks is only the loaded slice**: the host must merge by id into the full dataset and must not replace it wholesale |
| `oas-window-request` | Emitted in windowed mode when the expected row window is not covered by the loaded range; detail: { start, end, reason } (half-open, absolute row indices; reason is init / scroll / resize / data). The same expected window is not emitted twice |

#### CSS Variables

| CSS Variable | Default |
| --- | --- |
| `--oas-resource-bar-bg` | `color-mix(in srgb, var(--oas-color-primary) 22%, var(--oas-color-bg))` |
| `--oas-resource-bar-height` | `20px` |
| `--oas-resource-bar-hover-bg` | `color-mix(in srgb, var(--oas-color-primary) 34%, var(--oas-color-bg))` |
| `--oas-resource-header-bg` | `var(--oas-color-bg)` |
| `--oas-resource-header-height` | `32px` |
| `--oas-resource-height` | `320px` |
| `--oas-resource-lane-gap` | `max( 0px, (var(--oas-resource-row-height, 36px) - var(--oas-resource-bar-height, 20px)) / 2 )` |
| `--oas-resource-load-bg` | `color-mix(in srgb, var(--oas-color-primary) 45%, var(--oas-color-bg))` |
| `--oas-resource-load-height` | `64px` |
| `--oas-resource-load-over-bg` | `var(--oas-color-danger)` |
| `--oas-resource-name-width` | `160px` |
| `--oas-resource-row-height` | `36px` |

<script setup>
import { onMounted } from 'vue'

onMounted(async () => {
  await customElements.whenDefined('oas-resource')

  const basic = document.getElementById('res-basic')
  const bout = document.getElementById('res-basic-output')
  if (basic && bout) {
    basic.addEventListener('oas-overload', (e) => {
      const n = e.detail.overloads.length
      bout.textContent = n ? `Overloaded periods: ${n} (red bars)` : 'No resource overload'
    })
    basic.addEventListener('oas-task-click', (e) => {
      bout.textContent = `Clicked: ${e.detail.task.name} (resource ${e.detail.resourceId})`
    })
    // Reflect the initial overload state from the DOM right after mount (the upgrade already fired oas-overload,
    // so a listener attached afterwards would miss it)
    const initialOver = basic.shadowRoot?.querySelectorAll('.pillar.over').length ?? 0
    bout.textContent = initialOver ? `Overloaded periods: ${initialOver} (red bars)` : 'No resource overload'
  }

  const resources = [
    { id: 'zhang', name: 'Alice', capacity: 1 },
    { id: 'li', name: 'Bob', capacity: 1 },
    { id: 'wang', name: 'Cara', capacity: 2 },
  ]
  let tasks = [
    { id: 't1', name: 'Requirement review', start: '2026-03-02', end: '2026-03-03', resources: ['zhang', 'li'] },
    { id: 't2', name: 'API design', start: '2026-03-03', end: '2026-03-05', resources: ['zhang'] },
    { id: 't3', name: 'Backend', start: '2026-03-04', end: '2026-03-08', resources: ['li'] },
    { id: 't4', name: 'Frontend', start: '2026-03-04', end: '2026-03-08', resources: ['wang'] },
    { id: 't5', name: 'Integration test', start: '2026-03-09', end: '2026-03-11', resources: ['li', 'wang'] },
    { id: 't6', name: 'Docs', start: '2026-03-02', end: '2026-03-04', resources: ['wang'] },
  ]
  const el = document.getElementById('res-level')
  const out = document.getElementById('res-level-output')
  if (el && out) {
    el.resources = resources
    el.tasks = tasks
    el.addEventListener('oas-overload', (e) => {
      out.textContent = e.detail.overloads.length ? `Overloaded: ${e.detail.overloads.length}` : 'No overload'
    })
    el.addEventListener('oas-task-click', (e) => {
      out.textContent = `Clicked: ${e.detail.task.name} (resource ${e.detail.resourceId})`
    })
    // Initial feedback: oas-overload already fired on mount, reflect it from the DOM once
    const initialOver = el.shadowRoot?.querySelectorAll('.pillar.over').length ?? 0
    out.textContent = initialOver ? `Overloaded: ${initialOver}` : 'No overload'
    document.getElementById('res-level-btn')?.addEventListener('click', async () => {
      for (let i = 0; i < 100 && typeof window.levelResources !== 'function'; i++) {
        await new Promise((r) => setTimeout(r, 50))
      }
      if (typeof window.levelResources !== 'function') {
        out.textContent = '(levelResources not ready yet, please retry)'
        return
      }
      const moved = window.levelResources(resources, tasks, { scale: 'day' })
      if (moved.length === 0) {
        out.textContent = 'Nothing to level (no overload)'
        return
      }
      tasks = tasks.map((t) => moved.find((m) => m.id === t.id) ?? t)
      el.tasks = tasks
      out.textContent = `Leveled: shifted ${moved.length} task(s) (${moved.map((m) => m.name).join(', ')})`
    })
  }

  const localeEl = document.getElementById('res-locale')
  const localeOut = document.getElementById('res-locale-output')
  if (localeEl && localeOut) {
    localeOut.textContent = 'en-US (Sunday-based) + week scale: labels rendered as period start dates (MM-dd)'
    document.getElementById('res-scroll-btn')?.addEventListener('click', () => {
      localeEl.scrollToDate('2026-03-15')
      localeOut.textContent = 'Scrolled to 2026-03-15 (centered in viewport)'
    })
  }
})
</script>
