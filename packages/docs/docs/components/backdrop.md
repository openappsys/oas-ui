# Backdrop 遮罩

全屏半透明遮罩，支持内容插槽、颜色/浓度/模糊定制、淡入淡出动画与生命周期事件；`open=false` 时播完退场动画后自动卸载节点，不留孤儿 DOM。

## 基础用法

<DemoBlock title="基础用法">
  <oas-space>
    <oas-button type="primary" onclick="openBackdrop('backdrop-basic')">打开遮罩</oas-button>
  </oas-space>
  <p>点击遮罩任意位置关闭（监听 <code>oas-click</code>）。</p>
</DemoBlock>

## 内容插槽（全屏 loading）

<DemoBlock title="内容插槽（全屏 loading）">
  <oas-space>
    <oas-button type="primary" onclick="openLoadingBackdrop()">全屏 loading</oas-button>
  </oas-space>
  <p>默认插槽承载遮罩上层内容（spinner / 文案 / 引导等，居中展示）；点击内容区不会触发 <code>oas-click</code>，只有点击遮罩本体才关闭。</p>
</DemoBlock>

## 颜色与浓度

<DemoBlock title="颜色与浓度">
  <oas-space>
    <oas-button onclick="openBackdrop('backdrop-thick', { color: '#18181b', opacity: 'thick' })">深色遮罩</oas-button>
    <oas-button onclick="openBackdrop('backdrop-thin', { color: '#18181b', opacity: 'thin' })">浅色遮罩</oas-button>
    <oas-button onclick="openBackdrop('backdrop-tint', { color: 'blue', opacity: 'default' })">主题色遮罩</oas-button>
  </oas-space>
  <p><code>color</code> 接受任意 CSS 色值或 11 个预设名；<code>opacity</code> 支持 <code>thin</code>（0.35）/ <code>default</code>（0.55）/ <code>thick</code>（0.75）三档或 0-1 数字。亦可通过 <code>--oas-backdrop-bg</code> / <code>--oas-backdrop-opacity</code> 变量做主题级覆盖。</p>
</DemoBlock>

## 模糊全值化

<DemoBlock title="模糊全值化">
  <oas-space>
    <oas-button onclick="openBackdrop('backdrop-blur-strong', { blur: 'blur(8px) saturate(180%)' })">强模糊 + 饱和</oas-button>
    <oas-button onclick="openBackdrop('backdrop-blur-basic', { blur: true })">默认模糊</oas-button>
  </oas-space>
  <p><code>blur</code> 布尔（空值）回落 <code>blur(4px)</code>（兼容既有用法）；传字符串则接受任意 CSS <code>backdrop-filter</code> 全值。</p>
</DemoBlock>

## 淡入淡出与生命周期事件

<DemoBlock title="淡入淡出与生命周期事件">
  <oas-space>
    <oas-button type="primary" onclick="openAnimBackdrop()">打开（观察淡入淡出）</oas-button>
  </oas-space>
  <p>打开/关闭播放 opacity 淡入淡出（动画只走 transform/opacity），过渡结束派发 <code>oas-after-show</code> / <code>oas-after-close</code>；<code>prefers-reduced-motion</code> 下跳过过渡。</p>
</DemoBlock>

## 不可关闭遮罩（persistent）

<DemoBlock title="不可关闭遮罩（persistent）">
  <oas-space>
    <oas-button onclick="openPersistentBackdrop()">打开持久遮罩</oas-button>
  </oas-space>
  <p><code>persistent</code> 拦截遮罩点击关闭（不再派发 <code>oas-click</code>），点击遮罩时内容抖动提示不可关闭；关闭由内容区按钮或宿主决定。键盘 Tab 聚焦遮罩顶部的「关闭遮罩」按钮同样可关闭（读屏/键盘关闭通道，文案经 <code>close-label</code> 定制）。</p>
</DemoBlock>

## 点击传播控制

<DemoBlock title="点击传播控制">
  <oas-space>
    <oas-button onclick="openBackdrop('backdrop-passthrough', { stopPropagation: false })">打开（点击可穿透）</oas-button>
  </oas-space>
  <p><code>stop-propagation</code> 默认阻断遮罩点击传播到宿主文档（遮罩本职即拦截背后交互）；设为 <code>false</code> 后点击遮罩也会继续触发页面级点击监听。</p>
</DemoBlock>

