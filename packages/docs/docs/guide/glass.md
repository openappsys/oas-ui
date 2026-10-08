# 液态玻璃画廊

> 半透明 surface + backdrop 模糊 + 高光折光边的静态近似材质层（边缘折射已交付为静态置换近似，动态流动感仍属后续增强，详见[主题与自定义](/guide/theming#液态玻璃-glass-css)）。

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
const theme = ref('light')
const open = ref(false)
const msg = ref(null)
const popMsg = () => {
  // 消息默认贴视口顶 16px——落在文档站白色导航区上，磨砂无从显现；
  // 把偏移量算到舞台渐变区上方，让 busy 背景垫在消息背后（磨砂感知依赖背景透出）
  const stage = document.querySelector('.gg-stage')
  const top = stage ? stage.getBoundingClientRect().top : 0
  const offset = Math.max(16, Math.min(top + 120, window.innerHeight - 120))
  msg.value?.success('玻璃材质消息：背景透出磨砂质感', { offset })
}
onMounted(async () => {
  document.documentElement.setAttribute('data-glass', '')
  const { message } = await import('@oas-ui/ui')
  msg.value = message
})
onBeforeUnmount(() => {
  // SPA 泄漏防护：画廊激活的 data-glass 不得带出本页（否则全站页面都变玻璃）
  document.documentElement.removeAttribute('data-glass')
})
</script>

<div class="gg-stage" :data-theme="theme">
  <div class="gg-toolbar">
    <button class="sg-btn" :class="{ 'sg-active': theme === 'light' }" @click="theme = 'light'">light</button>
    <button class="sg-btn" :class="{ 'sg-active': theme === 'dark' }" @click="theme = 'dark'">dark</button>
    <oas-button type="primary" @click="open = true">打开对话框</oas-button>
    <oas-button @click="popMsg">弹出消息</oas-button>
  </div>
  <div class="gg-controls">
    <oas-button type="primary">主按钮</oas-button>
    <oas-button>次按钮</oas-button>
    <oas-switch checked></oas-switch>
    <oas-slider value="45" style="width: 200px"></oas-slider>
    <span class="gg-note">边缘折射（静态置换近似）：控件轮廓沿边缘法向微膨胀，中间不变形</span>
  </div>
  <div class="gg-cards">
    <div class="gg-card">
      <strong>卡片 surface</strong>
      <p>半透明底 + backdrop-filter 模糊 + 折光边。背景渐变更丰富时材质感更强。</p>
      <oas-tag type="primary">标签</oas-tag>
    </div>
    <div class="gg-card">
      <strong>文字可读性</strong>
      <p style="color: var(--oas-color-text-secondary)">次要文字走 token 安全档，busy 背景上仍保持可读。</p>
      <oas-input placeholder="输入框（实心控件）" style="width: 220px"></oas-input>
    </div>
  </div>
  <oas-modal v-if="open" visible no-mask draggable title="液态玻璃对话框" @oas-close="open = false">
    <p>面板背景透出背后的渐变与按钮——blur + 高光边共同构成玻璃材质。</p>
  </oas-modal>
</div>

<style>
.gg-stage {

  margin: 0 0 var(--oas-space-4);
  padding: var(--oas-space-6);
  border-radius: var(--oas-radius-lg);
  background:
    radial-gradient(720px 420px at 24% 8%, rgba(120, 200, 255, 0.85), transparent 68%),
    radial-gradient(680px 400px at 78% 12%, rgba(255, 130, 190, 0.8), transparent 68%),
    radial-gradient(900px 520px at 50% 30%, rgba(255, 200, 120, 0.75), transparent 66%),
    radial-gradient(1000px 620px at 50% 105%, rgba(80, 220, 170, 0.4), transparent 62%),
    linear-gradient(160deg, #2a3550, #4a2a50 55%, #1f4a44);
  /* modal 按视口居中——舞台须占满大部分视口高，弹窗才落在渐变之上（否则弹在深色页面上看不出玻璃感） */
  min-height: 72vh;
}
.gg-stage[data-theme="dark"] {
  /* 弹窗透度微调（modal 消费 --oas-color-bg；变量可继承进 shadow——零库影响） */
  --oas-color-bg: rgba(24, 24, 27, 0.5);
}
.gg-controls { display: flex; align-items: center; gap: var(--oas-space-4); margin-bottom: var(--oas-space-4); padding: var(--oas-space-2) 0; }
.gg-note { color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); }
.gg-toolbar { display: flex; gap: var(--oas-space-3); align-items: center; margin-bottom: var(--oas-space-5) }
.gg-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: var(--oas-space-4) }
.gg-card {
  background: var(--oas-color-bg-elevated);
  backdrop-filter: var(--oas-glass-blur, none);
  -webkit-backdrop-filter: var(--oas-glass-blur, none);
  outline: 1px solid var(--oas-glass-ring, transparent);
  outline-offset: -1px;
  border-radius: var(--oas-radius-lg);
  box-shadow: var(--oas-shadow-md);
  padding: var(--oas-space-4);
  color: var(--oas-color-text-primary);
}
.sg-btn {
  padding: var(--oas-space-1) var(--oas-space-3);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-full);
  background: var(--oas-color-bg-elevated);
  color: var(--oas-color-text-primary);
  cursor: pointer;
}
.sg-btn.sg-active { border-color: var(--oas-color-primary); color: var(--oas-color-primary) }
</style>

