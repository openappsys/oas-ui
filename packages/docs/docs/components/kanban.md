# Kanban 看板

列 + 卡片的看板视图：卡片在列间拖拽换列、列内拖拽排序，支持列拖拽重排、WIP 限制、卡片多选与泳道分带，落定后派发 `oas-change` 供宿主同步数据。适合任务流转、需求池、招聘进度等阶段化协作场景。

## 基础用法

`columns`（列定义）与 `cards`（卡片）都以 JSON 属性传入（property 数组通道同效）。卡片按 `column` 字段归入对应列，默认渲染 `title`：

<DemoBlock title="三列看板">
  <div style="width: 100%">
    <oas-kanban
      id="kanban-basic"
      columns='[{"key":"todo","title":"待办"},{"key":"doing","title":"进行中"},{"key":"done","title":"已完成"}]'
      cards='[{"id":"t1","column":"todo","title":"梳理订阅结算流程"},{"id":"t2","column":"todo","title":"补齐看板暗色走查"},{"id":"t3","column":"todo","title":"回收站交互评审"},{"id":"t4","column":"doing","title":"oas-kanban 组件开发"},{"id":"t5","column":"doing","title":"拖拽落点指示线打磨"},{"id":"t6","column":"done","title":"数据通道契约定稿"}]'
    ></oas-kanban>
    <p id="kanban-basic-log" style="width: 100%; margin: var(--oas-space-3) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
      拖动任意卡片到目标列松手，这里会显示 oas-change 反馈。
    </p>
  </div>
</DemoBlock>

## 拖拽换列与列内排序

HTML5 DnD：拖动卡片到目标列，落点显示主色插入指示线（悬停卡片上半/下半区分插前/插后；空列整列高亮尾部标记）。落定后组件把卡片数据（含新 `column` 与新顺序）回写 `cards`，并派发 `oas-change`，`detail` 为 `{ id, from, to, index }`——`index` 是落点在目标列的插入位（移除卡片自身后的口径，宿主对目标列数组 `splice(index, 0, card)` 即可复现）。拖回原位零操作（不派发事件）。

<DemoBlock title="换列与排序（列体独立滚动）">
  <div style="width: 100%">
    <oas-kanban
      id="kanban-scroll"
      style="height: 320px"
      columns='[{"key":"backlog","title":"需求池"},{"key":"sprint","title":"本迭代"},{"key":"verify","title":"验收中"}]'
      cards='[{"id":"b1","column":"backlog","title":"表单批量导入"},{"id":"b2","column":"backlog","title":"审计日志导出"},{"id":"b3","column":"backlog","title":"移动端手势优化"},{"id":"b4","column":"backlog","title":"主题编辑器预设"},{"id":"b5","column":"backlog","title":"图表联动刷选"},{"id":"b6","column":"backlog","title":"国际化补齐泰语"},{"id":"s1","column":"sprint","title":"看板组件收尾"},{"id":"s2","column":"sprint","title":"qa-regression 固化"},{"id":"s3","column":"sprint","title":"性能预算复核"},{"id":"v1","column":"verify","title":"触屏移动菜单验证"}]'
    ></oas-kanban>
    <p style="width: 100%; margin: var(--oas-space-3) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
      给组件设 <code>height</code> 后各列体独立纵向滚动；列内上下拖动卡片可换位。
    </p>
  </div>
</DemoBlock>

## 列拖拽重排

列头左侧的拖拽手柄可整列换位（也可聚焦手柄后按 ←/→），落点列间显示主色插入指示线。落定后组件把新列序回写 `columns` 并派发 `oas-column-reorder`，`detail` 为 `{ from, to, keys }`——`from` 是移动列原位次、`to` 是重排后的新位次、`keys` 是重排后的列 key 全序；卡片数据不受影响。拖回原位零操作。触屏设备（`pointer: coarse`）列头内提供左移/右移按钮（边界项禁用）：

