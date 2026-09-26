# Form

An enhanced native `<form>` supporting validation and submission of inner fields according to `rules`.

> **Cross-shadow submit entry**: `oas-form` wraps a native `<form>` inside its shadow root, so buttons in the light DOM (including `oas-button`) do not have native submit semantics. Call the component's public `submit()` method at submit time (e.g. `this.closest('oas-form').submit()`); it delegates to the inner form's `requestSubmit()`, preserving submit-event semantics and triggering the same validation flow that dispatches `oas-submit` / `oas-validate-fail` — do **not** reach into `shadowRoot.querySelector('form')` to drive the inner form.

> The data source is each field's `value` attribute (controlled mode). Fields validated by the form are `oas-input` / `oas-textarea` / `oas-select` / `oas-auto-complete` / `oas-cascader` / `oas-tree-select` / `oas-input-number` / `oas-checkbox` / `oas-radio` with a `name` (group containers are not involved). `oas-input` / `oas-textarea` / `oas-input-number` do **not** automatically write back to the `value` attribute while typing — listen to `oas-input` / `oas-change` events in script to sync; `oas-select` / `oas-cascader` / `oas-tree-select` write back by themselves on selection.

## Feature Demo

The feature demo area only demonstrates field collection and submission, without validation rules.

### Basic Usage

<DemoBlock title="Collect & submit">
  <oas-form id="form-basic" style="width: 340px">
    <oas-space direction="vertical" style="width: 100%">
      <oas-input name="name" placeholder="Name"></oas-input>
      <oas-input name="email" placeholder="Email"></oas-input>
      <oas-button type="primary" onclick="this.closest('oas-form').submit()">Submit</oas-button>
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
      <oas-button type="primary" onclick="this.closest('oas-form').submit()">Submit</oas-button>
    </oas-space>
  </oas-form>
</DemoBlock>

## Native Form Integration (form-associated)

All form components are **form-associated** custom elements (`formAssociated: true`): they work directly inside a native `<form>` — `<label for>` association works (clicking the label focuses/activates the control, screen readers announce the label text), values are collected via standard `FormData` (submitted only when `name` is set), `form.reset()` restores initial values, `fieldset[disabled]` disables them, and `required` joins the native validation chain (`checkValidity()` / `:invalid` pseudo-class).

<DemoBlock title="native form + label for + FormData + reset">
  <form id="form-native" style="width: 100%; display: flex; flex-direction: column; gap: var(--oas-space-3); align-items: flex-start">
    <label for="fn-name" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">Name (click this line &rarr; focuses the input)</label>
    <oas-input id="fn-name" name="username" value="initial value" style="width: 240px"></oas-input>
    <label for="fn-role" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">Role (click this line &rarr; focuses the select)</label>
    <oas-select id="fn-role" name="role" options='[{"label":"Admin","value":"admin"},{"label":"Guest","value":"guest"}]' style="width: 240px"></oas-select>
    <label for="fn-date" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">Join date</label>
    <oas-date-picker id="fn-date" name="joined"></oas-date-picker>
    <span style="display: inline-flex; align-items: center; gap: var(--oas-space-2)">
      <oas-checkbox id="fn-agree" name="agree" value="yes"></oas-checkbox>
      <label for="fn-agree" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">Accept the terms (click this line &rarr; checks)</label>
    </span>
    <span style="display: inline-flex; align-items: center; gap: var(--oas-space-2)">
      <oas-switch id="fn-notify" name="notify"></oas-switch>
      <label for="fn-notify" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">Email notifications (click this line &rarr; toggles)</label>
    </span>
    <div style="display: flex; gap: var(--oas-space-2)">
      <oas-button id="fn-read" size="small" type="button">Read FormData</oas-button>
      <oas-button id="fn-reset" size="small" type="button">form.reset()</oas-button>
    </div>
    <span id="fn-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
  </form>
</DemoBlock>

