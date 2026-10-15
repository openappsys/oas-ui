# Gantt

Project-scheduling chart component (data family): a WBS row tree (parent summary bars span the union of their children's time) against a horizontal time axis, with three bar forms (task / milestone / summary) plus progress fill; dependency links (FS/SS/FF/SF, drawn on a single SVG overlay); a drag trio (drag to reschedule, edge handles to resize, in-bar handle to change progress — written back once on pointerup with events); six time scales (hour/day/week/month/quarter/year) with a two-tier header; today line and weekend/holiday column highlights; row virtualization for tens of thousands of tasks; three readonly levels plus per-task disabling. The data contract is a flat `parent` pointer list (nested `children` input is flattened automatically).

## Basic Usage

<DemoBlock title="WBS row tree + dependency links + milestones + progress (tasks JSON; flat parent / nested children both accepted)">
  <oas-gantt id="gantt-basic" tasks='[{"id":"p1","name":"Phase 1: Foundation","start":"2026-03-02","end":"2026-03-13","type":"summary","children":[{"id":"t1","name":"Requirements","start":"2026-03-02","end":"2026-03-06","progress":40},{"id":"t2","name":"Development","start":"2026-03-05","end":"2026-03-13","progress":20,"dependencies":[{"id":"t1"}]}]},{"id":"p2","name":"Phase 2: Release","start":"2026-03-16","end":"2026-03-20","type":"summary","expanded":false,"children":[{"id":"t3","name":"Regression","start":"2026-03-16","end":"2026-03-18","dependencies":[{"id":"t2"}]},{"id":"m1","name":"v1.0 Launch","start":"2026-03-20"}]},{"id":"t9","name":"Docs","start":"2026-03-09","end":"2026-03-12","progress":70,"dependencies":[{"id":"t2","type":"ss"}]}]'></oas-gantt>
  <div id="gantt-output" style="color:var(--oas-color-text-secondary);font-size:var(--oas-font-size-sm);margin-top:var(--oas-space-2)"></div>
</DemoBlock>

- Parent tasks render **summary bars** (time = union of children, progress = duration-weighted average); the row toggle collapses/expands children; the expanded set is written back to the `expanded` attribute (JSON array) with `oas-expand-change`; collapsed sub-rows hide together with their dependency links (links follow row visibility, they do not reroute to the summary bar);
- **Milestones** render as diamonds: an explicit `type: "milestone"` takes precedence (a task renders as a milestone even when it carries `end`; the `end` is ignored with a one-time `console.warn` about the data conflict); tasks without `end` also infer as milestones; **a task with children always renders as a summary bar** (children carry the aggregation semantics, so form and aggregation must agree; a one-time `console.warn` about the data conflict fires only when `type: "milestone"` is also declared explicitly); a `start` after `end` (reversed dates) is swapped automatically at the sanitize layer with a one-time `console.warn` (no 2px ghost bar);
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
- With a bar focused, **Shift + ←/→** reschedules by one unit (mirrored in RTL);
- While dragging a bar / resizing / drawing a link, moving near a viewport edge **auto-scrolls** horizontally and vertically (faster the closer to the edge; stops at the boundary); row reorder auto-scrolls vertically only.

## Row Reparent / Reorder (reparent)

<DemoBlock title="Drag a left-column row: top/bottom half = before/after the target (same level), pointer deep to the right = become a child of the target; settles with oas-reparent">
  <oas-gantt id="gantt-reparent" tasks='[{"id":"p1","name":"Phase 1","start":"2026-03-02","end":"2026-03-13","type":"summary","children":[{"id":"w1","name":"Design","start":"2026-03-02","end":"2026-03-06"},{"id":"w2","name":"Build","start":"2026-03-05","end":"2026-03-13"}]},{"id":"w3","name":"QA (drag me)","start":"2026-03-16","end":"2026-03-20"},{"id":"w4","name":"Launch (drag me)","start":"2026-03-23","end":"2026-03-27"}]'></oas-gantt>
  <div id="gantt-reparent-output" style="color:var(--oas-color-text-secondary);font-size:var(--oas-font-size-sm);margin-top:var(--oas-space-2)"></div>
</DemoBlock>

Drag a left-column row onto a target: the **top half** inserts before the target (same level); the **bottom half** inserts after it (same level); a pointer **deep to the right** makes it a child of the target. On settle it dispatches `oas-reparent` (`detail: { id, parent, index }`, `parent` null means root level) plus `oas-tasks-change` (full list). Dropping a parent into its own descendant is rejected (cycle guard, zero events); `readonly` or a per-task `disabled` never starts the drag; `Esc` / `pointercancel` cancels with zero events.

## Dependency Link Editing

<DemoBlock title="Hover a bar for link dots: drag from the left/right dot onto a target task to create a dependency (endpoints pick FS/SS/FF/SF); click a link to select, then Delete to remove">
  <oas-gantt id="gantt-link" tasks='[{"id":"l1","name":"Design","start":"2026-03-02","end":"2026-03-06"},{"id":"l2","name":"Build","start":"2026-03-09","end":"2026-03-13"},{"id":"l3","name":"Test","start":"2026-03-16","end":"2026-03-20","dependencies":[{"id":"l2"}]}]'></oas-gantt>
  <div id="gantt-link-output" style="color:var(--oas-color-text-secondary);font-size:var(--oas-font-size-sm);margin-top:var(--oas-space-2)"></div>
</DemoBlock>

Hovering a bar reveals two **link dots**: drag the right (finish) dot onto a target bar to create a dependency; the left (start) dot works the same way. A **milestone** has start == end, so it shows a single finish dot (fs convention; its ss/sf as a predecessor are equivalent to fs/ff). The drop side of the target — **left half** (start) / **right half** (finish) — combined with the source endpoint picks the type (FS / SS / FF / SF). The dependency is recorded on the **successor** task. Click an existing link to **select** (highlighted), then press `Delete` / `Backspace` to remove it (only while the component holds focus; host inputs are not hijacked; pressing Delete on a focused task bar does not delete a selected link). On settle it dispatches `oas-dependencies-change` (`detail: { taskId, dependencies }`) plus `oas-tasks-change`. With `readonly`, link dots and hit areas are not rendered and removal is disabled; `Esc` / `pointercancel` cancels with zero events. On touch, tap a bar to reveal its link dots; a link hit path is focusable and Enter/Delete removes that dependency.

## Multi-select, Rename & Keyboard

<DemoBlock title="Click a row to select (Ctrl/Cmd adds, Shift for a range); double-click the name to rename; Delete removes the selection; Alt+↑/↓ reorder siblings, Alt+←/→ outdent/indent; focus a link and press Enter to delete">
  <oas-gantt id="gantt-select" tasks='[{"id":"s1","name":"Requirements","start":"2026-03-02","end":"2026-03-06"},{"id":"s2","name":"Build","start":"2026-03-05","end":"2026-03-13"},{"id":"s3","name":"Test","start":"2026-03-16","end":"2026-03-20"},{"id":"s4","name":"Launch","start":"2026-03-23","end":"2026-03-27"}]'></oas-gantt>
  <div id="gantt-select-output" style="color:var(--oas-color-text-secondary);font-size:var(--oas-font-size-sm);margin-top:var(--oas-space-2)"></div>
</DemoBlock>

- **Multi-select**: click a left row name to select (single); Ctrl/Cmd click toggles; Shift click selects a range; state is exposed via the `selection` property (id array, readable/writable) and the `oas-selection-change` event. Delete/Backspace removes the selection (with descendants), or call `removeTasks(ids)`.
- **Inline rename**: double-click a name → input (Enter commits / Esc restores / blur commits), updates `name` and dispatches `oas-tasks-change`.
- **Keyboard**: with a row focused, ↑/↓ move focus, Space selects, Alt+↑/↓ reorder among siblings, Alt+→ indents under the previous sibling, Alt+← outdents, F2 renames; a link hit path is focusable, Enter/Delete removes that dependency (focus returns to the component after removal, so the keyboard position is not lost).
- **Accessibility**: the name column is a `role="tree"`; each `treeitem` carries `aria-level` / `aria-posinset` / `aria-setsize` (full sibling set, including collapsed children; dangling/cyclic parents count as roots); selection mirrors to `aria-selected` and expansion to `aria-expanded`.
- **Touch**: tap a bar to reveal its link dots (no hover); the drag handle (⋮⋮) at the start of a left row drives touch **row reorder** (a full-row vertical drag conflicts with list scrolling on touch, so the handle carries it; the handle owns the gesture while the rest of the row still scrolls). A plain tap on the handle does not change selection.

## Task Management (Create / Edit / Dependencies / Export)

Drive create/update/delete with **imperative methods** instead of rewriting `tasks` wholesale (writes go through the sanitizer and dispatch `oas-tasks-change`):

- `addTask(task?, opts?)`: add a task, returns the new id; `opts: { parent?, before?, after? }`. Defaults: name from i18n `gantt.newTask`, start = today, non-milestone gets a 1-day (inclusive) end.
- `moveTask(id, { parent?, index? })`: reparent / reorder; dispatches `oas-reparent` + `oas-tasks-change`.
- `duplicateTask(id, opts?)`: deep-copy the task and its subtree (fresh ids), right after the original subtree; returns the new root id.
- `addDependency(taskId, dep)` / `removeDependency(taskId, dep)` / `updateDependency(taskId, from, to)`: add / remove / rewrite a dependency (`dep: { id, type? }`); dispatches `oas-dependencies-change`.
- `updateTasks(patches)`: batch shallow-merge (`[{ id, ...patch }]`), returns the applied count, dispatches a single `oas-tasks-change`.
- Zoom: `zoomIn()` / `zoomOut()` step through the six scales; `fit()` picks the finest scale that still fits all tasks.
- Attribute **`creatable`** (boolean, off by default): enables the trailing "＋" per row (adds a subtask on summary rows, a sibling after on leaf rows) and **double-click empty space to create a task at the clicked date**; the new task enters inline rename. No button on readonly / per-task-disabled rows.
- Event **`oas-task-add`** (detail `{ id, task }`): dispatched after imperative or inline creation, so the host can locate and open an editor.

<DemoBlock title="Imperative task management: add / duplicate selected / add dependency / delete selected / zoom / export; creatable inline add (click the trailing + or double-click empty space)">
  <div style="display:flex;gap:var(--oas-space-2);flex-wrap:wrap;margin-bottom:var(--oas-space-2)">
    <oas-button id="gantt-tm-add" size="small">Add task</oas-button>
    <oas-button id="gantt-tm-copy" size="small">Duplicate selected</oas-button>
    <oas-button id="gantt-tm-dep" size="small">Add dependency (selected → next)</oas-button>
    <oas-button id="gantt-tm-del" size="small" variant="outline">Delete selected</oas-button>
    <oas-button id="gantt-tm-progress" size="small" variant="outline">Progress +10</oas-button>
    <oas-button id="gantt-tm-zoomout" size="small" variant="outline">Zoom out</oas-button>
    <oas-button id="gantt-tm-zoomin" size="small" variant="outline">Zoom in</oas-button>
    <oas-button id="gantt-tm-fit" size="small" variant="outline">Fit</oas-button>
    <oas-button id="gantt-tm-save" size="small" variant="outline">Export JSON</oas-button>
  </div>
  <oas-gantt id="gantt-tm" creatable height="260"></oas-gantt>
  <div id="gantt-tm-output" style="color:var(--oas-color-text-secondary);font-size:var(--oas-font-size-sm);margin-top:var(--oas-space-2)"></div>
</DemoBlock>

Assemble a task detail editor with `oas-modal` + `oas-form` (the component only dispatches `oas-task-dblclick`; no built-in dialog):

```html
<oas-gantt id="g" creatable></oas-gantt>
<oas-modal id="edit" title="Edit task">
  <oas-form id="edit-form">
    <oas-form-item label="Name" name="name" required><oas-input name="name"></oas-input></oas-form-item>
    <oas-form-item label="Start" name="start" required><oas-date-picker name="start"></oas-date-picker></oas-form-item>
    <oas-form-item label="End" name="end"><oas-date-picker name="end"></oas-date-picker></oas-form-item>
    <oas-form-item label="Progress" name="progress"><oas-slider name="progress" show-value></oas-slider></oas-form-item>
  </oas-form>
</oas-modal>
<script>
  const g = document.getElementById('g')
  const modal = document.getElementById('edit')
  const form = document.getElementById('edit-form')
  const field = (name) => form.querySelector(`[name="${name}"]`)
  let editing = ''
  g.addEventListener('oas-task-dblclick', (e) => {
    editing = e.detail.id
    const t = e.detail.task
    field('name').value = t.name
    field('start').value = t.start
    field('end').value = t.end ?? ''
    field('progress').value = t.progress ?? 0
    modal.setAttribute('visible', '') // controlled open (the modal closes itself on OK)
  })
  modal.addEventListener('oas-ok', () => form.submit())
  form.addEventListener('oas-submit', (e) => {
    const v = e.detail.values // form values are always strings; coerce numeric fields as needed
    g.updateTask(editing, { ...v, progress: Number(v.progress) })
  })
</script>
```

> `oas-task-dblclick` / `oas-task-click` and `oas-task-render` let the host own editing and custom rendering; the component only guarantees a closed loop of data and interaction.

## Task Management Extras (Auto-scheduling / Marquee / Drag-to-create)

- **Dependency auto-scheduling**: `auto-schedule` (boolean, off by default) — after a date change (drag / keyboard / `updateTask` / `updateTasks`) or a dependency add/update, successors are pushed **minimally later** (duration preserved) along FS/SS/FF/SF; skips disabled and summary rows; cycle-safe; dispatches `oas-reschedule` (detail `{ ids }`) plus the resulting `oas-tasks-change`.
- **Marquee multi-select**: drag vertically on empty left-list space to select by row band; drag on empty timeline space (when `creatable` is off) to select by bar intersection; `Ctrl`/`Cmd` adds. The result is written to `selection` and dispatches `oas-selection-change`; marquee still works in readonly (selection is a view state).
- **Drag-to-create**: with `creatable` on, drag a range on empty timeline space to create a task spanning that range (double-click still creates a single-day task).

> Touch: a timeline-space drag conflicts with 2D scrolling, so **marquee / drag-to-create on the timeline do not claim touch gestures** (native scrolling is left alone); on touch, create via the trailing "+" or double-click, and marquee via a vertical drag on the left list. Under `auto-schedule`, when a **summary task is a predecessor**, its **aggregated descendant range** is used (the summary's own date fields are ignored).

<DemoBlock title="auto-schedule: drag the “Prototype” bar right and “Implementation” follows via FS; drag empty timeline space to create a task; drag empty left-list space to marquee-select rows">
  <oas-gantt id="gantt-auto" auto-schedule creatable height="240"></oas-gantt>
</DemoBlock>

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

`disabled: true` in task data locks only that task's own data: it cannot be dragged (as a source), cannot be a dependency **successor**, and cannot be a reparent **drop-inside** target; it can still act as another task's predecessor (link source) and as a reparent before/after sibling target.

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

## Baseline Comparison (show-baseline)

<DemoBlock title="show-baseline on: a translucent baseline bar under the actual bar, title showing the delta (N days later/earlier, or on baseline)">
  <oas-gantt show-baseline tasks='[{"id":"b1","name":"Design (actual 2d later)","start":"2026-03-02","end":"2026-03-06","progress":80,"baseline":{"start":"2026-03-02","end":"2026-03-04"}},{"id":"b2","name":"Build (on baseline)","start":"2026-03-05","end":"2026-03-13","progress":40,"baseline":{"start":"2026-03-05","end":"2026-03-13"}},{"id":"b3","name":"Test (actual 1d earlier)","start":"2026-03-16","end":"2026-03-18","progress":20,"baseline":{"start":"2026-03-16","end":"2026-03-19"}}]'></oas-gantt>
</DemoBlock>

With `show-baseline` on (off by default), a task carrying `baseline: { start, end? }` renders a translucent baseline bar under the actual bar; the bar `title` shows the actual-vs-baseline delta (N days later/earlier, or "on baseline"). Baseline data is owned by the host; the component is read-only on it. Baseline color comes from `--oas-gantt-baseline-color`.

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

  // Row reparent event feedback
  const reparent = document.getElementById('gantt-reparent')
  const rout = document.getElementById('gantt-reparent-output')
  if (reparent && rout) {
    reparent.addEventListener('oas-reparent', (e) => {
      const d = e.detail
      rout.textContent = `oas-reparent: ${d.id} → parent=${d.parent ?? '(root)'} (sibling #${d.index})`
    })
  }

  // Link editing event feedback
  const link = document.getElementById('gantt-link')
  const lout = document.getElementById('gantt-link-output')
  if (link && lout) {
    link.addEventListener('oas-dependencies-change', (e) => {
      const d = e.detail
      const list = d.dependencies.map((x) => `${x.id}(${x.type ?? 'fs'})`).join(', ') || '(none)'
      lout.textContent = `oas-dependencies-change: predecessors of ${d.taskId} = ${list}`
    })
  }

  // Multi-select feedback
  const sel = document.getElementById('gantt-select')
  const sout = document.getElementById('gantt-select-output')
  if (sel && sout) {
    const report = () => {
      const ids = sel.selection
      sout.textContent = ids.length
        ? `${ids.length} selected: ${ids.join(', ')}`
        : 'None selected (click a row; Ctrl adds; Shift for range; Delete removes)'
    }
    sel.addEventListener('oas-selection-change', report)
    report()
  }

  // Task-management demo: imperative CRUD + zoom + export
  const tm = document.getElementById('gantt-tm')
  const tmOut = document.getElementById('gantt-tm-output')
  if (tm && tmOut) {
    tm.tasks = [
      { id: 'd1', name: 'Discovery', start: '2026-03-02', end: '2026-03-06', progress: 100 },
      { id: 'd2', name: 'Prototype', start: '2026-03-05', end: '2026-03-11', progress: 60, dependencies: [{ id: 'd1' }] },
      { id: 'd3', name: 'Implementation', start: '2026-03-10', end: '2026-03-20', progress: 20, dependencies: [{ id: 'd2' }] },
      { id: 'd4', name: 'Acceptance', start: '2026-03-20' },
    ]
    const say = (m) => {
      tmOut.textContent = m
    }
    const on = (id, fn) => document.getElementById(id)?.addEventListener('click', fn)
    on('gantt-tm-add', () => say(`addTask → ${tm.addTask({ name: 'New task' })}`))
    on('gantt-tm-copy', () => {
      const id = tm.selection[0]
      const n = id ? tm.duplicateTask(id) : null
      say(n ? `duplicateTask(${id}) → ${n}` : 'Select a row first')
    })
    on('gantt-tm-dep', () => {
      const ids = tm.tasks.map((t) => t.id)
      const i = ids.indexOf(tm.selection[0])
      const next = ids[i + 1]
      const ok = i >= 0 && next ? tm.addDependency(next, { id: tm.selection[0] }) : false
      say(ok ? `dependency ${tm.selection[0]} → ${next}` : 'Select a row with a following task')
    })
    on('gantt-tm-del', () => {
      const sel = tm.selection
      if (!sel.length) return say('Select a row first')
      tm.removeTasks(sel)
      say(`removeTasks → removed ${sel.length}`)
    })
    on('gantt-tm-zoomin', () => say(`zoomIn → scale=${(tm.zoomIn(), tm.getAttribute('scale'))}`))
    on('gantt-tm-zoomout', () => say(`zoomOut → scale=${(tm.zoomOut(), tm.getAttribute('scale'))}`))
    on('gantt-tm-fit', () => say(`fit → scale=${(tm.fit(), tm.getAttribute('scale'))}`))
    on('gantt-tm-save', () => say(`export ${tm.tasks.length}: ${JSON.stringify(tm.tasks)}`))
    on('gantt-tm-progress', () => {
      const id = tm.selection[0]
      if (!id) return say('Select a row first')
      const cur = tm.tasks.find((t) => t.id === id)?.progress ?? 0
      const n = tm.updateTasks([{ id, progress: Math.min(100, cur + 10) }])
      say(`updateTasks → applied ${n}`)
    })
    say('Click the trailing + or double-click empty space to create; try the buttons for the imperative API')
  }

  // Task-management extras demo: auto-scheduling + marquee + drag-to-create
  const auto = document.getElementById('gantt-auto')
  if (auto) {
    auto.tasks = [
      { id: 'a1', name: 'Discovery', start: '2026-03-02', end: '2026-03-06' },
      { id: 'a2', name: 'Prototype', start: '2026-03-07', end: '2026-03-11', dependencies: [{ id: 'a1' }] },
      { id: 'a3', name: 'Implementation', start: '2026-03-12', end: '2026-03-18', dependencies: [{ id: 'a2' }] },
    ]
  }
})
</script>

