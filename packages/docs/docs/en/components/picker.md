# Picker

Mobile-style scroll-wheel column selector: native scrolling + snap alignment delivers inertial feel; selection settles and writes back `value`, then fires `oas-change`. Supports independent columns (`columns`) and cascading trees (`options`); form-associated for native form integration. Ideal for mobile split-field input, region cascading, and multi-spec selection.

## Basic Usage

Pass a JSON array to `columns` (each `{ key?, label?, items: [{ label, value?, disabled? }] }`); `value` is the array of selected values per column (`value` falls back to `label`):

<DemoBlock title="Two columns + event feedback">
  <div style="width: 100%">
    <oas-picker id="pk-basic" columns='[{"key":"fruit","label":"Fruit","items":[{"label":"Apple","value":"apple"},{"label":"Banana","value":"banana"},{"label":"Orange","value":"orange"},{"label":"Grape","value":"grape"},{"label":"Melon","value":"melon"}]},{"key":"num","label":"Qty","items":[{"label":"One"},{"label":"Two"},{"label":"Three"}]}]'></oas-picker>
    <p id="pk-basic-out" style="margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
      Scroll or use arrow keys—oas-change feedback appears here.
    </p>
  </div>
</DemoBlock>

## Cascade (options tree)

Pass a tree JSON to `options` (nested `children`): column count derives from the selection path; changing a parent column rebuilds child columns and resets them to the first enabled item. `columns` and `options` are mutually exclusive (`columns` wins):

<DemoBlock title="Province/City cascade">
  <div style="width: 100%">
    <oas-picker id="pk-cascade" options='[{"label":"Zhejiang","value":"zj","children":[{"label":"Hangzhou","value":"hz"},{"label":"Ningbo","value":"nb"},{"label":"Wenzhou","value":"wz"}]},{"label":"Jiangsu","value":"js","children":[{"label":"Nanjing","value":"nj"},{"label":"Suzhou","value":"sz"}]},{"label":"Guangdong","value":"gd","children":[{"label":"Guangzhou","value":"gz"},{"label":"Shenzhen","value":"sz2"}]}]' value='["zj","hz"]'></oas-picker>
    <p id="pk-cascade-out" style="margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
      Switch the province column—the city column rebuilds automatically.
    </p>
  </div>
</DemoBlock>

## Disabled Items & Whole Disable

An item with `disabled: true` snaps to the nearest enabled item on settle; whole-component `disabled` makes the wheels unresponsive:

<DemoBlock title="Disabled snap + whole disable">
  <div style="width: 100%; display: flex; flex-direction: column; gap: var(--oas-space-3)">
    <oas-picker columns='[{"label":"Slot","items":[{"label":"Morning"},{"label":"Noon","disabled":true},{"label":"Afternoon"},{"label":"Evening"}]}]'></oas-picker>
    <oas-picker disabled columns='[{"label":"Locked","items":[{"label":"Nope"},{"label":"Nada"}]}]'></oas-picker>
  </div>
</DemoBlock>

## Sizing

`item-height` (row height px, default 36) × `visible-count` (visible rows, default 5, even values round up to odd) sets the wheel height; the center band anchors the selected row:

<DemoBlock title="Row height 44 + 3 visible rows">
  <div style="width: 100%">
    <oas-picker item-height="44" visible-count="3" columns='[{"label":"Size","items":[{"label":"XS"},{"label":"S"},{"label":"M"},{"label":"L"},{"label":"XL"}]}]'></oas-picker>
  </div>
</DemoBlock>

## Native Form

Form-associated: with `name`, FormData submits a JSON array string; `form.reset()` restores the initial value:

<DemoBlock title="oas-form submit">
  <div style="width: 100%">
    <oas-form id="pk-form">
      <oas-picker name="spec" columns='[{"label":"Color","items":[{"label":"Black"},{"label":"White"},{"label":"Blue"}]}]' value='["Black"]'></oas-picker>
      <oas-button type="primary" native-type="submit">Submit</oas-button>
    </oas-form>
    <p id="pk-form-out" style="margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
      Form data appears here after submit.
    </p>
  </div>
</DemoBlock>

## Touch & Keyboard

- Touch/mouse: native inertial scrolling + snap centering; nearest item highlights live while scrolling; settle commits;
- Keyboard: columns are focusable (`role="listbox"`); ↑/↓ moves one item, Home/End jumps to first/last enabled item (skips disabled);
- Under `prefers-reduced-motion`, scrolling lands instantly.

## API

### oas-picker

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `columns` | Independent column data (JSON array [{ key?, label?, items: [{ label, value?, disabled? }] }]; mutually exclusive with options and takes priority) | — | — |
| `disabled` | Whole-component disable (wheels unresponsive, value unchanged) | `boolean` | — |
| `item-height` | Row height in px (positive integer, invalid values fall back to default) | — | — |
| `name` | Native form field name (form-associated: the FormData submission key; value is a JSON array string) | — | — |
| `options` | Cascading tree data (JSON [{ label, value?, children: [...] }]); column count derives from selection path, parent change rebuilds child columns and resets to first enabled item | — | — |
| `required` | Required marker (drives the native valueMissing validation chain: unselected counts as unfilled) | — | — |
| `value` | Selected values per column (JSON array; item value falls back to label); written back on settle, programmatic writes only scroll without firing events | `string[] \| string` | — |
| `visible-count` | Visible row count (≥3, even values round up to odd) | — | — |

#### Events

| Event | Description |
| --- | --- |
| `oas-change` | Fired after scroll/keyboard selection settles (not fired on programmatic value writes). detail { value, labels, columnIndex }—value/labels reflect all columns, columnIndex is the changed column |

<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  customElements.whenDefined('oas-picker').then(() => {
    const basic = document.querySelector('#pk-basic')
    const basicOut = document.querySelector('#pk-basic-out')
    basic?.addEventListener('oas-change', (e) => {
      const { value, labels } = e.detail
      if (basicOut) basicOut.textContent = `Selected: ${labels.join(' / ')} (value=[${value.join(', ')}])`
    })

    const cascade = document.querySelector('#pk-cascade')
    const cascadeOut = document.querySelector('#pk-cascade-out')
    cascade?.addEventListener('oas-change', (e) => {
      const { value, labels, columnIndex } = e.detail
      if (cascadeOut) cascadeOut.textContent = `Path: ${labels.join(' / ')} (column ${columnIndex + 1} changed, value=[${value.join(', ')}])`
    })

    const form = document.querySelector('#pk-form')
    const formOut = document.querySelector('#pk-form-out')
    form?.addEventListener('oas-submit', (e) => {
      if (formOut) formOut.textContent = `Form data: ${JSON.stringify(e.detail.values ?? e.detail)}`
    })
  })
})
</script>
