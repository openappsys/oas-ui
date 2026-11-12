# ChipsInput 收件人输入

收件人 chips 输入：chip 与无边框输入同居一个控件盒。粘贴多地址自动拆分（分号 / 逗号 / 换行 / 空白），`Enter` / `,` / `;` 成 chip，非法邮箱 chip 红描边并派发 `oas-invalid`（不拦截提交语义，受控数据宿主裁决）。

## 基础用法

<DemoBlock title="邮箱场景">
  <oas-chips-input id="chips-basic" value='["alice@example.com","bob@example.com"]'></oas-chips-input>
</DemoBlock>

`value` 双通道：property 为字符串数组，attribute 为 JSON 序列化字符串。输入 `Enter` / `,` / `;` 把当前文本提交为 chip；`placeholder` 缺省走 i18n 文案。

## 粘贴自动拆分

<DemoBlock title="粘贴分号/逗号/换行/空白分隔的多地址批量成 chip">
  <oas-chips-input id="chips-paste" placeholder="试试粘贴：a@b.co; c@d.co, e@f.co"></oas-chips-input>
</DemoBlock>

粘贴文本含分隔符（分号 / 逗号 / 换行 / 空白）时按分隔符拆分、逐项 trim 后批量成 chip（逐项查重 / 上限 / 邮箱校验）；不含分隔符的粘贴保持原生插入。批量新增派发一次 `oas-change`（`trigger = "paste"`）。

## Backspace 回编辑

<DemoBlock title="输入为空时 Backspace 回编辑上一 chip">
  <oas-chips-input id="chips-edit" value='["typo@example.com"]'></oas-chips-input>
</DemoBlock>

输入框为空时按 `Backspace`，最后一个 chip 变为可编辑文本（自动聚焦全选）：`Enter` / 失焦提交、`Esc` 取消还原、清空提交等于删除该 chip。chip 上的 `×` 钮单独删除。

## 邮箱内联校验

<DemoBlock title="非法邮箱红描边 + oas-invalid（不拦截提交）">
  <oas-chips-input id="chips-invalid" placeholder="输入 not-an-email 回车试试"></oas-chips-input>
  <span id="chips-invalid-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

- 非法邮箱 chip 照常创建（**不拦截提交语义**——受控数据由宿主裁决），红描边（danger token）+ 悬浮 `title` 提示 + 下方 hint 文案
- 派发 `oas-invalid`（`detail: { value, index }`）；**幂等**：仅用户交互路径派发，重渲染 / 程序写 `value` 不重复派发
- 校验口径为务实邮箱正则（非 RFC 5322 全覆盖），宿主可监听 `oas-invalid` 自行裁决

## max 上限

<DemoBlock title="max=3：超出派发 oas-exceed-limit 且不再新增">
  <oas-chips-input id="chips-max" max="3" value='["a@b.co","c@d.co"]'></oas-chips-input>
  <span id="chips-max-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

达到 `max` 后的新增尝试派发 `oas-exceed-limit`（`detail: { value, max }`）并给出 hint 提示，不再新增；已有 chip 仍可删除。

## 重复值去重

重复值静默去重（不新增、无 `oas-add`），组件实例级仅触发一次 dev 告警（dev-only，生产剔除）。回编辑提交为与其他 chip 重复的值时同样静默还原。

## disabled / readonly / size

<DemoBlock title="disabled / readonly">
  <oas-chips-input disabled value='["a@b.co"]'></oas-chips-input>
  <oas-chips-input readonly value='["a@b.co"]'></oas-chips-input>
</DemoBlock>

<DemoBlock title="size 三档">
  <oas-chips-input size="small" value='["small@b.co"]'></oas-chips-input>
  <oas-chips-input value='["medium@b.co"]'></oas-chips-input>
  <oas-chips-input size="large" value='["large@b.co"]'></oas-chips-input>
</DemoBlock>

- `disabled`：输入框与删除按钮禁用，控件盒降饱和（就近读取全局禁用注入）
- `readonly`：chip 仅展示，输入框与删除按钮隐藏（与 disabled 的表单语义分立）
- `size`：`small` / `medium`（默认）/ `large`，控件盒同高走 `--oas-control-height-*` token

