# Steps

A step indicator that guides users through a task, with four states (wait / process / finish / error), vertical layout and clickable navigation.

## Basic usage

<DemoBlock title="In progress">
  <oas-steps current="1" steps='[{"title":"Create order","description":"Fill in order details"},{"title":"Confirm payment","description":"Choose a payment method"},{"title":"Complete shipping","description":"Wait for delivery"}]'></oas-steps>
</DemoBlock>

## Finished state

<DemoBlock title="All finished">
  <oas-steps current="3" steps='[{"title":"Create order"},{"title":"Confirm payment"},{"title":"Complete shipping"}]'></oas-steps>
</DemoBlock>

## Initial step

<DemoBlock title="Initial waiting">
  <oas-steps current="0" steps='[{"title":"Step 1"},{"title":"Step 2"},{"title":"Step 3"}]'></oas-steps>
</DemoBlock>

## Four states

Set the state explicitly per step via the `status` field: `wait` waiting (secondary color + number), `process` in progress (primary color + number), `finish` done (success color + ✓), `error` error (danger color + ✕).

<DemoBlock title="wait / process / finish / error">
  <oas-steps steps='[{"title":"Waiting","description":"Not started","status":"wait"},{"title":"In progress","description":"Processing","status":"process"},{"title":"Completed","description":"Succeeded","status":"finish"},{"title":"Error","description":"Failed","status":"error"}]'></oas-steps>
</DemoBlock>

## Clickable switching

With `clickable` enabled, step items are clickable to jump (the whole item is clickable and keyboard-reachable via Enter/Space); clicking fires `oas-change` (detail is `{ index }`) and switches the current step.

<DemoBlock title="Click a step to switch the current step">
  <oas-steps clickable current="1" onoas-change="message.info('Switched to step ' + (event.detail.index + 1))" steps='[{"title":"Create order","description":"Fill in order details"},{"title":"Confirm payment","description":"Choose a payment method"},{"title":"Complete shipping","description":"Wait for delivery"}]'></oas-steps>
</DemoBlock>

## Steps with icons

Set the `icon` field per step (an `iconRegistry` key) to render an icon at the indicator position; an explicit `icon` takes priority over the status default icon (number / ✓ / ✕). When the `icon` is not found in the registry it is not rendered and falls back to the status default.

<DemoBlock title="Icon steps">
  <oas-steps current="1" steps='[{"title":"Create order","description":"Fill in order details","icon":"edit"},{"title":"Confirm payment","description":"Choose a payment method","icon":"check-circle"},{"title":"Complete shipping","description":"Wait for delivery","icon":"download"}]'></oas-steps>
</DemoBlock>

## Linear mode

With `linear` enabled (combined with `clickable`/`navigation`), only steps with `index <= current` are clickable: past steps can be revisited, the current step stays put, and future steps are blocked with silent clicks (no `oas-change`).

<DemoBlock title="Linear mode (no skipping)">
  <oas-steps linear clickable current="1" onoas-change="message.info('Switched to step ' + (event.detail.index + 1))" steps='[{"title":"Create order","description":"Fill in order details"},{"title":"Confirm payment","description":"Choose a payment method"},{"title":"Complete shipping","description":"Wait for delivery"}]'></oas-steps>
</DemoBlock>

## Horizontal label placement

`label-placement="horizontal"` places the title on the same row as the icon (icon left, title right) with the connector line aligned to the icon center; the default `vertical` keeps the icon above the title.

<DemoBlock title="Horizontal labels">
  <oas-steps label-placement="horizontal" current="1" steps='[{"title":"Create order","description":"Fill in order details"},{"title":"Confirm payment","description":"Choose a payment method"},{"title":"Complete shipping","description":"Wait for delivery"}]'></oas-steps>
</DemoBlock>

## Disabled steps

Disable a step with the `disabled` field: under `clickable`/`navigation` it is not clickable (no button semantics, skipped by keyboard) and visually weakened (weak color tokens); an explicit `status` still displays normally.

<DemoBlock title="Disabled step">
  <oas-steps clickable current="1" onoas-change="message.info('Switched to step ' + (event.detail.index + 1))" steps='[{"title":"Create order","description":"Fill in order details"},{"title":"Confirm payment","description":"Choose a payment method"},{"title":"Complete shipping","description":"Wait for delivery","disabled":true}]'></oas-steps>
</DemoBlock>

## Progress dot