**Supported (15 components)**: input / textarea / input-number / checkbox / radio / switch / select / combobox / auto-complete / tree-select / mentions / date-picker / time-picker / upload. Value semantics follow the native ones: multiple mode (select / tree-select / date-picker multiple) submits **same-name entries**; date / time range mode submits **`name-start` / `name-end`**; upload submits File; unchecked checkables submit nothing. Works in parallel with `oas-form`'s `collectFields` mechanism.

## Validation

The validation area demonstrates `rules`-declared validation rules and failure feedback.

> Validation rules: `{ required, message, minLength, maxLength, pattern, validator, validateTrigger }` (`validator` is a custom validation function; functions are not JSON-serializable, use the `rules` property channel; `validateTrigger` overrides the form-level trigger per field). On failure, the field is marked `aria-invalid` (red-bordered input), an error message is shown in red below the field, and `oas-validate-fail` is dispatched.

### Required & Format Validation

<DemoBlock title="Required & format validation">
  <oas-form id="form-validate" rules='{"name":[{"required":true,"message":"Please enter a name"}],"email":[{"required":true,"message":"Please enter an email"},{"pattern":"^\\S+@\\S+$","message":"Invalid email format"}]}' style="width: 340px">
    <oas-space direction="vertical" style="width: 100%">
      <oas-input name="name" placeholder="Name"></oas-input>
      <oas-input name="email" placeholder="Email"></oas-input>
      <oas-button type="primary" onclick="this.closest('oas-form').submit()">Submit</oas-button>
    </oas-space>
  </oas-form>
</DemoBlock>

### Length Validation

<DemoBlock title="minLength validation">
  <oas-form id="form-length" rules='{"username":[{"required":true,"message":"Please enter a username"},{"minLength":3,"message":"At least 3 characters"}]}' style="width: 340px">
    <oas-space direction="vertical" style="width: 100%">
      <oas-input name="username" placeholder="Username (at least 3 characters)"></oas-input>
      <oas-button type="primary" onclick="this.closest('oas-form').submit()">Submit</oas-button>
    </oas-space>
  </oas-form>
</DemoBlock>

### Disabled Fields Skip Validation

<DemoBlock title="Disabled fields are not validated">
  <oas-form id="form-skip" rules='{"title":[{"required":true,"message":"Please enter a title"}],"locked":[{"required":true,"message":"This field is disabled and should be skipped"}]}' style="width: 340px">
    <oas-space direction="vertical" style="width: 100%">
      <oas-input name="title" placeholder="Title"></oas-input>
      <oas-input name="locked" disabled value="Cannot be modified"></oas-input>
      <oas-button type="primary" onclick="this.closest('oas-form').submit()">Submit</oas-button>
    </oas-space>
  </oas-form>
</DemoBlock>

### Submit & Validation-fail Events

<DemoBlock title="submit / validate-fail">
  <oas-form id="form-event" rules='{"nick":[{"required":true,"message":"Please enter a nickname"}]}' style="width: 340px">
    <oas-space direction="vertical" style="width: 100%">
      <oas-input name="nick" placeholder="Nickname"></oas-input>
      <oas-button type="primary" onclick="this.closest('oas-form').submit()">Submit</oas-button>
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
      <oas-button type="primary" onclick="this.closest('oas-form').submit()">Submit</oas-button>
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

## Inline Form Layout

> With `inline`, items are laid out horizontally: the label sits on the left of the control (auto-width), controls size to their content, item spacing follows `gap` (default `var(--oas-space-4)`), and items wrap when the container is too narrow. Coexists with `layout` and takes precedence over it; forces `label-align` to `left` and `label-width` to auto. Suited to compact toolbars like login and search.

### Inline Login Form

