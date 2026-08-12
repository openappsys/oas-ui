# Select

A dropdown selector supporting single/multiple selection, groups, clearable, remote search, and custom creation, with full keyboard operation.

## Single Select

<DemoBlock title="Single select">
  <oas-select placeholder="Select a fruit" options='[{"label":"Apple","value":"apple"},{"label":"Banana","value":"banana"},{"label":"Orange","value":"orange"},{"label":"Strawberry","value":"strawberry"}]'></oas-select>
</DemoBlock>

## Preset Value

<DemoBlock title="Preset value">
  <oas-select value="banana" options='[{"label":"Apple","value":"apple"},{"label":"Banana","value":"banana"},{"label":"Orange","value":"orange"}]'></oas-select>
</DemoBlock>

## Multiple Select

<DemoBlock title="Multiple">
  <oas-select multiple value='["apple","banana","orange","strawberry"]' placeholder="Multiple" options='[{"label":"Apple","value":"apple"},{"label":"Banana","value":"banana"},{"label":"Orange","value":"orange"},{"label":"Strawberry","value":"strawberry"},{"label":"Watermelon","value":"watermelon"}]'></oas-select>
</DemoBlock>

In multiple mode `value` is a JSON array; selected items are shown as tags that can be removed individually. Tags wrap to new lines by default and the trigger grows with the content (no collapsing unless `max-tag-count` is set).

## Disabled

<DemoBlock title="Disabled">
  <oas-select disabled value="apple" placeholder="Disabled" options='[{"label":"Apple","value":"apple"},{"label":"Banana","value":"banana"}]'></oas-select>
</DemoBlock>

## Empty State

<DemoBlock title="No data">
  <oas-select placeholder="No options" options='[]'></oas-select>
</DemoBlock>

When options are empty, the dropdown shows "暂无数据".

## Searchable

<DemoBlock title="Searchable">
  <oas-select searchable placeholder="Type a keyword to filter" options='[{"label":"Apple","value":"apple"},{"label":"Banana","value":"banana"},{"label":"Orange","value":"orange"},{"label":"Strawberry","value":"strawberry"},{"label":"Watermelon","value":"watermelon"}]'></oas-select>
</DemoBlock>

Once opened, you can type directly to filter; when nothing matches, "无匹配选项" is shown.

## Groups

<DemoBlock title="Grouped">
  <oas-select placeholder="Browse by group" options='[{"group":"Temperate fruits","label":"Apple","value":"apple"},{"group":"Temperate fruits","label":"Pear","value":"pear"},{"group":"Tropical fruits","label":"Banana","value":"banana"},{"group":"Tropical fruits","label":"Mango","value":"mango"},{"label":"Other","value":"other"}]'></oas-select>
</DemoBlock>

<DemoBlock title="Grouped multiple">
  <oas-select multiple placeholder="Grouped multiple" options='[{"group":"Temperate fruits","label":"Apple","value":"apple"},{"group":"Temperate fruits","label":"Pear","value":"pear"},{"group":"Tropical fruits","label":"Banana","value":"banana"},{"group":"Tropical fruits","label":"Mango","value":"mango"}]'></oas-select>
</DemoBlock>

Options carrying a `group` field are rendered under a group title (not selectable), with items indented; keyboard `↑`/`↓` navigates continuously across groups.

## Clearable

<DemoBlock title="Clearable">
  <oas-select clearable value="apple" placeholder="Clearable" options='[{"label":"Apple","value":"apple"},{"label":"Banana","value":"banana"},{"label":"Orange","value":"orange"}]'></oas-select>
  <oas-select clearable multiple value='["apple","banana"]' placeholder="Multiple, clearable" options='[{"label":"Apple","value":"apple"},{"label":"Banana","value":"banana"},{"label":"Orange","value":"orange"}]'></oas-select>
</DemoBlock>

When a value is selected, a clear button appears; clicking clears the value and dispatches `oas-clear` and `oas-change`.

## Remote Search

<DemoBlock title="Remote search (remote + loading)">
  <oas-select id="select-remote" remote searchable placeholder="Type a keyword to simulate remote search" options='[]'></oas-select>
  <span id="select-remote-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 180px"></span>
