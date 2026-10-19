# Resource 资源负载

资源负载 / 泳道视图（新组件，data 族）：给定**资源**与**任务**（任务带分配的资源），渲染**资源泳道**（每资源一行，行内显示其被分配的任务条，共享时间轴）与**负载直方图**（按刻度档统计每资源并行任务数，超过容量高亮）。纯视图层——不做排程/平衡引擎；平衡以纯函数 `levelResources()` 导出，由宿主决定是否回写。

## 基础用法

<DemoBlock title="资源泳道 + 负载直方图：resources（含 capacity）+ tasks（含 resources 分配）">
  <oas-resource id="res-basic" scale="day" height="320" capacity="1"
    resources='[{"id":"zhang","name":"张三","capacity":1},{"id":"li","name":"李四","capacity":1},{"id":"wang","name":"王五","capacity":2}]'
    tasks='[{"id":"t1","name":"需求评审","start":"2026-03-02","end":"2026-03-03","resources":["zhang","li"]},{"id":"t2","name":"接口设计","start":"2026-03-03","end":"2026-03-05","resources":["zhang"]},{"id":"t3","name":"后端开发","start":"2026-03-04","end":"2026-03-08","resources":["li"]},{"id":"t4","name":"前端开发","start":"2026-03-04","end":"2026-03-08","resources":["wang"]},{"id":"t5","name":"联调测试","start":"2026-03-09","end":"2026-03-11","resources":["li","wang"]},{"id":"t6","name":"文档整理","start":"2026-03-02","end":"2026-03-04","resources":["wang"]}]'></oas-resource>
  <div id="res-basic-output" style="color:var(--oas-color-text-secondary);font-size:var(--oas-font-size-sm);margin-top:var(--oas-space-2)"></div>
</DemoBlock>

- `resources`：`[{ id, name, capacity? }]`，`capacity` = 该资源**每档（period）**可并行任务数（`day` 档即每天；缺省回落组件属性 `capacity`，最终 1）。
- `tasks`：`[{ id, name, start, end, resources?: string[] }]`，`start/end` 为 `YYYY-MM-DD`（**仅日精度**，`end` 含当日；带时刻的输入按当日处理），`resources` 为分配的资源 id 数组；指向不存在资源的分配被忽略。
- `scale`：`day`（默认）/ `week` / `month`——决定直方图 period 粒度与刻度文案。
- 泳道与直方图**共享列宽与横向滚动**；超载柱加 `.over`（颜色走 `--oas-color-danger`）；同一资源内**互相重叠的任务条按段堆叠**显示（互不遮挡，点哪条命中哪条）。
- 泳道间距 token `--oas-resource-lane-gap` 由行高与条高派生（`--oas-resource-row-height` 参与派生；多段轨道实高 = 段数 × 条高 +（段数 + 1）× 间距）。该 token 声明在组件宿主元素上：**仅宿主元素级**可覆盖——内联 style 或命中宿主元素的 class 规则（e2e 实测：宿主 class 设 `--oas-resource-lane-gap:4px` → 单段轨道高 36 → 28）；`:root` / 祖先级声明不生效（宿主自身已有声明，继承值被压过）。

## 负载超载与资源平衡

<DemoBlock title="检测超载（oas-overload）→ 一键平衡/均载：levelResources() 保工期顺延 或 mode: reassign 改派资源（日期不变），宿主回写 tasks">
  <div style="display: flex; gap: var(--oas-space-2); flex-wrap: wrap">
    <oas-button id="res-level-btn" size="small">一键平衡（顺延）</oas-button>
    <oas-button id="res-reassign-btn" size="small">一键均载（重分配）</oas-button>
  </div>
  <oas-resource id="res-level" scale="day" height="320"></oas-resource>
  <div id="res-level-output" style="color:var(--oas-color-text-secondary);font-size:var(--oas-font-size-sm);margin-top:var(--oas-space-2)"></div>
</DemoBlock>

平衡是**宿主决策**：组件只导出纯函数

```ts
import { levelResources } from '@oas-ui/ui'

// 顺延（缺省）：改日期、保工期
const moved = levelResources(resources, tasks, { scale: 'day' })
// 重分配：不改日期，把任务改派给整段有余量的资源
const reassigned = levelResources(resources, tasks, { scale: 'day', mode: 'reassign' })
// 两者都返回「被改动任务的完整副本」；宿主按 id 合并后写回
el.tasks = tasks.map((t) => [...moved, ...reassigned].find((m) => m.id === t.id) ?? t)
```

