# Switch 开关

`role="switch"` 的开关按钮。

## 基础用法

<DemoBlock title="基础用法">
  <oas-switch></oas-switch>
  <oas-switch checked></oas-switch>
</DemoBlock>

## 禁用与加载

<DemoBlock title="disabled / loading">
  <oas-switch disabled checked></oas-switch>
  <oas-switch loading checked></oas-switch>
</DemoBlock>

`loading` 显示加载动画并阻止切换，用于异步提交场景。

## 事件

<DemoBlock title="切换事件">
  <oas-switch id="switch-event" checked></oas-switch>
  <span id="switch-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 120px"></span>
</DemoBlock>

监听 `oas-change`（`detail: { checked }`）：

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const el = document.getElementById('switch-event')
  const out = document.getElementById('switch-output')
  el?.addEventListener('oas-change', (e) => {
    out.textContent = `oas-change: ${e.detail.checked}`
  })
})
</script>

## API

| 属性 | 说明 | 默认值 |
|---|---|---|
| `checked` | 是否开启 | `false` |
| `disabled` | 禁用 | `false` |
| `loading` | 加载态，阻止切换 | `false` |

| 事件 | 说明 |
|---|---|
| `oas-change` | 切换，`detail: { checked }` |
