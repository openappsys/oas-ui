# SpeedDial 悬浮动作按钮

悬浮主按钮 + 展开子动作列表，常用于「新建/分享」等快捷操作；`aria-expanded` 同步，点击外部/Esc 收起，无孤儿浮层。

> 演示中已加 `style="position: static"` 避免固定定位影响页面布局；实际使用默认固定在右下角。子动作展开方向由 `direction` 控制。

## 展开方向

`direction` 支持 `up`（默认）/ `down` / `left` / `right`，首个子动作始终最靠近主按钮。

<DemoBlock title="方向：up / down / left / right">
  <div style="display: flex; gap: var(--oas-space-5); align-items: center; min-height: 200px; width: 100%">
    <div style="width: 96px; height: 160px">
      <oas-speed-dial style="position: static" actions='[{"label":"复制","icon":"copy"},{"label":"编辑","icon":"edit"},{"label":"删除","icon":"trash"}]'></oas-speed-dial>
    </div>
    <div style="width: 96px; height: 160px">
      <oas-speed-dial direction="down" style="position: static" actions='[{"label":"复制","icon":"copy"},{"label":"编辑","icon":"edit"},{"label":"删除","icon":"trash"}]'></oas-speed-dial>
    </div>
    <div style="width: 220px; height: 80px; display: flex; align-items: center">
      <oas-speed-dial direction="right" style="position: static" actions='[{"label":"复制","icon":"copy"},{"label":"编辑","icon":"edit"},{"label":"删除","icon":"trash"}]'></oas-speed-dial>
    </div>
    <div style="width: 220px; height: 80px; display: flex; align-items: center; justify-content: flex-end">
      <oas-speed-dial direction="left" style="position: static" actions='[{"label":"复制","icon":"copy"},{"label":"编辑","icon":"edit"},{"label":"删除","icon":"trash"}]'></oas-speed-dial>
    </div>
  </div>
</DemoBlock>

## 级联动画

展开时子动作按序级联浮现（每项 `transition-delay = index × 30ms`），收起时同步消失。内建动效、无需配置；`prefers-reduced-motion` 下级联 delay 归零、过渡停用（一次性出现，对齐可访问性）。上方各 demo 展开即生效。

## 圆弧几何展开

`geometry` 控制子动作的分布方式：`linear`（默认，链式排布）/ `circle`（整圆，从正上开始 360°/N 均分）/ `semi-circle`（半圆，以 `direction` 为轴心 180° 张开）/ `quarter-circle`（四分之一圆 90°，起始象限随 `direction`：up=左上、down=右下、left=左下、right=右上）。`radius` 控制圆弧半径（px，默认 96，非法值回落 96）。

角度规则：`circle` 从正上方开始顺时针均分；`semi-circle` 从「主方向 − 90°」扫到「主方向 + 90°」（up=上半圆、down=下半圆、left=左半圆、right=右半圆）；`quarter-circle` 为主方向起的 90° 弧（首项最靠近主按钮）。圆弧模式下子动作不再参与链式排布，`--cascade-i` 级联与 `hide-label` 气泡不受影响；`prefers-reduced-motion` 下圆弧转场直切（动作一次到位）。

<DemoBlock title="circle：整圆从正上均分">
  <div style="display: flex; align-items: center; justify-content: center; height: 280px; width: 100%">
    <oas-speed-dial geometry="circle" style="position: static" actions='[{"label":"复制","icon":"copy"},{"label":"编辑","icon":"edit"},{"label":"删除","icon":"trash"},{"label":"上传","icon":"upload"}]'></oas-speed-dial>
  </div>
</DemoBlock>

<DemoBlock title="semi-circle：半圆以 direction 为轴">
  <div style="display: flex; gap: var(--oas-space-5); align-items: center; justify-content: center; height: 220px; width: 100%">
    <div style="width: 220px; height: 200px; position: relative">
      <oas-speed-dial style="position: absolute; bottom: 0; left: 50%; margin-left: -24px" geometry="semi-circle" actions='[{"label":"复制","icon":"copy"},{"label":"编辑","icon":"edit"},{"label":"删除","icon":"trash"}]'></oas-speed-dial>
    </div>
  </div>
</DemoBlock>

<DemoBlock title="quarter-circle：90° 象限随 direction（up=左上 / right=右上）">
  <div style="display: flex; gap: var(--oas-space-5); align-items: flex-end; height: 220px; width: 100%">
    <div style="width: 200px; height: 180px; position: relative">
      <oas-speed-dial style="position: absolute; right: 0; top: 0" geometry="quarter-circle" actions='[{"label":"复制","icon":"copy"},{"label":"编辑","icon":"edit"},{"label":"删除","icon":"trash"}]'></oas-speed-dial>
    </div>
    <div style="width: 200px; height: 180px; position: relative">
      <oas-speed-dial style="position: absolute; left: 0; top: 0" geometry="quarter-circle" direction="right" actions='[{"label":"复制","icon":"copy"},{"label":"编辑","icon":"edit"},{"label":"删除","icon":"trash"}]'></oas-speed-dial>
    </div>
  </div>
