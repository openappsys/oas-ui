# Textarea 文本域

原生 `<textarea>` 增强：高度自适应（可封顶 / 无上限）、字数统计、一键清除、尺寸档位、形态与校验态。

## 基础用法

<DemoBlock title="基础用法">
  <oas-textarea placeholder="请输入内容" style="width: 320px"></oas-textarea>
</DemoBlock>

## 行数与尺寸调整

<DemoBlock title="rows / resize">
  <oas-textarea rows="2" placeholder="两行高度" style="width: 320px"></oas-textarea>
  <oas-textarea resize="both" placeholder="可拖动调整大小" style="width: 320px"></oas-textarea>
</DemoBlock>

`resize` 透传原生 `resize` 值（`none` / `both` / `horizontal` / `vertical`），默认 `none`。

## 高度自适应

<DemoBlock title="autosize">
  <oas-textarea autosize placeholder="输入内容高度自动增长" style="width: 320px"></oas-textarea>
</DemoBlock>

`autosize` 开启高度自适应：随内容自动增高，空态回到最小高度，超过 `max-rows`（默认 6）出现滚动条。

## 自适应边界

<DemoBlock title="autosize + min-rows / max-rows">
  <oas-textarea autosize min-rows="2" max-rows="4" placeholder="2~4 行之间自适应" style="width: 320px"></oas-textarea>
</DemoBlock>

`min-rows`（默认 1）控制最小高度，`max-rows`（默认 6）封顶并出滚动条。旧属性 `auto-height` 保留兼容。

## 无上限自适应

<DemoBlock title="autosize + max-rows=0">
  <oas-textarea autosize max-rows="0" placeholder="长文输入：高度无上限增长，不出滚动条" style="width: 320px"></oas-textarea>
</DemoBlock>

`max-rows="0"` 显式关闭封顶：高度随内容无限增长、不出滚动条（长文写作、日志粘贴场景）。缺省 `max-rows` 时默认 6 行封顶的行为不变——需要无上限必须显式设置。

## auto-height 兼容别名

<DemoBlock title="auto-height">
  <oas-textarea auto-height placeholder="auto-height 下输入内容自动撑高（与 autosize 等价）" style="width: 320px"></oas-textarea>
</DemoBlock>

`auto-height` 是 `autosize` 的兼容别名，行为完全一致：随内容自动增高、空态回到最小行高、超过 `max-rows`（默认 6）出滚动条。二者任设其一即开启高度自适应。

## 尺寸档位

<DemoBlock title="size">
  <oas-textarea size="small" placeholder="small 紧凑" style="width: 320px"></oas-textarea>
  <oas-textarea placeholder="medium 默认档" style="width: 320px"></oas-textarea>
  <oas-textarea size="large" placeholder="large 宽松" style="width: 320px"></oas-textarea>
</DemoBlock>

`size="small | medium | large"`（默认 `medium`）：字号、上下内边距与最小高度随档位联动，对齐全局控件尺寸 token。

## 形态

<DemoBlock title="variant">
  <oas-textarea variant="outlined" placeholder="outlined 默认描边" style="width: 320px"></oas-textarea>
  <oas-textarea variant="filled" placeholder="filled 填充底色" style="width: 320px"></oas-textarea>
  <oas-textarea variant="borderless" placeholder="borderless 无边框" style="width: 320px"></oas-textarea>
</DemoBlock>

`variant="outlined | filled | borderless"`（默认 `outlined`）。`filled` 灰底无边框、聚焦显边；`borderless` 透明背景无边框，仅保留聚焦环。

## 校验态

<DemoBlock title="status">
  <oas-textarea status="error" value="内容不符合要求" style="width: 320px"></oas-textarea>
  <oas-textarea status="warning" value="内容有潜在问题" style="width: 320px"></oas-textarea>
  <oas-textarea status="success" value="内容校验通过" style="width: 320px"></oas-textarea>
</DemoBlock>

`status="error | warning | success"`：边框与聚焦环随校验结果变色；`error` 同时给内部文本域标 `aria-invalid`（读屏可感知）。与 `oas-form-item` 校验联动时，form-item 会写宿主 `aria-invalid`，视觉与 `error` 一致。

## 字数统计

<DemoBlock title="maxlength + show-count">
  <oas-textarea maxlength="20" show-count placeholder="简介限 20 字（右下角 n/max）" style="width: 320px"></oas-textarea>
  <oas-textarea show-count placeholder="不限长度时只显示当前字数" style="width: 320px"></oas-textarea>
</DemoBlock>

`show-count` 在框外右下角显示计数：设 `maxlength` 时为 `n/max`（多数派口径，超限变红；`maxlength` 透传原生，输入层自动截断），未设时只显示当前长度。计数节点带 `aria-live="polite"`，读屏可播报字数变化。

## 可清空

<DemoBlock title="clearable">
  <oas-textarea id="ta-clear" clearable autosize style="width: 320px">这条评论可以一键清除重写。</oas-textarea>
  <span id="ta-clear-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 200px"></span>
</DemoBlock>

`clearable` 有值时显示右上角清除按钮（`disabled` / `readonly` 不显示）：点击清空内容、派发 `oas-clear` 事件、焦点回到文本域；autosize 下高度同步回收。

## label 可访问名称

<DemoBlock title="label">
  <oas-textarea label="备注" placeholder="读屏将念出「备注」" style="width: 320px"></oas-textarea>
</DemoBlock>

`label` 写入内部 `aria-label` 作可访问名称，回退顺序：`label` > `placeholder` > 内置默认文案。可见的表单标签请走 `oas-form-item` 的 label 通道（label 布局归 form-item 职责）。

