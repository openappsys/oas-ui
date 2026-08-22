# Tooltip 文字提示

简单的文字提示气泡，hover 或键盘聚焦触发。

## 基础用法

<DemoBlock title="悬停触发">
  <oas-tooltip content="这是一条提示文字">
    <oas-button type="primary">悬停查看</oas-button>
  </oas-tooltip>
</DemoBlock>

## 放置方向

<DemoBlock title="四个方向">
  <oas-tooltip content="提示在上方" placement="top">
    <oas-button>上</oas-button>
  </oas-tooltip>
  <oas-tooltip content="提示在下方" placement="bottom">
    <oas-button>下</oas-button>
  </oas-tooltip>
  <oas-tooltip content="提示在左侧" placement="left">
    <oas-button>左</oas-button>
  </oas-tooltip>
  <oas-tooltip content="提示在右侧" placement="right">
    <oas-button>右</oas-button>
  </oas-tooltip>
</DemoBlock>

空间不足时自动沿主轴翻转，并在视口边缘避让。

## 箭头

默认显示指向触发元素边缘的箭头；`arrow="false"` 隐藏箭头；`arrow-point-at-center` 让箭头指向触发元素中心（视口边缘避让导致面板偏移时，箭头仍指向锚点中心）。

<DemoBlock title="箭头显隐与指向">
  <oas-space size="large" wrap>
    <oas-tooltip id="tt-arrow-default" content="默认显示箭头">
      <oas-button>默认</oas-button>
    </oas-tooltip>
    <oas-tooltip id="tt-arrow-off" content="arrow=false：隐藏箭头" arrow="false">
      <oas-button>无箭头</oas-button>
    </oas-tooltip>
    <oas-tooltip id="tt-arrow-center" content="arrow-point-at-center：箭头指向触发元素中心" arrow-point-at-center>
      <oas-button>指向中心</oas-button>
    </oas-tooltip>
  </oas-space>
</DemoBlock>

`arrow-position="merge"` 让箭头与面板角融合成直角三角尖（通用形态，仅 `*-start` / `*-end` placement 生效）：直角三角贴角、直角边与面板两边共线，尖端正交指向锚点所在侧。

<DemoBlock title="箭头 merge 融合模式">
  <oas-tooltip content="箭头与面板角融合" placement="bottom-start" arrow-position="merge">
    <oas-button>bottom-start + merge</oas-button>
  </oas-tooltip>
</DemoBlock>

## 视口边缘自动调整

默认空间不足时自动沿主轴翻转并避让视口边缘；`auto-adjust-overflow="false"` 关闭自动调整，面板保持声明 placement（可能溢出视口）。

<DemoBlock title="关闭自动调整">
  <oas-tooltip content="auto-adjust-overflow=false：保持 placement=bottom" placement="bottom" auto-adjust-overflow="false">
    <oas-button>关闭自动调整</oas-button>
  </oas-tooltip>
</DemoBlock>

## 聚焦触发

<DemoBlock title="键盘聚焦触发">
  <oas-tooltip content="通过 Tab 聚焦也能看到我">
    <oas-button>Tab 聚焦我</oas-button>
  </oas-tooltip>
</DemoBlock>

## 受控显示

`open` 属性受控：外部按钮设置 / 移除 `open` 即可显示 / 隐藏提示（hover / focus 触发仍叠加生效）。

<DemoBlock title="受控显示（open 属性）">
  <oas-space size="small">
    <oas-button type="primary" size="small" onclick="tipCtrl(true)">显示</oas-button>
    <oas-button size="small" onclick="tipCtrl(false)">隐藏</oas-button>
    <oas-tag id="tip-status" type="info">open: false</oas-tag>
  </oas-space>
  <oas-tooltip id="tip-ctrl" content="由 open 属性控制显隐" placement="bottom">
    <oas-button>触发元素</oas-button>
  </oas-tooltip>
</DemoBlock>

## 长文本

