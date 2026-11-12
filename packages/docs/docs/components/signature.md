# Signature 签名板

canvas 笔迹捕获的签名板组件：pointer 事件覆盖 mouse/pen/touch，DPR 高清渲染，笔色跟随主题 token（暗色自动翻转），容器 resize 笔迹保留，`value`（PNG dataURL）双通道受控。

## 基础用法

<DemoBlock title="基本签名">
  <oas-signature id="sig-basic" clearable style="max-width: 480px"></oas-signature>
  <p id="sig-basic-out" style="width: 100%; margin: var(--oas-space-3) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    在画布上按住拖动即可签名；笔画结束（抬起）时派发 <code>oas-change</code>。
  </p>
</DemoBlock>

`value` 为签名图像的 PNG dataURL：笔画结束自动写入属性并派发 `oas-change`（detail `{ value }`，同值指纹不重复派发）。`clearable` 在场显示「清空」按钮；也可用 `clear()` 方法程序化清空（幂等，已空时零操作）。**单击（按下即抬起、无位移）不成笔**——不产生 value、状态不翻转；进行中的笔画只认首指，第二指/手掌不会污染笔迹。

## 受控 value

<DemoBlock title="受控回显（签名 → 只读回显板）">
  <div style="width: 100%; display: flex; gap: var(--oas-space-4); align-items: flex-start; flex-wrap: wrap">
    <div style="flex: 1 1 260px; min-width: 260px">
      <oas-signature id="sig-src" clearable></oas-signature>
      <p style="margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">在此签名</p>
    </div>
    <div style="flex: 1 1 260px; min-width: 260px">
      <oas-signature id="sig-echo" readonly></oas-signature>
      <p id="sig-echo-out" style="margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">右侧为只读回显板</p>
    </div>
  </div>
</DemoBlock>

宿主写入 `value`（如把左侧签名的 dataURL 赋给右侧）即受控回显：组件清空本地笔迹并加载外部图像（contain 居中）。回写组件**刚派发的同一个值不会触发清空**（受控闭环不震荡）。程序化读取用 `toDataURL()`：空画布返回空串。

## 禁用与只读

<DemoBlock title="disabled / readonly">
  <div style="width: 100%; display: flex; gap: var(--oas-space-4); align-items: flex-start; flex-wrap: wrap">
    <div style="flex: 1 1 260px; min-width: 260px">
      <oas-signature disabled></oas-signature>
      <p style="margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">disabled：完全不可签名</p>
    </div>
    <div style="flex: 1 1 260px; min-width: 260px">
      <oas-signature id="sig-ro" readonly></oas-signature>
      <p style="margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">readonly：保留笔迹，仅禁止修改</p>
    </div>
  </div>
</DemoBlock>

`disabled` / `readonly` 均为在场语义：拦截笔画开始（move/up 同样无效）。`readonly` 保留既有笔迹展示与 `value`；两者同时使清空按钮置灰。

## 笔迹样式

<DemoBlock title="pen-size / pen-color / height">
  <div style="width: 100%; display: flex; gap: var(--oas-space-4); align-items: flex-start; flex-wrap: wrap">
    <div style="flex: 1 1 220px; min-width: 220px">
      <oas-signature clearable pen-size="4" pen-color="blue"></oas-signature>
      <p style="margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">pen-size=4 · pen-color=blue</p>
    </div>
    <div style="flex: 1 1 220px; min-width: 220px">
      <oas-signature clearable pen-color="#c41d7f" height="120"></oas-signature>
      <p style="margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">pen-color=#c41d7f · height=120</p>
    </div>
  </div>
</DemoBlock>

`pen-size` 默认 2（px，非法值回退）；`pen-color` 支持 11 个预设名（`magenta / red / volcano / orange / gold / lime / green / cyan / blue / geekblue / purple`，走 `--oas-preset-*` token 含 dark 变体）或任意 CSS 色值，缺省 `var(--oas-color-text-primary)` 跟随主题——**主题切换笔迹自动重解析重绘**。`height` 控制画布高度（px，默认 160），宽度随宿主 100%。

