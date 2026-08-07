# Form 表单

原生 `<form>` 增强，支持按 `rules` 规则对内部字段做校验与提交。

> 数据源是各字段的 `value` 属性（受控模式）。表单校验的字段范围为带 `name` 的 `oas-input` / `oas-textarea` / `oas-select` / `oas-auto-complete` / `oas-cascader` / `oas-tree-select` / `oas-input-number` / `oas-checkbox` / `oas-radio`（组容器不参与）。`oas-input` / `oas-textarea` / `oas-input-number` 输入时**不会自动写回 `value` 属性**，需在脚本中监听 `oas-input` / `oas-change` 事件同步；`oas-select` / `oas-cascader` / `oas-tree-select` 选中时自带回写。

## 基础用法

<DemoBlock title="必填与格式校验">
  <oas-form id="form-basic" rules='{"name":[{"required":true,"message":"请输入姓名"}],"email":[{"required":true,"message":"请输入邮箱"},{"pattern":"^\\S+@\\S+$","message":"邮箱格式不正确"}]}' style="width: 340px">
    <oas-space direction="vertical" style="width: 100%">
      <oas-input name="name" placeholder="姓名"></oas-input>
      <oas-input name="email" placeholder="邮箱"></oas-input>
      <oas-button type="primary" onclick="this.closest('oas-form').shadowRoot.querySelector('form').requestSubmit()">提交</oas-button>
    </oas-space>
  </oas-form>
</DemoBlock>

## 多种控件组合

<DemoBlock title="组合表单">
  <oas-form id="form-full" rules='{"username":[{"required":true,"message":"请输入用户名"},{"minLength":3,"message":"至少 3 个字符"}],"role":[{"required":true,"message":"请选择角色"}],"age":[{"required":true,"message":"请输入年龄"}]}' style="width: 360px">
    <oas-space direction="vertical" style="width: 100%">
      <oas-input name="username" placeholder="用户名（至少 3 个字符）"></oas-input>
      <oas-select name="role" placeholder="选择角色" options='[{"label":"管理员","value":"admin"},{"label":"编辑","value":"editor"},{"label":"访客","value":"guest"}]'></oas-select>
      <oas-input-number name="age"></oas-input-number>
      <oas-textarea name="bio" rows="3" placeholder="个人简介（选填）"></oas-textarea>
      <oas-button type="primary" onclick="this.closest('oas-form').shadowRoot.querySelector('form').requestSubmit()">提交</oas-button>
    </oas-space>
  </oas-form>
</DemoBlock>

> 校验规则：`{ required, message, minLength, maxLength, pattern }`。校验失败时字段被标记 `aria-invalid`，且派发 `oas-validate-fail`。

## 禁用字段跳过校验

<DemoBlock title="禁用字段不参与校验">
  <oas-form id="form-skip" rules='{"title":[{"required":true,"message":"请输入标题"}],"locked":[{"required":true,"message":"该字段被禁用，应跳过"}]}' style="width: 340px">
    <oas-space direction="vertical" style="width: 100%">
      <oas-input name="title" placeholder="标题"></oas-input>
      <oas-input name="locked" disabled value="禁止修改"></oas-input>
      <oas-button type="primary" onclick="this.closest('oas-form').shadowRoot.querySelector('form').requestSubmit()">提交</oas-button>
    </oas-space>
  </oas-form>
</DemoBlock>

## 提交与校验失败事件

<DemoBlock title="submit / validate-fail">
  <oas-form id="form-event" rules='{"nick":[{"required":true,"message":"请输入昵称"}]}' style="width: 340px">
    <oas-space direction="vertical" style="width: 100%">
      <oas-input name="nick" placeholder="昵称"></oas-input>
      <oas-button type="primary" onclick="this.closest('oas-form').shadowRoot.querySelector('form').requestSubmit()">提交</oas-button>
    </oas-space>
  </oas-form>
  <span id="form-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 220px"></span>
</DemoBlock>

受控同步与事件监听（一个 `<script>` 块统一挂接）：

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  // 受控同步：把文本类字段的输入写回 value 属性
  for (const id of ['form-basic', 'form-full', 'form-skip', 'form-event']) {
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

| 属性 | 说明 |
|---|---|
| `rules` | 校验规则 JSON：`{ 字段名: [{ required, message, minLength, maxLength, pattern }] }` |

| 事件 | 说明 |
|---|---|
| `oas-submit` | 校验通过，`detail: { values }` |
| `oas-validate-fail` | 校验失败，`detail: { errors, values }` |

校验失败时失败字段被标记 `aria-invalid`；可通过 `form.getErrors()` 获取错误信息。
