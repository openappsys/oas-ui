# Watermark 水印

容器级水印层，铺在内容之上且不拦截任何交互，适合敏感信息防泄露。

渲染引擎：文字/灰阶图片水印由 canvas 绘制平铺单元（`toDataURL` 作背景平铺），尺寸按 devicePixelRatio 放大，高分屏不模糊；SSR 与无 canvas 环境自动回退 SVG data-uri（`fill=currentColor` 跟随主题），两路径渲染结构一致，真水合校验后接管。tile 按绘制参数缓存，仅相关属性或主题色变化才重绘；窗口 resize 由背景平铺天然适配。

## 文字水印

<DemoBlock title="基础文字水印">
  <oas-watermark text="内部资料 · CONFIDENTIAL" repeat>
    <div style="height: 180px; display: flex; align-items: center; justify-content: center; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md); color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
      平铺文字水印，容器内任意内容均可作为 slot 传入
    </div>
  </oas-watermark>
</DemoBlock>

`text` 生成斜纹平铺单元；`repeat` 存在时平铺，缺省时单枚居中。

## 单枚与透明度

<DemoBlock title="单枚居中 + 透明度">
  <div style="width: 100%; display: flex; gap: var(--oas-space-4); flex-wrap: wrap">
    <oas-watermark text="机密" opacity="0.3" style="flex: 1; min-width: 220px">
      <div style="height: 140px; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md)"></div>
    </oas-watermark>
    <oas-watermark text="已审核" repeat style="flex: 1; min-width: 220px">
      <div style="height: 140px; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md)"></div>
    </oas-watermark>
  </div>
</DemoBlock>

`opacity` 控制水印层透明度（0–1，自动夹取边界）。

## 图片水印

<DemoBlock title="图片水印">
  <oas-watermark image="https://picsum.photos/seed/isui-watermark/160/160" opacity="0.25" repeat>
    <div style="height: 160px; display: flex; align-items: center; justify-content: center; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md); color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
      `image` 属性传入图片 URL，与 text 同时存在时 image 优先
    </div>
  </oas-watermark>
</DemoBlock>

## 图片灰阶

<DemoBlock title="grayscale：图片灰阶滤镜">
  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: var(--oas-space-4); width: 100%">
    <oas-watermark id="wm-img-color" image="https://picsum.photos/seed/isui-watermark/160/160" opacity="0.35" repeat style="height: 150px; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md)"></oas-watermark>
    <oas-watermark id="wm-img-gray" image="https://picsum.photos/seed/isui-watermark/160/160" opacity="0.35" repeat grayscale style="height: 150px; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md)"></oas-watermark>
  </div>
</DemoBlock>

`grayscale` 存在时图片水印经 canvas `filter: grayscale(1)` 转为灰度（跨域图片需目标站放行 CORS，否则回退原图）；无 canvas 环境回退为图层 CSS filter，能力不丢。

## 不拦截交互

<DemoBlock title="内容正常交互">
  <oas-watermark text="演示水印" repeat>
    <div style="height: 120px; display: flex; align-items: center; justify-content: center; gap: var(--oas-space-3)">
      <button class="wm-btn" onclick="window.message && window.message.success('按钮仍可点击')">可点击按钮</button>
      <button class="wm-btn">另一按钮</button>
    </div>
  </oas-watermark>
  <p style="width: 100%; margin: var(--oas-space-3) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    水印层 `pointer-events: none`，上方的按钮/输入等交互完全不受影响。
  </p>
</DemoBlock>

## 空容器

<DemoBlock title="无内容也显示水印">
  <oas-watermark text="水印" repeat style="display: block; height: 120px"></oas-watermark>
</DemoBlock>

容器没有任何 slot 内容时，水印层照常渲染。

## 多行、旋转与字体

<DemoBlock title="多行文字 / 旋转 / 字体族">
  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: var(--oas-space-4); width: 100%">
    <oas-watermark text='["内部资料","CONFIDENTIAL"]' repeat rotate="-22" width="200" height="100" style="height: 150px; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md)"></oas-watermark>
    <oas-watermark text="斜纹 -45°" repeat rotate="-45" font-size="20" font-weight="700" style="height: 150px; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md)"></oas-watermark>
    <oas-watermark text="Georgia 衬线" repeat font-family="Georgia, serif" color="geekblue" style="height: 150px; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md)"></oas-watermark>
  </div>
</DemoBlock>