<DemoBlock title="列拖拽重排">
  <div style="width: 100%">
    <oas-kanban
      id="kanban-reorder"
      columns='[{"key":"todo","title":"待办"},{"key":"doing","title":"进行中"},{"key":"done","title":"已完成"}]'
      cards='[{"id":"o1","column":"todo","title":"梳理发布清单"},{"id":"o2","column":"doing","title":"回归测试"},{"id":"o3","column":"done","title":"变更公告"}]'
    ></oas-kanban>
    <p id="kanban-reorder-log" style="width: 100%; margin: var(--oas-space-3) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
      拖动列头左侧手柄换位（或聚焦后按 ←/→），这里会显示 oas-column-reorder 反馈。
    </p>
  </div>
</DemoBlock>

## WIP 限制

列定义加 `limit`（数字）：列卡片数超限时列头计数转 warning 色、列容器带 `data-over-limit` 标记。限制是提示语义而非阻断——拖入超限列照常落定，由宿主决定是否提示。`limit` 缺省、0 或负数都表示不限制：

<DemoBlock title="WIP 限制（进行中列 limit=2，已超限）">
  <div style="width: 100%">
    <oas-kanban
      columns='[{"key":"todo","title":"待办"},{"key":"doing","title":"进行中","limit":2},{"key":"done","title":"已完成"}]'
      cards='[{"id":"w1","column":"doing","title":"联调数据通道"},{"id":"w2","column":"doing","title":"补齐暗色走查"},{"id":"w3","column":"doing","title":"整理回归清单"},{"id":"w4","column":"todo","title":"梳理发布清单"}]'
    ></oas-kanban>
    <p style="width: 100%; margin: var(--oas-space-3) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
      「进行中」列 3/2 超限：计数转 warning 色、列容器带 <code>data-over-limit</code>，仍可继续拖入。
    </p>
  </div>
</DemoBlock>

## 卡片多选

Ctrl/Cmd+点击逐枚切换选中，Shift+点击做同列范围选（锚点卡到被点击卡之间）；选中卡带主色描边高亮。按住多选中任意一枚拖拽，会把全部选中卡一起移到落点列，只派发一条 `oas-change`（`detail` 加 `ids` 数组，`id` 为首枚）。点击空白处或按 Esc 清空多选；普通点击切回单选。触屏不做多选（移动菜单只作用于所在单卡）：

<DemoBlock title="多选批量移动">
  <div style="width: 100%">
    <oas-kanban
      id="kanban-multi"
      columns='[{"key":"todo","title":"待办"},{"key":"doing","title":"进行中"},{"key":"done","title":"已完成"}]'
      cards='[{"id":"m1","column":"todo","title":"梳理订阅结算流程"},{"id":"m2","column":"todo","title":"补齐看板暗色走查"},{"id":"m3","column":"todo","title":"回收站交互评审"},{"id":"m4","column":"doing","title":"oas-kanban 组件开发"}]'
    ></oas-kanban>
    <p id="kanban-multi-log" style="width: 100%; margin: var(--oas-space-3) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
      按住 Ctrl/Cmd 点选「待办」里的卡，再拖任意一枚到目标列，这里显示批量移动反馈。
    </p>
  </div>
</DemoBlock>

## 泳道（swimlane）

`swimlane-by="字段key"` 把看板按该字段值横向分带：每带一条带头行（字段值 + 计数 + 折叠箭头，点击折叠/展开，默认全展开，折叠状态在数据变化时保留），带内卡片按列分组。把卡片拖到另一条带 = 改写该字段的值（`oas-change` 的 `detail` 加 `swimlane: { from, to }`）；字段值缺失/为空的卡归入「（空）」带，空单元格显示占位文案：

<DemoBlock title="泳道（按优先级分带）">
  <div style="width: 100%">
    <oas-kanban
      id="kanban-swim"
      swimlane-by="prio"
      columns='[{"key":"todo","title":"待办"},{"key":"doing","title":"进行中"},{"key":"done","title":"已完成"}]'
      cards='[{"id":"p1","column":"todo","title":"登录页改版","prio":"高优"},{"id":"p2","column":"doing","title":"卡片拖拽打磨","prio":"高优"},{"id":"p3","column":"todo","title":"文档校对","prio":"低优"},{"id":"p4","column":"done","title":"数据通道定稿","prio":"低优"},{"id":"p5","column":"todo","title":"待定任务"}]'
    ></oas-kanban>
    <p id="kanban-swim-log" style="width: 100%; margin: var(--oas-space-3) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
      把卡片拖到另一条带（如把「待定任务」拖入高优带），这里显示泳道变化反馈；点带头可折叠。
    </p>
  </div>