`levelResources` 保证：确定性（同输入同输出）、迭代至无超载或达 `maxIter`；**不改入参**。组件不自动调用。

`options.mode`（缺省 `shift`）：

- `shift`（顺延）：每任务工期不变、只后移不前移；适合截止日有余量的排期。
- `reassign`（重分配）：**日期完全不变**，把超载资源上的任务改派给「任务覆盖的每个档都有余量」的资源（按 worst load ratio 选最空闲者，并列取资源输入序；多资源任务只替换超载的那一个）。找不到可行目标即停——**不会退化成顺延**，适合有业务截止日、只能换人的场景（pm 模板的「一键均载」）。

> `week` 档步进按周 period，而纯函数无 locale 上下文（周起始缺省周一）；跨周边界的任务建议显式传 `{ weekStart: <与页面 locale 一致的值> }`（0=周日 … 6=周六），避免与直方图周粒度判定出现边界差。

## 可读性（opt-in 开关）

<DemoBlock title="可读性开关（opt-in）：负载柱顶数字（show-load-values）+ 超载徽标（show-overload-badge）+ 条内任务名（bar-label）">
  <oas-resource id="res-readable" scale="day" height="420" capacity="1" show-load-values show-overload-badge bar-label header-sticky
    resources='[{"id":"zhang","name":"张三","capacity":1},{"id":"li","name":"李四","capacity":1},{"id":"wang","name":"王五","capacity":2}]'
    tasks='[{"id":"t1","name":"需求评审","start":"2026-03-02","end":"2026-03-03","resources":["zhang","li"]},{"id":"t2","name":"接口设计","start":"2026-03-03","end":"2026-03-05","resources":["zhang"]},{"id":"t3","name":"后端开发","start":"2026-03-04","end":"2026-03-08","resources":["li"]},{"id":"t4","name":"前端开发","start":"2026-03-04","end":"2026-03-08","resources":["wang"]},{"id":"t5","name":"联调测试","start":"2026-03-09","end":"2026-03-11","resources":["li","wang"]},{"id":"t6","name":"文档整理","start":"2026-03-02","end":"2026-03-04","resources":["wang"]}]'></oas-resource>
  <div id="res-readable-output" style="color:var(--oas-color-text-secondary);font-size:var(--oas-font-size-sm);margin-top:var(--oas-space-2)">三个开关全开：负载柱顶显示该档并行任务数（超载档红色）；张三行头显示「超载 1 档」徽标；任务条内显示任务名。</div>
</DemoBlock>

三个可读性能力均为 **opt-in**（默认全关、零新增节点）：`show-load-values` 在每个 load > 0 的负载柱顶显示该档并行任务数（装饰性数字，`aria-hidden`；超载档加 `.over` 走 `--oas-color-danger`）；`show-overload-badge` 在超载资源的泳道行头显示「超载 N 档」徽标（可见信息，不 `aria-hidden`，文案随全局 locale 即时切换）；`bar-label` 在任务条内显示任务名（纯文本渲染防注入，条窄时单行裁切；不影响 aria-label 与点击命中）。

## 本地化与时间定位

<DemoBlock title="locale=&quot;en-US&quot;（周日起始）+ scale=&quot;week&quot;：刻度文案与周起始按 en-US 口径；scrollToDate 把时间轴滚动定位到指定日期">
  <oas-button id="res-scroll-btn" size="small">滚动到 03-15</oas-button>
  <oas-resource id="res-locale" locale="en-US" scale="week" height="240" capacity="2"
    resources='[{"id":"zhang","name":"张三","capacity":1},{"id":"li","name":"李四","capacity":2}]'
    tasks='[{"id":"w1","name":"迭代一","start":"2026-03-01","end":"2026-03-06","resources":["zhang"]},{"id":"w2","name":"迭代二","start":"2026-03-04","end":"2026-03-12","resources":["zhang","li"]},{"id":"w3","name":"迭代三","start":"2026-03-10","end":"2026-03-18","resources":["li"]}]'></oas-resource>
  <div id="res-locale-output" style="color:var(--oas-color-text-secondary);font-size:var(--oas-font-size-sm);margin-top:var(--oas-space-2)"></div>
</DemoBlock>

实例方法 **`scrollToDate(date)`**：把时间轴横向滚动定位到指定日期（`YYYY-MM-DD`，在可视区内水平居中，扣除左侧 sticky 资源名列宽度）。非法日期 / 无数据为空操作；RTL 布局走负值 `scrollLeft` 模型（同 gantt）。

## 服务端行窗口（windowed）

