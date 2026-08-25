# Anchor 锚点

滚动监听当前章节并自动高亮，点击锚点平滑滚动定位。支持指定滚动容器、点击落点偏移、多级嵌套、横向模式、吸附、轨道墨水条、样式变体与历史控制等能力。

## 基础用法

`scroll-container` 指定局部滚动容器（选择器或元素 id）：观察根与点击落点都以它为准；未设置时监听视口。

<DemoBlock title="滚动监听（scroll-container）">
  <div style="display: flex; gap: 16px; width: 100%; align-items: stretch">
    <oas-anchor style="width: 128px; flex-shrink: 0" scroll-container="#anchor-sc-1" items='[{"href":"#anchor-sec-1","title":"第一章"},{"href":"#anchor-sec-2","title":"第二章"},{"href":"#anchor-sec-3","title":"第三章"}]'></oas-anchor>
    <div id="anchor-sc-1" style="flex: 1; height: 240px; overflow: auto; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-4)">
      <h4 id="anchor-sec-1" style="margin-top: 0">第一章</h4>
      <p style="color: var(--oas-color-text-secondary)">第一节内容：用于演示滚动监听与高亮跟随。</p>
      <h4 id="anchor-sec-2">第二章</h4>
      <p style="color: var(--oas-color-text-secondary)">滚动该容器时，左侧锚点自动高亮当前章节。</p>
      <h4 id="anchor-sec-3">第三章</h4>
      <p style="color: var(--oas-color-text-secondary)">点击锚点可平滑滚动定位到对应章节。</p>
    </div>
  </div>
</DemoBlock>

## 高亮判定偏移与触发边界

`offset` 控制高亮判定线（章节顶越检测线的提前量）；`bounds` 是触发边界的额外提前量（默认 5），避免高亮切换抖动。

<DemoBlock title="高亮判定偏移（offset / bounds）">
  <div style="display: flex; gap: 16px; width: 100%; align-items: stretch">
    <oas-anchor style="width: 128px; flex-shrink: 0" offset="80" scroll-container="#anchor-sc-2" items='[{"href":"#anchor-sec-4","title":"第一章"},{"href":"#anchor-sec-5","title":"第二章"}]'></oas-anchor>
    <div id="anchor-sc-2" style="flex: 1; height: 240px; overflow: auto; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-4)">
      <h4 id="anchor-sec-4" style="margin-top: 0">第一章</h4>
      <p style="color: var(--oas-color-text-secondary)">offset 控制顶部高亮判定区的偏移量。</p>
      <h4 id="anchor-sec-5">第二章</h4>
      <p style="color: var(--oas-color-text-secondary)">章节顶进入偏移线即切换高亮，比默认更早。</p>
    </div>
  </div>
</DemoBlock>

<DemoBlock title="触发边界（bounds）">
  <div style="display: flex; gap: 16px; width: 100%; align-items: stretch">
    <oas-anchor style="width: 128px; flex-shrink: 0" bounds="40" scroll-container="#anchor-sc-3" items='[{"href":"#anchor-sec-b1","title":"第一章"},{"href":"#anchor-sec-b2","title":"第二章"}]'></oas-anchor>
    <div id="anchor-sc-3" style="flex: 1; height: 240px; overflow: auto; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-4)">
      <h4 id="anchor-sec-b1" style="margin-top: 0">第一章</h4>
      <p style="color: var(--oas-color-text-secondary)">bounds 越大，章节顶越检测线的提前量越大。</p>
      <h4 id="anchor-sec-b2">第二章</h4>
      <p style="color: var(--oas-color-text-secondary)">默认 5px，这里调大到 40px 便于观察切换点差异。</p>
    </div>
  </div>
</DemoBlock>

## 点击事件

`oas-click` 与 `oas-change` 分离：**点击**锚点派发 `oas-click`（`detail: { href, item }`），点击与**滚动联动**切换高亮都派发 `oas-change`（`detail: { href, prevHref }`）——宿主想只响应用户操作时监听 `oas-click` 即可。

