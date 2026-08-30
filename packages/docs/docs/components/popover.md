# Popover 气泡卡片

点击 / 悬停 / 聚焦触发，可承载标题、正文与自定义内容的浮层面板。支持 12 向放置、双轴偏移、开合动画、portal、modal 化与嵌套浮层。

## 基础用法

<DemoBlock title="点击触发">
  <oas-popover title="卡片标题" content="点击触发元素切换显隐，点击外部或按 Esc 关闭。" placement="bottom">
    <oas-button type="primary">点击打开</oas-button>
  </oas-popover>
</DemoBlock>

## 放置方向

`placement` 支持 12 向：四基向 `top / bottom / left / right` 各配 `-start` / `-end` 交叉轴对齐（`bottom-start` 面板左缘对齐触发元素左缘，是最常见形态）。空间不足沿主轴翻转时对齐后缀保留（`bottom-start` → `top-start`），对齐后仍做视口夹取。

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

<DemoBlock title="12 向放置（-start / -end）">
  <oas-space size="small">
    <oas-popover title="标题" content="内容" placement="bottom-start">
      <oas-button>bottom-start</oas-button>
    </oas-popover>
    <oas-popover title="标题" content="内容" placement="bottom-end">
      <oas-button>bottom-end</oas-button>
    </oas-popover>
    <oas-popover title="标题" content="内容" placement="right-start">
      <oas-button>right-start</oas-button>
    </oas-popover>
    <oas-popover title="标题" content="内容" placement="top-end">
      <oas-button>top-end</oas-button>
    </oas-popover>
  </oas-space>
</DemoBlock>

## 触发方式

`trigger` 控制触发方式：`click`（默认）/ `hover` / `focus` / `contextmenu` / `manual`，空格分隔可多选（如 `"click hover"`）。hover 触发时 `hover-delay` / `hover-hide-delay` 控制开合防抖延时（默认 150 / 100ms，无延时 hover 会闪开闪关）；悬停区域为触发元素 + 浮层面板（跨间隙移动不闪关）。`manual` 模式不绑定任何宿主事件，显隐完全由宿主 `open` 控制。

<DemoBlock title="悬停触发">
  <oas-space size="small">
    <oas-popover trigger="hover" title="悬停卡片" content="trigger=hover：鼠标移入打开，移出（含移入面板）关闭。" placement="bottom">
      <oas-button>悬停打开</oas-button>
    </oas-popover>
    <oas-popover trigger="click hover" title="多触发" content="trigger=&quot;click hover&quot;：点击或悬停都能开合。" placement="bottom">
      <oas-button>点击或悬停</oas-button>
    </oas-popover>
    <oas-popover trigger="contextmenu" title="右键菜单" content="trigger=contextmenu：右键触发打开。" placement="bottom">
      <oas-button>右键打开</oas-button>
    </oas-popover>
  </oas-space>
</DemoBlock>

<DemoBlock title="自定义开合延时">
  <oas-space size="small">
    <oas-popover trigger="hover" hover-delay="400" title="hover-delay=400" content="悬停 400ms 后打开。" placement="bottom">
      <oas-button>hover-delay=400</oas-button>
    </oas-popover>
    <oas-popover trigger="hover" hover-hide-delay="400" title="hover-hide-delay=400" content="移出 400ms 后关闭。" placement="bottom">
      <oas-button>hover-hide-delay=400</oas-button>
    </oas-popover>
  </oas-space>
</DemoBlock>

<DemoBlock title="通用显隐延迟（open-delay / close-delay）">
  <oas-space size="small">
    <oas-popover open-delay="400" title="open-delay=400" content="点击 400ms 后打开。" placement="bottom">
      <oas-button>open-delay=400</oas-button>
    </oas-popover>
    <oas-popover close-delay="400" title="close-delay=400" content="关闭请求 400ms 后隐藏。" placement="bottom">
      <oas-button>close-delay=400</oas-button>
    </oas-popover>
  </oas-space>
