# Select 选择器

下拉选择器，支持单选、多选、分组、可清空、远程搜索与自定义创建，键盘可操作。

## 单选

<DemoBlock title="单选">
  <oas-select placeholder="请选择水果" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"},{"label":"草莓","value":"strawberry"}]'></oas-select>
</DemoBlock>

## 预设值

<DemoBlock title="预设值（value）">
  <oas-select value="banana" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"}]'></oas-select>
</DemoBlock>

## 多选

<DemoBlock title="多选（multiple）">
  <oas-select multiple value='["apple","banana","orange","strawberry"]' placeholder="可多选" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"},{"label":"草莓","value":"strawberry"},{"label":"西瓜","value":"watermelon"}]'></oas-select>
</DemoBlock>

多选时 `value` 为 JSON 数组，选中项以标签展示，可单独移除；标签默认换行展示、触发器随内容增高（不设置 `max-tag-count` 时不会折叠）。

## 禁用

<DemoBlock title="禁用">
  <oas-select disabled value="apple" placeholder="禁用" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"}]'></oas-select>
</DemoBlock>

## 空态

<DemoBlock title="无数据">
  <oas-select placeholder="暂无选项" options='[]'></oas-select>
</DemoBlock>

选项为空时下拉显示「暂无数据」。

## 可搜索

<DemoBlock title="可搜索（searchable）">
  <oas-select searchable placeholder="输入关键词过滤" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"},{"label":"草莓","value":"strawberry"},{"label":"西瓜","value":"watermelon"}]'></oas-select>
</DemoBlock>

打开下拉后可直接输入过滤，无匹配时显示「无匹配选项」。

## 分组

<DemoBlock title="分组（group）">
  <oas-select placeholder="按组浏览" options='[{"group":"温带水果","label":"苹果","value":"apple"},{"group":"温带水果","label":"梨","value":"pear"},{"group":"热带水果","label":"香蕉","value":"banana"},{"group":"热带水果","label":"芒果","value":"mango"},{"label":"其他","value":"other"}]'></oas-select>
</DemoBlock>

<DemoBlock title="分组多选">
  <oas-select multiple placeholder="分组多选" options='[{"group":"温带水果","label":"苹果","value":"apple"},{"group":"温带水果","label":"梨","value":"pear"},{"group":"热带水果","label":"香蕉","value":"banana"},{"group":"热带水果","label":"芒果","value":"mango"}]'></oas-select>
</DemoBlock>

选项带 `group` 字段时按组渲染组标题（不可选），组内选项缩进；键盘 `↑`/`↓` 跨组连续导航。

## 可清空

<DemoBlock title="可清空（clearable）">
  <oas-select clearable value="apple" placeholder="可清空" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"}]'></oas-select>
  <oas-select clearable multiple value='["apple","banana"]' placeholder="多选可清空" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"}]'></oas-select>
</DemoBlock>

有选中值时显示清空按钮，点击清空值并派发 `oas-clear` 与 `oas-change`。

## 远程搜索

<DemoBlock title="远程搜索（remote + loading）">
  <oas-select id="select-remote" remote searchable placeholder="输入关键词模拟远程搜索" options='[]'></oas-select>
  <span id="select-remote-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 180px"></span>
</DemoBlock>

`remote` 模式下组件不做本地过滤，输入派发 `oas-input` 供宿主请求；请求期间由宿主置 `loading` 显示加载占位。示例中模拟 800ms 延迟过滤：

<DemoBlock title="远程加载占位">
  <oas-select remote searchable loading placeholder="loading 占位演示" options='[]'></oas-select>
</DemoBlock>

## 标签折叠

<DemoBlock title="标签折叠（max-tag-count）">
  <oas-select multiple max-tag-count="2" value='["apple","banana","orange","strawberry"]' placeholder="超出折叠为 +N" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"},{"label":"草莓","value":"strawberry"},{"label":"西瓜","value":"watermelon"}]'></oas-select>
</DemoBlock>

多选标签默认换行展示、不折叠；仅显式设置 `max-tag-count` 时按数量折叠为 `+N`（悬浮显示剩余项）。

## 允许创建

<DemoBlock title="允许创建（allow-create）">
  <oas-select allow-create searchable placeholder="输入不存在的选项创建" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"}]'></oas-select>
</DemoBlock>

搜索无匹配时显示「创建 xxx」项，点击或回车后以输入值创建新选项并纳入选中。

## 自定义选项渲染

<DemoBlock title="自定义选项（图标 + 富文本）">
  <oas-select id="select-custom" multiple searchable placeholder="选择带图标的水果" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"},{"label":"草莓","value":"strawberry"}]'></oas-select>
</DemoBlock>

监听 `oas-option-render`（每个选项行）与 `oas-tag-render`（多选标签），`detail.element` 为对应文本容器，宿主可改写为任意内容（图标、富文本）；也可在组件内放 `<template slot="option">` / `<template slot="tag">` 提供静态骨架，`[data-option-label]` / `[data-tag-label]` 节点自动绑定选项/标签文本。

## 大数据量（虚拟滚动）

<DemoBlock title="万级选项虚拟滚动">
  <oas-select id="select-virtual" virtual searchable clearable item-height="36" placeholder="1 万条选项，滚动流畅" options='[]'></oas-select>
</DemoBlock>

设置 `virtual` 后仅渲染可视窗口（复用 `oas-virtual-list` 的窗口计算，首尾 padding 撑起滚动高度），万级选项滚动流畅；`item-height` 可调定高（默认 `36`）。键盘 `↑`/`↓` 导航时窗口自动跟随高亮项，`aria-activedescendant` 保持指向可见项；带 `group` 的选项自动回退全量渲染。