<DemoBlock title="点击事件（oas-click / oas-change 分离）">
  <div style="display: flex; gap: 16px; width: 100%; align-items: stretch">
    <oas-anchor style="width: 128px; flex-shrink: 0" onoas-click="anchorClickLog(event)" onoas-change="anchorLog(event)" scroll-container="#anchor-sc-4" items='[{"href":"#anchor-sec-6","title":"第一章"},{"href":"#anchor-sec-7","title":"第二章"}]'></oas-anchor>
    <div id="anchor-sc-4" style="flex: 1; height: 240px; overflow: auto; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-4)">
      <h4 id="anchor-sec-6" style="margin-top: 0">第一章</h4>
      <p style="color: var(--oas-color-text-secondary)">点击左侧锚点：仅派发 oas-click；滚动该容器切换高亮：仅派发 oas-change。</p>
      <h4 id="anchor-sec-7">第二章</h4>
      <p style="color: var(--oas-color-text-secondary)">oas-click 的 detail 含完整 item（href/title 等）。</p>
    </div>
  </div>
  <oas-tag id="anchor-result" type="info" style="margin-top: 8px">尚未点击</oas-tag>
  <oas-tag id="anchor-click-result" type="info" style="margin-top: 8px; margin-left: 8px">无 oas-click</oas-tag>
</DemoBlock>

## 受控高亮

`active` 为受控属性：外部设置 / 移除 `active` 可直接控制当前高亮项（滚动监听仍会随滚动接管）。

<DemoBlock title="受控 active">
  <oas-space>
    <oas-button onclick="anchorSetActive('#anchor-sec-c1')">高亮第一章</oas-button>
    <oas-button onclick="anchorSetActive('#anchor-sec-c2')">高亮第二章</oas-button>
    <oas-button onclick="anchorSetActive('#anchor-sec-c3')">高亮第三章</oas-button>
    <oas-button onclick="document.getElementById('anchor-ctrl').removeAttribute('active')">清除高亮</oas-button>
  </oas-space>
  <div style="display: flex; gap: 16px; width: 100%; align-items: stretch; margin-top: 8px">
    <oas-anchor id="anchor-ctrl" style="width: 128px; flex-shrink: 0" scroll-container="#anchor-sc-ctrl" items='[{"href":"#anchor-sec-c1","title":"第一章"},{"href":"#anchor-sec-c2","title":"第二章"},{"href":"#anchor-sec-c3","title":"第三章"}]'></oas-anchor>
    <div id="anchor-sc-ctrl" style="flex: 1; height: 240px; overflow: auto; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-4)">
      <h4 id="anchor-sec-c1" style="margin-top: 0">第一章</h4>
      <p style="color: var(--oas-color-text-secondary)">点击左侧按钮设置 <code>active</code>，锚点立即高亮对应项。</p>
      <h4 id="anchor-sec-c2">第二章</h4>
      <p style="color: var(--oas-color-text-secondary)">滚动该容器时，scroll spy 会接管高亮。</p>
      <h4 id="anchor-sec-c3">第三章</h4>
      <p style="color: var(--oas-color-text-secondary)">「清除高亮」移除 <code>active</code>，恢复无高亮状态。</p>
    </div>
  </div>
</DemoBlock>

## 点击落点偏移与对齐

`target-offset` 控制点击后目标距容器顶的距离（避让固定头），未设置时回退 `offset`；`block` 控制落点对齐（`start` / `center` / `end` / `nearest`——nearest 目标已可见则不滚动、最小滚动量）；`duration` 控制平滑滚动时长，`animation="false"` 或 `duration="0"` 立即定位。

<DemoBlock title="点击落点（target-offset / block / duration / animation）">
  <div style="display: flex; gap: 16px; width: 100%; align-items: stretch">
    <div style="width: 160px; flex-shrink: 0; position: relative">
      <div style="position: absolute; top: 80px; left: 0; right: 0; border-top: 2px dashed var(--oas-color-primary); opacity: 0.5; pointer-events: none"></div>
      <oas-anchor style="width: 160px" target-offset="80" duration="500" scroll-container="#anchor-sc-5" items='[{"href":"#anchor-sec-l1","title":"第一章"},{"href":"#anchor-sec-l2","title":"第二章"}]'></oas-anchor>
    </div>
    <div id="anchor-sc-5" style="flex: 1; height: 240px; overflow: auto; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-4)">
      <h4 id="anchor-sec-l1" style="margin-top: 0">第一章</h4>
      <p style="color: var(--oas-color-text-secondary)">虚线标记 80px 落点线：点击后第一章顶对齐到虚线。</p>
      <h4 id="anchor-sec-l2">第二章</h4>
      <p style="color: var(--oas-color-text-secondary)"><code>duration=500</code> 平滑滚动约 500ms。</p>
    </div>
  </div>
