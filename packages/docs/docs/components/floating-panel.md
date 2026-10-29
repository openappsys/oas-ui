# FloatingPanel 悬浮面板

工作台里的非模态工具窗：可拖动、可缩放、可置前的悬浮面板（调色板 / 图层 / 日志 / 监视器等）。`open` 与 `rect` 是受控状态，指针与键盘等价可操作；同族多实例叠放恒定 overlay 档，不随开合次数增长。

面板**不做 portal**：宿主是零尺寸锚点（`position: relative`），框体 `position: absolute` 相对锚点定位，`rect` 即相对锚点的像素坐标。因此面板随容器滚动、不改动宿主 DOM 层级；请勿把宿主放进 `overflow: hidden` 裁剪容器或会创建包含块的 `transform` 祖先。

## 基础用法

`open` 打开面板，`panel-title` 设标题，`movable` / `resizable` 开启拖动与八向缩放（四边 + 四角）。拖动标题栏移动、拖动边缘缩放，松手后提交 `rect` 并派发 `oas-move` / `oas-resize`。

触屏（`pointer: coarse`）下手柄与关闭钮热区放大到 44px：标题栏（含关闭钮）始终位于手柄之上，上侧/上角手柄从标题栏下沿起算，因此拖标题栏和点关闭不会被缩放手柄抢走。

放大热区有代价：coarse 下内容顶部约 44px 是 `n` 手柄的缩放带；若沿用最小尺寸 `160×96`，标题栏与缩放带几乎占满面板，内容区几乎不可点。触屏建议用更大的 `min`（如 `240,180`），或关闭 `n`/`s` 边缩放（组件没有单边手柄开关，需整体不开启 `resizable`）。手势语义不变。

富标题（`title` 插槽）撑高标题栏时，客户端用 `ResizeObserver` 实测标题栏高度并写回 `--oas-floating-panel-titlebar-height`（px），上侧/上角手柄随之下移；SSR 快照仍用默认 token，服务端不测量。

<DemoBlock title="可移动 / 可缩放的悬浮面板">
  <div style="position: relative; min-height: 260px">
    <oas-floating-panel id="fp-basic" open movable resizable panel-title="图层" rect="0,0,380,230">
      <p style="margin: 0 0 var(--oas-space-2)">拖动标题栏移动，拖动四边/四角缩放。</p>
      <div style="display: flex; gap: var(--oas-space-1_5); flex-wrap: wrap">
        <oas-tag>背景</oas-tag>
        <oas-tag>线稿</oas-tag>
        <oas-tag>标注</oas-tag>
      </div>
    </oas-floating-panel>
  </div>
  <p id="fp-basic-out" style="margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">拖动或缩放后显示 oas-move / oas-resize 反馈。</p>
</DemoBlock>

## 受控开合与取消

`open` 属性是唯一状态源：`show()` / `close()` 只写属性；宿主直接写属性则静默吸收。关闭钮、Esc 与 `close()` 都会先派发可取消的 `oas-before-close`——`preventDefault()` 后保持打开，且不写属性、不发 `oas-open-change`。

<DemoBlock title="show() / close() 与 before-close 拦截">
  <div style="display: flex; gap: var(--oas-space-2); align-items: center; margin-block-end: var(--oas-space-3)">
    <oas-button id="fp-open" size="small">show()</oas-button>
    <oas-button id="fp-close" size="small">close()</oas-button>
    <label style="display: inline-flex; align-items: center; gap: var(--oas-space-1); font-size: var(--oas-font-size-sm)">
      <input id="fp-veto" type="checkbox" /> 拦截关闭
    </label>
  </div>
  <div style="position: relative; min-height: 220px">
    <oas-floating-panel id="fp-ctrl" open panel-title="导出设置" rect="0,0,340,180">
      <p style="margin: 0">点「close()」或右上角关闭钮；勾选「拦截关闭」观察 before-close 否决。</p>
    </oas-floating-panel>
  </div>
  <p id="fp-ctrl-out" style="margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">等待交互。</p>
