# Form

An enhanced native `<form>` supporting validation and submission of inner fields according to `rules`.

> The data source is each field's `value` attribute (controlled mode). Fields validated by the form are `oas-input` / `oas-textarea` / `oas-select` / `oas-auto-complete` / `oas-cascader` / `oas-tree-select` / `oas-input-number` / `oas-checkbox` / `oas-radio` with a `name` (group containers are not involved). `oas-input` / `oas-textarea` / `oas-input-number` do **not** automatically write back to the `value` attribute while typing — listen to `oas-input` / `oas-change` events in script to sync; `oas-select` / `oas-cascader` / `oas-tree-select` write back by themselves on selection.

## Feature Demo

The feature demo area only demonstrates field collection and submission, without validation rules.

### Basic Usage

<DemoBlock title="Collect & submit">
  <oas-form id="form-basic" style="width: 340px">
    <oas-space direction="vertical" style="width: 100%">
      <oas-input name="name" placeholder="Name"></oas-input>
      <oas-input name="email" placeholder="Email"></oas-input>
      <oas-button type="primary" onclick="this.closest('oas-form').shadowRoot.querySelector('form').requestSubmit()">Submit</oas-button>
    </oas-space>
  </oas-form>
  <span id="form-basic-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 220px"></span>
</DemoBlock>

Without `rules`, submission performs no validation and dispatches `oas-submit` directly, with `detail.values` carrying the collected results of all fields with a `name`.

### Mixed Controls

<DemoBlock title="Mixed controls">
  <oas-form id="form-full" style="width: 360px">
    <oas-space direction="vertical" style="width: 100%">
      <oas-input name="username" placeholder="Username"></oas-input>
      <oas-select name="role" placeholder="Select a role" options='[{"label":"Admin","value":"admin"},{"label":"Editor","value":"editor"},{"label":"Guest","value":"guest"}]'></oas-select>
      <oas-input-number name="age"></oas-input-number>
      <oas-textarea name="bio" rows="3" placeholder="Bio (optional)"></oas-textarea>
      <oas-button type="primary" onclick="this.closest('oas-form').shadowRoot.querySelector('form').requestSubmit()">Submit</oas-button>
    </oas-space>
  </oas-form>
</DemoBlock>

## Validation

The validation area demonstrates `rules`-declared validation rules and failure feedback.

> Validation rules: `{ required, message, minLength, maxLength, pattern }`. On failure, the field is marked `aria-invalid` (red-bordered input), an error message is shown in red below the field, and `oas-validate-fail` is dispatched.

### Required & Format Validation

<DemoBlock title="Required & format validation">
  <oas-form id="form-validate" rules='{"name":[{"required":true,"message":"Please enter a name"}],"email":[{"required":true,"message":"Please enter an email"},{"pattern":"^\\S+@\\S+$","message":"Invalid email format"}]}' style="width: 340px">
    <oas-space direction="vertical" style="width: 100%">
      <oas-input name="name" placeholder="Name"></oas-input>
      <oas-input name="email" placeholder="Email"></oas-input>
      <oas-button type="primary" onclick="this.closest('oas-form').shadowRoot.querySelector('form').requestSubmit()">Submit</oas-button>
    </oas-space>
  </oas-form>
</DemoBlock>

### Length Validation

<DemoBlock title="minLength validation">
  <oas-form id="form-length" rules='{"username":[{"required":true,"message":"Please enter a username"},{"minLength":3,"message":"At least 3 characters"}]}' style="width: 340px">
    <oas-space direction="vertical" style="width: 100%">
      <oas-input name="username" placeholder="Username (at least 3 characters)"></oas-input>
      <oas-button type="primary" onclick="this.closest('oas-form').shadowRoot.querySelector('form').requestSubmit()">Submit</oas-button>
    </oas-space>
  </oas-form>
</DemoBlock>

### Disabled Fields Skip Validation

<DemoBlock title="Disabled fields are not validated">
  <oas-form id="form-skip" rules='{"title":[{"required":true,"message":"Please enter a title"}],"locked":[{"required":true,"message":"This field is disabled and should be skipped"}]}' style="width: 340px">
    <oas-space direction="vertical" style="width: 100%">
      <oas-input name="title" placeholder="Title"></oas-input>
      <oas-input name="locked" disabled value="Cannot be modified"></oas-input>
      <oas-button type="primary" onclick="this.closest('oas-form').shadowRoot.querySelector('form').requestSubmit()">Submit</oas-button>
    </oas-space>
  </oas-form>
</DemoBlock>

### Submit & Validation-fail Events

<DemoBlock title="submit / validate-fail">
  <oas-form id="form-event" rules='{"nick":[{"required":true,"message":"Please enter a nickname"}]}' style="width: 340px">
    <oas-space direction="vertical" style="width: 100%">
      <oas-input name="nick" placeholder="Nickname"></oas-input>
      <oas-button type="primary" onclick="this.closest('oas-form').shadowRoot.querySelector('form').requestSubmit()">Submit</oas-button>
    </oas-space>
  </oas-form>
  <span id="form-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 220px"></span>
</DemoBlock>

## Grid Form Layout

> With `layout="grid"`, the form element becomes a 24-column grid and `oas-form-item` spans columns via `span` (default 24 = full row); `gap` controls grid spacing, `label-align` positions the label (`left` / `right` / `top`, default `top`), and `label-width` sets the label column width for `left`/`right`. On validation failure, error messages are collected into the `oas-form-item` error slot (`role="alert"`).

### Two-Column Grid with Validation

