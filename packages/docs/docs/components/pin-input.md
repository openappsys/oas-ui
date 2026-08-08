# PinInput 验证码

分格验证码输入，支持键盘方向键移动、Backspace 回退、粘贴自动分发。

## 基础用法

<DemoBlock title="默认 6 位">
  <oas-pin-input></oas-pin-input>
</DemoBlock>

## 自定义长度

<DemoBlock title="length=4">
  <oas-pin-input length="4"></oas-pin-input>
</DemoBlock>

通过 `length` 设置格子数量。

## 遮罩

<DemoBlock title="mask">
  <oas-pin-input mask value="123456"></oas-pin-input>
</DemoBlock>

`mask` 将格子切换为密码型，输入值被遮罩。

## 受控初值

<DemoBlock title="value 预填">
  <oas-pin-input value="25"></oas-pin-input>
</DemoBlock>

`value` 分发到各格；超出 `length` 的部分自动截断。

## 禁用 / 只读

<DemoBlock title="disabled">
  <oas-pin-input disabled value="123"></oas-pin-input>
</DemoBlock>

<DemoBlock title="readonly">
  <oas-pin-input readonly value="456"></oas-pin-input>
</DemoBlock>

## 事件

<DemoBlock title="输入与完成事件">
  <oas-pin-input id="pin-event" length="4"></oas-pin-input>
  <span id="pin-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 240px"></span>
</DemoBlock>

监听 `oas-input`（每格输入）、`oas-change` / `oas-complete`（填满）：

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const el = document.getElementById('pin-event')
  const out = document.getElementById('pin-output')
  el?.addEventListener('oas-input', (e) => {
    out.textContent = `oas-input: ${e.detail.value}`
  })
  el?.addEventListener('oas-change', (e) => {
    out.textContent = `oas-change: ${e.detail.value}`
  })
  el?.addEventListener('oas-complete', (e) => {
    out.textContent = `oas-complete: ${e.detail.value}`
  })
})
</script>

## API

| 属性       | 说明               | 默认值  |
| ---------- | ------------------ | ------- |
| `length`   | 验证码位数         | `6`     |
| `value`    | 当前值（受控）     | `''`    |
| `mask`     | 星号遮罩           | `false` |
| `disabled` | 禁用               | `false` |
| `readonly` | 只读               | `false` |
| `type`     | 格子输入类型       | `text`  |

键盘：`←`/`→` 格间移动，`Backspace` 删除当前格并回退，支持粘贴自动分发；全空时每格均可聚焦（原生 caret）。

| 事件          | 说明                                |
| ------------- | ----------------------------------- |
| `oas-input`   | 每格输入，`detail: { value, index }` |
| `oas-change`  | 填满时派发，`detail: { value }`      |
| `oas-complete`| 填满时派发，`detail: { value }`      |

ARIA：容器 `role="group"` + `aria-label`，每格 `aria-label="第 n 位"`，`aria-invalid` 同步到容器与各格。