</DemoBlock>

## 受控回写

`oas-move` / `oas-resize` 的 `detail.rect` 是提交后的精确矩形；宿主可在事件里回写 `rect` 做网格吸附等约束（受控闭环）。`rect` property 同时接受对象 `{ x, y, width, height }` 与字符串 `"x,y,width,height"`——后者原样走 attribute 通道，与宿主 `setAttribute('rect', ...)` 同义（Vue 静态模板经 property 通道赋值时不丢值）。

<DemoBlock title="拖动 → 事件 → 宿主回写 rect（10px 网格吸附）">
  <div style="position: relative; min-height: 240px">
    <oas-floating-panel id="fp-drag" open movable panel-title="吸附到 10px" rect="0,0,320,190">
      <p style="margin: 0">拖动标题栏，松手后宿主把位置吸附到 10px 网格。</p>
    </oas-floating-panel>
  </div>
  <p id="fp-drag-out" style="margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">等待拖动。</p>
</DemoBlock>

## 叠放与置前

同族面板共享恒定 overlay 档：只有「最前」面板 +1，其余为基准档——**z-index 不随 open 次数增长**。点击面板任意位置或调用 `bringToFront()` 置前并派发 `oas-activate`。首帧即打开（SSR / 首屏受控态）的面板同样落在最前档，不会停在基准档。

<DemoBlock title="两面板置前">
  <div style="position: relative; min-height: 260px">
    <oas-floating-panel id="fp-a" open panel-title="图层 A" rect="0,0,260,150"></oas-floating-panel>
    <oas-floating-panel id="fp-b" open panel-title="图层 B" rect="120,60,260,150"></oas-floating-panel>
  </div>
  <p id="fp-front-out" style="margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">点击任一面板置前。</p>
</DemoBlock>

## 边界与尺寸约束

`boundary` 缺省 `viewport`，也可给 CSS 选择器（按该元素的矩形夹取）；`boundary-padding` 内缩。边界只约束拖动/缩放/键盘交互，不改写宿主显式写入的坐标。`min` / `max` 为 `宽,高`，`min > max` 时以 `min` 为准；`min` 非正或非法（含 `"0"` / `"0,0"`）视为未提供，回落缺省 `160,96`（不是 1px 下限，想要 1px 请显式写 `1,1`）。

两个时序注意：① 手势进行中改 `boundary` / `boundary-padding` / `min` / `max` 不改变当前手势，下一次手势才生效；② 若初始 `rect` 完全落在边界外，首次拖动会先把位置夹回边界内（表现为瞬移一次）——需要稳定外观时把初始 `rect` 写在边界内。

<DemoBlock title="在容器内拖动（boundary + min/max）">
  <div id="fp-bounds" style="position: relative; width: 100%; box-sizing: border-box; min-height: 260px; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md)">
    <oas-floating-panel id="fp-bound" open movable resizable boundary="#fp-bounds" boundary-padding="8" min="180,120" max="320,220" panel-title="限定在虚线框内" rect="16,16,260,180">
      <p style="margin: 0">拖到虚线框边缘会被夹住；缩放到 min/max 会停住。</p>
    </oas-floating-panel>
  </div>
  <p id="fp-bound-out" style="margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">拖动时位置被虚线框夹取。</p>
</DemoBlock>

## 键盘与焦点

面板框体可聚焦：方向键移动、`Shift` + 方向键缩放（8px/步），与指针等价。缩放方向映射固定为「方向键移动被拖动的边」：`Shift+→` / `Shift+↓` 放大（LTR 推东缘、RTL 推西缘；南缘下移），`Shift+←` / `Shift+↑` 缩小（LTR 西缘右移、RTL 东缘左移；北缘下移）。RTL 只镜像水平语义，垂直方向不变。`initial-focus` 指定打开时的焦点目标（找不到回退框体）；关闭时焦点归还打开前元素——焦点落在面板内**嵌套组件的 shadow 内**也算「仍在面板内」，同样归还；用户已把焦点移到面板外时不抢。

