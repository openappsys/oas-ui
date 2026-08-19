# VisuallyHidden 视觉隐藏

内容对屏幕阅读器可见、视觉上不可见的容器。常用于辅助说明文案、表单校验提示等无障碍场景。

## 基本用法

<DemoBlock title="视觉隐藏文字">
  <oas-button>提交</oas-button>
  <oas-visually-hidden>该表单仅能提交一次，提交前请确认内容无误。</oas-visually-hidden>
</DemoBlock>

## 焦点显形（focusable）

`focusable` 时默认视觉隐藏，内容聚焦时显形——skip-link 场景（键盘用户 Tab 到「跳到主内容」链接时它要显示出来）。用 Tab 键切到下面链接看它出现：

<DemoBlock title="焦点显形">
  <oas-visually-hidden focusable>
    <oas-link href="#main">跳到主内容</oas-link>
  </oas-visually-hidden>
  <p style="margin: 8px 0 0; font-size: 13px; color: var(--oas-color-text-secondary);">↑ 默认不可见；Tab 聚焦链接时显形</p>
</DemoBlock>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `focusable` | 默认视觉隐藏，内容聚焦时显形（skip-link 场景） | — | — |

### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | 透出的内容，视觉隐藏但对屏幕阅读器可读、可复制 |

> 说明：采用经典 clip 方案（`position: absolute; width/height: 1px; clip` 等）实现视觉隐藏；纯展示组件，不含交互元素、不派发任何事件。
