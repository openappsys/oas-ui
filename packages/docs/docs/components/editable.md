# Editable 就地编辑

点击/回车/空格进入编辑态，Enter 提交、Esc 取消，空值提交默认非破坏；支持多行、图标触发、受控编辑态与提交方式四态组合。

## 基础用法

<DemoBlock title="点击编辑">
  <oas-editable value="点击我修改"></oas-editable>
</DemoBlock>

点击文本（或聚焦后按 Enter/空格）进入编辑，`Enter` 提交、`Esc` 还原。

## 占位符

<DemoBlock title="空值占位">
  <oas-editable placeholder="暂无内容，点击添加"></oas-editable>
</DemoBlock>

值为空时展示 `placeholder`。

## 提交方式四态

<DemoBlock title="submit-on-enter=false（仅按钮/失焦提交）">
  <oas-editable value="回车不提交，点确认或失焦提交" submit-on-enter="false"></oas-editable>
</DemoBlock>

<DemoBlock title="submit-on-blur=false（防误提交：点页面空白不提交）">
  <oas-editable value="失焦不提交，必须点确认/取消" submit-on-blur="false"></oas-editable>
</DemoBlock>

<DemoBlock title="两者都关（仅显式按钮提交）">
  <oas-editable value="只有按钮能提交" submit-on-enter="false" submit-on-blur="false"></oas-editable>
</DemoBlock>

`submit-on-enter`（默认 `true`）与 `submit-on-blur`（默认 `true`）组合出四种提交方式：both（默认）/ 仅 Enter / 仅失焦 / 仅按钮。

## 受控编辑态

<DemoBlock title="editing 属性程序化控制">
  <oas-space>
    <oas-button id="edit-toggle" size="small">进入/退出编辑</oas-button>
    <oas-editable id="edit-controlled" value="程序化控制"></oas-editable>
  </oas-space>
</DemoBlock>

<DemoBlock title="default-editing 挂载即编辑（新建条目场景）">
  <oas-editable default-editing value="新建行直接进编辑"></oas-editable>
</DemoBlock>

- 宿主设置 `editing` 属性进入编辑态；移除属性走取消路径退出（非破坏，派发 `oas-cancel`）
- 组件内部进入/退出时 `editing` 属性自动反射，宿主可监听 attribute 或 `oas-editing` 事件（`detail: { editing: boolean }`，进入/退出各派发一次）

## 多行编辑

<DemoBlock title="multiline（Ctrl/⌘+Enter 提交）">
  <oas-editable multiline value="第一行&#10;第二行"></oas-editable>
</DemoBlock>

`multiline` 时编辑态渲染 textarea：`Enter` 换行、`Ctrl/⌘ + Enter` 提交、`Esc` 取消；高度随内容自适应（最小 1 行）。输入法组合态的 Ctrl+Enter（选词确认）不会误提交。

## 图标触发

<DemoBlock title="trigger=icon（铅笔按钮触发，防误触）">
  <oas-editable trigger="icon" value="点文本不进编辑，点右侧铅笔"></oas-editable>
</DemoBlock>

`trigger="text"`（默认）点文本即编辑；`trigger="icon"` 时文本纯展示，尾部铅笔按钮承载交互（可聚焦，Enter/空格/点击进入编辑）；`trigger="dblclick"` 时双击进编辑（单击不触发，可选中文本不冲突，Enter/空格聚焦时进编辑为键盘逃生）。适合文本可能与页面点击行为冲突的场景。

<DemoBlock title="trigger=dblclick（双击编辑）">
  <oas-editable trigger="dblclick" value="双击我进编辑（单击仅选中文本不触发）"></oas-editable>
</DemoBlock>

## 展示态自定义

<DemoBlock title="template[slot=display] 图标+文本">
  <oas-editable value="张三">
    <template slot="display">
      <span>👤 <span data-display-value></span></span>
    </template>
  </oas-editable>
</DemoBlock>

`template[slot="display"]` 克隆展示态内容：`[data-display-value]` 绑定当前值、`[data-display-placeholder]` 绑定占位文本，缺省回落纯文本。

