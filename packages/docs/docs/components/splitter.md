# Splitter 分割面板

可调整左右面板宽度的分割组件，支持鼠标拖拽与键盘方向键调整。

## 基础用法

<DemoBlock title="默认 50/50">
  <div style="height: 200px; width: 100%">
    <oas-splitter percent="50">
      <div slot="left" style="height: 100%; display: flex; align-items: center; justify-content: center">左面板</div>
    </oas-splitter>
  </div>
</DemoBlock>

## 自定义初始比例

<DemoBlock title="30% / 70%">
  <div style="height: 200px; width: 100%">
    <oas-splitter percent="30">
      <div slot="left" style="height: 100%; display: flex; align-items: center; justify-content: center">左面板 30%</div>
    </oas-splitter>
  </div>
</DemoBlock>

## 限制范围

<DemoBlock title="min / max 限制">
  <div style="height: 200px; width: 100%">
    <oas-splitter percent="50" min="20" max="80">
      <div slot="left" style="height: 100%; display: flex; align-items: center; justify-content: center">左面板 20% ~ 80%</div>
    </oas-splitter>
  </div>
</DemoBlock>

## 调整事件

<DemoBlock title="oas-resize 事件">
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

| 属性      | 说明              | 默认值 |
| --------- | ----------------- | ------ |
| `percent` | 左侧面板占比（%） | `50`   |
| `min`     | 左侧最小占比（%） | `10`   |
| `max`     | 左侧最大占比（%） | `90`   |

| 事件         | 说明                              |
| ------------ | --------------------------------- |
| `oas-resize` | 调整后触发，`detail: { percent }` |

分隔条 `role="separator"` + `tabindex="0"`，聚焦后 ← / → 每次调整 1%。
