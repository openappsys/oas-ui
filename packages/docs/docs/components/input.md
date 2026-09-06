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
  <oas-input type="password" show-password placeholder="密码" value="oasui123" style="width: 240px"></oas-input>
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

  // focus / blur / change + select() 方法
  const fcb = document.getElementById('input-fcb')
  const fcbOut = document.getElementById('input-fcb-output')
  fcb?.addEventListener('oas-focus', () => (fcbOut.textContent = 'oas-focus'))
  fcb?.addEventListener('oas-blur', () => (fcbOut.textContent = 'oas-blur'))
  fcb?.addEventListener('oas-change', (e) => (fcbOut.textContent = `oas-change: ${e.detail.value}`))
  document.getElementById('btn-input-select')?.addEventListener('click', () => {
    fcb?.focus()
    fcb?.select()
    fcbOut.textContent = '已调用 select()（内容全选）'
  })

  // addon slot 搜索组合
  document.getElementById('input-search-btn')?.addEventListener('click', () => {
    const el = document.getElementById('input-search-output'); if (el) el.textContent = '触发搜索'
  })

  // allow-over-max 超限 validate 反馈
  const over = document.getElementById('input-overmax')
  const overOut = document.getElementById('input-overmax-output')
  over?.addEventListener('oas-validate', (e) => {
    overOut.textContent = e.detail.error
      ? `oas-validate: ${e.detail.error}`
      : 'oas-validate: 已回到限内'
  })

  // formatter / parser（仅 property 通道）：千分位
  const fmt = document.getElementById('input-format')
  const fmtOut = document.getElementById('input-format-output')
  if (fmt) {
    fmt.formatter = (v) => v.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    fmt.parser = (v) => v.replace(/,/g, '')
    fmt.addEventListener('oas-input', (e) => {
      fmtOut.textContent = `原始值: ${e.detail.value}`
    })
  }
})
</script>

## 复杂前后缀（slot 分发）

<DemoBlock title="slot=prefix / slot=suffix">
  <oas-input placeholder="搜索用户名" style="width: 240px">
    <oas-icon slot="prefix" name="search"></oas-icon>
  </oas-input>
  <oas-input placeholder="手机号" style="width: 240px">
    <span slot="suffix">📱</span>
  </oas-input>
  <oas-input placeholder="金额" value="1280" prefix="¥" suffix=".00" style="width: 240px"></oas-input>
</DemoBlock>

简单文本用 `prefix` / `suffix` 属性；复杂内容（图标/按钮/徽标等）用同名 `slot="prefix"` / `slot="suffix"` 分发，slot 有内容时原生替换属性文本。

## 尺寸

<DemoBlock title="size 尺寸档位">
  <oas-input size="small" placeholder="小号" style="width: 200px"></oas-input>
  <oas-input placeholder="中号（默认）" style="width: 200px"></oas-input>
  <oas-input size="large" placeholder="大号" style="width: 200px"></oas-input>
</DemoBlock>

`size` 支持 `small` / `medium`（默认）/ `large` 三档，高度对齐全局尺寸 token（`--oas-control-height-sm/md/lg`，24/32/40px），字号同步缩放，内嵌前后缀、addon、清除/眼睛按钮同档联动。未显式设置时就近继承 `oas-config-provider` 的 `size` 注入（全局表单密度）。

## 形态

<DemoBlock title="variant 形态">
  <oas-input placeholder="outlined（默认）" style="width: 200px"></oas-input>
  <oas-input variant="filled" placeholder="filled 填充" style="width: 200px"></oas-input>
  <oas-input variant="borderless" placeholder="borderless 无框" style="width: 200px"></oas-input>
</DemoBlock>

`variant` 支持 `outlined`（默认描边）/ `filled`（填充底色、聚焦才出边框）/ `borderless`（无框无底色，用于纯文本嵌入场景）。

## 校验态

<DemoBlock title="status 校验态">
  <oas-input status="error" value="校验未通过" style="width: 200px"></oas-input>
  <oas-input status="warning" value="有警告" style="width: 200px"></oas-input>
  <oas-input status="success" value="校验通过" style="width: 200px"></oas-input>
</DemoBlock>

`status` 支持 `error` / `warning` / `success` 三态：边框与焦点环切换语义色。`error` 会同步内层 input 的 `aria-invalid="true"`（读屏可感知「无效」）；`warning` / `success` 仅视觉提示、不标无效语义。表单校验（`oas-form`）写宿主 `aria-invalid` 的既有通道仍然生效，与 `status` 可叠加（error 优先）。

## 原生属性透传

<DemoBlock title="原生属性透传白名单">
  <oas-input name="username" autocomplete="username" required placeholder="用户名（必填）" style="width: 240px"></oas-input>
  <oas-input name="code" inputmode="numeric" maxlength="6" placeholder="验证码（数字键盘）" style="width: 240px"></oas-input>
  <oas-input name="nick" minlength="2" spellcheck="false" enterkeyhint="done" placeholder="昵称（至少 2 字）" style="width: 240px"></oas-input>
