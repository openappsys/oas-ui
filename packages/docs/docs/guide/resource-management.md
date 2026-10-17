# 资源管理示例（组合示例）

> 本页**不是新组件**：演示如何用 `oas-resource`（泳道 + 负载直方图）+ `oas-card`（资源卡）+ `oas-checkbox`（任务分配表）加纯函数 `levelResources()` 组合出一个可交互的资源管理页。资源卡与分配表都属**宿主层**（页面脚本实现），组件只负责泳道/直方图渲染、超载检测与平衡计算。

## 可运行的组合示例

<DemoBlock title="资源管理页：卡片 + 分配表 + 泳道负载 + 一键平衡（改分配即重算）">
  <div id="rm-demo" style="width: 100%">
    <div class="rm-cards">
      <oas-card class="rm-card" data-rid="zhang">
        <div class="rm-card-head">
          <span class="rm-dot" style="background: var(--oas-color-primary)" aria-hidden="true"></span>
          <strong>张三</strong>
        </div>
        <p class="rm-card-meta">容量 1 · 峰值 <span id="rm-peak-zhang">–</span> · 超载 <span id="rm-over-days-zhang">–</span> 天</p>
      </oas-card>
      <oas-card class="rm-card" data-rid="lisi">
        <div class="rm-card-head">
          <span class="rm-dot" style="background: var(--oas-color-success)" aria-hidden="true"></span>
          <strong>李四</strong>
        </div>
        <p class="rm-card-meta">容量 1 · 峰值 <span id="rm-peak-lisi">–</span> · 超载 <span id="rm-over-days-lisi">–</span> 天</p>
      </oas-card>
      <oas-card class="rm-card" data-rid="wangwu">
        <div class="rm-card-head">
          <span class="rm-dot" style="background: var(--oas-color-warning)" aria-hidden="true"></span>
          <strong>王五</strong>
        </div>
        <p class="rm-card-meta">容量 1 · 峰值 <span id="rm-peak-wangwu">–</span> · 超载 <span id="rm-over-days-wangwu">–</span> 天</p>
      </oas-card>
    </div>
    <div class="rm-table-wrap">
      <table class="rm-table" aria-label="任务分配表">
        <thead>
          <tr>
            <th scope="col">任务</th>
            <th scope="col">日期</th>
            <th scope="col">张三</th>
            <th scope="col">李四</th>
            <th scope="col">王五</th>
          </tr>
        </thead>
        <tbody id="rm-tbody"></tbody>
      </table>
    </div>
    <div class="rm-legend" aria-hidden="true">
      <span class="rm-legend-item"><i class="rm-dot" style="background: var(--oas-resource-load-bg)"></i>负载（并行任务数）</span>
      <span class="rm-legend-item"><i class="rm-dot" style="background: var(--oas-color-danger)"></i>超载（超过容量）</span>
    </div>
    <oas-resource id="rm-resource" capacity="1" show-load-values show-overload-badge bar-label height="560" scale="day"></oas-resource>
    <div class="rm-toolbar">
      <oas-button id="rm-level-btn" size="small">一键平衡</oas-button>
      <oas-button id="rm-reset-btn" size="small">重置示例数据</oas-button>
    </div>
    <p id="rm-result" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: var(--oas-space-2) 0 0"></p>
    <p id="rm-overload" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: var(--oas-space-1) 0 0"></p>
  </div>
</DemoBlock>

- **改分配即重算**：勾选 / 取消分配表中的资源，任务分配立即写回 `tasks`，泳道、负载直方图与资源卡同步重算。
- **一键平衡**：调用纯函数 `levelResources()`——保工期、只后移不前移；结果按 id 合并回数据（不整体替换），被后移的任务在日期列标注「已后移 +N 天」。
- **超载状态行**：初始与每次重算后由宿主按直方图红柱（`.pillar.over`）刷新；`oas-overload` 事件在超载态变化时同步更新（无超载不派发，宿主需自行兜底刷新）。

## 宿主层实现要点

```ts
import { levelResources } from '@oas-ui/ui'

// 返回的只是被后移的任务（新日期）——按 id 合并回数据，不得整体替换
const moved = levelResources(resources, tasks, { scale: 'day' })
tasks = tasks.map((t) => moved.find((m) => m.id === t.id) ?? t)
```

