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

Controlled syncing and event listeners (wired in one `<script>` block):

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  // Controlled sync: write text-field input back to the value attribute
  for (const id of ['form-basic', 'form-full', 'form-validate', 'form-length', 'form-skip', 'form-event']) {
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
})
</script>

## API

| Property | Description                                                                            |
| -------- | -------------------------------------------------------------------------------------- |
| `rules`  | Validation rules JSON: `{ 字段名: [{ required, message, minLength, maxLength, pattern }] }` |

| Event                | Description                                  |
| -------------------- | -------------------------------------------- |
| `oas-submit`         | Validation passed, `detail: { values }`      |
| `oas-validate-fail`  | Validation failed, `detail: { errors, values }` |

On validation failure, failed fields are marked `aria-invalid`; error messages can be retrieved via `form.getErrors()`.