<DemoBlock title="Inline login form">
  <oas-form id="form-inline-login" inline rules='{"username":[{"required":true,"message":"Please enter a username"}],"password":[{"required":true,"message":"Please enter a password"}]}' style="width: 100%; max-width: 640px">
    <oas-form-item label="Username" required>
      <oas-input name="username" placeholder="Username" style="width: 180px"></oas-input>
    </oas-form-item>
    <oas-form-item label="Password" required>
      <oas-input name="password" type="password" placeholder="Password" style="width: 180px"></oas-input>
    </oas-form-item>
    <oas-form-item>
      <oas-button type="primary" onclick="this.closest('oas-form').submit()">Log in</oas-button>
      <span id="form-inline-login-output" style="margin-left: var(--oas-space-3); color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
    </oas-form-item>
  </oas-form>
</DemoBlock>

### Inline Search Form

<DemoBlock title="Inline search form">
  <oas-form id="form-inline-search" inline rules='{"keyword":[{"required":true,"message":"Please enter a keyword"}]}' style="width: 100%; max-width: 720px">
    <oas-form-item label="Keyword" required>
      <oas-input name="keyword" placeholder="Search keyword" style="width: 200px"></oas-input>
    </oas-form-item>
    <oas-form-item label="Category">
      <oas-select name="category" placeholder="All categories" options='[{"label":"All","value":"all"},{"label":"Docs","value":"doc"},{"label":"Components","value":"component"}]' style="width: 140px"></oas-select>
    </oas-form-item>
    <oas-form-item>
      <oas-button type="primary" onclick="this.closest('oas-form').submit()">Search</oas-button>
      <span id="form-inline-search-output" style="margin-left: var(--oas-space-3); color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
    </oas-form-item>
  </oas-form>
</DemoBlock>

Controlled syncing and event listeners (wired in one `<script>` block):

## Form-Level Capabilities

### Whole-Form Disabled

> The `disabled` attribute aligns with the config-provider global-disable semantics: all fields are disabled through their own form-associated disable channel (inner controls disabled, interaction blocked), **without writing back the field's `disabled` attribute** (fields fully recover when released); while the form is disabled, submission skips all validation.

<DemoBlock title="Whole-form disabled">
  <oas-form id="form-disabled-all" rules='{"name":[{"required":true,"message":"Please enter a name"}]}' disabled style="width: 340px">
    <oas-space direction="vertical" style="width: 100%">
      <oas-input name="name" value="张三" placeholder="Name"></oas-input>
      <oas-button type="primary" onclick="this.closest('oas-form').submit()">Submit (skips validation while disabled)</oas-button>
    </oas-space>
  </oas-form>
  <div style="display: inline-flex; align-items: center; gap: var(--oas-space-2); margin-left: var(--oas-space-4)">
    <oas-switch id="form-disabled-all-switch" checked></oas-switch>
    <span style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">Disable the form</span>
  </div>
  <span id="form-disabled-all-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 200px"></span>
</DemoBlock>

### Initial Values & Reset

> `initial-values` are written into the corresponding fields after mount (input via `value`, switch via `checked`, transfer/dynamic-input via `model-value`); `reset()` restores the initial values and clears validation error states without dispatching any events (consistent with the native form reset baseline). The `initialValues` property channel is also supported (property takes precedence over attribute).

<DemoBlock title="initial-values and reset">
  <oas-form id="form-initial" initial-values='{"name":"张三","notify":true}' rules='{"name":[{"required":true,"message":"Please enter a name"}]}' style="width: 340px">
    <oas-space direction="vertical" style="width: 100%">
      <oas-input name="name" placeholder="Name"></oas-input>
      <oas-switch name="notify"></oas-switch>
      <div style="display: flex; gap: var(--oas-space-2)">
        <oas-button type="primary" onclick="this.closest('oas-form').submit()">Submit</oas-button>
        <oas-button onclick="this.closest('oas-form').reset()">Reset</oas-button>
      </div>
    </oas-space>
  </oas-form>
  <span id="form-initial-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 220px"></span>
</DemoBlock>

### Custom Validation Function (validator)

> `validator` runs after the built-in checks of its rule: return `true` to pass, a string as the error message, or a Promise for async validation. Functions are not JSON-serializable, so set them through the `rules` **property** channel (`form.rules = {...}` in script).

