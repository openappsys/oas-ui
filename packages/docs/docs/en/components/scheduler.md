# Scheduler

Month-view scheduling component: renders event chips (title + color bar) inside day cells; `events` read/write channel plus `addEvent` / `updateEvent` / `removeEvent` CRUD methods; clicking a chip dispatches `oas-event-click`, clicking a day dispatches `oas-day-click` (host attaches an editor), and data changes made through the CRUD methods dispatch `oas-events-change` (writing via `setAttribute('events', …)` does not).

## Basic Usage

<DemoBlock title="Week start & locale (first-day-of-week + locale)">
  <oas-scheduler page-show-date="2026-08-01" first-day-of-week="1" locale="en"></oas-scheduler>
</DemoBlock>

<DemoBlock title="Month view + event chips (title / color bar / +N collapse)">
  <oas-scheduler id="scheduler-basic" page-show-date="2026-08-01" events='[{"date":"2026-08-08","title":"Release v2.6","color":"#dc2626"},{"date":"2026-08-08","title":"Green regressions"},{"date":"2026-08-15","title":"Review meeting"},{"date":"2026-08-22","title":"Review alignment","color":"#059669"},{"date":"2026-08-22","title":"Docs batch"},{"date":"2026-08-22","title":"Finalize"}]'></oas-scheduler>
</DemoBlock>

## Week / Day Views

<DemoBlock title="Week view (time axis + timed event blocks; all-day row on top)">
  <oas-scheduler id="scheduler-week" view="week" page-show-date="2026-08-10" start-hour="8" end-hour="20" events='[{"date":"2026-08-10","title":"Standup","start":"09:00","end":"10:00","color":"#dc2626"},{"date":"2026-08-10","title":"Review","start":"14:00","end":"15:30","color":"#059669"},{"date":"2026-08-11","title":"All-day activity"},{"date":"2026-08-13","title":"Review meeting","start":"10:30","end":"12:00"}]'></oas-scheduler>
</DemoBlock>

<DemoBlock title="Day view (single-column time axis) + oas-view-change">
  <oas-scheduler id="scheduler-day" view="day" page-show-date="2026-08-10" events='[{"date":"2026-08-10","title":"Standup","start":"09:00","end":"10:00"},{"date":"2026-08-10","title":"Review","start":"14:00","end":"15:30"}]'></oas-scheduler>
</DemoBlock>

Week/day views show a time axis (`start-hour` / `end-hour`, default 8–20): events with `start`/`end` are positioned as blocks by time; untimed events go to the all-day row on top; switching views via the header buttons dispatches `oas-view-change`. Event blocks support **drag-to-move** (drop on a target column/time to change `date` + `start`, keeping duration) and **bottom-edge drag-resize** (change `end` in 15-minute steps), written back with `oas-events-change` on settle.

## Recurrence & Reminders

<DemoBlock title="Recurrence rules (RRULE subset: daily/weekly/monthly + interval + until)">
  <oas-scheduler id="scheduler-repeat" page-show-date="2026-08-01" events='[{"date":"2026-08-03","title":"Daily standup","repeat":{"freq":"daily"},"color":"#dc2626"},{"date":"2026-08-05","title":"Biweekly meeting","repeat":{"freq":"weekly","interval":2,"until":"2026-08-19"}},{"date":"2026-08-10","title":"Monthly review","repeat":{"freq":"monthly"}}]'></oas-scheduler>
</DemoBlock>

`repeat` expands occurrences from `date` by `freq` × `interval` (daily by day interval, weekly by week, monthly by same day-of-month), with `until` as the inclusive end; `el.events` still reads the raw entries (expansion happens only at render time).
Monthly/weekly rules may also use `byMonth` (1-12), `byMonthDay` (1-31), `bySetPos` (for example `-1`), `byDay` (weekly, 0=Sunday…6=Saturday), and `exDates` (excluded dates, `YYYY-MM-DD`). Local occurrence filtering supports `byMonth` / `byMonthDay` / `byDay` / `exDates`, plus monthly `byMonthDay` + `bySetPos`; other `bySetPos` cases are emitted to ICS `RRULE` as-is.