</DemoBlock>

<DemoBlock title="radius：调节圆弧半径（circle）">
  <div style="display: flex; align-items: center; justify-content: center; height: 320px; width: 100%">
    <oas-speed-dial id="sd-arc" geometry="circle" radius="96" style="position: static" actions='[{"label":"复制","icon":"copy"},{"label":"编辑","icon":"edit"},{"label":"删除","icon":"trash"},{"label":"上传","icon":"upload"}]'></oas-speed-dial>
  </div>
  <oas-button-group>
    <oas-button size="small" type="primary" onclick="event.stopPropagation(); sdArc(96)">radius 96</oas-button>
    <oas-button size="small" onclick="event.stopPropagation(); sdArc(128)">radius 128</oas-button>
    <oas-button size="small" onclick="event.stopPropagation(); sdArc(160)">radius 160</oas-button>
  </oas-button-group>
</DemoBlock>

## 纯文字动作

`icon` 可省略，只显示 label；纯图标子动作请用 `hide-label`（见下节）。

<DemoBlock title="纯文字 / 纯图标">
  <div style="width: 120px; height: 160px">
    <oas-speed-dial style="position: static" actions='[{"label":"分享"},{"label":"收藏"},{"label":"举报"}]'></oas-speed-dial>
  </div>
</DemoBlock>

## icon-only 子动作（悬停显示文字）

`hide-label: true` 的子动作只渲染图标（圆形小钮），label 视觉隐藏；悬停 / 键盘聚焦时浮出文字气泡（纯 CSS 转场，无 JS 浮层）。气泡方向随展开方向自适应：`up` 展开在动作左侧、`down` 在右侧、`left`/`right` 在上方，定位于动作外侧、不遮挡相邻动作。`hide-label` 但未提供可渲染 icon 的动作自动回落为显示 label（dev 下 console.warn 告警一次）。方向键 roving 导航、`oas-select` 事件不受影响。

<DemoBlock title="icon-only 子动作（悬停显示文字）">
  <div style="width: 260px; height: 220px">
    <oas-speed-dial style="position: static" actions='[{"label":"复制","icon":"copy","hide-label":true},{"label":"编辑","icon":"edit"},{"label":"删除","icon":"trash","hide-label":true},{"label":"上传","icon":"upload","hide-label":true}]'></oas-speed-dial>
  </div>
</DemoBlock>

## 事件

点击主按钮展开/收起派发 `oas-open`（`detail: { open, reason }`）；点击子动作派发 `oas-select`（`detail: { index, label }`）并自动收起。`reason` 标记展开/收起来源：`toggle`（点击主钮）/ `outside`（点击外部）/ `escape`（Esc）/ `select`（选择动作）/ `hover`（悬停触发）。

<DemoBlock title="事件反馈">
  <div style="width: 200px; height: 160px">
    <oas-speed-dial id="sd-event" style="position: static" actions='[{"label":"复制","icon":"copy"},{"label":"编辑","icon":"edit"},{"label":"删除","icon":"trash"}]'></oas-speed-dial>
  </div>
  <span id="sd-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 200px"></span>
</DemoBlock>

## 悬停触发

`trigger="hover"`：鼠标悬停主按钮即展开，移出后 120ms 宽限期收起（宽限期内移入面板不收起）；触屏设备自动回落 `click` 行为。

<DemoBlock title="hover 触发">
  <div style="width: 200px; height: 160px">
    <oas-speed-dial trigger="hover" id="sd-hover" style="position: static" actions='[{"label":"复制","icon":"copy"},{"label":"编辑","icon":"edit"},{"label":"删除","icon":"trash"}]'></oas-speed-dial>
  </div>
  <span id="sd-hover-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 200px"></span>
</DemoBlock>

## 自定义主钮图标

主按钮默认显示「＋」，通过默认插槽传入自定义图标（展开时仍旋转 45°）。

<DemoBlock title="自定义主钮图标">
  <div style="width: 200px; height: 160px">
    <oas-speed-dial style="position: static" actions='[{"label":"复制","icon":"copy"},{"label":"编辑","icon":"edit"}]'>
      <svg viewBox="0 0 16 16" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M8 3v10M3 8h10"/>
      </svg>
    </oas-speed-dial>
  </div>
</DemoBlock>

## 键盘导航

展开后自动聚焦第一个子动作；方向键在动作间移动（纵向展开用 `ArrowUp`/`ArrowDown`，横向展开用 `ArrowLeft`/`ArrowRight`，循环），`Home`/`End` 跳首尾，`Esc` 收起并回焦主按钮。

<DemoBlock title="键盘导航">
  <div style="width: 200px; height: 160px">
    <oas-speed-dial style="position: static" actions='[{"label":"复制","icon":"copy"},{"label":"编辑","icon":"edit"},{"label":"删除","icon":"trash"}]'></oas-speed-dial>
  </div>
