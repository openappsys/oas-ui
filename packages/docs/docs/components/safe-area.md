---
description: 移动端嵌入宿主时的安全区占位组件，按 env(safe-area-inset-top/bottom) 自动留出刘海与底部手势区高度，也可用 size 显式覆盖
---

# SafeArea 安全区占位

移动端嵌入宿主（WebView / 全屏 H5）时，刘海屏与底部手势区会遮挡内容。`oas-safe-area` 读取 `env(safe-area-inset-top)` / `env(safe-area-inset-bottom)` 占出对应高度，作为布局占位件插在页面首/尾即可。

- 纯 CSS 占位：无键盘焦点、无交互、无事件
- 默认插槽可放状态点等装饰内容（可访问性由宿主决定）
- 桌面环境 `env(...)` 为 `0`，可用 `size` 属性显式给高度做演示或兜底

## 基础用法

<DemoBlock title="底部安全区占位（size=24 模拟手势区）">
  <div style="border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md); overflow: hidden; width: 100%;">
    <div style="padding: var(--oas-space-3); font-size: var(--oas-font-size-sm); color: var(--oas-color-text-secondary)">页面内容区</div>
    <oas-safe-area size="24" style="background: var(--oas-color-border)"></oas-safe-area>
  </div>
</DemoBlock>

## 顶部 / 底部切换

`position="top"` 读取顶部刘海区 inset，默认 `bottom` 读取底部手势区。

<DemoBlock title="顶部（size=20）与底部（size=32）">
  <div style="border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md); overflow: hidden; width: 100%;">
    <oas-safe-area position="top" size="20" style="background: var(--oas-color-border)"></oas-safe-area>
    <div style="padding: var(--oas-space-3); font-size: var(--oas-font-size-sm); color: var(--oas-color-text-secondary)">内容区</div>
    <oas-safe-area size="32" style="background: var(--oas-color-border)"></oas-safe-area>
  </div>
</DemoBlock>

## size 显式覆盖

`size` 接受纯数字（按 px）或任何 CSS 长度（`1rem` / `24px` / `calc(...)`），写入 `--oas-safe-area-size`；移除后恢复 `env(...)` 兜底。

<DemoBlock title="size=1.5rem（24px）">
  <oas-safe-area size="1.5rem" style="width: 100%; background: var(--oas-color-border); border-radius: var(--oas-radius-sm)"></oas-safe-area>
</DemoBlock>

## 与状态栏占位组合

移动端页面通常顶部是「状态栏占位」、底部是「安全区占位」，中间才是业务内容：

<DemoBlock title="StatusBar + 内容 + SafeArea 的典型骨架">
  <div style="border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md); overflow: hidden; width: 100%;">
    <oas-status-bar height="28" style="--oas-status-bar-bg: var(--oas-color-bg-elevated)">9:41</oas-status-bar>
    <div style="padding: var(--oas-space-4); text-align: center; font-size: var(--oas-font-size-sm)">业务内容</div>
    <oas-safe-area size="24" style="background: var(--oas-color-border)"></oas-safe-area>
  </div>
</DemoBlock>

## API

### oas-safe-area

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `position` | 占位方向：`bottom`（默认，底部手势区）/ `top`（顶部刘海区） | — | — |
| `size` | 高度覆盖：纯数字按 px，亦接受 CSS 长度（如 `1rem` / `24px` / `calc(...)`）；缺省读取 `env(safe-area-inset-*)`（不支持时为 0） | `string` | — |

#### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | 装饰内容（可选，如状态点）；页面主体内容不要放这里 |

#### CSS 变量

| CSS 变量 | 说明 | 默认值 |
| --- | --- | --- |
| `--oas-safe-area-size` | 高度覆盖（`size` 属性写入同一变量） | `var(--oas-safe-area-inset)` |