> 资源上千 / 任务十万级：宿主只喂「可视窗口附近」的资源行切片，组件**不持有全量数据**。行窗口按滚动位置计算，未被已装载区间覆盖时派发 `oas-window-request`，宿主回填后按**绝对行号**渲染。

属性 `windowed`（开启）+ `total`（全量资源行数）+ `window-start`（切片首行绝对行号）+ `range-start` / `range-end`（宿主托管时间轴范围，ISO 日期，`range-end` 含当日）。事件：

- `oas-window-request`：`detail: { start, end, reason }`（半开区间、绝对行号），同一期望区间不重复派发。
- `oas-range-request`：可视时间窗接近轴端时派发，`detail: { startMs, endMs, reason }`。

```html
<oas-resource windowed total="5000" window-start="0" range-start="2026-01-01" range-end="2026-12-31"
  scale="day" height="360"></oas-resource>
<script>
  const el = document.querySelector('oas-resource[windowed]')
  el.addEventListener('oas-window-request', (e) => {
    const { start, end } = e.detail
    el.setAttribute('window-start', String(start))
    el.setAttribute('resources', JSON.stringify(fetchResources(start, end))) // 真实项目请求后端
  })
</script>
```

windowed 下的约定：负载/超载统计**仅基于已装载切片**（全量统计由宿主负责）并 devWarn；缺 `range-start` / `range-end` 时时间轴回落「已装载任务」派生并 devWarn；`oas-tasks-change` 的 `detail.tasks` 仅含切片——宿主须**按 id 合并回全量**，不得整体替换。

> 完整宿主取数配方（分段、取消在途、按 id 合并、原子回填）与可运行示例见 [服务端窗口取数](/guide/windowed-data)。

## API

### oas-resource

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `bar-label` | 任务条内显示任务名（布尔，默认关）：单行省略，窄条自动裁切；不改变 aria-label 与点击/拖拽命中 | `boolean` | — |
| `capacity` | 资源未声明 capacity 时的缺省容量（默认 1） | `string` | `1` |
| `header-sticky` | 泳道表头纵向吸顶（默认开）：滚动泳道时周/日刻度保持可见；`header-sticky="false"` 关闭（表头随内容滚动）。角落名列在横向滚动时始终贴边（LTR/RTL） | — | — |
| `height` | 组件高度 px（默认 320；接受纯数字或 Npx）：映射到自定义属性 --oas-resource-height（宿主自身 height 内联始终优先，组件不覆盖宿主内联）。height 属性在场且为合法值（>0 纯数字或 Npx）时组件接管该变量，写入宿主内联并覆盖宿主自己设置的 --oas-resource-height；空串/空白按未设置处理；非法值不写该变量、仅清除本实例此前写入的值，宿主 token 不受影响；属性移除后组件写入的值归零清除，高度回落 token 缺省 320 或宿主 CSS，宿主原先内联设置的值不恢复；从未设置 height 属性时组件不写该变量，宿主内联或 class 规则设置的 --oas-resource-height 完全不受影响 | `string` | `320` |
| `locale` | 本地化（覆盖 config-provider 注入与全局 locale） | `string` | — |
| `range-end` | 宿主托管时间轴终点（ISO 日期 YYYY-MM-DD，含当日）：与 range-start 成对使用；只有其一 / 颠倒 / 非法时忽略托管并 devWarn | `string` | — |
| `range-start` | 宿主托管时间轴起点（ISO 日期 YYYY-MM-DD）：提供后 period 范围不再由已装载任务推导 | `string` | — |
| `resources` | 资源列表（JSON [{ id, name, capacity? }]）——capacity = 该资源每档（period）可并行任务数（day 档即每天；缺省回落属性 capacity，最终 1）；资源可带可选 `color`（CSS 颜色或 token，如 `var(--oas-color-success)`）：用于该泳道任务条与负载柱着色，缺省走 `--oas-resource-bar-bg` / `--oas-resource-load-bg` 的统一色 | `ResourceItem[]` | `[]` |
| `scale` | 直方图 period 粒度与时间轴刻度：day（默认）/ week / month；非法回落 day | `string` | — |
| `show-load-values` | 负载直方图柱顶显示该档负载数字（布尔，默认关）：仅 load > 0 显示，超载档数字用 `text-on-primary`（浅色主题白字/暗色主题深字，压在 danger 柱身上保证对比）；数字为视觉冗余（aria-hidden），读屏仍读列的负载描述 | `boolean` | — |
| `show-overload-badge` | 泳道行头显示「超载 N 档」徽标（布尔，默认关）：仅该资源存在超载档时显示，文案走 i18n resource.overBadge | `boolean` | — |
| `tasks` | 资源任务（JSON [{ id, name, start, end, resources? }]）；start/end 仅日精度 YYYY-MM-DD（end 含当日；带时刻输入按当日处理），resources 为分配的资源 id 数组（指向不存在资源的分配忽略） | `ResourceTask[]` | `[]` |
| `total` | windowed 模式下的全量资源行数；为 0 或非法时 windowed 不生效（回落本地模式） | `string` | — |
| `window-start` | windowed 模式下切片首行（资源）的绝对行号（相对全量） | `string` | `0` |
| `windowed` | 服务端行窗口模式（布尔，默认关）：与 total / window-start 配合，宿主只喂可视窗口切片（按绝对行号渲染），期望行区间未被已装载覆盖时派发 oas-window-request 由宿主回填；负载/超载统计仅基于已装载切片（全量统计由宿主负责）并 devWarn；缺 range-start / range-end 时时间轴回落「已装载任务」派生并 devWarn。非 windowed 行为不变 | `boolean` | — |

