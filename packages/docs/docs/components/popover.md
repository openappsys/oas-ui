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

## 无障碍关联与键盘

触发元素自动同步 ARIA 关联：`aria-haspopup="dialog"` + `aria-expanded`（随开合）+ `aria-controls`（面板 id），屏幕阅读器可感知浮层状态。`trigger-keys` 默认 `Enter Space`——聚焦触发元素按 Enter / 空格即可开合（原生 button 上与合成 click 幂等，不会闪开闪关），可用属性覆盖为其他按键。

<DemoBlock title="键盘开合（默认 Enter / Space）">
  <oas-popover title="键盘开合" content="聚焦按钮后按 Enter 或空格切换开合；再按一次关闭。" placement="bottom">
    <oas-button>聚焦后按 Enter / 空格</oas-button>
  </oas-popover>
</DemoBlock>

## trap-focus 焦点陷阱

`trap-focus` 把焦点陷阱从 modal 中独立出来：不显示遮罩、不锁滚动，但 Tab / Shift+Tab 在面板内循环不逃逸——适合表单浮层（背景仍可交互，焦点不出走）。`modal` 与 `trap-focus` 叠加幂等（陷阱只挂一份）。

<DemoBlock title="trap-focus（表单浮层焦点不逃逸）">
  <oas-popover title="填写信息" placement="bottom" trap-focus focus-on-open closable>
    <oas-button type="primary">打开表单浮层</oas-button>
    <div slot="content" style="display: grid; gap: 8px; min-width: 220px">
      <oas-input placeholder="姓名" aria-label="姓名"></oas-input>
      <oas-input placeholder="邮箱" aria-label="邮箱"></oas-input>
      <oas-button size="small" type="primary" data-popover="close">提交</oas-button>
    </div>
  </oas-popover>
</DemoBlock>

## 关闭行为开关

`close-on-outside` / `close-on-escape`（默认均为 `true` 保持现行为）分别控制「点击外部关闭」与「Esc 关闭」；`oas-before-close` 是可取消关闭事件（`preventDefault()` 阻止关闭），所有关闭入口（触发切换 / 外点 / Esc / 关闭按钮 / 声明式关层 / 遮罩 / auto-close / 面板内选择）都会先过它——`detail.source` 标注来源。

<DemoBlock title="关闭开关 + 可取消关闭（oas-before-close）">
  <oas-space size="small" wrap>
    <oas-popover title="外点不关" content="close-on-outside=false：点击面板外部不会关闭，只能用 ✕ 或 Esc。" placement="bottom" closable close-on-outside="false">
      <oas-button>外点不关</oas-button>
    </oas-popover>
    <oas-popover title="Esc 不关" content="close-on-escape=false：按 Esc 不关闭，点击外部关闭。" placement="bottom" closable close-on-escape="false">
      <oas-button>Esc 不关</oas-button>
    </oas-popover>
    <oas-popover id="pop-guard" title="拦截关闭" content="勾选「拦截关闭」后，任何途径都关不掉；取消勾选即可关闭。" placement="bottom" closable>
      <oas-button>拦截关闭演示</oas-button>
      <div slot="content" style="min-width: 200px">
        <label style="display: inline-flex; align-items: center; gap: 6px; cursor: pointer">
          <oas-checkbox id="pop-guard-check"></oas-checkbox>拦截关闭
        </label>
      </div>
    </oas-popover>
  </oas-space>
</DemoBlock>

## 尺寸与样式变量

`size` 尺寸档位：`small` / `medium`（默认）/ `large`——内边距、最小宽度与字号随之缩放（走 token）。面板样式可通过组件级 CSS 变量定制：`--oas-popover-bg` / `--oas-popover-border` / `--oas-popover-shadow` / `--oas-popover-radius` / `--oas-popover-padding` / `--oas-popover-min-width`（默认值回落全局 token，dark 主题自动跟随）。

<DemoBlock title="尺寸档位（size）">
  <oas-space size="small">
    <oas-popover title="小档" content="size=small：紧凑内边距 + 小字号。" placement="bottom" size="small">
      <oas-button>small</oas-button>
    </oas-popover>
    <oas-popover title="默认" content="size=medium（默认）。" placement="bottom">
      <oas-button>medium</oas-button>
    </oas-popover>
    <oas-popover title="大档" content="size=large：宽松内边距 + 大字号。" placement="bottom" size="large">
      <oas-button>large</oas-button>
    </oas-popover>
  </oas-space>
</DemoBlock>