<DemoBlock title="Custom validation function">
  <oas-form id="form-validator" style="width: 340px">
    <oas-space direction="vertical" style="width: 100%">
      <oas-input name="username" placeholder="Username (try admin or fewer than 6 characters)"></oas-input>
      <oas-button type="primary" onclick="this.closest('oas-form').submit()">Submit</oas-button>
    </oas-space>
  </oas-form>
  <span id="form-validator-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 220px"></span>
</DemoBlock>

### Validation Trigger (validate-trigger)

> `validate-trigger` controls when per-field live validation runs: `change` (default) / `blur` / `input`; a rule's `validateTrigger` overrides the form level. Submission always validates everything. The example below uses `blur`: type an invalid phone number, then click elsewhere (blur) to see the red error text; fix it and blur again to clear it.

<DemoBlock title="Validate on blur">
  <oas-form id="form-trigger" validate-trigger="blur" rules='{"phone":[{"pattern":"^1\\d{10}$","message":"Invalid phone number"}]}' style="width: 340px">
    <oas-space direction="vertical" style="width: 100%">
      <oas-input name="phone" placeholder="Phone (validated on blur)"></oas-input>
    </oas-space>
  </oas-form>
  <span id="form-trigger-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 200px"></span>
</DemoBlock>

### Scroll to First Error (scroll-to-first-error)

> With `scroll-to-first-error` set, a failed submit focuses the first invalid field and smooth-scrolls it into view (degrades to an instant jump when the system prefers reduced motion). The long form below scrolls — the remark field sits at the very bottom; click submit and watch the container scroll down.

<DemoBlock title="Scroll to first error">
  <div style="max-height: 220px; overflow: auto; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-3); width: 360px">
    <oas-form id="form-scroll" scroll-to-first-error rules='{"remark":[{"required":true,"message":"Please fill in the remark (bottom of the form)"}]}'>
      <oas-space direction="vertical" style="width: 100%">
        <oas-input name="f1" placeholder="Field 1"></oas-input>
        <oas-input name="f2" placeholder="Field 2"></oas-input>
        <oas-input name="f3" placeholder="Field 3"></oas-input>
        <oas-input name="f4" placeholder="Field 4"></oas-input>
        <oas-input name="f5" placeholder="Field 5"></oas-input>
        <oas-input name="f6" placeholder="Field 6"></oas-input>
        <oas-input name="remark" placeholder="Remark (required, at the bottom)"></oas-input>
      </oas-space>
    </oas-form>
  </div>
  <div style="margin-top: var(--oas-space-3)">
    <oas-button type="primary" onclick="document.getElementById('form-scroll').submit()">Submit (scrolls to first error)</oas-button>
  </div>
</DemoBlock>

### Values Change Event (oas-values-change)

> Dispatched whenever any field value changes, `detail: { name, value, values }` (`values` is a snapshot of all current values). Initial-value writes and `reset()` are silent channels and do not dispatch.

<DemoBlock title="oas-values-change">
  <oas-form id="form-values" style="width: 340px">
    <oas-space direction="vertical" style="width: 100%">
      <oas-input name="a" placeholder="Field A (type to try)"></oas-input>
      <oas-input name="b" placeholder="Field B (type to try)"></oas-input>
    </oas-space>
  </oas-form>
  <span id="form-values-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 260px"></span>
</DemoBlock>

Script wiring (controlled sync + event feedback for each demo):

### Form-Level Size & Label Colon (size / colon)

> `size` distributes the form-level size tier (`small` / `medium` / `large`) to field controls inside the form; a field's own explicit `size` wins. `colon` renders a colon after the label of every `oas-form-item` in the form. Click the buttons below to watch fields resize and the colon toggle live.

