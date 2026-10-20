# Scheduler 日程调度

月视图日程组件：日格内渲染事件芯片（标题 + 色条），`events` 读/写通道 + `addEvent` / `updateEvent` / `removeEvent` CRUD 方法；点事件芯片派发 `oas-event-click`、点日格派发 `oas-day-click`（宿主接编辑器），数据经 CRUD 方法变更时派发 `oas-events-change`（外部 `setAttribute('events', …)` 写入不派发）。

## 基础用法

<DemoBlock title="周起始与本地化（first-day-of-week + locale）">
  <oas-scheduler page-show-date="2026-08-01" first-day-of-week="1" locale="zh-CN"></oas-scheduler>
</DemoBlock>

<DemoBlock title="月视图 + 事件芯片（标题/色条/+N 合并）">
  <oas-scheduler id="scheduler-basic" page-show-date="2026-08-01" events='[{"date":"2026-08-08","title":"发布 v2.6","color":"#dc2626"},{"date":"2026-08-08","title":"回归全绿"},{"date":"2026-08-15","title":"评审会"},{"date":"2026-08-22","title":"对齐 review","color":"#059669"},{"date":"2026-08-22","title":"文档批"},{"date":"2026-08-22","title":"定版"}]'></oas-scheduler>
</DemoBlock>

## 周 / 日视图

<DemoBlock title="周视图（时刻表 + 定时事件块；全天行进顶部）">
  <oas-scheduler id="scheduler-week" view="week" page-show-date="2026-08-10" start-hour="8" end-hour="20" events='[{"date":"2026-08-10","title":"晨会","start":"09:00","end":"10:00","color":"#dc2626"},{"date":"2026-08-10","title":"评审","start":"14:00","end":"15:30","color":"#059669"},{"date":"2026-08-11","title":"全天活动"},{"date":"2026-08-13","title":"评审会","start":"10:30","end":"12:00"}]'></oas-scheduler>
</DemoBlock>

<DemoBlock title="日视图（单列时刻表）+ 视图切换 oas-view-change">
  <oas-scheduler id="scheduler-day" view="day" page-show-date="2026-08-10" events='[{"date":"2026-08-10","title":"晨会","start":"09:00","end":"10:00"},{"date":"2026-08-10","title":"评审","start":"14:00","end":"15:30"}]'></oas-scheduler>
</DemoBlock>

周/日视图为时刻表（`start-hour` / `end-hour` 限幅，默认 8–20 点）：带 `start`/`end` 的事件按时间绝对定位成块，无 `start` 的事件进顶部全天行；视图按钮切换派发 `oas-view-change`。事件块支持**拖拽移动**（拖到目标列/时刻改 `date` + `start`，保持时长）与**底缘拖拽缩放**（改 `end`，15 分钟步进），落定回写并派发 `oas-events-change`。

## 重复规则与提醒

<DemoBlock title="重复规则（RRULE 子集：daily/weekly/monthly + interval + until）">
  <oas-scheduler id="scheduler-repeat" page-show-date="2026-08-01" events='[{"date":"2026-08-03","title":"每日站会","repeat":{"freq":"daily"},"color":"#dc2626"},{"date":"2026-08-05","title":"双周会","repeat":{"freq":"weekly","interval":2,"until":"2026-08-19"}},{"date":"2026-08-10","title":"月度盘点","repeat":{"freq":"monthly"}}]'></oas-scheduler>
</DemoBlock>

`repeat` 按 `freq` × `interval` 从 `date` 起展开（daily 按天数间隔、weekly 按周、monthly 按同日），`until` 截止（含当日）；`el.events` 仍只读原始条目（展开只发生在渲染层）。
月/周规则还可加 `byMonth`（1-12）、`byMonthDay`（1-31）、`bySetPos`（如 `-1`）、`byDay`（weekly，0=周日…6=周六）与 `exDates`（排除日期，`YYYY-MM-DD`）。本地 occurrence 过滤支持 `byMonth` / `byMonthDay` / `byDay` / `exDates`，以及「monthly + byMonthDay + bySetPos」组合；其他 `bySetPos` 场景原样写入 ICS `RRULE`。

