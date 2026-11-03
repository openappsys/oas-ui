# Resource Load

Resource load / swimlane view (new component, data family): given **resources** and **tasks** (tasks carrying assigned resources), it renders **resource swimlanes** (one row per resource, showing its assigned task bars on a shared timeline) and a **load histogram** (parallel task count per period by scale, highlighting overload above capacity). It is a pure view layer — no scheduling/leveling engine; leveling is exported as a pure function `levelResources()`, and the host decides whether to write back.

## Basic Usage

<DemoBlock title="Resource swimlanes + load histogram: resources (with capacity) + tasks (with resources assignment)">
  <oas-resource id="res-basic" scale="day" height="320" capacity="1"
    resources='[{"id":"zhang","name":"Alice","capacity":1},{"id":"li","name":"Bob","capacity":1},{"id":"wang","name":"Cara","capacity":2}]'
    tasks='[{"id":"t1","name":"Requirement review","start":"2026-03-02","end":"2026-03-03","resources":["zhang","li"]},{"id":"t2","name":"API design","start":"2026-03-03","end":"2026-03-05","resources":["zhang"]},{"id":"t3","name":"Backend","start":"2026-03-04","end":"2026-03-08","resources":["li"]},{"id":"t4","name":"Frontend","start":"2026-03-04","end":"2026-03-08","resources":["wang"]},{"id":"t5","name":"Integration test","start":"2026-03-09","end":"2026-03-11","resources":["li","wang"]},{"id":"t6","name":"Docs","start":"2026-03-02","end":"2026-03-04","resources":["wang"]}]'></oas-resource>
  <div id="res-basic-output" style="color:var(--oas-color-text-secondary);font-size:var(--oas-font-size-sm);margin-top:var(--oas-space-2)"></div>
</DemoBlock>