<DemoBlock title="面板 CSS 变量定制（--oas-popover-*）">
  <oas-popover title="变量定制" content="通过 --oas-popover-bg / --oas-popover-border / --oas-popover-radius 定制面板观感（箭头跟随同色）。" placement="bottom" style="--oas-popover-bg: var(--oas-color-bg-hover); --oas-popover-border: var(--oas-color-primary); --oas-popover-radius: var(--oas-radius-lg);">
    <oas-button>变量定制的面板</oas-button>
  </oas-popover>
</DemoBlock>

## 结构化插槽与说明

`slot="header"` 接管整个头部（标题区让位）；`slot="footer"` 渲染底部操作区（与正文以分隔线区隔）；`slot="description"` 渲染补充说明并自动关联 `aria-describedby`（屏幕阅读器可朗读面板描述）。

<DemoBlock title="header / footer / description 插槽">
  <oas-popover placement="bottom">
    <oas-button type="primary">打开结构化面板</oas-button>
    <div slot="header" style="display: flex; align-items: center; gap: 6px; font-weight: 600">成员设置 <oas-tag size="small">Pro</oas-tag></div>
    <div slot="content" style="line-height: 1.8">正文内容区：与 header / footer / description 各自独立。</div>
    <p slot="description" style="margin: 0">关闭后更改立即生效，无需保存。</p>
    <div slot="footer" style="display: flex; justify-content: flex-end; gap: 8px">
      <oas-button size="small" data-popover="close">取消</oas-button>
      <oas-button size="small" type="primary" data-popover="close">确定</oas-button>
    </div>
  </oas-popover>
</DemoBlock>

## 高度约束与面板内滚动

`available-height` 把面板最大高度约束为主轴方向视口剩余空间；`scrollable` 开启面板内滚动（头部 / 底部固定、正文区滚动），长内容不再撑出视口。长列表场景两者常组合使用。

<DemoBlock title="scrollable + available-height（长列表滚动）">
  <oas-popover title="通知列表" placement="bottom" scrollable available-height>
    <oas-button type="primary">打开通知（可滚动）</oas-button>
    <div slot="content" style="display: grid; gap: 10px; min-width: 260px">
      <p style="margin: 0">面板高度不超出视口剩余空间，正文区内部滚动：</p>
      <div style="display: grid; gap: 8px">
        <oas-tag>通知 1</oas-tag><oas-tag>通知 2</oas-tag><oas-tag>通知 3</oas-tag><oas-tag>通知 4</oas-tag>
        <oas-tag>通知 5</oas-tag><oas-tag>通知 6</oas-tag><oas-tag>通知 7</oas-tag><oas-tag>通知 8</oas-tag>
        <oas-tag>通知 9</oas-tag><oas-tag>通知 10</oas-tag>
      </div>
    </div>
  </oas-popover>
</DemoBlock>

## 焦点归还与空态

`final-focus` 指定关闭后焦点归还的目标元素（选择器；也可用 `finalFocusEl` property 传入元素，优先级更高）；缺省归还触发元素。`hide-empty` 在面板无任何内容（无 title / content / 插槽内容）时保持隐藏——防止空白面板闪现。

<DemoBlock title="final-focus（关闭后焦点到指定元素）">
  <oas-space size="small">
    <oas-input id="pop-final-input" placeholder="关闭后焦点回到这里" style="width: 200px"></oas-input>
    <oas-popover title="焦点归还" content="关闭后焦点会移到旁边的输入框，而不是触发按钮。" placement="bottom" final-focus="#pop-final-input" closable>
      <oas-button>打开（✕ 关闭看焦点）</oas-button>
    </oas-popover>
  </oas-space>
</DemoBlock>

<DemoBlock title="hide-empty（无内容不弹空白面板）">
  <oas-space size="small">
    <oas-button size="small" onclick="popEmptySet('')">清空内容</oas-button>
    <oas-button size="small" onclick="popEmptySet('现在有内容了')">填入内容</oas-button>
    <oas-tag id="pop-empty-status" type="info">content: （空）</oas-tag>
  </oas-space>
  <oas-popover id="pop-empty" title="空态防御" content="" placement="bottom" hide-empty>
    <oas-button>无内容时点不开</oas-button>
  </oas-popover>
</DemoBlock>

## 滚动行为（sticky / close-on-scroll）

`sticky` 三档：`partial`（默认，滚动跟随重定位）/ `always`（锚点滚出视口后面板贴视口边缘保持可见）/ `off`（不跟随滚动）。`close-on-scroll` 则改为「滚动即关闭」——下拉选择类浮层在滚动时直接收起更符合直觉。

