---
description: 一次性全屏幕帘，首次进入自动弹出、关闭后本地记忆不再打扰；支持标题、关闭按钮、Esc、可选遮罩关闭与 reset() 清除记忆
---

# Curtain 幕帘

进入页面后一次性展示的全屏浮层：首次进入自动弹出，用户关闭后写入本地记忆，之后不再打扰。适合公告、引导、活动弹窗等「只打扰一次」的场景。

- 首次挂载读取 `localStorage`：未关闭过则自动展开；关闭后写入记忆
- 宿主也可直接用 `open` 属性控制显隐（受控优先于自动判定）；`auto="false"` 关闭自动弹出
- `storage-key` 指定记忆键（默认 `oas-curtain`），同一 key 多实例共享状态
- `persist="false"` 不写本地记忆（每次进入都弹）；`reset()` 清除记忆
- 关闭方式：关闭按钮 / Esc / `mask-closable` 时点击内容区外；`close()` 命令式关闭
- `role="dialog"` + `aria-modal="true"`，打开时焦点进入关闭按钮，Tab 在面板内循环，关闭后焦点回到原处

## 基础用法

<DemoBlock title="打开 / 清除记忆（auto=false 便于在文档中手动触发）">
  <div style="display: flex; flex-direction: column; gap: var(--oas-space-2)">
    <div style="display: flex; gap: var(--oas-space-2); flex-wrap: wrap;">
      <oas-button id="ct-open">打开幕帘</oas-button>
      <oas-button id="ct-reset" size="small">清除本地记忆</oas-button>
      <span id="ct-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">本地记忆：未关闭</span>
    </div>
    <oas-curtain id="ct-demo" heading="欢迎使用" storage-key="oas-docs-curtain" auto="false">
      <p style="margin: 0 0 var(--oas-space-3)">这是一次性幕帘：关闭后写入本地记忆，下次进入不再自动弹出。</p>
      <p style="margin: 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">点击右上角关闭，或用 Esc 退出。</p>
    </oas-curtain>
  </div>
</DemoBlock>

## 自动弹出（真实默认行为）

不写 `auto="false"` 时，首次进入会自动展开（读取本地记忆决定是否打扰）。文档页为避免遮挡内容，所有示例都显式关闭了自动弹出；上面的「打开幕帘」按钮等价于首次自动弹出后的状态。

<DemoBlock title="缺省 auto：真实接入即自动弹出">
  <p style="margin: 0; font-size: var(--oas-font-size-sm); color: var(--oas-color-text-secondary)">生产页面直接引入 <code>&lt;oas-curtain&gt;</code> 即可，无需脚本；关闭一次后本地记忆生效，刷新不再弹出。</p>
</DemoBlock>

## 点击遮罩关闭

默认只有关闭按钮与 Esc 能退出；`mask-closable` 允许点击内容区外的遮罩关闭：

<DemoBlock title="mask-closable">
  <oas-curtain id="ct-mask" heading="点击空白处关闭" mask-closable auto="false" storage-key="oas-docs-curtain-mask">
    <p style="margin: 0">点击卡片外的空白区域即可关闭。</p>
  </oas-curtain>
  <oas-button id="ct-mask-open" size="small">打开可点遮罩关闭的幕帘</oas-button>
</DemoBlock>

## 方法

见下方 API 的「方法」表（`show` / `close` / `reset`）。

<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  customElements.whenDefined('oas-curtain').then(() => {
    const demo = document.querySelector('#ct-demo')
    const output = document.querySelector('#ct-output')
    const refresh = () => {
      const dismissed = window.localStorage.getItem('oas-docs-curtain') === '1'
      if (output) output.textContent = dismissed ? '本地记忆：已关闭过' : '本地记忆：未关闭'
    }
    refresh()
    document.querySelector('#ct-open')?.addEventListener('click', () => demo?.show())
    document.querySelector('#ct-reset')?.addEventListener('click', () => {
      demo?.reset()
      refresh()
      if (output) output.textContent = '本地记忆：已清除'
    })
    demo?.addEventListener('oas-close', (event) => {
      refresh()
      if (output) output.textContent = `已关闭（${event.detail.reason}），本地记忆：已关闭过`
    })
    document.querySelector('#ct-mask-open')?.addEventListener('click', () => document.querySelector('#ct-mask')?.show())
  })
})
</script>

## API

### oas-curtain

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `auto` | 自动弹出开关：缺省自动判定；`"false"` 关闭自动弹出（文档/嵌入手动控制） | `string` | — |
| `heading` | 标题；缺省为空，使用默认插槽承载自定义内容 | `string` | — |
| `mask-closable` | 布尔，存在时点击内容区外的遮罩可关闭（默认只能关闭按钮 / Esc） | — | — |
| `open` | 受控显隐（在场=展开；受控优先于自动判定） | — | — |
| `persist` | 值布尔：缺省/任意非 `"false"` = 记住关闭；`"false"` = 不写本地记忆、每次进入都弹 | `string` | — |
| `storage-key` | 本地记忆键（默认 `oas-curtain`）；同一 key 多实例共享已关闭状态 | `string` | — |

#### 方法

| 方法 | 签名 | 说明 |
| --- | --- | --- |
| `show` | `show(): void` | 强制展开（不清理本地记忆） |
| `close` | `close(reason: CloseReason): void` | 关闭并写入本地记忆（persist 生效时），派发 `oas-close` |
| `reset` | `reset(): void` | 清除本地记忆（不改变当前显隐） |

#### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-close` | 关闭时派发（reason: button / esc / backdrop / api） |

#### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | 幕帘主体内容 |

#### CSS 变量

| CSS 变量 | 说明 | 默认值 |
| --- | --- | --- |
| `--oas-curtain-bg` | 全屏背景 | `var(--oas-color-bg)` |
| `--oas-curtain-color` | 文字色 | `var(--oas-color-text-primary)` |
| `--oas-curtain-duration` | 入场淡入时长 | `var(--oas-transition-base)` |
| `--oas-curtain-max-width` | 内容卡片最大宽度 | `420px` |
| `--oas-curtain-panel-bg` | 内容卡片背景 | `var(--oas-color-bg-elevated)` |