`text` 支持 JSON 数组（或 `\n`）多行；`rotate` 控制旋转角（默认 -30）；`width` / `height` 调单枚画布尺寸（**缺省按文字内容自适应**：旋转外接框 + 内边距，保证默认密度下每个平铺单元完整容纳文字）；`font-size` / `font-weight` / `font-family` 进 canvas 文字；`color` 支持 11 个预设色名（走 `--oas-preset-*` token，暗色自动适配）或任意 CSS 色值，缺省跟随主题文字色（暗色下同样可见，主题切换自动重绘）。

## 间隙与偏移

<DemoBlock title="gap / offset 平铺参数">
  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: var(--oas-space-4); width: 100%">
    <oas-watermark text="默认间隙" repeat style="height: 150px; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md)"></oas-watermark>
    <oas-watermark text="宽间隙" repeat gap="[180, 120]" style="height: 150px; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md)"></oas-watermark>
    <oas-watermark text="带偏移" repeat gap="[140, 90]" offset="[20, 8]" style="height: 150px; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md)"></oas-watermark>
  </div>
</DemoBlock>

`gap="[x,y]"` 控制平铺单元间距（默认取 tile 尺寸），`offset="[x,y]"` 控制起始偏移（默认 gap/2）；`width` / `height` 可改文字 tile 尺寸，`z-index` 可抬升水印层（默认 2）。

## 错位排布

<DemoBlock title="staggered 奇偶行错位">
  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: var(--oas-space-4); width: 100%">
    <oas-watermark text="规则网格" repeat gap="[140, 90]" style="height: 150px; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md)"></oas-watermark>
    <oas-watermark text="错位排布" repeat gap="[140, 90]" staggered style="height: 150px; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md)"></oas-watermark>
  </div>
</DemoBlock>

`staggered` 存在时双层背景错位半 tile，奇偶行错开排布（仅平铺模式生效）。

## 防篡改

<DemoBlock title="tamper-proof：删不掉的水印">
  <oas-watermark id="wm-tamper" text="CONFIDENTIAL" repeat>
    <div style="height: 130px; display: flex; align-items: center; justify-content: center; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md); color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); padding: 0 var(--oas-space-4); text-align: center">
      打开浏览器开发者工具，在 Elements 里删除 shadow 内的水印层、或改写它的 style——水印会自动重挂/恢复，并触发 oas-remove 事件
    </div>
  </oas-watermark>
  <oas-space style="margin-top: var(--oas-space-2)">
    <oas-button id="wm-tamper-simulate" size="small">模拟篡改（删除水印层）</oas-button>
    <oas-button id="wm-tamper-off" size="small">tamper-proof="false" 对照</oas-button>
  </oas-space>
  <p id="wm-tamper-log" style="width: 100%; margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">尚未检测到篡改</p>
</DemoBlock>

`tamper-proof` 默认开启（`="false"` 关闭）：MutationObserver 监听水印层被移除或样式被改写，自动重挂/恢复并派发 `oas-remove` 事件（detail.type 为 `removed` / `modified`）。防君子不防小人——它兜底「随手删除」，不是安全边界。

## 可拖拽水印

<DemoBlock title="movable：按住水印拖动">
  <oas-watermark id="wm-movable" text="拖动我" repeat movable z-index="10">
    <div style="height: 150px; display: flex; align-items: center; justify-content: center; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md); color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
      在水印上按住拖动（grab 光标），图案随手势平移，offset 实时写回属性
    </div>
  </oas-watermark>
</DemoBlock>

`movable` 存在时水印层接管指针（grab/grabbing 光标），拖拽把位移写入 `offset` 属性——受控通道更新，组件重绘后位置仍保留。注意：此时水印层会拦截其覆盖区域的交互。

## 全屏水印

<DemoBlock title="fullscreen：铺满视口的全屏水印">
  <oas-button id="wm-fullscreen-toggle" size="small">开启全屏水印</oas-button>
  <p style="width: 100%; margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    点击按钮开启全屏水印：宿主变为 fixed 铺满视口，页面滚动水印不动，不拦截任何交互；再次点击关闭。
  </p>
</DemoBlock>