</DemoBlock>

以下原生属性镜像到 shadow 内原生 input（宿主移除后同步解除）：`name` / `autocomplete` / `autofocus` / `inputmode` / `minlength` / `required` / `spellcheck` / `enterkeyhint` / `pattern`。可用于原生表单语义、自动填充与移动端键盘优化（`inputmode` / `enterkeyhint`）。

## 焦点与提交事件

<DemoBlock title="oas-focus / oas-blur / oas-change + select()">
  <oas-input id="input-fcb" placeholder="聚焦、输入后失焦试试" style="width: 220px"></oas-input>
  <oas-button id="btn-input-select" size="small">全选</oas-button>
  <span id="input-fcb-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 180px"></span>
</DemoBlock>

- `oas-focus` / `oas-blur`：内层 input 聚焦/失焦时派发，`detail: { value }` 携带当前值。
- `oas-change`：**提交语义**——失焦或按 Enter 时值相对上次提交发生变化才派发（输入中不派发，与 `oas-input` 区分）。
- `select()` 方法：全选输入框内容（委托原生 input.select）；`blur()` 同理委托失焦。

## addon 复杂内容（slot 分发）

<DemoBlock title="slot=prepend / slot=append（可嵌选择器、按钮）">
  <oas-input placeholder="输入网站名称" style="width: 360px">
    <oas-select slot="prepend" placeholder="类型" options='[{"label":"http://","value":"http"},{"label":"https://","value":"https"}]' style="width: 110px"></oas-select>
    <span slot="append">.com</span>
  </oas-input>
  <oas-input placeholder="搜索关键词" style="width: 300px">
    <oas-icon slot="prefix" name="search"></oas-icon>
    <oas-button slot="append" id="input-search-btn" type="primary">搜索</oas-button>
  </oas-input>
  <span id="input-search-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 100px"></span>
</DemoBlock>

`addon-before` / `addon-after` 属性只接文案；复杂内容用 `slot="prepend"` / `slot="append"` 分发（可嵌选择器、按钮，构成 mixed input），与属性文本双通道并存——slot 有分发时原生替换属性 fallback，圆角合并/边框去重与 addon 属性一致。多个独立控件平铺拼接（select+input+button）建议配合 `oas-compact` 紧凑容器。

## 字数统计位置与字素计数

<DemoBlock title="count-position + emoji 字素计数">
  <oas-input show-count count-position="inside" maxlength="10" placeholder="计数在框内" style="width: 220px"></oas-input>
  <oas-input show-count maxlength="10" value="👍👨‍👩‍👧你" placeholder="emoji 按字素计数" style="width: 220px"></oas-input>
</DemoBlock>

`show-count` 计数按**字素（grapheme）**统计（内建 `Intl.Segmenter`，无该 API 时按码点兜底）——emoji、ZWJ 组合字符（如家庭 emoji）计 1，避免 JS `length` 把一个 emoji 算作多个。`count-position="inside"` 把计数移到输入区内右侧（默认 `outside` 右下角）。注意：`maxlength` 的原生截断仍按码元口径，与统计口径分离（需要超限场景见下方 `allow-over-max`）。

## 超限不截断

<DemoBlock title="allow-over-max + oas-validate">
  <oas-input id="input-overmax" allow-over-max show-count maxlength="5" placeholder="超过 5 字可继续输入" style="width: 240px"></oas-input>
  <span id="input-overmax-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 220px"></span>
</DemoBlock>

默认 `maxlength` 透传原生硬截断；设置 `allow-over-max` 后不再截断，超限可继续输入，计数标红（danger），并在越界状态翻转时派发 `oas-validate`（`detail.error` 为 `exceed-maximum`，回到限内为 `null`），宿主可据此提示而不打断输入。

## 显示格式化（formatter / parser）

<DemoBlock title="formatter / parser（千分位，property 通道）">
  <oas-input id="input-format" placeholder="输入数字自动加千分位" style="width: 260px"></oas-input>
  <span id="input-format-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 140px"></span>
</DemoBlock>

`formatter` / `parser` **仅 JS property 通道**（`el.formatter = fn`）——Web Components 的 attribute 无法传函数，无对应 HTML 属性。显示值 = `formatter(原始值)`，`oas-input` / `oas-change` 等事件 `detail.value` 携带 `parser(显示值)` 解析后的原始值；移除（置 `null`）恢复原始显示。输入时光标按格式化前后长度差近似保持（卡号分段等场景够用）。

## 清除按钮显隐

<DemoBlock title="show-clear-on">
  <oas-input clearable show-clear-on="focus" value="聚焦时才显示清除" style="width: 220px"></oas-input>
  <oas-input clearable show-clear-on="hover" value="悬浮或聚焦时显示" style="width: 220px"></oas-input>
</DemoBlock>