<DemoBlock title="Multi-day all-day bars (continuous in week view; drag to shift as a whole)">
  <oas-scheduler view="week" page-show-date="2026-08-10" events='[{"date":"2026-08-10","endDate":"2026-08-12","title":"Design freeze"},{"date":"2026-08-13","endDate":"2026-08-14","title":"Regression window","color":"#059669"},{"date":"2026-08-12","endDate":"2026-08-13","title":"Night shift","start":"22:00","end":"02:00"}]'></oas-scheduler>
</DemoBlock>

In week view, an all-day event with `endDate` renders as one continuous bar in the all-day band (instead of one chip per day). Drag the bar horizontally to shift `date` / `endDate` by whole columns; the component dispatches `oas-events-change`. When the bar is focused, `←` / `→` shifts it by one day. Timed multi-day events also render as one continuous bar in the top multi-day band, with a `start–end` time label; the day time grid no longer duplicates per-day blocks.

<DemoBlock title="Reminders (remind minutes; oas-remind when due)">
  <oas-scheduler id="scheduler-remind" page-show-date="2026-08-10"></oas-scheduler>
  <div id="scheduler-remind-output" style="color:var(--oas-color-text-secondary);font-size:var(--oas-font-size-sm);margin-top:var(--oas-space-2)"></div>
</DemoBlock>

For events with `remind` (minutes), the component dispatches `oas-remind` (`detail: { id, event }`) at `start` − `remind` minutes (untimed events count as 00:00). Past/removed/disconnected events never fire.

<DemoBlock title="Host-expanded repeats: the base event has no repeat; each occurrence is sent with a unique id">
  <oas-scheduler page-show-date="2026-08-01" events='[{"id":"occ-1","date":"2026-08-03","title":"Standup (host 1)"},{"id":"occ-2","date":"2026-08-04","title":"Standup (host 2)"},{"id":"occ-3","date":"2026-08-05","title":"Standup (host 3)"}]'></oas-scheduler>
</DemoBlock>

> In windowed mode prefer this host-expanded form: the component will not expand the base event a second time.

## Timezone & Agenda View

<DemoBlock title="Agenda view (28-day chronological list from anchor)">
  <oas-scheduler id="scheduler-agenda" view="agenda" page-show-date="2026-08-10" events='[{"date":"2026-08-10","title":"Standup","start":"09:00","end":"10:00","color":"#dc2626"},{"date":"2026-08-12","title":"Review","color":"#059669"},{"date":"2026-08-05","title":"Daily standup","repeat":{"freq":"daily"}}]'></oas-scheduler>
</DemoBlock>

`view="agenda"` lists events grouped by day for 28 days from the anchor (recurring events expanded): timed events show `start–end`, untimed events are labeled all-day; clicking a row dispatches `oas-event-click`, clicking a day header dispatches `oas-day-click`.

<DemoBlock title="Timezone (affects title/column headers and the today marker)">
  <oas-scheduler page-show-date="2026-08-10" timezone="Asia/Shanghai" events='[{"date":"2026-08-10","title":"Shanghai standup","start":"09:00","end":"10:00"}]'></oas-scheduler>
</DemoBlock>

`timezone` accepts an IANA name (e.g. `Asia/Shanghai` / `America/New_York` / `UTC`) and affects date formatting in the title/column headers and the today marker (via `Intl` timeZone); invalid values fall back to local.

## Resource Views & Drag-to-Create

