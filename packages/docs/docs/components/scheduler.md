# Scheduler 日程调度

月视图日程组件（L3 能力子路径）：日格内渲染事件芯片（标题 + 色条），`events` 读/写通道 + `addEvent` / `updateEvent` / `removeEvent` CRUD 方法；点事件芯片派发 `oas-event-click`、点日格派发 `oas-day-click`（宿主接编辑器），数据变更派发 `oas-events-change`。

## 基础用法

<DemoBlock title="周起始与本地化（first-day-of-week + locale）">
  <oas-scheduler page-show-date="2026-08-01" first-day-of-week="1" locale="zh-CN"></oas-scheduler>
</DemoBlock>

<DemoBlock title="月视图 + 事件芯片（标题/色条/+N 合并）">
  <oas-scheduler id="scheduler-basic" page-show-date="2026-08-01" events='[{"date":"2026-08-08","title":"发布 v2.6","color":"#dc2626"},{"date":"2026-08-08","title":"回归全绿"},{"date":"2026-08-15","title":"评审会"},{"date":"2026-08-22","title":"对齐 review","color":"#059669"},{"date":"2026-08-22","title":"文档批"},{"date":"2026-08-22","title":"定版"}]'></oas-scheduler>
</DemoBlock>

## 周 / 日视图（P1）

<DemoBlock title="周视图（时刻表 + 定时事件块；全天行进顶部）">
  <oas-scheduler id="scheduler-week" view="week" page-show-date="2026-08-10" start-hour="8" end-hour="20" events='[{"date":"2026-08-10","title":"晨会","start":"09:00","end":"10:00","color":"#dc2626"},{"date":"2026-08-10","title":"评审","start":"14:00","end":"15:30","color":"#059669"},{"date":"2026-08-11","title":"全天活动"},{"date":"2026-08-13","title":"评审会","start":"10:30","end":"12:00"}]'></oas-scheduler>
</DemoBlock>

<DemoBlock title="日视图（单列时刻表）+ 视图切换 oas-view-change">
  <oas-scheduler id="scheduler-day" view="day" page-show-date="2026-08-10" events='[{"date":"2026-08-10","title":"晨会","start":"09:00","end":"10:00"},{"date":"2026-08-10","title":"评审","start":"14:00","end":"15:30"}]'></oas-scheduler>
</DemoBlock>

周/日视图为时刻表（`start-hour` / `end-hour` 限幅，默认 8–20 点）：带 `start`/`end` 的事件按时间绝对定位成块，无 `start` 的事件进顶部全天行；视图按钮切换派发 `oas-view-change`。事件块支持**拖拽移动**（拖到目标列/时刻改 `date` + `start`，保持时长）与**底缘拖拽缩放**（改 `end`，15 分钟步进），落定回写并派发 `oas-events-change`。

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

## 排期边界

本期（P0）为月视图 + events CRUD；后续：周/日视图 + 拖拽移动缩放（P1）、重复规则 + 提醒（P2）、时区 + 日程视图（P3）。

## API

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
})
</script>