<DemoBlock title="sticky=always（锚点滚出后面板贴边保持）">
  <div id="pop-sticky-scroll" style="height: 120px; overflow-y: auto; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md); padding: 12px">
    <div style="height: 320px; display: grid; place-items: center start">
      <oas-popover title="贴边保持" content="sticky=always：滚动本容器，触发元素滚出后面板贴在视口边缘不消失。" placement="right" sticky="always" open>
        <oas-button>滚动下方区域看效果</oas-button>
      </oas-popover>
    </div>
    <p style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: 8px 0">↓ 滚动这里 ↓</p>
  </div>
</DemoBlock>

<DemoBlock title="close-on-scroll（滚动即关闭）">
  <div id="pop-closeonscroll-box" style="height: 120px; overflow-y: auto; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md); padding: 12px">
    <div style="height: 320px">
      <oas-popover title="滚动关闭" content="close-on-scroll：面板打开时滚动容器，面板立即关闭。" placement="right" close-on-scroll>
        <oas-button>打开后滚动这里</oas-button>
      </oas-popover>
    </div>
  </div>
</DemoBlock>

## 右键光标定位与触屏长按

`trigger="contextmenu"` 右键在**光标处**打开面板（不再锚定触发元素中心）；触屏设备上按住 500ms 长按同样在触点处打开（移动端没有右键）。打开后滚动页面，面板回到触发元素侧跟随（光标点没有滚动语义）。

<DemoBlock title="contextmenu 光标定位（右键 / 触屏长按）">
  <oas-popover trigger="contextmenu" title="光标菜单" placement="right" arrow="false">
    <oas-button>在这一带的任意位置右键</oas-button>
    <div slot="content">
      <p style="margin: 0 0 8px">面板出现在右键光标处：</p>
      <oas-space size="small" direction="vertical">
        <oas-button size="small" data-popover="close">操作一</oas-button>
        <oas-button size="small" data-popover="close">操作二</oas-button>
      </oas-space>
    </div>
  </oas-popover>
</DemoBlock>

## 面板内选择后自动关闭

`dismiss-on-select` 开启后面板内任意点击（含插槽内容）视为完成选择并自动关闭——选项面板免写 `data-popover="close"`。关闭同样会经过 `oas-before-close`（可拦截）。

<DemoBlock title="dismiss-on-select（选择即关）">
  <oas-space size="small">
    <oas-popover title="选择语言" placement="bottom" dismiss-on-select>
      <oas-button type="primary">选择一项试试</oas-button>
      <div slot="content" style="display: grid; gap: 6px; min-width: 160px">
        <oas-button size="small">简体中文</oas-button>
        <oas-button size="small">English</oas-button>
        <oas-button size="small">日本語</oas-button>
      </div>
    </oas-popover>
    <oas-tag id="pop-dismiss-status" type="info">open: false</oas-tag>
  </oas-space>
</DemoBlock>

## 内容销毁与懒挂载

`destroy-on-hide` 关闭时卸载面板内容呈现（插槽节点脱离分配、属性文本清空），重新打开时再挂载——重内容（图表 / 大列表）浮层在关闭期间零渲染开销，等价懒挂载。宿主 light DOM 节点不会删除。

<DemoBlock title="destroy-on-hide（关闭销毁、重开重建）">
  <oas-space size="small">
    <oas-popover id="pop-destroy" title="重内容面板" placement="bottom" destroy-on-hide>
      <oas-button type="primary">打开重内容面板</oas-button>
      <div slot="content" style="min-width: 240px">
        <p style="margin: 0 0 8px">关闭后此内容被卸载（重开时重新挂载）：</p>
        <oas-progress value="72"></oas-progress>
      </div>
    </oas-popover>
    <oas-tag id="pop-destroy-status" type="info">关闭后内容已卸载</oas-tag>
  </oas-space>
</DemoBlock>

## 断点响应与触发细调

`placement` / `size` 支持断点简写（协议同 space/grid）：`"bottom md:right"` = 基础值 + 空格分隔的 `断点:值`（sm=640 / md=768 / lg=1024 / xl=1280，移动优先 min-width）——窄屏在下方、≥768px 在右侧。`trigger="mousedown"` 按下即开（无需抬起，比 click 快一拍）。

<DemoBlock title="placement 断点简写（拖动窗口宽度看切换）">
  <oas-popover title="断点放置" content="窗口 < 768px 面板在下方；≥ 768px 面板在右侧。" placement="bottom md:right">
    <oas-button>bottom md:right</oas-button>
  </oas-popover>