<DemoBlock title="Single-day resource view (view=resource: rows = resources, horizontal = hours)">
  <oas-scheduler id="scheduler-res-day" view="resource" page-show-date="2026-08-10" start-hour="8" end-hour="18" show-now="true" resources='[{"id":"a","title":"Room A","color":"#2563eb"},{"id":"b","title":"Room B"},{"id":"c","title":"Equipment"}]' events='[{"date":"2026-08-10","title":"Standup","start":"09:00","end":"10:00","resource":"a"},{"date":"2026-08-10","title":"Review","start":"14:00","end":"15:30","resource":"b"},{"date":"2026-08-10","title":"Maintenance","resource":"c"}]'></oas-scheduler>
</DemoBlock>

<DemoBlock title="Week x resource matrix (view=resource-week)">
  <oas-scheduler id="scheduler-res-week" view="resource-week" page-show-date="2026-08-10" resources='[{"id":"a","title":"Room A","color":"#2563eb"},{"id":"b","title":"Room B"}]' events='[{"date":"2026-08-10","title":"Standup","start":"09:00","end":"10:00","resource":"a"},{"date":"2026-08-11","title":"Review","start":"13:00","end":"14:00","resource":"b"},{"date":"2026-08-12","title":"All-day inspection","resource":"a"}]'></oas-scheduler>
</DemoBlock>

<DemoBlock title="Resource groups + secondary timezone (group + secondary-timezone)">
  <oas-scheduler id="scheduler-res-group" view="resource" page-show-date="2026-08-10" start-hour="8" end-hour="18" secondary-timezone="UTC" resources='[{"id":"a","title":"Room A","group":"East","color":"#2563eb"},{"id":"b","title":"Room B","group":"East"},{"id":"c","title":"Equipment","group":"Shared"}]' events='[{"date":"2026-08-10","title":"Standup","start":"09:00","end":"10:00","resource":"a"},{"date":"2026-08-10","title":"Review","start":"14:00","end":"15:30","resource":"b"}]'></oas-scheduler>
</DemoBlock>

<DemoBlock title="Drag to create (drag a range on an empty time cell → oas-create)">
  <oas-scheduler id="scheduler-create" view="day" page-show-date="2026-08-10" start-hour="8" end-hour="18" events='[{"date":"2026-08-10","title":"Standup","start":"09:00","end":"10:00"}]'></oas-scheduler>
  <div id="scheduler-create-output" style="color:var(--oas-color-text-secondary);font-size:var(--oas-font-size-sm);margin-top:var(--oas-space-2)"></div>
</DemoBlock>

<DemoBlock title="RTL (dir=rtl: resource timeline and resource column mirror)">
  <div dir="rtl">
    <oas-scheduler view="resource" page-show-date="2026-08-10" start-hour="8" end-hour="18" resources='[{"id":"a","title":"Room A","color":"#2563eb"},{"id":"b","title":"Room B"}]' events='[{"date":"2026-08-10","title":"Standup","start":"09:00","end":"10:00","resource":"a"},{"date":"2026-08-10","title":"Review","start":"14:00","end":"15:30","resource":"b"}]'></oas-scheduler>
  </div>
</DemoBlock>

`view="resource"` renders a single-day schedule with resources as rows and hours across; `view="resource-week"` is a week x resource matrix (rows = resources, columns = 7 days of the week). Events are assigned to a resource row via their `resource` field; absent or unknown ids go to the "Unassigned" row. Dragging a range (>=15 minutes) on an empty time cell dispatches `oas-create` (`detail: { date, start, end, resource? }`) — the component does not create the event; the host calls `addEvent`. A shorter drag is treated as a click and dispatches `oas-day-click`. `show-now` (on by default) renders a now line at the current time. A non-empty `resources[].group` inserts a group header row before its resources (once per name, input order preserved); windowed slices do not auto-generate group rows. `secondary-timezone` appends a second timezone label to the day/week/resource-day time gutter (invalid IANA is ignored with a devWarn).

## CRUD (method channel)