<DemoBlock title="Two-column grid layout">
  <oas-form id="form-grid" layout="grid" gap="var(--oas-space-4)" style="width: 100%; max-width: 720px" rules='{"name":[{"required":true,"message":"Please enter a name"}],"email":[{"required":true,"message":"Please enter an email"},{"pattern":"^\\S+@\\S+$","message":"Invalid email format"}]}'>
    <oas-form-item label="Name" span="12" required>
      <oas-input name="name" placeholder="Enter your name"></oas-input>
    </oas-form-item>
    <oas-form-item label="Email" span="12" required>
      <oas-input name="email" placeholder="Enter your email"></oas-input>
    </oas-form-item>
    <oas-form-item label="Bio" span="24">
      <oas-textarea name="bio" rows="3" placeholder="Bio (optional)"></oas-textarea>
    </oas-form-item>
    <oas-form-item span="24">
      <oas-button type="primary" onclick="this.closest('oas-form').shadowRoot.querySelector('form').requestSubmit()">Submit</oas-button>
      <span id="form-grid-output" style="margin-left: var(--oas-space-3); color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
    </oas-form-item>
  </oas-form>
</DemoBlock>

### label-align & label-width

<DemoBlock title="Switch label-align">
  <oas-form id="form-align" layout="grid" label-align="left" label-width="96px" gap="var(--oas-space-4)" style="width: 100%; max-width: 720px" rules='{"username":[{"required":true,"message":"Please enter a username"}],"phone":[{"required":true,"message":"Please enter a phone number"},{"pattern":"^1\\d{10}$","message":"Invalid phone number format"}]}'>
    <oas-form-item label="Username" span="12" required>
      <oas-input name="username" placeholder="Enter a username"></oas-input>
    </oas-form-item>
    <oas-form-item label="Phone" span="12" required>
      <oas-input name="phone" placeholder="Enter a phone number"></oas-input>
    </oas-form-item>
  </oas-form>
  <div style="display: flex; align-items: center; gap: var(--oas-space-3); margin-top: var(--oas-space-4)">
    <oas-segmented id="form-align-switch" value="left" options='[{"label":"Left","value":"left"},{"label":"Top","value":"top"},{"label":"Right","value":"right"}]'></oas-segmented>
    <span id="form-align-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
  </div>
</DemoBlock>

Controlled syncing and event listeners (wired in one `<script>` block):

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  // Controlled sync: write text-field input back to the value attribute
  for (const id of ['form-basic', 'form-full', 'form-validate', 'form-length', 'form-skip', 'form-event', 'form-grid', 'form-align']) {
    const form = document.getElementById(id)
    if (!form) continue
    for (const el of form.querySelectorAll('oas-input, oas-textarea')) {
      const name = el.getAttribute('name')
      if (!name) continue
      el.addEventListener('oas-input', (e) => el.setAttribute('value', e.detail.value))
    }
    for (const el of form.querySelectorAll('oas-input-number')) {
      el.addEventListener('oas-change', (e) => el.setAttribute('value', String(e.detail.value)))
    }
  }

  // Feature demo: collect results from the basic usage form
  const basicOut = document.getElementById('form-basic-output')
  document.getElementById('form-basic')?.addEventListener('oas-submit', (e) => {
    basicOut.textContent = `oas-submit: ${JSON.stringify(e.detail.values)}`
  })

  // Validation area: event demo
  const out = document.getElementById('form-output')
  const formEvent = document.getElementById('form-event')
  formEvent?.addEventListener('oas-submit', (e) => {
    out.textContent = `oas-submit: ${JSON.stringify(e.detail.values)}`
  })
  formEvent?.addEventListener('oas-validate-fail', (e) => {
    out.textContent = `oas-validate-fail: ${JSON.stringify(e.detail.errors)}`
  })

  // Grid form: echo submit results (error texts are collected into the form-item error slot)
  const gridOut = document.getElementById('form-grid-output')
  document.getElementById('form-grid')?.addEventListener('oas-submit', (e) => {
    gridOut.textContent = `oas-submit: ${JSON.stringify(e.detail.values)}`
  })

  // Grid form: switch label-align (visible feedback: label position changes immediately)
  const alignOut = document.getElementById('form-align-output')
  document.getElementById('form-align-switch')?.addEventListener('oas-change', (e) => {
    const v = e.detail.value
    document.getElementById('form-align')?.setAttribute('label-align', v)
    alignOut.textContent = `label-align: ${v}`
  })
})
</script>

## API

### oas-form

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `gap` | Grid spacing in `grid` mode (token value, e.g. `var(--oas-space-4)`) | `string` | `0` |
| `label-align` | Label alignment: `left` / `right` / `top` (default `top` in grid mode) | `string` | `top` |
| `label-width` | Label column width when `label-align` is `left`/`right` | — | — |
| `layout` | Layout mode: `vertical` (default, stacked) / `grid` (24-column grid); non-enum values fall back to `vertical` | `string` | `vertical` |
| `rules` | Validation rules JSON: `{ 字段名: [{ required, message, minLength, maxLength, pattern }] }` | `Rules \| string` | `{}` |

| Event | Description |
| --- | --- |
| `oas-submit` | Validation passed, `detail: { values }` |
| `oas-validate-fail` | Validation failed, `detail: { errors, values }` |

| Name | Description |
| --- | --- |
| default | — |

### oas-form-item

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `label` | Label text (no label row when omitted) | `string` | — |
| `name` | Field name (validation association) | — | — |
| `required` | Required asterisk (visual only; validation is still driven by form `rules`) | `boolean` | — |
| `span` | Columns spanned in the 24-column grid (only when form `layout="grid"`; non-integer in 1-24 → `24`) | `string` | `24` |

| Name | Description |
| --- | --- |
| default | Field control |

On validation failure, failed fields are marked `aria-invalid`; error messages can be retrieved via `form.getErrors()`. For fields wrapped in `oas-form-item`, the error text is collected into the form-item's error slot (`role="alert"`).