</DemoBlock>

## 禁用

`disabled` 禁用整个 popover：点击 / 悬停 / 聚焦 / 右键 / 按键触发均不响应，宿主降饱和（opacity .6）并同步 `aria-disabled`。禁用触发元素（如原生 disabled button）不会派发鼠标事件，可在外层包一层 span 再挂 popover（兼容方案）。

<DemoBlock title="整体禁用">
  <oas-space size="small">
    <oas-popover disabled title="禁用" content="不会打开。" placement="bottom">
      <oas-button>禁用（click）</oas-button>
    </oas-popover>
    <oas-popover disabled trigger="hover" title="禁用" content="不会打开。" placement="bottom">
      <oas-button>禁用（hover）</oas-button>
    </oas-popover>
  </oas-space>
</DemoBlock>

## 宽度定制

`width` 控制面板宽度：数字（px）、`"trigger"`（与触发元素同宽）或任意 CSS 值（如 `50%`）。`width="trigger"` 适合「面板与触发控件等宽」的下拉选择形态。

<DemoBlock title="宽度定制（width）">
  <oas-space size="small">
    <oas-popover title="固定宽度" content="width=280：面板固定 280px 宽。" placement="bottom" width="280">
      <oas-button>width="280"</oas-button>
    </oas-popover>
    <oas-popover id="pop-width-trigger" title="与触发元素同宽" content="width=trigger：面板宽度 = 触发元素宽度。" placement="bottom" width="trigger">
      <oas-button style="width: 220px">width="trigger"（220px）</oas-button>
    </oas-popover>
    <oas-popover title="百分比宽度" content="width=50%：相对宿主宽度的 50%。" placement="bottom" width="50%">
      <oas-button>width="50%"</oas-button>
    </oas-popover>
  </oas-space>
</DemoBlock>

## 偏移与碰撞细调

`offset` 双轴偏移：`"主轴距离"` 或 `"主轴距离, 交叉轴偏移"`（默认 8, 0）。碰撞细调：`collision-padding` 视口夹取边距（默认 4px）；`fallback-placements` 自定义回退序列（请求放不下时按序列逐一尝试）；`hide-when-detached` 锚点完全脱离视口时隐藏面板。

<DemoBlock title="双轴偏移（offset）">
  <oas-space size="small">
    <oas-popover title="偏移" content="offset=&quot;12, 20&quot;：主轴 12px + 交叉轴右移 20px。" placement="bottom" offset="12, 20">
      <oas-button>offset="12, 20"</oas-button>
    </oas-popover>
    <oas-popover title="仅主轴" content="offset=&quot;16&quot;：主轴间距 16px。" placement="bottom" offset="16">
      <oas-button>offset="16"</oas-button>
    </oas-popover>
  </oas-space>
</DemoBlock>

<DemoBlock title="碰撞细调（collision-padding / fallback-placements / hide-when-detached）">
  <oas-space size="small">
    <oas-popover title="边距" content="collision-padding=20：面板贴边时保留 20px 间距。" placement="bottom" collision-padding="20">
      <oas-button>collision-padding=20</oas-button>
    </oas-popover>
    <oas-popover title="回退序列" content="fallback-placements=&quot;left, right&quot;：底部放不下时先试左侧。" placement="bottom" fallback-placements="left, right">
      <oas-button>fallback-placements</oas-button>
    </oas-popover>
    <oas-popover title="脱离即隐" content="hide-when-detached：触发元素滚出视口后面板隐藏。" placement="right" hide-when-detached>
      <oas-button>hide-when-detached</oas-button>
    </oas-popover>
  </oas-space>
</DemoBlock>

## 初始焦点与键盘

`focus-on-open` 打开时焦点移入面板内首个可聚焦元素；`initial-focus` 指定选择器精确聚焦（优先级更高，解析不到回落 focus-on-open）。`trigger-keys` 指定按键在触发元素聚焦时切换开合（空格分隔多键）。