<DemoBlock title="Form-level size + colon">
  <oas-form id="form-size-colon" size="large" colon style="width: 360px">
    <oas-space direction="vertical" style="width: 100%">
      <oas-form-item label="Bio">
        <oas-textarea name="sc-bio" rows="2" placeholder="Textarea follows the form-level size"></oas-textarea>
      </oas-form-item>
      <oas-form-item label="Options">
        <oas-space direction="vertical" size="small">
          <oas-checkbox name="sc-a">Checkbox follows the form-level size</oas-checkbox>
          <oas-checkbox name="sc-b" size="medium">Own size=medium wins (ignores form level)</oas-checkbox>
        </oas-space>
      </oas-form-item>
    </oas-space>
  </oas-form>
  <span style="display: inline-flex; gap: var(--oas-space-2); margin-top: var(--oas-space-3)">
    <oas-button onclick="document.getElementById('form-size-colon').setAttribute('size','small')">Switch to small</oas-button>
    <oas-button onclick="document.getElementById('form-size-colon').setAttribute('size','large')">Switch to large</oas-button>
    <oas-button onclick="document.getElementById('form-size-colon').toggleAttribute('colon')">Toggle colon</oas-button>
  </span>
</DemoBlock>

### Help Text & Status Icon (help / status-icon)

> `help` renders persistent helper text below the control, independent of validation errors. With `status-icon` on a form-item, a danger status icon appears before the error text when validation fails (hidden again once the error clears).

<DemoBlock title="help + status-icon">
  <oas-form id="form-help-icon" rules='{"mail":[{"required":true,"message":"Email is required"},{"pattern":"^\\S+@\\S+$","message":"Invalid email format"}]}' style="width: 360px">
    <oas-space direction="vertical" style="width: 100%">
      <oas-form-item label="Email" help="Used for login verification codes" status-icon>
        <oas-input name="mail" placeholder="Submit empty or invalid to try"></oas-input>
      </oas-form-item>
      <oas-button type="primary" onclick="document.getElementById('form-help-icon').submit()">Submit</oas-button>
    </oas-space>
  </oas-form>
</DemoBlock>

### Custom Validation Messages (validate-messages)

> `validateMessages` (property channel, recommended) or `validate-messages` (JSON attribute) overrides locale-default messages per rule type. Templates support `${min}` / `${max}` / `${value}` placeholders; an explicit `rule.message` has the highest priority.