## 确认/取消图标自定义

<DemoBlock title="template[slot=ok-icon] / [slot=cancel-icon]">
  <oas-editable value="自定义按钮图标">
    <template slot="ok-icon"><span style="font-size:12px">OK</span></template>
    <template slot="cancel-icon"><span style="font-size:12px">✗</span></template>
  </oas-editable>
</DemoBlock>

## 空值提交语义

<DemoBlock title="allow-empty（允许清空）">
  <oas-editable allow-empty value="删光后提交即清空"></oas-editable>
</DemoBlock>

默认空值提交还原旧值并派发 `oas-cancel`（非破坏）；`allow-empty` 时空值照常提交为空串并派发 `oas-change`（「清空重置」场景）。

## 尺寸 / 校验态 / 只读

<DemoBlock title="size 三档">
  <oas-space direction="vertical">
    <oas-editable size="small" value="small 尺寸"></oas-editable>
    <oas-editable value="medium 尺寸（默认）"></oas-editable>
    <oas-editable size="large" value="large 尺寸"></oas-editable>
  </oas-space>
</DemoBlock>

<DemoBlock title="status=error">
  <oas-editable status="error" value="校验错误文本"></oas-editable>
</DemoBlock>

<DemoBlock title="readonly（可聚焦可读不可编辑）">
  <oas-editable readonly value="只读文本"></oas-editable>
</DemoBlock>

`readonly` 与 `disabled` 分立：只读保持正常文本色、可聚焦可复制，仅不可进入编辑（`aria-readonly`）。

## maxlength

<DemoBlock title="长度限制">
  <oas-editable value="最多 10 字符" maxlength="10"></oas-editable>
</DemoBlock>

## 禁用

<DemoBlock title="disabled">
  <oas-editable disabled value="不可编辑"></oas-editable>
</DemoBlock>

## 事件

<DemoBlock title="提交/取消/编辑态事件">
  <oas-editable id="edit-event" value="修改我"></oas-editable>
  <span id="edit-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 240px"></span>
</DemoBlock>

监听 `oas-change`（提交）、`oas-cancel`（取消/空值提交）、`oas-editing`（编辑态切换，`detail: { editing }`）：

## 非文本就地编辑（Inplace 组合模式）

需要「点开换任意内容」（表格、图片等）时，不必引入新组件——`display slot` + 宿主切换即可替代：

<DemoBlock title="宿主 v-if 切换 + display slot 组合">
  <div style="display:inline-flex;align-items:center;gap:8px;padding:8px;border:1px dashed var(--oas-color-border);border-radius:var(--oas-radius-md)">
    <span id="inplace-view" style="display:inline-flex;align-items:center;gap:8px">
      <span style="width:32px;height:32px;border-radius:50%;background:var(--oas-color-primary);color:var(--oas-color-text-on-primary);display:inline-flex;align-items:center;justify-content:center">A</span>
      <span>展示态：头像 + 名称（任意内容）</span>
      <oas-button id="inplace-edit-btn" size="small">编辑</oas-button>
    </span>
    <span id="inplace-edit" hidden style="display:inline-flex;align-items:center;gap:8px">
      <input id="inplace-input" value="展示态：头像 + 名称（任意内容）" style="height:var(--oas-control-height-sm);padding:0 8px;border:1px solid var(--oas-color-border);border-radius:var(--oas-radius-sm)" />
      <oas-button id="inplace-save" size="small" variant="primary">保存</oas-button>
    </span>
  </div>
</DemoBlock>