<DemoBlock title="长文本与最大宽度">
  <oas-tooltip content="这是一段较长的提示文字，用于演示最大宽度限制与自动换行，最长不超过 240px。" placement="bottom">
    <oas-button>悬停查看长提示</oas-button>
  </oas-tooltip>
</DemoBlock>

## 虚拟触发

虚拟模式（`virtual`）不绑定宿主触发元素：`open` 完全受外部控制，位置由 `virtual-anchor`（锚点元素选择器）或 `virtual-x` / `virtual-y`（视口坐标）指定，`placement` 仍生效。适合图表点位、拖拽中的浮层提示等无法用普通触发元素的场景。

<DemoBlock title="虚拟锚点跟随（图表点位）">
  <div class="vp-chart" id="vp-chart">
    <span class="vp-dot" id="vp-dot-0" style="left: 15%; bottom: 45%" data-label="Q1 营收 12.4w"></span>
    <span class="vp-dot" id="vp-dot-1" style="left: 40%; bottom: 75%" data-label="Q2 营收 15.1w"></span>
    <span class="vp-dot" id="vp-dot-2" style="left: 65%; bottom: 35%" data-label="Q3 营收 18.9w"></span>
    <span class="vp-dot" id="vp-dot-3" style="left: 90%; bottom: 60%" data-label="Q4 营收 21.6w"></span>
    <span class="vp-axis">月份 →</span>
  </div>
  <oas-tooltip id="tt-anchor" virtual virtual-anchor="#vp-dot-0" content="Q1 营收 12.4w" placement="top"></oas-tooltip>
  <p class="vp-hint">悬停任意点位查看提示（tooltip 锚定该点显示）。</p>
</DemoBlock>

<DemoBlock title="坐标跟随（鼠标移动）">
  <div class="vp-canvas" id="vp-canvas">
    在此区域内移动鼠标
    <oas-tag id="tt-follow-status" type="info" size="small">未跟随</oas-tag>
  </div>
  <oas-tooltip id="tt-follow" virtual virtual-x="0" virtual-y="0" content="坐标：0, 0" placement="bottom"></oas-tooltip>
</DemoBlock>

