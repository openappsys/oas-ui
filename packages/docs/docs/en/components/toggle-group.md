# ToggleGroup

A mutually exclusive button group for single/multiple selection: single mode uses radio semantics, multiple mode uses checkbox semantics; keyboard arrow and Home/End navigation and controlled `value`. Supports size steps, vertical layout, attached form, item icons, mandatory selection, multiple-select limit, spread, selection color and validation status.

## ToggleGroup vs ButtonGroup

- **oas-toggle-group (this component)**: **state selection** — a controlled set of selected states via `value`, radio/checkbox semantics (`aria-checked`), single/multiple modes, roving keyboard, and form capabilities such as mandatory / max-count / status. Suited to view switching, filter conditions and rich-text style toggles.
- **oas-button-group**: **action orchestration** — buttons each trigger their own action (`oas-click`) with no selected-state semantics; it also keeps a `value` / `multiple` selection form for compatibility, and new code for state-selection scenarios is recommended to use toggle-group (fuller ARIA semantics and keyboard model).

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

Besides the `items` JSON, you can declare options declaratively with `<oas-toggle-item>` child elements (the `items` attribute *takes precedence when explicitly set*; otherwise child elements are parsed and converge into the same rendering path). The default slot text is the label; attributes map to the `ToggleItem` fields: `value` / `disabled` / `icon` / `aria-label`. Child additions, removals, attribute and text changes re-render automatically (MutationObserver); single/multiple (`multiple`) semantics are identical to the items channel.

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

## Size Steps (size)

`size` has three steps: `small` / `medium` (default) / `large`; control height and font size follow global tokens. When not set explicitly, the config-provider `size` injection is respected (global density). Use small inside tables and large on filter bars:

<DemoBlock title="Size steps">
  <oas-space size="small" direction="vertical">
    <oas-toggle-group size="small" value="day" items='[{"label":"Day","value":"day"},{"label":"Week","value":"week"},{"label":"Month","value":"month"}]'></oas-toggle-group>
    <oas-toggle-group value="day" items='[{"label":"Day","value":"day"},{"label":"Week","value":"week"},{"label":"Month","value":"month"}]'></oas-toggle-group>
    <oas-toggle-group size="large" value="day" items='[{"label":"Day","value":"day"},{"label":"Week","value":"week"},{"label":"Month","value":"month"}]'></oas-toggle-group>
  </oas-space>
</DemoBlock>

## Item Icons (icon / icon-only)

Add an `icon` field to an `items` entry (or the `icon` attribute on a child element) to render an icon before the text (an `@oas-ui/icons` registry name). **An icon item without a label automatically becomes icon-only** (square), with the icon name as the fallback accessible name — prefer providing a precise name via the `ariaLabel` field; labeled items can also override the accessible name with `ariaLabel` (e.g. "B" read as "Bold").

A rich-text toolbar is the classic scenario — text styles as multiple, alignment as single:

<DemoBlock title="Rich-text toolbar (multiple + single + icon-only)">
  <oas-space size="small" direction="vertical">
    <oas-space size="small">
      <oas-toggle-group id="tg-rt-style" multiple attached value='["bold"]' aria-label="Text style">
        <oas-toggle-item value="bold" aria-label="Bold">B</oas-toggle-item>
        <oas-toggle-item value="italic" aria-label="Italic">I</oas-toggle-item>
        <oas-toggle-item value="underline" aria-label="Underline">U</oas-toggle-item>
        <oas-toggle-item value="strike" aria-label="Strikethrough">S</oas-toggle-item>
      </oas-toggle-group>
      <oas-toggle-group id="tg-rt-align" attached value="left" aria-label="Alignment">
        <oas-toggle-item value="left">Left</oas-toggle-item>
        <oas-toggle-item value="center">Center</oas-toggle-item>
        <oas-toggle-item value="right">Right</oas-toggle-item>
      </oas-toggle-group>
      <oas-toggle-group id="tg-rt-insert" multiple aria-label="Insert elements">
        <oas-toggle-item value="star" icon="star" aria-label="Favorite mark"></oas-toggle-item>
        <oas-toggle-item value="link" icon="external-link" aria-label="External link"></oas-toggle-item>
        <oas-toggle-item value="clock" icon="clock" aria-label="Timed reminder"></oas-toggle-item>
      </oas-toggle-group>
    </oas-space>
    <span id="tg-rt-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">Style: bold | Align: left</span>
  </oas-space>
