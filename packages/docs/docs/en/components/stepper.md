# Stepper

A step-driven content panel: a clickable step header synced with content panels (only the current step is visible) — for wizards, multi-step forms and checkout flows. Two components work as a pair: `oas-stepper` manages the step header, `oas-stepper-panel` holds the content, associated by `value` (same pattern as `oas-tabs` / `oas-tab-panel`).

## Basic usage

Pass the steps array via `steps` (`{title, description?, icon?, disabled?, status?}`, semantics aligned with `oas-steps`), associate content panels by index `value`, and point `current` at the active step.

<DemoBlock title="Basic usage">
  <oas-stepper current="1" steps='[{"title":"Create order","description":"Fill in order details"},{"title":"Confirm payment","description":"Choose a payment method"},{"title":"Complete shipping","description":"Wait for delivery"}]'>
    <oas-stepper-panel value="0">
      <p style="color: var(--oas-color-text-secondary)">Step 1: fill in the shipping address and order details.</p>
    </oas-stepper-panel>
    <oas-stepper-panel value="1">
      <p style="color: var(--oas-color-text-secondary)">Step 2: choose a payment method.</p>
    </oas-stepper-panel>
    <oas-stepper-panel value="2">
      <p style="color: var(--oas-color-text-secondary)">Step 3: wait for the seller to ship and confirm receipt.</p>
    </oas-stepper-panel>
  </oas-stepper>
</DemoBlock>

## Clickable steps

`clickable` is enabled by default: clicking an enabled step jumps to it (the whole step is clickable, keyboard Enter/Space works); clicking fires `oas-change` (detail is `{ index }`) and writes back to `current`.

<DemoBlock title="Click a step to switch">
  <oas-stepper id="stepper-click" clickable current="1" steps='[{"title":"Create order","description":"Fill in order details"},{"title":"Confirm payment","description":"Choose a payment method"},{"title":"Complete shipping","description":"Wait for delivery"}]'>
    <oas-stepper-panel value="0"><p>Order form area</p></oas-stepper-panel>
    <oas-stepper-panel value="1"><p>Payment method area</p></oas-stepper-panel>
    <oas-stepper-panel value="2"><p>Shipping progress area</p></oas-stepper-panel>
  </oas-stepper>
</DemoBlock>

## Linear mode (no skipping)

With `linear`, only steps with `index <= current` can be activated: past steps can be revisited, the current step stays put, future steps are blocked (`aria-disabled` + visually weakened, silent on click/keyboard).

<DemoBlock title="Linear mode (no skipping)">
  <oas-stepper id="stepper-linear" linear current="1" steps='[{"title":"Fill profile","description":"Basics and contact"},{"title":"Verify identity","description":"Upload ID documents"},{"title":"Activated","description":"Pending review"}]'>
    <oas-stepper-panel value="0"><p>Profile form</p></oas-stepper-panel>
    <oas-stepper-panel value="1"><p>Identity verification flow</p></oas-stepper-panel>
    <oas-stepper-panel value="2"><p>Activation success message</p></oas-stepper-panel>
  </oas-stepper>
</DemoBlock>

## Disabled steps

The per-step `disabled` field disables a step: not clickable, skipped by keyboard, visually weakened; an explicit `status` still displays normally.

<DemoBlock title="Disabled step">
  <oas-stepper id="stepper-disabled" current="1" steps='[{"title":"Upload ID","description":"ID front and back"},{"title":"Face check","description":"Keep the light on"},{"title":"Approved","description":"Pending admin review","disabled":true}]'>
    <oas-stepper-panel value="0"><p>Upload area</p></oas-stepper-panel>
    <oas-stepper-panel value="1"><p>Face check area</p></oas-stepper-panel>
    <oas-stepper-panel value="2"><p>Review result area (disabled)</p></oas-stepper-panel>
  </oas-stepper>
</DemoBlock>

## Status marks

The per-step `status` field sets an explicit state: `finish` (success color + ✓) / `error` (danger color + ✕); otherwise it is derived from `current` (previous steps finish / current process / later steps wait).

<DemoBlock title="finish / process / error / wait">
  <oas-stepper current="1" steps='[{"title":"Download assets","description":"Resource pack","status":"finish"},{"title":"Parse data","description":"Parsing","status":"process"},{"title":"Submit result","description":"An error occurred","status":"error"},{"title":"Done","description":"Waiting for result"}]'>
    <oas-stepper-panel value="0"><p>Assets downloaded</p></oas-stepper-panel>
    <oas-stepper-panel value="1"><p>Parsing data…</p></oas-stepper-panel>
    <oas-stepper-panel value="2"><p>Parse failed, please retry</p></oas-stepper-panel>
    <oas-stepper-panel value="3"><p>Flow finished</p></oas-stepper-panel>
  </oas-stepper>