</DemoBlock>

## 空列占位

空列显示「拖拽卡片到此处」占位文案（随 locale 翻译），`empty-column-text` 属性可覆盖：

<DemoBlock title="空列与自定义占位文案">
  <div style="width: 100%">
    <oas-kanban
      columns='[{"key":"open","title":"未开始"},{"key":"ship","title":"已交付"}]'
      cards='[{"id":"e1","column":"open","title":"等待排期"}]'
      empty-column-text="还没有卡片，拖一张过来吧"
    ></oas-kanban>
  </div>
</DemoBlock>

## 自定义卡片渲染（renderCard）

默认只渲染 `title`；需要富内容（标签、负责人、进度等）时用 `renderCard` property 函数通道：`(card) => Node | string`。返回 Node 直接挂载；返回字符串按纯文本渲染（防注入）。函数在场时数据不反射回 `cards` 属性（函数不可序列化，数据由宿主持有），拖拽仍派发 `oas-change`、卡片位置与分组照常更新。

<DemoBlock title="renderCard 富内容卡片">
  <div style="width: 100%">
    <oas-kanban
      id="kanban-render"
      columns='[{"key":"design","title":"设计"},{"key":"dev","title":"开发"}]'
      cards='[{"id":"r1","column":"design","title":"改版视觉稿","owner":"林晓雨","state":"评审中"},{"id":"r2","column":"design","title":"图标包整理","owner":"周可","state":"进行中"},{"id":"r3","column":"dev","title":"看板数据通道","owner":"陈以宁","state":"联调中"}]'
    ></oas-kanban>
  </div>
</DemoBlock>

## 触屏与键盘

- 触屏设备（`pointer: coarse`）不支持 HTML5 拖拽：每张卡片右上角提供移动按钮，点开菜单可上移/下移/移到指定列（首卡禁用上移、末卡禁用下移）；列头内提供左移/右移按钮做列重排（边界项禁用）；
- 键盘可达：卡片 `tabindex=0` 可聚焦，非空列体为 `role="list"`（空列不设 list 语义）、卡片为 `role="listitem"`，携带列名与卡片标题的可读名称；列重排可聚焦列头手柄后按 ←/→；
- 移动菜单只作用于按钮所在的单张卡（多选选中不影响菜单行为）。

## API

### oas-kanban

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `cards` | 卡片数据（JSON 数组 [{ id, column, title, ...任意字段 }]，column 为所属列 key）。拖拽落定后组件把新分组/顺序回写本属性（非受控回写 + attribute 反射）；renderCard 函数在场时不回写（数据由宿主持有） | `KanbanCard[] \| string` | `[]` |
| `columns` | 列定义（JSON 数组 [{ key, title, limit? }]；property 同名数组通道同效，setter 反射回 attribute）。limit 为 WIP 限制：列卡片数超限时列头计数转 warning 色 + data-over-limit 标记（提示语义非阻断，拖入照常落定），缺省/0/负数 = 不限制 | `KanbanColumn[] \| string` | `[]` |
| `empty-column-text` | 空列/空泳道单元格占位文案覆盖（默认走 i18n kanban.emptyColumn，随 locale 翻译） | `string` | — |
| `swimlane-by` | 泳道字段 key：按该字段值把看板横向分带（带头 = 折叠箭头 + 字段值 + 计数，默认全展开，折叠状态在数据变化时保留）；字段值缺失/空归「（空）」带；跨带拖拽 = 改泳道字段值；不带属性 = 普通列结构 | `string` | — |

#### Property（仅 JS property，不反射 attribute）

| Property | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `renderCard` | 自定义卡片渲染函数 (card) => Node \| string（property 通道，函数不可序列化不进 attribute/SSR）。返回 Node 直接挂载；返回字符串按纯文本渲染（防注入）。在场时卡片数据不反射回 cards 属性（宿主持有数据），拖拽与移动菜单照常派发 oas-change。置 null 恢复默认 title 渲染 | `KanbanCardRenderer \| null` | — |

#### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-change` | 拖拽换列/列内排序/触屏菜单移动落定后派发（拖回原位不派发）。detail { id, from, to, index }——from/to 为列 key，index 为落点在目标列的插入位（移除移动卡后的口径，宿主对目标列数组 splice(index, 0, card) 即可复现）；多选拖拽移动全部选中卡时派发一条，detail 加 ids（全部选中卡 id，按数据序，id 为首枚）；跨泳道落定加 swimlane { from, to }（泳道字段值变化） |
| `oas-column-reorder` | 列重排落定后派发（列头手柄拖拽 / 键盘 ←/→ / 触屏左移右移按钮；原位零操作不派发）。detail { from, to, keys }——from 为移动列原位次，to 为重排后新位次，keys 为重排后的列 key 全序；组件同时把新列序回写 columns attribute（卡片数据不动） |

#### CSS 变量

| CSS 变量 | 默认值 |
| --- | --- |
| `--oas-kanban-column-min-height` | `60px` |
| `--oas-kanban-column-min-width` | `220px` |

<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  customElements.whenDefined('oas-kanban').then(() => {
    // 基础用法：oas-change 反馈
    const basic = document.querySelector('#kanban-basic')
    if (basic) {
      const titles = {}
      for (const c of basic.cards) titles[c.id] = c.title
      const log = document.querySelector('#kanban-basic-log')
      basic.addEventListener('oas-change', (e) => {
        const { id, from, to, index } = e.detail
        if (log) log.textContent = `已派发 oas-change：「${titles[id] ?? id}」从「${from}」移到「${to}」第 ${index + 1} 位。`
      })
    }

    // 自定义渲染：renderCard property 通道（函数不可序列化，onMounted 内挂）
    const render = document.querySelector('#kanban-render')
    if (render) {
      render.renderCard = (card) => {
        const box = document.createElement('div')
        box.style.cssText = 'display:flex;flex-direction:column;gap:var(--oas-space-1);padding-inline-end:var(--oas-space-4)'
        const title = document.createElement('span')
        title.textContent = card.title
        title.style.fontWeight = '500'
        const meta = document.createElement('span')
        meta.style.cssText = 'display:flex;gap:var(--oas-space-2);align-items:center;color:var(--oas-color-text-secondary);font-size:var(--oas-font-size-xs)'
        const owner = document.createElement('span')
        owner.textContent = card.owner
        const state = document.createElement('oas-tag')
        state.textContent = card.state
        state.setAttribute('size', 'small')
        meta.appendChild(owner)
        meta.appendChild(state)
        box.appendChild(title)
        box.appendChild(meta)
        return box
      }
    }

    // 列重排：oas-column-reorder 反馈
    const reorder = document.querySelector('#kanban-reorder')
    if (reorder) {
      const log = document.querySelector('#kanban-reorder-log')
      reorder.addEventListener('oas-column-reorder', (e) => {
        const { from, to, keys } = e.detail
        if (log) log.textContent = `已派发 oas-column-reorder：第 ${from + 1} 列移到第 ${to + 1} 位，新列序 [${keys.join('、')}]。`
      })
    }

    // 多选批量移动：oas-change 的 ids 反馈
    const multi = document.querySelector('#kanban-multi')
    if (multi) {
      const titles = {}
      for (const c of multi.cards) titles[c.id] = c.title
      const log = document.querySelector('#kanban-multi-log')
      multi.addEventListener('oas-change', (e) => {
        const { id, ids, from, to } = e.detail
        const moved = (ids ?? [id]).map((cardId) => titles[cardId] ?? cardId)
        if (log) log.textContent = `移动 ${moved.length} 张卡（${moved.join('、')}）从「${from}」到「${to}」。`
      })
    }

    // 泳道：跨带拖拽的 swimlane 反馈
    const swim = document.querySelector('#kanban-swim')
    if (swim) {
      const titles = {}
      for (const c of swim.cards) titles[c.id] = c.title
      const log = document.querySelector('#kanban-swim-log')
      swim.addEventListener('oas-change', (e) => {
        const { id, swimlane } = e.detail
        if (!swimlane) return
        if (log) log.textContent = `「${titles[id] ?? id}」的泳道从「${swimlane.from || '（空）'}」改到「${swimlane.to || '（空）'}」。`
      })
    }
  })
})
</script>
