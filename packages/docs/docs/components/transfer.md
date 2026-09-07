# Transfer 穿梭框

左右双面板 + 中间穿梭按钮，支持搜索过滤、键盘操作、目标侧拖拽排序与选中即移动模式。

## 基础用法

<DemoBlock title="基础">
  <oas-transfer id="transfer-basic"></oas-transfer>
</DemoBlock>

面板头显示「已选/可见」计数（如 `1/3`），随勾选与过滤实时更新。

## 预置选中值与标题

<DemoBlock title="预置 value + titles">
  <oas-transfer id="transfer-preset" value='["b"]' titles='["可选水果", "已选水果"]'></oas-transfer>
</DemoBlock>

## 可搜索

<DemoBlock title="searchable">
  <oas-transfer id="transfer-search" searchable></oas-transfer>
</DemoBlock>

## 区分大小写搜索

<DemoBlock title="searchable + case-sensitive">
  <oas-transfer id="transfer-casesensitive" searchable case-sensitive></oas-transfer>
</DemoBlock>

## 单向模式

只能从左向右穿梭，右侧只读；左侧展示全部数据，已穿梭项禁用并显示为已选。

<DemoBlock title="one-way">
  <oas-transfer id="transfer-oneway" one-way></oas-transfer>
</DemoBlock>

## 目标顺序与拖拽排序

`target-sort` 控制右面板顺序策略：

- `original`（默认）：保持数据源顺序（与 `data` 一致）
- `push`：新穿梭项追加到尾部
- `unshift`：新穿梭项依次插入头部

`target-draggable` 开启右面板拖拽排序（顺序即业务含义的「已选清单」场景）；键盘替代：先点选右侧某行，`Alt + ↑/↓` 移动其位置（拖拽必须有无障碍替代通道）。`original` 模式顺序由数据源决定，拖拽不生效——需要手动排序时请配 `push` / `unshift`。

<DemoBlock title="target-sort=push + target-draggable">
  <oas-transfer id="transfer-sort" target-sort="push" target-draggable value='["a"]'></oas-transfer>
</DemoBlock>

<DemoBlock title="target-sort=unshift（新穿梭项置顶）">
  <oas-transfer id="transfer-unshift" target-sort="unshift"></oas-transfer>
</DemoBlock>

## 选中即移动（simple）

`simple` 开启后点击行立即穿梭（免中央按钮，触屏友好），中央按钮隐藏；默认关闭，维持「选完点按钮」的主形态。

<DemoBlock title="simple">
  <oas-transfer id="transfer-simple" simple></oas-transfer>
</DemoBlock>

## 行自定义（item 插槽）

`template[slot="item"]` 克隆进每行（静态与虚拟滚动面板一致），`[data-item-label]` 自动绑定选项文本：

<DemoBlock title="item 插槽（角色图标 + 富文本行）">
  <oas-transfer id="transfer-item">
    <template slot="item">
      <oas-icon name="user" size="16"></oas-icon>
      <span data-item-label></span>
    </template>
  </oas-transfer>
</DemoBlock>

## 空态自定义（empty 插槽）

`template[slot="empty"]` 自定义空态（真空态与搜索无匹配态共用，双侧共用）：

<DemoBlock title="empty 插槽">
  <oas-transfer id="transfer-empty">
    <template slot="empty">
      <div style="padding: var(--oas-space-2); color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">暂无数据，请从左侧选择</div>
    </template>
  </oas-transfer>
</DemoBlock>

## 虚拟滚动

万级数据窗口化渲染，滚动流畅，选中态 / 全选 / 键盘导航保持。

<DemoBlock title="virtual（10000 项，item-height 32）">
  <oas-transfer id="transfer-virtual" virtual searchable item-height="32"></oas-transfer>
</DemoBlock>

## 禁用

`disabled` 禁用整组交互（行/全选/搜索/穿梭按钮/键盘），并镜像宿主 `data-disabled` 供样式消费；`disabled-skip` 豁免全局禁用注入。

<DemoBlock title="disabled（查看态回显）">
  <oas-transfer id="transfer-disabled" disabled value='["a"]'></oas-transfer>
</DemoBlock>

## 事件

<DemoBlock title="变化事件">
  <oas-transfer id="transfer-event"></oas-transfer>
  <span id="transfer-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 200px"></span>
</DemoBlock>

<DemoBlock title="选中与搜索事件">
  <oas-transfer id="transfer-events" searchable></oas-transfer>
  <span id="transfer-events-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 260px"></span>
</DemoBlock>

