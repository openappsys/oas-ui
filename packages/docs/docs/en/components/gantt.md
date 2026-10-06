# Gantt

Project-scheduling chart component (data family): a WBS row tree (parent summary bars span the union of their children's time) against a horizontal time axis, with three bar forms (task / milestone / summary) plus progress fill; dependency links (FS/SS/FF/SF, drawn on a single SVG overlay); a drag trio (drag to reschedule, edge handles to resize, in-bar handle to change progress — written back once on pointerup with events); six time scales (hour/day/week/month/quarter/year) with a two-tier header; today line and weekend/holiday column highlights; row virtualization for tens of thousands of tasks; three readonly levels plus per-task disabling. The data contract is a flat `parent` pointer list (nested `children` input is flattened automatically).

## Basic Usage

<DemoBlock title="WBS row tree + dependency links + milestones + progress (tasks JSON; flat parent / nested children both accepted)">
  <oas-gantt id="gantt-basic" tasks='[{"id":"p1","name":"Phase 1: Foundation","start":"2026-03-02","end":"2026-03-13","type":"summary","children":[{"id":"t1","name":"Requirements","start":"2026-03-02","end":"2026-03-06","progress":40},{"id":"t2","name":"Development","start":"2026-03-05","end":"2026-03-13","progress":20,"dependencies":[{"id":"t1"}]}]},{"id":"p2","name":"Phase 2: Release","start":"2026-03-16","end":"2026-03-20","type":"summary","expanded":false,"children":[{"id":"t3","name":"Regression","start":"2026-03-16","end":"2026-03-18","dependencies":[{"id":"t2"}]},{"id":"m1","name":"v1.0 Launch","start":"2026-03-20"}]},{"id":"t9","name":"Docs","start":"2026-03-09","end":"2026-03-12","progress":70,"dependencies":[{"id":"t2","type":"ss"}]}]'></oas-gantt>
  <div id="gantt-output" style="color:var(--oas-color-text-secondary);font-size:var(--oas-font-size-sm);margin-top:var(--oas-space-2)"></div>
</DemoBlock>

- Parent tasks render **summary bars** (time = union of children, progress = duration-weighted average); the row toggle collapses/expands children; the expanded set is written back to the `expanded` attribute (JSON array) with `oas-expand-change`; collapsed sub-rows hide together with their dependency links (links follow row visibility, they do not reroute to the summary bar);
- **Milestones** render as diamonds: an explicit `type: "milestone"` takes precedence (a task renders as a milestone even when it carries `end`; the `end` is ignored with a one-time `console.warn` about the data conflict); tasks without `end` also infer as milestones; **a task with children always renders as a summary bar** (children carry the aggregation semantics, so form and aggregation must agree, with a one-time `console.warn`); a `start` after `end` (reversed dates) is swapped automatically at the sanitize layer with a one-time `console.warn` (no 2px ghost bar);
- `dependencies` declare links (`type` defaults to `fs`; `fs`/`ss`/`ff`/`sf` supported) drawn as polylines with arrowheads on a single SVG canvas;
- Hovering a bar shows a tooltip (name + range + progress); `template[slot="tooltip"]` overrides the content (bind points `[data-task-name]` / `[data-task-range]` / `[data-task-progress]`).

## Time Scales (scale)

<DemoBlock title="Six scales: hour / day (default) / week / month / quarter / year (two-tier header: merged major tier + per-unit minor tier)">
  <oas-segmented id="gantt-scale-switch" value="day" options='[{"label":"Hour","value":"hour"},{"label":"Day","value":"day"},{"label":"Week","value":"week"},{"label":"Month","value":"month"},{"label":"Quarter","value":"quarter"},{"label":"Year","value":"year"}]' style="margin-bottom:var(--oas-space-2)"></oas-segmented>
  <oas-gantt id="gantt-scale" scale="day" tasks='[{"id":"s1","name":"Phase 1 delivery","start":"2026-01-05","end":"2026-06-30","progress":50},{"id":"s2","name":"Phase 2 kickoff","start":"2026-04-01","end":"2026-08-15","progress":0,"dependencies":[{"id":"s1","type":"fs"}]}]'></oas-gantt>
</DemoBlock>

Changing `scale` re-lays the time axis (column width adapts per tier, with a floor that keeps labels legible) and dispatches `oas-scale-change`; invalid values fall back to `day`. When the container squeezes columns too narrow for labels, minor ticks are thinned by N (grid lines kept, some texts hidden — e.g. every 2nd day on a narrow day axis) so day/month numbers never collide. Dragging snaps to the current scale unit (`snap="false"` disables snapping and shifts by pixel ratio, preserving time precision).

## Drag Trio

<DemoBlock title="Drag body to reschedule / edge handles to resize / dot handle for progress (written back once on pointerup; Esc or pointercancel cancels with zero events)">
  <oas-gantt id="gantt-drag" tasks='[{"id":"dg1","name":"Draggable task (body = move, edges = resize, dot = progress)","start":"2026-03-02","end":"2026-03-08","progress":30},{"id":"dg2","name":"Draggable milestone","start":"2026-03-10"}]'></oas-gantt>
</DemoBlock>

- **Drag the body** = move as a whole (duration kept); **drag edge handles** = change start/end (cannot cross the opposite side); **drag the in-bar dot** = change progress;
- Written back on pointerup with `oas-task-change` (`detail: { id, task, oldStart, oldEnd, start, end }`) / `oas-progress-change` (`detail: { id, task, progress }`) plus `oas-tasks-change` (full list); releasing without movement dispatches nothing;
- Esc (or pointercancel) while dragging cancels → visual rollback, zero events; rewriting `tasks` externally mid-drag aborts the drag (external data wins);
- With a bar focused, **Shift + ←/→** reschedules by one unit (mirrored in RTL).

## Readonly Levels + Per-task Disable

<DemoBlock title="readonly (all) / dates-readonly (no rescheduling) / progress-readonly (no progress drag); readonly states render no drag handles (visual = semantics)">
  <div style="display:flex;flex-direction:column;gap:var(--oas-space-4)">
    <div>
      <div style="font-size:var(--oas-font-size-sm);color:var(--oas-color-text-secondary);margin-bottom:var(--oas-space-1)">readonly: whole chart read-only</div>
      <oas-gantt readonly tasks='[{"id":"r1","name":"Locked task","start":"2026-03-02","end":"2026-03-08","progress":60}]'></oas-gantt>
    </div>
    <div>
      <div style="font-size:var(--oas-font-size-sm);color:var(--oas-color-text-secondary);margin-bottom:var(--oas-space-1)">dates-readonly: dates locked, progress still draggable</div>
      <oas-gantt dates-readonly tasks='[{"id":"r2","name":"Dates locked","start":"2026-03-02","end":"2026-03-08","progress":60}]'></oas-gantt>
    </div>
    <div>
      <div style="font-size:var(--oas-font-size-sm);color:var(--oas-color-text-secondary);margin-bottom:var(--oas-space-1)">progress-readonly: progress locked, dates still draggable</div>
      <oas-gantt progress-readonly tasks='[{"id":"r3","name":"Progress locked","start":"2026-03-02","end":"2026-03-08","progress":60}]'></oas-gantt>
    </div>
  </div>
</DemoBlock>

`disabled: true` in task data disables that single bar (others unaffected).

## Today Line & Weekend/Holiday Highlights

<DemoBlock title="Today line (show-today on by default) + weekend column highlights (weekends on by default) + holidays (demo range dynamically covers today)">
  <oas-gantt id="gantt-today" height="200"></oas-gantt>
</DemoBlock>

<DemoBlock title="Today line off / weekend highlights off / holiday highlights (holidays JSON)">
  <div style="display:flex;flex-direction:column;gap:var(--oas-space-4)">
    <oas-gantt show-today="false" weekends="false" tasks='[{"id":"n1","name":"No today line, no weekend tint","start":"2026-03-02","end":"2026-03-08"}]'></oas-gantt>
    <oas-gantt holidays='["2026-03-04","2026-03-11"]' tasks='[{"id":"n2","name":"Holiday columns highlighted","start":"2026-03-02","end":"2026-03-13"}]'></oas-gantt>
  </div>
</DemoBlock>

The today line is decorative (`aria-hidden`) and renders only when today falls inside the axis range; weekend/holiday column tints apply on the day/hour tiers.

## Row Virtualization (10k-scale tasks)

<DemoBlock title="height + row-height enable viewport windowing (300 rows demoed; only the visible window + buffer renders)">
  <oas-gantt id="gantt-virtual" height="240" row-height="32"></oas-gantt>
  <div style="font-size:var(--oas-font-size-sm);color:var(--oas-color-text-secondary);margin-top:var(--oas-space-2)">Methods: <oas-button id="gantt-jump" size="small">scrollToTask row 250</oas-button></div>
</DemoBlock>

Methods: `scrollToTask(id)` to bring a task row into view, `scrollToDate(date)` / `scrollToToday()` for horizontal positioning, `updateTask(id, patch)` for single-task incremental updates (sanitized, dispatches `oas-tasks-change`).

## Controlled Expansion / Labels & Snapping / Localization

<DemoBlock title="expanded as a controlled set (JSON array = expanded set; explicit [] collapses all) + label-position (default none, since the row-name column already shows names; inside / right must be opted in)">
  <div style="display:flex;flex-direction:column;gap:var(--oas-space-4)">
    <oas-gantt expanded='["p1"]' label-position="inside" tasks='[{"id":"p1","name":"Phase 1","start":"2026-03-02","end":"2026-03-13","type":"summary","children":[{"id":"w1","name":"Design","start":"2026-03-02","end":"2026-03-06","progress":80},{"id":"w2","name":"Coding","start":"2026-03-04","end":"2026-03-13","progress":35}]},{"id":"p2","name":"Phase 2","start":"2026-03-16","end":"2026-03-20","type":"summary","children":[{"id":"w3","name":"Acceptance","start":"2026-03-16","end":"2026-03-20"}]}]'></oas-gantt>
    <oas-gantt label-position="right" tasks='[{"id":"l1","name":"Label to the right","start":"2026-03-02","end":"2026-03-06","progress":60},{"id":"l2","name":"Default none: bar only, no label","start":"2026-03-09","end":"2026-03-13","progress":30}]'></oas-gantt>
  </div>
</DemoBlock>

<DemoBlock title="snap=false (pixel-ratio shift keeps time precision) + locale / first-day-of-week">
  <div style="display:flex;flex-direction:column;gap:var(--oas-space-4)">
    <oas-gantt snap="false" tasks='[{"id":"sf1","name":"Unsnapped dragging (shifts by pixel ratio)","start":"2026-03-02","end":"2026-03-06","progress":50}]'></oas-gantt>
    <oas-gantt locale="en" first-day-of-week="0" tasks='[{"id":"sf2","name":"English locale, week starts on Sunday","start":"2026-03-02","end":"2026-03-13","progress":20}]'></oas-gantt>
  </div>
</DemoBlock>

`template[slot="task"]` overrides in-bar label content (`[data-task-name]` binding; labels are not rendered by default with `label-position="none"`, so the template takes effect only after opting in); each rendered bar dispatches `oas-task-render` (`detail: { task, element }`) so hosts can rewrite its DOM.

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  await customElements.whenDefined('oas-gantt')
  const out = document.getElementById('gantt-output')

  // Today-line demo: the range dynamically covers today (guarantees the line falls inside the axis)
  const today = document.getElementById('gantt-today')
  if (today) {
    const iso = (d) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const s = new Date()
    s.setDate(s.getDate() - 4)
    const e = new Date()
    e.setDate(e.getDate() + 10)
    today.tasks = [
      { id: 'td0', name: 'Range covering today (today line + weekend tint)', start: iso(s), end: iso(e), progress: 45 },
    ]
  }

  // Virtual scrolling demo: 300 rows
  const virtual = document.getElementById('gantt-virtual')
  if (virtual) {
    const tasks = []
    for (let i = 0; i < 300; i++) {
      const day = (i % 20) + 1
      tasks.push({
        id: `v${i}`,
        name: `Task ${i + 1} (batch ${Math.floor(i / 25) + 1})`,
        start: `2026-03-${String(day).padStart(2, '0')}`,
        end: `2026-03-${String(Math.min(day + 3, 28)).padStart(2, '0')}`,
        progress: (i * 7) % 100,
      })
    }
    virtual.tasks = tasks
    document.getElementById('gantt-jump')?.addEventListener('oas-click', () => virtual.scrollToTask('v249'))
  }

  // Scale switching (host segmented → scale attribute)
  const scaleSwitch = document.getElementById('gantt-scale-switch')
  const ganttScale = document.getElementById('gantt-scale')
  if (scaleSwitch && ganttScale) {
    scaleSwitch.addEventListener('oas-change', (e) => {
      ganttScale.setAttribute('scale', e.detail.value)
    })
  }

  // Event feedback output
  const basic = document.getElementById('gantt-basic')
  if (basic && out) {
    const show = (text) => {
      out.textContent = text
    }
    basic.addEventListener('oas-task-click', (e) => {
      const d = e.detail
      show(`oas-task-click: ${d.task.name} (id=${d.id}) — open a detail view here`)
    })
    basic.addEventListener('oas-task-dblclick', (e) => {
      const d = e.detail
      show(`oas-task-dblclick: ${d.task.name} — attach an edit form here`)
    })
    basic.addEventListener('oas-expand-change', (e) => {
      const d = e.detail
      show(`oas-expand-change: ${d.id} → ${d.expanded ? 'expanded' : 'collapsed'}`)
    })
    basic.addEventListener('oas-task-change', (e) => {
      const d = e.detail
      show(`oas-task-change: ${d.id} ${d.oldStart} → ${d.start} (written back to tasks)`)
    })
    basic.addEventListener('oas-progress-change', (e) => {
      const d = e.detail
      show(`oas-progress-change: ${d.id} → ${d.progress}%`)
    })
    basic.addEventListener('oas-tasks-change', () => show(`oas-tasks-change: ${basic.tasks.length} tasks now`))
  }
})
</script>