## 事件

<DemoBlock title="增删改事件反馈">
  <oas-chips-input id="chips-event" value='["a@b.co"]'></oas-chips-input>
  <span id="chips-event-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 240px"></span>
</DemoBlock>

`oas-change` 的 `detail: { value, trigger }`，`trigger ∈ add | remove | edit | paste`；另有 `oas-add` / `oas-remove`（`detail: { value, index }`）、`oas-invalid`、`oas-exceed-limit`、`oas-focus` / `oas-blur`：

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const invalid = document.getElementById('chips-invalid')
  const invalidOut = document.getElementById('chips-invalid-output')
  invalid?.addEventListener('oas-invalid', (e) => {
    invalidOut.textContent = `oas-invalid: ${e.detail.value}（index ${e.detail.index}）`
  })
  const max = document.getElementById('chips-max')
  const maxOut = document.getElementById('chips-max-output')
  max?.addEventListener('oas-exceed-limit', (e) => {
    maxOut.textContent = `oas-exceed-limit: ${e.detail.value}（max ${e.detail.max}）`
  })
  const el = document.getElementById('chips-event')
  const out = document.getElementById('chips-event-output')
  el?.addEventListener('oas-add', (e) => { out.textContent = `oas-add: ${e.detail.value}` })
  el?.addEventListener('oas-remove', (e) => { out.textContent = `oas-remove: ${e.detail.value}` })
  el?.addEventListener('oas-change', (e) => { out.textContent = `oas-change(${e.detail.trigger}): ${JSON.stringify(e.detail.value)}` })
})
</script>

## 与 DynamicTags 的取舍

两者都是「自由输入成 chip」形态，差异在交互模型：DynamicTags 是标签流 + 下方常驻输入框（排序 / 折叠 / 自定义标签模板）；ChipsInput 是 chip 内联在单个控件盒内（类输入框单控件心智），内建逐 chip 邮箱校验与红描边。**收件人 / 邮箱集合**场景用 ChipsInput；通用标签（关键词、分类）且需要排序 / 折叠 / 模板定制用 DynamicTags。

## API

### oas-chips-input

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `disabled` | 禁用 | `boolean` | — |
| `max` | chip 数量上限，超出派发 oas-exceed-limit 且不再新增 | `string` | — |
| `placeholder` | 输入框占位符（缺省走 i18n 文案） | `string` | — |
| `readonly` | 只读（chip 仅展示，不可增删改） | `boolean` | — |
| `size` | 尺寸档位 small / medium / large | `string` | `medium` |
| `value` | 邮箱 chip 数组（property 或 JSON attribute） | `string[]` | `[]` |

#### Property（JS property；是否写回 attribute 见各行说明）

| Property | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `value` | 当前值：邮箱字符串数组（写入回写 value attribute，不派发事件） | `string[]` | `[]` |

#### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-add` | 新增 chip 时派发，`detail: { value, index }` |
| `oas-blur` | 输入框失焦时派发 |
| `oas-change` | chip 增删改后派发，`detail: { value, trigger }`，trigger ∈ add \| remove \| edit \| paste |
| `oas-exceed-limit` | 超出 max 上限时派发且不再新增，`detail: { value, max }` |
| `oas-focus` | 输入框聚焦时派发 |
| `oas-invalid` | chip 邮箱校验非法时派发（幂等：仅用户交互路径；不拦截提交语义），`detail: { value, index }` |
| `oas-remove` | 删除 chip 时派发，`detail: { value, index }` |

键盘：`Enter` / `,` / `;` 成 chip；输入为空时 `Backspace` 回编辑上一 chip；编辑态 `Enter` 提交 / `Esc` 取消。

ARIA：chips 容器 `role="list"`、chip `role="listitem"`，输入框与删除按钮带 `aria-label`（i18n），hint 区 `role="alert"`；`readonly` 时宿主带 `aria-readonly`。
