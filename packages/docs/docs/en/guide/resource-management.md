# Resource Management Example (Combined Example)

> This page is **not a new component**: it demonstrates how to combine `oas-resource` (swimlanes + load histogram) with `oas-card` (resource cards), `oas-checkbox` (assignment table) and the pure function `levelResources()` into an interactive resource management page. The resource cards and assignment table belong to the **host layer** (implemented by the page script); the component only handles swimlane/histogram rendering, overload detection and leveling.

## Runnable Combined Example

<DemoBlock title="Resource management page: cards + assignment table + swimlane load + one-click leveling (recalculated on every change)">
  <div id="rm-demo" style="width: 100%">
    <div class="rm-cards">
      <oas-card class="rm-card" data-rid="zhang">
        <div class="rm-card-head">
          <span class="rm-dot" style="background: var(--oas-color-primary)" aria-hidden="true"></span>
          <strong>Alice</strong>
        </div>
        <p class="rm-card-meta">Capacity 1 · Peak <span id="rm-peak-zhang">–</span> · Overloaded <span id="rm-over-days-zhang">–</span> days</p>
      </oas-card>
      <oas-card class="rm-card" data-rid="lisi">
        <div class="rm-card-head">
          <span class="rm-dot" style="background: var(--oas-color-success)" aria-hidden="true"></span>
          <strong>Bob</strong>
        </div>
        <p class="rm-card-meta">Capacity 1 · Peak <span id="rm-peak-lisi">–</span> · Overloaded <span id="rm-over-days-lisi">–</span> days</p>
      </oas-card>
      <oas-card class="rm-card" data-rid="wangwu">
        <div class="rm-card-head">
          <span class="rm-dot" style="background: var(--oas-color-warning)" aria-hidden="true"></span>
          <strong>Cara</strong>
        </div>
        <p class="rm-card-meta">Capacity 1 · Peak <span id="rm-peak-wangwu">–</span> · Overloaded <span id="rm-over-days-wangwu">–</span> days</p>
      </oas-card>
    </div>
    <div class="rm-table-wrap">
      <table class="rm-table" aria-label="Task assignment">
        <thead>
          <tr>
            <th scope="col">Task</th>
            <th scope="col">Dates</th>
            <th scope="col">Alice</th>
            <th scope="col">Bob</th>
            <th scope="col">Cara</th>
          </tr>
        </thead>
        <tbody id="rm-tbody"></tbody>
      </table>
    </div>
    <div class="rm-legend" aria-hidden="true">
      <span class="rm-legend-item"><i class="rm-dot" style="background: var(--oas-resource-load-bg)"></i>Load (parallel tasks)</span>
      <span class="rm-legend-item"><i class="rm-dot" style="background: var(--oas-color-danger)"></i>Overloaded (above capacity)</span>
    </div>
    <oas-resource id="rm-resource" capacity="1" show-load-values show-overload-badge bar-label height="560" scale="day"></oas-resource>
    <div class="rm-toolbar">
      <oas-button id="rm-level-btn" size="small">Level resources</oas-button>
      <oas-button id="rm-reset-btn" size="small">Reset example data</oas-button>
    </div>
    <p id="rm-result" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: var(--oas-space-2) 0 0"></p>
    <p id="rm-overload" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: var(--oas-space-1) 0 0"></p>
  </div>
</DemoBlock>

- **Recalculated on every change**: checking / unchecking a resource in the assignment table writes back to `tasks` immediately; the swimlanes, load histogram and resource cards are recomputed in sync.
- **One-click leveling**: calls the pure function `levelResources()` — durations are kept, later-only shifts; the result is merged back by id (never replaced wholesale), and shifted tasks get an "shifted +N days" tag in the dates column.
- **Overload status row**: refreshed by the host from the histogram's red pillars (`.pillar.over`) after the initial render and every recalculation; the `oas-overload` event updates it when the overload state changes (not dispatched when there is no overload, so the host needs its own fallback refresh).

## Host Implementation Notes

```ts
import { levelResources } from '@oas-ui/ui'

// The return value is only the shifted tasks (new dates) — merge by id, never replace wholesale
const moved = levelResources(resources, tasks, { scale: 'day' })
tasks = tasks.map((t) => moved.find((m) => m.id === t.id) ?? t)
```

- Each `oas-checkbox` in the assignment table has `value` set to the resource id; the checked state is derived by the host from `task.resources`, and after `oas-change` (`detail: { checked, value }`) the host updates the data and rebuilds the table.
- The cards' "peak / overloaded days" are expanded day by day by the host: peak = the maximum parallel task count on any single day; overloaded days = days where the parallel count exceeds the capacity (capacity 1 here).
- The card and table styles on this page are for demo purposes only; all colors use design tokens (`--oas-color-*`) and adapt to the dark theme automatically.

