# Form 表单

原生 `<form>` 增强，支持声明式校验。

## 基础用法

<div class="demo">
  <oas-form rules='{"name":[{"required":true,"message":"请输入姓名"}],"email":[{"required":true,"message":"请输入邮箱"},{"pattern":"^\\S+@\\S+$","message":"邮箱格式不正确"}]}' style="width: 320px">
    <oas-space direction="vertical">
      <oas-input name="name" placeholder="姓名"></oas-input>
      <oas-input name="email" placeholder="邮箱"></oas-input>
      <oas-button type="primary" onclick="this.closest('oas-form').shadowRoot.querySelector('form').requestSubmit()">提交</oas-button>
    </oas-space>
  </oas-form>
</div>

## API

| 属性 | 说明 |
|---|---|
| `rules` | 校验规则 JSON：`{ 字段名: [{ required, message, minLength, maxLength, pattern }] }` |

| 事件 | 说明 |
|---|---|
| `oas-submit` | 校验通过，`detail: { values }` |
| `oas-validate-fail` | 校验失败，`detail: { errors, values }` |

校验失败时错误字段标记 `aria-invalid`，可通过 `getErrors()` 获取错误消息。
