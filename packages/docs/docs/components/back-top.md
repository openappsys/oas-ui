# BackTop 回到顶部

固定于视口角落的回到顶部按钮：滚动超过阈值自动出现，点击平滑滚回顶部。支持自定义目标滚动容器、滚动进度环、反向滚到底、撑满条等形态。

## 基础用法

默认监听 window 滚动：向下滚动超过 `visibility-height`（默认 400px）后按钮自动出现，点击平滑回顶（`prefers-reduced-motion` 下直接跳转）。

<DemoBlock title="基础用法">
  <oas-back-top></oas-back-top>
</DemoBlock>

## 自定义位置

`bottom` / `right` 数值定位（默认 `32px`）。

<DemoBlock title="自定义位置">
  <oas-back-top visible bottom="96px"></oas-back-top>
  <oas-back-top visible right="96px" bottom="32px"></oas-back-top>
</DemoBlock>

## 显隐控制

`visible` 属性存在即受控模式（显隐完全由宿主控制，滚动不干预）；不设置则按滚动阈值自动显隐。两种模式的切换都会派发 `oas-visibility-change`（`detail.visible`）。

<DemoBlock title="显隐控制">
  <oas-button onclick="document.getElementById('bt-ctrl').toggleAttribute('visible')">显示 / 隐藏</oas-button>
  <oas-back-top id="bt-ctrl" bottom="180px" onoas-visibility-change="document.getElementById('bt-state').textContent = '状态：' + (event.detail.visible ? '显示' : '隐藏')"></oas-back-top>
  <p id="bt-state" style="color: var(--oas-color-text-secondary)">状态：隐藏</p>
</DemoBlock>

## 点击事件

<DemoBlock title="点击事件">
  <oas-button onclick="document.getElementById('bt-event').setAttribute('visible','')">显示按钮</oas-button>
  <oas-back-top id="bt-event" visible bottom="240px" onoas-click="message.info('即将平滑回到顶部')"></oas-back-top>
</DemoBlock>

## 自定义内容

默认插槽渲染自定义内容（有内容时替换内置箭头图标）。

<DemoBlock title="自定义内容">
  <oas-back-top visible bottom="280px" right="96px">⬆ 顶部</oas-back-top>
</DemoBlock>

## 阈值与目标容器

`visibility-height` 调整自动显隐阈值（默认 400）；`target` 指定滚动目标容器（CSS 选择器，默认 window）：容器内滚动超出阈值后按钮自动出现，点击滚动回该容器顶部。

<DemoBlock title="阈值与目标容器">
  <div id="bt-scroll-box" style="height: 200px; overflow: auto; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-4); background: var(--oas-color-bg-hover)">
    <p style="color: var(--oas-color-text-secondary)">这是局部滚动容器：向下滚动超过 200px 后，右下角按钮自动出现，点击回到容器顶部。</p>
    <p style="margin-top: 600px; color: var(--oas-color-text-secondary)">容器底部——滚动回来试试。</p>
  </div>
  <oas-back-top target="#bt-scroll-box" visibility-height="200" bottom="96px" right="80px"></oas-back-top>
</DemoBlock>

## 滚动时长与缓动

`duration` 控制滚动时长（毫秒）；`easing` 选择缓动曲线（默认 `quart-out`）。

<DemoBlock title="滚动时长与缓动">
  <oas-back-top visible duration="1200" easing="back-out" bottom="320px" right="96px"></oas-back-top>
</DemoBlock>

## 形状与尺寸

`shape` 圆形（默认）/ 方形；`size` 三档尺寸：`small`（32px）/ `medium`（默认 40px）/ `large`（48px）。

<DemoBlock title="形状与尺寸">
  <oas-back-top visible shape="square" size="large" bottom="360px" right="96px"></oas-back-top>
  <oas-back-top visible size="small" bottom="360px"></oas-back-top>
</DemoBlock>

## 主题变体

`theme` 三种主题变体：`light`（默认）/ `primary` / `dark`（dark 主题下自动反色保持对比）。

<DemoBlock title="主题变体">
  <oas-back-top visible theme="primary" bottom="400px" right="96px"></oas-back-top>
  <oas-back-top visible theme="dark" bottom="400px"></oas-back-top>
</DemoBlock>

## 过渡动画

`transition` 切换进出场过渡：`fade`（默认）/ `scale` / `none`（`prefers-reduced-motion` 下自动停用）。

<DemoBlock title="过渡动画">
  <oas-back-top visible transition="scale" bottom="440px" right="96px"></oas-back-top>
  <oas-back-top visible transition="none" bottom="440px"></oas-back-top>
</DemoBlock>

## 滚动进度

`show-progress` 在按钮边缘显示滚动进度环（按 `target` 容器滚动范围计算）。

<DemoBlock title="滚动进度">
  <oas-back-top visible show-progress bottom="480px"></oas-back-top>
</DemoBlock>

## 反向滚到底

`reverse` 切换为「滚到底部」按钮：靠近容器底部时自动隐藏，点击滚动到容器底部。

