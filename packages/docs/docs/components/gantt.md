# Gantt 甘特图

项目排期语义的任务图表组件（data 族）：行树 WBS（父任务摘要条 = 子任务时间并集）× 横向时间轴，任务条 / 里程碑 / 摘要条三形态 + 进度填充；依赖连线（FS/SS/FF/SF 四型，SVG 单画布覆盖层）；拖拽三件套（拖条改期 / 左右手柄拉伸 / 拖改进度，pointerup 收口一次性写回并派发事件）；时间刻度六档（hour/day/week/month/quarter/year）双层表头；今日线、周末/假日列高亮；行虚拟滚动支撑万级任务；三级只读 + 任务级禁拖。数据契约以扁平 `parent` 指针为主（嵌套 `children` 输入自动拍平兼容）。

## 基础用法

<DemoBlock title="行树 WBS + 依赖连线 + 里程碑 + 进度（tasks JSON，扁平 parent / 嵌套 children 双通道）">
  <oas-gantt id="gantt-basic" tasks='[{"id":"p1","name":"一期：基建","start":"2026-03-02","end":"2026-03-13","type":"summary","children":[{"id":"t1","name":"需求分析","start":"2026-03-02","end":"2026-03-06","progress":40},{"id":"t2","name":"开发","start":"2026-03-05","end":"2026-03-13","progress":20,"dependencies":[{"id":"t1"}]}]},{"id":"p2","name":"二期：发布","start":"2026-03-16","end":"2026-03-20","type":"summary","expanded":false,"children":[{"id":"t3","name":"回归测试","start":"2026-03-16","end":"2026-03-18","dependencies":[{"id":"t2"}]},{"id":"m1","name":"v1.0 发布","start":"2026-03-20"}]},{"id":"t9","name":"文档整理","start":"2026-03-09","end":"2026-03-12","progress":70,"dependencies":[{"id":"t2","type":"ss"}]}]'></oas-gantt>
  <div id="gantt-output" style="color:var(--oas-color-text-secondary);font-size:var(--oas-font-size-sm);margin-top:var(--oas-space-2)"></div>
</DemoBlock>

- 父任务渲染**摘要条**（时间 = 子任务并集、进度 = 子任务工期加权平均），行首折叠钮收起/展开子行，展开集合写回 `expanded` 属性（JSON 数组）并派发 `oas-expand-change`；折叠后子行连同其依赖连线一并隐藏（连线随行可见性走，不穿到摘要条）；
- **里程碑**渲染为菱形：`type: "milestone"` 显式声明优先（即使携带 `end` 也按里程碑渲染，`end` 忽略并 `console.warn` 提示数据矛盾一次），无 `end` 亦推导为里程碑；**有子任务时恒按摘要条渲染**（子级承载聚合语义，形态与聚合须一致，`console.warn` 提示一次）；`start` 晚于 `end`（日期颠倒）在清洗层自动交换并 `console.warn` 一次（不渲染 2px 假条）；
- `dependencies` 声明依赖（`type` 缺省 `fs`，支持 `fs`/`ss`/`ff`/`sf` 四型），SVG 单画布绘制折线 + 箭头；
- 悬停任务条出 tooltip（名称 + 起止 + 进度）；`template[slot="tooltip"]` 可覆盖内容（`[data-task-name]` / `[data-task-range]` / `[data-task-progress]` 绑定点）。

## 刻度六档（scale）

<DemoBlock title="时间刻度六档：hour / day（默认）/ week / month / quarter / year（双层表头：上层主刻度合并 + 下层辅刻度）">
  <oas-segmented id="gantt-scale-switch" value="day" options='[{"label":"时","value":"hour"},{"label":"日","value":"day"},{"label":"周","value":"week"},{"label":"月","value":"month"},{"label":"季","value":"quarter"},{"label":"年","value":"year"}]' style="margin-bottom:var(--oas-space-2)"></oas-segmented>
  <oas-gantt id="gantt-scale" scale="day" tasks='[{"id":"s1","name":"一期交付","start":"2026-01-05","end":"2026-06-30","progress":50},{"id":"s2","name":"二期启动","start":"2026-04-01","end":"2026-08-15","progress":0,"dependencies":[{"id":"s1","type":"fs"}]}]'></oas-gantt>
</DemoBlock>

切换 `scale` 重排时间轴（列宽随档位自适应，下限保证标签有立足位），派发 `oas-scale-change`；非法值回落 `day`。列宽被容器压窄到放不下标签时辅刻度按 N 抽稀（保留格线、隐去部分文本，如日档窄列每 2 格），避免日号/月号首尾相接。拖拽吸附以当前刻度为单位（`snap="false"` 关闭吸附，按像素比例平移并保留时间精度）。