<style>
.vp-chart {
  position: relative;
  width: 100%;
  height: 160px;
  background: var(--oas-color-bg-hover);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
}
.vp-dot {
  position: absolute;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--oas-color-primary);
  cursor: pointer;
  transform: translate(-50%, -50%);
}
.vp-dot:hover {
  background: var(--oas-color-primary-hover);
}
.vp-axis {
  position: absolute;
  left: var(--oas-space-4);
  bottom: var(--oas-space-2);
  font-size: var(--oas-font-size-xs);
  /* 落在 bg-hover 上，text-secondary 对比度 4.39:1 < 4.5:1 → 用 text-primary */
  color: var(--oas-color-text-primary);
}
.vp-canvas {
  width: 100%;
  height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--oas-space-3);
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-primary);
  background: var(--oas-color-bg-hover);
  border: 1px dashed var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  cursor: crosshair;
}
.vp-hint {
  margin: var(--oas-space-2) 0 0;
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
.vp-clip {
  overflow: hidden;
  border: 1px dashed var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  padding: var(--oas-space-4);
  display: inline-block;
}
</style>

## 触发方式

`trigger` 属性支持空格分隔的多选组合：`hover`（悬停）/ `focus`（聚焦）/ `click`（点击）/ `contextmenu`（右键）/ `touch`（长按）/ `manual`（完全受控）。默认 `hover focus`。

<DemoBlock title="点击触发">
  <oas-tooltip trigger="click" content="点击我试试">
    <oas-button>点击触发</oas-button>
  </oas-tooltip>
</DemoBlock>

<DemoBlock title="右键触发">
  <oas-tooltip trigger="contextmenu" content="右键弹出提示">
    <oas-button>右键我</oas-button>
  </oas-tooltip>
</DemoBlock>

<DemoBlock title="手动触发（manual）">
  <oas-space size="small">
    <oas-button size="small" onclick="manualTip(true)">显示</oas-button>
    <oas-button size="small" onclick="manualTip(false)">隐藏</oas-button>
  </oas-space>
  <oas-tooltip id="tip-manual" trigger="manual" content="仅由 open 属性控制">
    <oas-button>受控触发元素</oas-button>
  </oas-tooltip>
</DemoBlock>

## 显示延迟

`open-delay` / `close-delay` 控制悬停显示/隐藏的延迟（ms），避免快速滑过时误触发。

<DemoBlock title="显示延迟与隐藏延迟">
  <oas-tooltip trigger="hover" open-delay="300" close-delay="200" content="悬停 300ms 后才显示，移出 200ms 后才隐藏">
    <oas-button>延迟 300ms 显示</oas-button>
  </oas-tooltip>
</DemoBlock>

连续在多个触发元素间快速移动时，`skip-delay-duration`（默认 300ms）会让下一个 tooltip 跳过 open-delay 立即显示，保持响应连贯。

<DemoBlock title="延迟组（skip-delay-duration）">
  <oas-space size="large" wrap>
    <oas-tooltip trigger="hover" open-delay="300" skip-delay-duration="500" content="第一个：延迟 300ms">
      <oas-button>悬停我（从上一个移过来会立即显示）</oas-button>
    </oas-tooltip>
    <oas-tooltip trigger="hover" open-delay="300" skip-delay-duration="500" content="第二个：从上一个移过来跳过延迟">
      <oas-button>再悬停我</oas-button>
    </oas-tooltip>
  </oas-space>
</DemoBlock>

触屏设备上 `trigger="touch"` 长按显示（`touch-delay` 控制长按时长，默认 500ms）。

<DemoBlock title="触屏长按触发">
  <oas-tooltip trigger="touch" touch-delay="600" content="长按 600ms 后显示（触屏）">
    <oas-button>长按我（触屏）</oas-button>
  </oas-tooltip>
</DemoBlock>

## 富内容

`content` 属性显示纯文本；需要富内容（链接、图标、多行）时用 `slot="content"` 插槽，插槽存在时优先于属性文本。

<DemoBlock title="富内容插槽">
  <oas-tooltip placement="top">
    <oas-button>悬停查看富内容</oas-button>
    <span slot="content">
      <oas-space size="small" direction="vertical">
        <span><strong>关键提示</strong></span>
        <span>可以包含 <a href="#" onclick="return false">链接</a> 或图标等富内容</span>
        <oas-icon name="info" size="16" color="var(--oas-color-primary)"></oas-icon>
      </oas-space>
    </span>
  </oas-tooltip>
</DemoBlock>

## 键盘可达

打开状态下按 <kbd>Esc</kbd> 关闭，焦点还原到触发元素；打开时触发元素自动关联 `aria-describedby` 指向浮层（屏幕阅读器可读）。

<DemoBlock title="Esc 关闭 + aria-describedby">
  <oas-tooltip id="tip-esc" content="按 Esc 关闭我" placement="bottom">
    <oas-button>聚焦后按 Esc</oas-button>
  </oas-tooltip>
</DemoBlock>

`trigger-keys` 可指定按键（空格分隔）在聚焦时打开，如 `trigger-keys="F1"`。

<DemoBlock title="trigger-keys 按键打开">
  <oas-tooltip trigger="hover" trigger-keys="F1" content="聚焦后按 F1 打开">
    <oas-button>聚焦后按 F1</oas-button>
  </oas-tooltip>
</DemoBlock>

## 最大宽度

默认最大宽度 `240px`（`--oas-tooltip-max-width` token 开口），`max-width` 属性可覆盖（数字或 CSS 长度）。

<DemoBlock title="自定义最大宽度">
  <oas-tooltip content="这段内容很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长" max-width="360" placement="bottom">
    <oas-button>max-width=360</oas-button>
  </oas-tooltip>
</DemoBlock>

## 禁用

`disabled` 时 tooltip 不显示（hover / 受控 open 均不生效）。

<DemoBlock title="禁用">
  <oas-tooltip disabled content="不会显示">
    <oas-button>禁用提示</oas-button>
  </oas-tooltip>
</DemoBlock>

## 可悬停浮层

`interactive` 让浮层可悬停（鼠标移入浮层不关闭，浮层内链接可达）。

<DemoBlock title="interactive 可悬停">
  <oas-tooltip interactive placement="bottom" content="悬停浮层不会消失，可以点击里面的链接">
    <oas-button>interactive</oas-button>
  </oas-tooltip>
</DemoBlock>

## 偏移与碰撞

`offset` 控制主轴距离（默认 8px），`skidding` 控制交叉轴偏移，`collision-padding` 控制视口边缘避让边距（默认 4px）。

<DemoBlock title="offset / skidding">
  <oas-tooltip content="offset=16 距离更远" offset="16" placement="bottom">
    <oas-button>offset=16</oas-button>
  </oas-tooltip>
  <oas-tooltip content="skidding=24 向右偏移" skidding="24" placement="bottom">
    <oas-button>skidding=24</oas-button>
  </oas-tooltip>
</DemoBlock>

<DemoBlock title="collision-padding">
  <oas-tooltip content="贴左缘时避让 20px" collision-padding="20" placement="bottom">
    <oas-button>collision-padding=20</oas-button>
  </oas-tooltip>
</DemoBlock>

## 颜色变体

`color` 属性支持语义色（`primary` / `success` / `warning` / `danger`）、11 预设名（如 `magenta`、`blue`）或任意 CSS 色值，全部走 token（含 dark 变体）。

<DemoBlock title="颜色变体">
  <oas-space size="large" wrap>
    <oas-tooltip content="主要提示" color="primary">
      <oas-button>primary</oas-button>
    </oas-tooltip>
    <oas-tooltip content="成功提示" color="success">
      <oas-button>success</oas-button>
    </oas-tooltip>
    <oas-tooltip content="警告提示" color="warning">
      <oas-button>warning</oas-button>
    </oas-tooltip>
    <oas-tooltip content="危险提示" color="danger">
      <oas-button>danger</oas-button>
    </oas-tooltip>
  </oas-space>
</DemoBlock>

## 挂载点

`append-to` 把浮层挂载到指定容器（`body` 或 CSS 选择器），脱离裁剪上下文（如 `overflow: hidden` 祖先）。

<DemoBlock title="append-to body">
  <div class="vp-clip">
    <oas-tooltip content="虽然父容器 overflow:hidden，我仍完整显示" append-to="body" placement="bottom">
      <oas-button>挂载到 body</oas-button>
    </oas-tooltip>
  </div>
</DemoBlock>

## 自动关闭

`auto-close`（ms）在打开后自动关闭，适合引导提示等场景。

<DemoBlock title="auto-close">
  <oas-tooltip trigger="click" auto-close="1500" content="1.5 秒后自动关闭">
    <oas-button>点击后自动关闭</oas-button>
  </oas-tooltip>
</DemoBlock>

## 新鲜内容

`fresh` 默认开启：关闭状态下内容变化也即时同步（再次打开所见即最新）；`fresh="false"` 时关闭期间冻结内容。

<DemoBlock title="fresh 内容同步">
  <oas-tooltip id="tip-fresh" content="初始内容" trigger="hover">
    <oas-button>悬停查看（下方按钮改内容）</oas-button>
  </oas-tooltip>
  <oas-button size="small" onclick="freshChange()">改内容</oas-button>
</DemoBlock>

## 边界

<DemoBlock title="空内容">
  <oas-tooltip placement="bottom">
    <oas-button>无内容提示</oas-button>
  </oas-tooltip>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const tip = document.getElementById('tip-ctrl')
  const status = document.getElementById('tip-status')
  if (tip && status) {
    const sync = () => {
      status.textContent = `open: ${tip.hasAttribute('open')}`
    }
    window.tipCtrl = (open) => {
      if (open) tip.setAttribute('open', '')
      else tip.removeAttribute('open')
    }
    sync()
    // hover / focus 触发与外部控制都会改 open，用 MutationObserver 保持状态同步
    new MutationObserver(sync).observe(tip, { attributes: true, attributeFilter: ['open'] })
  }

  // 虚拟锚点：hover 点位 → virtual-anchor 指向该点 + 更新内容 + open
  const anchorTip = document.getElementById('tt-anchor')
  if (anchorTip) {
    document.querySelectorAll('#vp-chart .vp-dot').forEach((dot) => {
      dot.addEventListener('mouseenter', () => {
        anchorTip.setAttribute('virtual-anchor', `#${dot.id}`)
        anchorTip.setAttribute('content', dot.dataset.label || '')
        anchorTip.setAttribute('open', '')
      })
      dot.addEventListener('mouseleave', () => anchorTip.removeAttribute('open'))
    })
  }

  // 坐标跟随：画布 mousemove → virtual-x/y + open；移出关闭
  const canvas = document.getElementById('vp-canvas')
  const followTip = document.getElementById('tt-follow')
  const followStatus = document.getElementById('tt-follow-status')
  if (canvas && followTip) {
    canvas.addEventListener('mousemove', (e) => {
      followTip.setAttribute('virtual-x', String(e.clientX))
      followTip.setAttribute('virtual-y', String(e.clientY))
      followTip.setAttribute('content', `坐标：${e.clientX}, ${e.clientY}`)
      followTip.setAttribute('open', '')
    })
    canvas.addEventListener('mouseleave', () => followTip.removeAttribute('open'))
  }
  if (followTip && followStatus) {
    const syncFollow = () => {
      followStatus.textContent = followTip.hasAttribute('open') ? '跟随中' : '未跟随'
    }
    syncFollow()
    new MutationObserver(syncFollow).observe(followTip, {
      attributes: true,
      attributeFilter: ['open'],
    })
  }

  // manual 触发：外部按钮受控显隐
  const manualTip = document.getElementById('tip-manual')
  if (manualTip) {
    window.manualTip = (open) => {
      if (open) manualTip.setAttribute('open', '')
      else manualTip.removeAttribute('open')
    }
  }

  // fresh 演示：动态改内容，展示关闭状态下内容仍同步（open 时所见即最新）
  const freshTip = document.getElementById('tip-fresh')
  if (freshTip) {
    window.freshChange = () => {
      freshTip.setAttribute('content', `内容已更新：${new Date().toLocaleTimeString()}`)
    }
  }
})
</script>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `append-to` | 浮层挂载点：`body` 或 CSS 选择器。把浮层移入目标容器的独立 shadow（样式作用域保真），脱离 `overflow: hidden` / transform 等裁剪上下文；挂载期间 `::part(tip)` 无法从宿主穿透，定制走 CSS 变量或类选择器 | `string` | — |
| `arrow` | 是否显示箭头（默认 true；`arrow="false"` 隐藏，箭头元素与 `::part(arrow)` 保留） | `string` | `true` |
| `arrow-point-at-center` | 箭头指向触发元素中心（默认指向触发元素边缘；视口边缘避让导致面板偏移时箭头仍指向锚点中心） | `boolean` | — |
| `arrow-position` | 箭头形态：`center`（默认，箭头在面板边缘居中）/ `merge`（仅 `*-start`/`*-end` placement 生效，直角三角与面板角共边融合：直角贴角点、直角边与面板两边共线，尖端正交指向锚点，通用形态） | `string` | `center` |
| `auto-adjust-overflow` | 视口边缘自动翻转与避让（默认 true；`"false"` 关闭，保持声明 placement，可能溢出视口） | `string` | `true` |
| `auto-close` | 打开后自动关闭时长（ms），`0` 或缺省不自动关闭 | — | — |
| `close-delay` | 隐藏延迟（ms，默认 0）：mouseleave/focusout 后延迟关闭 | — | — |
| `collision-padding` | 视口边缘避让边距（px，默认 4）：浮层被视口夹取时与边缘保留的距离 | — | — |
| `color` | 颜色变体：语义色 `primary`/`success`/`warning`/`danger`、11 预设名（如 `magenta`、`blue`）或任意 CSS 色值；全部走 token（含 dark 变体），箭头底色同步 | `string` | — |
| `content` | 提示内容文本（`slot="content"` 富内容存在时优先于属性文本） | `string` | — |
| `disabled` | 禁用：tooltip 不显示（hover / 受控 open 均不生效） | `boolean` | — |
| `fresh` | 内容新鲜度（默认 true）：关闭期间内容变化也即时同步；`"false"` 时关闭期间冻结内容，再次打开才更新 | `string` | `true` |
| `interactive` | 浮层可悬停：鼠标移入浮层不关闭（`pointer-events: auto`），浮层内链接可达 | `boolean` | — |
| `max-width` | 浮层最大宽度（数字补 px 或 CSS 长度，默认走 `--oas-tooltip-max-width` token 240px） | `string` | — |
| `offset` | 主轴距离（px，默认 8）：浮层与锚点沿主轴的间隔 | — | — |
| `open` | 受控显示（布尔属性，存在即显示） | `boolean` | — |
| `open-delay` | 显示延迟（ms，默认 0）：mouseenter/focusin 后延迟打开；`skip-delay-duration` 命中时跳过 | — | — |
| `placement` | 浮层位置（12 向：top/bottom/left/right × start/center/end） | `Placement` | `top` |
| `skidding` | 交叉轴偏移（px，默认 0）：top/bottom 系列沿水平轴（正右负左）、left/right 系列沿垂直轴（正下负上） | — | — |
| `skip-delay-duration` | 全局延迟组阈值（ms，默认 300）：某 tooltip 关闭后这段时间内打开下一个 tooltip 时跳过 open-delay 立即显示（连续悬停响应连贯）；`"0"` 关闭该行为 | — | — |
| `touch-delay` | touch 长按触发时长（ms，默认 500）：`trigger` 含 `touch` 时 pointerdown 长按到点打开，提前抬手/移出取消 | — | — |
| `trigger` | 触发方式（空格分隔多选）：`hover` / `focus` / `click` / `contextmenu` / `touch` / `manual`，默认 `hover focus`；`manual` 完全受控 | `string` | `hover focus` |
| `trigger-keys` | 指定按键（空格分隔，如 `F1`）：焦点在触发元素上时按该键打开 | `string` | — |
| `virtual` | 虚拟触发模式：不绑定宿主触发元素，`open` 完全受外部控制，位置由 `virtual-anchor` 或 `virtual-x`/`virtual-y` 指定（适合图表点位、拖拽中的浮层提示） | `boolean` | — |
| `virtual-anchor` | 虚拟锚点元素选择器（如 `#chart-point-1`），tooltip 按该元素矩形定位；与 `virtual-x`/`virtual-y` 二选一，坐标优先 | — | — |
| `virtual-x` | 虚拟锚点视口 X 坐标（px，如鼠标 `clientX`），与 `virtual-y` 同时设置时按坐标定位 | — | — |
| `virtual-y` | 虚拟锚点视口 Y 坐标（px，如鼠标 `clientY`），与 `virtual-x` 同时设置时按坐标定位 | — | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-open-change` | open 状态变化（显示/隐藏）时派发，`detail: { open }` |

### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | 触发元素（hover/focus 触发）；`virtual` 虚拟模式下可省略 |
| `content` | 富内容（存在时优先于 `content` 属性文本显示） |

`oas-open-change`：`open` 状态变化（显示/隐藏）时派发，`detail: { open }`。hover / focus 触发显隐；`role="tooltip"`，浮层 `pointer-events: none` 不拦截交互。
