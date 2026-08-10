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
  <oas-select multiple value='["apple","banana"]' placeholder="可多选" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"},{"label":"草莓","value":"strawberry"}]'></oas-select>
</DemoBlock>

多选时 `value` 为 JSON 数组，选中项以标签展示，可单独移除。

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

多选选中标签超过 `max-tag-count` 时折叠为 `+N`（悬浮显示剩余项）。

## 允许创建

<DemoBlock title="允许创建（allow-create）">
  <oas-select allow-create searchable placeholder="输入不存在的选项创建" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"}]'></oas-select>
</DemoBlock>

搜索无匹配时显示「创建 xxx」项，点击或回车后以输入值创建新选项并纳入选中。

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
})
</script>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `allow-create` | 无匹配时允许以输入值创建新选项 | `boolean` | — |
| `clearable` | 可清空（有值时显示清空按钮，清空派发 `oas-clear`） | `boolean` | — |
| `disabled` | 禁用 | `boolean` | — |
| `loading` | 远程加载占位（与 `remote` 搭配使用） | `boolean` | — |
| `max-tag-count` | 多选标签超出数量后折叠为 `+N` | — | — |
| `multiple` | 多选 | `boolean` | — |
| `options` | 选项，JSON 数组 `[{ label, value, disabled?, group? }]` | `Option[] \| string` | `[]` |
| `placeholder` | 占位提示 | — | — |
| `remote` | 远程搜索：不做本地过滤，输入派发 `oas-input` 供宿主请求 | `boolean` | — |
| `searchable` | 可搜索（打开下拉后输入过滤） | `boolean` | — |
| `value` | 当前值（多选为 JSON 数组） | — | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-change` | 选择/清空变化，`detail: { value }` |
| `oas-clear` | 点击清空按钮，`detail: { value }`（清空前的值） |
| `oas-input` | `remote` 模式输入，`detail: { value }`（供宿主请求） |

> `options` 中带 `group` 字段的选项按组渲染组标题（不可选），组内选项缩进；键盘导航跨组连续。

键盘：`Enter` / `↓` 展开，`↑`/`↓` 移动高亮（搜索框内同样可用），`Enter` 选中，`Esc` 关闭。