## 拖拽三件套

<DemoBlock title="拖条改期 / 手柄拉伸 / 拖改进度（pointerup 收口一次性写回；Esc 或 pointercancel 取消零事件）">
  <oas-gantt id="gantt-drag" tasks='[{"id":"dg1","name":"可拖任务（拖身改期、拖缘拉伸、拖点改进度）","start":"2026-03-02","end":"2026-03-08","progress":30},{"id":"dg2","name":"可拖里程碑","start":"2026-03-10"}]'></oas-gantt>
</DemoBlock>

- **拖条身** = 整体平移（保持工期）；**拖左右手柄** = 改开始/结束（不越过对侧）；**拖条内圆点** = 改进度；
- 收口（pointerup）才写回并派发 `oas-task-change`（`detail: { id, task, oldStart, oldEnd, start, end }`）/ `oas-progress-change`（`detail: { id, task, progress }`）+ `oas-tasks-change`（全量），零位移松开零事件；
- 拖拽中 Esc（或 pointercancel）取消 → 视觉回滚、零事件零写回；拖拽中外部重写 `tasks` 属性 → 拖拽终止回滚（外部数据为准）；
- 聚焦任务条后 **Shift + ←/→** 键盘改期一格（RTL 方向镜像）。

## 只读三级 + 任务级禁用

<DemoBlock title="readonly（全禁）/ dates-readonly（禁改期）/ progress-readonly（禁进度）；只读态不渲染拖拽手柄（视觉即语义）">
  <div style="display:flex;flex-direction:column;gap:var(--oas-space-4)">
    <div>
      <div style="font-size:var(--oas-font-size-sm);color:var(--oas-color-text-secondary);margin-bottom:var(--oas-space-1)">readonly：整图只读</div>
      <oas-gantt readonly tasks='[{"id":"r1","name":"锁定任务","start":"2026-03-02","end":"2026-03-08","progress":60}]'></oas-gantt>
    </div>
    <div>
      <div style="font-size:var(--oas-font-size-sm);color:var(--oas-color-text-secondary);margin-bottom:var(--oas-space-1)">dates-readonly：禁改期、进度可拖</div>
      <oas-gantt dates-readonly tasks='[{"id":"r2","name":"日期锁定","start":"2026-03-02","end":"2026-03-08","progress":60}]'></oas-gantt>
    </div>
    <div>
      <div style="font-size:var(--oas-font-size-sm);color:var(--oas-color-text-secondary);margin-bottom:var(--oas-space-1)">progress-readonly：禁进度、改期可拖</div>
      <oas-gantt progress-readonly tasks='[{"id":"r3","name":"进度锁定","start":"2026-03-02","end":"2026-03-08","progress":60}]'></oas-gantt>
    </div>
  </div>
</DemoBlock>

任务数据里的 `disabled: true` 单独禁该条（其他任务不受影响）。

## 今日线与周末/假日高亮

<DemoBlock title="今日线（show-today 默认开）+ 周末列高亮（weekends 默认开）+ holidays 假日高亮（演示区间动态覆盖今天）">
  <oas-gantt id="gantt-today" height="200"></oas-gantt>
</DemoBlock>

<DemoBlock title="关闭今日线 / 关闭周末高亮 / 假日高亮（holidays JSON）">
  <div style="display:flex;flex-direction:column;gap:var(--oas-space-4)">
    <oas-gantt show-today="false" weekends="false" tasks='[{"id":"n1","name":"无今日线无周末底色","start":"2026-03-02","end":"2026-03-08"}]'></oas-gantt>
    <oas-gantt holidays='["2026-03-04","2026-03-11"]' tasks='[{"id":"n2","name":"假日列高亮","start":"2026-03-02","end":"2026-03-13"}]'></oas-gantt>
  </div>
</DemoBlock>

今日线为装饰层（`aria-hidden`），落在时间轴范围内才渲染；周末/假日列高亮在 day/hour 档生效。

## 行虚拟滚动（万级任务）

<DemoBlock title="height + row-height 启用视口窗口渲染（演示 300 行；只渲染可视窗口 + buffer）">
  <oas-gantt id="gantt-virtual" height="240" row-height="32"></oas-gantt>
  <div style="font-size:var(--oas-font-size-sm);color:var(--oas-color-text-secondary);margin-top:var(--oas-space-2)">方法通道：<oas-button id="gantt-jump" size="small">scrollToTask 跳到第 250 行</oas-button></div>
</DemoBlock>