## 暗色主题

<DemoBlock title="暗色下的签名板">
  <div data-theme="dark" style="width: 100%; padding: var(--oas-space-4); border-radius: var(--oas-radius-md); background: var(--oas-color-bg); box-sizing: border-box">
    <oas-signature clearable></oas-signature>
  </div>
  <p style="width: 100%; margin: var(--oas-space-3) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    笔迹默认色为 <code>--oas-color-text-primary</code>，暗色下自动翻转为浅色；画板底色/边框走 <code>--oas-color-bg-elevated</code> / <code>--oas-color-border</code> token。
  </p>
</DemoBlock>

## 无障碍与 forced-colors

画布挂 `role="img"`，可访问名随状态变化（「签名画板，未签名 / 已签名」），并以 `aria-live="polite"` 区域播报状态翻转；「清空」为原生 button，键盘可达、focus-visible 有焦点环。forced-colors（Windows 高对比）下 canvas 笔迹不可被系统换色——这是 canvas 的固有限制，v1 以签名区 1px 边框保障边界可见，不提供 DOM 描边副本；签名图像的对比度由宿主选定的 `pen-color` 负责。

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  customElements.whenDefined('oas-signature').then(() => {
    const basic = document.getElementById('sig-basic')
    const basicOut = document.getElementById('sig-basic-out')
    basic?.addEventListener('oas-change', (e) => {
      const v = e.detail?.value ?? ''
      if (basicOut) {
        basicOut.textContent = v
          ? `oas-change 已派发：value 为 PNG dataURL（${v.length} 字符）`
          : 'oas-change 已派发：value 已清空'
      }
    })
    const src = document.getElementById('sig-src')
    const echo = document.getElementById('sig-echo')
    const echoOut = document.getElementById('sig-echo-out')
    src?.addEventListener('oas-change', (e) => {
      const v = e.detail?.value ?? ''
      if (echo) echo.setAttribute('value', v)
      if (echoOut) {
        echoOut.textContent = v
          ? `受控回显：已写入 ${v.length} 字符的 dataURL`
          : '受控回显：已清空'
      }
    })
  })
})
</script>

## 边界

- 主题观察只监听 `documentElement` 级（html 的 `class` / `data-theme`）切换；容器级 `data-theme` 运行时切换不会立刻重解析笔色，在下一次 repaint（如容器 resize）时生效。笔画进行中触发 resize / 主题切换，已画段会随重绘完整保留，不丢笔。
- `disabled` / `readonly` 在笔画进行中置位时，当前笔画会正常画完（已捕获轨迹完整入值）；从下一笔起新笔画才被拦截。

## API

### oas-signature

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `clearable` | 显示清空按钮 | `boolean` | — |
| `disabled` | 禁用（拦截笔画） | `boolean` | — |
| `height` | 画布高度（px，默认 160） | `string` | `160` |
| `pen-color` | 笔迹颜色（11 预设名或 CSS 色值，缺省跟随主题文字色） | `string` | — |
| `pen-size` | 笔迹粗细（px，默认 2） | `string` | `2` |
| `readonly` | 只读（拦截笔画，保留笔迹展示） | `boolean` | — |
| `value` | 签名图像（PNG dataURL），双通道可受控 | `string` | — |

#### 方法

| 方法 | 签名 | 说明 |
| --- | --- | --- |
| `clear` | `clear(): void` | 清空画布与笔迹，value 归空并按指纹派发 oas-change |
| `toDataURL` | `toDataURL(): string` | 当前画布 PNG dataURL；空画布（无笔迹且无外部图像）或无 canvas 环境时返回空串 |

#### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-change` | 笔画结束或清空时派发（同值幂等去重），`detail: { value: url } \| { value: '' }` |