<DemoBlock title="键盘移动 / 缩放 + initial-focus">
  <div style="position: relative; min-height: 240px">
    <oas-floating-panel id="fp-key" open movable resizable initial-focus="#fp-key-target" panel-title="键盘可操作" rect="0,0,340,190">
      <input id="fp-key-target" placeholder="打开即聚焦这里" style="width: 100%; box-sizing: border-box; margin-block-end: var(--oas-space-2)" />
      <p style="margin: 0; font-size: var(--oas-font-size-sm); color: var(--oas-color-text-secondary)">Tab 到面板框体（标题栏）后：方向键移动，Shift + 方向键缩放。</p>
    </oas-floating-panel>
  </div>
  <p id="fp-key-out" style="margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">等待键盘操作。</p>
</DemoBlock>

## 子浮层 Esc 优先级

面板内的浮层（如 `oas-dropdown`）会压入更晚的 Esc 层：第一次 Esc 只关闭子浮层，面板保持打开；再按 Esc 才关闭面板。多个同族面板同开时，Esc 关闭的是**视觉最前**（最近置前）的那一块，而不是最后打开的那一块——点击/`bringToFront()` 置前会同步把该面板的 Esc 层提到栈顶。

<DemoBlock title="下拉菜单优先消费 Esc">
  <div style="position: relative; min-height: 250px">
    <oas-floating-panel id="fp-nest" open panel-title="含子浮层" rect="0,0,340,200">
      <oas-dropdown id="fp-nest-dd" items='[{"label":"复制","value":"copy"},{"label":"删除","value":"delete"}]'>
        <oas-button size="small">打开下拉</oas-button>
      </oas-dropdown>
      <p style="margin: var(--oas-space-2) 0 0; font-size: var(--oas-font-size-sm); color: var(--oas-color-text-secondary)">打开下拉后按 Esc：先关下拉，面板仍在。</p>
    </oas-floating-panel>
  </div>
  <p id="fp-nest-out" style="margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">等待下拉开合。</p>
</DemoBlock>

## RTL

`dir="rtl"` 下 `data-rtl` 钩子启用；拖动/缩放仍是物理行为，键盘水平语义镜像（右方向键朝书写前进方向）。

<DemoBlock title="RTL 键盘镜像">
  <div dir="rtl" style="position: relative; min-height: 220px">
    <oas-floating-panel id="fp-rtl" open movable resizable panel-title="لوحة الطبقات" rect="0,0,320,170">
      <p style="margin: 0">方向键与 Shift + 方向键在 RTL 下镜像。</p>
    </oas-floating-panel>
  </div>
</DemoBlock>

## 插槽

默认插槽承载面板内容；`title` 插槽覆盖标题文本（富标题，仍参与 `aria-labelledby`）。既无 `panel-title` 也无 `title` 插槽时，面板改用 i18n 名称（「悬浮面板」）作 `aria-label`，不写空的 `aria-labelledby`；`title` 插槽被动态清空后同样回落，清空再填回则切回 `aria-labelledby`。

<DemoBlock title="title 插槽（富标题）">
  <div style="position: relative; min-height: 210px">
    <oas-floating-panel id="fp-slot" open resizable rect="0,0,340,170">
      <span slot="title" style="display: inline-flex; align-items: center; gap: var(--oas-space-1); min-height: 48px">
        <oas-tag>已同步</oas-tag>
        <strong>素材检查器</strong>
      </span>
      <p style="margin: 0">标题由 <strong>title</strong> 插槽提供（此处 48px 高）；上侧/上角手柄从标题栏下沿起算，仍可拖动缩放。</p>
    </oas-floating-panel>
  </div>
  <p id="fp-slot-out" style="margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">拖动上边或上角观察 oas-resize。</p>
</DemoBlock>