<DemoBlock title="跨日全天条（周视图连续长条，可整体拖动平移）">
  <oas-scheduler id="scheduler-span" view="week" page-show-date="2026-08-10" events='[{"date":"2026-08-10","endDate":"2026-08-12","title":"设计冻结"},{"date":"2026-08-13","endDate":"2026-08-14","title":"回归窗口","color":"#059669"},{"date":"2026-08-12","endDate":"2026-08-13","title":"夜间值守","start":"22:00","end":"02:00"}]'></oas-scheduler>
</DemoBlock>

跨日全天事件在周视图的顶部全天带渲染为一条连续长条（不再逐日重复芯片）；按住长条横向拖动可按列宽吸附平移日期，回写 `date` / `endDate` 并派发 `oas-events-change`；键盘聚焦连续条后可用 `←` / `→` 按天平移（RTL 下按视觉方向镜像）；移出当前周时视图跟随，避免条卸载后丢失焦点。定时跨日事件也在顶部跨日带渲染连续条，条上带 `开始–结束` 时间标签；日内时间轴不再重复拆块。

<DemoBlock title="提醒（remind 分钟，到点派发 oas-remind）">
  <oas-scheduler id="scheduler-remind" page-show-date="2026-08-10"></oas-scheduler>
  <div id="scheduler-remind-output" style="color:var(--oas-color-text-secondary);font-size:var(--oas-font-size-sm);margin-top:var(--oas-space-2)"></div>
</DemoBlock>

带 `remind`（分钟）的事件，组件在「`start` − `remind` 分钟」到点派发 `oas-remind`（`detail: { id, event }`；无 `start` 按当日 00:00 计）。过期/已删/断开连接均不再派发。

<DemoBlock title="宿主展开重复：基础事件不带 repeat，每个 occurrence 独立下发（唯一 id）">
  <oas-scheduler page-show-date="2026-08-01" events='[{"id":"occ-1","date":"2026-08-03","title":"站会（宿主展开 1）"},{"id":"occ-2","date":"2026-08-04","title":"站会（宿主展开 2）"},{"id":"occ-3","date":"2026-08-05","title":"站会（宿主展开 3）"}]'></oas-scheduler>
</DemoBlock>

> windowed 场景推荐这种宿主展开方式：组件不会再对基础事件做第二次展开。

## 时区与日程视图

<DemoBlock title="日程视图（agenda：锚点起 28 天时序清单）">
  <oas-scheduler id="scheduler-agenda" view="agenda" page-show-date="2026-08-10" events='[{"date":"2026-08-10","title":"晨会","start":"09:00","end":"10:00","color":"#dc2626"},{"date":"2026-08-12","title":"评审","color":"#059669"},{"date":"2026-08-05","title":"每日站会","repeat":{"freq":"daily"}}]'></oas-scheduler>
</DemoBlock>

`view="agenda"` 从锚点起 28 天按日分组列出事件（重复事件已展开）：定时事件带 `start–end` 时间、无 `start` 标「全天」；点事件行派发 `oas-event-click`、点日头派发 `oas-day-click`。

<DemoBlock title="时区（timezone：影响标题/列头与「今天」标记）">
  <oas-scheduler page-show-date="2026-08-10" timezone="Asia/Shanghai" events='[{"date":"2026-08-10","title":"上海例会","start":"09:00","end":"10:00"}]'></oas-scheduler>
</DemoBlock>

`timezone` 接受 IANA 时区名（如 `Asia/Shanghai` / `America/New_York` / `UTC`），影响标题/列头的日期格式化与「今天」标记（经 `Intl` timeZone）；非法时区回落本地。

## 资源视图与拖拽创建