## Related

- Component contracts: [Resource](/en/components/resource) · [Card](/en/components/card) · [Checkbox](/en/components/checkbox)

<style>
.rm-cards {
  display: flex;
  flex-wrap: wrap;
  gap: var(--oas-space-3);
  width: 100%;
}
.rm-card {
  flex: 1 1 180px;
  min-width: 172px;
}
.rm-card-head {
  display: flex;
  align-items: center;
  gap: var(--oas-space-2);
}
.rm-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  flex-shrink: 0;
}
.rm-card-meta {
  margin: var(--oas-space-2) 0 0;
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-sm);
}
.rm-card.is-over {
  border-color: var(--oas-color-danger);
}
.rm-legend {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--oas-space-4);
  margin: var(--oas-space-3) 0 0;
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-xs);
}
.rm-legend-item {
  display: inline-flex;
  align-items: center;
  gap: var(--oas-space-1);
}
.rm-table-wrap {
  width: 100%;
  overflow-x: auto;
}
.vp-doc .rm-table {
  display: table;
  border-collapse: collapse;
  width: 100%;
  min-width: 480px;
}
.rm-table th,
.rm-table td {
  border: 1px solid var(--oas-color-border);
  padding: var(--oas-space-2) var(--oas-space-3);
  text-align: left;
  font-size: var(--oas-font-size-sm);
}
.rm-shifted {
  color: var(--oas-color-warning);
  font-size: var(--oas-font-size-xs);
  margin-left: var(--oas-space-1);
  white-space: nowrap;
}
.rm-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--oas-space-3);
  width: 100%;
}
</style>

<script setup>
import { onMounted } from 'vue'

