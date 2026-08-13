# Popover 气泡卡片

点击触发，可承载标题、正文与自定义内容的浮层面板。支持嵌套浮层与虚拟触发（图表/画布坐标提示）。

## 基础用法

<DemoBlock title="点击触发">
  <oas-popover title="卡片标题" content="点击触发元素切换显隐，点击外部或按 Esc 关闭。" placement="bottom">
    <oas-button type="primary">点击打开</oas-button>
  </oas-popover>
</DemoBlock>

## 放置方向

<DemoBlock title="四个方向">
  <oas-popover title="标题" content="内容" placement="top">
    <oas-button>上</oas-button>
  </oas-popover>
  <oas-popover title="标题" content="内容" placement="bottom">
    <oas-button>下</oas-button>
  </oas-popover>
  <oas-popover title="标题" content="内容" placement="left">
    <oas-button>左</oas-button>
  </oas-popover>
  <oas-popover title="标题" content="内容" placement="right">
    <oas-button>右</oas-button>
  </oas-popover>
</DemoBlock>

## 箭头与视口自动调整

默认显示指向触发元素边缘的箭头；`arrow="false"` 隐藏箭头；`arrow-point-at-center` 让箭头指向触发元素中心（视口边缘避让导致面板偏移时，箭头仍指向锚点中心）。默认空间不足时自动沿主轴翻转并避让视口边缘；`auto-adjust-overflow="false"` 关闭自动调整，面板保持声明 placement（可能溢出视口）。

<DemoBlock title="箭头显隐与指向">
  <oas-space size="large" wrap>
    <oas-popover id="pop-arrow-default" title="默认" content="默认显示箭头" placement="bottom">
      <oas-button>默认</oas-button>
    </oas-popover>
    <oas-popover id="pop-arrow-off" title="无箭头" content="arrow=false：隐藏箭头" placement="bottom" arrow="false">
      <oas-button>无箭头</oas-button>
    </oas-popover>
    <oas-popover id="pop-arrow-center" title="指向中心" content="arrow-point-at-center：箭头指向触发元素中心" placement="bottom" arrow-point-at-center>
      <oas-button>指向中心</oas-button>
    </oas-popover>
  </oas-space>
</DemoBlock>

<DemoBlock title="关闭自动调整">
  <oas-popover title="保持方向" content="auto-adjust-overflow=false：面板保持声明 placement，可能溢出视口。" placement="bottom" auto-adjust-overflow="false">
    <oas-button>关闭自动调整</oas-button>
  </oas-popover>
</DemoBlock>

## 自定义内容

<DemoBlock title="自定义内容（slot=content）">
  <oas-popover title="操作面板" placement="bottom">
    <oas-button>打开面板</oas-button>
    <div slot="content" style="line-height: 1.8">
      通过 <code>slot="content"</code> 可以放置任意自定义内容。
    </div>
  </oas-popover>
</DemoBlock>

## 嵌套浮层

浮层内容里可以再打开子浮层（popover / tooltip）：子浮层从父浮层内容触发，层级与定位自动正确；父层关闭时子层一并关闭；`Esc` 逐层关闭并逐层还原焦点。

<DemoBlock title="嵌套浮层（卡片内再弹）">
  <oas-popover id="pop-parent" title="主卡片" placement="bottom" focus-on-open>
    <oas-button type="primary">打开主卡片</oas-button>
    <div slot="content" style="width: 240px; line-height: 1.8">
      <p style="margin: 0 0 8px">父面板内再触发子浮层：</p>
      <oas-popover id="pop-child" title="子卡片" content="子浮层随父层一并关闭，Esc 逐层关闭。" placement="right" focus-on-open>
        <oas-button size="small">打开子卡片</oas-button>
      </oas-popover>
    </div>
  </oas-popover>
</DemoBlock>

## 虚拟触发

`virtual` 模式没有真实锚点（同 tooltip）：由宿主通过 `virtual-x` / `virtual-y`（视口坐标）或 `virtual-anchor`（锚点元素选择器）指定位置，适合图表、画布上的坐标提示；设置 `open` 控制显隐。虚拟模式下点击触发元素与外部点击都不改变状态，生命周期完全由宿主控制。

<DemoBlock title="虚拟触发（画布坐标跟随）">
  <oas-popover id="pop-virt" virtual virtual-x="0" virtual-y="0" placement="top" title="画布坐标"></oas-popover>
  <div id="virt-canvas" style="position: relative; height: 140px; width: 100%; min-width: 200px; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md); background: var(--oas-color-bg-hover);">
    <p style="position: absolute; inset: 0; margin: 0; display: grid; place-items: center; text-align: center; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm);">移动鼠标查看坐标提示</p>
  </div>
</DemoBlock>

<DemoBlock title="虚拟触发（锚点坐标定位）">
  <oas-space size="small">
    <oas-button type="primary" size="small" onclick="event.stopPropagation(); popPointShow(160, 90)">在 (160, 90) 打开</oas-button>
    <oas-button size="small" onclick="event.stopPropagation(); popPointHide()">关闭</oas-button>
    <oas-tag id="pop-point-status" type="info">open: false</oas-tag>
  </oas-space>
  <oas-popover id="pop-point" virtual virtual-x="160" virtual-y="90" placement="right" title="定点提示" content="由 virtual-x / virtual-y 指定锚点坐标，适合图表数据点提示。"></oas-popover>
</DemoBlock>