</DemoBlock>

<DemoBlock title="落点对齐（block）">
  <div style="display: flex; gap: 16px; width: 100%; align-items: stretch">
    <oas-anchor style="width: 128px; flex-shrink: 0" block="center" scroll-container="#anchor-sc-6" items='[{"href":"#anchor-sec-m1","title":"第一章"},{"href":"#anchor-sec-m2","title":"第二章"}]'></oas-anchor>
    <div id="anchor-sc-6" style="flex: 1; height: 240px; overflow: auto; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-4)">
      <h4 id="anchor-sec-m1" style="margin-top: 0">第一章</h4>
      <p style="color: var(--oas-color-text-secondary)">block="center"：目标章节垂直居中于容器。</p>
      <h4 id="anchor-sec-m2">第二章</h4>
      <p style="color: var(--oas-color-text-secondary)">点我试试居中落点效果。</p>
    </div>
  </div>
</DemoBlock>

<DemoBlock title="最小滚动落点（block=nearest）">
  <div style="display: flex; gap: 16px; width: 100%; align-items: stretch">
    <oas-anchor style="width: 128px; flex-shrink: 0" block="nearest" scroll-container="#anchor-sc-12" items='[{"href":"#anchor-sec-n1","title":"第一章"},{"href":"#anchor-sec-n2","title":"第二章"},{"href":"#anchor-sec-n3","title":"第三章"}]'></oas-anchor>
    <div id="anchor-sc-12" style="flex: 1; height: 240px; overflow: auto; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-4)">
      <h4 id="anchor-sec-n1" style="margin-top: 0">第一章</h4>
      <p style="color: var(--oas-color-text-secondary)">block="nearest"：目标已完全可见则完全不滚动。</p>
      <p style="color: var(--oas-color-text-secondary)">先点「第三章」滚到底，再点「第一章」——若第一章已可见则不发生滚动（最小滚动量）。</p>
      <h4 id="anchor-sec-n2" style="margin-top: var(--oas-space-4)">第二章</h4>
      <p style="color: var(--oas-color-text-secondary)">目标在容器下方时只滚到其底部刚可见。</p>
      <h4 id="anchor-sec-n3" style="margin-top: var(--oas-space-4)">第三章</h4>
      <p style="color: var(--oas-color-text-secondary)">目标在容器上方时只滚到其顶部刚可见。</p>
    </div>
  </div>
</DemoBlock>

<DemoBlock title="立即定位（animation）">
  <div style="display: flex; gap: 16px; width: 100%; align-items: stretch">
    <oas-anchor style="width: 128px; flex-shrink: 0" animation="false" scroll-container="#anchor-sc-7" items='[{"href":"#anchor-sec-i1","title":"第一章"},{"href":"#anchor-sec-i2","title":"第二章"}]'></oas-anchor>
    <div id="anchor-sc-7" style="flex: 1; height: 240px; overflow: auto; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-4)">
      <h4 id="anchor-sec-i1" style="margin-top: 0">第一章</h4>
      <p style="color: var(--oas-color-text-secondary)">animation="false"：点击后立即定位，无平滑过渡。</p>
      <h4 id="anchor-sec-i2">第二章</h4>
      <p style="color: var(--oas-color-text-secondary)">等价于 duration="0"。</p>
    </div>
  </div>
</DemoBlock>

## 嵌套层级与目标标记

`items` 支持 `children` 多级嵌套（层级缩进展示，子项同样参与滚动高亮）；`<oas-anchor-target>` 以组件方式标记滚动目标（`id` 同步到内部 `part=target`），替代手写标题 id；`internal-scrollable` 让锚点栏自身内部滚动。