<DemoBlock title="无标题面板：回落 i18n 名称">
  <div style="position: relative; min-height: 220px">
    <oas-floating-panel id="fp-plain" open rect="0,0,360,200">
      <p style="margin: 0">没有 <code>panel-title</code>，也没有 <code>title</code> 插槽：标题区留空，屏幕阅读器读「悬浮面板」。</p>
    </oas-floating-panel>
  </div>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  const out = (id, text) => {
    const el = document.getElementById(id)
    if (el) el.textContent = text
  }

  const basic = document.getElementById('fp-basic')
  basic?.addEventListener('oas-move', (e) => {
    out('fp-basic-out', `oas-move → source=${e.detail.source}，rect=${e.detail.rect.x},${e.detail.rect.y},${e.detail.rect.width},${e.detail.rect.height}`)
  })
  basic?.addEventListener('oas-resize', (e) => {
    out('fp-basic-out', `oas-resize → edge=${e.detail.edge}，rect=${e.detail.rect.x},${e.detail.rect.y},${e.detail.rect.width},${e.detail.rect.height}`)
  })

  const ctrl = document.getElementById('fp-ctrl')
  const veto = document.getElementById('fp-veto')
  document.getElementById('fp-open')?.addEventListener('click', () => {
    ctrl?.show()
  })
  document.getElementById('fp-close')?.addEventListener('click', () => {
    const closed = ctrl?.close()
    if (!closed) out('fp-ctrl-out', 'close() → 被 before-close 拦截，仍打开')
  })
  ctrl?.addEventListener('oas-before-close', (e) => {
    if (veto?.checked) {
      e.preventDefault()
      out('fp-ctrl-out', `oas-before-close → reason=${e.detail.reason}（preventDefault：保持打开）`)
    } else {
      out('fp-ctrl-out', `oas-before-close → reason=${e.detail.reason}（放行）`)
    }
  })
  ctrl?.addEventListener('oas-open-change', (e) => {
    out('fp-ctrl-out', `oas-open-change → open=${e.detail.open}，reason=${e.detail.reason}，source=${e.detail.source}`)
  })

  const drag = document.getElementById('fp-drag')
  drag?.addEventListener('oas-move', (e) => {
    const r = e.detail.rect
    const snapped = `${Math.round(r.x / 10) * 10},${Math.round(r.y / 10) * 10},${r.width},${r.height}`
    drag.setAttribute('rect', snapped)
    out('fp-drag-out', `oas-move ${r.x},${r.y} → 宿主回写 rect="${snapped}"`)
  })

  for (const id of ['fp-a', 'fp-b']) {
    document.getElementById(id)?.addEventListener('oas-activate', (e) => {
      out('fp-front-out', `${id} 置前（source=${e.detail.source}）`)
    })
  }

  const bound = document.getElementById('fp-bound')
  bound?.addEventListener('oas-move', (e) => {
    out('fp-bound-out', `oas-move → ${e.detail.rect.x},${e.detail.rect.y}`)
  })

  document.getElementById('fp-key')?.addEventListener('oas-move', (e) => {
    out('fp-key-out', `oas-move（keyboard）→ ${e.detail.rect.x},${e.detail.rect.y}`)
  })
  document.getElementById('fp-key')?.addEventListener('oas-resize', (e) => {
    out('fp-key-out', `oas-resize（keyboard，edge=${e.detail.edge}）→ ${e.detail.rect.width}×${e.detail.rect.height}`)
  })

  document.getElementById('fp-nest-dd')?.addEventListener('oas-open-change', (e) => {
    out('fp-nest-out', `dropdown open=${e.detail.open}；面板 open=${document.getElementById('fp-nest')?.hasAttribute('open')}`)
  })
  document.getElementById('fp-nest')?.addEventListener('oas-before-close', (e) => {
    out('fp-nest-out', `面板 oas-before-close → reason=${e.detail.reason}（子浮层已先消费过 Esc 时才会到这里）`)
  })
  document.getElementById('fp-slot')?.addEventListener('oas-resize', (e) => {
    out('fp-slot-out', `oas-resize（edge=${e.detail.edge}）→ ${e.detail.rect.width}×${e.detail.rect.height}`)
  })
})
</script>

