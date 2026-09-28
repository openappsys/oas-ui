# Kanban 看板

列 + 卡片的看板视图：卡片在列间拖拽换列、列内拖拽排序，落定后派发 `oas-change` 供宿主同步数据。适合任务流转、需求池、招聘进度等阶段化协作场景。

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

- 触屏设备（`pointer: coarse`）不支持 HTML5 拖拽：每张卡片右上角提供移动按钮，点开菜单可上移/下移/移到指定列（首卡禁用上移、末卡禁用下移）；
- 键盘可达：卡片 `tabindex=0` 可聚焦，列体为 `role="list"`、卡片为 `role="listitem"`，携带列名与卡片标题的可读名称。

## API

### oas-kanban

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `cards` | 卡片数据（JSON 数组 [{ id, column, title, ...任意字段 }]，column 为所属列 key）。拖拽落定后组件把新分组/顺序回写本属性（非受控回写 + attribute 反射）；renderCard 函数在场时不回写（数据由宿主持有） | `KanbanCard[] \| string` | `[]` |
| `columns` | 列定义（JSON 数组 [{ key, title }]；property 同名数组通道同效，setter 反射回 attribute） | `KanbanColumn[] \| string` | `[]` |
| `empty-column-text` | 空列占位文案覆盖（默认走 i18n kanban.emptyColumn，随 locale 翻译） | `string` | — |

#### Property（仅 JS property，不反射 attribute）

| Property | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `renderCard` | 自定义卡片渲染函数 (card) => Node \| string（property 通道，函数不可序列化不进 attribute/SSR）。返回 Node 直接挂载；返回字符串按纯文本渲染（防注入）。在场时卡片数据不反射回 cards 属性（宿主持有数据），拖拽与移动菜单照常派发 oas-change。置 null 恢复默认 title 渲染 | `KanbanCardRenderer \| null` | — |

#### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-change` | 拖拽换列/列内排序/触屏菜单移动落定后派发（拖回原位不派发）。detail { id, from, to, index }——from/to 为列 key，index 为落点在目标列的插入位（移除卡片自身后的口径，宿主对目标列数组 splice(index, 0, card) 即可复现） |

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
  })
})
</script>
