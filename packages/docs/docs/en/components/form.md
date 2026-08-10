# Form

An enhanced native `<form>` supporting validation and submission of inner fields according to `rules`.

> The data source is each field's `value` attribute (controlled mode). Fields validated by the form are `oas-input` / `oas-textarea` / `oas-select` / `oas-auto-complete` / `oas-cascader` / `oas-tree-select` / `oas-input-number` / `oas-checkbox` / `oas-radio` with a `name` (group containers are not involved). `oas-input` / `oas-textarea` / `oas-input-number` do **not** automatically write back to the `value` attribute while typing — listen to `oas-input` / `oas-change` events in script to sync; `oas-select` / `oas-cascader` / `oas-tree-select` write back by themselves on selection.

## Feature Demo

The feature demo area only demonstrates field collection and submission, without validation rules.

### Basic Usage

<DemoBlock title="Collect & submit">
  <oas-form id="form-basic" style="width: 340px">
    <oas-space direction="vertical" style="width: 100%">
      <oas-input name="name" placeholder="姓名"></oas-input>
      <oas-input name="email" placeholder="邮箱"></oas-input>
      <oas-button type="primary" onclick="this.closest('oas-form').shadowRoot.querySelector('form').requestSubmit()">提交</oas-button>
    </oas-space>
  </oas-form>
  <span id="form-basic-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 220px"></span>
</DemoBlock>

Without `rules`, submission performs no validation and dispatches `oas-submit` directly, with `detail.values` carrying the collected results of all fields with a `name`.

### Mixed Controls

<DemoBlock title="Mixed controls">
  <oas-form id="form-full" style="width: 360px">
    <oas-space direction="vertical" style="width: 100%">
      <oas-input name="username" placeholder="用户名"></oas-input>
      <oas-select name="role" placeholder="选择角色" options='[{"label":"管理员","value":"admin"},{"label":"编辑","value":"editor"},{"label":"访客","value":"guest"}]'></oas-select>
      <oas-input-number name="age"></oas-input-number>
      <oas-textarea name="bio" rows="3" placeholder="个人简介（选填）"></oas-textarea>
      <oas-button type="primary" onclick="this.closest('oas-form').shadowRoot.querySelector('form').requestSubmit()">提交</oas-button>
    </oas-space>
  </oas-form>
</DemoBlock>

## Validation

The validation area demonstrates `rules`-declared validation rules and failure feedback.

> Validation rules: `{ required, message, minLength, maxLength, pattern }`. On failure, the field is marked `aria-invalid` (red-bordered input), an error message is shown in red below the field, and `oas-validate-fail` is dispatched.

### Required & Format Validation

<DemoBlock title="Required & format validation">
  <oas-form id="form-validate" rules='{"name":[{"required":true,"message":"请输入姓名"}],"email":[{"required":true,"message":"请输入邮箱"},{"pattern":"^\\S+@\\S+$","message":"邮箱格式不正确"}]}' style="width: 340px">
    <oas-space direction="vertical" style="width: 100%">
      <oas-input name="name" placeholder="姓名"></oas-input>
      <oas-input name="email" placeholder="邮箱"></oas-input>
      <oas-button type="primary" onclick="this.closest('oas-form').shadowRoot.querySelector('form').requestSubmit()">提交</oas-button>
    </oas-space>
  </oas-form>
</DemoBlock>

### Length Validation

<DemoBlock title="minLength validation">
  <oas-form id="form-length" rules='{"username":[{"required":true,"message":"请输入用户名"},{"minLength":3,"message":"至少 3 个字符"}]}' style="width: 340px">
    <oas-space direction="vertical" style="width: 100%">
      <oas-input name="username" placeholder="用户名（至少 3 个字符）"></oas-input>
      <oas-button type="primary" onclick="this.closest('oas-form').shadowRoot.querySelector('form').requestSubmit()">提交</oas-button>
    </oas-space>
  </oas-form>
</DemoBlock>

### Disabled Fields Skip Validation

<DemoBlock title="Disabled fields are not validated">
  <oas-form id="form-skip" rules='{"title":[{"required":true,"message":"请输入标题"}],"locked":[{"required":true,"message":"该字段被禁用，应跳过"}]}' style="width: 340px">
    <oas-space direction="vertical" style="width: 100%">
      <oas-input name="title" placeholder="标题"></oas-input>
      <oas-input name="locked" disabled value="禁止修改"></oas-input>
      <oas-button type="primary" onclick="this.closest('oas-form').shadowRoot.querySelector('form').requestSubmit()">提交</oas-button>
    </oas-space>
  </oas-form>
</DemoBlock>

### Submit & Validation-fail Events

<DemoBlock title="submit / validate-fail">
  <oas-form id="form-event" rules='{"nick":[{"required":true,"message":"请输入昵称"}]}' style="width: 340px">
    <oas-space direction="vertical" style="width: 100%">
      <oas-input name="nick" placeholder="昵称"></oas-input>
      <oas-button type="primary" onclick="this.closest('oas-form').shadowRoot.querySelector('form').requestSubmit()">提交</oas-button>
    </oas-space>
  </oas-form>
  <span id="form-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 220px"></span>
</DemoBlock>

Controlled syncing and event listeners (wired in one `<script>` block):

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  // 受控同步：把文本类字段的输入写回 value 属性
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

  // 功能展示：基础用法收集结果
  const basicOut = document.getElementById('form-basic-output')
  document.getElementById('form-basic')?.addEventListener('oas-submit', (e) => {
    basicOut.textContent = `oas-submit: ${JSON.stringify(e.detail.values)}`
  })

  // 校验区：事件演示
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