#### Property（JS property；是否写回 attribute 见各行说明）

| Property | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `resources` | 资源列表（读为拷贝：嵌套 plain object / array 深拷贝——循环安全；同一引用在单次读取结果内保持共享；Date 按值复制（不保持共享）；类实例 / Set 等奇异对象按引用；写同步 attribute + 重渲染，含不可序列化自定义键时 attribute 仅丢弃该键，property 读回仍完整保留）；资源可带可选 `color`（CSS 颜色或 token，如 `var(--oas-color-success)`）：用于该泳道任务条与负载柱着色，缺省走 `--oas-resource-bar-bg` / `--oas-resource-load-bg` 的统一色 | `ResourceItem[]` | `[]` |
| `tasks` | 资源任务（读为拷贝：嵌套 plain object / array 深拷贝——循环安全；同一引用在单次读取结果内保持共享；Date 按值复制（不保持共享）；类实例 / Set 等奇异对象按引用；写同步 attribute + 重渲染 + 派发 oas-tasks-change，含不可序列化自定义键时 attribute 仅丢弃该键，property 读回仍完整保留） | `ResourceTask[]` | `[]` |

#### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-overload` | 超载态变化时派发（每次更新至多一次；同一超载态不重复派发），detail: { overloads: [{ resourceId, period, load, capacity }] }（period 为档起始日）；无超载不派发 |
| `oas-range-request` | 宿主托管时间范围（range-start/range-end）且可视时间窗接近轴端点时派发，detail: { startMs, endMs, reason }（期望的相邻范围）；同一期望范围不重复派发 |
| `oas-task-click` | 点击资源泳道内的任务条时派发，detail: { id, task, resourceId } |
| `oas-tasks-change` | 程序写 tasks property 时派发，detail: { tasks }。**windowed 下 detail.tasks 仅为已装载切片**：宿主须按 id 合并回全量，不得整体替换 |
| `oas-window-request` | windowed 模式下期望行窗口未被已装载区间覆盖时派发，detail: { start, end, reason }（半开区间、绝对行号；reason 为 init / scroll / resize / data）；同一期望区间不重复派发 |

#### CSS 变量

| CSS 变量 | 默认值 |
| --- | --- |
| `--oas-resource-bar-bg` | `color-mix(in srgb, var(--oas-color-primary) 22%, var(--oas-color-bg))` |
| `--oas-resource-bar-height` | `20px` |
| `--oas-resource-bar-hover-bg` | `color-mix(in srgb, var(--oas-color-primary) 34%, var(--oas-color-bg))` |
| `--oas-resource-header-bg` | `var(--oas-color-bg)` |
| `--oas-resource-header-height` | `32px` |
| `--oas-resource-height` | `320px` |
| `--oas-resource-lane-gap` | `max( 0px, (var(--oas-resource-row-height, 36px) - var(--oas-resource-bar-height, 20px)) / 2 )` |
| `--oas-resource-load-bg` | `color-mix(in srgb, var(--oas-color-primary) 45%, var(--oas-color-bg))` |
| `--oas-resource-load-height` | `64px` |
| `--oas-resource-load-over-bg` | `var(--oas-color-danger)` |
| `--oas-resource-name-width` | `160px` |
| `--oas-resource-row-height` | `36px` |

<script setup>
import { onMounted } from 'vue'