</DemoBlock>

## 受控 open

`open` 属性受控：外部设置/移除即展开/收起，组件自身点击也会同步属性并派发 `oas-open`（点击外部 / Esc 仍会收起）。

<DemoBlock title="受控展开">
  <div style="width: 200px; height: 160px">
    <oas-speed-dial id="sd-ctrl" style="position: static" actions='[{"label":"新建","icon":"plus"},{"label":"上传","icon":"upload"},{"label":"下载","icon":"download"}]'></oas-speed-dial>
  </div>
  <oas-button-group>
    <oas-button type="primary" size="small" onclick="event.stopPropagation(); sdCtrl(true)">展开</oas-button>
    <oas-button size="small" onclick="event.stopPropagation(); sdCtrl(false)">收起</oas-button>
    <oas-tag id="sd-status" type="info">open: false</oas-tag>
  </oas-button-group>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const el = document.getElementById('sd-event')
  const out = document.getElementById('sd-out')
  el?.addEventListener('oas-open', (e) => {
    out.textContent = `oas-open: { open: ${e.detail.open}, reason: "${e.detail.reason}" }`
  })
  el?.addEventListener('oas-select', (e) => {
    out.textContent = `oas-select: { index: ${e.detail.index}, label: "${e.detail.label}" }`
  })

  const hover = document.getElementById('sd-hover')
  const hoverOut = document.getElementById('sd-hover-out')
  hover?.addEventListener('oas-open', (e) => {
    hoverOut.textContent = `oas-open: { open: ${e.detail.open}, reason: "${e.detail.reason}" }`
  })

  const ctrl = document.getElementById('sd-ctrl')
  const status = document.getElementById('sd-status')
  if (ctrl && status) {
    const sync = () => {
      status.textContent = `open: ${ctrl.hasAttribute('open')}`
    }
    window.sdCtrl = (open) => {
      if (open) ctrl.setAttribute('open', '')
      else ctrl.removeAttribute('open')
    }
    sync()
    // 组件自身点击 / 点击外部 / Esc 都会改 open，用 MutationObserver 保持状态同步
    new MutationObserver(sync).observe(ctrl, { attributes: true, attributeFilter: ['open'] })
  }

  const arc = document.getElementById('sd-arc')
  window.sdArc = (r) => {
    arc?.setAttribute('radius', String(r))
  }
})
</script>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `actions` | 子动作 JSON（`[{ label, icon?, 'hide-label'? }]`；`hide-label: true` 时子动作只渲染 icon 为圆形小钮，label 视觉隐藏、hover/键盘聚焦时浮出文字气泡；未提供可渲染 icon 时回落显示 label） | `string` | `[]` |
| `direction` | 展开方向 | `string` | `up` |
| `geometry` | 展开几何：`linear`（默认，链式排布）/ `circle`（整圆，从正上均分）/ `semi-circle`（半圆，以 `direction` 为轴）/ `quarter-circle`（四分之一圆，起始象限随 `direction`：up=左上、down=右下、left=左下、right=右上） | `string` | `linear` |
| `open` | 展开态（受控） | `boolean` | — |
| `radius` | 圆弧半径（px，默认 96；仅 `geometry` 非 linear 时生效，非法值回落 96） | — | — |
| `trigger` | 触发方式：`click`（默认）\| `hover`（悬停开、移出收起，120ms 离开宽限期；触屏自动回落 click） | `string` | `click` |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-open` | 展开/收起，`detail: { open, reason }`；reason = `toggle` / `outside` / `escape` / `select` / `hover`（来源标记，向后兼容 open 字段） |
| `oas-select` | 选择子动作，`detail: { index, label }`，随后自动收起 |

### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | 主钮自定义图标，有内容时替代默认 ＋（展开旋转 45° 保持） |

`SpeedDialAction` 字段：

| 字段   | 说明                                       | 类型     |
| ------ | ------------------------------------------ | -------- |
| `label` | 动作文案                                   | `string` |
| `icon`  | 图标名（`@oas-ui/icons` 的 iconRegistry 键） | `string` |
| `hide-label` | true 时只渲染 icon（圆形小钮），label 视觉隐藏、hover/键盘聚焦时浮出文字气泡；未提供可渲染 icon 时回落显示 label | `boolean` |

行为：点击主按钮切换展开（`aria-expanded` 同步）；`trigger="hover"` 可改为悬停触发（触屏回落 click）；点击外部或 Esc 收起（Esc 后焦点回到主按钮）；点击子动作收起并派发 `oas-select`；展开时自动聚焦第一个子动作，方向键/Home/End 在动作间导航；`hide-label` 子动作的 menuitem 以 `aria-label` 保留可访问名。默认定位 `position: fixed; bottom/right`，可覆盖。文档级监听仅在展开时挂载、断开连接清理，无孤儿浮层。
