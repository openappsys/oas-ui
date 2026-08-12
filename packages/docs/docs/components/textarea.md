# Textarea 文本域

原生 `<textarea>` 增强，支持高度自适应与尺寸调整。

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

## auto-height 兼容别名

<DemoBlock title="auto-height">
  <oas-textarea auto-height placeholder="auto-height 下输入内容自动撑高（与 autosize 等价）" style="width: 320px"></oas-textarea>
</DemoBlock>

`auto-height` 是 `autosize` 的兼容别名，行为完全一致：随内容自动增高、空态回到最小行高、超过 `max-rows`（默认 6）出滚动条。二者任设其一即开启高度自适应。

## 禁用与只读

<DemoBlock title="disabled / readonly">
  <oas-textarea disabled value="禁用内容" style="width: 320px"></oas-textarea>
  <oas-textarea readonly value="只读内容，不可编辑" style="width: 320px"></oas-textarea>
</DemoBlock>

## 事件

<DemoBlock title="输入事件">
  <oas-textarea id="ta-event" placeholder="输入实时反馈" style="width: 320px"></oas-textarea>
  <span id="ta-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 200px"></span>
</DemoBlock>

监听 `oas-input`（输入中，`detail: { value }`）：

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const el = document.getElementById('ta-event')
  const out = document.getElementById('ta-output')
  el?.addEventListener('oas-input', (e) => {
    out.textContent = `oas-input: ${e.detail.value}`
  })
})
</script>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `auto-height` | 旧属性名（兼容 `autosize`） | `boolean` | — |
| `autosize` | 高度自适应 | `boolean` | — |
| `disabled` | 禁用 | `boolean` | — |
| `max-rows` | 自适应最大行数 | `string` | `6` |
| `min-rows` | 自适应最小行数 | `string` | `1` |
| `placeholder` | 占位提示 | `string` | — |
| `readonly` | 只读 | `boolean` | — |
| `resize` | 尺寸调整 | `string` | — |
| `rows` | 行数 | `string` | `3` |
| `value` | 值（受控） | `string` | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-input` | 输入中，`detail: { value }` |