<DemoBlock title="单日资源视图（view=resource：行 = 资源，横向 = 小时）">
  <oas-scheduler id="scheduler-res-day" view="resource" page-show-date="2026-08-10" start-hour="8" end-hour="18" show-now="true" resources='[{"id":"a","title":"会议室 A","color":"#2563eb"},{"id":"b","title":"会议室 B"},{"id":"c","title":"设备间"}]' events='[{"date":"2026-08-10","title":"晨会","start":"09:00","end":"10:00","resource":"a"},{"date":"2026-08-10","title":"评审","start":"14:00","end":"15:30","resource":"b"},{"date":"2026-08-10","title":"维护","resource":"c"}]'></oas-scheduler>
</DemoBlock>

<DemoBlock title="周 × 资源矩阵（view=resource-week）">
  <oas-scheduler id="scheduler-res-week" view="resource-week" page-show-date="2026-08-10" resources='[{"id":"a","title":"会议室 A","color":"#2563eb"},{"id":"b","title":"会议室 B"}]' events='[{"date":"2026-08-10","title":"晨会","start":"09:00","end":"10:00","resource":"a"},{"date":"2026-08-11","title":"评审","start":"13:00","end":"14:00","resource":"b"},{"date":"2026-08-12","title":"全天巡检","resource":"a"}]'></oas-scheduler>
</DemoBlock>

<DemoBlock title="资源分组 + 第二时区（group + secondary-timezone）">
  <oas-scheduler id="scheduler-res-group" view="resource" page-show-date="2026-08-10" start-hour="8" end-hour="18" secondary-timezone="UTC" resources='[{"id":"a","title":"会议室 A","group":"华东","color":"#2563eb"},{"id":"b","title":"会议室 B","group":"华东"},{"id":"c","title":"设备间","group":"公共"}]' events='[{"date":"2026-08-10","title":"晨会","start":"09:00","end":"10:00","resource":"a"},{"date":"2026-08-10","title":"评审","start":"14:00","end":"15:30","resource":"b"}]'></oas-scheduler>
</DemoBlock>

<DemoBlock title="拖拽创建（时间格空白处拖出区间 → oas-create）">
  <oas-scheduler id="scheduler-create" view="day" page-show-date="2026-08-10" start-hour="8" end-hour="18" events='[{"date":"2026-08-10","title":"晨会","start":"09:00","end":"10:00"}]'></oas-scheduler>
  <div id="scheduler-create-output" style="color:var(--oas-color-text-secondary);font-size:var(--oas-font-size-sm);margin-top:var(--oas-space-2)"></div>
</DemoBlock>

<DemoBlock title="RTL（dir=rtl：资源时间轴与资源列镜像）">
  <div dir="rtl">
    <oas-scheduler view="resource" page-show-date="2026-08-10" start-hour="8" end-hour="18" resources='[{"id":"a","title":"会议室 A","color":"#2563eb"},{"id":"b","title":"会议室 B"}]' events='[{"date":"2026-08-10","title":"晨会","start":"09:00","end":"10:00","resource":"a"},{"date":"2026-08-10","title":"评审","start":"14:00","end":"15:30","resource":"b"}]'></oas-scheduler>
  </div>
</DemoBlock>

`view="resource"` 以行为资源、横向为小时渲染单日排班；`view="resource-week"` 为周 × 资源矩阵（行 = 资源、列 = 本周 7 天）。事件用 `resource` 字段归属资源行，缺省或未知 id 归「未分配」行。在时间格空白处按住拖出区间（≥15 分钟）派发 `oas-create`（`detail: { date, start, end, resource? }`），组件不自动建事件——宿主接到后调 `addEvent`；位移不足视作点击派发 `oas-day-click`。`show-now`（默认开）在当前时间处渲染 now 线。`resources[].group` 非空时在资源行前自动插入分组标题行（同名只插一次，输入顺序保持）；windowed 切片不自动生成分组行，需宿主自行提供。`secondary-timezone` 为时间刻度追加第二时区标签（仅 `day` / `week` / 资源单日视图；非法 IANA 忽略并 devWarn）。