</DemoBlock>

## Vertical layout

`direction="vertical"` stacks the step header vertically (indicator on the left, title on the right, connector down the left side); content panels stay below.

<DemoBlock title="Vertical steps">
  <div style="width: 320px">
    <oas-stepper id="stepper-vertical" direction="vertical" current="1" steps='[{"title":"Fill profile","description":"Basics and contact"},{"title":"Upload ID","description":"ID front and back"},{"title":"Approved","description":"Pending admin review"}]'>
      <oas-stepper-panel value="0"><p>Profile form</p></oas-stepper-panel>
      <oas-stepper-panel value="1"><p>ID upload</p></oas-stepper-panel>
      <oas-stepper-panel value="2"><p>Review result</p></oas-stepper-panel>
    </oas-stepper>
  </div>
</DemoBlock>

## Panel linkage (controlled current)

`current` is two-way: clicking a step writes it back, external changes to `current` instantly sync `aria-selected` and panel visibility. Prev/next buttons are not built in — the host sets `current` with its own buttons.

<DemoBlock title="External buttons control the step">
  <oas-stepper id="stepper-ctrl" current="1" steps='[{"title":"Cart","description":"Review items"},{"title":"Address","description":"Shipping info"},{"title":"Checkout","description":"Place the order"}]'>
    <oas-stepper-panel value="0">
      <oas-space direction="vertical" size="small">
        <oas-tag type="primary">Item A × 1</oas-tag>
        <oas-tag>Item B × 2</oas-tag>
      </oas-space>
    </oas-stepper-panel>
    <oas-stepper-panel value="1">
      <oas-input placeholder="Recipient name" style="width: 240px"></oas-input>
    </oas-stepper-panel>
    <oas-stepper-panel value="2">
      <oas-button type="primary">Place order</oas-button>
    </oas-stepper-panel>
  </oas-stepper>
  <oas-space style="margin-top: 16px">
    <oas-button id="stepper-prev">Previous</oas-button>
    <oas-button id="stepper-next" type="primary">Next</oas-button>
  </oas-space>
</DemoBlock>

## Custom step content

The per-step `icon` field (an icon registry key) renders an icon at the indicator position (explicit icon takes priority over the status default); panel content goes through the default slot and can compose arbitrary content.

<DemoBlock title="Icon steps + rich panels">
  <oas-stepper current="1" steps='[{"title":"Choose plan","description":"Package config","icon":"edit"},{"title":"Confirm info","description":"Review details","icon":"check-circle"},{"title":"Activated","description":"Effective now","icon":"download"}]'>
    <oas-stepper-panel value="0">
      <oas-radio>Basic</oas-radio>
      <oas-radio>Pro</oas-radio>
    </oas-stepper-panel>
    <oas-stepper-panel value="1">
      <oas-descriptions :column="2" title="Plan details">
        <oas-descriptions-item label="Plan">Pro</oas-descriptions-item>
        <oas-descriptions-item label="Price">$199/yr</oas-descriptions-item>
      </oas-descriptions>
    </oas-stepper-panel>
    <oas-stepper-panel value="2">
      <oas-alert type="success" title="Activated">The Pro plan is live. Start using it now.</oas-alert>
    </oas-stepper-panel>
  </oas-stepper>
</DemoBlock>

## Keyboard & accessibility

The header is `role="tablist"` with each step `role="tab"` (`aria-selected` / `aria-disabled` synced); panels are `role="tabpanel"` linked via `aria-labelledby`. Roving tabindex: Tab enters on the current step, arrow keys move focus between steps (horizontal ←/→, vertical ↑/↓, skipping disabled steps), Home/End jump to the first/last, Enter/Space activates.

<DemoBlock title="Keyboard navigation">
  <oas-stepper id="stepper-keyboard" current="0" steps='[{"title":"Step 1"},{"title":"Step 2"},{"title":"Step 3"},{"title":"Step 4"}]'>
    <oas-stepper-panel value="0"><p>Focus is on step 1. Press → or Enter to try keyboard navigation.</p></oas-stepper-panel>
    <oas-stepper-panel value="1"><p>Step 2 content</p></oas-stepper-panel>
    <oas-stepper-panel value="2"><p>Step 3 content</p></oas-stepper-panel>
    <oas-stepper-panel value="3"><p>Step 4 content</p></oas-stepper-panel>
  </oas-stepper>