onMounted(async () => {
  const RESOURCES = [
    { id: 'zhang', name: 'Alice', capacity: 1 },
    { id: 'lisi', name: 'Bob', capacity: 1 },
    { id: 'wangwu', name: 'Cara', capacity: 1 },
  ]
  const INITIAL_TASKS = [
    { id: 't1', name: 'Requirement review', start: '2026-03-02', end: '2026-03-03', resources: ['zhang'] },
    { id: 't2', name: 'API design', start: '2026-03-03', end: '2026-03-05', resources: ['zhang', 'lisi'] },
    { id: 't3', name: 'Frontend', start: '2026-03-04', end: '2026-03-08', resources: ['lisi'] },
    { id: 't4', name: 'Backend', start: '2026-03-04', end: '2026-03-08', resources: ['zhang', 'wangwu'] },
    { id: 't5', name: 'Integration test', start: '2026-03-09', end: '2026-03-10', resources: ['lisi', 'wangwu'] },
    { id: 't6', name: 'Docs', start: '2026-03-05', end: '2026-03-06', resources: ['wangwu'] },
    { id: 't7', name: 'Release prep', start: '2026-03-09', end: '2026-03-10', resources: ['zhang', 'lisi'] },
  ]
  const clone = (v) => JSON.parse(JSON.stringify(v))
  let state = { resources: clone(RESOURCES), tasks: clone(INITIAL_TASKS) }
  const movedDays = new Map() // task id → shifted days (leveling result tag; cleared when the assignment changes)

  const el = document.getElementById('rm-resource')
  const result = document.getElementById('rm-result')
  const overloadRow = document.getElementById('rm-overload')
  const table = document.querySelector('#rm-demo .rm-table')
  if (!el || !result || !overloadRow || !table) return
  await customElements.whenDefined('oas-resource')

  const DAY_MS = 86_400_000
  const parseISO = (s) => {
    const [y, m, d] = s.split('-').map(Number)
    return new Date(y, m - 1, d)
  }
  const toISO = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const addDays = (d, n) => {
    const x = new Date(d)
    x.setDate(x.getDate() + n)
    return x
  }
  const dayDiff = (a, b) => Math.round((parseISO(a).getTime() - parseISO(b).getTime()) / DAY_MS)

  // Expand day by day to compute each resource's peak parallel count and overloaded days (host-side,
  // cross-checking the histogram)
  const statResource = (resources, tasks) => {
    const per = new Map()
    for (const r of resources) per.set(r.id, new Map())
    for (const t of tasks) {
      let d = parseISO(t.start)
      const end = parseISO(t.end)
      while (d <= end) {
        const key = toISO(d)
        for (const rid of t.resources || []) per.get(rid)?.set(key, (per.get(rid)?.get(key) || 0) + 1)
        d = addDays(d, 1)
      }
    }
    const out = {}
    for (const r of resources) {
      const cap = r.capacity ?? 1
      let peak = 0
      let overDays = 0
      for (const load of per.get(r.id).values()) {
        if (load > peak) peak = load
        if (load > cap) overDays++
      }
      out[r.id] = { peak, overDays }
    }
    return out
  }

  const renderCards = () => {
    const stats = statResource(state.resources, state.tasks)
    for (const r of state.resources) {
      const peak = document.getElementById(`rm-peak-${r.id}`)
      const over = document.getElementById(`rm-over-days-${r.id}`)
      if (peak) peak.textContent = String(stats[r.id].peak)
      if (over) over.textContent = String(stats[r.id].overDays)
      const card = document.querySelector(`.rm-card[data-rid="${r.id}"]`)
      card?.classList.toggle('is-over', stats[r.id].overDays > 0)
    }
  }

  const renderTable = () => {
    const tbody = document.getElementById('rm-tbody')
    tbody.textContent = ''
    for (const t of state.tasks) {
      const tr = document.createElement('tr')
      const tdName = document.createElement('td')
      tdName.textContent = t.name
      tr.appendChild(tdName)
      const tdDate = document.createElement('td')
      tdDate.textContent = `${t.start.slice(5)} ~ ${t.end.slice(5)}`
      if (movedDays.has(t.id)) {
        const tag = document.createElement('span')
        tag.className = 'rm-shifted'
        tag.textContent = `shifted +${movedDays.get(t.id)} days`
        tdDate.appendChild(tag)
      }
      tr.appendChild(tdDate)
      for (const r of state.resources) {
        const td = document.createElement('td')
        const cb = document.createElement('oas-checkbox')
        cb.setAttribute('value', r.id)
        cb.setAttribute('data-task', t.id)
        cb.setAttribute('data-res', r.id)
        cb.setAttribute('aria-label', `${t.name} · ${r.name}`)
        if (t.resources?.includes(r.id)) cb.setAttribute('checked', '')
        td.appendChild(cb)
        tr.appendChild(td)
      }
      tbody.appendChild(tr)
    }
  }

  // Overload status row: oas-overload only fires when overloaded (and the first dispatch at upgrade
  // is missed by listeners attached afterwards), so the host falls back to counting the histogram's
  // red pillars, keeping the row consistent with the current data at any point
  const refreshOverloadRow = () => {
    const n = el.shadowRoot?.querySelectorAll('.pillar.over').length ?? 0
    overloadRow.textContent = n ? `Currently overloaded in ${n} period(s) (red pillars)` : 'No overload'
  }
  el.addEventListener('oas-overload', refreshOverloadRow)

  const render = () => {
    el.resources = state.resources
    el.tasks = state.tasks
    renderCards()
    renderTable()
    refreshOverloadRow()
  }
  render()

  // Event delegation on the table: oas-change bubbles + composed, so rebuilding the tbody keeps the listener
  table.addEventListener('oas-change', (e) => {
    const cb = e.target
    if (!(cb instanceof HTMLElement) || cb.tagName !== 'OAS-CHECKBOX') return
    const taskId = cb.getAttribute('data-task')
    const resId = cb.getAttribute('data-res')
    if (!taskId || !resId) return
    const checked = cb.hasAttribute('checked')
    const task = state.tasks.find((t) => t.id === taskId)
    if (!task) return
    const set = new Set(task.resources || [])
    if (checked) set.add(resId)
    else set.delete(resId)
    task.resources = [...set]
    movedDays.clear() // assignment changed, the old leveling "shifted" tags are stale
    result.textContent = ''
    render()
  })

  const levelBtn = document.getElementById('rm-level-btn')
  const resetBtn = document.getElementById('rm-reset-btn')
  levelBtn?.addEventListener('click', async () => {
    for (let i = 0; i < 100 && typeof window.levelResources !== 'function'; i++) {
      await new Promise((r) => setTimeout(r, 50))
    }
    if (typeof window.levelResources !== 'function') {
      result.textContent = '(levelResources not ready yet, please retry)'
      return
    }
    // The return value is only the shifted tasks (new dates) — merge into state.tasks by id, never replace wholesale
    const moved = window.levelResources(state.resources, state.tasks, { scale: 'day' })
    if (moved.length === 0) {
      result.textContent = 'Nothing to level (no overload)'
      return
    }
    const parts = []
    for (const m of moved) {
      const old = state.tasks.find((t) => t.id === m.id)
      const days = old ? dayDiff(m.start, old.start) : 0
      movedDays.set(m.id, days)
      parts.push(`${m.name} ×${days}d`)
    }
    state.tasks = state.tasks.map((t) => moved.find((m) => m.id === t.id) ?? t)
    result.textContent = `Leveled: shifted ${moved.length} task(s) (${parts.join(', ')})`
    render()
  })

  resetBtn?.addEventListener('click', () => {
    state = { resources: clone(RESOURCES), tasks: clone(INITIAL_TASKS) }
    movedDays.clear()
    result.textContent = ''
    render()
  })
})
</script>
