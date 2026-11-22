---
description: 整页加载态组件，全屏遮罩 + 转菊花 / 骨架 / 进度三种形态切换，可用 open 属性或 show()/close() 编程控制
---

# PageLoading 整页加载

整页加载态：全屏遮罩盖住页面，内置三种形态——`spinner` 转菊花（默认）、`skeleton` 骨架行、`progress` 进度条。

- 属性 `open` 控制显隐（受控）；也可用 `show()` / `close()` 编程开关
- `mode` 切换形态；`text` 覆盖加载文案（默认 i18n `loading.loading`）
- `skeleton` 形态用 `rows` 控制行数；`progress` 形态用 `value`（0–100）控制进度
- `role="status"` + `aria-live="polite"`；进度轨道同步 `aria-valuenow`
- `prefers-reduced-motion` 下关闭旋转与骨架脉冲动画

## 基础用法

<DemoBlock title="三种形态（每次展示 2 秒后自动 close()）">
  <div style="display: flex; gap: var(--oas-space-2); flex-wrap: wrap;">
    <oas-button id="pl-spinner">转菊花</oas-button>
    <oas-button id="pl-skeleton">骨架屏</oas-button>
    <oas-button id="pl-progress">进度条</oas-button>
  </div>
  <oas-page-loading id="pl-demo" text="正在加载页面…"></oas-page-loading>
  <p id="pl-output" style="margin: 0; font-size: var(--oas-font-size-sm); color: var(--oas-color-text-secondary)">尚未关闭过</p>
</DemoBlock>

## 骨架形态

`skeleton` 形态按 `rows` 生成骨架行，末行自动短一截（1–12 行，越界钳制）：

<DemoBlock title="骨架行数与样式（未打开时不可见）">
  <oas-page-loading mode="skeleton" rows="3" text="内容加载中"></oas-page-loading>
  <p style="margin: 0; font-size: var(--oas-font-size-sm); color: var(--oas-color-text-secondary)">该示例未打开（无 open 属性），点击上方「骨架屏」按钮查看全屏效果。</p>
</DemoBlock>

## 进度形态

`progress` 形态的 `value` 为 0–100 的百分比，越界钳制、非法回落 0；`aria-valuenow` 与宽度同步。

<DemoBlock title="进度条示例（由脚本驱动到 100% 后关闭）">
  <p style="margin: 0; font-size: var(--oas-font-size-sm); color: var(--oas-color-text-secondary)">点击「进度条」按钮查看自动推进动画。</p>
</DemoBlock>

## 编程控制

```js
const loading = document.querySelector('oas-page-loading')
loading.show() // 等价于写入 open 属性
loading.close() // 移除 open 并派发 oas-close
```

`open` 属性由宿主直接移除时静默（不派发事件）；只有调用 `close()` 才派发 `oas-close`，detail 为 `{ mode }`。

<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  customElements.whenDefined('oas-page-loading').then(() => {
    const demo = document.querySelector('#pl-demo')
    let timer = null
    const clear = () => {
      if (timer) {
        clearInterval(timer)
        timer = null
      }
    }
    const closeLater = (ms) => {
      clear()
      timer = setTimeout(() => {
        timer = null
        demo?.close()
      }, ms)
    }
    const show = (mode) => {
      if (!demo) return
      clear()
      demo.setAttribute('mode', mode)
      if (mode === 'skeleton') demo.setAttribute('rows', '5')
      if (mode === 'progress') {
        let value = 10
        demo.setAttribute('value', String(value))
        demo.show()
        timer = setInterval(() => {
          value += 10
          demo.setAttribute('value', String(Math.min(100, value)))
          if (value >= 100) {
            clear()
            setTimeout(() => demo.close(), 320)
          }
        }, 260)
        return
      }
      demo.show()
      closeLater(2000)
    }
    document.querySelector('#pl-spinner')?.addEventListener('click', () => show('spinner'))
    document.querySelector('#pl-skeleton')?.addEventListener('click', () => show('skeleton'))
    document.querySelector('#pl-progress')?.addEventListener('click', () => show('progress'))
    demo?.addEventListener('oas-close', () => {
      const output = document.querySelector('#pl-output')
      if (output) output.textContent = 'oas-close 已派发'
    })
  })
})
</script>

## API

### oas-page-loading

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `mode` | 形态：`spinner`（默认转菊花）/ `skeleton`（骨架行）/ `progress`（进度条）；非法值回落 spinner | `string` | — |
| `open` | 受控显隐（在场=显示全屏遮罩）；宿主直接移除属性静默，不派发事件 | — | — |
| `rows` | 骨架行数（仅 skeleton 形态）：正整数，缺省 4，钳制在 1–12 | `string` | — |
| `text` | 加载文案覆盖；缺省走 i18n `loading.loading` | `string` | — |
| `value` | 进度百分比（仅 progress 形态）：0–100，越界钳制、非法回落 0 | `string` | — |

#### 方法

| 方法 | 签名 | 说明 |
| --- | --- | --- |
| `show` | `show(): void` | 显示加载态（等价于写入 `open` 属性） |
| `close` | `close(): void` | 关闭加载态：移除 `open` 并派发 `oas-close` |

#### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-close` | 调用 `close()` 关闭时派发，`detail: { mode: this.resolveMode() }` |

#### CSS 变量

| CSS 变量 | 说明 | 默认值 |
| --- | --- | --- |
| `--oas-page-loading-bar` | 进度条颜色 | `var(--oas-color-primary)` |
| `--oas-page-loading-bg` | 面板背景 | `var(--oas-color-bg)` |
| `--oas-page-loading-blur` | 遮罩背景模糊 | `none` |
| `--oas-page-loading-color` | 面板文字色 | `var(--oas-color-text-primary)` |
| `--oas-page-loading-mask` | 全屏遮罩色 | `var(--oas-color-overlay)` |
| `--oas-page-loading-max-width` | 面板最大宽度 | `360px` |
| `--oas-page-loading-pulse-duration` | 骨架脉冲周期 | `1.4s` |
| `--oas-page-loading-shadow` | 面板阴影 | `0 8px 32px color-mix(in srgb, var(--oas-color-overlay) 28%, transparent)` |
| `--oas-page-loading-skeleton` | 骨架行颜色 | `color-mix(in srgb, var(--oas-color-text-primary) 10%, transparent)` |
| `--oas-page-loading-spin-duration` | 转菊花旋转周期 | `0.9s` |
| `--oas-page-loading-spinner-color` | 转菊花颜色 | `var(--oas-color-primary)` |
| `--oas-page-loading-spinner-size` | 转菊花尺寸 | `32px` |
| `--oas-page-loading-track` | 进度轨道颜色 | `color-mix(in srgb, var(--oas-color-text-primary) 12%, transparent)` |