<DemoBlock title="反向滚到底">
  <div id="bt-rev-box" style="height: 200px; overflow: auto; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-4); background: var(--oas-color-bg-hover)">
    <p style="color: var(--oas-color-text-secondary)">这是局部滚动容器：`reverse` 模式下按钮在「不在底部」时出现，点击滚到容器底部。</p>
    <p style="margin-top: 600px; color: var(--oas-color-text-secondary)">容器底部。</p>
  </div>
  <oas-back-top reverse target="#bt-rev-box" bottom="96px" right="80px"></oas-back-top>
</DemoBlock>

## 撑满条

`expand` 让按钮撑满视口底部全宽（内容横向居中），忽略 `position` / `bottom` / `right` 定位。下面这个实例在页面滚动超过阈值后出现在底部，点击回顶后自动消失。

<DemoBlock title="撑满条">
  <oas-back-top expand>返回顶部 ↑</oas-back-top>
</DemoBlock>

## 方位

`position` 8 方位枚举定位（替代 `bottom` / `right`）：`top-left` / `top-center` / `top-right` / `middle-left` / `middle-right` / `bottom-left` / `bottom-center` / `bottom-right`（`middle-*` 垂直居中）。

<DemoBlock title="方位">
  <oas-back-top visible position="bottom-left"></oas-back-top>
  <oas-back-top visible position="bottom-center"></oas-back-top>
</DemoBlock>

## 提示与徽标

`tooltip` 悬停/键盘聚焦时显示气泡提示；`badge` 在按钮右上角显示角标内容。

<DemoBlock title="提示与徽标">
  <oas-back-top visible tooltip="回到顶部" badge="3" bottom="560px" right="96px"></oas-back-top>
</DemoBlock>

## 挂载点

`append-to` 把组件迁移到指定容器下渲染（teleport）。下面的实例会把宿主迁移到 `#bt-app-root` 下（打开开发者工具可见 DOM 位置变化）。

<DemoBlock title="挂载点">
  <div id="bt-app-root" style="border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-3); color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">挂载目标容器 #bt-app-root</div>
  <oas-back-top append-to="#bt-app-root" bottom="600px"></oas-back-top>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  const { message } = await import('@oas-ui/ui')
  window.message = message
})
</script>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `append-to` | teleport 挂载点：CSS 选择器，连接后把组件迁移到该容器下（不设置则保持原位） | `string` | — |
| `badge` | 角标内容：按钮右上角小徽标显示的文本/数字 | `string` | — |
| `bottom` | 距视口底部距离 | `string` | `32px` |
| `duration` | 平滑滚动时长（毫秒），默认 400；0 或 `prefers-reduced-motion` 时直接跳转 | `string` | `400` |
| `easing` | 滚动缓动函数：`linear` / `ease` / `ease-in` / `ease-out` / `ease-in-out` / `quad-*` / `cubic-*` / `quart-*` / `quint-*` / `expo-*` / `circ-*` / `back-*`，默认 `quart-out` | `string` | `quart-out` |
| `expand` | 撑满条模式：按钮撑满视口底部全宽（内容横向居中），忽略 `position` / `bottom` / `right` 定位 | `boolean` | — |
| `position` | 8 方位枚举：`top-left` / `top-center` / `top-right` / `middle-left` / `middle-right` / `bottom-left` / `bottom-center` / `bottom-right`；设置后替代 `bottom` / `right` 数值定位（`middle-*` 垂直居中），非法值静默回落 `bottom` / `right` | `string` | — |
| `reverse` | 反向模式：变为「滚到底部」按钮（靠近容器底部时隐藏，点击滚动到容器底部） | `boolean` | — |
| `right` | 距视口右侧距离 | `string` | `32px` |
| `shape` | 按钮形状：`circle`（默认圆形）/ `square`（方角） | `string` | `circle` |
| `show-progress` | 滚动进度环：按钮边缘显示当前滚动进度（SVG 圆环，按 `target` 容器滚动范围计算） | `boolean` | — |
| `size` | 尺寸档位：`small`（32px）/ `medium`（默认 40px）/ `large`（48px） | `string` | `medium` |
| `target` | 滚动目标容器：CSS 选择器；设置后监听该容器滚动并滚动回其顶部/底部（默认 window） | `string` | — |
| `theme` | 主题变体：`light`（默认浅色）/ `primary`（主色填充）/ `dark`（深色底，dark 主题下自动反色保持对比） | `string` | `light` |
| `tooltip` | 悬停提示文本：hover / 键盘聚焦时显示气泡提示 | `string` | — |
| `transition` | 进出场过渡：`fade`（默认淡入淡出）/ `scale`（缩放）/ `none`（无过渡），`prefers-reduced-motion` 下自动停用 | `string` | `fade` |
| `visibility-height` | 滚动阈值（px）：滚动超过该值自动显示按钮，默认 400 | `string` | `400` |
| `visible` | 受控显隐：存在即受控模式（完全由宿主控制显隐，滚动不干预）；不存在则按滚动阈值自动显隐 | `boolean` | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-click` | 点击按钮（随后滚动到目标容器顶部/底部） |
| `oas-visibility-change` | 显隐状态变化，`detail: { visible: boolean }`（受控与非受控切换都会派发，挂载时的初始同步不派发） |

### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | 自定义按钮内容（有内容时替换内置箭头图标） |

按钮固定于视口（`:host` 为 fixed 定位，`z-index` 走 `--oas-z-fixed`）；未显示时按钮 `aria-hidden="true"` 且宿主 `pointer-events: none` 不拦截底层点击。