With `progress-dot`, the step indicator becomes a dot (the current step is enlarged with a soft halo) and the connector is a thin line; combined with `clickable`, dots are clickable to jump (keyboard included).

<DemoBlock title="Progress dot">
  <oas-steps progress-dot clickable current="1" onoas-change="message.info('Switched to step ' + (event.detail.index + 1))" steps='[{"title":"Create order"},{"title":"Confirm payment"},{"title":"Complete shipping"}]'></oas-steps>
</DemoBlock>

## Navigation mode

With `navigation`, steps become an arrow navigation bar: the current step is highlighted in primary color, previous steps use a light primary tint, waiting steps are gray, and descriptions are hidden. Step items are implicitly clickable (no `clickable` needed). A "Previous / Next" button row is rendered at the bottom (disabled at the first/last step); clicking a step or a button fires `oas-change` (detail is `{ index }`) and switches the current step.

<DemoBlock title="Navigation mode (Previous / Next)">
  <oas-steps navigation current="1" onoas-change="message.info('Current step: ' + (event.detail.index + 1))" steps='[{"title":"Fill in details"},{"title":"Review information"},{"title":"Submit"}]'></oas-steps>
</DemoBlock>

## Without description

<DemoBlock title="Titles only">
  <oas-steps current="1" steps='[{"title":"Register"},{"title":"Real-name verification"},{"title":"Activation complete"}]'></oas-steps>
</DemoBlock>

## Vertical

<DemoBlock title="Vertical direction">
  <div style="width: 260px">
    <oas-steps direction="vertical" current="1" steps='[{"title":"Fill in profile","description":"Basic info and contact details"},{"title":"Upload ID documents","description":"Front and back of ID card"},{"title":"Approved","description":"Waiting for admin review"}]'></oas-steps>
  </div>
</DemoBlock>

## Container status

The container-level `status` attribute (`wait` / `process` / `finish` / `error`) overrides the derived status of the current step (`current` index), e.g. to mark a whole flow as errored. An explicit per-step `status` still takes the highest priority.

<DemoBlock title="Container status overrides the current step">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-tag type="danger">Container status="error": the current step becomes an error state</oas-tag>
    <oas-steps status="error" current="1" steps='[{"title":"Create order","description":"Fill in order details"},{"title":"Confirm payment","description":"Payment gateway error"},{"title":"Complete shipping","description":"Wait for delivery"}]'></oas-steps>
    <oas-tag type="success">Container status="finish": the current step becomes a finished state</oas-tag>
    <oas-steps status="finish" current="1" steps='[{"title":"Create order"},{"title":"Confirm payment"},{"title":"Complete shipping"}]'></oas-steps>
  </oas-space>
</DemoBlock>

## Action hint

The per-step `extra` field renders a weak small hint line below the description (`textContent` rendering, no HTML injection).

<DemoBlock title="extra hint">
  <oas-steps current="1" steps='[{"title":"Upload ID","description":"Front and back of ID card","extra":"jpg/png only, under 5MB"},{"title":"Face check","description":"Keep good lighting","extra":"Camera permission required"},{"title":"Approved","description":"Waiting for admin review","extra":"Usually within 1 business day"}]'></oas-steps>
</DemoBlock>

## Step id passthrough

The per-step `id` field is echoed back in the `oas-change` event (`detail: { index, id? }`); steps without an `id` keep `detail: { index }` (backward compatible).

<DemoBlock title="oas-change echoes id">
  <oas-steps id="steps-id" clickable current="1" steps='[{"title":"Create order","id":"create","description":"Fill in order details"},{"title":"Confirm payment","id":"pay","description":"Choose a payment method"},{"title":"Complete shipping","id":"ship","description":"Wait for delivery"}]'></oas-steps>
  <oas-tag type="info" id="steps-id-info">Click a step to see its id</oas-tag>
</DemoBlock>

## Step-change guard

The `oas-before-change` event (cancelable) fires before a step change via a clickable step, keyboard Enter/Space, or the navigation Previous/Next buttons, with `detail: { index }`; the host can `preventDefault()` to veto the change. Useful for "block navigation while there are unsaved changes".

<DemoBlock title="oas-before-change guard">
  <oas-checkbox id="steps-guard">Unsaved changes (step changes are blocked while checked)</oas-checkbox>
  <oas-steps id="steps-before" clickable current="1" style="margin-top: 12px" steps='[{"title":"Create order","description":"Fill in order details"},{"title":"Confirm payment","description":"Choose a payment method"},{"title":"Complete shipping","description":"Wait for delivery"}]'></oas-steps>