`show-clear-on` 控制清除按钮显隐策略：默认 `always`（有值即常显，现状不变）；`focus` 仅聚焦时显示；`hover` 悬浮或聚焦时显示（降低密集表单的视觉噪声）。

## 宽度自适应

<DemoBlock title="auto-width">
  <oas-input auto-width auto-width-min="120" value="短文本" placeholder="输入内容试试" style="margin-inline-end: 24px"></oas-input>
  <oas-input auto-width auto-width-min="120" auto-width-max="320" value="宽度随内容变化的输入框" placeholder="auto-width"></oas-input>
</DemoBlock>

`auto-width` 开启后宽度随内容自适应（mirror 测宽技术：与输入框同字体/内边距的隐藏测量元素，空值回落占位文本宽度）；`auto-width-min` / `auto-width-max`（px 数值）钳制宽度范围，`min` 缺省 72px、`max` 缺省 100%。行内编辑、标签输入等场景常用。

## 范围输入（组合写法）

<DemoBlock title="两个输入框 + 分隔符（范围输入）">
  <div style="display: inline-flex; align-items: center; gap: var(--oas-space-2)">
    <oas-input placeholder="最低价" inputmode="numeric" style="width: 120px"></oas-input>
    <span style="color: var(--oas-color-text-secondary)">~</span>
    <oas-input placeholder="最高价" inputmode="numeric" style="width: 120px"></oas-input>
  </div>
</DemoBlock>

范围输入用两个 `oas-input` + 分隔符布局即可（组件不提供 pair 双输入 API）：两个输入框各自的 `oas-change` 提交值，宿主组合成区间。需要紧凑圆角拼接时外层套 `oas-compact` 容器。

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `addon-after` | 后置 addon 文案块 | — | — |
| `addon-before` | 前置 addon 文案块 | — | — |
| `allow-over-max` | 超限不截断：maxlength 不再透传原生（可继续输入），计数标红并派发 oas-validate | `boolean` | — |
| `auto-width` | 宽度随内容自适应（mirror 测宽；空值回落 placeholder 宽），常配 auto-width-min/max 钳制 | `boolean` | — |
| `auto-width-max` | auto-width 最大宽度 px 或百分比（默认 100%） | — | — |
| `auto-width-min` | auto-width 最小宽度 px（默认 72） | — | — |
| `clearable` | 可清空 | `boolean` | — |
| `count-position` | 字数计数位置：`outside`（默认，框外）/ `inside`（输入区内右侧） | `string` | — |
| `disabled` | 禁用 | `boolean` | — |
| `label` | 可访问名称（`aria-label` 来源，未设时回退 `placeholder` → 内置文案「输入框」） | — | — |
| `maxlength` | 最大输入长度（透传原生 maxlength） | `string` | — |
| `placeholder` | 占位提示 | `string` | — |
| `prefix` | 内嵌前置文案 | `string` | — |
| `prefix-icon` | 前置图标名 | `string` | — |
| `readonly` | 只读 | `boolean` | — |
| `show-clear-on` | 清除按钮显隐：`always`（默认常显）/ `hover` / `focus` | `string` | — |
| `show-count` | 显示字数统计（右下角，超限标 danger） | `boolean` | — |
| `show-password` | 密码可见切换（`type="password"` 时渲染眼睛按钮） | `boolean` | — |
| `size` | 尺寸档位 `small` / `medium`（默认）/ `large`：高度与字号联动 | `string` | `medium` |
| `status` | 校验态：`error` / `warning` / `success`；error 同步内层 aria-invalid | `string` | — |
| `suffix` | 内嵌后置文案 | `string` | — |
| `suffix-icon` | 后置图标名 | `string` | — |
| `type` | 原生 input 类型 | `string` | `text` |
| `value` | 值（受控） | `string` | — |
| `variant` | 形态：`outlined`（默认描边）/ `filled`（填充底色）/ `borderless`（无框） | `string` | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-blur` | 失焦时派发，`detail: { value }` |
| `oas-change` | 提交语义：失焦/Enter 且值相对上次提交变化时派发，`detail: { value }` |
| `oas-clear` | 点击清除，`detail: { originalEvent }` |
| `oas-enter` | 按 Enter（非输入法组合），`detail: { value }` |
| `oas-focus` | 聚焦时派发，`detail: { value }` |
| `oas-input` | 输入中，`detail: { value }` |
| `oas-validate` | allow-over-max 越界状态翻转时派发，`detail: { error: "exceed-maximum" \| null }` |

### 插槽

| 名称 | 说明 |
| --- | --- |
| `append` | 后置 addon 区（可嵌 select/按钮等任意内容） |
| `prefix` | 内嵌前置内容（图标/按钮等复杂内容，分发时优先于 `prefix` 属性文本）；简单文本用 `prefix` 属性即可 |
| `prepend` | 前置 addon 区（可嵌 select/按钮等任意内容） |
| `suffix` | 内嵌后置内容（图标/按钮等复杂内容，分发时优先于 `suffix` 属性文本）；简单文本用 `suffix` 属性即可 |
