# ColorPicker 颜色选择器

触发色块弹出调色面板，支持预设色、HSV 与 RGB 输入。

## 基础用法

<DemoBlock title="基础">
  <oas-color-picker value="#0b6cff"></oas-color-picker>
</DemoBlock>

## 自定义预设色

<DemoBlock title="自定义 preset">
  <oas-color-picker preset='["#0b6cff","#16a34a","#d97706","#dc2626","#9333ea","#18181b"]'></oas-color-picker>
</DemoBlock>

## 禁用

<DemoBlock title="禁用">
  <oas-color-picker value="#dc2626" disabled></oas-color-picker>
</DemoBlock>

## 事件

<DemoBlock title="变化事件">
  <oas-color-picker id="cp-event" value="#0b6cff"></oas-color-picker>
  <span id="cp-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 120px"></span>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const el = document.getElementById('cp-event')
  const out = document.getElementById('cp-output')
  el?.addEventListener('oas-change', (e) => {
    out.textContent = `oas-change: ${e.detail.value}`
  })
})
</script>

## API

| 属性       | 说明                              | 默认值          |
| ---------- | --------------------------------- | --------------- |
| `value`    | 当前颜色（hex）                   | `#0066ff`       |
| `preset`   | 预设色数组（JSON）                | 内置 12 色      |
| `disabled` | 禁用                              | `false`         |

键盘：触发按钮聚焦时 `↑`/`↓` 调亮度；面板内 `Esc` 关闭，外部点击关闭。

| 事件         | 说明                              |
| ------------ | --------------------------------- |
| `oas-change` | 颜色变化，`detail: { value }`     |