</DemoBlock>

## Loading

The per-step `loading` field shows a CSS spinner at the indicator position (tokens); an explicit `icon` / number / progress ring yield to loading.

<DemoBlock title="Loading step">
  <oas-steps current="1" steps='[{"title":"Submit order","status":"finish"},{"title":"Waiting for payment","loading":true,"description":"Payment gateway processing"},{"title":"Complete shipping","description":"Wait for delivery"}]'></oas-steps>
</DemoBlock>

## Optional steps

The per-step `optional` field renders a weak "Optional" label next to the title (i18n: "可选" in Chinese / "Optional" in English, follows the locale).

<DemoBlock title="optional marker">
  <oas-steps current="1" steps='[{"title":"Fill in profile","optional":true,"description":"Basic info and contact details"},{"title":"Upload ID documents","description":"Front and back of ID card"},{"title":"Link a bank card","optional":true,"description":"Can be linked later"}]'></oas-steps>
</DemoBlock>

## Without connector lines

`lineless` hides all connector lines (compact look, keeping indicators and status colors).

<DemoBlock title="lineless">
  <oas-steps lineless current="1" steps='[{"title":"Create order"},{"title":"Confirm payment"},{"title":"Complete shipping"}]'></oas-steps>
</DemoBlock>

## Compact mode

`simple` renders a compact single-row layout (smaller indicators, hidden descriptions, tighter connector lines). It is mutually exclusive with `progress-dot` / `navigation` (simple wins).

<DemoBlock title="simple compact mode">
  <oas-steps simple clickable current="1" onoas-change="message.info('Switched to step ' + (event.detail.index + 1))" steps='[{"title":"Create order"},{"title":"Confirm payment"},{"title":"Complete shipping"}]'></oas-steps>
</DemoBlock>

## Connector style

The `separator` attribute controls the connector style: `line` (default solid) / `dashed` (dashed border) / `arrow` (trailing arrowhead).

<DemoBlock title="separator styles">
  <oas-space direction="vertical" size="large" style="width: 100%">
    <oas-steps separator="dashed" current="1" steps='[{"title":"Create order","description":"Fill in order details"},{"title":"Confirm payment","description":"Choose a payment method"},{"title":"Complete shipping","description":"Wait for delivery"}]'></oas-steps>
    <oas-steps separator="arrow" current="1" steps='[{"title":"Create order","description":"Fill in order details"},{"title":"Confirm payment","description":"Choose a payment method"},{"title":"Complete shipping","description":"Wait for delivery"}]'></oas-steps>
  </oas-space>
</DemoBlock>

## Progress ring

The per-step `percent` (0-100) takes effect only on `process` steps: the indicator becomes a progress ring (SVG circle stroke-dasharray, tokens), yielding the number; ignored on non-process steps.

<DemoBlock title="percent progress ring">
  <oas-steps current="1" steps='[{"title":"Download assets","status":"finish"},{"title":"Process data","percent":65,"description":"Processing 65%"},{"title":"Done","description":"Waiting for the result"}]'></oas-steps>
</DemoBlock>

## Responsive vertical

With `responsive`, the component automatically renders in the vertical layout when the container width is below 640px (ResizeObserver, cleaned up on disconnect); an explicit `direction` is overridden by responsive, and `navigation` stays forced horizontal.

<DemoBlock title="responsive narrow-screen vertical">
  <div style="width: 100%; min-width: 280px; max-width: 100%; overflow: auto; resize: horizontal; padding: 8px 0">
    <oas-steps responsive current="1" steps='[{"title":"Create order","description":"Fill in order details"},{"title":"Confirm payment","description":"Choose a payment method"},{"title":"Complete shipping","description":"Wait for delivery"}]'></oas-steps>
  </div>
  <p style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-xs)">Drag the bottom-right corner below 640px to switch the steps to the vertical layout automatically.</p>
</DemoBlock>

## Custom numbering

The per-step `prefix` field renders custom numbering text (e.g. "A", "01") at the indicator position instead of the default number; priority: explicit `icon` > `prefix` > default number; the ✓/✕ of `finish` / `error` are unaffected (`textContent` rendering, no HTML injection).