## 原生属性透传

<DemoBlock title="原生属性透传">
  <oas-textarea name="bio" required minlength="2" wrap="hard" spellcheck="false" placeholder="必填、至少 2 字；spellcheck 关闭拼写检查" style="width: 320px"></oas-textarea>
</DemoBlock>

白名单透传到内部原生 `<textarea>`：`name` / `autofocus` / `minlength` / `required` / `spellcheck` / `wrap`。`oas-form` 原生提交时 `name` 参与取值，`required` / `minlength` 参与原生约束校验；`wrap="hard"` 需同时设置 `cols` 才会按硬换行提交。

## 禁用与只读

<DemoBlock title="disabled / readonly">
  <oas-textarea disabled value="禁用内容" style="width: 320px"></oas-textarea>
  <oas-textarea readonly value="只读内容，不可编辑" style="width: 320px"></oas-textarea>
</DemoBlock>

## 事件

<DemoBlock title="输入与焦点事件">
  <oas-textarea id="ta-event" placeholder="输入实时反馈；失焦看 oas-change" style="width: 320px"></oas-textarea>
  <span id="ta-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 200px"></span>
</DemoBlock>

- `oas-input`：每次击键，`detail: { value }`
- `oas-focus` / `oas-blur`：聚焦 / 失焦，`detail: { value }`
- `oas-change`：失焦且值较聚焦时已变才派发（提交语义），`detail: { value }`

## 方法

<DemoBlock title="focus() / blur() / select()">
  <oas-textarea id="ta-methods" value="点「全选」高亮这段文本" style="width: 320px"></oas-textarea>
  <div style="margin-top: 8px; display: flex; gap: 8px">
    <oas-button id="ta-btn-select" size="small">全选 select()</oas-button>
    <oas-button id="ta-btn-focus" size="small">聚焦 focus()</oas-button>
    <oas-button id="ta-btn-blur" size="small">失焦 blur()</oas-button>
  </div>
  <span id="ta-methods-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 200px"></span>
</DemoBlock>

`focus(options?)` / `blur()` / `select()` 均委托内部原生文本域。

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const el = document.getElementById('ta-event')
  const out = document.getElementById('ta-output')
  el?.addEventListener('oas-input', (e) => {
    out.textContent = `oas-input: ${e.detail.value}`
  })
  el?.addEventListener('oas-focus', () => {
    out.textContent = 'oas-focus: 聚焦'
  })
  el?.addEventListener('oas-blur', () => {
    out.textContent = 'oas-blur: 失焦'
  })
  el?.addEventListener('oas-change', (e) => {
    out.textContent = `oas-change: ${e.detail.value}`
  })

  const clearEl = document.getElementById('ta-clear')
  const clearOut = document.getElementById('ta-clear-output')
  clearEl?.addEventListener('oas-clear', () => {
    clearOut.textContent = '已清空，重新开始写'
  })

  const mEl = document.getElementById('ta-methods')
  const mOut = document.getElementById('ta-methods-output')
  mEl?.addEventListener('oas-focus', () => {
    mOut.textContent = '已聚焦（oas-focus）'
  })
  mEl?.addEventListener('oas-blur', () => {
    mOut.textContent = '已失焦（oas-blur）'
  })
  document.getElementById('ta-btn-select')?.addEventListener('click', () => mEl?.select())
  document.getElementById('ta-btn-focus')?.addEventListener('click', () => mEl?.focus())
  document.getElementById('ta-btn-blur')?.addEventListener('click', () => mEl?.blur())
})
</script>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `auto-height` | 旧属性名（兼容 `autosize`） | `boolean` | — |
| `autofocus` | 自动聚焦（透传原生） | — | — |
| `autosize` | 高度自适应 | `boolean` | — |
| `clearable` | 显示清除按钮（一键清空，派发 oas-clear + oas-input） | `boolean` | — |
| `disabled` | 禁用 | `boolean` | — |
| `label` | 无障碍名（aria-label 通道，缺省回落 placeholder → locale） | — | — |
| `max-rows` | 自适应最大行数 | `string` | — |
| `maxlength` | 最大长度（透传原生；配 show-count 显示计数） | `string` | — |
| `min-rows` | 自适应最小行数 | `string` | `1` |
| `minlength` | 最小长度（透传原生） | — | — |
| `name` | 表单字段名（透传原生） | — | — |
| `placeholder` | 占位提示 | `string` | — |
| `readonly` | 只读 | `boolean` | — |
| `required` | 必填标记（透传原生） | — | — |
| `resize` | 尺寸调整 | `string` | — |
| `rows` | 行数 | `string` | `3` |
| `show-count` | 显示字数计数（框外右下 n/max；超限变红；aria-live 播报） | `boolean` | — |
| `size` | 尺寸档位 `small` / `medium`（默认）/ `large` | `string` | `medium` |
| `spellcheck` | 拼写检查（透传原生） | — | — |
| `status` | 校验态：`error` / `warning` / `success`；error 同步内层 aria-invalid | `string` | — |
| `value` | 值（受控） | `string` | — |
| `variant` | 形态：`outlined`（默认）/ `filled` / `borderless` | `string` | `outlined` |
| `wrap` | 换行策略（透传原生：soft/hard） | — | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-blur` | 失焦时派发，`detail: { value }` |
| `oas-change` | 原生 change 语义：失焦且值已变时派发，`detail: { value }` |
| `oas-clear` | 点击清除按钮时派发（同时派发 oas-input），`detail: { originalEvent: new MouseEvent('click') }` |
| `oas-focus` | 聚焦时派发，`detail: { value }` |
| `oas-input` | 输入中，`detail: { value }` |
