# Scheduler

Month-view scheduling component (L3 capability subpath): renders event chips (title + color bar) inside day cells; `events` read/write channel plus `addEvent` / `updateEvent` / `removeEvent` CRUD methods; clicking a chip dispatches `oas-event-click`, clicking a day dispatches `oas-day-click` (host attaches an editor), and any data change dispatches `oas-events-change`.

## Basic Usage

<DemoBlock title="Week start & locale (first-day-of-week + locale)">
  <oas-scheduler page-show-date="2026-08-01" first-day-of-week="1" locale="en"></oas-scheduler>
</DemoBlock>

<DemoBlock title="Month view + event chips (title / color bar / +N collapse)">
  <oas-scheduler id="scheduler-basic" page-show-date="2026-08-01" events='[{"date":"2026-08-08","title":"Release v2.6","color":"#dc2626"},{"date":"2026-08-08","title":"Green regressions"},{"date":"2026-08-15","title":"Review meeting"},{"date":"2026-08-22","title":"Review alignment","color":"#059669"},{"date":"2026-08-22","title":"Docs batch"},{"date":"2026-08-22","title":"Finalize"}]'></oas-scheduler>
</DemoBlock>

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
})
</script>