<DemoBlock title="prefix custom numbering">
  <oas-steps current="1" steps='[{"title":"Create order","prefix":"01","description":"Fill in order details"},{"title":"Confirm payment","prefix":"02","description":"Choose a payment method"},{"title":"Complete shipping","prefix":"03","description":"Wait for delivery"}]'></oas-steps>
  <oas-steps style="margin-top: 16px" current="1" steps='[{"title":"Fill in profile","prefix":"A"},{"title":"Verification","prefix":"B"},{"title":"Activation complete","prefix":"C"}]'></oas-steps>
</DemoBlock>

## Middle collapsing

`max-count` (minimum 2) limits the number of visible steps: when exceeded the middle collapses into ellipsis steps (⋯, not clickable, connector lines stay continuous); the first step, last step and current step are always visible, and the window slides with `current`; invalid values / below 2 are ignored (show all).

<DemoBlock title="max-count collapsing (click steps to see the window slide)">
  <oas-steps clickable max-count="5" current="0" onoas-change="message.info('Switched to step ' + (event.detail.index + 1))" steps='[{"title":"S1"},{"title":"S2"},{"title":"S3"},{"title":"S4"},{"title":"S5"},{"title":"S6"},{"title":"S7"},{"title":"S8"},{"title":"S9"},{"title":"S10"}]'></oas-steps>
</DemoBlock>

## Reversed

`reverse` visually reverses the order (horizontal `row-reverse` / vertical `column-reverse`): the displayed number = total - index (increasing along the visual flow); status derivation still follows the `steps` array order and `oas-change` keeps echoing the array `index`.

<DemoBlock title="reverse (horizontal / vertical)">
  <oas-steps reverse current="1" steps='[{"title":"Create order","description":"Fill in order details"},{"title":"Confirm payment","description":"Choose a payment method"},{"title":"Complete shipping","description":"Wait for delivery"}]'></oas-steps>
  <div style="width: 260px; margin-top: 16px">
    <oas-steps reverse direction="vertical" current="1" steps='[{"title":"Fill in profile","description":"Basic info and contact details"},{"title":"Upload ID documents","description":"Front and back of ID card"},{"title":"Approved","description":"Waiting for admin review"}]'></oas-steps>
  </div>
</DemoBlock>

## Content on the right

`content-placement="right"` (horizontal mode, default `bottom`) places the title / description / hint block to the right of the indicator; ignored in vertical (vertical is already icon-left / content-right); orthogonal to `label-placement`.

<DemoBlock title="content-placement right">
  <oas-steps content-placement="right" current="1" steps='[{"title":"Create order","description":"Fill in order details"},{"title":"Confirm payment","description":"Choose a payment method","extra":"Multiple payment channels"},{"title":"Complete shipping","description":"Wait for delivery"}]'></oas-steps>
</DemoBlock>

## Arrow segments

`arrow` renders an arrow-segment bar (horizontal only): each step is clipped into an arrow segment (first segment flat-headed, neighbors interlocking), active filled with the primary color / finished light primary / waiting gray; connector lines are hidden (segments join themselves); mutually exclusive with `simple` (simple wins), ignored under `navigation`.

<DemoBlock title="arrow segments (with error state)">
  <oas-steps arrow clickable current="1" onoas-change="message.info('Switched to step ' + (event.detail.index + 1))" steps='[{"title":"Create order","description":"Fill in order details"},{"title":"Confirm payment","description":"Choose a payment method"},{"title":"Manual review","description":"Risk control"},{"title":"Complete shipping","description":"Wait for delivery"}]'></oas-steps>
  <oas-steps style="margin-top: 16px" arrow reverse current="2" steps='[{"title":"Create order"},{"title":"Confirm payment"},{"title":"Complete shipping"}]'></oas-steps>
</DemoBlock>

## Combinations

Combination semantics: `simple` takes priority over `progress-dot` / `navigation` (dot and navigation shapes yield to simple); under `navigation`, `responsive` does not switch to vertical (navigation stays forced horizontal).

<DemoBlock title="Combination: simple + progress-dot">
  <oas-steps simple progress-dot current="1" steps='[{"title":"Create order"},{"title":"Confirm payment"},{"title":"Complete shipping"}]'></oas-steps>
</DemoBlock>

<DemoBlock title="Combination: navigation + responsive (still horizontal when narrow)">
  <div style="width: 380px">
    <oas-steps navigation responsive current="1" steps='[{"title":"Fill in details"},{"title":"Review information"},{"title":"Submit"}]'></oas-steps>
  </div>