</DemoBlock>

## Vertical Layout (vertical)

The `vertical` boolean switches to a vertical group (syncing `aria-orientation="vertical"`); combined with icon-only items it is the classic view-switching form:

<DemoBlock title="Vertical view switching (vertical + icon-only single)">
  <oas-space size="large">
    <oas-toggle-group id="tg-view-v" vertical value="list" aria-label="View switching">
      <oas-toggle-item value="list" icon="menu" aria-label="List view"></oas-toggle-item>
      <oas-toggle-item value="detail" icon="form" aria-label="Detail view"></oas-toggle-item>
      <oas-toggle-item value="favorite" icon="star" aria-label="Favorites view"></oas-toggle-item>
    </oas-toggle-group>
    <oas-toggle-group id="tg-view-t" vertical attached value="list" aria-label="Compact view switching">
      <oas-toggle-item value="list" icon="menu" aria-label="List view"></oas-toggle-item>
      <oas-toggle-item value="detail" icon="form" aria-label="Detail view"></oas-toggle-item>
      <oas-toggle-item value="favorite" icon="star" aria-label="Favorites view"></oas-toggle-item>
    </oas-toggle-group>
    <span id="tg-view-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">View: list</span>
  </oas-space>
</DemoBlock>

The right group shows the `attached` vertical form. Long-option vertical groups with labels work the same way: `vertical` plus plain items.

## Attached Form (attached)

The default is **detached** (a gap between buttons, each with its own radius — unchanged behavior); the `attached` boolean enables **attached** — zero gap, adjacent borders merged to 1px, and only the group ends keep rounded corners (left/right in horizontal, top/bottom in vertical; logical properties adapt to RTL). Hover / focus / selected items automatically raise above neighbors so their borders are not clipped:

<DemoBlock title="Detached (default) vs attached">
  <oas-space size="small" direction="vertical">
    <oas-toggle-group value="week" aria-label="Detached form" items='[{"label":"Day","value":"day"},{"label":"Week","value":"week"},{"label":"Month","value":"month"},{"label":"Quarter","value":"quarter"}]'></oas-toggle-group>
    <oas-toggle-group attached value="week" aria-label="Attached form" items='[{"label":"Day","value":"day"},{"label":"Week","value":"week"},{"label":"Month","value":"month"},{"label":"Quarter","value":"quarter"}]'></oas-toggle-group>
    <oas-toggle-group attached multiple value='["day","month"]' aria-label="Attached multiple" items='[{"label":"Bold","value":"bold"},{"label":"Italic","value":"italic"},{"label":"Underline","value":"underline"},{"label":"Strikethrough","value":"strike"}]'></oas-toggle-group>
  </oas-space>
</DemoBlock>

## Spread (spread)

The `spread` boolean makes the group fill the parent width with equal-width items (mobile action bars / filter bars); vertical groups also fill the width:

<DemoBlock title="Mobile action bar (spread)">
  <div style="width: 100%; max-width: 420px">
    <oas-toggle-group id="tg-spread" spread attached value="all" aria-label="Filter scope" items='[{"label":"All","value":"all"},{"label":"Todo","value":"todo"},{"label":"Done","value":"done"},{"label":"Cancelled","value":"cancelled"}]'></oas-toggle-group>
  </div>
</DemoBlock>

## Mandatory Selection (mandatory)