## 事件

<DemoBlock title="变化事件">
  <oas-select id="select-event" multiple placeholder="选择后触发 oas-change" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"}]'></oas-select>
  <span id="select-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 180px"></span>
</DemoBlock>

监听 `oas-change`，`detail.value` 单选为字符串、多选为数组：

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const el = document.getElementById('select-event')
  const out = document.getElementById('select-output')
  el?.addEventListener('oas-change', (e) => {
    out.textContent = `oas-change: [${e.detail.value.join(', ')}]`
  })

  // 远程搜索 demo：模拟宿主请求，输入 800ms 后按 label 过滤回填 options
  const remote = document.getElementById('select-remote')
  const remoteOut = document.getElementById('select-remote-output')
  const REMOTE_ALL = [
    { label: '苹果', value: 'apple' },
    { label: '香蕉', value: 'banana' },
    { label: '橙子', value: 'orange' },
    { label: '草莓', value: 'strawberry' },
    { label: '西瓜', value: 'watermelon' },
  ]
  let remoteTimer = 0
  remote?.addEventListener('oas-input', (e) => {
    const q = e.detail.value
    window.clearTimeout(remoteTimer)
    remote.setAttribute('loading', '')
    remoteTimer = window.setTimeout(() => {
      remote.removeAttribute('loading')
      remote.setAttribute(
        'options',
        JSON.stringify(q ? REMOTE_ALL.filter((o) => o.label.includes(q)) : REMOTE_ALL),
      )
    }, 800)
  })
  remote?.addEventListener('oas-change', (e) => {
    remoteOut.textContent = `oas-change: ${e.detail.value}`
  })

  // 自定义选项渲染 demo：图标 + 富文本（oas-option-render / oas-tag-render 改写 element）
  const custom = document.getElementById('select-custom')
  const CUSTOM_ICONS = { apple: '🍎', banana: '🍌', orange: '🍊', strawberry: '🍓' }
  custom?.addEventListener('oas-option-render', (e) => {
    const { option, element } = e.detail
    element.innerHTML = ''
    const ic = document.createElement('span')
    ic.textContent = CUSTOM_ICONS[option.value] ?? '•'
    const txt = document.createElement('span')
    txt.textContent = option.label
    element.append(ic, txt)
  })
  custom?.addEventListener('oas-tag-render', (e) => {
    const { value, element } = e.detail
    element.innerHTML = ''
    const ic = document.createElement('span')
    ic.textContent = CUSTOM_ICONS[value] ?? '•'
    element.append(ic)
  })

  // 虚拟滚动 demo：1 万条选项
  const virtual = document.getElementById('select-virtual')
  if (virtual) {
    virtual.setAttribute(
      'options',
      JSON.stringify(
        Array.from({ length: 10000 }, (_, i) => ({ label: `选项 ${i}`, value: `v${i}` })),
      ),
    )
  }
})
</script>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `allow-create` | 无匹配时允许以输入值创建新选项 | `boolean` | — |
| `clearable` | 可清空（有值时显示清空按钮，清空派发 `oas-clear`） | `boolean` | — |
| `disabled` | 禁用 | `boolean` | — |
| `item-height` | 虚拟滚动时每项固定高度（px） | `string` | `36` |
| `loading` | 远程加载占位（与 `remote` 搭配使用） | `boolean` | — |
| `max-tag-count` | 多选标签按数量折叠为 `+N`（需显式设置；未设置时标签默认换行展示，不折叠） | `boolean` | — |
| `multiple` | 多选 | `boolean` | — |
| `options` | 选项，JSON 数组 `[{ label, value, disabled?, group? }]` | `Option[] \| string` | `[]` |
| `placeholder` | 占位提示 | — | — |
| `remote` | 远程搜索：不做本地过滤，输入派发 `oas-input` 供宿主请求 | `boolean` | — |
| `searchable` | 可搜索（打开下拉后输入过滤） | `boolean` | — |
| `value` | 当前值（多选为 JSON 数组） | — | — |
| `virtual` | 大数据量虚拟滚动：只渲染可视窗口，滚动流畅（复用 oas-virtual-list）；带 `group` 的选项自动回退全量渲染 | `boolean` | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-change` | 选择/清空变化，`detail: { value }` |
| `oas-clear` | 点击清空按钮，`detail: { value }`（清空前的值） |
| `oas-input` | `remote` 模式输入，`detail: { value }`（供宿主请求） |
| `oas-option-render` | 每个渲染的选项行派发，`detail: { index, option, element }`（element 为选项 label 容器，宿主可改写为图标/富文本） |
| `oas-tag-render` | 多选标签渲染时派发，`detail: { value, label, element }`（element 为标签文本容器，宿主可改写） |

### 插槽

| 名称 | 说明 |
| --- | --- |
| `template[slot="option"]` | 选项行静态模板，克隆到每个选项 label 容器；`[data-option-label]` 节点自动绑定选项 label |
| `template[slot="tag"]` | 多选标签静态模板，克隆到每个 chip 的文本容器；`[data-tag-label]` 节点自动绑定标签 label |

> `options` 中带 `group` 字段的选项按组渲染组标题（不可选），组内选项缩进；键盘导航跨组连续。

键盘：`Enter` / `↓` 展开，`↑`/`↓` 移动高亮（搜索框内同样可用），`Enter` 选中，`Esc` 关闭。
