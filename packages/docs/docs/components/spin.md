# Spin 加载中

加载指示器，可单独使用，也可包裹内容并叠加遮罩；支持文案、进度、全屏与自定义指示器。

## 基础用法

`size` 支持 `xs` / `small` / `medium`（默认）/ `large` / `xl` 五档；旧缩写 `sm`/`md`/`lg` 保留兼容。

<DemoBlock title="五种尺寸">
  <oas-space size="large">
    <oas-spin size="xs"></oas-spin>
    <oas-spin size="small"></oas-spin>
    <oas-spin></oas-spin>
    <oas-spin size="large"></oas-spin>
    <oas-spin size="xl"></oas-spin>
  </oas-space>
</DemoBlock>

<DemoBlock title="旧缩写别名（sm / md / lg）">
  <oas-space size="large">
    <oas-spin size="sm"></oas-spin>
    <oas-spin size="md"></oas-spin>
    <oas-spin size="lg"></oas-spin>
  </oas-space>
</DemoBlock>

`size` 还接受任意 CSS 尺寸：纯数字按 `px` 解释，带单位值（`2rem` / `40px` / `10%`）与 `calc()` 直取。

<DemoBlock title="任意值尺寸">
  <oas-space size="large" direction="vertical">
    <oas-space size="large">
      <oas-spin size="24"></oas-spin>
      <oas-spin size="36"></oas-spin>
      <oas-spin size="48px"></oas-spin>
      <oas-spin size="2rem"></oas-spin>
    </oas-space>
    <oas-spin size="calc(100% - 8px)" style="width: 220px" tip="calc 撑满容器"></oas-spin>
  </oas-space>
</DemoBlock>

## 形态变体

`variant` 提供三档形态：`ring`（默认边框环）/ `dot`（三点脉冲）/ `bars`（三条伸缩），尺寸体系三形态通用。

<DemoBlock title="ring / dot / bars">
  <oas-space size="large">
    <oas-spin size="large" variant="ring"></oas-spin>
    <oas-spin size="large" variant="dot"></oas-spin>
    <oas-spin size="large" variant="bars"></oas-spin>
  </oas-space>
</DemoBlock>

<DemoBlock title="dot 行内小尺寸（文字旁加载）">
  <oas-space size="small" align="center">
    <span>加载更多</span>
    <oas-spin size="xs" variant="dot"></oas-spin>
  </oas-space>
</DemoBlock>

## 加载文案 tip

`tip` 属性配纯文本，具名 `tip` 插槽配富内容（插槽优先）；`tip-position` 控制文案方位（`above` / `below` 默认 / `before` / `after`）；`hide-icon` 只要文案不要指示器。

<DemoBlock title="tip 文案与四向方位">
  <oas-space size="large">
    <oas-spin tip="下方（默认）"></oas-spin>
    <oas-spin tip="上方" tip-position="above"></oas-spin>
    <oas-spin tip="前方" tip-position="before"></oas-spin>
    <oas-spin tip="后方" tip-position="after"></oas-spin>
  </oas-space>
</DemoBlock>

<DemoBlock title="富文案插槽与 hide-icon">
  <oas-space size="large">
    <oas-spin size="large">
      <span slot="tip" style="color: var(--oas-preset-cyan-text)">富文案<b>插槽</b></span>
    </oas-spin>
    <oas-spin tip="只有文案的加载态" hide-icon></oas-spin>
  </oas-space>
</DemoBlock>

## 包裹内容

包裹内容时指示器与文案居中显示并叠加半透明遮罩；`show-overlay="false"` 关闭遮罩。

<DemoBlock title="包裹内容">
  <oas-spin spinning tip="数据加载中">
    <div style="width: 280px; height: 96px; display: flex; align-items: center; justify-content: center; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md)">
      加载中的内容区域
    </div>
  </oas-spin>
</DemoBlock>

<DemoBlock title="关闭遮罩（show-overlay=&quot;false&quot;）">
  <oas-spin spinning show-overlay="false" tip="无遮罩模式">
    <div style="width: 280px; height: 96px; display: flex; align-items: center; justify-content: center; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md)">
      内容保持完全可见
    </div>
  </oas-spin>
