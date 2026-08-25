# ToggleGroup

A mutually exclusive button group for single/multiple selection: single mode uses radio semantics, multiple mode uses checkbox semantics; keyboard arrow navigation and controlled `value`.

## Single Select

Without `multiple`, it is single-select (`role="radiogroup"` + `radio`); `value` is a string, and only one item is pressed at a time.

<DemoBlock title="Single select">
  <oas-toggle-group id="tg-single" items='[{"label":"Day","value":"day"},{"label":"Week","value":"week"},{"label":"Month","value":"month"}]'></oas-toggle-group>
  <span id="tg-single-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">Current: day</span>
</DemoBlock>

## Multiple Select

With `multiple`, it becomes multi-select (`role="group"` + `checkbox`); `value` is a JSON array string.

<DemoBlock title="Multiple select">
  <oas-toggle-group id="tg-multi" multiple items='[{"label":"Bold","value":"bold"},{"label":"Italic","value":"italic"},{"label":"Underline","value":"underline"}]'></oas-toggle-group>
  <span id="tg-multi-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">Current: []</span>
</DemoBlock>

## Disabled

Item-level `disabled: true` disables that item; disabled items are skipped in keyboard navigation.

<DemoBlock title="Disabled items">
  <oas-toggle-group items='[{"label":"Editable","value":"editable"},{"label":"Readonly","value":"readonly","disabled":true},{"label":"Deletable","value":"deletable"}]'></oas-toggle-group>
</DemoBlock>

## Controlled Selection (value)

`value` is a controlled channel: a string for single select, a JSON array string for multiple; externally setting the attribute immediately reflects in the selected state (clicks inside the group also write back the attribute). The buttons below drive the selection externally:

<DemoBlock title="Controlled value">
  <oas-toggle-group id="tg-controlled" value="week" items='[{"label":"Day","value":"day"},{"label":"Week","value":"week"},{"label":"Month","value":"month"}]'></oas-toggle-group>
  <oas-toggle-group id="tg-controlled-multi" multiple value='["bold"]' items='[{"label":"Bold","value":"bold"},{"label":"Italic","value":"italic"},{"label":"Underline","value":"underline"}]'></oas-toggle-group>
  <oas-button id="tg-set-day" size="small">Single: Day</oas-button>
  <oas-button id="tg-set-month" size="small">Single: Month</oas-button>
  <oas-button id="tg-set-multi" size="small">Multiple: Italic + Underline</oas-button>
</DemoBlock>

Presetting `value="week"` / `value='["bold"]'` gives both groups an initial selected state; writing the `value` attribute externally switches the selected state immediately.

## Declarative Child-Element Channel

Besides the `items` JSON, you can declare options declaratively with `<oas-toggle-item>` child elements (the `items` attribute *takes precedence when explicitly set*; otherwise child elements are parsed and converge into the same rendering path). The default slot text is the label; attributes map to the `ToggleItem` fields: `value` / `disabled`. Child additions, removals, attribute and text changes re-render automatically (MutationObserver); single/multiple (`multiple`) semantics are identical to the items channel.

<DemoBlock title="Declarative child elements (single + multiple)">
  <oas-space size="small">
    <oas-toggle-group id="tg-decl" value="week">
      <oas-toggle-item value="day">Day</oas-toggle-item>
      <oas-toggle-item value="week">Week</oas-toggle-item>
      <oas-toggle-item value="month" disabled>Month (disabled)</oas-toggle-item>
    </oas-toggle-group>
    <oas-toggle-group id="tg-decl-multi" multiple>
      <oas-toggle-item value="bold">Bold</oas-toggle-item>
      <oas-toggle-item value="italic">Italic</oas-toggle-item>
      <oas-toggle-item value="underline">Underline</oas-toggle-item>
    </oas-toggle-group>
    <oas-button id="tg-decl-add" size="small">Add one dynamically</oas-button>
  </oas-space>
</DemoBlock>

## Events

Clicking or keyboard toggling dispatches `oas-change`; single select: `detail: { value: string }`, multiple select: `detail: { value: string[] }`.

<DemoBlock title="Change events">
  <oas-toggle-group id="tg-event" items='[{"label":"Left","value":"left"},{"label":"Center","value":"center"},{"label":"Right","value":"right"}]'></oas-toggle-group>
  <span id="tg-event-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">oas-change: { value: "left" }</span>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const single = document.getElementById('tg-single')
  const singleOut = document.getElementById('tg-single-out')
  single?.addEventListener('oas-change', (e) => {
    single.setAttribute('value', e.detail.value)
    singleOut.textContent = `Current: ${e.detail.value}`
  })

  const multi = document.getElementById('tg-multi')
  const multiOut = document.getElementById('tg-multi-out')
  multi?.addEventListener('oas-change', (e) => {
    multi.setAttribute('value', JSON.stringify(e.detail.value))
    multiOut.textContent = `Current: ${JSON.stringify(e.detail.value)}`
  })

  const evt = document.getElementById('tg-event')
  const evtOut = document.getElementById('tg-event-out')
  evt?.addEventListener('oas-change', (e) => {
    evt.setAttribute('value', e.detail.value)
    evtOut.textContent = `oas-change: { value: "${e.detail.value}" }`
  })

  // Controlled value demo: drive the selected state externally
  document.getElementById('tg-set-day')?.addEventListener('click', () => {
    document.getElementById('tg-controlled')?.setAttribute('value', 'day')
  })
  document.getElementById('tg-set-month')?.addEventListener('click', () => {
    document.getElementById('tg-controlled')?.setAttribute('value', 'month')
  })
  document.getElementById('tg-set-multi')?.addEventListener('click', () => {
    document.getElementById('tg-controlled-multi')?.setAttribute('value', '["italic","underline"]')
  })

  // Declarative child-element channel: dynamic append (MutationObserver auto-refresh)
  const decl = document.getElementById('tg-decl')
  document.getElementById('tg-decl-add')?.addEventListener('click', () => {
    if (!decl) return
    const n = decl.children.length + 1
    const item = document.createElement('oas-toggle-item')
    item.setAttribute('value', `dyn-${n}`)
    item.textContent = `Dynamic ${n}`
    decl.appendChild(item)
  })
})
</script>

## API

### oas-toggle-group

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `items` | Options JSON (property assignment reflects to attribute) | `ToggleItem[] \| string` | `[]` |
| `multiple` | Multiple mode (checkbox semantics) | `boolean` | — |
| `value` | Current value: string for single; JSON array string for multiple | `string` | `[]` |

| Event | Description |
| --- | --- |
| `oas-change` | Toggle, `detail: { value: string \| string[] }` |

### oas-toggle-item

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `disabled` | Disable this item (not clickable; skipped by arrow keys) | — | — |
| `value` | Item value (data-carrier field of the declarative child-element channel) | — | — |

| Name | Description |
| --- | --- |
| default | Button label (default slot text) |

`ToggleItem` fields:

| Field      | Description          | Type      |
| ---------- | -------------------- | --------- |
| `label`    | Button label         | `string`  |
| `value`    | Value (returned with events) | `string` |
| `disabled` | Disable this item    | `boolean` |

Keyboard: in single mode arrow keys move and select (radio group convention); in multiple mode arrow keys move focus (roving tabindex) and Space/Enter toggle. The container has `role="radiogroup"` / `role="group"` + `aria-label`; selected items expose `aria-checked`.