宿主用 `v-if` / `hidden` 切换展示与编辑两块任意内容（几行样板即可）；文本场景直接用 `oas-editable`（其 `display slot` + `editing` 受控就是同一机制的封装）。

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  // 受控编辑态 demo
  const btn = document.getElementById('edit-toggle')
  const target = document.getElementById('edit-controlled')
  btn?.addEventListener('click', () => {
    if (target.hasAttribute('editing')) target.removeAttribute('editing')
    else target.setAttribute('editing', '')
  })
  // 事件 demo
  const el = document.getElementById('edit-event')
  const out = document.getElementById('edit-output')
  el?.addEventListener('oas-change', (e) => {
    out.textContent = `oas-change: ${e.detail.value}`
  })
  el?.addEventListener('oas-cancel', () => {
    out.textContent = 'oas-cancel'
  })
  el?.addEventListener('oas-editing', (e) => {
    out.textContent = `oas-editing: ${e.detail.editing}`
  })
  // Inplace 组合 demo
  const view = document.getElementById('inplace-view')
  const edit = document.getElementById('inplace-edit')
  const input = document.getElementById('inplace-input')
  document.getElementById('inplace-edit-btn')?.addEventListener('click', () => {
    view.hidden = true
    edit.hidden = false
    input.focus()
  })
  document.getElementById('inplace-save')?.addEventListener('click', () => {
    const label = view.querySelector('span:nth-of-type(2)')
    if (label) label.textContent = input.value
    edit.hidden = true
    view.hidden = false
  })
})
</script>

## 本页能力速览（正文说明）

- `submit-on-blur`：默认 `true`（失焦提交，现状行为），`false` 拼出四态提交方式
- `editing` / `default-editing`：受控编辑态 / 初始编辑态（退出统一走提交/取消路径）
- `multiline`：多行编辑，Ctrl/⌘+Enter 提交、Enter 换行、自适应高
- `trigger`：`text | icon | dblclick`（点文本 / 铅笔按钮 / 双击编辑，均可配）
- `allow-empty`：允许空值提交为空串（默认非破坏还原）
- `size` / `status` / `readonly`：三档尺寸、校验态、只读
- 插槽：`template[slot="display"]`（`data-display-value` / `data-display-placeholder` 绑定）、`ok-icon` / `cancel-icon`
- 事件：`oas-editing` `{ editing }`（既有 `oas-change` / `oas-cancel` 不变）

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `allow-empty` | 允许提交空值（默认非破坏不变；空值还原旧值） | `boolean` | — |
| `default-editing` | 挂载即编辑（仅首次消费） | `boolean` | — |
| `disabled` | 禁用 | `boolean` | — |
| `editing` | 受控编辑态（内部进出自动反射；宿主移除走取消路径） | `boolean` | — |
| `maxlength` | 输入最大长度 | `string` | — |
| `multiline` | 多行编辑（textarea；Enter 换行、Ctrl/⌘+Enter 提交、自适应高） | `boolean` | — |
| `placeholder` | 空值占位 | `string` | — |
| `readonly` | 只读（可聚焦可读不可编辑，aria-readonly） | `boolean` | — |
| `size` | 尺寸档位 `small` / `medium`（默认）/ `large` | `string` | `medium` |
| `status` | 校验态：`error` / `warning` / `success` | `string` | — |
| `submit-on-blur` | 失焦提交（默认 true；与 submit-on-enter 拼出 both/enter/blur/none 四态） | `string` | `true` |
| `submit-on-enter` | 是否允许 Enter 提交 | `string` | `true` |
| `trigger` | 触发方式：`text`（默认点文本）/ `icon`（铅笔按钮触发，防误触）/ `dblclick`（双击编辑，单击不触发，Enter/空格聚焦时进编辑为键盘逃生） | `string` | — |
| `value` | 当前值（受控） | `string` | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-cancel` | 取消/空值提交（还原旧值），默认非破坏，`detail: { value: oldValue } \| { value: this.getAttr('value', '') }` |
| `oas-change` | 提交新值，`detail: { value }` |
| `oas-editing` | 进入/退出编辑态各派一次，`detail: { editing }` |

### 插槽

| 名称 | 说明 |
| --- | --- |
| `template[slot="display"]` | 展示态自定义（`[data-display-value]`/`[data-display-placeholder]` 绑定） |

键盘：展示态 `Enter`/空格/点击进入编辑；编辑态 `Enter` 提交、`Esc` 还原失焦。

ARIA：展示态 `role="button"` + `aria-label="编辑"`，编辑态输入框保持同一 label。