<DemoBlock title="addEvent / updateEvent / removeEvent + oas-events-change feedback">
  <div style="display:flex;gap:var(--oas-space-2);margin-bottom:var(--oas-space-2)">
    <oas-button id="scheduler-add" size="small">Add "Review"</oas-button>
    <oas-button id="scheduler-rename" size="small">Rename first</oas-button>
    <oas-button id="scheduler-remove" size="small">Remove first</oas-button>
  </div>
  <oas-scheduler id="scheduler-crud" page-show-date="2026-08-01" events='[{"date":"2026-08-08","title":"Release v2.6","color":"#dc2626"},{"date":"2026-08-08","title":"Green regressions"},{"date":"2026-08-15","title":"Review meeting"},{"date":"2026-08-22","title":"Review alignment","color":"#059669"},{"date":"2026-08-22","title":"Docs batch"},{"date":"2026-08-22","title":"Finalize"}]'></oas-scheduler>
  <div id="scheduler-crud-output" style="color:var(--oas-color-text-secondary);font-size:var(--oas-font-size-sm);margin-top:var(--oas-space-2)"></div>
</DemoBlock>

## Click Feedback (host integration)

<DemoBlock title="oas-event-click / oas-day-click host integration">
  <oas-scheduler id="scheduler-click" page-show-date="2026-08-01" events='[{"date":"2026-08-08","title":"Release v2.6","color":"#dc2626"},{"date":"2026-08-08","title":"Green regressions"},{"date":"2026-08-15","title":"Review meeting"},{"date":"2026-08-22","title":"Review alignment","color":"#059669"},{"date":"2026-08-22","title":"Docs batch"},{"date":"2026-08-22","title":"Finalize"}]'></oas-scheduler>
  <div id="scheduler-click-output" style="color:var(--oas-color-text-secondary);font-size:var(--oas-font-size-sm);margin-top:var(--oas-space-2)"></div>
</DemoBlock>

Clicking an event chip dispatches `oas-event-click` (`detail: { id, event }`, without triggering the day click); clicking an empty day cell dispatches `oas-day-click` (`detail: { date }`) — the host opens an editor/form there; the component ships no built-in edit form.

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  await customElements.whenDefined('oas-scheduler')
  const crud = document.getElementById('scheduler-crud')
  const out = document.getElementById('scheduler-crud-output')
  if (crud) {
    const report = () => {
      out.textContent = `oas-events-change: ${crud.events.length} items`
    }
    crud.addEventListener('oas-events-change', report)
    report()
    document.getElementById('scheduler-add')?.addEventListener('oas-click', () => crud.addEvent({ date: '2026-08-15', title: 'Review (new)' }))
    document.getElementById('scheduler-rename')?.addEventListener('oas-click', () => {
      const first = crud.events[0]
      if (first) crud.updateEvent(first.id, { title: `${first.title} (edited)` })
    })
    document.getElementById('scheduler-remove')?.addEventListener('oas-click', () => {
      const first = crud.events[0]
      if (first) crud.removeEvent(first.id)
    })
  }

  const ics = document.getElementById('scheduler-ics')
  document.getElementById('scheduler-ics-download')?.addEventListener('oas-click', () => {
    if (ics) ics.downloadIcs('oas-calendar.ics', { timeMode: 'utc', timezone: 'Asia/Shanghai' })
  })

  const click = document.getElementById('scheduler-click')
  const cout = document.getElementById('scheduler-click-output')
  if (click) {
    click.addEventListener('oas-event-click', (e) => {
      cout.textContent = `oas-event-click: ${e.detail.event.title} (id=${e.detail.id})`
    })
    click.addEventListener('oas-day-click', (e) => {
      cout.textContent = `oas-day-click: ${e.detail.date} (host may open an add form here)`
    })
  }

  const remind = document.getElementById('scheduler-remind')
  const rout = document.getElementById('scheduler-remind-output')
  if (remind) {
    const now = new Date()
    const iso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const startMin = (now.getHours() * 60 + now.getMinutes() + 2) % (24 * 60)
    const start = `${String(Math.floor(startMin / 60)).padStart(2, '0')}:${String(startMin % 60).padStart(2, '0')}`
    remind.events = [{ date: iso, title: 'Starts in 2 min (remind 1 min early)', start, remind: 1, color: '#d97706' }]
    remind.addEventListener('oas-remind', (e) => {
      rout.textContent = `oas-remind: ${e.detail.event.title} (reminder fired)`
    })
    rout.textContent = `Demo: oas-remind feedback appears here in about a minute`
  }

  const create = document.getElementById('scheduler-create')
  const crout = document.getElementById('scheduler-create-output')
  if (create) {
    create.addEventListener('oas-create', (e) => {
      const { date, start, end, resource } = e.detail
      create.addEvent({ date, title: 'New (dragged)', start, end, resource })
      crout.textContent = `oas-create: ${date} ${start}–${end}${resource ? ` (${resource})` : ''} → addEvent`
    })
  }
})
</script>