<DemoBlock title="validate-messages">
  <oas-form id="form-vmessages" rules='{"user":[{"required":true},{"minLength":6}]}' style="width: 360px">
    <oas-space direction="vertical" style="width: 100%">
      <oas-form-item label="Username" status-icon>
        <oas-input name="user" placeholder="Submit empty or shorter than 6 chars"></oas-input>
      </oas-form-item>
      <oas-button type="primary" onclick="document.getElementById('form-vmessages').submit()">Submit</oas-button>
    </oas-space>
  </oas-form>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  // Controlled sync: write text-field input back to the value attribute
  for (const id of ['form-basic', 'form-full', 'form-validate', 'form-length', 'form-skip', 'form-event', 'form-grid', 'form-align', 'form-inline-login', 'form-inline-search', 'form-size-colon', 'form-help-icon', 'form-vmessages']) {
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

  // Native form integration: FormData read + reset
  const nativeForm = document.getElementById('form-native')
  const fnOut = document.getElementById('fn-output')
  document.getElementById('fn-read')?.addEventListener('click', () => {
    if (!nativeForm) return
    const fd = new FormData(nativeForm)
    const text = [...fd.entries()]
      .map(([k, v]) => `${k}=${v instanceof File ? v.name : v}`)
      .join('; ')
    fnOut.textContent = text ? `FormData: ${text}` : 'FormData: (nothing to submit yet)'
  })
  document.getElementById('fn-reset')?.addEventListener('click', () => {
    nativeForm?.reset()
    if (fnOut) fnOut.textContent = 'form.reset() executed (all fields back to their default values)'
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

  // Inline login: echo submit results (error texts are collected into the form-item error slot below the control)
  const loginOut = document.getElementById('form-inline-login-output')
  document.getElementById('form-inline-login')?.addEventListener('oas-submit', (e) => {
    loginOut.textContent = `oas-submit: ${JSON.stringify(e.detail.values)}`
  })

  // Inline search: echo submit results
  const searchOut = document.getElementById('form-inline-search-output')
  document.getElementById('form-inline-search')?.addEventListener('oas-submit', (e) => {
    searchOut.textContent = `oas-submit: ${JSON.stringify(e.detail.values)}`
  })

  // Whole-form disabled: toggle the disabled attribute (fields gray out/recover; submission skips validation while disabled)
  const disabledForm = document.getElementById('form-disabled-all')
  const disabledSwitch = document.getElementById('form-disabled-all-switch')
  const disabledOut = document.getElementById('form-disabled-all-output')
  disabledForm?.addEventListener('oas-submit', (e) => {
    disabledOut.textContent = `oas-submit: ${JSON.stringify(e.detail.values)}`
  })
  disabledSwitch?.addEventListener('oas-change', () => {
    const on = disabledSwitch.hasAttribute('checked')
    disabledForm.toggleAttribute('disabled', on)
    disabledOut.textContent = on ? 'Form disabled (fields grayed out, submission skips validation)' : 'Form re-enabled (fields usable again)'
  })

  // Initial values & reset: echo submit/fail/reset results
  const initialOut = document.getElementById('form-initial-output')
  document.getElementById('form-initial')?.addEventListener('oas-submit', (e) => {
    initialOut.textContent = `oas-submit: ${JSON.stringify(e.detail.values)}`
  })
  document.getElementById('form-initial')?.addEventListener('oas-validate-fail', (e) => {
    initialOut.textContent = `oas-validate-fail: ${JSON.stringify(e.detail.errors)} (click Reset to restore initial values and clear errors)`
  })
  document.getElementById('form-initial')?.addEventListener('click', (e) => {
    if (e.target?.textContent?.includes('Reset')) initialOut.textContent = 'reset() done (back to initial values, no events dispatched)'
  })

  // Custom validation function: validator goes through the rules property channel (functions are not JSON-serializable)
  const validatorForm = document.getElementById('form-validator')
  if (validatorForm) {
    validatorForm.rules = {
      username: [
        { required: true, message: 'Please enter a username' },
        {
          validator: (v) => {
            if (v === 'admin') return 'Username is reserved (custom validation)'
            if (v.length < 6) return 'At least 6 characters (custom validation)'
            return true
          },
        },
      ],
    }
  }
  const validatorOut = document.getElementById('form-validator-output')
  validatorForm?.addEventListener('oas-submit', (e) => {
    validatorOut.textContent = `oas-submit: ${JSON.stringify(e.detail.values)}`
  })
  validatorForm?.addEventListener('oas-validate-fail', (e) => {
    validatorOut.textContent = `oas-validate-fail: ${JSON.stringify(e.detail.errors)}`
  })

  // Validation trigger: live validation on blur (feedback = red error text shown/hidden)
  const triggerForm = document.getElementById('form-trigger')
  const triggerOut = document.getElementById('form-trigger-output')
  triggerForm?.addEventListener('oas-blur', () => {
    const phone = triggerForm.querySelector('oas-input[name="phone"]')
    const invalid = phone?.hasAttribute('aria-invalid')
    triggerOut.textContent = invalid ? 'Blur validation: invalid format (see red text)' : 'Blur validation: passed'
  })

  // Values change event: echo the latest change and the whole-form snapshot
  const valuesOut = document.getElementById('form-values-output')
  document.getElementById('form-values')?.addEventListener('oas-values-change', (e) => {
    const { name, value, values } = e.detail
    valuesOut.textContent = `Latest change: ${name} = ${value || '(empty)'}; all: ${JSON.stringify(values)}`
  })
  // Custom validation messages (validate-messages property channel, overrides locale defaults)
  const vmForm = document.getElementById('form-vmessages')
  if (vmForm) {
    vmForm.validateMessages = {
      required: 'Username is required',
      minLength: 'Username needs at least ${min} characters',
    }
  }
})
</script>

## API

### Methods

| Method | Description |
| --- | --- |
| `submit()` | Public submit entry: delegates to the inner form's `requestSubmit()` (preserves the submit event and submitter semantics); after validation dispatches `oas-submit` / `oas-validate-fail`. Across the shadow boundary light-DOM buttons have no native submit semantics, so use this method uniformly (e.g. `this.closest('oas-form').submit()`) |

### oas-form

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `colon` | Renders a colon after every form-item label in the form (CSS ::after, no DOM text) | — | — |
| `disabled` | Whole-form disable: fields are disabled via their form-associated channel (no write-back of the disabled attribute); submission skips validation while disabled | `boolean` | — |
| `gap` | Spacing (grid gap in `grid` mode; item spacing in `inline` mode), token value e.g. `var(--oas-space-4)`; `0` by default in grid, `var(--oas-space-4)` by default in inline | `string` | `0` |
| `initial-values` | Initial values JSON (the `initialValues` property takes precedence): written into fields after mount; `reset()` restores them | `Record<string, unknown> \| string` | — |
| `inline` | Inline layout: items laid out horizontally (label on the left of the control, controls auto-width, wraps to new lines); item spacing follows `gap` (default `var(--oas-space-4)`); coexists with `layout` and takes precedence over it; forces `label-align` to `left` and `label-width` to auto | `boolean` | — |
| `label-align` | Label alignment: `left` / `right` / `top` (default `top` in grid mode; forced to `left` in inline mode) | `string` | `top` |
| `label-width` | Label column width when `label-align` is `left`/`right` (ignored in inline mode, auto) | — | — |
| `layout` | Layout mode: `vertical` (default, stacked) / `grid` (24-column grid); non-enum values fall back to `vertical`; `inline` attribute takes precedence when present | `string` | `vertical` |
| `rules` | Validation rules JSON: `{ 字段名: [{ required, message, minLength, maxLength, pattern }] }` | `Rules \| string` | — |
| `scroll-to-first-error` | On validation failure, focus the first invalid field and smooth-scroll it into view (instant jump under prefers-reduced-motion) | `boolean` | — |
| `size` | Form-level size tier distributed to all fields via the data-form-size channel (a field's own explicit size wins; form-associated fields follow dynamically) | — | — |
| `validate-messages` | Overrides locale-default validation messages per rule type (property/JSON channels, ${min}/${max}/${value} placeholders, default fallback) | `ValidateMessages \| string` | — |
| `validate-trigger` | When per-field live validation fires: `change` (default) / `blur` / `input`; a rule's `validateTrigger` overrides per field; submission always validates everything | `string` | `change` |

#### Events

| Event | Description |
| --- | --- |
| `oas-submit` | Validation passed, `detail: { values }` |
| `oas-validate-fail` | Validation failed, `detail: { errors, values }` |
| `oas-values-change` | Dispatched when any field value changes, `detail: { name, value, values }` (values is a whole-form snapshot; initial-value writes and reset() are silent) |

#### Slots

| Name | Description |
| --- | --- |
| default | Form content (`oas-form-item` and friends) |

### oas-form-item

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `help` | Persistent helper text below the control, independent of validation errors | `string` | — |
| `label` | Label text (no label row when omitted) | `string` | — |
| `name` | Field name (validation association) | — | — |
| `required` | Required asterisk (visual only; validation is still driven by form `rules`) | `boolean` | — |
| `span` | Columns spanned in the 24-column grid (only when form `layout="grid"`; non-integer in 1-24 → `24`) | `string` | `24` |
| `status-icon` | Shows a danger status icon before the error text while the error is present | `boolean` | — |

#### Slots

| Name | Description |
| --- | --- |
| default | Field control |

#### CSS Variables

| CSS Variable | Default |
| --- | --- |
| `--oas-form-label-width` | `96px` |

On validation failure, failed fields are marked `aria-invalid`; error messages can be retrieved via `form.getErrors()`. For fields wrapped in `oas-form-item`, the error text is collected into the form-item's error slot (`role="alert"`).