- `mandatory` (boolean): the **last selected item in multiple mode cannot be deselected** (click/keyboard intercepted, no event dispatched); single mode is radio semantics and naturally never empty.
- `mandatory="force"`: implies the interception above, and **auto-selects the first non-disabled item when empty** — no initial value, value cleared, value pointing to a missing item, or options changing so the value dangles all trigger the fallback. Wizard flows (day/week/month must have one) need zero host code:

<DemoBlock title="Mandatory (force wizard flow + multiple mandatory)">
  <oas-space size="small" direction="vertical">
    <oas-space size="small">
      <span style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">Stat period (force, no initial value):</span>
      <oas-toggle-group id="tg-force" mandatory="force" items='[{"label":"Day","value":"day"},{"label":"Week","value":"week"},{"label":"Month","value":"month"}]'></oas-toggle-group>
    </oas-space>
    <oas-space size="small">
      <span style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">Export formats (multiple mandatory, keep at least one):</span>
      <oas-toggle-group id="tg-mandatory" multiple mandatory value='["pdf"]' items='[{"label":"PDF","value":"pdf"},{"label":"Excel","value":"excel"},{"label":"CSV","value":"csv"}]'></oas-toggle-group>
    </oas-space>
    <span id="tg-mandatory-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">Period: day | Formats: pdf</span>
  </oas-space>
</DemoBlock>

Note: the `force` fallback **only writes the `value` attribute and does not dispatch `oas-change`** (not a user interaction; the value attribute is the controlled source of truth) — hosts can listen for attribute changes or read value.

## Multiple-Select Limit (max-count)

`max-count` (effective only with `multiple`) caps the number of selected items: **once the cap is reached, unselected items are greyed out** (same visuals as disabled, `aria-disabled` synced), clicks/keyboard are intercepted and `oas-exceed-limit` is dispatched (`detail: { value, max }`); **selected items can still be deselected**, after which greyed items become selectable again. Invalid values / `0` / negatives mean no cap; single mode is unaffected:

<DemoBlock title="Multiple-select limit (max-count + oas-exceed-limit)">
  <oas-space size="small" direction="vertical">
    <oas-toggle-group id="tg-max" multiple max-count="2" value='["bold"]' aria-label="Styles (max two)" items='[{"label":"Bold","value":"bold"},{"label":"Italic","value":"italic"},{"label":"Underline","value":"underline"},{"label":"Strikethrough","value":"strike"}]'></oas-toggle-group>
    <span id="tg-max-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">Selected 1 / 2</span>
  </oas-space>
</DemoBlock>

## Selection Color (color)

`color` follows the unified ui-spec protocol: any CSS color value (`#0e7490` / `rgb(...)`, text color auto black/white by luminance) takes precedence; the 11 preset names (`magenta / red / volcano / orange / gold / lime / green / cyan / blue / geekblue / purple`) resolve to `--oas-preset-*` tokens (light/dark adaptive); default is the primary color. Theme-level batch customization goes through the CSS variables `--oas-toggle-color` / `--oas-toggle-on-color`:

<DemoBlock title="Selection color (color)">
  <oas-space size="small">
    <oas-toggle-group color="purple" value="week" aria-label="Purple selection" items='[{"label":"Day","value":"day"},{"label":"Week","value":"week"},{"label":"Month","value":"month"}]'></oas-toggle-group>
    <oas-toggle-group color="cyan" value="week" aria-label="Cyan selection" items='[{"label":"Day","value":"day"},{"label":"Week","value":"week"},{"label":"Month","value":"month"}]'></oas-toggle-group>
    <oas-toggle-group color="#0e7490" value="week" aria-label="Custom color selection" items='[{"label":"Day","value":"day"},{"label":"Week","value":"week"},{"label":"Month","value":"month"}]'></oas-toggle-group>
  </oas-space>
</DemoBlock>

## Form Validation (status)

`status` has three states: `success` / `warning` / `error`: unselected item borders take the semantic color, selected items are fully tinted, and the focus ring is dyed to match; `error` syncs the host `aria-invalid` (a host-set `aria-invalid="true"` is equivalent to the error visuals). Submit-validation scenario:

<DemoBlock title="Form validation (status)">
  <oas-space size="small" direction="vertical">
    <oas-space size="small">
      <span style="font-size: var(--oas-font-size-sm)">Channels:</span>
      <oas-toggle-group id="tg-status" multiple aria-label="Channels" items='[{"label":"Inbox","value":"inbox"},{"label":"Email","value":"mail"},{"label":"SMS","value":"sms"}]'></oas-toggle-group>
      <oas-button id="tg-status-submit" size="small" type="primary">Save</oas-button>
    </oas-space>
    <span id="tg-status-msg" style="font-size: var(--oas-font-size-sm); color: var(--oas-color-danger)">Select at least one channel</span>
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

  // Rich-text toolbar: style multiple + align single + insert multiple
  const rtStyle = document.getElementById('tg-rt-style')
  const rtAlign = document.getElementById('tg-rt-align')
  const rtInsert = document.getElementById('tg-rt-insert')
  const rtOut = document.getElementById('tg-rt-out')
  const rtRender = () => {
    const style = rtStyle ? JSON.parse(rtStyle.getAttribute('value') || '[]').join(', ') || 'none' : ''
    const align = rtAlign?.getAttribute('value') || ''
    const insert = rtInsert ? JSON.parse(rtInsert.getAttribute('value') || '[]').join(', ') || 'none' : ''
    if (rtOut) rtOut.textContent = `Style: ${style} | Align: ${align} | Insert: ${insert}`
  }
  ;[rtStyle, rtAlign, rtInsert].forEach((g) =>
    g?.addEventListener('oas-change', (e) => {
      g.setAttribute('value', Array.isArray(e.detail.value) ? JSON.stringify(e.detail.value) : e.detail.value)
      rtRender()
    }),
  )

  // Vertical view switching
  const viewV = document.getElementById('tg-view-v')
  const viewT = document.getElementById('tg-view-t')
  const viewOut = document.getElementById('tg-view-out')
  const viewRender = () => {
    if (viewOut) viewOut.textContent = `View: ${viewV?.getAttribute('value') || ''}`
  }
  ;[viewV, viewT].forEach((g) =>
    g?.addEventListener('oas-change', (e) => {
      g?.setAttribute('value', e.detail.value)
      if (g !== viewV && viewV) viewV.setAttribute('value', e.detail.value)
      if (g !== viewT && viewT) viewT.setAttribute('value', e.detail.value)
      viewRender()
    }),
  )

  // Mandatory: read back value after force fallback / mandatory interception
  const force = document.getElementById('tg-force')
  const mandatory = document.getElementById('tg-mandatory')
  const mandatoryOut = document.getElementById('tg-mandatory-out')
  const mandatoryRender = () => {
    if (mandatoryOut) {
      const fmt = mandatory ? JSON.parse(mandatory.getAttribute('value') || '[]').join(', ') : ''
      mandatoryOut.textContent = `Period: ${force?.getAttribute('value') || ''} | Formats: ${fmt}`
    }
  }
  ;[force, mandatory].forEach((g) => g?.addEventListener('oas-change', (e) => {
    g.setAttribute('value', Array.isArray(e.detail.value) ? JSON.stringify(e.detail.value) : e.detail.value)
    mandatoryRender()
  }))

  // Multiple-select limit: visible feedback for oas-exceed-limit
  const max = document.getElementById('tg-max')
  const maxOut = document.getElementById('tg-max-out')
  const maxRender = () => {
    if (!max || !maxOut) return
    const n = JSON.parse(max.getAttribute('value') || '[]').length
    maxOut.textContent = `Selected ${n} / 2`
    maxOut.style.color = 'var(--oas-color-text-secondary)'
  }
  max?.addEventListener('oas-change', (e) => {
    max.setAttribute('value', JSON.stringify(e.detail.value))
    maxRender()
  })
  max?.addEventListener('oas-exceed-limit', (e) => {
    if (maxOut) {
      maxOut.textContent = `Limit reached (${e.detail.max}); deselect one before choosing "${e.detail.value}"`
      maxOut.style.color = 'var(--oas-color-warning)'
    }
  })

  // Form validation: switch status on submit with visible feedback
  const status = document.getElementById('tg-status')
  const statusMsg = document.getElementById('tg-status-msg')
  const renderStatus = () => {
    if (!status || !statusMsg) return
    const picked = JSON.parse(status.getAttribute('value') || '[]').length > 0
    status.setAttribute('status', picked ? 'success' : 'error')
    statusMsg.textContent = picked ? 'Saved' : 'Select at least one channel'
    statusMsg.style.color = picked ? 'var(--oas-color-success)' : 'var(--oas-color-danger)'
  }
  status?.addEventListener('oas-change', (e) => {
    status.setAttribute('value', JSON.stringify(e.detail.value))
    renderStatus()
  })
  document.getElementById('tg-status-submit')?.addEventListener('click', renderStatus)
})
</script>