## API

### oas-gantt

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `dates-readonly` | No rescheduling/resizing (progress still draggable) | `boolean` | — |
| `expanded` | Expanded set (JSON array, controlled): defaults to fully expanded when absent; explicit [] collapses all; written back on toggle | `string` | — |
| `first-day-of-week` | Week start day (0-6); defaults to locale derivation (used for week-tier alignment) | `string` | — |
| `height` | Component height in px (default 320) | `string` | `320` |
| `holidays` | Holiday list (JSON ["YYYY-MM-DD",…]): matching columns highlighted (takes precedence over weekend tint) | `string` | — |
| `label-position` | Bar label position: inside / right / left; default `none` (the row-name column already shows the name, so the bar does not repeat it); invalid values fall back to `none` | `string` | — |
| `locale` | Localization (overrides config-provider injection and the global locale) | `string` | — |
| `progress-readonly` | No progress dragging (dates still draggable) | `boolean` | — |
| `readonly` | Whole chart read-only (no rescheduling/progress, drag handles not rendered) | `boolean` | — |
| `row-height` | Row height in px (default 36, minimum 20) | `string` | `36` |
| `scale` | Time scale: hour / day (default) / week / month / quarter / year; invalid values fall back to day | `string` | — |
| `show-today` | Today line (on by default; false to disable) | `string` | — |
| `snap` | Snap drags to the current scale unit (on by default; false shifts by pixel ratio and keeps time precision) | `string` | — |
| `tasks` | Gantt tasks (JSON): [{ id?, name, start, end?, type?, progress?, parent?, children?, dependencies?, color?, disabled?, expanded? }] — flat parent pointers are the primary contract; nested children are flattened automatically; explicit type:"milestone" takes precedence (rendered as milestone even with end, which is ignored) but a task with children is always a summary; no end also infers milestone; start/end are swapped automatically when start is after end | `GanttTask[]` | `[]` |
| `weekends` | Weekend column highlights (on by default; applies on day/hour tiers; false to disable) | `string` | — |

