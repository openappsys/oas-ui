# Scheduler

Month-view scheduling component (L3 capability subpath): renders event chips (title + color bar) inside day cells; `events` read/write channel plus `addEvent` / `updateEvent` / `removeEvent` CRUD methods; clicking a chip dispatches `oas-event-click`, clicking a day dispatches `oas-day-click` (host attaches an editor), and any data change dispatches `oas-events-change`.

## Basic Usage

<DemoBlock title="Week start & locale (first-day-of-week + locale)">
  <oas-scheduler page-show-date="2026-08-01" first-day-of-week="1" locale="en"></oas-scheduler>
</DemoBlock>

<DemoBlock title="Month view + event chips (title / color bar / +N collapse)">
  <oas-scheduler id="scheduler-basic" page-show-date="2026-08-01" events='[{"date":"2026-08-08","title":"Release v2.6","color":"#dc2626"},{"date":"2026-08-08","title":"Green regressions"},{"date":"2026-08-15","title":"Review meeting"},{"date":"2026-08-22","title":"Review alignment","color":"#059669"},{"date":"2026-08-22","title":"Docs batch"},{"date":"2026-08-22","title":"Finalize"}]'></oas-scheduler>
</DemoBlock>

## Week / Day Views (P1)

<DemoBlock title="Week view (time axis + timed event blocks; all-day row on top)">
  <oas-scheduler id="scheduler-week" view="week" page-show-date="2026-08-10" start-hour="8" end-hour="20" events='[{"date":"2026-08-10","title":"Standup","start":"09:00","end":"10:00","color":"#dc2626"},{"date":"2026-08-10","title":"Review","start":"14:00","end":"15:30","color":"#059669"},{"date":"2026-08-11","title":"All-day activity"},{"date":"2026-08-13","title":"Review meeting","start":"10:30","end":"12:00"}]'></oas-scheduler>
</DemoBlock>

<DemoBlock title="Day view (single-column time axis) + oas-view-change">
  <oas-scheduler id="scheduler-day" view="day" page-show-date="2026-08-10" events='[{"date":"2026-08-10","title":"Standup","start":"09:00","end":"10:00"},{"date":"2026-08-10","title":"Review","start":"14:00","end":"15:30"}]'></oas-scheduler>
</DemoBlock>

Week/day views show a time axis (`start-hour` / `end-hour`, default 8–20): events with `start`/`end` are positioned as blocks by time; untimed events go to the all-day row on top; switching views via the header buttons dispatches `oas-view-change`. Event blocks support **drag-to-move** (drop on a target column/time to change `date` + `start`, keeping duration) and **bottom-edge drag-resize** (change `end` in 15-minute steps), written back with `oas-events-change` on settle.

## Recurrence & Reminders (P2)

<DemoBlock title="Recurrence rules (RRULE subset: daily/weekly/monthly + interval + until)">
  <oas-scheduler page-show-date="2026-08-01" events='[{"date":"2026-08-03","title":"Daily standup","repeat":{"freq":"daily"},"color":"#dc2626"},{"date":"2026-08-05","title":"Biweekly meeting","repeat":{"freq":"weekly","interval":2,"until":"2026-08-19"}},{"date":"2026-08-10","title":"Monthly review","repeat":{"freq":"monthly"}}]'></oas-scheduler>
</DemoBlock>

`repeat` expands occurrences from `date` by `freq` × `interval` (daily by day interval, weekly by week, monthly by same day-of-month), with `until` as the inclusive end; `el.events` still reads the raw entries (expansion happens only at render time).

<DemoBlock title="Reminders (remind minutes; oas-remind when due)">
  <oas-scheduler id="scheduler-remind" page-show-date="2026-08-10"></oas-scheduler>
  <div id="scheduler-remind-output" style="color:var(--oas-color-text-secondary);font-size:var(--oas-font-size-sm);margin-top:var(--oas-space-2)"></div>
</DemoBlock>

For events with `remind` (minutes), the component dispatches `oas-remind` (`detail: { id, event }`) at `start` − `remind` minutes (untimed events count as 00:00). Past/removed/disconnected events never fire.

## Timezone & Agenda View (P3)

<DemoBlock title="Agenda view (28-day chronological list from anchor)">
  <oas-scheduler view="agenda" page-show-date="2026-08-10" events='[{"date":"2026-08-10","title":"Standup","start":"09:00","end":"10:00","color":"#dc2626"},{"date":"2026-08-12","title":"Review","color":"#059669"},{"date":"2026-08-05","title":"Daily standup","repeat":{"freq":"daily"}}]'></oas-scheduler>
</DemoBlock>

`view="agenda"` lists events grouped by day for 28 days from the anchor (recurring events expanded): timed events show `start–end`, untimed events are labeled all-day; clicking a row dispatches `oas-event-click`, clicking a day header dispatches `oas-day-click`.

<DemoBlock title="Timezone (affects title/column headers and the today marker)">
  <oas-scheduler page-show-date="2026-08-10" timezone="Asia/Shanghai" events='[{"date":"2026-08-10","title":"Shanghai standup","start":"09:00","end":"10:00"}]'></oas-scheduler>
</DemoBlock>

`timezone` accepts an IANA name (e.g. `Asia/Shanghai` / `America/New_York` / `UTC`) and affects date formatting in the title/column headers and the today marker (via `Intl` timeZone); invalid values fall back to local.

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

## Scope

This phase (P0) is the month view + events CRUD; next: week/day views + drag move/resize (P1), recurrence rules + reminders (P2), timezone + agenda view (P3).

## API

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
})
</script>
