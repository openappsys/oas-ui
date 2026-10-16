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

## Localization & Scrolling

<DemoBlock title="locale=&quot;en-US&quot; (Sunday-based) + scale=&quot;week&quot;: labels and week start follow en-US; scrollToDate scrolls the timeline to a given date">
  <oas-button id="res-scroll-btn" size="small">Scroll to 03-15</oas-button>
  <oas-resource id="res-locale" locale="en-US" scale="week" height="240" capacity="2"
    resources='[{"id":"zhang","name":"Alice","capacity":1},{"id":"li","name":"Bob","capacity":2}]'
    tasks='[{"id":"w1","name":"Iteration 1","start":"2026-03-01","end":"2026-03-06","resources":["zhang"]},{"id":"w2","name":"Iteration 2","start":"2026-03-04","end":"2026-03-12","resources":["zhang","li"]},{"id":"w3","name":"Iteration 3","start":"2026-03-10","end":"2026-03-18","resources":["li"]}]'></oas-resource>
  <div id="res-locale-output" style="color:var(--oas-color-text-secondary);font-size:var(--oas-font-size-sm);margin-top:var(--oas-space-2)"></div>
</DemoBlock>

Instance method **`scrollToDate(date)`**: horizontally scrolls the timeline to the given date (`YYYY-MM-DD`, centered in the viewport, minus the sticky resource name column width). Invalid dates / no data are no-ops; RTL layouts use the negative `scrollLeft` model (same as gantt).

## API

### oas-resource

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `capacity` | Default capacity when a resource declares none (default 1) | `string` | `1` |
| `height` | Component height in px (default 320; accepts a plain number or Npx): mapped to the custom property --oas-resource-height (the host's own inline height always wins and is never overwritten by the component). While the height attribute is present and valid (>0 plain number or Npx) the component takes over this variable — writing it inline on the host and overriding any --oas-resource-height the host set itself; an empty/whitespace value is treated as unset; an invalid value writes nothing and only clears a value this instance wrote earlier, so a host token is never affected; after the attribute is removed the component-written value is cleared to zero, so the height falls back to the token default (320) or host CSS, and the host's previous inline value is not restored; when the height attribute was never set the component never writes the variable, and a --oas-resource-height set by the host (inline or via class rules) is left completely untouched | `string` | `320` |
| `locale` | Localization (overrides config-provider injection and global locale) | `string` | — |
| `resources` | Resources (JSON [{ id, name, capacity? }]) — capacity = parallel tasks per period for that resource (per day in the day scale; falls back to the capacity attribute, ultimately 1) | `ResourceItem[]` | `[]` |
| `scale` | Histogram period granularity and axis labels: day (default) / week / month; invalid falls back to day | `string` | — |
| `tasks` | Resource tasks (JSON [{ id, name, start, end, resources? }]); start/end are day precision YYYY-MM-DD only (end inclusive; time-bearing input is treated as that day), resources is the assigned resource id array (assignments to unknown resources are ignored) | `ResourceTask[]` | `[]` |

#### Property (JS property; see each row for attribute reflection)

| Property | Description | Type | Default |
| --- | --- | --- | --- |
| `resources` | Resources (reads a copy: nested plain objects/arrays are deep-cloned — cycle-safe; shared references stay shared within a single read result; Date is copied by value (not kept shared); exotic objects such as class instances/Set are shared by reference; writing syncs the attribute + re-renders; unserializable custom keys are dropped individually from the attribute, the property read-back keeps the full data) | `ResourceItem[]` | `[]` |
| `tasks` | Resource tasks (reads a copy: nested plain objects/arrays are deep-cloned — cycle-safe; shared references stay shared within a single read result; Date is copied by value (not kept shared); exotic objects such as class instances/Set are shared by reference; writing syncs the attribute + re-renders + dispatches oas-tasks-change; unserializable custom keys are dropped individually from the attribute, the property read-back keeps the full data) | `ResourceTask[]` | `[]` |

#### Events

| Event | Description |
| --- | --- |
| `oas-overload` | Dispatched when the overload state changes (at most once per update; the same overload state is not re-dispatched), detail: { overloads: [{ resourceId, period, load, capacity }] } (period is the period start date); not dispatched when there is no overload |
| `oas-task-click` | Dispatched when a task bar in a resource swimlane is clicked, detail: { id, task, resourceId } |
| `oas-tasks-change` | Dispatched when tasks is written programmatically, detail: { tasks } |

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