## API

### oas-toggle-group

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `aria-label` | Group accessible name (host override; falls back to locale default) | — | — |
| `attached` | Attached form: adjacent items share borders, end radii only (default detached) | — | — |
| `color` | Selected color: preset name or any CSS color (auto text color) | `string` | — |
| `disabled` | Disables the whole toggle group (explicitly, or inherited from the config-provider global disabled injection) | `boolean` | — |
| `items` | Options JSON (property assignment reflects to attribute) | `ToggleItem[] \| string` | `[]` |
| `mandatory` | Mandatory selection: boolean = the sole selected item cannot be deselected; `force` = auto-select the first enabled item when empty (wizard flow, zero host code) | — | — |
| `max-count` | Multi-select limit: at the limit unselected items grey out and oas-exceed-limit fires; selected items stay removable | `string` | — |
| `multiple` | Multiple mode (checkbox semantics) | `boolean` | — |
| `size` | Size preset `small` / `medium` (default) / `large` | `string` | `medium` |
| `spread` | Full-width equal split (aligned with button-group spread) | — | — |
| `status` | Validation status: `error` / `warning` / `success` (unselected border + selected block tint) | `string` | — |
| `value` | Current value: string for single; JSON array string for multiple | `string` | `[]` |
| `vertical` | Vertical arrangement (mirrors aria-orientation and axis keys) | `boolean` | — |

| Event | Description |
| --- | --- |
| `oas-change` | Toggle, `detail: { value: string \| string[] }` |
| `oas-exceed-limit` | Selection attempt past max-count, `detail: { value, max }` |

### oas-toggle-item

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `aria-label` | Item accessible name (required semantics for icon-only items; derived from the icon name by default) | — | — |
| `disabled` | Disable this item (not clickable; skipped by arrow keys) | — | — |
| `icon` | Icon (oas-icon name); label optional (icon-only items) | — | — |
| `value` | Item value (data-carrier field of the declarative child-element channel) | — | — |

| Name | Description |
| --- | --- |
| default | Button label (default slot text) |

`ToggleItem` fields:

| Field      | Description          | Type      |
| ---------- | -------------------- | --------- |
| `label`    | Button label (omittable for icon-only items) | `string`  |
| `value`    | Value (returned with events) | `string` |
| `disabled` | Disable this item    | `boolean` |
| `icon`     | Leading icon (`@oas-ui/icons` registry name); without a label the item becomes icon-only | `string` |
| `ariaLabel` | Item-level accessible-name override (fallback: label text; icon name for icon-only items) | `string` |

Keyboard: in single mode arrow keys move and select (radio group convention); in multiple mode arrow keys move focus (roving tabindex) and Space/Enter toggle; Home/End jump to the first/last enabled item (disabled items skipped). The container has `role="radiogroup"` / `role="group"` + `aria-label` (a host `aria-label` attribute overrides the locale fallback); selected items expose `aria-checked`; `vertical` syncs `aria-orientation="vertical"`.