## API

### oas-gantt

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `auto-schedule` | Dependency auto-scheduling (boolean, off by default): after a date change (drag/keyboard/updateTask/updateTasks) or a dependency add/update, successors are pushed minimally (later only, duration preserved) along FS/SS/FF/SF; skips disabled and summary rows; cycle-safe. Dispatches oas-reschedule | `string` | — |
| `creatable` | Inline creation (boolean, off by default): when enabled, a trailing "+" appears per row (adds a subtask on summary rows, a sibling after on leaf rows) and double-clicking empty space creates a task at the clicked date; the new task enters inline rename. No button on readonly or per-task-disabled rows | `boolean` | — |
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
| `show-baseline` | Baseline comparison (boolean, off by default): tasks with a baseline render a baseline bar under the actual bar, its title showing the delta (N days later/earlier than baseline, or on baseline) | `boolean` | — |
| `show-today` | Today line (on by default; false to disable) | `string` | — |
| `snap` | Snap drags to the current scale unit (on by default; false shifts by pixel ratio and keeps time precision) | `string` | — |
| `tasks` | Gantt tasks (JSON): [{ id?, name, start, end?, type?, progress?, parent?, children?, dependencies?, color?, disabled?, expanded?, baseline? }] — flat parent pointers are the primary contract; nested children are flattened automatically; explicit type:"milestone" takes precedence (rendered as milestone even with end, which is ignored) but a task with children is always a summary; no end also infers milestone; start/end are swapped automatically when start is after end | `GanttTask[]` | `[]` |
| `weekends` | Weekend column highlights (on by default; applies on day/hour tiers; false to disable) | `string` | — |