<DemoBlock title="嵌套层级（children / oas-anchor-target / internal-scrollable）">
  <div style="display: flex; gap: 16px; width: 100%; align-items: stretch">
    <oas-anchor internal-scrollable style="width: 160px; flex-shrink: 0; height: 280px" scroll-container="#anchor-sc-8" items='[{"href":"#anchor-nest-1","title":"第一章","children":[{"href":"#anchor-nest-1-1","title":"1.1 小节"},{"href":"#anchor-nest-1-2","title":"1.2 小节"},{"href":"#anchor-nest-1-3","title":"1.3 小节"},{"href":"#anchor-nest-1-4","title":"1.4 小节"},{"href":"#anchor-nest-1-5","title":"1.5 小节"}]},{"href":"#anchor-nest-2","title":"第二章"}]'></oas-anchor>
    <div id="anchor-sc-8" style="flex: 1; height: 280px; overflow: auto; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-4)">
      <oas-anchor-target id="anchor-nest-1"><h4 style="margin-top: 0">第一章</h4></oas-anchor-target>
      <p style="color: var(--oas-color-text-secondary)">oas-anchor-target 包裹的标题作为滚动定位目标。</p>
      <oas-anchor-target id="anchor-nest-1-1"><h5 style="margin-top: var(--oas-space-4)">1.1 小节</h5></oas-anchor-target>
      <p style="color: var(--oas-color-text-secondary)">子级锚点缩进展示，同样参与高亮判定。</p>
      <oas-anchor-target id="anchor-nest-1-2"><h5 style="margin-top: var(--oas-space-4)">1.2 小节</h5></oas-anchor-target>
      <p style="color: var(--oas-color-text-secondary)">子级锚点缩进展示，同样参与高亮判定。</p>
      <oas-anchor-target id="anchor-nest-1-3"><h5 style="margin-top: var(--oas-space-4)">1.3 小节</h5></oas-anchor-target>
      <p style="color: var(--oas-color-text-secondary)">子级锚点缩进展示，同样参与高亮判定。</p>
      <oas-anchor-target id="anchor-nest-1-4"><h5 style="margin-top: var(--oas-space-4)">1.4 小节</h5></oas-anchor-target>
      <p style="color: var(--oas-color-text-secondary)">子级锚点缩进展示，同样参与高亮判定。</p>
      <oas-anchor-target id="anchor-nest-1-5"><h5 style="margin-top: var(--oas-space-4)">1.5 小节</h5></oas-anchor-target>
      <p style="color: var(--oas-color-text-secondary)">子级锚点缩进展示，同样参与高亮判定。</p>
      <oas-anchor-target id="anchor-nest-2"><h4 style="margin-top: var(--oas-space-4)">第二章</h4></oas-anchor-target>
      <p style="color: var(--oas-color-text-secondary)">internal-scrollable：锚点栏内容超高时自身滚动。</p>
    </div>
  </div>
</DemoBlock>

## 横向模式

<DemoBlock title="横向模式（direction=horizontal）">
  <div style="display: flex; gap: 16px; width: 100%; align-items: stretch">
    <oas-anchor direction="horizontal" scroll-container="#anchor-sc-9" style="width: 200px; flex-shrink: 0" items='[{"href":"#anchor-sec-h1","title":"第一章"},{"href":"#anchor-sec-h2","title":"第二章"},{"href":"#anchor-sec-h3","title":"第三章"}]'></oas-anchor>
    <div id="anchor-sc-9" style="flex: 1; height: 240px; overflow: auto; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-4)">
      <h4 id="anchor-sec-h1" style="margin-top: 0">第一章</h4>
      <p style="color: var(--oas-color-text-secondary)">横向模式下锚点项水平排布，墨水条横向随动。</p>
      <h4 id="anchor-sec-h2">第二章</h4>
      <p style="color: var(--oas-color-text-secondary)">滚动容器观察高亮切换。</p>
      <h4 id="anchor-sec-h3">第三章</h4>
      <p style="color: var(--oas-color-text-secondary)">点击锚点同样定位到对应章节。</p>
    </div>
  </div>