onMounted(async () => {
  await customElements.whenDefined('oas-resource')

  const basic = document.getElementById('res-basic')
  const bout = document.getElementById('res-basic-output')
  if (basic && bout) {
    basic.addEventListener('oas-overload', (e) => {
      const n = e.detail.overloads.length
      bout.textContent = n ? `检测到超载档：${n} 处（直方图红柱）` : '当前无资源超载'
    })
    basic.addEventListener('oas-task-click', (e) => {
      bout.textContent = `点击任务：${e.detail.task.name}（资源 ${e.detail.resourceId}）`
    })
    // 挂载后立即按当前 DOM 反映初始超载态（升级时已派发过 oas-overload，后挂的 listener 收不到）
    const initialOver = basic.shadowRoot?.querySelectorAll('.pillar.over').length ?? 0
    bout.textContent = initialOver ? `检测到超载档：${initialOver} 处（直方图红柱）` : '当前无资源超载'
  }

  const resources = [
    { id: 'zhang', name: '张三', capacity: 1 },
    { id: 'li', name: '李四', capacity: 1 },
    { id: 'wang', name: '王五', capacity: 2 },
  ]
  let tasks = [
    { id: 't1', name: '需求评审', start: '2026-03-02', end: '2026-03-03', resources: ['zhang', 'li'] },
    { id: 't2', name: '接口设计', start: '2026-03-03', end: '2026-03-05', resources: ['zhang'] },
    { id: 't3', name: '后端开发', start: '2026-03-04', end: '2026-03-08', resources: ['li'] },
    { id: 't4', name: '前端开发', start: '2026-03-04', end: '2026-03-08', resources: ['wang'] },
    { id: 't5', name: '联调测试', start: '2026-03-09', end: '2026-03-11', resources: ['li', 'wang'] },
    { id: 't6', name: '文档整理', start: '2026-03-02', end: '2026-03-04', resources: ['wang'] },
  ]
  const el = document.getElementById('res-level')
  const out = document.getElementById('res-level-output')
  if (el && out) {
    el.resources = resources
    el.tasks = tasks
    el.addEventListener('oas-overload', (e) => {
      out.textContent = e.detail.overloads.length ? `检测到超载 ${e.detail.overloads.length} 处` : '无超载'
    })
    el.addEventListener('oas-task-click', (e) => {
      out.textContent = `点击任务：${e.detail.task.name}（资源 ${e.detail.resourceId}）`
    })
    // 初始反馈：挂载时已派发过 oas-overload，按当前 DOM 立即反映一次
    const initialOver = el.shadowRoot?.querySelectorAll('.pillar.over').length ?? 0
    out.textContent = initialOver ? `检测到超载 ${initialOver} 处` : '无超载'
    const resName = (id) => resources.find((r) => r.id === id)?.name ?? id
    const runLeveling = async (mode) => {
      for (let i = 0; i < 100 && typeof window.levelResources !== 'function'; i++) {
        await new Promise((r) => setTimeout(r, 50))
      }
      if (typeof window.levelResources !== 'function') {
        out.textContent = '（levelResources 尚未就绪，请稍后再试）'
        return
      }
      const moved = window.levelResources(resources, tasks, { scale: 'day', mode })
      if (moved.length === 0) {
        out.textContent = mode === 'reassign' ? '无法均载：没有整段都有余量的资源' : '无需平衡（无超载）'
        return
      }
      tasks = tasks.map((t) => moved.find((m) => m.id === t.id) ?? t)
      el.tasks = tasks
      out.textContent =
        mode === 'reassign'
          ? `均载完成：改派 ${moved.length} 个任务（${moved
              .map((m) => `${m.name} → ${(m.resources ?? []).map(resName).join('+')}`)
              .join('、')}）`
          : `平衡完成：后移 ${moved.length} 个任务（${moved.map((m) => m.name).join('、')}）`
    }
    document.getElementById('res-level-btn')?.addEventListener('click', () => runLeveling('shift'))
    document.getElementById('res-reassign-btn')?.addEventListener('click', () => runLeveling('reassign'))
  }

  const localeEl = document.getElementById('res-locale')
  const localeOut = document.getElementById('res-locale-output')
  if (localeEl && localeOut) {
    localeOut.textContent = 'en-US（周日起始）+ week 档：刻度按起始日 MM-dd 渲染'
    document.getElementById('res-scroll-btn')?.addEventListener('click', () => {
      localeEl.scrollToDate('2026-03-15')
      localeOut.textContent = '已滚动定位到 2026-03-15（可视区居中）'
    })
  }
})
</script>