## CRUD（方法通道）

<DemoBlock title="addEvent / updateEvent / removeEvent + oas-events-change 反馈">
  <div style="display:flex;gap:var(--oas-space-2);margin-bottom:var(--oas-space-2)">
    <oas-button id="scheduler-add" size="small">新增「评审会」</oas-button>
    <oas-button id="scheduler-rename" size="small">改名首条</oas-button>
    <oas-button id="scheduler-remove" size="small">删除首条</oas-button>
  </div>
  <oas-scheduler id="scheduler-crud" page-show-date="2026-08-01" events='[{"date":"2026-08-08","title":"发布 v2.6","color":"#dc2626"},{"date":"2026-08-08","title":"回归全绿"},{"date":"2026-08-15","title":"评审会"},{"date":"2026-08-22","title":"对齐 review","color":"#059669"},{"date":"2026-08-22","title":"文档批"},{"date":"2026-08-22","title":"定版"}]'></oas-scheduler>
  <div id="scheduler-crud-output" style="color:var(--oas-color-text-secondary);font-size:var(--oas-font-size-sm);margin-top:var(--oas-space-2)"></div>
</DemoBlock>

## 事件反馈（点击联动）

<DemoBlock title="oas-event-click / oas-day-click 宿主联动">
  <oas-scheduler id="scheduler-click" page-show-date="2026-08-01" events='[{"date":"2026-08-08","title":"发布 v2.6","color":"#dc2626"},{"date":"2026-08-08","title":"回归全绿"},{"date":"2026-08-15","title":"评审会"},{"date":"2026-08-22","title":"对齐 review","color":"#059669"},{"date":"2026-08-22","title":"文档批"},{"date":"2026-08-22","title":"定版"}]'></oas-scheduler>
  <div id="scheduler-click-output" style="color:var(--oas-color-text-secondary);font-size:var(--oas-font-size-sm);margin-top:var(--oas-space-2)"></div>
</DemoBlock>

点击事件芯片派发 `oas-event-click`（`detail: { id, event }`，且不触发日格点击）；点空白日格派发 `oas-day-click`（`detail: { date }`）——宿主据此打开编辑器/表单，组件不内置编辑表单。

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  await customElements.whenDefined('oas-scheduler')
  const crud = document.getElementById('scheduler-crud')
  const out = document.getElementById('scheduler-crud-output')
  if (crud) {
    const report = () => {
      out.textContent = `events-change：当前 ${crud.events.length} 条`
    }
    crud.addEventListener('oas-events-change', report)
    report()
    document.getElementById('scheduler-add')?.addEventListener('oas-click', () => crud.addEvent({ date: '2026-08-15', title: '评审会（新）' }))
    document.getElementById('scheduler-rename')?.addEventListener('oas-click', () => {
      const first = crud.events[0]
      if (first) crud.updateEvent(first.id, { title: `${first.title}（已改）` })
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
      cout.textContent = `oas-event-click：${e.detail.event.title}（id=${e.detail.id}）`
    })
    click.addEventListener('oas-day-click', (e) => {
      cout.textContent = `oas-day-click：${e.detail.date}（宿主可在此打开新增表单）`
    })
  }

  const remind = document.getElementById('scheduler-remind')
  const rout = document.getElementById('scheduler-remind-output')
  if (remind) {
    const now = new Date()
    const iso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const startMin = (now.getHours() * 60 + now.getMinutes() + 2) % (24 * 60)
    const start = `${String(Math.floor(startMin / 60)).padStart(2, '0')}:${String(startMin % 60).padStart(2, '0')}`
    remind.events = [{ date: iso, title: '两分钟后开始（提前 1 分钟提醒）', start, remind: 1, color: '#d97706' }]
    remind.addEventListener('oas-remind', (e) => {
      rout.textContent = `oas-remind：${e.detail.event.title}（到点提醒已派发）`
    })
    rout.textContent = `演示：约 1 分钟后此处出现 oas-remind 反馈`
  }

  const create = document.getElementById('scheduler-create')
  const crout = document.getElementById('scheduler-create-output')
  if (create) {
    create.addEventListener('oas-create', (e) => {
      const { date, start, end, resource } = e.detail
      create.addEvent({ date, title: '新建（拖拽）', start, end, resource })
      crout.textContent = `oas-create：${date} ${start}–${end}${resource ? `（${resource}）` : ''} → 已 addEvent`
    })
  }

  // windowed 资源行：演示宿主按 oas-window-request 回填切片（20 行，每次 5 行）
  const win = document.getElementById('scheduler-windowed-demo')
  if (win) {
    const total = 20
    const size = 5
    const all = Array.from({ length: total }, (_, i) => ({ id: `wr${i}`, title: `资源 ${i + 1}` }))
    const apply = (start) => {
      const s = Math.max(0, Math.min(total - size, start))
      win.setAttribute('window-start', String(s))
      win.setAttribute('resources', JSON.stringify(all.slice(s, s + size)))
    }
    win.addEventListener('oas-window-request', (e) => apply(e.detail.start))
    apply(0)
  }
})
</script>

