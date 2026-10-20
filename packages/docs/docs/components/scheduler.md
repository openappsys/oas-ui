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

<DemoBlock title="提醒（remind 分钟，到点派发 oas-remind）">
  <oas-scheduler id="scheduler-remind" page-show-date="2026-08-10"></oas-scheduler>
  <div id="scheduler-remind-output" style="color:var(--oas-color-text-secondary);font-size:var(--oas-font-size-sm);margin-top:var(--oas-space-2)"></div>
</DemoBlock>

带 `remind`（分钟）的事件，组件在「`start` − `remind` 分钟」到点派发 `oas-remind`（`detail: { id, event }`；无 `start` 按当日 00:00 计）。过期/已删/断开连接均不再派发。

## 时区与日程视图

<DemoBlock title="日程视图（agenda：锚点起 28 天时序清单）">
  <oas-scheduler view="agenda" page-show-date="2026-08-10" events='[{"date":"2026-08-10","title":"晨会","start":"09:00","end":"10:00","color":"#dc2626"},{"date":"2026-08-12","title":"评审","color":"#059669"},{"date":"2026-08-05","title":"每日站会","repeat":{"freq":"daily"}}]'></oas-scheduler>
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

<DemoBlock title="拖拽创建（时间格空白处拖出区间 → oas-create）">
  <oas-scheduler id="scheduler-create" view="day" page-show-date="2026-08-10" start-hour="8" end-hour="18" events='[{"date":"2026-08-10","title":"晨会","start":"09:00","end":"10:00"}]'></oas-scheduler>
  <div id="scheduler-create-output" style="color:var(--oas-color-text-secondary);font-size:var(--oas-font-size-sm);margin-top:var(--oas-space-2)"></div>
</DemoBlock>

<DemoBlock title="RTL（dir=rtl：资源时间轴与资源列镜像）">
  <div dir="rtl">
    <oas-scheduler view="resource" page-show-date="2026-08-10" start-hour="8" end-hour="18" resources='[{"id":"a","title":"会议室 A","color":"#2563eb"},{"id":"b","title":"会议室 B"}]' events='[{"date":"2026-08-10","title":"晨会","start":"09:00","end":"10:00","resource":"a"},{"date":"2026-08-10","title":"评审","start":"14:00","end":"15:30","resource":"b"}]'></oas-scheduler>
  </div>
</DemoBlock>

`view="resource"` 以行为资源、横向为小时渲染单日排班；`view="resource-week"` 为周 × 资源矩阵（行 = 资源、列 = 本周 7 天）。事件用 `resource` 字段归属资源行，缺省或未知 id 归「未分配」行。在时间格空白处按住拖出区间（≥15 分钟）派发 `oas-create`（`detail: { date, start, end, resource? }`），组件不自动建事件——宿主接到后调 `addEvent`；位移不足视作点击派发 `oas-day-click`。`show-now`（默认开）在当前时间处渲染 now 线。

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
})
</script>

## 大数据量（虚拟化）

资源视图的资源行与 `day` 视图的小时轴按可视窗口渲染：渲染行数/刻度数与 DOM 规模不随数据总量增长，占位撑起滚动范围（总高守恒）；滚动重建后按事件 id 回焦，拖拽/创建手势进行中抑制窗口重建（避免销毁 pointer capture）。资源视图默认限高 `--oas-scheduler-resource-max-height`（缺省 640px，与时间轴一致），超出即内部滚动并窗口化；资源行与时间轴均带 `aria-rowcount` 与绝对行号 `aria-rowindex`。

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

## API

### oas-scheduler

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `end-hour` | 时间轴结束小时（>start-hour 且 <=24，默认 20） | `string` | `20` |
| `events` | 日程事件（JSON）：[{ id?, date: YYYY-MM-DD, title, color?, start?, end? }]——日格渲染事件芯片（标题+色条），>2 合并 +N 条 | `SchedulerEvent[]` | `[]` |
| `first-day-of-week` | 周起始日（0-6）；缺省按 locale 推导 | `string` | — |
| `locale` | 本地化（覆盖 config-provider 注入与全局 locale） | `string` | — |
| `page-show-date` | 面板月锚点（受控）：yyyy-MM-dd，变化时重锚定显示月份 | `string` | — |
| `resources` | 资源列表（JSON）：[{ id, title, color? }]——资源视图按资源分组；事件 resource 缺省或指向未知 id 时归「未分配」行 | `SchedulerResource[]` | `[]` |
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