#### Property (JS property only, not reflected as attribute)

| Property | Description | Type | Default |
| --- | --- | --- | --- |
| `tasks` | Gantt tasks (`GanttTask[]`): `el.tasks` reads (copy; nested input already flattened to parent pointers); `el.tasks = [...]` writes (syncs the tasks attribute + re-renders + dispatches oas-tasks-change) | `GanttTask[]` | `[]` |

#### Events

| Event | Description |
| --- | --- |
| `oas-expand-change` | Dispatched on row tree collapse/expand, detail: { id, expanded } |
| `oas-progress-change` | Dispatched when a progress handle drag settles, detail: { id, task, progress } |
| `oas-scale-change` | Dispatched when the scale attribute changes, detail: { scale }; not dispatched on initial absorption |
| `oas-task-change` | Dispatched when a drag/resize/keyboard reschedule settles (pointerup), detail: { id, task, oldStart, oldEnd, start, end }; not dispatched on zero movement |
| `oas-task-click` | Dispatched on task bar/milestone click, detail: { id, task } |
| `oas-task-dblclick` | Dispatched on task bar double-click, detail: { id, task } — hosts attach an edit form |
| `oas-task-render` | Dispatched after each task bar renders, detail: { task, element } — hosts may rewrite bar DOM |
| `oas-tasks-change` | Dispatched on task data change (programmatic tasks write / updateTask / drag write-back), detail: { tasks } |

