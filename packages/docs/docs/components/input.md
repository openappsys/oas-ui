# Input 输入框

原生 `<input>` 增强的基础输入组件。

## 基础用法

<DemoBlock title="基础用法">
  <oas-input placeholder="请输入内容" style="width: 240px"></oas-input>
</DemoBlock>

## 类型

<DemoBlock title="type">
  <oas-input type="password" placeholder="密码" style="width: 240px"></oas-input>
  <oas-input type="number" placeholder="数字" style="width: 240px"></oas-input>
  <oas-input type="email" placeholder="邮箱" style="width: 240px"></oas-input>
</DemoBlock>

`type` 透传原生 input 类型，支持 `text` / `password` / `number` / `email` 等。

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
})
</script>

## API

| 属性 | 说明 | 默认值 |
|---|---|---|
| `value` | 值（受控） | 无 |
| `placeholder` | 占位提示 | 无 |
| `type` | 原生 input 类型 | `text` |
| `clearable` | 可清空 | `false` |
| `disabled` | 禁用 | `false` |
| `readonly` | 只读 | `false` |

| 事件 | 说明 |
|---|---|
| `oas-input` | 输入中，`detail: { value }` |
| `oas-clear` | 点击清除，`detail: { originalEvent }` |