#### Property (JS property; see each row for attribute reflection)

| Property | Description | Type | Default |
| --- | --- | --- | --- |
| `selection` | Selected task ids (`string[]`): `el.selection` reads (copy); `el.selection = [...]` writes (re-renders selection + dispatches oas-selection-change); `removeTasks(ids)` batch-removes (with descendants) | `string[]` | — |
| `tasks` | Gantt tasks (`GanttTask[]`): `el.tasks` reads (copy; nested input already flattened to parent pointers); `el.tasks = [...]` writes (syncs the tasks attribute + re-renders + dispatches oas-tasks-change) | `GanttTask[]` | `[]` |

#### Events

| Event | Description |
| --- | --- |
| `oas-dependencies-change` | Dispatched when a link drag creates a dependency or a selected link is deleted, detail: { taskId, dependencies } (taskId is the successor whose dependencies changed) |
| `oas-expand-change` | Dispatched on row tree collapse/expand, detail: { id, expanded } |
| `oas-progress-change` | Dispatched when a progress handle drag settles, detail: { id, task, progress } |
| `oas-reparent` | Dispatched when a row drag reparent/reorder settles, detail: { id, parent, index } (parent null means root level; index is the sibling position) |
| `oas-reschedule` | Dispatched when auto-scheduling moved successor tasks (auto-schedule on), detail: { ids } (ids of the rescheduled tasks) |
| `oas-scale-change` | Dispatched when the scale attribute changes, detail: { scale }; not dispatched on initial absorption |
| `oas-selection-change` | Dispatched when the multi-select set changes (click / keyboard / property write), detail: { ids } (selected task ids) |
| `oas-task-add` | Dispatched after imperative creation (addTask / duplicateTask / creatable inline create), detail: { id, task } (id is the new task id) |
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