</DemoBlock>

## delay 防闪烁

请求快于动画感知时，指示器一闪而过反而干扰。`delay`（毫秒）让指示器延迟出现：延迟窗口内加载结束则完全不出现；`aria-busy` 语义立即生效不受延迟影响。

<DemoBlock title="快速请求不闪烁">
  <oas-space direction="vertical">
    <oas-spin id="spin-delay-demo" delay="800" tip="加载中">
      <div style="width: 280px; height: 96px; display: flex; align-items: center; justify-content: center; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md)">
        200ms 快速请求 → 不出现；2s 慢请求 → 延迟后出现
      </div>
    </oas-spin>
    <oas-space>
      <oas-button size="small" onclick="spinFastRequest()">快速请求（200ms，不闪烁）</oas-button>
      <oas-button size="small" onclick="spinSlowRequest()">慢请求（2s，延迟后出现）</oas-button>
    </oas-space>
  </oas-space>
</DemoBlock>

## 自定义指示器

具名 `icon` 插槽替换默认环（尺寸由内容自带）；`rotate` 属性让自定义指示器旋转——普通 SVG 图标加 `rotate`，GIF / 静态 SVG 不加即保持静止。

<DemoBlock title="icon 插槽与 rotate">
  <oas-space size="large">
    <oas-spin size="large">
      <svg slot="icon" width="32" height="32" viewBox="0 0 24 24" fill="none">
        <path d="M12 3a9 9 0 1 0 9 9" stroke="var(--oas-color-primary)" stroke-width="2.5" stroke-linecap="round"/>
      </svg>
    </oas-spin>
    <oas-spin size="large" rotate>
      <svg slot="icon" width="32" height="32" viewBox="0 0 24 24" fill="none">
        <path d="M12 3a9 9 0 1 0 9 9" stroke="var(--oas-preset-cyan-text)" stroke-width="2.5" stroke-linecap="round"/>
      </svg>
    </oas-spin>
    <oas-spin size="large" tip="静态图标不转">
      <span slot="icon" style="font-size: 30px; line-height: 1">◈</span>
    </oas-spin>
  </oas-space>
</DemoBlock>

## 进度模式 percent

未知时长用默认形态；已知进度时 `percent`（0-100）切换为 determinate 进度环（`role="progressbar"` + `aria-value` 三件套）；`percent="auto"` 在加载期间自动推进模拟进度（上限 90%，结束后从头推进）。确定进度场景也可用 [Progress 进度](/components/progress) 的 circle 形态。

<DemoBlock title="determinate 进度环">
  <oas-space size="large">
    <oas-spin percent="0" size="large"></oas-spin>
    <oas-spin percent="35" size="large"></oas-spin>
    <oas-spin percent="70" size="large"></oas-spin>
    <oas-spin percent="100" size="large"></oas-spin>
  </oas-space>
</DemoBlock>

<DemoBlock title="进度步进与 auto 模拟进度">
  <oas-space size="large">
    <oas-spin id="spin-step-demo" percent="20" size="large" tip="点击按钮步进"></oas-spin>
    <oas-spin percent="auto" spinning size="large" tip="auto 自动推进"></oas-spin>
    <oas-button size="small" onclick="spinStepPercent()">进度 +15</oas-button>
  </oas-space>
</DemoBlock>

## 暂停 paused

`paused` 冻结循环动画（保留当前帧），用于截图 / 演示 / 逐帧检查场景。

<DemoBlock title="paused 冻结对比">
  <oas-space size="large">
    <oas-spin size="large"></oas-spin>
    <oas-spin size="large" paused></oas-spin>
    <oas-spin size="large" variant="dot"></oas-spin>
    <oas-spin size="large" variant="dot" paused></oas-spin>
  </oas-space>
</DemoBlock>

## 视觉定制

组件级 CSS 变量：`--oas-spin-indicator-color`（指示色）/ `--oas-spin-track-color`（轨道色）/ `--oas-spin-border-width`（线宽）/ `--oas-spin-duration`（动画时长）/ `--oas-spin-mask-bg`（遮罩背景）/ `--oas-spin-z-index`（全屏层级）。`inherit-color` 让指示色继承宿主文字色；`block` 让宿主占满一行。

