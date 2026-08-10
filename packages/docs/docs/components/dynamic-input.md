# DynamicInput 动态列表

数组字段的增删编辑，每行复用 `oas-input` 组件，支持受控/非受控双模式。

## 基础用法

<DemoBlock title="可增删列表">
  <oas-dynamic-input model-value='["vue","react"]'></oas-dynamic-input>
</DemoBlock>

`model-value` 为 JSON 数组属性（也支持通过 property 赋值），每行一个输入框 + 删除按钮，末尾「添加」按钮。

## 默认值

<DemoBlock title="default-value">
  <oas-dynamic-input default-value="新行"></oas-dynamic-input>
</DemoBlock>

新增行以 `default-value` 作为初值。

## min / max 边界

<DemoBlock title="min=2 补足行数">
  <oas-dynamic-input min="2" model-value='["a"]'></oas-dynamic-input>
</DemoBlock>

`min` 下自动补足行数，达到 `min` 时删除按钮禁用。

<DemoBlock title="max=3 禁添加">
  <oas-dynamic-input max="3" model-value='["a","b","c"]'></oas-dynamic-input>
</DemoBlock>

`max` 达到后「添加」按钮禁用；`model-value` 超长自动截断。

## 禁用

<DemoBlock title="disabled">
  <oas-dynamic-input disabled model-value='["vue"]'></oas-dynamic-input>
</DemoBlock>

## 事件

<DemoBlock title="变化事件">
  <oas-dynamic-input id="dyn-event" model-value='["a"]'></oas-dynamic-input>
  <span id="dyn-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 240px"></span>
</DemoBlock>

监听 `oas-change`（`detail: { value: string[] }`）：

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const el = document.getElementById('dyn-event')
  const out = document.getElementById('dyn-output')
  el?.addEventListener('oas-change', (e) => {
    out.textContent = `oas-change: ${JSON.stringify(e.detail.value)}`
  })
})
</script>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `default-value` | 新增行的默认值 | — | — |
| `disabled` | 禁用（行内输入 + 按钮） | — | — |
| `max` | 最多行数，超长截断 | — | — |
| `min` | 最少行数，不足自动补足 | — | `0` |
| `model-value` | 字符串数组（property 或 JSON） | — | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-change` | 增/删/编辑后派发，`detail: { value }` |

受控：监听 `oas-change` 后设置 `modelValue` property（或 `model-value` 属性）回填即可。