<DemoBlock title="虚拟触发（锚点元素跟随）">
  <div id="pop-chart" style="position: relative; height: 120px; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md); background: var(--oas-color-bg-hover);">
    <div id="pop-dot-0" style="position: absolute; left: 90px; top: 34px; width: 8px; height: 8px; border-radius: 50%; background: var(--oas-color-primary);"></div>
    <div id="pop-dot-1" style="position: absolute; left: 200px; top: 60px; width: 8px; height: 8px; border-radius: 50%; background: var(--oas-color-primary);"></div>
  </div>
  <oas-popover id="pop-anchor" virtual virtual-anchor="#pop-dot-0" placement="top" title="数据点" content="由 virtual-anchor 指定锚点元素，适合图表点位提示。"></oas-popover>
</DemoBlock>

## 受控显示

`open` 属性受控：外部按钮设置 / 移除 `open` 控制显隐（点击外部 / Esc 仍会关闭）。

<DemoBlock title="受控显示（open 属性）">
  <oas-space size="small">
    <oas-button type="primary" size="small" onclick="event.stopPropagation(); popoverCtrl(true)">打开</oas-button>
    <oas-button size="small" onclick="event.stopPropagation(); popoverCtrl(false)">关闭</oas-button>
    <oas-tag id="pop-status" type="info">open: false</oas-tag>
  </oas-space>
  <oas-popover id="pop-ctrl" title="受控面板" content="由 open 属性控制，点击外部 / Esc 关闭。" placement="bottom">
    <oas-button>触发元素</oas-button>
  </oas-popover>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const pop = document.getElementById('pop-ctrl')
  const status = document.getElementById('pop-status')
  if (pop && status) {
    const sync = () => {
      status.textContent = `open: ${pop.hasAttribute('open')}`
    }
    window.popoverCtrl = (open) => {
      if (open) pop.setAttribute('open', '')
      else pop.removeAttribute('open')
    }
    sync()
    // 点击外部 / Esc 由组件移除 open，用 MutationObserver 保持状态同步
    new MutationObserver(sync).observe(pop, { attributes: true, attributeFilter: ['open'] })
  }

  // 虚拟触发：画布坐标跟随（宿主 mousemove 更新 virtual-x/virtual-y，open 控制显隐）
  const virt = document.getElementById('pop-virt')
  const canvas = document.getElementById('virt-canvas')
  if (virt && canvas) {
    canvas.addEventListener('mousemove', (e) => {
      virt.setAttribute('open', '')
      virt.setAttribute('virtual-x', String(e.clientX))
      virt.setAttribute('virtual-y', String(e.clientY))
      virt.setAttribute('content', `x: ${e.clientX}px，y: ${e.clientY}px`)
    })
    canvas.addEventListener('mouseleave', () => virt.removeAttribute('open'))
  }

  // 虚拟触发：锚点坐标定位（宿主显式指定 virtual-x/virtual-y 后打开）
  const point = document.getElementById('pop-point')
  if (point) {
    window.popPointShow = (x, y) => {
      point.setAttribute('virtual-x', String(x))
      point.setAttribute('virtual-y', String(y))
      point.setAttribute('open', '')
    }
    window.popPointHide = () => point.removeAttribute('open')
    // oas-open-change 可见反馈：状态 tag 回显 open
    const st = document.getElementById('pop-point-status')
    point.addEventListener('oas-open-change', (e) => {
      if (st) st.textContent = `open: ${e.detail.open}`
    })
  }

  // 虚拟触发：锚点元素跟随（hover 点位显示，virtual-anchor 负责锚定）
  const anchor = document.getElementById('pop-anchor')
  const dot0 = document.getElementById('pop-dot-0')
  const dot1 = document.getElementById('pop-dot-1')
  if (anchor && dot0 && dot1) {
    dot0.addEventListener('mouseenter', () => {
      anchor.setAttribute('virtual-anchor', '#pop-dot-0')
      anchor.setAttribute('open', '')
    })
    dot1.addEventListener('mouseenter', () => {
      anchor.setAttribute('virtual-anchor', '#pop-dot-1')
      anchor.setAttribute('open', '')
    })
    const hide = () => anchor.removeAttribute('open')
    dot0.addEventListener('mouseleave', hide)
    dot1.addEventListener('mouseleave', hide)
  }
})
</script>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `arrow` | 是否显示箭头（默认 true；`arrow="false"` 隐藏，箭头元素与 `::part(arrow)` 保留） | `string` | `true` |
| `arrow-point-at-center` | 箭头指向触发元素中心（默认指向触发元素边缘；视口边缘避让导致面板偏移时箭头仍指向锚点中心） | `boolean` | — |
| `auto-adjust-overflow` | 视口边缘自动翻转与避让（默认 true；`"false"` 关闭，保持声明 placement，可能溢出视口） | `string` | `true` |
| `content` | 正文文本 | `string` | — |
| `focus-on-open` | 打开时焦点移入面板内首个可聚焦元素 | `boolean` | — |
| `open` | 受控显示（布尔属性，存在即显示） | `boolean` | — |
| `placement` | 浮层位置 | `Placement` | `top` |
| `title` | 标题文本 | `string` | — |
| `virtual` | 虚拟触发模式（同 tooltip，不依赖锚点元素） | `boolean` | — |
| `virtual-anchor` | 虚拟锚点元素选择器（virtual-x/virtual-y 未设置时生效） | — | — |
| `virtual-x` | 虚拟锚点 x（视口坐标，px） | — | — |
| `virtual-y` | 虚拟锚点 y（视口坐标，px） | — | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-open-change` | open 状态变化，`detail: { open }` |

### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | — |
| `content` | — |

点击触发元素切换显隐，点击外部或按 Esc 关闭；`role="dialog"`。嵌套浮层：父关闭时级联关闭子层，`Esc` 逐层关闭并还原焦点到触发元素。