</DemoBlock>

## 吸附

`affix` 开启后锚点栏随滚动吸附（sticky 定位），`affix-offset` 控制吸附后距视口顶的距离；本 demo 锚点监听视口滚动。

<DemoBlock title="吸附（affix / affix-offset）">
  <div style="display: flex; gap: 16px; width: 100%; align-items: flex-start">
    <oas-anchor affix affix-offset="16" style="width: 128px; flex-shrink: 0; align-self: flex-start" items='[{"href":"#anchor-affix-1","title":"第一章"},{"href":"#anchor-affix-2","title":"第二章"},{"href":"#anchor-affix-3","title":"第三章"}]'></oas-anchor>
    <div style="flex: 1; min-width: 0">
      <h4 id="anchor-affix-1" style="margin-top: 0">第一章</h4>
      <p style="color: var(--oas-color-text-secondary)">向下滚动页面：左侧锚点栏吸附在视口顶部 16px 处。</p>
      <h4 id="anchor-affix-2" style="margin-top: var(--oas-space-6)">第二章</h4>
      <p style="color: var(--oas-color-text-secondary)">页面滚动时高亮跟随当前章节。</p>
      <h4 id="anchor-affix-3" style="margin-top: var(--oas-space-6)">第三章</h4>
      <p style="color: var(--oas-color-text-secondary)">配合固定头部导航时，affix-offset 避让固定头。</p>
    </div>
  </div>
</DemoBlock>

## 样式变体与尺寸

<DemoBlock title="样式变体与尺寸（variant / size）">
  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 24px; width: 100%">
    <div>
      <p style="margin: 0 0 8px; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-xs)">default</p>
      <oas-anchor variant="default" active="#anchor-v-1" items='[{"href":"#anchor-v-1","title":"第一章"},{"href":"#anchor-v-2","title":"第二章"},{"href":"#anchor-v-3","title":"第三章"}]'></oas-anchor>
    </div>
    <div>
      <p style="margin: 0 0 8px; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-xs)">underline</p>
      <oas-anchor variant="underline" active="#anchor-v-1" items='[{"href":"#anchor-v-1","title":"第一章"},{"href":"#anchor-v-2","title":"第二章"},{"href":"#anchor-v-3","title":"第三章"}]'></oas-anchor>
    </div>
    <div>
      <p style="margin: 0 0 8px; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-xs)">lineless</p>
      <oas-anchor variant="lineless" active="#anchor-v-2" items='[{"href":"#anchor-v-1","title":"第一章"},{"href":"#anchor-v-2","title":"第二章"},{"href":"#anchor-v-3","title":"第三章"}]'></oas-anchor>
    </div>
    <div>
      <p style="margin: 0 0 8px; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-xs)">block</p>
      <oas-anchor variant="block" active="#anchor-v-3" items='[{"href":"#anchor-v-1","title":"第一章"},{"href":"#anchor-v-2","title":"第二章"},{"href":"#anchor-v-3","title":"第三章"}]'></oas-anchor>
    </div>
    <div>
      <p style="margin: 0 0 8px; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-xs)">size=small</p>
      <oas-anchor size="small" active="#anchor-v-1" items='[{"href":"#anchor-v-1","title":"第一章"},{"href":"#anchor-v-2","title":"第二章"},{"href":"#anchor-v-3","title":"第三章"}]'></oas-anchor>
    </div>
    <div>
      <p style="margin: 0 0 8px; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-xs)">size=large</p>
      <oas-anchor size="large" active="#anchor-v-2" items='[{"href":"#anchor-v-1","title":"第一章"},{"href":"#anchor-v-2","title":"第二章"},{"href":"#anchor-v-3","title":"第三章"}]'></oas-anchor>
    </div>
  </div>
</DemoBlock>

## 历史控制

点击锚点默认更新 URL hash（`history.pushState`）；`replace` 改用 `replaceState` 替换历史；`hash="false"` 完全不写历史。

