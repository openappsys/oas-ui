---
description: 数字键盘：随机乱序安全键盘、完成/删除键、车牌号布局（省份简称 + 字母 + 数字），组件内支持物理键盘输入；事件驱动，值由宿主持有。
---

# NumberKeyboard 数字键盘

移动端数字输入辅助件：验证码、金额、车牌号等只需要数字与少量字母的场景。组件不内置输入框，按键结果通过 `value` 属性与 `oas-input` / `oas-delete` / `oas-done` 事件交给宿主，由宿主写入目标控件。

## 基础用法

点击数字键逐位输入，`value` 同步写回宿主属性；「删除」退格、「完成」派发 `oas-done`。

<DemoBlock title="默认数字键盘（maxlength=6）">
  <oas-number-keyboard id="nk-basic" maxlength="6"></oas-number-keyboard>
  <p id="nk-basic-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: var(--oas-space-1) 0 0">value：（空）</p>
</DemoBlock>

<DemoBlock title="接入输入框：事件写回目标控件">
  <oas-input id="nk-target" readonly placeholder="点击下方键盘输入"></oas-input>
  <oas-number-keyboard id="nk-wired" maxlength="6"></oas-number-keyboard>
</DemoBlock>

## 随机乱序（random）

`random` 打开后数字键顺序随机（安全键盘场景），`randomize()` 可程序化重新洗牌（如每次聚焦时刷新）。

<DemoBlock title="random + 重新洗牌">
  <oas-number-keyboard id="nk-random" random maxlength="6"></oas-number-keyboard>
  <oas-button id="nk-shuffle" size="small">重新洗牌</oas-button>
</DemoBlock>

## 车牌号布局（layout=plate）

`layout="plate"` 切换为车牌键盘：省份简称（点「省份」键展开省份面板）+ 字母（A–Z，不含 I / O）+ 数字。

<DemoBlock title="plate（车牌号）">
  <oas-number-keyboard id="nk-plate" layout="plate" maxlength="8"></oas-number-keyboard>
  <p id="nk-plate-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: var(--oas-space-1) 0 0">value：（空）</p>
</DemoBlock>

## 禁用与只读

<DemoBlock title="disabled / readonly">
  <oas-number-keyboard disabled value="123"></oas-number-keyboard>
  <oas-number-keyboard readonly value="456"></oas-number-keyboard>
</DemoBlock>

- `disabled`：按键全部禁用，不派发任何事件
- `readonly`：按键仍可聚焦（可读屏浏览），但不改动值；`oas-done` 仍可派发（只读不等于不能提交）

## 事件与键盘输入

组件内聚焦时可直接用物理键盘输入：数字（车牌布局下含字母）、`Backspace` 删除；按键本身为原生 `<button>`，Tab / Enter / Space 均可操作。

<DemoBlock title="oas-input / oas-delete / oas-done">
  <oas-number-keyboard id="nk-event" maxlength="8"></oas-number-keyboard>
  <p id="nk-event-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: var(--oas-space-1) 0 0">等待输入…</p>
</DemoBlock>

| 事件 | 时机 | detail |
| --- | --- | --- |
| `oas-input` | 追加一个字符 | `{ value, key }` |
| `oas-delete` | 删除末位（值为空不派发） | `{ value }` |
| `oas-done` | 点击完成键 | `{ value }` |

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const log = (out, text) => {
    if (out) out.textContent = text
  }

  // 基础用法
  const basic = document.getElementById('nk-basic')
  const basicOut = document.getElementById('nk-basic-out')
  const showBasic = (detail) => log(basicOut, `value：${detail.value || '（空）'}`)
  basic?.addEventListener('oas-input', (e) => showBasic(e.detail))
  basic?.addEventListener('oas-delete', (e) => showBasic(e.detail))

  // 事件写回输入框
  const wired = document.getElementById('nk-wired')
  const target = document.getElementById('nk-target')
  wired?.addEventListener('oas-input', (e) => target?.setAttribute('value', e.detail.value))
  wired?.addEventListener('oas-delete', (e) => target?.setAttribute('value', e.detail.value))

  // 随机洗牌
  const random = document.getElementById('nk-random')
  document.getElementById('nk-shuffle')?.addEventListener('click', () => random?.randomize())

  // 车牌
  const plate = document.getElementById('nk-plate')
  const plateOut = document.getElementById('nk-plate-out')
  const showPlate = (detail) => log(plateOut, `value：${detail.value || '（空）'}`)
  plate?.addEventListener('oas-input', (e) => showPlate(e.detail))
  plate?.addEventListener('oas-delete', (e) => showPlate(e.detail))

  // 事件演示
  const ev = document.getElementById('nk-event')
  const evOut = document.getElementById('nk-event-out')
  ev?.addEventListener('oas-input', (e) => log(evOut, `oas-input：${e.detail.value}（按键 ${e.detail.key}）`))
  ev?.addEventListener('oas-delete', (e) => log(evOut, `oas-delete：${e.detail.value || '（空）'}`))
  ev?.addEventListener('oas-done', (e) => log(evOut, `oas-done：${e.detail.value || '（空）'}`))
})
</script>

## API

### oas-number-keyboard

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `disabled` | 禁用：按键全部禁用且不派发事件 | `boolean` | — |
| `layout` | 键盘布局：`number`（默认）/ `plate`（车牌号：省份简称 + 字母 + 数字） | `string` | `number` |
| `maxlength` | 长度上限（按字符计数，支持中文省份简称）；缺省 0 = 不限 | `string` | `0` |
| `random` | 数字键随机乱序（安全键盘）；切换时重新排列 | `boolean` | — |
| `readonly` | 只读：按键可聚焦但不改动值，`oas-done` 仍可派发 | `boolean` | — |
| `value` | 当前值（受控）：按键写回本属性，宿主改写即时同步 | — | — |

#### 方法

| 方法 | 签名 | 说明 |
| --- | --- | --- |
| `randomize` | `randomize(): void` | 重新洗牌数字键顺序（安全键盘刷新） |

#### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-delete` | 删除末位（值为空时不派发），`detail: { value }` |
| `oas-done` | 点击完成键，`detail: { value }` |
| `oas-input` | 追加一个字符，`detail: { value, key }` |