- `oas-change`：穿梭后值变化，`detail: { value }`
- `oas-select-change`：面板选中集变化（点行 / 全选 / 键盘选中均派发），`detail: { side: 'left' | 'right', selected: string[] }`
- `oas-search`：搜索输入，`detail: { side, query }`

## 键盘操作

| 按键 | 行为 |
| --- | --- |
| `↑` / `↓` | 移动选中（单选语义的导航态） |
| `Enter` | 穿梭当前选中项 |
| `Space` | 切换当前选中项勾选 |
| `Ctrl/⌘ + A` | 全选/全清当前面板可见可选项 |
| `Alt + ↑/↓` | 右面板排序（`target-draggable` 的键盘替代，需先选中一行） |

## 树形数据穿梭（oas-tree 组合示例）

树形 / 表格式穿梭不进组件数据协议，用 `oas-tree`（勾选）+ `transfer`（value 联动）组合达成：

<DemoBlock title="部门树选人（oas-tree + transfer 联动）">
  <div style="display: flex; gap: 16px; align-items: flex-start; flex-wrap: wrap">
    <oas-tree id="transfer-tree" checkable style="min-width: 200px"></oas-tree>
    <oas-transfer id="transfer-tree-panel" style="flex: 1; min-width: 360px"></oas-transfer>
  </div>
</DemoBlock>