<DemoBlock title="指定初始焦点（initial-focus）">
  <oas-popover title="初始焦点" initial-focus="#pop-focus-name" placement="bottom" focus-on-open>
    <oas-button>打开（焦点落在输入框）</oas-button>
    <div slot="content">
      <p style="margin: 0 0 8px">打开后焦点直接进入下面的输入框：</p>
      <oas-input id="pop-focus-name" placeholder="姓名"></oas-input>
    </div>
  </oas-popover>
</DemoBlock>

<DemoBlock title="按键打开（trigger-keys）">
  <oas-popover trigger-keys="Enter" title="按键打开" content="聚焦触发按钮后按 Enter 切换开合。" placement="bottom">
    <oas-button>聚焦后按 Enter</oas-button>
  </oas-popover>
</DemoBlock>

## Portal 挂载点

`append-to` 把面板移到宿主容器之外（`body` 或选择器），避免被宿主容器的 `overflow: hidden` / `clip` 裁剪；定位基于视口坐标，移出后不受影响。面板移出 shadow 后点击面板内部仍不触发外部点击关闭。

<DemoBlock title="Portal 挂载（append-to）">
  <div id="pop-port-host" style="overflow: hidden; padding: 12px; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md);">
    <oas-popover title="Portal 面板" content="面板挂到 body（append-to=body），不被宿主容器 overflow:hidden 裁剪。" placement="bottom" append-to="body">
      <oas-button type="primary">打开 Portal 面板</oas-button>
    </oas-popover>
  </div>
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

<DemoBlock title="箭头与角融合（arrow-merge）">
  <oas-space size="small">
    <oas-popover title="融合角" content="arrow-merge：箭头贴到面板角、邻角圆角归零（仅 -start/-end 生效）。" placement="bottom-start" arrow-merge>
      <oas-button>bottom-start 融合</oas-button>
    </oas-popover>
    <oas-popover title="对照" content="未开 arrow-merge：箭头居中于面板边。" placement="bottom-start">
      <oas-button>对照</oas-button>
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

## 关闭按钮与声明式关层

`closable` 在面板右上角显示关闭按钮（`part="close"`），点击关闭并还原焦点。内容里任意元素加 `data-popover="close"` 即声明式关层——点击它关闭 popover（适合「确定 / 知道了」类操作按钮）。

<DemoBlock title="关闭按钮与声明式关层">
  <oas-space size="small">
    <oas-popover title="可关闭" content="右上角 ✕ 关闭。" placement="bottom" closable>
      <oas-button>closable</oas-button>
    </oas-popover>
    <oas-popover title="声明式关层" placement="bottom">
      <oas-button>面板内按钮关层</oas-button>
      <div slot="content" style="text-align: center">
        <oas-button size="small" type="primary" data-popover="close">知道了</oas-button>
      </div>
    </oas-popover>
  </oas-space>
</DemoBlock>

## 颜色变体

`color` 语义色变体：`primary` / `success` / `warning` / `danger`——面板 tint 底 + 语义色描边（含箭头），全部由 token 派生（dark 主题自动适配）。

<DemoBlock title="颜色变体（color）">
  <oas-space size="small">
    <oas-popover title="主色" content="color=primary：主色 tint 底 + 主色描边。" placement="bottom" color="primary">
      <oas-button type="primary">primary</oas-button>
    </oas-popover>
    <oas-popover title="成功" content="color=success：成功色变体。" placement="bottom" color="success">
      <oas-button type="success">success</oas-button>
    </oas-popover>
    <oas-popover title="警告" content="color=warning：警告色变体。" placement="bottom" color="warning">
      <oas-button type="warning">warning</oas-button>
    </oas-popover>
    <oas-popover title="危险" content="color=danger：危险色变体。" placement="bottom" color="danger">
      <oas-button type="danger">danger</oas-button>
    </oas-popover>
  </oas-space>