- 分配表每个 `oas-checkbox` 的 `value` 即资源 id；勾选态由宿主从 `task.resources` 派生，`oas-change`（`detail: { checked, value }`）后更新数据再重建表格。
- 资源卡的「峰值 / 超载天数」由宿主按天展开统计：峰值 = 该资源任一天的并行任务数最大值；超载天数 = 并行数 > 容量（此处容量 1）的天数。
- 本页卡片与表格样式仅为 demo 演示，颜色全部走设计 token（`--oas-color-*`），暗色主题自动适配。

## 相关

- 组件契约：[资源](/components/resource) · [卡片](/components/card) · [复选框](/components/checkbox)

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
  // 组件由主题动态 import 注册：先等定义完成，避免把 resources/tasks property 写到未升级元素上
  await customElements.whenDefined('oas-resource')
  const RESOURCES = [
    { id: 'zhang', name: '张三', capacity: 1, color: 'var(--oas-color-primary)' },
    { id: 'lisi', name: '李四', capacity: 1, color: 'var(--oas-color-success)' },
    { id: 'wangwu', name: '王五', capacity: 1, color: 'var(--oas-color-warning)' },
  ]
  const INITIAL_TASKS = [
    { id: 't1', name: '需求评审', start: '2026-03-02', end: '2026-03-03', resources: ['zhang'] },
    { id: 't2', name: '接口设计', start: '2026-03-03', end: '2026-03-05', resources: ['zhang', 'lisi'] },
    { id: 't3', name: '前端开发', start: '2026-03-04', end: '2026-03-08', resources: ['lisi'] },
    { id: 't4', name: '后端开发', start: '2026-03-04', end: '2026-03-08', resources: ['zhang', 'wangwu'] },
    { id: 't5', name: '联调测试', start: '2026-03-09', end: '2026-03-10', resources: ['lisi', 'wangwu'] },
    { id: 't6', name: '文档整理', start: '2026-03-05', end: '2026-03-06', resources: ['wangwu'] },
    { id: 't7', name: '上线准备', start: '2026-03-09', end: '2026-03-10', resources: ['zhang', 'lisi'] },
  ]
  const clone = (v) => JSON.parse(JSON.stringify(v))
  let state = { resources: clone(RESOURCES), tasks: clone(INITIAL_TASKS) }
  const movedDays = new Map() // 任务 id → 后移天数（平衡结果标注；改分配即清）

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

  // 按天展开统计每资源的峰值并行数与超载天数（宿主层口径，与直方图互为印证）
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
        tag.textContent = `已后移 +${movedDays.get(t.id)} 天`
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

  // 超载状态行：oas-overload 只在「有超载」时派发（且升级时的首次派发后挂的 listener 收不到），
  // 宿主以直方图红柱数兜底刷新，保证任意时点显示都与当前数据一致
  const refreshOverloadRow = () => {
    const n = el.shadowRoot?.querySelectorAll('.pillar.over').length ?? 0
    overloadRow.textContent = n ? `当前超载 ${n} 档（直方图红柱）` : '无超载'
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

  // 分配表事件委托：oas-change bubbles + composed，重建 tbody 不丢监听
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
    movedDays.clear() // 分配已变，旧平衡的「后移」标注随之失效
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
      result.textContent = '（levelResources 尚未就绪，请稍后再试）'
      return
    }
    // 返回的只是被后移的任务（新日期）——按 id 合并回 state.tasks，不得整体替换
    const moved = window.levelResources(state.resources, state.tasks, { scale: 'day' })
    if (moved.length === 0) {
      result.textContent = '无需平衡（当前无超载）'
      return
    }
    const parts = []
    for (const m of moved) {
      const old = state.tasks.find((t) => t.id === m.id)
      const days = old ? dayDiff(m.start, old.start) : 0
      movedDays.set(m.id, days)
      parts.push(`${m.name} ×${days} 天`)
    }
    state.tasks = state.tasks.map((t) => moved.find((m) => m.id === t.id) ?? t)
    result.textContent = `已平衡：${moved.length} 个任务后移（${parts.join('、')}）`
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