<DemoBlock title="历史控制（hash / replace）">
  <div style="display: flex; gap: 16px; width: 100%; align-items: stretch">
    <oas-anchor style="width: 128px; flex-shrink: 0" onoas-change="anchorLogHistory(event)" scroll-container="#anchor-sc-10" items='[{"href":"#anchor-sec-his1","title":"第一章"},{"href":"#anchor-sec-his2","title":"第二章"}]'></oas-anchor>
    <oas-anchor style="width: 128px; flex-shrink: 0" replace scroll-container="#anchor-sc-10" items='[{"href":"#anchor-sec-his1","title":"第一章"},{"href":"#anchor-sec-his2","title":"第二章"}]'></oas-anchor>
    <oas-anchor style="width: 128px; flex-shrink: 0" hash="false" scroll-container="#anchor-sc-10" items='[{"href":"#anchor-sec-his1","title":"第一章"},{"href":"#anchor-sec-his2","title":"第二章"}]'></oas-anchor>
    <div id="anchor-sc-10" style="flex: 1; height: 240px; overflow: auto; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-4)">
      <h4 id="anchor-sec-his1" style="margin-top: 0">第一章</h4>
      <p style="color: var(--oas-color-text-secondary)">三个锚点监听同一容器：默认 pushState、replace 替换历史、hash=false 不写。</p>
      <h4 id="anchor-sec-his2">第二章</h4>
      <p style="color: var(--oas-color-text-secondary)">点击第一列锚点查看 URL hash 变化。</p>
    </div>
  </div>
  <oas-tag id="anchor-history-result" type="info" style="margin-top: 8px">尚未点击</oas-tag>
</DemoBlock>

## 自定义高亮

`get-current-anchor` 指定自定义高亮策略：属性值为全局函数名，函数接收滚动算出的候选 href，返回实际应高亮 href；框架场景也可用 property `getCurrentAnchor` 传入函数。

<DemoBlock title="自定义高亮（get-current-anchor）">
  <div style="display: flex; gap: 16px; width: 100%; align-items: stretch">
    <oas-anchor style="width: 128px; flex-shrink: 0" get-current-anchor="anchorForceThird" onoas-change="anchorLogCustom(event)" scroll-container="#anchor-sc-11" items='[{"href":"#anchor-sec-g1","title":"第一章"},{"href":"#anchor-sec-g2","title":"第二章"},{"href":"#anchor-sec-g3","title":"第三章"}]'></oas-anchor>
    <div id="anchor-sc-11" style="flex: 1; height: 240px; overflow: auto; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-4)">
      <h4 id="anchor-sec-g1" style="margin-top: 0">第一章</h4>
      <p style="color: var(--oas-color-text-secondary)">无论滚动到哪，自定义策略都强制高亮第三章。</p>
      <h4 id="anchor-sec-g2">第二章</h4>
      <p style="color: var(--oas-color-text-secondary)">滚动时事件 detail.href 也来自自定义策略。</p>
      <h4 id="anchor-sec-g3">第三章</h4>
      <p style="color: var(--oas-color-text-secondary)">实际高亮项。</p>
    </div>
  </div>
  <oas-tag id="anchor-custom-result" type="info" style="margin-top: 8px">尚未滚动</oas-tag>
</DemoBlock>

## 外部链接

锚点项设置 `target`（如 `_blank`）后不拦截默认行为，交由浏览器打开（自动补 `rel="noopener noreferrer"`），不参与滚动与高亮。

<DemoBlock title="外部链接（item target）">
  <oas-anchor items='[{"href":"https://example.com","title":"外部文档","target":"_blank"},{"href":"https://example.com/faq","title":"FAQ 外部页","target":"_blank"}]'></oas-anchor>
</DemoBlock>

## 子元素声明式通道

除 `items` JSON 外，可用 `<oas-anchor-item>` 子元素声明式书写（`items` 属性**显式设置时优先**）。默认插槽文本为 title；属性对齐 `AnchorItem` 字段：`href`/`target`/`target-offset`；直接子 `<oas-anchor-item>` 递归为 `children` 多级嵌套（层级缩进，同样参与滚动高亮）。子元素增删、属性与文本变化会自动重渲染。

