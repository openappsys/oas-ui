# DynamicTags 动态标签

输入框回车/逗号提交生成标签，支持去重、上限与键盘删除。

## 基础用法

<DemoBlock title="默认去重">
  <oas-dynamic-tags model-value='["vue","react"]'></oas-dynamic-tags>
</DemoBlock>

`model-value` 为 JSON 数组属性；默认不允许重复标签。

## 允许重复

<DemoBlock title="allow-duplicate">
  <oas-dynamic-tags allow-duplicate model-value='["a"]'></oas-dynamic-tags>
</DemoBlock>

## max 上限

<DemoBlock title="max=3">
  <oas-dynamic-tags max="3" model-value='["a","b"]'></oas-dynamic-tags>
</DemoBlock>

达到 `max` 后输入框自动禁用，删除标签后恢复可输入。

## 占位符与禁用

<DemoBlock title="placeholder">
  <oas-dynamic-tags placeholder="输入后按回车添加"></oas-dynamic-tags>
</DemoBlock>

<DemoBlock title="disabled">
  <oas-dynamic-tags disabled model-value='["vue"]'></oas-dynamic-tags>
</DemoBlock>

## 事件

<DemoBlock title="添加/删除事件">
  <oas-dynamic-tags id="tags-event" model-value='["a"]'></oas-dynamic-tags>
  <span id="tags-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 240px"></span>
</DemoBlock>

监听 `oas-add` / `oas-remove` / `oas-change`：

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const el = document.getElementById('tags-event')
  const out = document.getElementById('tags-output')
  const show = (e) => { out.textContent = `${e.type}: ${JSON.stringify(e.detail.value)}` }
  el?.addEventListener('oas-add', show)
  el?.addEventListener('oas-remove', show)
  el?.addEventListener('oas-change', show)
})
</script>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `allow-duplicate` | 允许重复标签 | — | — |
| `disabled` | 禁用 | — | — |
| `max` | 标签数量上限 | — | — |
| `model-value` | 标签数组（property 或 JSON） | — | — |
| `placeholder` | 输入框占位符 | — | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-add` | 新增标签，`detail: { value }` |
| `oas-change` | 增删后派发，`detail: { value }` |
| `oas-remove` | 删除标签，`detail: { value }` |

键盘：`Enter` / `,` 提交；输入框为空时 `Backspace` 删除最后一个标签。

ARIA：容器 `role="list"`、标签 `role="listitem"`，删除按钮可聚焦并带 `aria-label`；重复提交时输入框标记 `aria-invalid` 并给出提示。