#### Slots

| Name | Description |
| --- | --- |
| `template[slot="empty"]` | Empty-state content (defaults to "No tasks") |
| `template[slot="task"]` | Task bar label template (cloned into the bar; [data-task-name] nodes get the task name) |
| `template[slot="tooltip"]` | Hover tooltip template ([data-task-name] / [data-task-range] / [data-task-progress] bind points) |

#### CSS Variables

| CSS Variable | Default |
| --- | --- |
| `--oas-gantt-bar-bg` | `color-mix(in srgb, var(--oas-gantt-bar-color, var(--oas-color-primary)) 22%, transparent)` |
| `--oas-gantt-bar-height` | `22px` |
| `--oas-gantt-bar-progress-bg` | `var(--oas-gantt-bar-color, var(--oas-color-primary))` |
| `--oas-gantt-grid-line-color` | `var(--oas-color-border)` |
| `--oas-gantt-header-bg` | `var(--oas-color-bg)` |
| `--oas-gantt-header-height` | `44px` |
| `--oas-gantt-height` | `320px` |
| `--oas-gantt-holiday-bg` | `color-mix(in srgb, var(--oas-color-warning) 12%, transparent)` |
| `--oas-gantt-link-color` | `var(--oas-color-primary)` |
| `--oas-gantt-list-width` | `220px` |
| `--oas-gantt-milestone-color` | `var(--oas-color-warning)` |
| `--oas-gantt-row-height` | `36px` |
| `--oas-gantt-summary-bg` | `var(--oas-color-text-secondary-strong)` |
| `--oas-gantt-today-color` | `var(--oas-color-danger)` |
| `--oas-gantt-weekend-bg` | `color-mix(in srgb, var(--oas-color-bg-hover) 60%, transparent)` |
