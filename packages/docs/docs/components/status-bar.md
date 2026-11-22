---
description: 移动端状态栏占位组件，预留 env(safe-area-inset-top) 高度并提供 height / color 覆盖，插槽可放宿主绘制的状态内容
---

# StatusBar 状态栏占位

为嵌入移动宿主的页面预留顶部状态栏高度（`env(safe-area-inset-top)`），并提供高度与前景色覆盖。组件不模拟系统状态栏——系统栏由宿主容器（WebView / 原生壳）负责，这里只解决「内容不被状态栏压住」与「前景色跟随页面主题」。

- 默认高度 = `env(safe-area-inset-top)`；桌面为 `0`，可用 `height` 显式给值
- `color` 按 ui-spec §4.1 解析：11 个预设名取 `--oas-preset-*-text` 文字安全档，其余按任意 CSS 色值注入
- 默认插槽放宿主绘制的时间 / 电量等内容

## 基础用法

<DemoBlock title="height=44 + 时间内容">
  <oas-status-bar height="44" style="width: 100%; --oas-status-bar-bg: var(--oas-color-bg-elevated); outline: 1px dashed var(--oas-color-border); outline-offset: -1px; border-radius: var(--oas-radius-md);">9:41</oas-status-bar>
</DemoBlock>

## 前景色覆盖

<DemoBlock title="预设色 / 任意 CSS 色值">
  <div style="display: flex; flex-direction: column; gap: var(--oas-space-2); width: 100%">
    <oas-status-bar height="36" color="blue" style="width: 100%; --oas-status-bar-bg: var(--oas-color-bg-elevated); outline: 1px dashed var(--oas-color-border); outline-offset: -1px; border-radius: var(--oas-radius-md);">blue 预设</oas-status-bar>
    <oas-status-bar height="36" color="orange" style="width: 100%; --oas-status-bar-bg: var(--oas-color-bg-elevated); outline: 1px dashed var(--oas-color-border); outline-offset: -1px; border-radius: var(--oas-radius-md);">orange 预设</oas-status-bar>
    <oas-status-bar height="36" color="var(--oas-color-danger-text)" style="width: 100%; --oas-status-bar-bg: var(--oas-color-bg-elevated); outline: 1px dashed var(--oas-color-border); outline-offset: -1px; border-radius: var(--oas-radius-md);">CSS 变量色值</oas-status-bar>
  </div>
</DemoBlock>

## 暗色主题

前景色缺省走 `--oas-color-text-primary`，背景由 `--oas-status-bar-bg` 控制；暗色下无需额外配置。下例用局部 `data-theme` 预览暗色：

<DemoBlock title="data-theme=dark 局部暗色">
  <div data-theme="dark" style="background: var(--oas-color-bg); border-radius: var(--oas-radius-md); overflow: hidden; width: 100%;">
    <oas-status-bar height="36" style="width: 100%; --oas-status-bar-bg: var(--oas-color-bg-elevated); outline: 1px dashed var(--oas-color-border); outline-offset: -1px">9:41</oas-status-bar>
    <div style="padding: var(--oas-space-3); font-size: var(--oas-font-size-sm); color: var(--oas-color-text-secondary)">暗色页面内容</div>
  </div>
</DemoBlock>

## API

### oas-status-bar

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `color` | 前景色覆盖（ui-spec §4.1）：11 个预设名取 `--oas-preset-<name>-text` 文字安全档，其余按任意 CSS 色值直接注入；空值恢复 token 默认 | `string` | — |
| `height` | 高度覆盖：纯数字按 px，亦接受 CSS 长度（如 `44px` / `1.5rem`）；缺省读取 `env(safe-area-inset-top)` | `string` | — |

#### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | 状态内容（时间 / 电量等，由宿主绘制） |

#### CSS 变量

| CSS 变量 | 说明 | 默认值 |
| --- | --- | --- |
| `--oas-status-bar-bg` | 背景（默认透明，由宿主决定是否铺色） | `transparent` |
| `--oas-status-bar-color` | 前景色（`color` 属性写入同一变量） | `var(--oas-color-text-primary)` |
| `--oas-status-bar-height` | 高度覆盖（`height` 属性写入同一变量） | `env(safe-area-inset-top, 0px)` |