方法：`scrollToTask(id)` 定位任务行、`scrollToDate(date)` / `scrollToToday()` 水平定位、`updateTask(id, patch)` 单条增量更新（走清洗层，派发 `oas-tasks-change`）。

## 展开集合受控 / 标签与吸附 / 本地化

<DemoBlock title="expanded 受控（JSON 数组 = 已展开集合；显式 [] 全收起）+ label-position 标签（缺省 none 不渲染——行名列已承载名称；inside 条内 / right 条旁需显式开启）">
  <div style="display:flex;flex-direction:column;gap:var(--oas-space-4)">
    <oas-gantt expanded='["p1"]' label-position="inside" tasks='[{"id":"p1","name":"阶段一","start":"2026-03-02","end":"2026-03-13","type":"summary","children":[{"id":"w1","name":"设计","start":"2026-03-02","end":"2026-03-06","progress":80},{"id":"w2","name":"编码","start":"2026-03-04","end":"2026-03-13","progress":35}]},{"id":"p2","name":"阶段二","start":"2026-03-16","end":"2026-03-20","type":"summary","children":[{"id":"w3","name":"验收","start":"2026-03-16","end":"2026-03-20"}]}]'></oas-gantt>
    <oas-gantt label-position="right" tasks='[{"id":"l1","name":"条旁标签（right）","start":"2026-03-02","end":"2026-03-06","progress":60},{"id":"l2","name":"缺省 none 只有条无标签","start":"2026-03-09","end":"2026-03-13","progress":30}]'></oas-gantt>
  </div>
</DemoBlock>

<DemoBlock title="snap=false 非吸附（半格平移保留时间精度）+ locale / first-day-of-week 本地化">
  <div style="display:flex;flex-direction:column;gap:var(--oas-space-4)">
    <oas-gantt snap="false" tasks='[{"id":"sf1","name":"拖拽不吸附（按像素比例平移）","start":"2026-03-02","end":"2026-03-06","progress":50}]'></oas-gantt>
    <oas-gantt locale="en" first-day-of-week="0" tasks='[{"id":"sf2","name":"English locale, week starts on Sunday","start":"2026-03-02","end":"2026-03-13","progress":20}]'></oas-gantt>
  </div>
</DemoBlock>

`template[slot="task"]` 覆盖条内标签内容（`[data-task-name]` 绑定名称；缺省 `label-position="none"` 不渲染标签，需显式开启后模板才生效）；每条任务渲染后派发 `oas-task-render`（`detail: { task, element }`），宿主可改写条内 DOM。

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  await customElements.whenDefined('oas-gantt')
  const out = document.getElementById('gantt-output')

  // 今日线演示：区间动态覆盖今天（保证今日线必然落在范围内）
  const today = document.getElementById('gantt-today')
  if (today) {
    const iso = (d) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const s = new Date()
    s.setDate(s.getDate() - 4)
    const e = new Date()
    e.setDate(e.getDate() + 10)
    today.tasks = [
      { id: 'td0', name: '覆盖今天的区间（今日线 + 周末底色）', start: iso(s), end: iso(e), progress: 45 },
    ]
  }

  // 虚拟滚动演示：300 行
  const virtual = document.getElementById('gantt-virtual')
  if (virtual) {
    const tasks = []
    for (let i = 0; i < 300; i++) {
      const day = (i % 20) + 1
      tasks.push({
        id: `v${i}`,
        name: `任务 ${i + 1}（批次 ${Math.floor(i / 25) + 1}）`,
        start: `2026-03-${String(day).padStart(2, '0')}`,
        end: `2026-03-${String(Math.min(day + 3, 28)).padStart(2, '0')}`,
        progress: (i * 7) % 100,
      })
    }
    virtual.tasks = tasks
    document.getElementById('gantt-jump')?.addEventListener('oas-click', () => virtual.scrollToTask('v249'))
  }

  // 刻度切换（宿主 segmented → scale 属性）
  const scaleSwitch = document.getElementById('gantt-scale-switch')
  const ganttScale = document.getElementById('gantt-scale')
  if (scaleSwitch && ganttScale) {
    scaleSwitch.addEventListener('oas-change', (e) => {
      ganttScale.setAttribute('scale', e.detail.value)
    })
  }

  // 事件反馈输出
  const basic = document.getElementById('gantt-basic')
  if (basic && out) {
    const show = (text) => {
      out.textContent = text
    }
    basic.addEventListener('oas-task-click', (e) => {
      const d = e.detail
      show(`oas-task-click：${d.task.name}（id=${d.id}）——宿主可在此打开详情`)
    })
    basic.addEventListener('oas-task-dblclick', (e) => {
      const d = e.detail
      show(`oas-task-dblclick：${d.task.name}——宿主可在此接编辑表单`)
    })
    basic.addEventListener('oas-expand-change', (e) => {
      const d = e.detail
      show(`oas-expand-change：${d.id} → ${d.expanded ? '展开' : '收起'}`)
    })
    basic.addEventListener('oas-task-change', (e) => {
      const d = e.detail
      show(`oas-task-change：${d.id} ${d.oldStart} → ${d.start}（数据已写回 tasks）`)
    })
    basic.addEventListener('oas-progress-change', (e) => {
      const d = e.detail
      show(`oas-progress-change：${d.id} → ${d.progress}%`)
    })
    basic.addEventListener('oas-tasks-change', () => show(`oas-tasks-change：当前 ${basic.tasks.length} 条任务`))
  }
})
</script>