- `resources`: `[{ id, name, capacity?, workdays?, holidays?, capacityOverrides?, skills?, costRate? }]`. When `workdays` is absent and `holidays` / `capacityOverrides` are empty, `capacity` = parallel tasks **per period** (legacy semantics, falls back to the `capacity` attribute, ultimately 1). With `workdays` (`0=Sunday…6=Saturday`; `[]` means fully unavailable), non-empty `holidays`, or non-empty `capacityOverrides`, capacity is **per day** and a period capacity is the sum of its days. `capacityOverrides` (YYYY-MM-DD → capacity) wins over `workdays` / `holidays` and may be fractional (such as `0.5`); task load is counted in whole days, so a 0.5-day capacity cannot hold a whole-day task (reserved for a future effort model). `skills` is a skill-tag array. `costRate` is an hourly rate (display-only; used with `show-cost` for the lane cost total, see below).
- `tasks`: `[{ id, name, start, end, resources?: string[], priority?, requiredSkills?, project? }]` — `start/end` are `YYYY-MM-DD` (**day precision only**, inclusive `end`; time-bearing input is treated as that day); `resources` is the assigned resource id array; assignments pointing to unknown resources are ignored. `priority`: lower is more important; `requiredSkills` requires every assigned target resource to have all tags during reassign; `project` works with `levelResources({ projectOrder })` for cross-project priority.
- `scale`: `day` (default) / `week` / `month` — controls the histogram period granularity and axis labels.
- Swimlanes and histogram **share column width and horizontal scroll**; overload bars get `.over` (color via `--oas-color-danger`); overlapping task bars within a resource are **stacked in sub-rows** (no mutual occlusion, clicking a bar hits that bar).
- The lane-gap token `--oas-resource-lane-gap` is derived from row height and bar height (`--oas-resource-row-height` participates; a multi-segment track's real height = segments × bar height + (segments + 1) × gap). The token is declared on the component host element: only **element-level** overrides take effect — inline style or a class rule hitting the host element (e2e-verified: a host class setting `--oas-resource-lane-gap:4px` → single-segment track height 36 → 28); `:root` / ancestor-level declarations do not (the host already declares its own value, so the inherited value is overridden).

## Heatmap & Skill Matrix

<DemoBlock title="heatmap: color by load/capacity, legend plus per-cell title">
  <oas-resource heatmap scale="day" height="300" capacity="1"
    resources='[{"id":"a","name":"Alice","capacity":1},{"id":"b","name":"Bob","capacity":2}]'
    tasks='[{"id":"h1","name":"Requirements","start":"2026-03-02","end":"2026-03-03","resources":["a"]},{"id":"h2","name":"Design","start":"2026-03-03","end":"2026-03-04","resources":["a"]},{"id":"h3","name":"Build","start":"2026-03-02","end":"2026-03-05","resources":["b"]}]'></oas-resource>
</DemoBlock>

<DemoBlock title="skill-matrix: rows = resources, columns = skill union; check means owned">
  <oas-resource skill-matrix height="240"
    resources='[{"id":"a","name":"Alice","skills":["frontend","design"]},{"id":"b","name":"Bob","skills":["backend","devops"]},{"id":"c","name":"Carol","skills":["design","backend"]}]'></oas-resource>
</DemoBlock>

`heatmap` switches the load histogram to heat cells (low/mid/high/over by `load / capacity`), with a legend in the histogram header and a per-cell `title` showing date + `load/capacity`. `skill-matrix` switches to a skill matrix (rows = resources, columns = skill union, ✓ = owned) and does not participate in load calculation; the matrix is not virtualized, so paginate for very large resource/skill sets.

## Overload & Leveling

<DemoBlock title="Detect overload (oas-overload) → one-click leveling: keep durations and shift (default) or reassign with mode: reassign (dates unchanged); the host writes tasks back">
  <div style="display: flex; gap: var(--oas-space-2); flex-wrap: wrap">
    <oas-button id="res-level-btn" size="small">Level (shift)</oas-button>
    <oas-button id="res-reassign-btn" size="small">Balance (reassign)</oas-button>
  </div>
  <oas-resource id="res-level" scale="day" height="320"></oas-resource>
  <div id="res-level-output" style="color:var(--oas-color-text-secondary);font-size:var(--oas-font-size-sm);margin-top:var(--oas-space-2)"></div>
</DemoBlock>

Leveling is a **host decision**: the component only exports a pure function

```ts
import { levelResources } from '@oas-ui/ui'

// Shift (default): changes dates, keeps durations
const moved = levelResources(resources, tasks, { scale: 'day' })
// Reassign: dates unchanged; move tasks to resources with spare capacity for the whole span
const reassigned = levelResources(resources, tasks, { scale: 'day', mode: 'reassign' })
// Both return full copies of the changed tasks; merge by id and write back
el.tasks = tasks.map((t) => [...moved, ...reassigned].find((m) => m.id === t.id) ?? t)
```

`levelResources` guarantees: deterministic (same input → same output), iterates until no overload or `maxIter`; it does **not** mutate the input. The component never calls it automatically.

### Capacity calendars, skills, and priority

```ts
const resources = [
  { id: 'alice', name: 'Alice', capacity: 1, workdays: [1, 2, 3, 4, 5], holidays: ['2026-03-05'], skills: ['frontend'] },
  { id: 'bob', name: 'Bob', capacity: 1, capacityOverrides: { '2026-03-06': 0.5 }, skills: ['backend'] },
]
const tasks = [
  { id: 't1', name: 'Page work', start: '2026-03-02', end: '2026-03-06', resources: ['alice'], requiredSkills: ['frontend'], priority: 0, project: 'portal' },
]
// Weekly capacity sums each working day; holidays contribute 0; override capacity may be fractional (task load counts whole days)
levelResources(resources, tasks, { scale: 'week', projectOrder: ['portal'] })
```

<DemoBlock title="Capacity calendar: holidays show 0 and half-day capacity shows an overload bar (day scale)">
  <oas-resource
    id="res-calendar"
    scale="day"
    height="220"
    resources='[{"id":"alice","name":"Alice","capacity":1,"workdays":[1,2,3,4,5],"holidays":["2026-03-05"],"skills":["frontend"]},{"id":"bob","name":"Bob","capacity":1,"workdays":[1,2,3,4,5],"capacityOverrides":{"2026-03-06":0.5},"skills":["backend"]}]'
    tasks='[{"id":"c1","name":"Page work","start":"2026-03-02","end":"2026-03-04","resources":["alice"],"requiredSkills":["frontend"],"priority":0,"project":"portal"},{"id":"c2","name":"Holiday task","start":"2026-03-05","end":"2026-03-05","resources":["alice"],"requiredSkills":["frontend"],"project":"portal"},{"id":"c3","name":"Half-day capacity","start":"2026-03-06","end":"2026-03-06","resources":["bob"],"requiredSkills":["backend"],"project":"portal"}]'
  ></oas-resource>
</DemoBlock>

- Without `workdays` and with empty `holidays` / `capacityOverrides`, the legacy per-period capacity semantics are unchanged; with them, period capacity is the sum of daily capacity. Empty `holidays: []` / `capacityOverrides: {}` count as absent and do not switch the legacy semantics.
- `workdays` uses `0=Sunday…6=Saturday`; `workdays: []` means zero capacity every day (fully unavailable). A non-empty array with no valid values (strings, out-of-range, 1..7 convention) is treated as absent with a devWarn instead of silently making the resource unschedulable.
- `capacityOverrides` wins over `holidays`; capacity may be fractional, but task load is counted in whole days, so a `0.5` day cannot hold a whole-day task.
- Zero-capacity periods get a full-column striped background in the load histogram (`--oas-resource-unavailable-bg`) even when no task is present; overload pillars still overlay danger color.
- `reassign` defaults to `respectSkills: true`; every target must have all of a task's `requiredSkills`. No skill data means no behavior change.
- Projects earlier in `projectOrder` win; within a project lower `priority` values win. Lower-priority tasks move/reassign first. Project names and skills are compared after trimming.
- The algorithm remains deterministic and greedy; it does not claim a global optimum.
- `shift` skips a resource only when `workdays: []` and future positive overrides cannot hold its tasks (structurally unschedulable), with a devWarn instead of pushing tasks past `maxIter` periods; consecutive holidays / a single zero override can still be shifted past. `reassign` returns no targets when none is feasible.

`options.mode` (default `shift`):

- `shift`: each task keeps its duration and only moves later; suitable when there is deadline slack.
- `reassign`: **dates never change** — tasks on an overloaded resource are moved to a resource with spare capacity in **every** period the task spans (picked by the lowest worst load ratio, ties by resource input order; multi-resource tasks only swap the overloaded assignment). Stops when no feasible target exists — it **never degrades to shifting**; the right mode when deadlines are hard and only people can move (the pm template's "balance load" button).

> In `week` scale the step is one week period, but the pure function has no locale context (week start defaults to Monday); for tasks crossing week boundaries pass `{ weekStart: <matching the page locale> }` (0=Sunday … 6=Saturday) explicitly to avoid a boundary mismatch with the histogram's week granularity.

## Readability (opt-in switches)

<DemoBlock title="Readability switches (opt-in): load values on pillars (show-load-values) + overload badge (show-overload-badge) + bar labels (bar-label)">
  <oas-resource id="res-readable" scale="day" height="420" capacity="1" show-load-values show-overload-badge bar-label header-sticky
    resources='[{"id":"zhang","name":"Alice","capacity":1},{"id":"li","name":"Bob","capacity":1},{"id":"wang","name":"Cara","capacity":2}]'
    tasks='[{"id":"t1","name":"Requirement review","start":"2026-03-02","end":"2026-03-03","resources":["zhang","li"]},{"id":"t2","name":"API design","start":"2026-03-03","end":"2026-03-05","resources":["zhang"]},{"id":"t3","name":"Backend","start":"2026-03-04","end":"2026-03-08","resources":["li"]},{"id":"t4","name":"Frontend","start":"2026-03-04","end":"2026-03-08","resources":["wang"]},{"id":"t5","name":"Integration test","start":"2026-03-09","end":"2026-03-11","resources":["li","wang"]},{"id":"t6","name":"Docs","start":"2026-03-02","end":"2026-03-04","resources":["wang"]}]'></oas-resource>
  <div id="res-readable-output" style="color:var(--oas-color-text-secondary);font-size:var(--oas-font-size-sm);margin-top:var(--oas-space-2)">All three switches on: pillar tops show the parallel task count per period (overloaded in red); Alice's row header shows an "Overloaded 1 period" badge; task bars show their names.</div>
</DemoBlock>

All three readability capabilities are **opt-in** (off by default, zero extra nodes): `show-load-values` displays the parallel task count on top of every load > 0 pillar (decorative numbers, `aria-hidden`; overloaded pillars get `.over` using `--oas-color-danger`); `show-overload-badge` shows an "Overloaded N periods" badge on the swimlane row header of overloaded resources (visible information, not `aria-hidden`, copy follows the global locale instantly); `bar-label` shows the task name inside the bar (rendered as plain text against injection, single-line clipped on narrow bars; does not affect aria-label or click hit-testing).

## Row-header Skill Chips (show-skills)

<DemoBlock title="show-skills: row-header chips for ResourceItem.skills next to the name (single-line ellipsis + title with the full list)">
  <oas-resource id="res-skill-chips" show-skills scale="day" height="240" capacity="1"
    resources='[{"id":"a","name":"Alice","skills":["frontend","design","vue"]},{"id":"b","name":"Bob","skills":["backend","devops","k8s","grpc","redis","mysql","rabbitmq","kafka","flink"]},{"id":"c","name":"Cara"}]'
    tasks='[{"id":"s1","name":"Pages","start":"2026-03-02","end":"2026-03-06","resources":["a"]},{"id":"s2","name":"Services","start":"2026-03-03","end":"2026-03-08","resources":["b"]}]'></oas-resource>
</DemoBlock>

With `show-skills` (off by default), resources carrying `ResourceItem.skills` show **chips** (muted rounded tags; colors from tokens, dark theme follows automatically) next to the name in the swimlane row header:

- Sanitization reuses the data-layer rules: non-array counts as absent, non-string / blank items dropped, deduplicated, trimmed;
- **At most 8 chips render** (so a long skill list cannot blow up the row header); the rest stay visible via the container's `title` hover (the data layer keeps the full list — `levelResources` reassign `requiredSkills` matching is unaffected by the display cap);
- Single-line ellipsis (no wrapping) — row height does not change with chip count; when combined with the overload badge / cost total the header order is name → chips → badge → cost;
- Under RTL the DOM order is unchanged; visual mirroring follows `direction` automatically through the flex row.

## Lane Cost Totals (show-cost)

<DemoBlock title="show-cost on: resources with a costRate show a loaded-window cost total in the row header (two decimals, no currency symbol)">
  <oas-resource id="res-cost" show-cost scale="day" height="300" capacity="1" range-start="2026-03-01" range-end="2026-03-31"
    resources='[{"id":"senior","name":"Senior (200/h)","capacity":1,"costRate":200},{"id":"junior","name":"Junior (80/h)","capacity":1,"costRate":80},{"id":"vendor","name":"Contractor (no rate)","capacity":1}]'
    tasks='[{"id":"c1","name":"Architecture","start":"2026-03-02","end":"2026-03-04","resources":["senior"]},{"id":"c2","name":"Feature build","start":"2026-03-03","end":"2026-03-10","resources":["junior"]},{"id":"c3","name":"Acceptance support","start":"2026-03-09","end":"2026-03-11","resources":["vendor"]}]'></oas-resource>
</DemoBlock>

With `show-cost` (off by default), resources **that have a rate** show a cost total in the row header: Σ(task days inside the loaded window × 8h × `ResourceItem.costRate`).

- `costRate` is an hourly rate (**display-only data** — never participates in load/scheduling math); missing/invalid (negative, non-finite) → that lane shows no cost.
- "Loaded window" = the whole time axis (`range-start`/`range-end` hosting wins, otherwise derived from the loaded tasks); tasks intersecting the axis count their intersecting **calendar days** (inclusive ends), and tasks crossing the axis only count the in-axis days.
- Formatting is fixed to two decimals with **no currency symbol** (the "200/h" above lives in the host's resource names, not component output); the label copy comes from i18n (`resource.cost`) and the figure uses the secondary text token (dark theme switches automatically).
- Totals are recomputed in `update()` when the **data / date window** changes; horizontally scrolling the visible column window does not retrigger (cost is a data-window quantity, not a scroll-viewport quantity).

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

## Utilization, assignment suggestions, and calendar exchange

```ts
import { computeUtilization, suggestAssignments, buildSkillMatrix, exportResourceCalendars, importResourceCalendars } from '@oas-ui/ui'

// Defaults to per-day buckets; supports week / month. Capacity is summed per day from workdays/holidays/capacityOverrides.
const report = computeUtilization(resources, tasks, { scale: 'week', rangeStart: '2026-08-01', rangeEnd: '2026-08-31' })
// report.resources[0] -> { resourceId, name, load, capacity, utilization, periods }

// Skill gaps first, then utilization/capacity. Read-only.
const suggestions = suggestAssignments(task, resources, tasks)

// Skill union plus per-resource ownership (skills sorted alphabetically).
const matrix = buildSkillMatrix(resources)

// Versioned JSON exchange; import sanitizes invalid dates, negative capacity, and empty skills.
const json = exportResourceCalendars(resources)
const file = importResourceCalendars(json)
```

`computeUtilization` uses the same load rule as the component (a task intersecting a day adds 1 for each assigned resource); without calendar fields, `capacity` is the per-day base. `suggestAssignments` returns candidates sorted by ascending `score`, with resources that have `missingSkills` pushed back. `buildSkillMatrix` only aggregates skills and does not infer levels or proficiency. `importResourceCalendars` throws on invalid JSON/version, so hosts should `try/catch` and show a message.

## Pro helpers (on-demand)

Two **pure-function helper subpaths** ship the resource data-processing capabilities separately from the component: their runtime closure carries no component runtime, no core and no i18n (the component core is untouched; helpers are not part of the L1/CDN bundles) — they only enter your build when explicitly imported:

```ts
// Task costing (taskCost first + hourly-rate derivation + billable set + apportionment)
import { computeCost } from '@oas-ui/ui/data/resource/cost'
// Shared resource pool (id-deduped registry + version counter + cross-copy singleton)
import { ResourcePool, getSharedResourcePool } from '@oas-ui/ui/data/resource/pool'
```

**`computeCost(tasks, resourceIds, opts?)`**: day-granularity costing. Dates follow the sanitize layer: **time-bearing inputs truncate to the day** (invalid time / trailing garbage / `Z` suffix rejected), and a `start` after `end` self-heals by swapping; duration = `end − start + 1` (inclusive end, matching the component's load rule); task cost prefers `taskCost[id]`, otherwise Σ(duration days × `hoursPerDay` (default 8) × `resourceHourly[rid]`); `resourceIds` limits the billable resource set (allocations outside the set are neither billed nor apportioned); `perTask` holds full amounts, `perResource` is **apportioned equally** across the actually billed assigned resources, `total = Σ perTask`; `perTask` / `perResource` are prototype-less containers, so task ids colliding with `constructor` / `toString` / `__proto__` are safe.

```ts
const r = computeCost(tasks, ['zhang', 'li'], {
  resourceHourly: { zhang: 100, li: 50 },
  taskCost: { fix: 900 }, // takes precedence over rate derivation
  hoursPerDay: 8,
})
// r: { perTask, perResource, total }
```

**`ResourcePool` / `getSharedResourcePool()`**: an id-deduped resource registry for sharing one resource collection across views/components. `register` (same id overrides, invalid entries skipped) / `remove` / `get` / `list` / `clear`; `version` increments on every effective change (no-op calls do not bump it) for polling/diffing. `getSharedResourcePool()` returns the shared singleton mounted on `globalThis` (`Symbol.for`) — multiple copies (linking / multiple bundler instances) share the same data and version.

```ts
const pool = getSharedResourcePool()
pool.register(resources)
if (pool.version !== lastSeen) {
  lastSeen = pool.version
  render(pool.list())
}
```

> The helpers are pure functions/pure data structures and can run at any time; when coordinating with an `<oas-resource>` instance on the page, `await customElements.whenDefined('oas-resource')` before grabbing the instance. Helper sizes (gzip, first budget measured 2026-11-01): cost 828 B / pool 490 B.

## API

### oas-resource

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `bar-label` | Show the task name inside the bar (boolean, off by default): single line with ellipsis, clipped on narrow bars; aria-label and click/drag hit-testing are unchanged | `boolean` | — |
| `capacity` | Default capacity when a resource declares none (default 1) | `string` | `1` |
| `header-sticky` | Lane header sticks to the top while scrolling lanes (on by default): week/day ticks stay visible; `header-sticky="false"` disables it (the header scrolls with content). The corner name column always stays pinned on horizontal scroll (LTR/RTL) | — | — |
| `heatmap` | Load heatmap (boolean, off by default): colors cells by load/capacity with low/mid/high/over; the histogram header renders a legend and each cell title shows date + load/capacity | `boolean` | — |
| `height` | Component height in px (default 320; accepts a plain number or Npx): mapped to the custom property --oas-resource-height (the host's own inline height always wins and is never overwritten by the component). While the height attribute is present and valid (>0 plain number or Npx) the component takes over this variable — writing it inline on the host and overriding any --oas-resource-height the host set itself; an empty/whitespace value is treated as unset; an invalid value writes nothing and only clears a value this instance wrote earlier, so a host token is never affected; after the attribute is removed the component-written value is cleared to zero, so the height falls back to the token default (320) or host CSS, and the host's previous inline value is not restored; when the height attribute was never set the component never writes the variable, and a --oas-resource-height set by the host (inline or via class rules) is left completely untouched | `string` | `320` |
| `hover` | Lane and load-histogram row hover background switch (on by default): hovering a lane or histogram row lights up the whole row (including the name cell). Color via `--oas-resource-row-hover-bg` (defaults to `--oas-color-bg-hover`, independent of the bar hover color); `"false"` disables | — | — |
| `locale` | Localization (overrides config-provider injection and global locale) | `string` | — |
| `range-end` | Host-managed time-axis end (ISO date YYYY-MM-DD, inclusive); pair with range-start. If only one is given, reversed or invalid, the axis is not host-managed and a devWarn is emitted | `string` | — |
| `range-start` | Host-managed time-axis start (ISO date YYYY-MM-DD): when provided the period range is no longer derived from loaded tasks | `string` | — |
| `resources` | Resources (JSON [{ id, name, capacity?, workdays?, holidays?, capacityOverrides?, skills?, costRate? }]). `workdays` uses 0=Sunday…6=Saturday; `[]` means fully unavailable. When `workdays` is absent and `holidays` / `capacityOverrides` are empty, capacity = parallel tasks per period (legacy); otherwise period capacity is the sum of daily capacity, non-empty `capacityOverrides` wins over `workdays` / `holidays`, and may be fractional while task load is counted in whole days (a 0.5-day capacity cannot hold a whole-day task); empty `holidays` / `capacityOverrides` count as absent. `skills` is a skill-tag array. `costRate` is an hourly rate (display-only; with `show-cost` it feeds the lane header cost total Σ(days × 8h × costRate) — lanes without a valid rate show no cost). A resource may carry an optional `color` (CSS color or token, e.g. `var(--oas-color-success)`) used to tint its lane bars and load bars; when absent the unified `--oas-resource-bar-bg` / `--oas-resource-load-bg` applies | `ResourceItem[]` | `[]` |
| `scale` | Histogram period granularity and axis labels: day (default) / week / month; invalid falls back to day | `string` | — |
| `show-cost` | Lane cost total (boolean, off by default): the lane header shows "Cost Σ(task days × 8h × costRate)" with two decimals (no currency symbol — the unit is up to the host CSS/copy); days are counted as the calendar-day intersection between each task and the **intersection window** — with managed range-start/range-end the managed axis endpoints are used (cost does not drift across scale modes), otherwise the task-derived axis applies; lanes without a valid costRate show nothing. The total is recomputed in update() when tasks/date windows change; scrolling the visible column window does not retrigger | `string` | — |
| `show-load-values` | Show the load value above each histogram bar (boolean, off by default): only for load > 0; overload values use text-on-primary (white in light / dark in dark) for contrast on the danger bar. The number is visual redundancy (aria-hidden); screen readers still get the column load description | `boolean` | — |
| `show-overload-badge` | Show an "Overloaded ×N" badge in the lane header (boolean, off by default): only for resources with overloaded periods; text comes from the i18n key resource.overBadge | `boolean` | — |
| `show-skills` | Skill chips next to the lane row-header name (boolean, off by default): renders ResourceItem.skills as muted rounded tags (sanitized: non-array = absent, non-string/blank items dropped, deduplicated, trimmed); at most 8 render so a long list cannot blow up the header — the full list stays on the container title hover (data layer keeps everything; reassign matching is unaffected); single-line ellipsis keeps row height stable, RTL mirrors automatically via direction | `string` | — |
| `skill-matrix` | Skill matrix view (boolean, off by default): rows = resources, columns = skill union, check = owned; not virtualized | `boolean` | — |
| `tasks` | Resource tasks (JSON [{ id, name, start, end, resources?, priority?, requiredSkills?, project? }]); start/end are day precision YYYY-MM-DD only (end inclusive; time-bearing input is treated as that day), resources is the assigned resource id array (assignments to unknown resources are ignored). priority: lower is more important; requiredSkills: every reassign target must have all tags; project works with levelResources({ projectOrder }) for cross-project priority | `ResourceTask[]` | `[]` |
| `total` | Full resource row count in windowed mode; 0 or invalid disables windowed (falls back to local mode) | `string` | — |
| `window-start` | Absolute row index (within the full dataset) of the first row (resource) in the slice (windowed mode) | `string` | `0` |
| `windowed` | Server-side row-window mode (boolean, off by default): with total / window-start the host supplies only the visible window slice (rendered by absolute row index); when the expected row window is not covered, oas-window-request is emitted for the host to refill. Load/overload stats cover the loaded slice only (full-dataset stats are the host's job) with a devWarn; when range-start / range-end are absent the time axis falls back to deriving from loaded tasks with a devWarn. Non-windowed behavior unchanged | `boolean` | — |

#### Property (JS property; see each row for attribute reflection)

| Property | Description | Type | Default |
| --- | --- | --- | --- |
| `resources` | Resources (JSON [{ id, name, capacity?, workdays?, holidays?, capacityOverrides?, skills? }]). `workdays` uses 0=Sunday…6=Saturday; `[]` means fully unavailable. When `workdays` is absent and `holidays` / `capacityOverrides` are empty, capacity = parallel tasks per period (legacy); otherwise period capacity is the sum of daily capacity, non-empty `capacityOverrides` wins over `workdays` / `holidays`, and may be fractional while task load is counted in whole days (a 0.5 day cannot hold a whole-day task); empty `holidays` / `capacityOverrides` count as absent. `skills` is a skill-tag array. A resource may carry an optional `color` (CSS color or token, e.g. `var(--oas-color-success)`) used to tint its lane bars and load bars; when absent the unified `--oas-resource-bar-bg` / `--oas-resource-load-bg` applies; property read is a copy: nested plain objects/arrays are deep-cloned — cycle-safe; shared references stay shared within a single read result; Date is copied by value (not shared); exotic objects such as class instances/Set are shared by reference; writing syncs the attribute + re-renders; if a custom key is not serializable, only that key is dropped from the attribute while the property readback stays complete | `ResourceItem[]` | `[]` |
| `tasks` | Resource tasks (JSON [{ id, name, start, end, resources?, priority?, requiredSkills?, project? }]); start/end are day precision YYYY-MM-DD only (end inclusive; time-bearing input is treated as that day), resources is the assigned resource id array (assignments to unknown resources are ignored). priority: lower is more important; requiredSkills: every reassign target must have all tags; project works with levelResources({ projectOrder }) for cross-project priority; property read is a copy: nested plain objects/arrays are deep-cloned — cycle-safe; shared references stay shared within a single read result; Date is copied by value (not shared); exotic objects such as class instances/Set are shared by reference; writing syncs the attribute + re-renders + dispatches oas-tasks-change | `ResourceTask[]` | `[]` |

#### Methods

| Method | Signature | Description |
| --- | --- | --- |
| `scrollToDate` | `scrollToDate(date: string): void` | Scroll to the given date (centered horizontally in the timeline viewport, excluding the sticky resource column width); invalid dates or no data are no-ops. RTL uses the negative scrollLeft model (as in gantt) |

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
| `--oas-resource-row-hover-bg` | `var(--oas-color-bg-hover)` |
| `--oas-resource-unavailable-bg` | `transparent` |

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
    const resName = (id) => resources.find((r) => r.id === id)?.name ?? id
    const runLeveling = async (mode) => {
      for (let i = 0; i < 100 && typeof window.levelResources !== 'function'; i++) {
        await new Promise((r) => setTimeout(r, 50))
      }
      if (typeof window.levelResources !== 'function') {
        out.textContent = '(levelResources not ready yet, please retry)'
        return
      }
      const moved = window.levelResources(resources, tasks, { scale: 'day', mode })
      if (moved.length === 0) {
        out.textContent =
          mode === 'reassign' ? 'Cannot balance: no resource has spare capacity for the whole span' : 'Nothing to level (no overload)'
        return
      }
      tasks = tasks.map((t) => moved.find((m) => m.id === t.id) ?? t)
      el.tasks = tasks
      out.textContent =
        mode === 'reassign'
          ? `Balanced: reassigned ${moved.length} task(s) (${moved
              .map((m) => `${m.name} → ${(m.resources ?? []).map(resName).join('+')}`)
              .join(', ')})`
          : `Leveled: shifted ${moved.length} task(s) (${moved.map((m) => m.name).join(', ')})`
    }
    document.getElementById('res-level-btn')?.addEventListener('click', () => runLeveling('shift'))
    document.getElementById('res-reassign-btn')?.addEventListener('click', () => runLeveling('reassign'))
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
