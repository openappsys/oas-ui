# Form 表单

原生 `<form>` 增强，支持按 `rules` 规则对内部字段做校验与提交。

> 数据源是各字段的 `value` 属性（受控模式）。表单校验的字段范围为带 `name` 的 `oas-input` / `oas-textarea` / `oas-select` / `oas-auto-complete` / `oas-cascader` / `oas-tree-select` / `oas-input-number` / `oas-checkbox` / `oas-radio`（组容器不参与）。`oas-input` / `oas-textarea` / `oas-input-number` 输入时**不会自动写回 `value` 属性**，需在脚本中监听 `oas-input` / `oas-change` 事件同步；`oas-select` / `oas-cascader` / `oas-tree-select` 选中时自带回写。

## 功能展示

功能展示区只演示表单的字段收集与提交，不配置校验规则。

### 基础用法

<DemoBlock title="收集与提交">
  <oas-form id="form-basic" style="width: 340px">
    <oas-space direction="vertical" style="width: 100%">
      <oas-input name="name" placeholder="姓名"></oas-input>
      <oas-input name="email" placeholder="邮箱"></oas-input>
      <oas-button type="primary" onclick="this.closest('oas-form').shadowRoot.querySelector('form').requestSubmit()">提交</oas-button>
    </oas-space>
  </oas-form>
  <span id="form-basic-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 220px"></span>
</DemoBlock>

不配置 `rules` 时提交不做任何校验，直接派发 `oas-submit`，`detail.values` 携带所有带 `name` 字段的收集结果。

### 多种控件组合

<DemoBlock title="多种控件组合">
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

## 表单校验

校验区演示 `rules` 声明的校验规则与失败反馈。

> 校验规则：`{ required, message, minLength, maxLength, pattern }`。校验失败时字段被标记 `aria-invalid`（输入框红边），字段下方显示红字错误提示，并派发 `oas-validate-fail`。

### 必填与格式校验

<DemoBlock title="必填与格式校验">
  <oas-form id="form-validate" rules='{"name":[{"required":true,"message":"请输入姓名"}],"email":[{"required":true,"message":"请输入邮箱"},{"pattern":"^\\S+@\\S+$","message":"邮箱格式不正确"}]}' style="width: 340px">
    <oas-space direction="vertical" style="width: 100%">
      <oas-input name="name" placeholder="姓名"></oas-input>
      <oas-input name="email" placeholder="邮箱"></oas-input>
      <oas-button type="primary" onclick="this.closest('oas-form').shadowRoot.querySelector('form').requestSubmit()">提交</oas-button>
    </oas-space>
  </oas-form>
</DemoBlock>

### 长度校验

<DemoBlock title="minLength 校验">
  <oas-form id="form-length" rules='{"username":[{"required":true,"message":"请输入用户名"},{"minLength":3,"message":"至少 3 个字符"}]}' style="width: 340px">
    <oas-space direction="vertical" style="width: 100%">
      <oas-input name="username" placeholder="用户名（至少 3 个字符）"></oas-input>
      <oas-button type="primary" onclick="this.closest('oas-form').shadowRoot.querySelector('form').requestSubmit()">提交</oas-button>
    </oas-space>
  </oas-form>
</DemoBlock>

### 禁用字段跳过校验

<DemoBlock title="禁用字段不参与校验">
  <oas-form id="form-skip" rules='{"title":[{"required":true,"message":"请输入标题"}],"locked":[{"required":true,"message":"该字段被禁用，应跳过"}]}' style="width: 340px">
    <oas-space direction="vertical" style="width: 100%">
      <oas-input name="title" placeholder="标题"></oas-input>
      <oas-input name="locked" disabled value="禁止修改"></oas-input>
      <oas-button type="primary" onclick="this.closest('oas-form').shadowRoot.querySelector('form').requestSubmit()">提交</oas-button>
    </oas-space>
  </oas-form>
</DemoBlock>

### 提交与校验失败事件

<DemoBlock title="submit / validate-fail">
  <oas-form id="form-event" rules='{"nick":[{"required":true,"message":"请输入昵称"}]}' style="width: 340px">
    <oas-space direction="vertical" style="width: 100%">
      <oas-input name="nick" placeholder="昵称"></oas-input>
      <oas-button type="primary" onclick="this.closest('oas-form').shadowRoot.querySelector('form').requestSubmit()">提交</oas-button>
    </oas-space>
  </oas-form>
  <span id="form-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 220px"></span>
</DemoBlock>

## 栅格表单布局

> `layout="grid"` 时 form 元素变为 24 列栅格，`oas-form-item` 按 `span` 占列（默认 24 即整行）；`gap` 控制栅格间距，`label-align` 控制标签位置（`left` / `right` / `top`，默认 `top`），`label-width` 设置 left/right 时标签列宽。校验失败的错误提示会收编进 `oas-form-item` 的错误位（`role="alert"`）。

### 两列栅格 + 校验

