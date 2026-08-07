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

<DemoBlock title="auto-height">
  <oas-textarea auto-height placeholder="输入内容高度自动增长" style="width: 320px"></oas-textarea>
</DemoBlock>

输入时随内容自动增高，不出现滚动条。

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

| 属性 | 说明 | 默认值 |
|---|---|---|
| `value` | 值（受控） | 无 |
| `rows` | 行数 | `3` |
| `resize` | 尺寸调整 | `none` |
| `auto-height` | 高度自适应 | `false` |
| `placeholder` | 占位提示 | 无 |
| `disabled` | 禁用 | `false` |
| `readonly` | 只读 | `false` |

| 事件 | 说明 |
|---|---|
| `oas-input` | 输入中，`detail: { value }` |
