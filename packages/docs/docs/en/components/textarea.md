# Textarea

An enhanced native `<textarea>` supporting auto-height and resize.

## Basic Usage

<DemoBlock title="Basic usage">
  <oas-textarea placeholder="请输入内容" style="width: 320px"></oas-textarea>
</DemoBlock>

## Rows & Resize

<DemoBlock title="rows / resize">
  <oas-textarea rows="2" placeholder="两行高度" style="width: 320px"></oas-textarea>
  <oas-textarea resize="both" placeholder="可拖动调整大小" style="width: 320px"></oas-textarea>
</DemoBlock>

`resize` is passed through to the native `resize` value (`none` / `both` / `horizontal` / `vertical`), defaulting to `none`.

## Auto Height

<DemoBlock title="autosize">
  <oas-textarea autosize placeholder="输入内容高度自动增长" style="width: 320px"></oas-textarea>
</DemoBlock>

`autosize` enables auto height: the height grows with content, returns to the minimum height when empty, and shows a scrollbar when exceeding `max-rows` (default 6).

## Autosize Bounds

<DemoBlock title="autosize + min-rows / max-rows">
  <oas-textarea autosize min-rows="2" max-rows="4" placeholder="2~4 行之间自适应" style="width: 320px"></oas-textarea>
</DemoBlock>

`min-rows` (default 1) controls the minimum height, `max-rows` (default 6) caps the height and shows a scrollbar. The legacy attribute `auto-height` is kept for compatibility.

## auto-height Compatibility Alias

<DemoBlock title="auto-height">
  <oas-textarea auto-height placeholder="auto-height 下输入内容自动撑高（与 autosize 等价）" style="width: 320px"></oas-textarea>
</DemoBlock>

`auto-height` is a compatibility alias for `autosize` with identical behavior: grows with content, returns to the minimum row height when empty, and shows a scrollbar beyond `max-rows` (default 6). Setting either one enables auto height.

## Disabled & Readonly

<DemoBlock title="disabled / readonly">
  <oas-textarea disabled value="禁用内容" style="width: 320px"></oas-textarea>
  <oas-textarea readonly value="只读内容，不可编辑" style="width: 320px"></oas-textarea>
</DemoBlock>

## Events

<DemoBlock title="Input events">
  <oas-textarea id="ta-event" placeholder="输入实时反馈" style="width: 320px"></oas-textarea>
  <span id="ta-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 200px"></span>
</DemoBlock>

Listen to `oas-input` (while typing, `detail: { value }`):

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

| Property       | Description                        | Default |
| -------------- | ---------------------------------- | ------- |
| `value`        | Value (controlled)                 | —       |
| `rows`         | Number of rows                     | `3`     |
| `resize`       | Resize behavior                    | `none`  |
| `autosize`     | Auto height                        | `false` |
| `auto-height`  | Legacy name (alias of `autosize`)  | `false` |
| `min-rows`     | Minimum rows in autosize           | `1`     |
| `max-rows`     | Maximum rows in autosize           | `6`     |
| `placeholder`  | Placeholder text                   | —       |
| `disabled`     | Disabled                           | `false` |
| `readonly`     | Readonly                           | `false` |

| Event        | Description                        |
| ------------ | ---------------------------------- |
| `oas-input`  | While typing, `detail: { value }`  |