## API

### oas-floating-panel

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `boundary` | 交互边界：viewport（默认）或 CSS 选择器；只夹取拖动/缩放/键盘，不改写宿主写入的坐标 | `string` | `viewport` |
| `boundary-padding` | 边界内缩像素（非负；非法回落 0） | `string` | `0` |
| `initial-focus` | 打开时聚焦的选择器（light DOM 或 shadow 内；找不到回退面板框体） | — | — |
| `max` | 最大尺寸 宽,高（缺省不限制） | — | — |
| `min` | 最小尺寸 宽,高（缺省 160,96；非正/非法（含 0）视为未提供，回落缺省；min > max 时以 min 为准） | — | — |
| `movable` | 标题栏拖动；框体聚焦时方向键移动（8px/步） | `boolean` | — |
| `open` | 打开态（唯一状态源）；show()/close() 只写该属性，宿主直接写属性静默吸收（不派发 oas-open-change） | `boolean` | — |
| `panel-title` | 标题文本（title 插槽覆盖）；避开原生 title 属性 | — | — |
| `rect` | 位置与尺寸 x,y,width,height（相对宿主锚点的像素坐标；缺省 48,48,420,300；输出取整）；property 同时接受对象与同格式字符串 | `PanelRect` | — |
| `resizable` | 八向缩放手柄（四边 + 四角）；框体聚焦时 Shift + 方向键缩放 | `boolean` | — |

#### 方法

| 方法 | 签名 | 说明 |
| --- | --- | --- |
| `show` | `show(): void` | 打开面板（写 open 属性；已打开时仅置前，不重复派发 oas-open-change） |
| `close` | `close(): boolean` | 关闭请求：先派发可取消 oas-before-close；被 preventDefault 时返回 false 且保持打开（零属性写入、零 open-change）。返回是否已关闭——本来已关闭直接返回 true（不派发事件）；before-close 处理器内重入 close() 不重复派发并返回 false |
| `bringToFront` | `bringToFront(): void` | 族内置前并把本面板 Esc 层提到栈顶；已是最前时不重复派发 oas-activate |

#### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-activate` | 面板置前时派发；detail { rect, source }（source = pointer \| api） |
| `oas-before-close` | 关闭请求（关闭钮 / Esc / close()）前派发，可取消（preventDefault 保持打开且不派发 open-change）；detail { reason, source } |
| `oas-move` | 指针或键盘移动提交时派发；detail { rect, source }（source = pointer \| keyboard；零位移不派发） |
| `oas-open-change` | 组件内部动作改变开合态时派发；detail { open, reason, source }（外部写 open 属性静默吸收） |
| `oas-resize` | 指针或键盘缩放提交时派发；detail { rect, source, edge } |

#### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | 面板内容 |
| `title` | 标题富内容通道（覆盖 panel-title 文本，仍参与 aria-labelledby；清空后回落 i18n 名称） |

#### CSS 变量

| CSS 变量 | 默认值 |
| --- | --- |
| `--oas-floating-panel-bg` | `var(--oas-color-bg-elevated)` |
| `--oas-floating-panel-border-color` | `var(--oas-color-border)` |
| `--oas-floating-panel-close-size` | `var(--oas-control-height-sm, 24px)` |
| `--oas-floating-panel-handle-size` | `8px` |
| `--oas-floating-panel-radius` | `var(--oas-radius-md)` |
| `--oas-floating-panel-shadow` | `var(--oas-shadow-lg)` |
| `--oas-floating-panel-titlebar-border-color` | `var(--oas-color-border)` |
| `--oas-floating-panel-titlebar-height` | `36px` |

<style>
.vp-doc .demo-block oas-floating-panel {
  box-shadow: var(--oas-shadow-md);
}
</style>