表格式穿梭（多列信息）同理：宿主用 `oas-table` 渲染左侧数据，勾选变化时把 key 集合同步给 transfer 的 `value`。

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const basic = document.getElementById('transfer-basic')
  if (basic) basic.data = [
    { key: 'a', label: '苹果' },
    { key: 'b', label: '香蕉' },
    { key: 'c', label: '橙子' },
    { key: 'd', label: '葡萄', disabled: true },
  ]
  const preset = document.getElementById('transfer-preset')
  if (preset) preset.data = [
    { key: 'a', label: '苹果' },
    { key: 'b', label: '香蕉' },
    { key: 'c', label: '橙子' },
  ]
  const search = document.getElementById('transfer-search')
  if (search) search.data = [
    { key: 'a', label: '苹果' },
    { key: 'b', label: '香蕉' },
    { key: 'c', label: '橙子' },
    { key: 'd', label: '草莓' },
    { key: 'e', label: '西瓜' },
  ]
  const cs = document.getElementById('transfer-casesensitive')
  if (cs) cs.data = [
    { key: 'a', label: 'Apple' },
    { key: 'b', label: 'apricot' },
    { key: 'c', label: 'Banana' },
  ]
  const oneway = document.getElementById('transfer-oneway')
  if (oneway) oneway.data = [
    { key: 'a', label: '苹果' },
    { key: 'b', label: '香蕉' },
    { key: 'c', label: '橙子' },
    { key: 'd', label: '草莓' },
  ]
  const virtual = document.getElementById('transfer-virtual')
  if (virtual) virtual.data = Array.from({ length: 10000 }, (_, i) => ({ key: 'k' + i, label: '项目 ' + i }))
  const el = document.getElementById('transfer-event')
  if (el) {
    el.data = [
      { key: 'a', label: '苹果' },
      { key: 'b', label: '香蕉' },
      { key: 'c', label: '橙子' },
    ]
    const out = document.getElementById('transfer-output')
    el.addEventListener('oas-change', (e) => {
      out.textContent = `oas-change: [${e.detail.value.join(', ')}]`
    })
  }

  // target-sort + 拖拽排序
  const sort = document.getElementById('transfer-sort')
  if (sort) {
    sort.data = [
      { key: 'a', label: '苹果' },
      { key: 'b', label: '香蕉' },
      { key: 'c', label: '橙子' },
      { key: 'd', label: '葡萄' },
    ]
    const out = document.getElementById('transfer-output')
    sort.addEventListener('oas-change', (e) => {
      out.textContent = `拖拽排序后 value: [${e.detail.value.join(', ')}]`
    })
  }
  const unshift = document.getElementById('transfer-unshift')
  if (unshift) unshift.data = [
    { key: 'a', label: '苹果' },
    { key: 'b', label: '香蕉' },
    { key: 'c', label: '橙子' },
  ]

  // simple
  const simple = document.getElementById('transfer-simple')
  if (simple) simple.data = [
    { key: 'a', label: '苹果' },
    { key: 'b', label: '香蕉' },
    { key: 'c', label: '橙子' },
  ]

  // item 插槽
  const item = document.getElementById('transfer-item')
  if (item) item.data = [
    { key: 'a', label: '管理员' },
    { key: 'b', label: '开发' },
    { key: 'c', label: '测试' },
    { key: 'd', label: '访客' },
  ]

  // empty 插槽（空数据展示插槽内容）
  const emptyEl = document.getElementById('transfer-empty')
  if (emptyEl) emptyEl.data = []

  // disabled
  const dis = document.getElementById('transfer-disabled')
  if (dis) dis.data = [
    { key: 'a', label: '苹果' },
    { key: 'b', label: '香蕉' },
    { key: 'c', label: '橙子' },
  ]

  // 选中与搜索事件
  const evts = document.getElementById('transfer-events')
  if (evts) {
    evts.data = [
      { key: 'a', label: '苹果' },
      { key: 'b', label: '香蕉' },
      { key: 'c', label: '橙子' },
      { key: 'd', label: '草莓' },
    ]
    const out = document.getElementById('transfer-events-output')
    evts.addEventListener('oas-select-change', (e) => {
      out.textContent = `oas-select-change: ${e.detail.side} [${e.detail.selected.join(', ')}]`
    })
    evts.addEventListener('oas-search', (e) => {
      out.textContent = `oas-search: ${e.detail.side} "${e.detail.query}"`
    })
  }

  // 树形数据穿梭组合：tree 勾选 → transfer value 联动（叶子项）
  const tree = document.getElementById('transfer-tree')
  const panel = document.getElementById('transfer-tree-panel')
  if (tree && panel) {
    const leaves = [
      { key: 'fe-1', label: '张三' },
      { key: 'fe-2', label: '李四' },
      { key: 'be-1', label: '王五' },
      { key: 'be-2', label: '赵六' },
      { key: 'pm-1', label: '孙七' },
    ]
    tree.data = [
      { key: 'fe', label: '前端组', children: [leaves[0], leaves[1]] },
      { key: 'be', label: '后端组', children: [leaves[2], leaves[3]] },
      { key: 'pm', label: '产品组', children: [leaves[4]] },
    ]
    panel.data = leaves
    const leafKeys = new Set(leaves.map((i) => i.key))
    tree.addEventListener('oas-check', () => {
      const checked = (tree.getAttribute('checked') || '').split(',').filter(Boolean)
      panel.setAttribute('value', JSON.stringify(checked.filter((k) => leafKeys.has(k))))
    })
  }
})
</script>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `case-sensitive` | 搜索区分大小写（默认大小写不敏感） | `boolean` | — |
| `data` | 数据（JSON attribute 声明式通道，property 赋值单向反射，[{ key, label, disabled }]） | `TransferItem[] \| string` | `[]` |
| `disabled` | 禁用（行点击/按钮/搜索全部失效；宿主镜像 data-disabled） | `boolean` | — |
| `item-height` | 虚拟滚动每行固定高度（px），默认 36 | `string` | `36` |
| `one-way` | 单向模式：只能左→右移动，右侧只读；左侧展示全部数据，已穿梭项禁用并显示为已选 | `boolean` | — |
| `searchable` | 面板内搜索过滤（左右各自过滤） | `boolean` | — |
| `simple` | 选中即移动（免点穿梭按钮，默认关） | `boolean` | — |
| `source-title` | 左面板标题 | — | — |
| `target-draggable` | 目标侧拖拽排序（需配 target-sort=push/unshift；original 模式顺序由数据源决定不启用） | `boolean` | — |
| `target-sort` | 目标侧排序：`original`（默认，按数据源序）/ `push`（依次入尾）/ `unshift`（依次插头）。⚠️ 注意 value 数组顺序语义：original 下乱序预置 value 会被归一到数据源序 | `string` | `original` |
| `target-title` | 右面板标题 | — | — |
| `titles` | 双面板标题（JSON 数组）或 `source-title`/`target-title` | `string` | — |
| `value` | 已选 key 数组（JSON 属性） | `string` | `[]` |
| `virtual` | 大数据量窗口化渲染（虚拟滚动，行高默认 36px） | `boolean` | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-change` | 穿梭后值变化，`detail: { value }` |
| `oas-search` | 面板搜索输入，`detail: { side, query }` |
| `oas-select-change` | 选中集合变化（点行/全选/键盘），`detail: { side, selected }` |

### 插槽

| 名称 | 说明 |
| --- | --- |
| `template[slot="empty"]` | 空态与无匹配共用自定义内容 |
| `template[slot="item"]` | 自定义行（`[data-item-label]` 绑定，静态+虚拟行一致） |

键盘：聚焦面板列表后 `↑`/`↓` 移动选中，`Enter` 穿梭。