</DemoBlock>

## 开合动画

面板打开 / 关闭播放 fade + scale 动画，`transform-origin` 随放置方向感知（从「对着触发元素的那条边」向外展开，-start/-end 贴到对齐边）。`prefers-reduced-motion` 下自动停用动画。

<DemoBlock title="开合动画（方向感知）">
  <oas-space size="small">
    <oas-popover title="动画" content="从触发元素方向展开 / 收起。" placement="bottom">
      <oas-button>打开试试</oas-button>
    </oas-popover>
    <oas-popover title="动画" content="右侧展开。" placement="right-start">
      <oas-button>右侧展开</oas-button>
    </oas-popover>
  </oas-space>
</DemoBlock>

## 内容实时与自动关闭

默认（无 `fresh`）关闭时内容冻结、打开时写入最新值；`fresh` 开启后关闭状态也持续同步内容（受控内容场景防闪烁）。`auto-close` 打开后超时自动关闭（引导提示 / onboarding 场景）。

<DemoBlock title="fresh：关闭时内容持续更新">
  <oas-space size="small">
    <oas-button size="small" type="primary" onclick="popFreshSet('v1')">内容 → v1</oas-button>
    <oas-button size="small" onclick="popFreshSet('v2')">内容 → v2（关闭中）</oas-button>
    <oas-tag id="pop-fresh-tag" type="info">content: -</oas-tag>
  </oas-space>
  <oas-popover id="pop-fresh" title="fresh" content="-" placement="bottom" fresh>
    <oas-button>打开查看内容</oas-button>
  </oas-popover>
</DemoBlock>

<DemoBlock title="auto-close：超时自动关闭">
  <oas-popover title="3 秒自动关" content="auto-close=3000：打开 3 秒后自动关闭。" placement="bottom" auto-close="3000">
    <oas-button>打开（3s 后自动关）</oas-button>
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
  <!-- 虚拟锚点标记：与面板同用视口坐标（fixed），打开时显示在 (160,90)，箭头对准该点 -->
  <div id="pop-point-mark" aria-hidden="true" style="position: fixed; left: 160px; top: 90px; width: 8px; height: 8px; margin: -4px 0 0 -4px; border-radius: 50%; background: var(--oas-color-primary); box-shadow: 0 0 0 2px color-mix(in srgb, var(--oas-color-primary) 30%, transparent); pointer-events: none; z-index: 999; opacity: 0; transition: opacity 0.15s ease;"></div>
  <oas-popover id="pop-point" virtual virtual-x="160" virtual-y="90" placement="right" title="定点提示" content="由 virtual-x / virtual-y 指定锚点坐标，箭头对准标记点，适合图表数据点提示。"></oas-popover>
</DemoBlock>

<DemoBlock title="虚拟触发（锚点元素跟随）">
  <div id="pop-chart" style="position: relative; height: 120px; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md); background: var(--oas-color-bg-hover);">
    <div id="pop-dot-0" style="position: absolute; left: 90px; top: 34px; width: 8px; height: 8px; border-radius: 50%; background: var(--oas-color-primary);"></div>
    <div id="pop-dot-1" style="position: absolute; left: 200px; top: 60px; width: 8px; height: 8px; border-radius: 50%; background: var(--oas-color-primary);"></div>
  </div>
  <oas-popover id="pop-anchor" virtual virtual-anchor="#pop-dot-0" placement="top" title="数据点" content="由 virtual-anchor 指定锚点元素，适合图表点位提示。"></oas-popover>
</DemoBlock>

## Modal 化

`modal` 把 popover 变成模态浮层：全屏遮罩 + 焦点陷阱（Tab / Shift+Tab 在面板内循环，焦点逃逸拉回，仅最上层 modal 接管）+ 滚动锁（拦截 wheel / 滚动方向键，滚动条保持可见）+ `aria-modal`。点击遮罩关闭并还原焦点。

