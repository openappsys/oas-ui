# AspectRatio 等比容器

按指定宽高比锁定容器尺寸的纯展示组件，宽度 100%、高度由比例推导，内容铺满并按比例裁切；无子内容时仍按比例占位。无事件。

## 基础用法

<DemoBlock title="16/9 视频比例">
  <oas-aspect-ratio ratio="16/9" style="border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); background: var(--oas-color-bg-hover);">
    <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--oas-color-text-secondary);">16:9</div>
  </oas-aspect-ratio>
</DemoBlock>

## 常见比例

<DemoBlock title="4:3 / 1:1 / 21:9">
  <oas-aspect-ratio ratio="4:3" style="border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); background: var(--oas-color-bg-hover); margin-bottom: var(--oas-space-3);">
    <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--oas-color-text-secondary);">4:3</div>
  </oas-aspect-ratio>
  <oas-aspect-ratio ratio="1:1" style="border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); background: var(--oas-color-bg-hover); margin-bottom: var(--oas-space-3); width: 200px;">
    <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--oas-color-text-secondary);">1:1</div>
  </oas-aspect-ratio>
  <oas-aspect-ratio ratio="21:9" style="border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); background: var(--oas-color-bg-hover);">
    <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--oas-color-text-secondary);">21:9</div>
  </oas-aspect-ratio>
</DemoBlock>

## 空内容占位

<DemoBlock title="无子内容仍保比例（1:1）">
  <oas-aspect-ratio ratio="1:1" style="border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); background: var(--oas-color-bg-hover);"></oas-aspect-ratio>
</DemoBlock>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `ratio` | 宽高比，支持 `16/9`、`4:3`、`16 / 9`、小数 `1.5`；非法回退 `1 / 1` | `string` | — |

### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | — |

- 宿主宽度 100%，高度由 `aspect-ratio` 推导；内容经 absolute `inset: 0` 铺满并按比例裁切。
- 无子内容时宿主仍按比例占位。
- 无事件，纯展示。