## 大数据量（虚拟化）

资源视图的资源行与 `day` 视图的小时轴按可视窗口渲染：渲染行数/刻度数与 DOM 规模不随数据总量增长，占位撑起滚动范围（总高守恒）；滚动重建后按事件 id 回焦，拖拽/创建手势进行中抑制窗口重建（避免销毁 pointer capture）。资源视图默认限高 `--oas-scheduler-resource-max-height`（缺省 640px，与时间轴一致），超出即内部滚动并窗口化；资源行与时间轴均带 `aria-rowcount` 与绝对行号 `aria-rowindex`。

## 打印预览

<DemoBlock title="打印：@media print 隐藏工具栏、取消 agenda/资源视图限高（点击按钮打开系统打印预览）">
  <oas-button size="small" onclick="window.print()">打印当前预约</oas-button>
  <oas-scheduler id="scheduler-print" view="agenda" page-show-date="2026-08-10" events='[{"date":"2026-08-10","title":"打印演示","start":"09:00","end":"10:00"}]'></oas-scheduler>
</DemoBlock>

## 服务端资源行窗口（windowed）与打印

资源视图（`resource` / `resource-week`）支持服务端分片：`windowed` + `total` + `window-start`，`resources` 只喂 `[window-start, window-start + resources.length)` 的资源切片。组件按可视窗口派发 `oas-window-request`（绝对行号、半开区间），宿主回填切片后更新 `window-start`；`aria-rowcount` 使用 `total`，`aria-rowindex` 使用绝对行号。

- windowed 下组件不自动追加「未分配」行；宿主需要该行时显式提供保留 id `__unassigned__`，无/未知 `resource` 的事件会归入该行。
- 组件仍会对已装载切片内的 `repeat` 事件做本地展开；宿主展开 occurrence 时**必须从基础事件剥离 `repeat`（或不再下发基础序列）**，否则同一天会重复渲染；每个 occurrence 用唯一 id。
- 打印样式 `@media print` 隐藏工具栏/视图按钮、取消滚动限高（含 agenda）；`beforeprint` 临时关闭行/小时虚拟化，打印已装载切片（windowed 不输出切片外空白 spacer），`afterprint` 恢复窗口渲染。

```html
<oas-scheduler
  view="resource"
  windowed
  total="500"
  window-start="100"
  resources='[{"id":"r100","title":"资源 100"}]'
  events='[{"date":"2026-08-10","title":"站会","start":"09:00","end":"09:30","resource":"r100"}]'
></oas-scheduler>
```

### 日期窗口取数配方（宿主侧）

组件当前只内建资源行窗口；按日期窗口取数是宿主职责。推荐做法：以 `page-show-date` + `view` 推导可见区间，视图切换/翻页时取消在途请求并只喂该区间事件，避免重复展开与时间轴抖动。

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
  el.events = await res.json() // 只替换当前窗口事件
}