| CSS Variable | Description | Default |
| --- | --- | --- |
| `--oas-gantt-bar-bg` | — | `color-mix(in srgb, var(--oas-gantt-bar-color, var(--oas-color-primary)) 22%, var(--oas-color-bg))` |
| `--oas-gantt-bar-height` | — | `22px` |
| `--oas-gantt-bar-progress-bg` | — | `var(--oas-gantt-bar-color, var(--oas-color-primary))` |
| `--oas-gantt-baseline-color` | Baseline bar color (defaults to translucent secondary text color) | `color-mix(in srgb, var(--oas-color-text-secondary-strong) 55%, transparent)` |
| `--oas-gantt-grid-line-color` | — | `var(--oas-color-border)` |
| `--oas-gantt-header-bg` | — | `var(--oas-color-bg)` |
| `--oas-gantt-header-height` | — | `44px` |
| `--oas-gantt-height` | — | `320px` |
| `--oas-gantt-holiday-bg` | — | `color-mix(in srgb, var(--oas-color-warning) 12%, transparent)` |
| `--oas-gantt-link-color` | — | `var(--oas-color-primary)` |
| `--oas-gantt-list-width` | — | `220px` |
| `--oas-gantt-milestone-color` | — | `var(--oas-color-warning)` |
| `--oas-gantt-row-height` | — | `36px` |
| `--oas-gantt-summary-bg` | — | `var(--oas-color-text-secondary-strong)` |
| `--oas-gantt-today-color` | — | `var(--oas-color-danger)` |
| `--oas-gantt-weekend-bg` | — | `color-mix(in srgb, var(--oas-color-bg-hover) 60%, transparent)` |