## Large datasets (virtualization)

In the resource view the resource rows, and in the `day` view the hour axis, render for the visible window only: the number of rendered rows/ticks does not grow with the dataset size, and spacers preserve the scroll range (total height invariant). After a scroll rebuild focus is restored by event id, and window rebuilds are suppressed while a drag/create gesture is active (so pointer capture is not destroyed). The resource view is capped by `--oas-scheduler-resource-max-height` (default 640px, matching the timeline); beyond that it scrolls internally and virtualizes. Resource rows and the timeline carry `aria-rowcount` and absolute `aria-rowindex`.

## Print preview

<DemoBlock title="Print: @media print hides the toolbar and removes agenda/resource scroll caps (opens the system print dialog)">
  <oas-button size="small" onclick="window.print()">Print current schedule</oas-button>
  <oas-scheduler id="scheduler-print" view="agenda" page-show-date="2026-08-10" events='[{"date":"2026-08-10","title":"Print demo","start":"09:00","end":"10:00"}]'></oas-scheduler>
</DemoBlock>

## Server-side resource row window (windowed) and printing

The resource views (`resource` / `resource-week`) support server-side slices: `windowed` + `total` + `window-start`, with `resources` carrying only `[window-start, window-start + resources.length)`. The component emits `oas-window-request` (absolute, half-open row range) when the visible window is not covered; the host responds with a new slice and updates `window-start`. `aria-rowcount` uses `total`, and `aria-rowindex` uses absolute row numbers.

- In windowed mode the component does not append an "Unassigned" row automatically; the host can provide the reserved id `__unassigned__`, and events with no/unknown `resource` are grouped there.
- Repeat events inside the loaded slice are still expanded locally; when the host expands occurrences it **must strip `repeat` from the base event (or stop sending the base series)**, otherwise the same day renders twice. Give each occurrence a unique id.
- Print CSS (`@media print`) hides the toolbar/view buttons and removes scroll caps (including agenda); `beforeprint` temporarily disables row/hour virtualization and prints the loaded slice (windowed omits spacer blank pages), and `afterprint` restores window rendering.

```html
<oas-scheduler
  view="resource"
  windowed
  total="500"
  window-start="100"
  resources='[{"id":"r100","title":"Resource 100"}]'
  events='[{"date":"2026-08-10","title":"Standup","start":"09:00","end":"09:30","resource":"r100"}]'
></oas-scheduler>
```

### Date-window recipe (host side)

The component currently only provides resource-row windowing; date-window fetching is the host's job. Recommended: derive the visible range from `page-show-date` + `view`, abort in-flight requests on view/page changes, and feed only that range's events.

