# Input

An enhanced base input built on the native `<input>` element.

## Basic Usage

<DemoBlock title="Basic usage">
  <oas-input placeholder="请输入内容" style="width: 240px"></oas-input>
</DemoBlock>

## Accessible Name (label)

<DemoBlock title="label (accessible name)">
  <oas-input id="input-label-set" label="登录邮箱" placeholder="name@example.com" style="width: 240px"></oas-input>
  <oas-input id="input-label" placeholder="无 label，回退占位文本" style="width: 240px"></oas-input>
  <span id="input-label-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 260px"></span>
</DemoBlock>

`label` serves as the accessible name (`aria-label`) source for the input, announced by screen readers. When `label` is not set, it falls back to `placeholder` → built-in text "输入框"; once set (e.g. "登录邮箱"), it overrides the fallback chain.

## Types

<DemoBlock title="type">
  <oas-input type="password" placeholder="密码" style="width: 240px"></oas-input>
  <oas-input type="number" placeholder="数字" style="width: 240px"></oas-input>
  <oas-input type="email" placeholder="邮箱" style="width: 240px"></oas-input>
</DemoBlock>

`type` is passed through to the native input type, supporting `text` / `password` / `number` / `email`, etc.

## Password Visibility Toggle

<DemoBlock title="show-password">
  <oas-input type="password" show-password placeholder="密码" value="oasis123" style="width: 240px"></oas-input>
</DemoBlock>

With `show-password` and `type="password"`, an eye button is rendered on the right side of the input; clicking toggles between plaintext and masked text. The button has an `aria-label` (locale text), `aria-pressed`, and a focus ring when focused.

## Clearable

<DemoBlock title="clearable">
  <oas-input clearable value="有内容时可一键清空" style="width: 240px"></oas-input>
</DemoBlock>

When there is content and `clearable` is set, a clear button is shown; clicking clears the value, refocuses, and dispatches `oas-clear`.

## Disabled & Readonly

<DemoBlock title="disabled / readonly">
  <oas-input disabled placeholder="禁用" style="width: 240px"></oas-input>
  <oas-input readonly value="只读内容" style="width: 240px"></oas-input>
</DemoBlock>

## Addons

<DemoBlock title="addon-before / addon-after">
  <oas-input addon-before="http://" placeholder="域名" style="width: 240px"></oas-input>
  <oas-input addon-after="元" placeholder="金额" style="width: 240px"></oas-input>
  <oas-input addon-before="¥" addon-after="/人" placeholder="单价" style="width: 240px"></oas-input>
</DemoBlock>

`addon-before` / `addon-after` render external addon text blocks (e.g. units, domains) outside the input, going through dedicated `::part(prepend)` / `::part(append)` parts; addons are greyed out when disabled.

## Icons

<DemoBlock title="prefix-icon / suffix-icon">
  <oas-input prefix-icon="search" placeholder="搜索" style="width: 240px"></oas-input>
  <oas-input suffix-icon="eye" placeholder="密码" type="password" style="width: 240px"></oas-input>
</DemoBlock>

`prefix-icon` / `suffix-icon` accept icon names (from `@oas-ui/icons` iconRegistry) and inline-render decorative SVG icons.

## Inline Affixes & Clear Together

<DemoBlock title="prefix / suffix + clearable">
  <oas-input prefix="$" suffix=".00" clearable value="1280" style="width: 240px"></oas-input>
  <oas-input suffix-icon="chevron-down" clearable value="可清空带图标" style="width: 240px"></oas-input>
</DemoBlock>

`prefix` / `suffix` are inline text inside the input and can coexist with `clearable`, icons, and addons without conflicts.

## Character Count

<DemoBlock title="show-count + maxlength">
  <oas-input show-count maxlength="10" placeholder="最多输入 10 个字" style="width: 240px"></oas-input>
  <oas-input show-count value="无长度限制" style="width: 240px"></oas-input>
</DemoBlock>

`show-count` displays a character counter at the bottom-right of the input: with `maxlength` it shows `current/maxlength`, without it just the current length; `maxlength` is also passed through to the native input to limit input length. When the limit is exceeded, the counter number turns danger-colored.

## Enter Submit Event

<DemoBlock title="oas-enter">
  <oas-input id="input-enter" placeholder="输入后按回车" style="width: 240px"></oas-input>
  <span id="enter-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 160px"></span>
</DemoBlock>

Pressing Enter while typing (not an IME composition commit) dispatches `oas-enter` with `detail: { value }`.

## Events

<DemoBlock title="Input and clear events">
  <oas-input id="input-event" clearable placeholder="输入或点击清除" style="width: 240px"></oas-input>
  <span id="input-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 160px"></span>
</DemoBlock>

Listen to `oas-input` (while typing) and `oas-clear` (on clear):

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

| Property      | Description                        | Default |
| ------------- | ---------------------------------- | ------- |
| `value`       | Value (controlled)                 | —       |
| `placeholder` | Placeholder text                   | —       |
| `label`       | Accessible name (`aria-label` source; falls back to `placeholder` → built-in "输入框" when unset) | — |
| `type`        | Native input type                  | `text`  |
| `clearable`   | Clearable                          | `false` |
| `disabled`    | Disabled                           | `false` |
| `readonly`    | Readonly                           | `false` |
| `addon-before`| Addon text block before the input  | —       |
| `addon-after` | Addon text block after the input   | —       |
| `prefix`      | Inline text before the input value | —       |
| `suffix`      | Inline text after the input value  | —       |
| `prefix-icon` | Icon name for the leading icon     | —       |
| `suffix-icon` | Icon name for the trailing icon    | —       |
| `show-password` | Password visibility toggle (renders an eye button when `type="password"`) | `false` |
| `maxlength`   | Maximum input length (passed through to native maxlength) | — |
| `show-count`  | Show character count (bottom-right; danger when over limit) | `false` |

| Event        | Description                              |
| ------------ | ---------------------------------------- |
| `oas-input`  | While typing, `detail: { value }`        |
| `oas-clear`  | Cleared by click, `detail: { originalEvent }` |
| `oas-enter`  | Enter pressed (not IME composition), `detail: { value }` |