<DemoBlock title="Modal 化（遮罩 + 焦点锁 + 滚动锁）">
  <oas-popover title="Modal 面板" content="打开后背景有遮罩，Tab 焦点被锁定在面板内，页面滚动被拦截；点击遮罩 / Esc 关闭。" placement="bottom" modal focus-on-open>
    <oas-button type="primary">打开 Modal 面板</oas-button>
    <div slot="content">
      <p style="margin: 0 0 8px">焦点被锁在面板内：</p>
      <oas-space size="small">
        <oas-button size="small" type="primary" data-popover="close">完成</oas-button>
        <oas-button size="small" data-popover="close">取消</oas-button>
      </oas-space>
    </div>
  </oas-popover>
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

  // 虚拟触发：锚点坐标定位（宿主显式指定 virtual-x/virtual-y 后打开）；
  // 标记点与面板同用视口坐标（fixed），「箭头对准哪里」视觉可答
  const point = document.getElementById('pop-point')
  const pointMark = document.getElementById('pop-point-mark')
  if (point) {
    window.popPointShow = (x, y) => {
      point.setAttribute('virtual-x', String(x))
      point.setAttribute('virtual-y', String(y))
      point.setAttribute('open', '')
      if (pointMark) {
        pointMark.style.left = `${x}px`
        pointMark.style.top = `${y}px`
        pointMark.style.opacity = '1'
      }
    }
    window.popPointHide = () => {
      point.removeAttribute('open')
      if (pointMark) pointMark.style.opacity = '0'
    }
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

  // fresh：关闭时内容持续更新（外部按钮改 content，关闭态同步）
  const fresh = document.getElementById('pop-fresh')
  const freshTag = document.getElementById('pop-fresh-tag')
  if (fresh && freshTag) {
    window.popFreshSet = (v) => {
      fresh.setAttribute('content', v)
      freshTag.textContent = `content: ${v}`
    }
    // oas-open-change 探针回显：演示事件可触发
    fresh.addEventListener('oas-open-change', (e) => {
      freshTag.textContent = `open: ${e.detail.open}，content: ${fresh.getAttribute('content')}`
    })
  }
})
</script>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `append-to` | portal 挂载点：打开时面板移入目标容器（`body` 或 CSS 选择器），关闭移回宿主 shadow；适合面板被宿主容器裁剪（overflow）的场景 | `string` | — |
| `arrow` | 是否显示箭头（默认 true；`arrow="false"` 隐藏，箭头元素与 `::part(arrow)` 保留） | `string` | `true` |
| `arrow-merge` | 箭头与面板角融合：直角三角与面板角共边融合——直角贴角点、直角边与面板两边共线（描边与面板描边共带续接），尖端正交指向锚点，对应角圆角归零；仅 *-start/*-end 位置生效，center placement 不触发 | `boolean` | — |
| `arrow-point-at-center` | 箭头指向触发元素中心（默认指向触发元素边缘；视口边缘避让导致面板偏移时箭头仍指向锚点中心） | — | — |
| `auto-adjust-overflow` | 视口边缘自动翻转与避让（默认 true；`"false"` 关闭，保持声明 placement，可能溢出视口） | `string` | `true` |
| `auto-close` | 打开后超时自动关闭（毫秒），如 `auto-close="3000"`；未设置不自动关闭 | `string` | — |
| `closable` | 面板右上角显示关闭按钮（`part="close"`），点击关闭并还原焦点到触发元素 | `boolean` | — |
| `close-delay` | 通用关闭延迟（毫秒，默认 0；非 hover 触发路径生效，hover 路径优先 hover-hide-delay） | `string` | — |
| `collision-padding` | 视口边缘夹取边距（px，默认 4），面板贴边避让时保留的间距 | `string` | — |
| `color` | 颜色变体：`primary` / `success` / `warning` / `danger`（面板 tint 底 + 语义色描边，走 token 派生变量含 dark 变体）；未设置或非法值保持默认中性面板 | `string` | — |
| `content` | 正文文本 | `string` | — |
| `disabled` | 整体禁用：click / hover / focus / contextmenu / trigger-keys 触发均不响应，宿主降饱和并同步 aria-disabled | `boolean` | — |
| `fallback-placements` | 自定义回退序列（逗号或空格分隔，如 `"left, right"`）：请求 placement 放不下时按序列逐一尝试 fit，首个 fit 者胜出，全不 fit 取序列末位并夹取；未设置走默认主轴翻转 | `string` | — |
| `focus-on-open` | 打开时焦点移入面板内首个可聚焦元素 | `boolean` | — |
| `fresh` | 关闭时也持续更新内容（默认关闭态冻结内容，打开时写入最新值；fresh 开启后关闭态同步写入） | `boolean` | — |
| `hide-when-detached` | 锚点完全脱离视口时隐藏面板（打开语义保留，避免孤悬屏外） | `boolean` | — |
| `hover-delay` | hover 触发时打开防抖延时（毫秒，默认 150；未设置回落 open-delay） | `string` | — |
| `hover-hide-delay` | hover 触发时关闭防抖延时（毫秒，默认 100；未设置回落 close-delay） | `string` | — |
| `initial-focus` | 打开时聚焦指定选择器元素（宿主 light DOM 优先，含 slot 内容；解析不到回落 focus-on-open），优先级高于 focus-on-open | `string` | — |
| `modal` | modal 化：全屏遮罩 + 焦点陷阱（Tab 面板内循环）+ 滚动锁 + aria-modal；点击遮罩关闭 | `boolean` | — |
| `offset` | 双轴偏移：`"主轴距离"` 或 `"主轴距离, 交叉轴偏移"`（px，默认 8, 0），如 `offset="12, 20"` | — | — |
| `open` | 受控显示（布尔属性，存在即显示） | `boolean` | — |
| `open-delay` | 通用打开延迟（毫秒，默认 0；非 hover 触发路径生效，hover 路径优先 hover-delay） | `string` | — |
| `placement` | 浮层位置（12 向：四基向 top/bottom/left/right 各配 -start/-end 交叉轴对齐） | `string` | `top` |
| `title` | 标题文本（渲染进可见标题区；读取后即从宿主移除，不残留原生悬浮提示；清空传空串）；富内容用 slot="title" | `string` | — |
| `trigger` | 触发方式：`click`（默认）/ `hover` / `focus` / `contextmenu` / `manual`，空格分隔可多选（如 `"click hover"`） | `string` | `click` |
| `trigger-keys` | 指定按键在触发元素聚焦时切换开合（空格分隔，如 `"Enter Space"`）；未设置无按键绑定 | `string` | — |
| `virtual` | 虚拟触发模式（同 tooltip，不依赖锚点元素） | `boolean` | — |
| `virtual-anchor` | 虚拟锚点元素选择器（virtual-x/virtual-y 未设置时生效） | — | — |
| `virtual-x` | 虚拟锚点 x（视口坐标，px） | — | — |
| `virtual-y` | 虚拟锚点 y（视口坐标，px） | — | — |
| `width` | 面板宽度：数字（px）/ `"trigger"`（与触发元素同宽）/ 任意 CSS 值（如 `50%`、`240px`）；未设置保持默认 | `string` | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-open-change` | open 状态变化，`detail: { open }` |

### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | — |
| `content` | — |
| `title` | 标题富内容插槽，有内容时覆盖 title 属性文案 |

点击触发元素切换显隐，点击外部或按 Esc 关闭；`role="dialog"`。嵌套浮层：父关闭时级联关闭子层，`Esc` 逐层关闭并还原焦点到触发元素。