</DemoBlock>

## Size tiers

`size` has five tiers (`xs` / `small` / `medium` / `large` / `xl`) controlling title font density; invalid values fall back to `medium` with a dev warning.

<DemoBlock title="size tiers">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-stepper size="xs" current="1" steps='[{"title":"Create order"},{"title":"Confirm payment"},{"title":"Complete shipping"}]'></oas-stepper>
    <oas-stepper size="small" current="1" steps='[{"title":"Create order"},{"title":"Confirm payment"},{"title":"Complete shipping"}]'></oas-stepper>
    <oas-stepper current="1" steps='[{"title":"Create order"},{"title":"Confirm payment"},{"title":"Complete shipping"}]'></oas-stepper>
    <oas-stepper size="large" current="1" steps='[{"title":"Create order"},{"title":"Confirm payment"},{"title":"Complete shipping"}]'></oas-stepper>
    <oas-stepper size="xl" current="1" steps='[{"title":"Create order"},{"title":"Confirm payment"},{"title":"Complete shipping"}]'></oas-stepper>
  </oas-space>
</DemoBlock>

## API

### oas-stepper

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `clickable` | Steps are clickable to jump (default true; `clickable="false"` disables: click/keyboard silent, arrow focus still works) | `string` | `true` |
| `current` | Current step index (0-based, two-way: jumps write it back, external sets instantly sync aria-selected and panel visibility); invalid values fall back to 0, out-of-range clamped | `string` | `0` |
| `direction` | Direction: `horizontal` (default) / `vertical` (indicator left / title right) | `string` | `horizontal` |
| `linear` | Linear mode: only steps with `index <= current` can be activated (future steps `aria-disabled` + visually weakened, silent on click/keyboard) | `boolean` | — |
| `size` | Size tier: `xs`/`small`/`medium`/`large`/`xl` (title font density; invalid values fall back to medium + dev warning, deduped) | `string` | `medium` |
| `steps` | Steps data JSON `[{ title, description?, icon?, disabled?, status? }]` (semantics aligned with oas-steps StepItem minus panel-unrelated fields); invalid/empty fall back to `[]` | `StepperStep[] \| string` | `[]` |

| Event | Description |
| --- | --- |
| `oas-change` | Fired when jumping to a clickable step (step click / keyboard Enter/Space); `detail: { index }` (0-based, bubbles + composed, writes back current) |

| Name | Description |
| --- | --- |
| default | Content panel projection area (`<oas-stepper-panel>` direct children); panels are associated with step indexes by `value`, only the one matching `current` is visible |

### oas-stepper-panel

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `value` | Step index string the panel is associated with (e.g. `value="0"`); only the panel matching `current` is visible (`hidden` driven by oas-stepper) | — | — |

| Name | Description |
| --- | --- |
| default | Panel content (default slot) |

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  document.getElementById('stepper-click')?.addEventListener('oas-change', (e) => {
    message.info(`Switched to step ${e.detail.index + 1}`)
  })
  document.getElementById('stepper-linear')?.addEventListener('oas-change', (e) => {
    message.info(`Switched to step ${e.detail.index + 1}`)
  })
  document.getElementById('stepper-disabled')?.addEventListener('oas-change', (e) => {
    message.info(`Switched to step ${e.detail.index + 1}`)
  })
  const ctrl = document.getElementById('stepper-ctrl')
  const prevBtn = document.getElementById('stepper-prev')
  const nextBtn = document.getElementById('stepper-next')
  const sync = () => {
    const cur = Number(ctrl?.getAttribute('current') ?? 0)
    prevBtn?.setAttribute('disabled', cur <= 0 ? '' : '')
    nextBtn?.setAttribute('disabled', cur >= 2 ? '' : '')
  }
  prevBtn?.addEventListener('click', () => {
    const cur = Number(ctrl?.getAttribute('current') ?? 0)
    ctrl?.setAttribute('current', String(Math.max(0, cur - 1)))
    sync()
  })
  nextBtn?.addEventListener('click', () => {
    const cur = Number(ctrl?.getAttribute('current') ?? 0)
    ctrl?.setAttribute('current', String(Math.min(2, cur + 1)))
    sync()
  })
  sync()
  document.getElementById('stepper-vertical')?.addEventListener('oas-change', (e) => {
    message.info(`Switched to step ${e.detail.index + 1}`)
  })
})
</script>
