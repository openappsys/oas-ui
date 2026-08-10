# Splitter

A split component that resizes the left/right panel widths, adjustable via mouse drag or arrow keys.

## Basic usage

<DemoBlock title="Default 50/50">
  <div style="height: 200px; width: 100%">
    <oas-splitter percent="50">
      <div slot="left" style="height: 100%; display: flex; align-items: center; justify-content: center">左面板</div>
    </oas-splitter>
  </div>
</DemoBlock>

## Custom initial ratio

<DemoBlock title="30% / 70%">
  <div style="height: 200px; width: 100%">
    <oas-splitter percent="30">
      <div slot="left" style="height: 100%; display: flex; align-items: center; justify-content: center">左面板 30%</div>
    </oas-splitter>
  </div>
</DemoBlock>

## Range limits

<DemoBlock title="min / max limits">
  <div style="height: 200px; width: 100%">
    <oas-splitter percent="50" min="20" max="80">
      <div slot="left" style="height: 100%; display: flex; align-items: center; justify-content: center">左面板 20% ~ 80%</div>
    </oas-splitter>
  </div>
</DemoBlock>

## Resize event

<DemoBlock title="oas-resize event">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-tag type="primary" id="splitter-info">左侧占比：50%</oas-tag>
    <div style="height: 200px; width: 100%">
      <oas-splitter id="splitter-demo" percent="50">
        <div slot="left" style="height: 100%; display: flex; align-items: center; justify-content: center">左面板</div>
      </oas-splitter>
    </div>
    <oas-tag type="info">拖拽分隔条，或聚焦分隔条后使用 ← / → 方向键调整</oas-tag>
  </oas-space>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const splitter = document.getElementById('splitter-demo')
  const info = document.getElementById('splitter-info')
  splitter?.addEventListener('oas-resize', (e) => {
    info.textContent = `左侧占比：${e.detail.percent}%`
  })
})
</script>

## API

| Property  | Description               | Default |
| --------- | ------------------------- | ------- |
| `percent` | Left panel ratio (%)      | `50`    |
| `min`     | Left panel minimum ratio (%) | `10`    |
| `max`     | Left panel maximum ratio (%) | `90`    |

| Event        | Description                                |
| ------------ | ------------------------------------------ |
| `oas-resize` | Fired after resizing, `detail: { percent }`|

The divider is `role="separator"` + `tabindex="0"`; once focused, `←` / `→` adjust by 1% each time.