## 用法

```html
<link rel="stylesheet" href="https://unpkg.com/@oas-ui/theme@2/glass.css" />
<html data-glass>
```

- `data-glass` 叠加在 `data-theme` / `data-skin` 之上，三者自由组合；
- 材质依赖背景反差——给页面一个有色彩层次的背景（渐变/图片）时质感最强，纯色同色相背景上减弱（文字仍可读）；
- 局部降级：任意容器覆盖 `--oas-glass-blur: none; --oas-glass-ring: transparent; --oas-glass-refraction: ;`（折射停用值留空而非 none，原因见[主题与自定义](/guide/theming#液态玻璃-glass-css)；构建链吞空值时可用 `saturate(1)` 恒等滤镜替代）；
- `high-contrast` 主题下不启用（实心可访问性档优先）。

### 动态流动感（指针镜面高光，可选运行时）

镜面高光需要一小段运行时（`glass-fluid.js`）——单文档 `pointermove` 监听 + `composedPath` 命中 surface，把指针位置写成元素本地坐标变量；**高光样式表由运行时按注册表注入**对应组件的 shadow 根（`adoptedStyleSheets`），因此**组件源码里没有任何玻璃规则体或标记属性**（只有 `--oas-glass-*` 变量消费行）。app-bar 溢出弹层打开期间关折射由组件内的中性标记 `data-panel-open` 完成（防弹层被滤镜区域裁切），不依赖运行时——只引 `glass.css` 或 reduced-motion 下同样生效。

```html
<link rel="stylesheet" href="https://unpkg.com/@oas-ui/theme@2/glass.css" />
<script type="module">
  import 'https://unpkg.com/@oas-ui/theme@2/glass-fluid.js'
</script>
<html data-glass>
```

- 消费范围与折射同域（9 个控件/导航/通知组件：button / switch / slider 把手 / app-bar / bottom-navigation / message / toast / snackbar / notification）；内容面板不接；
- 守卫：无 `data-glass` 零监听；`prefers-reduced-motion: reduce` 不启用；粗指针（触屏）不接；`high-contrast` 不启用；标记/媒体查询变化会自动起停；
- 可调变量（CSS 自定义属性可穿透 shadow 覆写）：`--oas-glass-px` / `--oas-glass-py`（运行时写入的指针本地坐标，勿手改）、`--oas-glass-sheen` / `--oas-glass-sheen-size` / `--oas-glass-sheen-press`（高光色、半径、按压色；明暗各一档，定义在 `glass.css`）；
- 高光层落在「surface 背景之上、文字之下」（`isolation: isolate` + 负 `z-index`），镜面反射不冲淡标签文字；
- 作用域与按压：hover 镜面高光对所有玻璃面与按钮生效（含**实心语义色/自定义色按钮** primary/success/warning/danger/has-color）；**实心按钮的按压改用边缘内描边（box-shadow inset，不提亮铺底）**——白高光铺底会把白字对比度压到门限下，边缘描边不冲淡文字（与 Apple 镜面描边 / Fluent 内凹的按压常态一致）；玻璃面的按压仍是更强的高光色（真增强）；
- 对比度门禁：玻璃面 hover 按主题页面底（light `#fff` / dark `#18181b`）合成取最坏 ≥60、按压 ≥45；**实心按钮 hover（瞬态大字档）≥45**，其静止/按压基线（底不被提亮）≥60；半透明表面若落在极端宿主底色上，文字对比度由宿主负责；switch 轨道内文案随选中态换底，其组合矩阵不在该门禁内。
- 边界（v1）：指针静止时滚动页面，高光坐标不随元素位移更新（移动指针即恢复）；slider 把手高光在 overlay 态（拖动中/聚焦/`show-tooltip`/自定义把手 `data-custom-thumb`）不显示，按压环也仅在「按下未移动」时可见。