</DemoBlock>

In `remote` mode the component does no local filtering: typing dispatches `oas-input` for the host to request data, and the host sets `loading` during the request to show a loading placeholder. This example simulates an 800ms delayed filter:

<DemoBlock title="Remote loading placeholder">
  <oas-select remote searchable loading placeholder="Loading placeholder demo" options='[]'></oas-select>
</DemoBlock>

## Tag Collapse

<DemoBlock title="Tag collapse (max-tag-count)">
  <oas-select multiple max-tag-count="2" value='["apple","banana","orange","strawberry"]' placeholder="Collapse into +N when exceeded" options='[{"label":"Apple","value":"apple"},{"label":"Banana","value":"banana"},{"label":"Orange","value":"orange"},{"label":"Strawberry","value":"strawberry"},{"label":"Watermelon","value":"watermelon"}]'></oas-select>
</DemoBlock>

Multiple-select tags wrap by default and do not collapse; only when `max-tag-count` is explicitly set do they collapse into `+N` (hover to see the remaining items).

## Allow Create

<DemoBlock title="Allow create">
  <oas-select allow-create searchable placeholder="Type a non-existent option to create" options='[{"label":"Apple","value":"apple"},{"label":"Banana","value":"banana"},{"label":"Orange","value":"orange"}]'></oas-select>
</DemoBlock>

When search yields no match, a "创建 xxx" item is shown; clicking or pressing Enter creates a new option from the input value and selects it.

## Events

<DemoBlock title="Change events">
  <oas-select id="select-event" multiple placeholder="Select to trigger oas-change" options='[{"label":"Apple","value":"apple"},{"label":"Banana","value":"banana"},{"label":"Orange","value":"orange"}]'></oas-select>
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

  // remote search demo: simulate host requests, filter and refill options by label after an 800ms delay
  const remote = document.getElementById('select-remote')
  const remoteOut = document.getElementById('select-remote-output')
  const REMOTE_ALL = [
    { label: 'Apple', value: 'apple' },
    { label: 'Banana', value: 'banana' },
    { label: 'Orange', value: 'orange' },
    { label: 'Strawberry', value: 'strawberry' },
    { label: 'Watermelon', value: 'watermelon' },
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

### Attributes

| Attribute       | Description                                                                                                     | Type                 | Default |
| --------------- | --------------------------------------------------------------------------------------------------------------- | -------------------- | ------- |
| `allow-create`  | Allow creating new options from the input value when nothing matches                                            | `boolean`            | —       |
| `clearable`     | Clearable (shows a clear button when a value exists; clearing dispatches `oas-clear`)                           | `boolean`            | —       |
| `disabled`      | Disabled                                                                                                        | `boolean`            | —       |
| `loading`       | Remote loading placeholder (use with `remote`)                                                                  | `boolean`            | —       |
| `max-tag-count` | Collapse tags beyond this count into `+N` in multiple mode (opt-in; without it tags wrap instead of collapsing) | `boolean`            | —       |
| `multiple`      | Multiple select                                                                                                 | `boolean`            | —       |
| `options`       | Options, JSON array `[{ label, value, disabled?, group? }]`                                                     | `Option[] \| string` | `[]`    |
| `placeholder`   | Placeholder text                                                                                                | —                    | —       |
| `remote`        | Remote search: no local filtering, typing dispatches `oas-input` for the host to request                        | `boolean`            | —       |
| `searchable`    | Searchable (type to filter after opening the dropdown)                                                          | `boolean`            | —       |
| `value`         | Current value (JSON array in multiple mode)                                                                     | —                    | —       |

### Events

| Event        | Description                                                       |
| ------------ | ----------------------------------------------------------------- |
| `oas-change` | Selection/clear change, `detail: { value }`                       |
| `oas-clear`  | Clear button clicked, `detail: { value }` (value before clearing) |
| `oas-input`  | Input in `remote` mode, `detail: { value }` (for host requests)   |

> Options carrying a `group` field are rendered under a group title (not selectable), items are indented; keyboard navigation continues across groups.

Keyboard: `Enter` / `↓` to open, `↑`/`↓` to move the highlight (works inside the search box too), `Enter` to select, `Esc` to close.
