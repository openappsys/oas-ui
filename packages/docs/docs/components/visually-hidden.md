# VisuallyHidden 视觉隐藏

内容对屏幕阅读器可见、视觉上不可见的容器。常用于辅助说明文案、表单校验提示等无障碍场景。

## 基本用法

<DemoBlock title="视觉隐藏文字">
  <oas-button>提交</oas-button>
  <oas-visually-hidden>该表单仅能提交一次，提交前请确认内容无误。</oas-visually-hidden>
</DemoBlock>

## API

该组件无属性，仅使用默认 slot 透出内容。

### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | 透出的内容，视觉隐藏但对屏幕阅读器可读、可复制 |

> 说明：采用经典 clip 方案（`position: absolute; width/height: 1px; clip` 等）实现视觉隐藏；纯展示组件，不含交互元素、不派发任何事件。