</DemoBlock>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `arrow` | Arrow-segment shape (horizontal only): each step is clipped into an arrow segment (first segment flat-headed, neighbors interlocking), active filled with the primary color / finished light primary / waiting gray, connector lines hidden (boolean; enabled when present; mutually exclusive with `simple`, simple wins; ignored under navigation) | `boolean` | — |
| `clickable` | Steps are clickable to jump (boolean; enabled when present) | `boolean` | — |
| `content-placement` | Content block placement: `bottom` (default, title/description below the indicator) / `right` (whole block to the right of the indicator, horizontal mode); ignored in vertical; orthogonal to label-placement | `string` | — |
| `current` | Current step index (0-based) | `string` | `0` |
| `direction` | Direction (forced to horizontal in navigation mode; responsive switches to vertical on narrow screens) | `string` | `horizontal` |
| `label-placement` | Label placement: `vertical` (default, icon above title) / `horizontal` (icon and title on the same row) | `string` | — |
| `linear` | Linear mode: only steps with `index <= current` are clickable (boolean; enabled when present; future steps are blocked, clicks are silent) | `boolean` | — |
| `lineless` | Hide all connector lines (boolean; enabled when present; compact look) | `boolean` | — |
| `max-count` | Maximum number of visible steps (minimum 2): when exceeded the middle collapses into ellipsis steps (⋯, not clickable, connector lines stay continuous); the first/last/current steps are always visible and the window slides with current; invalid values / below 2 are ignored (show all) | `string` | — |
| `navigation` | Navigation mode: arrow bar with a bottom Previous/Next button row (boolean; enabled when present; mutually exclusive with `simple`, simple wins) | `boolean` | — |
| `progress-dot` | Progress-dot steps: dot indicators with a thin connector line (boolean; enabled when present; mutually exclusive with `simple`, simple wins) | `boolean` | — |
| `responsive` | Responsive vertical: renders in the vertical layout when the container width is below 640px (boolean; enabled when present; ResizeObserver, cleaned up on disconnect; ignored under navigation) | `boolean` | — |
| `reverse` | Visual reversal: horizontal `row-reverse` / vertical `column-reverse`; displayed number = total - index (increasing along the visual flow), status derivation still follows the steps array order (boolean; enabled when present) | `boolean` | — |
| `separator` | Connector style: `line` (default) / `dashed` (dashed border) / `arrow` (trailing arrowhead); not applied under navigation / arrow | `string` | — |
| `simple` | Compact mode: single-row small size (smaller indicators, hidden descriptions, tighter connector lines) (boolean; enabled when present; takes priority over progress-dot/navigation) | `boolean` | — |
| `status` | Container-level status overriding the current step (`wait` / `process` / `finish` / `error`); an explicit per-step `status` still takes the highest priority | `StepStatus` | — |
| `steps` | `[{ title, description?, status?, icon?, disabled?, extra?, id?, loading?, optional?, percent?, prefix? }]` JSON string | `StepItem[] \| string` | `[]` |

### Events

| Event | Description |
| --- | --- |
| `oas-before-change` | Fired before a step change (cancelable, `detail: { index }`); the host can `preventDefault()` to veto the change (step clicks / keyboard / navigation buttons all apply) |
| `oas-change` | Fired when a clickable step or a navigation button is clicked (including keyboard triggers); `detail: { index, id? }` (0-based; `id` echoes the step `id` field, keeps `{ index }` when unset) |

State rules: an explicit `status` (`wait` / `process` / `finish` / `error`) takes priority; otherwise it is derived from `current` — index `< current` is `finish` (✓), `=== current` is `process`, and the rest are `wait`.

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  // id passthrough: show oas-change detail.id
  const idEl = document.getElementById('steps-id')
  const idInfo = document.getElementById('steps-id-info')
  idEl?.addEventListener('oas-change', (e) => {
    idInfo.textContent = `Jumped to "${e.detail.id ?? e.detail.index + 1}"`
    idInfo.setAttribute('type', 'primary')
  })

  // step-change guard: veto with preventDefault while the checkbox is checked
  const guard = document.getElementById('steps-guard')
  const beforeEl = document.getElementById('steps-before')
  beforeEl?.addEventListener('oas-before-change', (e) => {
    if (guard?.checked) {
      e.preventDefault()
      message.warning(`Blocked jump to step ${e.detail.index + 1} (unsaved changes)`)
    }
  })
  beforeEl?.addEventListener('oas-change', () => {
    message.info(`Switched to step ${beforeEl.getAttribute('current') === null ? 0 : Number(beforeEl.getAttribute('current')) + 1}`)
  })
})
</script>