<DemoBlock title="两列栅格布局">
  <oas-form id="form-grid" layout="grid" gap="var(--oas-space-4)" style="width: 100%; max-width: 720px" rules='{"name":[{"required":true,"message":"请输入姓名"}],"email":[{"required":true,"message":"请输入邮箱"},{"pattern":"^\\S+@\\S+$","message":"邮箱格式不正确"}]}'>
    <oas-form-item label="姓名" span="12" required>
      <oas-input name="name" placeholder="请输入姓名"></oas-input>
    </oas-form-item>
    <oas-form-item label="邮箱" span="12" required>
      <oas-input name="email" placeholder="请输入邮箱"></oas-input>
    </oas-form-item>
    <oas-form-item label="个人简介" span="24">
      <oas-textarea name="bio" rows="3" placeholder="个人简介（选填）"></oas-textarea>
    </oas-form-item>
    <oas-form-item span="24">
      <oas-button type="primary" onclick="this.closest('oas-form').shadowRoot.querySelector('form').requestSubmit()">提交</oas-button>
      <span id="form-grid-output" style="margin-left: var(--oas-space-3); color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
    </oas-form-item>
  </oas-form>
</DemoBlock>

### label-align 与 label-width

<DemoBlock title="label-align 切换">
  <oas-form id="form-align" layout="grid" label-align="left" label-width="96px" gap="var(--oas-space-4)" style="width: 100%; max-width: 720px" rules='{"username":[{"required":true,"message":"请输入用户名"}],"phone":[{"required":true,"message":"请输入手机号"},{"pattern":"^1\\d{10}$","message":"手机号格式不正确"}]}'>
    <oas-form-item label="用户名" span="12" required>
      <oas-input name="username" placeholder="请输入用户名"></oas-input>
    </oas-form-item>
    <oas-form-item label="手机号" span="12" required>
      <oas-input name="phone" placeholder="请输入手机号"></oas-input>
    </oas-form-item>
  </oas-form>
  <div style="display: flex; align-items: center; gap: var(--oas-space-3); margin-top: var(--oas-space-4)">
    <oas-segmented id="form-align-switch" value="left" options='[{"label":"左对齐","value":"left"},{"label":"顶部","value":"top"},{"label":"右对齐","value":"right"}]'></oas-segmented>
    <span id="form-align-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
  </div>
</DemoBlock>

受控同步与事件监听（一个 `<script>` 块统一挂接）：

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  // 受控同步：把文本类字段的输入写回 value 属性
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

  // 栅格表单：提交结果回显（校验失败的错误文本已收编进 form-item 错误位）
  const gridOut = document.getElementById('form-grid-output')
  document.getElementById('form-grid')?.addEventListener('oas-submit', (e) => {
    gridOut.textContent = `oas-submit: ${JSON.stringify(e.detail.values)}`
  })

  // 栅格表单：label-align 切换（可见反馈：标签位置即时变化）
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

| 属性          | 说明                                                                                | 类型              | 默认值     |
| ------------- | ----------------------------------------------------------------------------------- | ----------------- | ---------- |
| `gap`         | grid 模式栅格间距（token 值，如 `var(--oas-space-4)`）                              | `string`          | `0`        |
| `label-align` | 标签对齐：`left` / `right` / `top`（grid 模式默认 `top`）                           | `string`          | `top`      |
| `label-width` | `label-align` 为 left/right 时的标签列宽                                            | —                 | —          |
| `layout`      | 布局模式：`vertical`（默认，竖排）/ `grid`（24 列栅格）；非枚举值回退 `vertical`    | `string`          | `vertical` |
| `rules`       | 校验规则 JSON：`{ 字段名: [{ required, message, minLength, maxLength, pattern }] }` | `Rules \| string` | `{}`       |

| 事件                | 说明                                   |
| ------------------- | -------------------------------------- |
| `oas-submit`        | 校验通过，`detail: { values }`         |
| `oas-validate-fail` | 校验失败，`detail: { errors, values }` |

| 名称 | 说明 |
| ---- | ---- |
| 默认 | —    |

### oas-form-item

| 属性       | 说明                                                             | 类型      | 默认值 |
| ---------- | ---------------------------------------------------------------- | --------- | ------ |
| `label`    | 标签文本（缺省不渲染标签行）                                     | `string`  | —      |
| `name`     | 字段名（透传校验关联）                                           | —         | —      |
| `required` | 必填星号（仅视觉标记，校验规则仍由 form 的 `rules` 驱动）        | `boolean` | —      |
| `span`     | 24 栅格占列数（仅 form `layout="grid"` 生效；非 1-24 整数按 24） | `string`  | `24`   |

| 名称 | 说明     |
| ---- | -------- |
| 默认 | 字段控件 |

校验失败时失败字段被标记 `aria-invalid`；可通过 `form.getErrors()` 获取错误信息。被 `oas-form-item` 包裹的字段，错误文本写入 form-item 的错误位（`role="alert"`）。