## API

### oas-gantt

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `dates-readonly` | 禁改期/拉伸（进度仍可拖） | `boolean` | — |
| `expanded` | 已展开集合（JSON 数组，受控）：属性缺席缺省全展开；显式 [] 全收起；点折叠钮写回 | `string` | — |
| `first-day-of-week` | 周起始日（0-6）；缺省按 locale 推导（week 档对齐用） | `string` | — |
| `height` | 组件高度 px（默认 320） | `string` | `320` |
| `holidays` | 假日列表（JSON ["YYYY-MM-DD",…]）：对应列高亮（优先于周末底色） | `string` | — |
| `label-position` | 任务条标签位置：inside 条内 / right 条旁 / left 条左；缺省 none（行名列已承载名称，条旁不再重复渲染）；非法值回落 none | `string` | — |
| `locale` | 本地化（覆盖 config-provider 注入与全局 locale） | `string` | — |
| `progress-readonly` | 禁改进度（改期仍可拖） | `boolean` | — |
| `readonly` | 整图只读（禁改期/禁进度，不渲染拖拽手柄） | `boolean` | — |
| `row-height` | 行高 px（默认 36，下限 20） | `string` | `36` |
| `scale` | 时间刻度：hour / day（默认）/ week / month / quarter / year；非法值回落 day | `string` | — |
| `show-today` | 今日线（默认开；false 关闭） | `string` | — |
| `snap` | 拖拽吸附当前刻度（默认开；false 按像素比例平移并保留时间精度） | `string` | — |
| `tasks` | 甘特任务（JSON）：[{ id?, name, start, end?, type?, progress?, parent?, children?, dependencies?, color?, disabled?, expanded? }]——扁平 parent 指针为主，嵌套 children 自动拍平；type:"milestone" 显式优先（带 end 也按里程碑渲染，end 忽略），有子任务时恒为摘要；无 end 亦推导为里程碑；start 晚于 end 自动交换 | `GanttTask[]` | `[]` |
| `weekends` | 周末列高亮（默认开；day/hour 档生效；false 关闭） | `string` | — |

#### Property（仅 JS property，不反射 attribute）

| Property | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `tasks` | 甘特任务（`GanttTask[]`）：`el.tasks` 读（拷贝，嵌套输入已拍平为 parent 指针）；`el.tasks = [...]` 写（同步 tasks 属性 + 重渲染 + 派发 oas-tasks-change） | `GanttTask[]` | `[]` |

#### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-expand-change` | 行树折叠/展开时派发，detail: { id, expanded } |
| `oas-progress-change` | 拖进度手柄收口时派发，detail: { id, task, progress } |
| `oas-scale-change` | scale 属性变化时派发，detail: { scale }；首次吸收不派发 |
| `oas-task-change` | 拖拽/拉伸/键盘改期收口（pointerup）时派发，detail: { id, task, oldStart, oldEnd, start, end }；零位移不派发 |
| `oas-task-click` | 点击任务条/里程碑时派发，detail: { id, task } |
| `oas-task-dblclick` | 双击任务条时派发，detail: { id, task }——宿主接编辑表单 |
| `oas-task-render` | 每条任务渲染后派发，detail: { task, element }——宿主可改写条内 DOM |
| `oas-tasks-change` | 任务数据变化（程序写 tasks / updateTask / 拖拽写回）时派发，detail: { tasks } |

#### 插槽

| 名称 | 说明 |
| --- | --- |
| `template[slot="empty"]` | 空数据态内容（缺省「暂无任务」） |
| `template[slot="task"]` | 任务条标签模板（克隆进条身，[data-task-name] 节点自动填任务名） |
| `template[slot="tooltip"]` | 悬停浮层模板（[data-task-name] / [data-task-range] / [data-task-progress] 绑定点） |

#### CSS 变量

| CSS 变量 | 默认值 |
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