## 透明与模糊

<DemoBlock title="透明与模糊">
  <oas-space>
    <oas-button onclick="openBackdrop('backdrop-transparent', { transparent: true, blur: true })">透明 + 模糊</oas-button>
    <oas-button onclick="openBackdrop('backdrop-plain', { transparent: true })">纯透明</oas-button>
  </oas-space>
</DemoBlock>

## 不锁定滚动

<DemoBlock title="不锁定滚动">
  <oas-space>
    <oas-button onclick="openBackdrop('backdrop-scroll', { lockScroll: false })">打开（可滚动）</oas-button>
  </oas-space>
  <p><code>lock-scroll</code> 默认 <code>true</code>，设为 <code>false</code> 后 body 可继续滚动。</p>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  const { toast } = await import('@oas-ui/ui')
  window.toast = toast
  window.openBackdrop = (id, opts = {}) => {
    let el = document.getElementById(id)
    if (el) el.remove()
    el = document.createElement('oas-backdrop')
    el.id = id
    if (opts.transparent) el.setAttribute('transparent', '')
    if (opts.blur) el.setAttribute('blur', typeof opts.blur === 'string' ? opts.blur : '')
    if (opts.lockScroll === false) el.setAttribute('lock-scroll', 'false')
    if (opts.color) el.setAttribute('color', opts.color)
    if (opts.opacity) el.setAttribute('opacity', opts.opacity)
    if (opts.persistent) el.setAttribute('persistent', '')
    if (opts.closeLabel) el.setAttribute('close-label', opts.closeLabel)
    if (opts.stopPropagation === false) el.setAttribute('stop-propagation', 'false')
    if (opts.content) el.innerHTML = opts.content
    el.addEventListener('oas-click', () => {
      if (opts.persistent) return
      el.removeAttribute('open')
      toast.info({ title: '遮罩被点击，已关闭', duration: 2000 })
    })
    if (opts.onAfterShow) el.addEventListener('oas-after-show', opts.onAfterShow)
    if (opts.onAfterClose) el.addEventListener('oas-after-close', opts.onAfterClose)
    // 先设 open 再挂载：组件在 !open 时连接会自动卸载，顺序颠倒会导致被立即移除
    el.setAttribute('open', '')
    document.body.appendChild(el)
  }
  window.openLoadingBackdrop = () =>
    openBackdrop('backdrop-loading', {
      content:
        '<oas-spin size="large"></oas-spin><p style="margin-top:8px;color:var(--oas-color-text-primary)">正在加载，请稍候…</p>',
    })
  window.openPersistentBackdrop = () =>
    openBackdrop('backdrop-persistent', {
      persistent: true,
      closeLabel: '关闭遮罩',
      content:
        '<p style="margin-bottom:12px">请先完成下方操作再继续</p>' +
        '<oas-button type="primary" onclick="document.getElementById(\'backdrop-persistent\')?.removeAttribute(\'open\')">我知道了</oas-button>',
    })
  window.openAnimBackdrop = () =>
    openBackdrop('backdrop-anim', {
      onAfterShow: () => toast.info({ title: '遮罩已完全显示（oas-after-show）', duration: 2000 }),
      onAfterClose: () => toast.success({ title: '遮罩已完全关闭（oas-after-close）', duration: 2000 }),
    })
})
</script>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `blur` | 背景模糊 | — | — |
| `close-label` | — | — | — |
| `color` | — | — | — |
| `lock-scroll` | 打开时锁定 body 滚动 | `string` | `true` |
| `opacity` | — | — | — |
| `open` | 是否显示 | `boolean` | — |
| `persistent` | — | `boolean` | — |
| `stop-propagation` | — | `string` | `true` |
| `transparent` | 遮罩透明（无底色） | — | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-after-close` | — |
| `oas-after-show` | — |
| `oas-click` | 点击遮罩，`detail.originalEvent` 为原始点击事件 |

### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | — |

- 自身无焦点陷阱（由上层弹窗负责）；Esc 不自动关闭（由外层弹窗决定）。
- `open=false` 时播完退场动画后从 DOM 卸载，无孤儿 DOM；多遮罩共存时仅最后一个关闭才恢复滚动。
- 点击判定：仅点击遮罩本体（内容区点击不触发 `oas-click`）；`stop-propagation` 默认阻断遮罩点击传播到宿主文档。