<DemoBlock title="子元素基础">
  <div style="display: flex; gap: 16px; width: 100%; align-items: stretch">
    <oas-anchor style="width: 160px; flex-shrink: 0" scroll-container="#anchor-sc-child">
      <oas-anchor-item href="#anchor-child-1">第一章</oas-anchor-item>
      <oas-anchor-item href="#anchor-child-2">第二章</oas-anchor-item>
    </oas-anchor>
    <div id="anchor-sc-child" style="flex: 1; height: 240px; overflow: auto; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-4)">
      <oas-anchor-target id="anchor-child-1"><h4 style="margin-top: 0">第一章</h4></oas-anchor-target>
      <p style="color: var(--oas-color-text-secondary)">用 oas-anchor-item 声明式书写锚点项；滚动联动高亮与 items 通道一致。</p>
      <oas-anchor-target id="anchor-child-2"><h4 style="margin-top: var(--oas-space-4)">第二章</h4></oas-anchor-target>
      <p style="color: var(--oas-color-text-secondary)">点击锚点平滑滚动定位到对应章节。</p>
    </div>
  </div>
</DemoBlock>

<DemoBlock title="嵌套与属性（children / target-offset）">
  <div style="display: flex; gap: 16px; width: 100%; align-items: stretch">
    <oas-anchor style="width: 160px; flex-shrink: 0" target-offset="80" scroll-container="#anchor-sc-child2">
      <oas-anchor-item href="#anchor-child2-1">第一章
        <oas-anchor-item href="#anchor-child2-1-1">1.1 小节</oas-anchor-item>
        <oas-anchor-item href="#anchor-child2-1-2">1.2 小节</oas-anchor-item>
      </oas-anchor-item>
      <oas-anchor-item href="#anchor-child2-2" target-offset="40">第二章</oas-anchor-item>
    </oas-anchor>
    <div id="anchor-sc-child2" style="flex: 1; height: 240px; overflow: auto; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-4)">
      <oas-anchor-target id="anchor-child2-1"><h4 style="margin-top: 0">第一章</h4></oas-anchor-target>
      <oas-anchor-target id="anchor-child2-1-1"><h5 style="margin-top: var(--oas-space-4)">1.1 小节</h5></oas-anchor-target>
      <oas-anchor-target id="anchor-child2-1-2"><h5 style="margin-top: var(--oas-space-4)">1.2 小节</h5></oas-anchor-target>
      <oas-anchor-target id="anchor-child2-2"><h4 style="margin-top: var(--oas-space-4)">第二章</h4></oas-anchor-target>
      <p style="color: var(--oas-text-secondary, var(--oas-color-text-secondary))">项级 `target-offset` 覆盖全局落点偏移；子项同样参与滚动高亮。</p>
      <p style="color: var(--oas-color-text-secondary)">滚动到本节底部，左侧高亮会随滚动联动迁移。</p>
      <p style="color: var(--oas-color-text-secondary)">点击左侧「第二章」可平滑滚动定位到本节。</p>
      <p style="color: var(--oas-color-text-secondary)">内容撑高以演示滚动联动（容器 240px 高）。</p>
      <p style="color: var(--oas-color-text-secondary)">再多一段文字确保溢出可滚。</p>
    </div>
  </div>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  window.anchorLog = (e) => {
    const tag = document.getElementById('anchor-result')
    if (tag) tag.textContent = `已定位：${e.detail.href}（前值 ${e.detail.prevHref || '无'}）`
  }
  window.anchorClickLog = (e) => {
    const tag = document.getElementById('anchor-click-result')
    if (tag) tag.textContent = `oas-click：${e.detail.href}（${e.detail.item.title}）`
  }
  window.anchorSetActive = (href) => document.getElementById('anchor-ctrl').setAttribute('active', href)
  window.anchorLogHistory = (e) => {
    const tag = document.getElementById('anchor-history-result')
    if (tag) tag.textContent = `已定位：${e.detail.href}，URL hash：${location.hash || '无'}`
  }
  window.anchorLogCustom = (e) => {
    const tag = document.getElementById('anchor-custom-result')
    if (tag) tag.textContent = `滚动高亮：${e.detail.href}（自定义策略）`
  }
  window.anchorForceThird = () => '#anchor-sec-g3'
})
</script>

