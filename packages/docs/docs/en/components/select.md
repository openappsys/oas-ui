# Select

A dropdown selector supporting single/multiple selection, groups, clearable, remote search, and custom creation, with full keyboard operation.

## Single Select

<DemoBlock title="Single select">
  <oas-select placeholder="请选择水果" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"},{"label":"草莓","value":"strawberry"}]'></oas-select>
</DemoBlock>

## Preset Value

<DemoBlock title="Preset value">
  <oas-select value="banana" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"}]'></oas-select>
</DemoBlock>

## Multiple Select

<DemoBlock title="Multiple">
  <oas-select multiple value='["apple","banana"]' placeholder="可多选" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"},{"label":"草莓","value":"strawberry"}]'></oas-select>
</DemoBlock>

In multiple mode `value` is a JSON array; selected items are shown as tags that can be removed individually.

## Disabled

<DemoBlock title="Disabled">
  <oas-select disabled value="apple" placeholder="禁用" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"}]'></oas-select>
</DemoBlock>

## Empty State

<DemoBlock title="No data">
  <oas-select placeholder="暂无选项" options='[]'></oas-select>
</DemoBlock>

When options are empty, the dropdown shows "暂无数据".

## Searchable

<DemoBlock title="Searchable">
  <oas-select searchable placeholder="输入关键词过滤" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"},{"label":"草莓","value":"strawberry"},{"label":"西瓜","value":"watermelon"}]'></oas-select>
</DemoBlock>

Once opened, you can type directly to filter; when nothing matches, "无匹配选项" is shown.

## Groups

<DemoBlock title="Grouped">
  <oas-select placeholder="按组浏览" options='[{"group":"温带水果","label":"苹果","value":"apple"},{"group":"温带水果","label":"梨","value":"pear"},{"group":"热带水果","label":"香蕉","value":"banana"},{"group":"热带水果","label":"芒果","value":"mango"},{"label":"其他","value":"other"}]'></oas-select>
</DemoBlock>

<DemoBlock title="Grouped multiple">
  <oas-select multiple placeholder="分组多选" options='[{"group":"温带水果","label":"苹果","value":"apple"},{"group":"温带水果","label":"梨","value":"pear"},{"group":"热带水果","label":"香蕉","value":"banana"},{"group":"热带水果","label":"芒果","value":"mango"}]'></oas-select>
</DemoBlock>

Options carrying a `group` field are rendered under a group title (not selectable), with items indented; keyboard `↑`/`↓` navigates continuously across groups.

## Clearable

<DemoBlock title="Clearable">
  <oas-select clearable value="apple" placeholder="可清空" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"}]'></oas-select>
  <oas-select clearable multiple value='["apple","banana"]' placeholder="多选可清空" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"}]'></oas-select>
</DemoBlock>

When a value is selected, a clear button appears; clicking clears the value and dispatches `oas-clear` and `oas-change`.

## Remote Search

<DemoBlock title="Remote search (remote + loading)">
  <oas-select id="select-remote" remote searchable placeholder="输入关键词模拟远程搜索" options='[]'></oas-select>
  <span id="select-remote-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 180px"></span>
</DemoBlock>

In `remote` mode the component does no local filtering: typing dispatches `oas-input` for the host to request data, and the host sets `loading` during the request to show a loading placeholder. This example simulates an 800ms delayed filter:

<DemoBlock title="Remote loading placeholder">
  <oas-select remote searchable loading placeholder="loading 占位演示" options='[]'></oas-select>
</DemoBlock>

## Tag Collapse

<DemoBlock title="Tag collapse (max-tag-count)">
  <oas-select multiple max-tag-count="2" value='["apple","banana","orange","strawberry"]' placeholder="超出折叠为 +N" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"},{"label":"草莓","value":"strawberry"},{"label":"西瓜","value":"watermelon"}]'></oas-select>
</DemoBlock>

When the selected tags exceed `max-tag-count`, they collapse into `+N` (hover to see the remaining items).

## Allow Create

<DemoBlock title="Allow create">
  <oas-select allow-create searchable placeholder="输入不存在的选项创建" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"}]'></oas-select>
</DemoBlock>

When search yields no match, a "创建 xxx" item is shown; clicking or pressing Enter creates a new option from the input value and selects it.

## Events

<DemoBlock title="Change events">
  <oas-select id="select-event" multiple placeholder="选择后触发 oas-change" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"}]'></oas-select>
  <span id="select-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 180px"></span>
</DemoBlock>

Listen to `oas-change`; `detail.value` is a string for single select and an array for multiple:

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

| Property          | Description                                                             | Default  |
| ----------------- | ----------------------------------------------------------------------- | -------- |
| `value`           | Current value (JSON array in multiple mode)                             | —        |
| `options`         | Options, JSON array `[{ label, value, disabled?, group? }]`             | `[]`     |
| `placeholder`     | Placeholder text                                                        | `请选择` |
| `multiple`        | Multiple select                                                         | `false`  |
| `disabled`        | Disabled                                                                | `false`  |
| `searchable`      | Searchable (type to filter after opening the dropdown)                  | `false`  |
| `clearable`       | Clearable (shows a clear button when a value exists; clearing dispatches `oas-clear`) | `false` |
| `remote`          | Remote search: no local filtering, typing dispatches `oas-input` for the host to request | `false` |
| `loading`         | Remote loading placeholder (use with `remote`)                          | `false`  |
| `max-tag-count`   | Collapse tags beyond this count into `+N` in multiple mode              | —        |
| `allow-create`    | Allow creating new options from the input value when nothing matches    | `false`  |

> Options carrying a `group` field are rendered under a group title (not selectable), items are indented; keyboard navigation continues across groups.

Keyboard: `Enter` / `↓` to open, `↑`/`↓` to move the highlight (works inside the search box too), `Enter` to select, `Esc` to close.

| Event         | Description                                             |
| ------------- | ------------------------------------------------------- |
| `oas-change`  | Selection/clear change, `detail: { value }`             |
| `oas-input`   | Input in `remote` mode, `detail: { value }` (for host requests) |
| `oas-clear`   | Clear button clicked, `detail: { value }` (value before clearing) |