el.addEventListener('oas-view-change', loadWindow)
// 翻页：宿主更新 page-show-date 后调用 loadWindow；资源行回填继续走 oas-window-request
document.querySelector('[data-prev]')?.addEventListener('click', () => {
  el.setAttribute('page-show-date', prevAnchor(el.getAttribute('page-show-date')!))
  loadWindow()
})
```

> `repeat` 若由宿主展开，必须剥离基础事件的 `repeat` 并为每个 occurrence 使用唯一 id；窗口内事件跨窗口边界时，按宿主协议保留相邻 buffer，避免翻页瞬间空白。

## ICS 导出

<DemoBlock title="下载当前事件为 .ics（UTC + Asia/Shanghai）">
  <oas-button id="scheduler-ics-download" size="small">下载 .ics</oas-button>
  <oas-scheduler id="scheduler-ics" view="week" page-show-date="2026-08-10" events='[{"date":"2026-08-10","title":"晨会","start":"09:00","end":"10:00"},{"date":"2026-08-11","endDate":"2026-08-12","title":"设计冻结"}]'></oas-scheduler>
</DemoBlock>

```ts
import { eventsToIcs } from '@oas-ui/ui'

const ics = el.exportIcs() // 当前事件
const standalone = eventsToIcs(events, { calendarName: 'My Calendar' })
el.downloadIcs('my.ics', { timeMode: 'utc', timezone: 'Asia/Shanghai' })
```

- 无 `start` 的事件导出为全天事件（`DTSTART/DTEND;VALUE=DATE`，结束为次日；`endDate` 支持跨日全天）。
- `timeMode`：`floating`（默认，浮动本地时间）/ `utc`（按 `timezone` 转 UTC，带 `Z`）/ `tzid`（`TZID` + 固定偏移 `VTIMEZONE`，跨 DST 精确转换建议用 `utc`）。
- `repeat` 映射为 `RRULE:FREQ/INTERVAL/COUNT/BYDAY/BYMONTH/BYMONTHDAY/BYSETPOS/UNTIL`（`until` 含当日），`exDates` 输出 `EXDATE;VALUE=DATE`；`remind` 输出 `VALARM`，`color` 输出 `X-OAS-COLOR`。
- `eventsToIcs(events, { rangeStart, rangeEnd })` 只导出与区间相交的事件；`el.exportIcs(options)` / `el.downloadIcs(filename, options)` 透传同名字段。
- 文本按 RFC 5545 转义，输出 CRLF 与 75 字节折行；非法日期事件跳过。`now` 选项可固定 `DTSTAMP`。

## API

### oas-scheduler

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `end-hour` | 时间轴结束小时（>start-hour 且 <=24，默认 20） | `string` | `20` |
| `events` | 日程事件（JSON）：[{ id?, date: YYYY-MM-DD, endDate?, title, color?, start?, end?, repeat? { freq, interval?, until?, count?, byDay? }, resource? }]——日格渲染事件芯片，>2 合并 +N 条；endDate 支持跨日全天，repeat 支持 count/byDay | `SchedulerEvent[]` | `[]` |
| `first-day-of-week` | 周起始日（0-6）；缺省按 locale 推导 | `string` | — |
| `locale` | 本地化（覆盖 config-provider 注入与全局 locale） | `string` | — |
| `page-show-date` | 面板月锚点（受控）：yyyy-MM-dd，变化时重锚定显示月份 | `string` | — |
| `resources` | 资源列表（JSON）：[{ id, title, color?, group? }]——资源视图按资源分组；事件 resource 缺省或指向未知 id 时归「未分配」行；group 非空时自动插入分组标题行 | `SchedulerResource[]` | `[]` |
| `secondary-timezone` | 第二时区（IANA）：在 day/week/资源单日时间刻度追加第二时区标签；非法值忽略并 devWarn | `string` | — |
| `show-now` | 当前时间线（默认开；false 关闭）：week/day 视图与资源单日视图在今天的时间区渲染 now 线 | `string` | `true` |
| `start-hour` | 时间轴起始小时（0-23，默认 8） | `string` | `8` |
| `timezone` | 时区（IANA，如 Asia/Shanghai；空串=本地）：影响标题/列头日期格式化与「今天」标记（经 Intl timeZone）；非法时区回落本地 | `string` | — |
| `total` | windowed 模式下的资源行总数（正数才生效）；用于 aria-rowcount 与绝对行号 | `string` | — |
| `view` | 视图：month（默认）/ week / day / agenda / resource / resource-week；周/日视图为时刻表 + 事件块定位，无 start 的事件进全天行；agenda 为 28 天时序清单；resource 为单日资源横向时间轴、resource-week 为周 × 资源矩阵 | `SchedulerView` | `month` |
| `window-start` | windowed 模式下切片首行的绝对行号（相对全量） | `string` | `0` |
| `windowed` | 服务端资源行窗口模式（布尔，默认关）：resource / resource-week 的 resources 只承载 [window-start, window-start + resources.length) 切片；可视窗口未覆盖时派发 oas-window-request（绝对行号、半开区间），回填后更新 window-start。windowed 下不自动追加「未分配」行；需要时宿主可提供保留 id `__unassigned__` | `boolean` | — |

#### Property（JS property；是否写回 attribute 见各行说明）

| Property | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `events` | 日程事件（`SchedulerEvent[]`）：`el.events` 读（含自动 id 的拷贝）；`el.events = [...]` 写（同步 events 属性 + 重渲染 + 派发 oas-events-change） | `SchedulerEvent[]` | `[]` |
| `resources` | 资源列表（`SchedulerResource[]`）：`el.resources` 读（拷贝）；`el.resources = [...]` 写（同步 resources 属性 + 重渲染） | `SchedulerResource[]` | `[]` |

#### 方法

| 方法 | 签名 | 说明 |
| --- | --- | --- |
| `exportIcs` | `exportIcs(options?: IcsExportOptions): string` | 导出当前事件的 ICS 字符串（纯函数 eventsToIcs 的实例便捷通道；不触发重渲染） |
| `downloadIcs` | `downloadIcs(filename: unknown, options?: IcsExportOptions): string` | 下载当前事件的 ICS 文件（浏览器环境；返回生成的 ICS 字符串便于测试/宿主复用） |
| `addEvent` | `addEvent(ev: SchedulerEvent): string` | 新增事件：返回分配到的 id |
| `updateEvent` | `updateEvent(id: string, patch: Partial<SchedulerEvent>): boolean` | 按 id 更新事件（浅合并 patch 后走 sanitize 清洗；找不到返回 false） |
| `removeEvent` | `removeEvent(id: string): boolean` | 按 id 删除事件；找不到返回 false |

#### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-create` | 在时间格空白处拖出 >=15 分钟区间时派发，detail: { date, start, end, resource? }——组件不自动建事件，宿主接后自行 addEvent；位移不足视作 oas-day-click |
| `oas-day-click` | 点击空白日格时派发，detail: { date, resource? }（资源视图带资源行 id）——宿主接新增表单 |
| `oas-event-click` | 点击事件芯片时派发，detail: { id, event }（不触发日格点击） |
| `oas-events-change` | events 数据变化（set/addEvent/updateEvent/removeEvent）时派发，detail: { events } |
| `oas-remind` | 事件提醒到点时派发，detail: { id, event }（start - remind 分钟，组件内置定时器） |
| `oas-view-change` | 视图切换（month/week/day/agenda）时派发，detail: { view }；属性首次吸收不派发 |
| `oas-window-request` | windowed 模式下可视资源行窗口未被已装载切片覆盖时派发，detail: { start, end, reason }（绝对行号、半开区间；同一窗口不重复派发） |

#### CSS 变量

| CSS 变量 | 默认值 |
| --- | --- |
| `--oas-scheduler-resource-max-height` | `640px` |