<DemoBlock title="CSS 变量定制">
  <oas-space size="large">
    <div style="--oas-spin-indicator-color: var(--oas-preset-cyan-text); --oas-spin-track-color: var(--oas-preset-geekblue-text); --oas-spin-border-width: 6px; --oas-spin-duration: 2s;">
      <oas-spin size="large"></oas-spin>
    </div>
    <div style="--oas-spin-duration: 1.6s">
      <oas-spin size="large" variant="dot"></oas-spin>
    </div>
    <div style="--oas-spin-mask-bg: color-mix(in srgb, var(--oas-preset-cyan-text) 18%, transparent)">
      <oas-spin spinning size="large">
        <div style="width: 180px; height: 80px; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md)"></div>
      </oas-spin>
    </div>
  </oas-space>
</DemoBlock>

<DemoBlock title="inherit-color 继承文字色">
  <oas-space size="large">
    <oas-space size="small" style="color: var(--oas-preset-magenta-text)">
      <span>品牌色文字</span>
      <oas-spin inherit-color></oas-spin>
    </oas-space>
    <oas-space size="small" style="color: var(--oas-preset-green-text)">
      <span>成功色文字</span>
      <oas-spin inherit-color variant="dot"></oas-spin>
    </oas-space>
  </oas-space>
</DemoBlock>

## 全屏加载

`fullscreen` 属性进入全屏遮罩居中加载；命令式 `OASSpin.fullscreen()` 返回 `{ close }` 句柄，适合异步流程中直接调用（可叠用，各句柄独立关闭）。

<DemoBlock title="全屏加载（2 秒后自动关闭）">
  <oas-space>
    <oas-button type="primary" onclick="spinFullscreenOnce()">全屏加载 2s</oas-button>
    <oas-button onclick="spinFullscreenDelay()">带 delay 的全屏（3s）</oas-button>
  </oas-space>
</DemoBlock>

## 全局默认指示器

`OASSpin.setDefaultIndicator(html)` 注册品牌加载动画：此后**新建**的实例在未用 `icon` 插槽时渲染注册的 HTML 替代内置环；传 `null` 恢复。优先级：`icon` 插槽 > 全局默认 > 内置环。

<DemoBlock title="注册全局指示器并新建实例">
  <oas-space direction="vertical">
    <oas-space>
      <oas-button size="small" onclick="spinSetGlobalIndicator()">注册并新建实例</oas-button>
      <oas-button size="small" onclick="spinResetGlobalIndicator()">恢复内置并新建实例</oas-button>
    </oas-space>
    <div id="spin-global-slot"></div>
  </oas-space>
</DemoBlock>

## 无障碍

- 指示器 `role="status"`，内置视觉隐藏读屏文案（默认走 locale 的「加载中…」，设置 `tip` 后读 `tip`，宿主 `aria-label` 优先级最高）
- 进度模式切换为 `role="progressbar"` 并同步 `aria-valuemin/max/now`
- 宿主 `aria-busy` 随 `spinning` 立即同步；区域加载建议为内容容器补充 `aria-busy` 并以 `aria-describedby` 指向 spin：

```html
<section aria-busy="true" aria-describedby="page-spin">
  <oas-spin id="page-spin" spinning tip="加载中"></oas-spin>
  <!-- 区域内容 -->
</section>
```

