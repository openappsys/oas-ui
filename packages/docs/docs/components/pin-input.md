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

## 输入类型

<DemoBlock title="type（text / number）">
  <oas-pin-input type="text" length="4" value="ab12"></oas-pin-input>
  <oas-pin-input type="number" length="4" value="1024"></oas-pin-input>
</DemoBlock>

`type` 透传原生 input 类型：`text`（默认）允许任意字符；`number` 限制为数字输入（移动端弹出数字键盘）；设 `mask` 时强制为 `password` 遮罩（见上）。

## 校验失败态

`aria-invalid` 已列入 observedAttributes：外部动态 `setAttribute('aria-invalid', 'true'/'false')` 即时切换——所有格子与容器同步该状态并标 danger 色边框，读屏播报「无效」。通常由宿主在 `oas-complete` 后校验置位（如验证码错误/过期）；移除该属性即恢复默认态。

<DemoBlock title="aria-invalid 动态切换">
  <oas-space size="small">
    <oas-button size="small" type="danger" onclick="pinInvalid('true')">标记校验失败</oas-button>
    <oas-button size="small" onclick="pinInvalid('false')">恢复正常</oas-button>
  </oas-space>
  <oas-pin-input id="pin-invalid" length="4" value="123"></oas-pin-input>
</DemoBlock>

<DemoBlock title="aria-invalid 静态示例">
  <oas-pin-input length="4" value="123" aria-invalid="true"></oas-pin-input>
  <oas-pin-input length="4" value="456"></oas-pin-input>
</DemoBlock>

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
  window.pinInvalid = (invalid) => {
    const el = document.getElementById('pin-invalid')
    if (invalid === 'true') el?.setAttribute('aria-invalid', 'true')
    else el?.setAttribute('aria-invalid', 'false')
  }

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
| `aria-invalid` | 校验失败态（同步到容器与各格，标 danger） | 无 |

键盘：`←`/`→` 格间移动，`Backspace` 删除当前格并回退，支持粘贴自动分发；全空时每格均可聚焦（原生 caret）。

| 事件          | 说明                                |
| ------------- | ----------------------------------- |
| `oas-input`   | 每格输入，`detail: { value, index }` |
| `oas-change`  | 填满时派发，`detail: { value }`      |
| `oas-complete`| 填满时派发，`detail: { value }`      |

ARIA：容器 `role="group"` + `aria-label`，每格 `aria-label="第 n 位"`，`aria-invalid` 同步到容器与各格。