## API

### oas-anchor

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `active` | 当前高亮 href（受控：外部设置/清除立即生效；滚动联动接管后回写） | `string` | — |
| `affix` | 启用吸附（sticky 定位，随滚动视口/容器吸附） | `boolean` | — |
| `affix-offset` | 吸附时距滚动视口顶部的距离（px） | `string` | `0` |
| `animation` | 平滑滚动开关（默认 true；`false` 立即定位） | `string` | `true` |
| `block` | 滚动落点对齐：`start` / `center` / `end` / `nearest`（目标已可见则不滚动，最小滚动量；在上方对齐顶部、在下方对齐底部） | `ScrollBlock` | `start` |
| `bounds` | 触发边界（px，默认 5）：章节顶越检测线的额外提前量，避免高亮抖动 | `string` | `5` |
| `direction` | 布局方向：`vertical` / `horizontal` | `string` | `vertical` |
| `duration` | 平滑滚动时长（ms，默认 300；`0` 立即定位） | `string` | `300` |
| `get-current-anchor` | 自定义高亮策略：属性指定全局函数名，接收滚动算出的候选 href，返回实际应高亮 href；亦可用 property `getCurrentAnchor` 传入函数 | `((activeHref: string) => string) \| null` | — |
| `hash` | 点击是否更新 URL hash（默认 true；`false` 关闭） | `string` | `true` |
| `internal-scrollable` | 锚点栏自身内部滚动（max-height + overflow-y: auto） | `boolean` | — |
| `items` | 锚点项 JSON；项支持 `children` 多级嵌套、`target`（如 `_blank`）、`targetOffset` 项级落点偏移 | `AnchorItem[] \| string` | `[]` |
| `offset` | 高亮判定偏移（px）：章节顶越检测线的提前量 | `string` | `0` |
| `replace` | 历史控制：用 `history.replaceState` 替换历史而非 pushState | `boolean` | — |
| `scroll-container` | 滚动容器选择器或元素 id；未设置时监听视口（window） | `HTMLElement \| string \| null` | — |
| `size` | 尺寸档位：`small` / `medium` / `large` | `string` | `medium` |
| `target-offset` | 点击定位落点偏移（px），避让固定头；未设置时回退 `offset`；项级 `targetOffset` 优先 | `string` | — |
| `variant` | 样式变体：`default`（轨道+墨水条）/ `underline`（滑动下划线）/ `lineless`（无轴线）/ `block`（块状背景） | `string` | `default` |

| 事件 | 说明 |
| --- | --- |
| `oas-change` | 高亮切换（点击或滚动联动均派发），`detail: { href, prevHref }` |
| `oas-click` | 用户点击锚点项（与滚动联动的 `oas-change` 分离，宿主可只响应用户操作；外部链接 `target` 项同样派发），`detail: { href, item }` |

### oas-anchor-target

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `id` | 目标标记 id：同步到内部 `part=target` 元素，锚点项以此为滚动定位目标 | — | — |

| 名称 | 说明 |
| --- | --- |
| 默认 | 被标记的目标内容（如多级标题） |

### oas-anchor-item

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `href` | 锚点目标：`#id`（或外链地址；外链建议搭配 `target`） | — | — |
| `target` | 链接 target（如 `_blank`）：设置后不拦截默认行为，交由浏览器打开（自动补 `rel="noopener noreferrer"`） | — | — |
| `target-offset` | 项级点击落点偏移（px），优先于全局 `target-offset`；非法值忽略 | — | — |

| 名称 | 说明 |
| --- | --- |
| 默认 | 锚点项 title 内容（默认插槽文本；直接子 `oas-anchor-item` 不计入） |

基于滚动容器（默认视口）的 scroll spy；点击平滑滚动定位；`nav` + `aria-label="锚点导航"`，当前项 `aria-current="true"`。

基于 `oas-anchor-target` 的目标标记组件：包裹真实多级标题，作为锚点项滚动定位目标；默认插槽为被标记内容。
