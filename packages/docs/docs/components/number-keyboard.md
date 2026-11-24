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

## 长按连删（缺省开）

「删除」键长按 400ms 起连删：间隔 300ms 起步、每次递减 50ms、150ms 触底——触屏输错多位时不用连点（键盘类 App 的既成惯例，故缺省开启）。`pointerup` / 移出按键 / 手势取消即停；长按期间删除键的 contextmenu 被阻止（长按弹菜单会打断连删），其余按键不受影响。长按与单击互不串扰：长按释放后的收尾 click 不会多删一次。宿主如需「严格单发」（逐格验证的验证码框等）加 `no-repeat-delete` 关闭；物理键盘 `Backspace` 不受影响（连删随系统按键重复自然发生）。

## 事件与键盘输入

组件内聚焦时可直接用物理键盘输入：数字（车牌布局下含字母）、`Backspace` 删除；按键本身为原生 `<button>`，Tab / Enter / Space 均可操作。

<DemoBlock title="oas-input / oas-delete / oas-done">
  <oas-number-keyboard id="nk-event" maxlength="8"></oas-number-keyboard>
  <p id="nk-event-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: var(--oas-space-1) 0 0">等待输入…</p>
</DemoBlock>

## 附加键 extra-key

`extra-key` 在数字区底行 0 键右侧挂附加键（栅格第 3 列，紧邻第 4 列的删除/完成功能键；身份证 X 键之类）：单个字符或 JSON 字符串数组（最多 2 个，超出截断并告警）；0 键自动收窄让位。附加字符同样并入物理键盘白名单（屏上有键，物理键盘就能打）：

<DemoBlock title="身份证 X 键">
  <oas-number-keyboard id="nk-extra" extra-key="X" maxlength="18"></oas-number-keyboard>
  <p id="nk-extra-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: var(--oas-space-1) 0 0">点 X 或数字键查看 value。</p>
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

  // 附加键（身份证 X）
  const extra = document.getElementById('nk-extra')
  const extraOut = document.getElementById('nk-extra-out')
  const showExtra = (detail) => log(extraOut, `value：${detail.value || '（空）'}`)
  extra?.addEventListener('oas-input', (e) => showExtra(e.detail))
  extra?.addEventListener('oas-delete', (e) => showExtra(e.detail))

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
| `extra-key` | 附加键（挂数字区右侧，如身份证 X 键）——单个字符或 JSON 字符串数组（最多 2 个，超出截断并 devWarn 一次）；0 键自动收窄让位；附加字符并入物理键盘白名单 | — | — |
| `layout` | 键盘布局：`number`（默认）/ `plate`（车牌号：省份简称 + 字母 + 数字） | `string` | `number` |
| `maxlength` | 长度上限（按字符计数，支持中文省份简称）；缺省 0 = 不限 | `string` | `0` |
| `no-repeat-delete` | 关闭删除键长按连删（缺省开：按住 400ms 起连删，间隔 300ms 递减至 150ms；pointerup/移出/取消停止）——严格单发场景（逐格验证的验证码框）关闭；物理键盘 Backspace 不受影响 | `boolean` | — |
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