- 系统开启「减少动态效果」时动画自动降级为静态指示器（`prefers-reduced-motion`）

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  const { OASSpin } = await import('@oas-ui/ui')

  window.spinFastRequest = () => {
    const el = document.getElementById('spin-delay-demo')
    el.setAttribute('spinning', '')
    setTimeout(() => el.removeAttribute('spinning'), 200)
  }
  window.spinSlowRequest = () => {
    const el = document.getElementById('spin-delay-demo')
    el.setAttribute('spinning', '')
    setTimeout(() => el.removeAttribute('spinning'), 2000)
  }

  window.spinStepPercent = () => {
    const el = document.getElementById('spin-step-demo')
    const next = Math.min(100, Number(el.getAttribute('percent') || '0') + 15)
    el.setAttribute('percent', String(next))
  }

  window.spinFullscreenOnce = () => {
    const h = OASSpin.fullscreen({ tip: '全屏加载中' })
    setTimeout(() => h.close(), 2000)
  }
  window.spinFullscreenDelay = () => {
    const h = OASSpin.fullscreen({ tip: '延迟出现的全屏加载', delay: 800 })
    setTimeout(() => h.close(), 3000)
  }

  const spawnGlobal = () => {
    const host = document.getElementById('spin-global-slot')
    host.innerHTML = ''
    const el = document.createElement('oas-spin')
    el.setAttribute('size', 'large')
    el.setAttribute('tip', '全局默认指示器')
    host.appendChild(el)
  }
  window.spinSetGlobalIndicator = () => {
    OASSpin.setDefaultIndicator(
      '<span style="font-size: 30px; line-height: 1; color: var(--oas-color-primary)">◈</span>',
    )
    spawnGlobal()
  }
  window.spinResetGlobalIndicator = () => {
    OASSpin.setDefaultIndicator(null)
    spawnGlobal()
  }
})
</script>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `aria-label` | 读屏文案（aria-busy 同步） | — | — |
| `block` | 块级铺满容器宽度 | — | — |
| `delay` | 防闪烁延迟（ms）：spinning 置位后延迟渲染，delay 内结束则完全不出现 | `string` | — |
| `fullscreen` | 全屏加载（遮罩铺满视口） | — | — |
| `hide-icon` | 隐藏默认指示器（配合 slot="icon" 或纯文案） | `boolean` | — |
| `inherit-color` | 指示器继承宿主文字色 | — | — |
| `paused` | 暂停旋转（进度模式冻结推进） | — | — |
| `percent` | 进度模式：number 显式百分比或 auto（未知进度模拟推进） | `string` | — |
| `rotate` | 自定义指示器是否自动旋转（默认 true；gif/静态 SVG 关闭） | `boolean` | — |
| `show-overlay` | 包裹内容时是否显示遮罩 | `string` | `true` |
| `size` | 指示器尺寸：`xs` / `small` / `medium`（默认）/ `large` / `xl`；旧缩写 `sm`/`md`/`lg` 保留兼容 | `string` | `md` |
| `spinning` | 是否加载中；设置后包裹内容并叠加遮罩 | `boolean` | — |
| `tip` | 加载文案（独立态显示于指示器下方，包裹态显示于遮罩中央）；富内容用 slot="tip" | `string` | — |
| `tip-position` | 文案位置 | `string` | `below` |
| `variant` | 形态变体 | `string` | `ring` |

### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | 被包裹的内容（包裹态叠加遮罩） |
| `icon` | 自定义指示器插槽，替换默认圆环 |
| `tip` | 加载文案富内容插槽，覆盖 tip 属性 |

### CSS 变量

| 变量 | 说明 | 默认值 |
| --- | --- | --- |
| `--oas-spin-indicator-color` | 指示色 | `var(--oas-color-primary)` |
| `--oas-spin-track-color` | 轨道色（环底色 / 进度环轨道） | `var(--oas-color-bg-hover)` |
| `--oas-spin-border-width` | 线宽（环边框 / 进度环描边） | `3px`（xs/small 档 `2px`） |
| `--oas-spin-duration` | 动画时长 | `0.8s` |
| `--oas-spin-mask-bg` | 遮罩背景 | `color-mix(in srgb, var(--oas-color-bg) 70%, transparent)` |
| `--oas-spin-z-index` | 全屏层级 | `3500` |

### 静态方法

| 方法 | 说明 |
| --- | --- |
| `OASSpin.fullscreen(options?)` | 命令式全屏加载，返回 `{ close() }`；`options`: `{ tip?: string; delay?: number }` |
| `OASSpin.setDefaultIndicator(html \| null)` | 注册全局默认指示器（此后新建实例生效）；`null` 恢复内置环 |

指示器 `role="status"`（进度模式为 `role="progressbar"` + `aria-value` 三件套），内置读屏文案；宿主 `aria-busy` 随 `spinning` 同步。