`fullscreen` 存在时组件自身 `position: fixed; inset: 0` 铺满视口（`pointer-events: none`），无需宿主包裹；默认最高层级，可用 `z-index` 属性或 `--oas-watermark-fullscreen-z-index` CSS 变量调整。与 `repeat` / `staggered` / `movable` / `grayscale` 均可组合；不设 `fullscreen` 时容器模式行为零变化。注意：全屏模式下 slot 内容不参与布局交互。

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  // import 须在 onMounted 内：顶层 await import 会在 vitepress 构建期 SSR 求值（Node 无 HTMLElement），页面变空壳
  const { message } = await import('@oas-ui/ui')
  const tamper = document.querySelector('#wm-tamper')
  const log = document.querySelector('#wm-tamper-log')
  tamper?.addEventListener('oas-remove', (e) => {
    const type = e.detail.type === 'removed' ? '被移除' : '样式被篡改'
    log.textContent = `检测到水印${type}，已自动恢复（${new Date().toLocaleTimeString()}）`
    message.warning(`水印${type}，已自动重挂`)
  })
  // 模拟篡改：直接删除 shadow 内水印层 → MO 检测重挂 + oas-remove
  document.querySelector('#wm-tamper-simulate')?.addEventListener('click', () => {
    const layer = tamper?.shadowRoot?.querySelector('[part="watermark"]')
    if (layer) layer.remove()
  })
  // 对照：关闭防篡改后删除即真消失（刷新页面恢复）
  document.querySelector('#wm-tamper-off')?.addEventListener('click', () => {
    if (!tamper) return
    tamper.setAttribute('tamper-proof', 'false')
    const layer = tamper.shadowRoot?.querySelector('[part="watermark"]')
    if (layer) layer.remove()
    log.textContent = 'tamper-proof="false"：水印层已删除且不会重挂（刷新页面恢复）'
  })
  // 全屏水印开关（demo 元素挂在 body 末尾，避免撑开文档布局）
  const full = document.createElement('oas-watermark')
  full.id = 'wm-fullscreen-demo'
  full.setAttribute('text', '全屏水印 · FULLSCREEN')
  full.setAttribute('repeat', '')
  document.body.appendChild(full)
  const toggle = document.querySelector('#wm-fullscreen-toggle')
  toggle?.addEventListener('click', () => {
    if (full.hasAttribute('fullscreen')) {
      full.removeAttribute('fullscreen')
      toggle.textContent = '开启全屏水印'
    } else {
      full.setAttribute('fullscreen', '')
      toggle.textContent = '关闭全屏水印'
    }
  })
})
</script>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `color` | 水印文字色：11 预设名（`--oas-preset-*`）或任意 CSS 色值；缺省走文本主色 token | `string` | — |
| `font-family` | 字体族（默认 sans-serif） | `string` | `sans-serif` |
| `font-size` | 字号（px，默认 16） | `string` | `16` |
| `font-weight` | 字重（默认 400） | `string` | `400` |
| `fullscreen` | 全屏水印：宿主 fixed inset:0 铺满视口（pointer-events:none），默认最高层级（z-index 属性或 --oas-watermark-fullscreen-z-index 可调），页面滚动不动 | `boolean` | — |
| `gap` | 平铺间隙 JSON [x,y]（默认 tile 尺寸） | `string` | — |
| `grayscale` | 图片水印灰阶滤镜（canvas filter: grayscale(1)）；无 canvas 环境回退图层 CSS filter | `boolean` | — |
| `height` | 文字 tile 高（未设置时按内容自适应；图片水印缺省 120） | `string` | — |
| `image` | 图片水印 URL（存在时优先于 text） | `string` | — |
| `movable` | 可拖拽移动水印（位移写回 `offset` 属性，受控保留） | `boolean` | — |
| `offset` | 平铺起始偏移（px 或 JSON `[x,y]`；默认 gap/2，与旧居中视觉等价） | `string` | — |
| `opacity` | 水印层透明度（0–1，自动夹取） | `string` | `0.15` |
| `repeat` | 布尔，存在时平铺；缺省单枚居中 | `boolean` | — |
| `rotate` | 旋转角度（度，默认 -30） | `string` | `-30` |
| `staggered` | 错位排布（双层背景，第二层偏移 offset + gap/2；仅平铺模式） | `boolean` | — |
| `tamper-proof` | 防篡改（默认 true）：MutationObserver 监测图层被删/被改自动重挂并派发 `oas-remove`；`"false"` 关闭 | `string` | `true` |
| `text` | 文字水印内容（与 image 二选一） | `string` | — |
| `width` | 文字 tile 宽（未设置时按内容自适应：旋转外接框 + 内边距；图片水印缺省 240） | `string` | — |
| `z-index` | 水印层叠层级（默认 2）；fullscreen 时写到宿主，覆盖默认最高层 | `string` | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-remove` | 防篡改监测到图层被移除/篡改时派发，`detail: { type: "removed" \| "modified" }` |

### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | — |

水印为装饰层（`aria-hidden` + `pointer-events: none`），不参与可访问性树，不拦截交互。