</DemoBlock>

<DemoBlock title="trigger=mousedown（按下即开）">
  <oas-space size="small">
    <oas-popover title="按下即开" content="trigger=mousedown：鼠标按下立刻打开，无需抬起。" placement="bottom" trigger="mousedown">
      <oas-button>mousedown</oas-button>
    </oas-popover>
    <oas-popover title="对照" content="默认 click：完整点击（按下 + 抬起）才打开。" placement="bottom">
      <oas-button>click（对照）</oas-button>
    </oas-popover>
  </oas-space>
</DemoBlock>

## render-panel 纯面板渲染

`render-panel` 面向宿主自组场景：popover 不绑定任何触发（一律按 `manual` 处理、不写触发元素 ARIA），配合 `virtual-x` / `virtual-y` 坐标或 `append-to` 由宿主完全接管摆放与显隐——比如自定义触发器、画布内嵌面板。

<DemoBlock title="render-panel（宿主自组触发器）">
  <oas-space size="small">
    <oas-button size="small" type="primary" onclick="popPanelShow(event)">宿主自己的按钮：打开纯面板</oas-button>
    <oas-button size="small" onclick="popPanelHide()">关闭</oas-button>
    <oas-tag id="pop-render-status" type="info">open: false</oas-tag>
  </oas-space>
  <oas-popover id="pop-render-panel" render-panel virtual virtual-x="0" virtual-y="0" placement="bottom" title="纯面板" content="由 render-panel 渲染：popover 无触发绑定，显隐与位置完全由宿主控制。"></oas-popover>
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

  // P5 拦截关闭：勾选后 oas-before-close preventDefault，任何途径都关不掉
  const guard = document.getElementById('pop-guard')
  const guardCheck = document.getElementById('pop-guard-check')
  if (guard && guardCheck) {
    guard.addEventListener('oas-before-close', (e) => {
      if (guardCheck.hasAttribute('checked')) e.preventDefault()
    })
  }

  // P15 hide-empty：空内容不弹空白面板
  const emptyPop = document.getElementById('pop-empty')
  const emptyStatus = document.getElementById('pop-empty-status')
  if (emptyPop && emptyStatus) {
    window.popEmptySet = (v) => {
      emptyPop.setAttribute('content', v)
      emptyStatus.textContent = `content: ${v === '' ? '（空）' : v}`
    }
  }

  // P21 dismiss-on-select：状态回显
  const dismiss = document.querySelector('#pop-dismiss-status')
  const dismissPop = document.querySelector('oas-popover[dismiss-on-select]')
  if (dismiss && dismissPop) {
    const syncDismiss = () => {
      dismiss.textContent = `open: ${dismissPop.hasAttribute('open')}`
    }
    dismissPop.addEventListener('oas-open-change', (e) => {
      dismiss.textContent = `open: ${e.detail.open}`
    })
    syncDismiss()
  }

  // P22 destroy-on-hide：开关状态回显
  const destroyPop = document.getElementById('pop-destroy')
  const destroyStatus = document.getElementById('pop-destroy-status')
  if (destroyPop && destroyStatus) {
    destroyPop.addEventListener('oas-open-change', (e) => {
      destroyStatus.textContent = e.detail.open ? '面板打开（内容已挂载）' : '关闭后内容已卸载'
    })
  }

  // P25 render-panel：宿主自组触发（自己的按钮控制纯面板显隐与坐标）
  const panel = document.getElementById('pop-render-panel')
  const panelStatus = document.getElementById('pop-render-status')
  if (panel && panelStatus) {
    window.popPanelShow = (e) => {
      panel.setAttribute('virtual-x', String(e.clientX))
      panel.setAttribute('virtual-y', String(e.clientY + 12))
      panel.setAttribute('open', '')
    }
    window.popPanelHide = () => panel.removeAttribute('open')
    panel.addEventListener('oas-open-change', (e) => {
      panelStatus.textContent = `open: ${e.detail.open}`
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
| `available-height` | — | `boolean` | — |
| `closable` | 面板右上角显示关闭按钮（`part="close"`），点击关闭并还原焦点到触发元素 | `boolean` | — |
| `close-delay` | 通用关闭延迟（毫秒，默认 0；非 hover 触发路径生效，hover 路径优先 hover-hide-delay） | `string` | — |
| `close-on-escape` | — | — | — |
| `close-on-outside` | — | `string` | `true` |
| `close-on-scroll` | — | `boolean` | — |
| `collision-padding` | 视口边缘夹取边距（px，默认 4），面板贴边避让时保留的间距 | `string` | — |
| `color` | 颜色变体：`primary` / `success` / `warning` / `danger`（面板 tint 底 + 语义色描边，走 token 派生变量含 dark 变体）；未设置或非法值保持默认中性面板 | `string` | — |
| `content` | 正文文本 | `string` | — |
| `destroy-on-hide` | — | `boolean` | — |
| `disabled` | 整体禁用：click / hover / focus / contextmenu / trigger-keys 触发均不响应，宿主降饱和并同步 aria-disabled | `boolean` | — |
| `dismiss-on-select` | — | `boolean` | — |
| `fallback-placements` | 自定义回退序列（逗号或空格分隔，如 `"left, right"`）：请求 placement 放不下时按序列逐一尝试 fit，首个 fit 者胜出，全不 fit 取序列末位并夹取；未设置走默认主轴翻转 | `string` | — |
| `final-focus` | — | `string` | — |
| `focus-on-open` | 打开时焦点移入面板内首个可聚焦元素 | `boolean` | — |
| `fresh` | 关闭时也持续更新内容（默认关闭态冻结内容，打开时写入最新值；fresh 开启后关闭态同步写入） | `boolean` | — |
| `hide-empty` | — | `boolean` | — |
| `hide-when-detached` | 锚点完全脱离视口时隐藏面板（打开语义保留，避免孤悬屏外） | `boolean` | — |
| `hover-delay` | hover 触发时打开防抖延时（毫秒，默认 150；未设置回落 open-delay） | `string` | — |
| `hover-hide-delay` | hover 触发时关闭防抖延时（毫秒，默认 100；未设置回落 close-delay） | `string` | — |
| `initial-focus` | 打开时聚焦指定选择器元素（宿主 light DOM 优先，含 slot 内容；解析不到回落 focus-on-open），优先级高于 focus-on-open | `string` | — |
| `modal` | modal 化：全屏遮罩 + 焦点陷阱（Tab 面板内循环）+ 滚动锁 + aria-modal；点击遮罩关闭 | `boolean` | — |
| `offset` | 双轴偏移：`"主轴距离"` 或 `"主轴距离, 交叉轴偏移"`（px，默认 8, 0），如 `offset="12, 20"` | — | — |
| `open` | 受控显示（布尔属性，存在即显示） | `boolean` | — |
| `open-delay` | 通用打开延迟（毫秒，默认 0；非 hover 触发路径生效，hover 路径优先 hover-delay） | `string` | — |
| `placement` | 浮层位置（12 向：四基向 top/bottom/left/right 各配 -start/-end 交叉轴对齐） | `string` | `top` |
| `render-panel` | — | `boolean` | — |
| `scrollable` | — | `boolean` | — |
| `size` | — | `string` | `medium` |
| `sticky` | — | `string` | `partial` |
| `title` | 标题文本（渲染进可见标题区；读取后即从宿主移除，不残留原生悬浮提示；清空传空串）；富内容用 slot="title" | `string` | — |
| `trap-focus` | — | `boolean` | — |
| `trigger` | 触发方式：`click`（默认）/ `hover` / `focus` / `contextmenu` / `manual`，空格分隔可多选（如 `"click hover"`） | `string` | `click` |
| `trigger-keys` | 指定按键在触发元素聚焦时切换开合（空格分隔，如 `"Enter Space"`）；未设置无按键绑定 | `string` | `Enter Space` |
| `virtual` | 虚拟触发模式（同 tooltip，不依赖锚点元素） | `boolean` | — |
| `virtual-anchor` | 虚拟锚点元素选择器（virtual-x/virtual-y 未设置时生效） | — | — |
| `virtual-x` | 虚拟锚点 x（视口坐标，px） | — | — |
| `virtual-y` | 虚拟锚点 y（视口坐标，px） | — | — |
| `width` | 面板宽度：数字（px）/ `"trigger"`（与触发元素同宽）/ 任意 CSS 值（如 `50%`、`240px`）；未设置保持默认 | `string` | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-before-close` | — |
| `oas-open-change` | open 状态变化，`detail: { open }` |

### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | — |
| `content` | — |
| `description` | — |
| `footer` | — |
| `header` | — |
| `title` | 标题富内容插槽，有内容时覆盖 title 属性文案 |

点击触发元素切换显隐，点击外部或按 Esc 关闭；`role="dialog"`。嵌套浮层：父关闭时级联关闭子层，`Esc` 逐层关闭并还原焦点到触发元素。