```ts
const el = document.querySelector('oas-scheduler')
let ac: AbortController | null = null

async function loadWindow() {
  ac?.abort()
  ac = new AbortController()
  const anchor = el.getAttribute('page-show-date') // YYYY-MM-DD
  const view = el.getAttribute('view') ?? 'month'
  const days = view === 'day' ? 1 : view === 'week' || view === 'resource-week' ? 7 : view === 'agenda' ? 28 : 31
  const start = new Date(`${anchor}T00:00:00`)
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + days - 1)
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  const res = await fetch(`/api/events?start=${iso(start)}&end=${iso(end)}`, { signal: ac.signal })
  el.events = await res.json()
}

el.addEventListener('oas-view-change', loadWindow)
document.querySelector('[data-prev]')?.addEventListener('click', () => {
  el.setAttribute('page-show-date', prevAnchor(el.getAttribute('page-show-date')!))
  loadWindow()
})
```

> If the host expands `repeat`, strip it from base events and give every occurrence a unique id. Keep a small buffer around window boundaries to avoid a blank frame when paging.

## ICS Export

<DemoBlock title="Download current events as .ics (UTC + Asia/Shanghai)">
  <oas-button id="scheduler-ics-download" size="small">Download .ics</oas-button>
  <oas-scheduler id="scheduler-ics" view="week" page-show-date="2026-08-10" events='[{"date":"2026-08-10","title":"Standup","start":"09:00","end":"10:00"},{"date":"2026-08-11","endDate":"2026-08-12","title":"Design freeze"}]'></oas-scheduler>
</DemoBlock>

```ts
import { eventsToIcs } from '@oas-ui/ui'

const ics = el.exportIcs() // current events
const standalone = eventsToIcs(events, { calendarName: 'My Calendar' })
el.downloadIcs('my.ics', { timeMode: 'utc', timezone: 'Asia/Shanghai' })
```

- Events without `start` export as all-day events (`DTSTART/DTEND;VALUE=DATE`, end = next day; `endDate` supports multi-day all-day events).
- `timeMode`: `floating` (default, local wall time) / `utc` (converted with `timezone`, `Z` suffix) / `tzid` (`TZID` plus a fixed-offset `VTIMEZONE`; use `utc` for DST-accurate conversion).
- `repeat` maps to `RRULE:FREQ/INTERVAL/COUNT/BYDAY/BYMONTH/BYMONTHDAY/BYSETPOS/UNTIL` (`until` is inclusive); `exDates` emits `EXDATE;VALUE=DATE`; `remind` emits `VALARM` and `color` emits `X-OAS-COLOR`.
- `eventsToIcs(events, { rangeStart, rangeEnd })` exports only events intersecting the inclusive range; `el.exportIcs(options)` / `el.downloadIcs(filename, options)` pass the same fields through.
- Text is RFC 5545 escaped; output uses CRLF and 75-byte folding; invalid-date events are skipped. The `now` option fixes `DTSTAMP`.

## API

### oas-scheduler

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `end-hour` | Time axis end hour (> start-hour and <= 24, default 20) | `string` | `20` |
| `events` | Schedule events (JSON): [{ id?, date: YYYY-MM-DD, endDate?, title, color?, start?, end?, repeat? { freq, interval?, until?, count?, byDay? }, resource? }] — chips rendered in day cells (title + color bar), collapsed to +N beyond 2 | `SchedulerEvent[]` | `[]` |
| `first-day-of-week` | First day of week (0-6); defaults to locale-derived | `string` | — |
| `locale` | Localization (overrides config-provider injection and global locale) | `string` | — |
| `page-show-date` | Panel month anchor (controlled): yyyy-MM-dd; re-anchors the shown month on change | `string` | — |
| `resources` | Resources (JSON): [{ id, title, color?, group? }] — resource views group by resource; events whose resource is absent or unknown go to the 'Unassigned' row; a non-empty group inserts a group header row | `SchedulerResource[]` | `[]` |
| `secondary-timezone` | Secondary timezone (IANA): appends a second timezone label to day/week/resource-day time gutters; invalid values are ignored with a devWarn | `string` | — |
| `show-now` | Current-time line (on by default; false disables): renders a now line for today in week/day and single-day resource views | `string` | `true` |
| `start-hour` | Time axis start hour (0-23, default 8) | `string` | `8` |
| `timezone` | Timezone (IANA, e.g. Asia/Shanghai; empty = local): affects title/column date formatting and the today marker (via Intl timeZone); invalid values fall back to local | `string` | — |
| `total` | Total resource row count in windowed mode (must be positive); used for aria-rowcount and absolute row indices. | `string` | — |
| `view` | View: month (default) / week / day / agenda / resource / resource-week; week/day views show a time axis with positioned event blocks (untimed events go to the all-day row); agenda shows a 28-day chronological list; resource is a single-day horizontal resource timeline, resource-week a week x resource matrix | `SchedulerView` | `month` |
| `window-start` | Absolute row index of the first loaded row in windowed mode. | `string` | `0` |
| `windowed` | Server-side resource row window mode (boolean, off by default): for resource / resource-week, resources carries only the [window-start, window-start + resources.length) slice; emits oas-window-request (absolute, half-open range) when the visible window is uncovered. The component does not auto-append an Unassigned row; the host may provide the reserved id `__unassigned__`. | `boolean` | — |

