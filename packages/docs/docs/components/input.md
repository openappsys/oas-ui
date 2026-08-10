# Input 输入框

原生 `<input>` 增强的基础输入组件。

## 基础用法

<DemoBlock title="基础用法">
  <oas-input placeholder="请输入内容" style="width: 240px"></oas-input>
</DemoBlock>

## 无障碍名称（label）

<DemoBlock title="label（可访问名称）">
  <oas-input id="input-label-set" label="登录邮箱" placeholder="name@example.com" style="width: 240px"></oas-input>
  <oas-input id="input-label" placeholder="无 label，回退占位文本" style="width: 240px"></oas-input>
  <span id="input-label-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 260px"></span>
</DemoBlock>

`label` 作为输入框的可访问名称（`aria-label`）来源，读屏朗读该名称。未设置 `label` 时依次回退 `placeholder` → 内置文案「输入框」；设置后（如「登录邮箱」）覆盖回退链。

## 类型

<DemoBlock title="type">
  <oas-input type="password" placeholder="密码" style="width: 240px"></oas-input>
  <oas-input type="number" placeholder="数字" style="width: 240px"></oas-input>
  <oas-input type="email" placeholder="邮箱" style="width: 240px"></oas-input>
</DemoBlock>

`type` 透传原生 input 类型，支持 `text` / `password` / `number` / `email` 等。

## 密码可见切换

<DemoBlock title="show-password">
  <oas-input type="password" show-password placeholder="密码" value="oasis123" style="width: 240px"></oas-input>
</DemoBlock>

`show-password` 在 `type="password"` 时于输入框右侧渲染眼睛按钮，点击在明文/密文间切换；按钮带 `aria-label`（locale 文案）与 `aria-pressed`，聚焦时有焦点环。

## 可清空

<DemoBlock title="可清空（clearable）">
  <oas-input clearable value="有内容时可一键清空" style="width: 240px"></oas-input>
</DemoBlock>

存在内容且设置 `clearable` 时显示清除按钮，点击后清空并聚焦，派发 `oas-clear`。

## 禁用与只读

<DemoBlock title="disabled / readonly">
  <oas-input disabled placeholder="禁用" style="width: 240px"></oas-input>
  <oas-input readonly value="只读内容" style="width: 240px"></oas-input>
</DemoBlock>

## 前后缀（addon）

<DemoBlock title="addon-before / addon-after">
  <oas-input addon-before="http://" placeholder="域名" style="width: 240px"></oas-input>
  <oas-input addon-after="元" placeholder="金额" style="width: 240px"></oas-input>
  <oas-input addon-before="¥" addon-after="/人" placeholder="单价" style="width: 240px"></oas-input>
</DemoBlock>

`addon-before` / `addon-after` 为输入框外侧的 addon 文案块（如单位、域名），分别走独立的 `::part(prepend)` / `::part(append)`，禁用时 addon 灰化。

## 图标

<DemoBlock title="prefix-icon / suffix-icon">
  <oas-input prefix-icon="search" placeholder="搜索" style="width: 240px"></oas-input>
  <oas-input suffix-icon="eye" placeholder="密码" type="password" style="width: 240px"></oas-input>
</DemoBlock>

`prefix-icon` / `suffix-icon` 接受图标名（`@oas-ui/icons` 的 iconRegistry），内联渲染 SVG 装饰图标。

## 内嵌前后缀与清空并存

<DemoBlock title="prefix / suffix + clearable">
  <oas-input prefix="$" suffix=".00" clearable value="1280" style="width: 240px"></oas-input>
  <oas-input suffix-icon="chevron-down" clearable value="可清空带图标" style="width: 240px"></oas-input>
</DemoBlock>

`prefix` / `suffix` 为输入框内部文案，与 `clearable`、图标、addon 可并存不冲突。

## 字数统计

<DemoBlock title="show-count + maxlength">
  <oas-input show-count maxlength="10" placeholder="最多输入 10 个字" style="width: 240px"></oas-input>
  <oas-input show-count value="无长度限制" style="width: 240px"></oas-input>
</DemoBlock>

`show-count` 在输入框右下角显示字数统计：设置 `maxlength` 时显示 `当前长度/maxlength`，未设置时仅显示当前长度；`maxlength` 同时透传原生 input 限制输入长度。超过限制时计数数字变 danger 色。

## 回车提交事件

<DemoBlock title="oas-enter">
  <oas-input id="input-enter" placeholder="输入后按回车" style="width: 240px"></oas-input>
  <span id="enter-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 160px"></span>
</DemoBlock>

输入时按 Enter（非输入法组合上屏）派发 `oas-enter`，`detail: { value }`。

## 事件

<DemoBlock title="输入与清除事件">
  <oas-input id="input-event" clearable placeholder="输入或点击清除" style="width: 240px"></oas-input>
  <span id="input-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 160px"></span>
</DemoBlock>

监听 `oas-input`（输入中）与 `oas-clear`（清除）：

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const el = document.getElementById('input-event')
  const out = document.getElementById('input-output')
  el?.addEventListener('oas-input', (e) => {
    out.textContent = `oas-input: ${e.detail.value}`
  })
  el?.addEventListener('oas-clear', () => {
    out.textContent = 'oas-clear'
  })
  const enter = document.getElementById('input-enter')
  const enterOut = document.getElementById('enter-output')
  enter?.addEventListener('oas-enter', (e) => {
    enterOut.textContent = `oas-enter: ${e.detail.value}`
  })

  // label（可访问名称）demo：等组件升级后读取内层 input 的 aria-label
  const labelSet = document.getElementById('input-label-set')
  const labelFallback = document.getElementById('input-label')
  const labelOut = document.getElementById('input-label-output')
  const readLabel = () => {
    const a = labelSet?.shadowRoot?.querySelector('input')?.getAttribute('aria-label')
    const b = labelFallback?.shadowRoot?.querySelector('input')?.getAttribute('aria-label')
    if (a !== undefined && b !== undefined) {
      labelOut.textContent = `aria-label：设置「${a}」 / 回退「${b}」`
    } else {
      setTimeout(readLabel, 60)
    }
  }
  readLabel()
})
</script>

## API

| 属性          | 说明            | 默认值  |
| ------------- | --------------- | ------- |
| `value`       | 值（受控）      | 无      |
| `placeholder` | 占位提示        | 无      |
| `label`       | 可访问名称（`aria-label` 来源，未设时回退 `placeholder` → 内置文案「输入框」） | 无 |
| `type`        | 原生 input 类型 | `text`  |
| `clearable`   | 可清空          | `false` |
| `disabled`    | 禁用            | `false` |
| `readonly`    | 只读            | `false` |
| `addon-before` | 前置 addon 文案块 | 无    |
| `addon-after`  | 后置 addon 文案块 | 无    |
| `prefix`      | 内嵌前置文案    | 无      |
| `suffix`      | 内嵌后置文案    | 无      |
| `prefix-icon` | 前置图标名      | 无      |
| `suffix-icon` | 后置图标名      | 无      |
| `show-password` | 密码可见切换（`type="password"` 时渲染眼睛按钮） | `false` |
| `maxlength`   | 最大输入长度（透传原生 maxlength） | 无      |
| `show-count`  | 显示字数统计（右下角，超限标 danger） | `false` |

| 事件        | 说明                                  |
| ----------- | ------------------------------------- |
| `oas-input` | 输入中，`detail: { value }`           |
| `oas-clear` | 点击清除，`detail: { originalEvent }` |
| `oas-enter` | 按 Enter（非输入法组合），`detail: { value }` |