#### Property (JS property; see each row for attribute reflection)

| Property | Description | Type | Default |
| --- | --- | --- | --- |
| `events` | Schedule events (`SchedulerEvent[]`): `el.events` reads (copy incl. auto ids); `el.events = [...]` writes (syncs the events attribute + re-renders + dispatches oas-events-change) | `SchedulerEvent[]` | `[]` |
| `resources` | Resources (`SchedulerResource[]`): `el.resources` reads (copy); `el.resources = [...]` writes (syncs the resources attribute + re-renders) | `SchedulerResource[]` | `[]` |

#### Methods

| Method | Signature | Description |
| --- | --- | --- |
| `exportIcs` | `exportIcs(options?: IcsExportOptions): string` | 导出当前事件的 ICS 字符串（纯函数 eventsToIcs 的实例便捷通道；不触发重渲染） |
| `downloadIcs` | `downloadIcs(filename: unknown, options?: IcsExportOptions): string` | 下载当前事件的 ICS 文件（浏览器环境；返回生成的 ICS 字符串便于测试/宿主复用） |
| `addEvent` | `addEvent(ev: SchedulerEvent): string` | 新增事件：返回分配到的 id |
| `updateEvent` | `updateEvent(id: string, patch: Partial<SchedulerEvent>): boolean` | 按 id 更新事件（浅合并 patch 后走 sanitize 清洗；找不到返回 false） |
| `removeEvent` | `removeEvent(id: string): boolean` | 按 id 删除事件；找不到返回 false |

#### Events

| Event | Description |
| --- | --- |
| `oas-create` | Dispatched when an empty time cell is dragged out to a range of >=15 minutes, detail: { date, start, end, resource? } — the component does not create the event; the host calls addEvent. A shorter drag is treated as oas-day-click |
| `oas-day-click` | Dispatched when an empty day cell is clicked, detail: { date, resource? } (resource row id in resource views) — host attaches an add form |
| `oas-event-click` | Dispatched when an event chip is clicked, detail: { id, event } (does not trigger the day click) |
| `oas-events-change` | Dispatched on any events change (set/addEvent/updateEvent/removeEvent), detail: { events } |
| `oas-remind` | Dispatched when an event reminder is due, detail: { id, event } (fires at start - remind minutes via built-in timers) |
| `oas-view-change` | Dispatched on view switch (month/week/day/agenda), detail: { view }; not dispatched on initial attribute absorption |
| `oas-window-request` | Emitted in windowed mode when the visible resource-row window is not covered by the loaded slice; detail: { start, end, reason } (absolute, half-open; the same window is not emitted twice). |

#### CSS Variables

| CSS Variable | Default |
| --- | --- |
| `--oas-scheduler-resource-max-height` | `640px` |
