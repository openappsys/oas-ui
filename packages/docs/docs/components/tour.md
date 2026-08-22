# Tour 引导

分步功能引导，带全屏遮罩与目标高亮。支持 12 向定位与溢出翻转、滚动跟随、遮罩/形态定制、键盘导航、异步步骤、hints 信标与「不再显示」记忆。

## 基础用法

<DemoBlock title="开始引导">
  <oas-button type="primary" onclick="document.getElementById('tour-basic').setAttribute('open','')">开始引导</oas-button>
  <oas-tour id="tour-basic" steps='[{"selector":"#tour-b1","title":"第一步","description":"这是第一个高亮区域，通过 selector 定位。"},{"selector":"#tour-b2","title":"第二步","description":"点击「下一步」或「完成」推进步骤。"}]'></oas-tour>
  <div id="tour-b1" style="margin-top: 12px; height: 60px; padding: 0 12px; white-space: nowrap; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center">高亮区域一</div>
  <div id="tour-b2" style="margin-top: 12px; height: 60px; padding: 0 12px; white-space: nowrap; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center">高亮区域二</div>
</DemoBlock>

## 引导事件

`oas-step` 步骤切换携带 `detail: { index, current, total, next, prev }`；关闭类事件（cancel/finish/close/skip/destroy）携带 `detail: { index, total }`。

<DemoBlock title="步骤事件">
  <oas-button type="primary" onclick="document.getElementById('tour-event').setAttribute('open','')">开始引导</oas-button>
  <oas-tour id="tour-event" onoas-step="tourLog(event)" onoas-finish="message.success('引导完成')" onoas-cancel="message.info('已跳过引导')" onoas-skip="message.info('点击了跳过')" onoas-close="message.info('点击了关闭')" steps='[{"selector":"#tour-e1","title":"第一步","description":"观察步骤切换事件输出。"},{"selector":"#tour-e2","title":"第二步","description":"点击「完成」触发 oas-finish，Esc / 跳过触发 oas-cancel。"}]'></oas-tour>
  <oas-tag id="tour-result" type="info">尚未开始</oas-tag>
  <div id="tour-e1" style="margin-top: 12px; height: 60px; padding: 0 12px; white-space: nowrap; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center">高亮区域一</div>
  <div id="tour-e2" style="margin-top: 12px; height: 60px; padding: 0 12px; white-space: nowrap; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center">高亮区域二</div>
</DemoBlock>

## 受控步骤与开关

`open` 与 `current` 均为受控属性：外部按钮 / JS 设置 `open` 启动引导，设置 `current` 直接跳到指定步骤（无需逐步点击）。

<DemoBlock title="受控 open / current">
  <oas-space>
    <oas-button type="primary" onclick="tourCtlOpen()">开始引导（设置 open）</oas-button>
    <oas-button onclick="tourCtlJump(1)">跳到第 2 步（current=1）</oas-button>
    <oas-button onclick="tourCtlJump(2)">跳到第 3 步（current=2）</oas-button>
    <oas-button onclick="tourCtlClose()">结束（移除 open）</oas-button>
  </oas-space>
  <oas-tour id="tour-ctrl" steps='[{"selector":"#tour-c1","title":"第一步","description":"通过外部按钮设置 current 可跳步。"},{"selector":"#tour-c2","title":"第二步","description":"当前步骤高亮随属性变化。"},{"selector":"#tour-c3","title":"第三步","description":"直接移除 open 结束引导。"}]'></oas-tour>
  <div id="tour-c1" style="margin-top: 12px; height: 60px; padding: 0 12px; white-space: nowrap; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center">受控高亮区域一</div>
  <div id="tour-c2" style="margin-top: 12px; height: 60px; padding: 0 12px; white-space: nowrap; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center">受控高亮区域二</div>
  <div id="tour-c3" style="margin-top: 12px; height: 60px; padding: 0 12px; white-space: nowrap; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center">受控高亮区域三</div>
</DemoBlock>

## 定位与箭头

`placement` 支持 12 向（top/bottom/left/right × start/end/center）+ `center`，空间不足时自动沿主轴翻转；`arrow="false"` 隐藏箭头。

<DemoBlock title="12 向定位与自动翻转">
  <oas-space>
    <oas-button type="primary" onclick="document.getElementById('tour-pos').setAttribute('open','')">右侧定位（placement=right）</oas-button>
    <oas-button onclick="document.getElementById('tour-pos-edge').setAttribute('open','')">贴底自动翻转</oas-button>
    <oas-button onclick="document.getElementById('tour-noarrow').setAttribute('open','')">无箭头（arrow=false）</oas-button>
  </oas-space>
  <oas-tour id="tour-pos" placement="right" steps='[{"selector":"#tour-p1","title":"右侧定位","description":"placement=right，弹层垂直居中于目标右侧。"},{"selector":"#tour-p2","title":"12 向定位","description":"top/bottom/left/right × start/end/center 全部支持。"}]'></oas-tour>
  <oas-tour id="tour-pos-edge" steps='[{"selector":"#tour-p3","title":"贴底自动翻转","description":"目标贴近视口底部，弹层自动翻到上方。"}]'></oas-tour>
  <oas-tour id="tour-noarrow" arrow="false" steps='[{"selector":"#tour-p1","title":"无箭头","description":"arrow=false 隐藏指向箭头的弹层。"}]'></oas-tour>
  <div id="tour-p1" style="margin-top: 12px; height: 60px; padding: 0 12px; white-space: nowrap; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center">右侧定位目标</div>
  <div id="tour-p2" style="margin-top: 12px; height: 60px; padding: 0 12px; white-space: nowrap; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center">多向定位目标</div>
  <div id="tour-p3" style="position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); height: 56px; padding: 0 12px; white-space: nowrap; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center; background: var(--oas-color-bg)">贴底目标（视口底部）</div>
</DemoBlock>

## 滚动到目标与重定位

目标在视口外时自动滚动到目标（`scroll-into-view-options` 透传，`scroll-padding` 写目标 scroll-margin 留白）；引导期间滚动/resize 高亮与弹层自动跟随（`auto-reposition`，默认开启）。

<DemoBlock title="滚动到目标与滚动跟随">
  <oas-button type="primary" onclick="document.getElementById('tour-scroll').setAttribute('open','')">开始引导（目标在页面下方）</oas-button>
  <oas-tour id="tour-scroll" scroll-into-view-options='{"behavior":"smooth","block":"center"}' scroll-padding="80" auto-reposition steps='[{"selector":"#tour-s1","title":"滚动定位","description":"目标在页面下方，自动滚动到视口中心后高亮。"},{"selector":"#tour-s2","title":"滚动跟随","description":"引导期间滚动页面，高亮与弹层跟随重定位。"}]'></oas-tour>
  <div style="height: 900px"></div>
  <div id="tour-s1" style="margin-top: 12px; height: 60px; padding: 0 12px; white-space: nowrap; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center">下方目标一（滚动到这里）</div>
  <div id="tour-s2" style="margin-top: 12px; height: 60px; padding: 0 12px; white-space: nowrap; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center">下方目标二</div>
</DemoBlock>

## 遮罩与形态

`mask="false"` 关闭遮罩（非模态，引导期间页面其余区域可交互）；`mask='{"color":"..."}'` 定制遮罩颜色；`type="primary"` 主色底弹层强调；`gap` 控制高亮内边距与圆角（数字或 `{padding, radius}`）。

<DemoBlock title="非模态 + 主色弹层">
  <oas-space>
    <oas-button type="primary" onclick="document.getElementById('tour-modal').setAttribute('open','')">非模态 + 主色弹层</oas-button>
    <oas-button onclick="document.getElementById('tour-mask-color').setAttribute('open','')">自定义遮罩颜色</oas-button>
  </oas-space>
  <oas-tour id="tour-modal" mask="false" type="primary" gap='{"padding":8,"radius":12}' arrow steps='[{"selector":"#tour-m1","title":"非模态引导","description":"无遮罩，主色弹层强调，gap 控制高亮边距与圆角。"},{"selector":"#tour-m2","title":"无遮罩形态","description":"引导过程页面其余区域仍可交互。"}]'></oas-tour>
  <oas-tour id="tour-mask-color" mask='{"color":"rgba(18, 34, 51, 0.85)"}' steps='[{"selector":"#tour-m1","title":"遮罩颜色可配","description":"mask={\"color\":\"...\"} 定制遮罩色，其余行为同模态。"}]'></oas-tour>
  <div id="tour-m1" style="margin-top: 12px; height: 60px; padding: 0 12px; white-space: nowrap; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center">非模态高亮一</div>
  <div id="tour-m2" style="margin-top: 12px; height: 60px; padding: 0 12px; white-space: nowrap; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center">非模态高亮二</div>
</DemoBlock>

## 键盘导航与指示器

`keyboard`（默认开启）支持 ←/→ 推进步骤；`show-bullets` 圆点指示器可点击跳步；`show-progress` 顶部进度条；`progress-text` 模板（`{{current}}/{{total}}`）自定义计数文本；`indicators="number"` 数字计数。

<DemoBlock title="键盘导航 + 圆点 + 进度条">
  <oas-space>
    <oas-button type="primary" onclick="tourKeyOpen()">开始引导（键盘 + 圆点 + 进度条）</oas-button>
    <oas-button onclick="document.getElementById('tour-nokey').setAttribute('open','')">关闭键盘导航</oas-button>
  </oas-space>
  <oas-tour id="tour-key" keyboard show-bullets show-progress steps='[{"selector":"#tour-k1","title":"键盘可导航","description":"按 ← / → 推进步骤，圆点可点击跳步。"},{"selector":"#tour-k2","title":"进度条","description":"顶部进度条随步骤推进，计数区显示模板文本。"},{"selector":"#tour-k3","title":"最后一步","description":"按 → 完成引导。"}]'></oas-tour>
  <oas-tour id="tour-nokey" keyboard="false" indicators="number" steps='[{"selector":"#tour-k1","title":"关闭键盘导航","description":"keyboard=false 时方向键不推进。"}]'></oas-tour>
  <div id="tour-k1" style="margin-top: 12px; height: 60px; padding: 0 12px; white-space: nowrap; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center">键盘导航目标一</div>
  <div id="tour-k2" style="margin-top: 12px; height: 60px; padding: 0 12px; white-space: nowrap; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center">键盘导航目标二</div>
  <div id="tour-k3" style="margin-top: 12px; height: 60px; padding: 0 12px; white-space: nowrap; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center">键盘导航目标三</div>
</DemoBlock>

## 按钮显隐与透传

`hide-prev` / `hide-skip` / `hide-next` / `hide-counter` 控制按钮与计数显隐；`*-button-props`（next/prev/skip/finish）透传任意属性到按钮（JSON 对象）。

<DemoBlock title="按钮显隐与属性透传">
  <oas-space>
    <oas-button type="primary" onclick="document.getElementById('tour-btn').setAttribute('open','')">按钮显隐 + props 透传</oas-button>
    <oas-button onclick="document.getElementById('tour-hide').setAttribute('open','')">隐藏全部操作</oas-button>
  </oas-space>
  <oas-tour id="tour-btn" hide-prev hide-skip next-button-props='{"data-demo":"1"}' prev-button-props='{"disabled":""}' skip-button-props='{"data-demo":"skip"}' finish-button-props='{"data-demo":"finish"}' steps='[{"selector":"#tour-bt1","title":"按钮定制","description":"hide-prev / hide-skip 隐藏按钮，next-button-props 等透传属性。"},{"selector":"#tour-bt2","title":"完成按钮透传","description":"finish-button-props 作用于最后一步的「完成」按钮。"}]'></oas-tour>
  <oas-tour id="tour-hide" hide-prev hide-skip hide-next hide-counter steps='[{"selector":"#tour-bt1","title":"无操作按钮","description":"只能通过 Esc / 遮罩点击 / 键盘导航离开。"}]'></oas-tour>
  <div id="tour-bt1" style="margin-top: 12px; height: 60px; padding: 0 12px; white-space: nowrap; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center">按钮定制目标一</div>
  <div id="tour-bt2" style="margin-top: 12px; height: 60px; padding: 0 12px; white-space: nowrap; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center">按钮定制目标二</div>
</DemoBlock>

## 关闭按钮定制

`show-close="false"` 隐藏关闭按钮；`close-icon` 自定义关闭按钮内容（HTML）。

<DemoBlock title="关闭按钮定制">
  <oas-space>
    <oas-button type="primary" onclick="document.getElementById('tour-close').setAttribute('open','')">自定义关闭图标</oas-button>
    <oas-button onclick="document.getElementById('tour-noclose').setAttribute('open','')">无关闭按钮</oas-button>
  </oas-space>
  <oas-tour id="tour-close" show-close close-icon='<svg viewBox="0 0 12 12" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M2 2l8 8M10 2l-8 8"/></svg>' steps='[{"selector":"#tour-cl1","title":"自定义关闭图标","description":"close-icon 传入任意 HTML（含 SVG）替换默认 ✕。"}]'></oas-tour>
  <oas-tour id="tour-noclose" show-close="false" steps='[{"selector":"#tour-cl1","title":"无关闭按钮","description":"show-close=false 隐藏右上角关闭按钮。"}]'></oas-tour>
  <div id="tour-cl1" style="margin-top: 12px; height: 60px; padding: 0 12px; white-space: nowrap; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center">关闭按钮定制目标</div>
</DemoBlock>

## 遮罩点击与高亮区交互

`mask-click-behavior`：`close`（默认）/ `next`（点击遮罩推进）/ `none`（忽略）；`target-area-clickable` 高亮区可点击（点击穿透目标）；`disabled-interaction` 禁止高亮区交互；`advance-on-click` 点击高亮区推进（交互式引导「点这里试试」）。

<DemoBlock title="遮罩点击行为 + 高亮区交互">
  <oas-space>
    <oas-button type="primary" onclick="document.getElementById('tour-masknext').setAttribute('open','')">遮罩点击推进</oas-button>
    <oas-button onclick="document.getElementById('tour-masknone').setAttribute('open','')">遮罩点击忽略</oas-button>
    <oas-button onclick="document.getElementById('tour-interact').setAttribute('open','')">高亮区可交互</oas-button>
    <oas-button onclick="document.getElementById('tour-disabled').setAttribute('open','')">禁止高亮区交互</oas-button>
    <oas-button onclick="document.getElementById('tour-adv').setAttribute('open','')">点击高亮区推进</oas-button>
  </oas-space>
  <oas-tour id="tour-masknext" mask-click-behavior="next" steps='[{"selector":"#tour-ai1","title":"遮罩点击推进","description":"mask-click-behavior=next：点击遮罩任意处进入下一步。"},{"selector":"#tour-ai2","title":"第二步","description":"继续点遮罩推进或点击按钮。"}]'></oas-tour>
  <oas-tour id="tour-masknone" mask-click-behavior="none" steps='[{"selector":"#tour-ai1","title":"遮罩点击忽略","description":"mask-click-behavior=none：点遮罩无任何响应。"}]'></oas-tour>
  <oas-tour id="tour-interact" target-area-clickable steps='[{"selector":"#tour-ai1","title":"高亮区可交互","description":"target-area-clickable：高亮目标上的按钮/链接可直接点击（遮罩不拦截）。"}]'></oas-tour>
  <oas-tour id="tour-disabled" disabled-interaction steps='[{"selector":"#tour-ai1","title":"禁止高亮区交互","description":"disabled-interaction：高亮区拦截层覆盖，目标不可点击。"}]'></oas-tour>
  <oas-tour id="tour-adv" advance-on-click steps='[{"selector":"#tour-ai1","title":"点我试试","description":"点击高亮区域直接进入下一步。"},{"selector":"#tour-ai2","title":"又前进一步","description":"交互式引导：点高亮区即推进。"}]'></oas-tour>
  <div id="tour-ai1" style="margin-top: 12px; height: 60px; padding: 0 12px; white-space: nowrap; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center">高亮交互目标一</div>
  <div id="tour-ai2" style="margin-top: 12px; height: 60px; padding: 0 12px; white-space: nowrap; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center">高亮交互目标二</div>
</DemoBlock>

## 异步步骤

`wait-for-element`（毫秒）等待目标出现（如「上一步点击打开了弹窗，等里面元素渲染」）；`skip-missing-element` 目标缺失/等待超时自动跳过该步骤。

<DemoBlock title="异步目标等待与跳过">
  <oas-space>
    <oas-button type="primary" onclick="tourAsync()">等待异步目标</oas-button>
    <oas-button onclick="document.getElementById('tour-skipmiss').setAttribute('open','')">跳过缺失目标</oas-button>
  </oas-space>
  <oas-tour id="tour-async" wait-for-element="500" steps='[{"selector":"#tour-wait","title":"异步目标","description":"目标延迟 400ms 出现，引导自动等待后再高亮。"},{"selector":"#tour-a2","title":"后续步骤","description":"目标出现后继续引导。"}]'></oas-tour>
  <oas-tour id="tour-skipmiss" wait-for-element="300" skip-missing-element steps='[{"selector":"#tour-ghost","title":"缺失目标","description":"目标不存在，300ms 后自动跳过该步骤。"},{"selector":"#tour-a2","title":"跳过后的步骤","description":"skip-missing-element 生效，已跳到此处。"}]'></oas-tour>
  <div id="tour-wait" style="margin-top: 12px; height: 60px; padding: 0 12px; white-space: nowrap; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: none; align-items: center; justify-content: center">延迟出现的目标（400ms 后可见）</div>
  <div id="tour-a2" style="margin-top: 12px; height: 60px; padding: 0 12px; white-space: nowrap; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center">普通目标</div>
</DemoBlock>

## 对话框模式

`mode="dialog"`（或 step 级 `mode: "dialog"`）无目标居中对话框步骤，作为一等形态混入引导。

<DemoBlock title="对话框模式">
  <oas-button type="primary" onclick="document.getElementById('tour-dialog').setAttribute('open','')">开始引导</oas-button>
  <oas-tour id="tour-dialog" mode="dialog" steps='[{"title":"欢迎使用","description":"无目标的居中对话框步骤，适合总览式说明。"},{"title":"第二步","description":"继续引导，可混用 popup 与 dialog 步骤。"}]'></oas-tour>
</DemoBlock>

## 生命周期事件

`oas-highlight-start` / `oas-highlight-end` 在步骤高亮开始/完成时派发（异步等待命中后触发）；`oas-destroy` 在引导关闭时派发（含外部移除 open）。

<DemoBlock title="生命周期事件">
  <oas-button type="primary" onclick="document.getElementById('tour-life').setAttribute('open','')">开始引导</oas-button>
  <oas-tour id="tour-life" onoas-highlight-start="tourLife('start', event)" onoas-highlight-end="tourLife('end', event)" onoas-destroy="tourLife('destroy', event)" steps='[{"selector":"#tour-l1","title":"高亮生命周期","description":"高亮开始/完成事件已输出，用于埋点与动态步骤。"},{"selector":"#tour-l2","title":"关闭即销毁","description":"关闭引导（关闭按钮 / Esc / 移除 open）派发 oas-destroy。"}]'></oas-tour>
  <oas-tag id="tour-life-result" type="info">尚无事件</oas-tag>
  <div id="tour-l1" style="margin-top: 12px; height: 60px; padding: 0 12px; white-space: nowrap; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center">生命周期目标一</div>
  <div id="tour-l2" style="margin-top: 12px; height: 60px; padding: 0 12px; white-space: nowrap; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center">生命周期目标二</div>
</DemoBlock>

## 不再显示与多页引导

`dont-show-again` 关闭时勾选「不再显示」，经 `storage-key` 记忆到 localStorage，下次启动被拦截并派发 `oas-dismiss`；`persist` 把 open/current 状态持久化，路由切换重新挂载后自动恢复（多页引导）。

<DemoBlock title="「不再显示」记忆">
  <oas-space>
    <oas-button type="primary" onclick="tourDismissDemo()">打开引导（已记忆则不显示）</oas-button>
    <oas-button onclick="tourClearDismiss()">清除记忆</oas-button>
  </oas-space>
  <oas-tour id="tour-dsa" dont-show-again storage-key="oas-tour-dsa-demo" onoas-dismiss="message.info('已被记忆，不再显示')" steps='[{"selector":"#tour-d1","title":"不再显示","description":"勾选「不再显示」后关闭，下次启动被拦截。"}]'></oas-tour>
  <div id="tour-d1" style="margin-top: 12px; height: 60px; padding: 0 12px; white-space: nowrap; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center">记忆目标</div>
</DemoBlock>

<DemoBlock title="多页引导（persist）">
  <oas-space>
    <oas-button type="primary" onclick="document.getElementById('tour-persist').setAttribute('open','')">开始引导</oas-button>
    <oas-button onclick="tourReload()">模拟路由切换（重新挂载）</oas-button>
  </oas-space>
  <oas-tour id="tour-persist" persist storage-key="oas-tour-persist-demo" steps='[{"selector":"#tour-ps1","title":"多页引导","description":"打开后状态持久化，路由切换后自动恢复到当前步骤。"},{"selector":"#tour-ps2","title":"切换后恢复","description":"模拟路由切换再回来，仍停留在本次步骤。"}]'></oas-tour>
  <div id="tour-ps1" style="margin-top: 12px; height: 60px; padding: 0 12px; white-space: nowrap; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center">多页目标一</div>
  <div id="tour-ps2" style="margin-top: 12px; height: 60px; padding: 0 12px; white-space: nowrap; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center">多页目标二</div>
</DemoBlock>

## 打字机与锁滚动

`typewriter` + `typewriter-speed` 描述逐字显示动画；`lock-scroll` 引导期间锁定页面滚动；`close-on-press-escape="false"` 关闭 Esc。

<DemoBlock title="打字机动画 + 锁滚动">
  <oas-button type="primary" onclick="document.getElementById('tour-tw').setAttribute('open','')">开始引导</oas-button>
  <oas-tour id="tour-tw" typewriter typewriter-speed="30" lock-scroll close-on-press-escape steps='[{"selector":"#tour-t1","title":"打字机动画","description":"这段描述会逐字显示，营造营销页引导氛围。","cover":"https://picsum.photos/seed/oas-tour/320/120"},{"selector":"#tour-t2","title":"锁滚动 + 无 Esc","description":"lock-scroll 锁定页面滚动，close-on-press-escape=false 时 Esc 不关闭。"}]'></oas-tour>
  <div id="tour-t1" style="margin-top: 12px; height: 60px; padding: 0 12px; white-space: nowrap; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center">打字机目标一（含 cover 封面）</div>
  <div id="tour-t2" style="margin-top: 12px; height: 60px; padding: 0 12px; white-space: nowrap; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center">打字机目标二</div>
</DemoBlock>

## hints 信标模式

`hints` 常驻脉冲信标（无需 open），点击弹出气泡；`dismissable` + `id` 的提示关闭后记忆到 localStorage（`oas-tour-hint-${id}`）不再显示。

<DemoBlock title="hints 信标模式">
  <oas-tour id="tour-hints" hints='[{"id":"hint-1","selector":"#tour-h1","title":"脉冲提示","description":"点击信标查看详情，关闭后不再显示。","placement":"top","dismissable":true},{"id":"hint-2","selector":"#tour-h2","title":"常驻提示","description":"这个提示可反复查看，不记忆。","placement":"right"}]'></oas-tour>
  <div id="tour-h1" style="margin-top: 12px; height: 60px; padding: 0 12px; white-space: nowrap; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center">信标目标一（dismissable）</div>
  <div id="tour-h2" style="margin-top: 12px; height: 60px; padding: 0 12px; white-space: nowrap; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center">信标目标二（常驻）</div>
</DemoBlock>

## 挂载点与层级

`append-to="body"`（或选择器）把整个浮层挂载到指定容器；`z-index` 定制层级。

<DemoBlock title="挂载点与层级">
  <oas-button type="primary" onclick="document.getElementById('tour-portal').setAttribute('open','')">append-to body + 高层级</oas-button>
  <oas-tour id="tour-portal" append-to="body" z-index="9999" steps='[{"selector":"#tour-pp1","title":"挂载到 body","description":"浮层挂载到 body 的 portal 容器，z-index=9999 置于最顶层。"}]'></oas-tour>
  <div id="tour-pp1" style="margin-top: 12px; height: 60px; padding: 0 12px; white-space: nowrap; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center">挂载目标</div>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  const { message } = await import('@oas-ui/ui')
  window.message = message
  window.tourLog = (e) => {
    const tag = document.getElementById('tour-result')
    if (tag) tag.textContent = `当前步骤：${e.detail.index + 1}`
  }
  window.tourCtlOpen = () => document.getElementById('tour-ctrl').setAttribute('open', '')
  window.tourCtlJump = (i) => document.getElementById('tour-ctrl').setAttribute('current', String(i))
  window.tourCtlClose = () => document.getElementById('tour-ctrl').removeAttribute('open')
  // progress-text 模板含 {{current}} 占位符，经 setAttribute 设置避开 Vue 插值编译
  window.tourKeyOpen = () => {
    document.getElementById('tour-key').setAttribute('progress-text', '{{current}}/{{total}} 步')
    document.getElementById('tour-key').setAttribute('open', '')
  }
  // 异步步骤：延迟 400ms 显示目标
  window.tourAsync = () => {
    setTimeout(() => {
      const el = document.getElementById('tour-wait')
      if (el) el.style.display = 'flex'
    }, 400)
    document.getElementById('tour-async').setAttribute('open', '')
  }
  window.tourLife = (phase, e) => {
    const tag = document.getElementById('tour-life-result')
    if (tag) tag.textContent = `事件：${phase}（步骤 ${e.detail.index + 1}）`
  }
  // 「不再显示」：预置记忆模拟「之前勾选过」
  window.tourDismissDemo = () => {
    localStorage.setItem('oas-tour-dsa-demo', '1')
    document.getElementById('tour-dsa').setAttribute('open', '')
  }
  window.tourClearDismiss = () => {
    localStorage.removeItem('oas-tour-dsa-demo')
    message.success('已清除记忆，可再次打开引导')
  }
  // 多页引导：模拟路由切换（移除后重新挂载，persist 恢复状态）
  window.tourReload = () => {
    const host = document.getElementById('tour-persist')
    if (!host) return
    const parent = host.parentElement
    const steps = host.getAttribute('steps')
    host.remove()
    const el = document.createElement('oas-tour')
    el.id = 'tour-persist'
    el.setAttribute('persist', '')
    el.setAttribute('storage-key', 'oas-tour-persist-demo')
    el.setAttribute('steps', steps ?? '[]')
    parent?.appendChild(el)
  }
})
</script>



## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `advance-on-click` | 点击高亮区推进下一步（交互式引导） | `boolean` | — |
| `append-to` | 挂载点：`body` 或 CSS 选择器（整个浮层移入目标容器） | `string` | — |
| `arrow` | 是否显示箭头（布尔，默认 true，`false` 隐藏） | `string` | `true` |
| `auto-reposition` | 滚动/resize 时自动重定位（默认 true） | `string` | `true` |
| `close-icon` | 自定义关闭按钮内容（HTML 字符串） | `string` | — |
| `close-on-press-escape` | Esc 关闭（默认 true） | `string` | `true` |
| `current` | 当前步骤索引 | `string` | `0` |
| `disabled-interaction` | 禁止高亮区交互（拦截层覆盖目标） | — | — |
| `dont-show-again` | 「不再显示」开关（布尔；关闭时勾选则记忆到 localStorage） | `boolean` | — |
| `finish-button-props` | 完成按钮透传属性（JSON 对象） | — | — |
| `gap` | 高亮内边距：数字（padding px）或 `{"padding","radius"}`（半径）；默认 padding 4 | `string` | — |
| `hide-counter` | 隐藏步骤计数 | `boolean` | — |
| `hide-next` | 隐藏下一步按钮 | — | — |
| `hide-prev` | 隐藏上一步按钮 | — | — |
| `hide-skip` | 隐藏跳过按钮 | — | — |
| `hints` | hints 信标模式：JSON `[{id,selector,title,description,placement,dismissable}]`，常驻脉冲点，点击弹气泡，`dismissable` 关闭后记忆 | `string` | `[]` |
| `indicators` | 计数样式：`dots`（默认）/ `number` / `none` | `string` | `dots` |
| `keyboard` | 键盘 ←/→ 推进步骤（默认 true，`false` 关闭） | `string` | `true` |
| `lock-scroll` | 引导期间锁定页面滚动（关闭恢复） | `boolean` | — |
| `mask` | 遮罩开关/定制：`false` 关闭（非模态）或 `{"color","style"}` 定制颜色样式（默认 true）；step 级可覆盖 | `string` | `true` |
| `mask-click-behavior` | 遮罩点击行为：`close`（默认）/ `next`（推进）/ `none`（忽略） | `string` | `close` |
| `mode` | 弹层模式：`popup`（默认）/ `dialog`（无目标居中对话框）；step 级可覆盖 | `string` | `popup` |
| `next-button-props` | 下一步按钮透传属性（JSON 对象，如 `{"data-x":"1"}`） | — | — |
| `open` | 开始引导（布尔属性，存在即启动） | `boolean` | — |
| `persist` | 多页引导：open/current 状态持久化到 localStorage，重新连接时恢复 | `boolean` | — |
| `placement` | 弹层方位：12 向（top/bottom/left/right × start/end/center）+ `center`（空 target 居中）；默认 `bottom`；空间不足自动翻转；step 级可覆盖 | `TourPlacement` | `bottom` |
| `prev-button-props` | 上一步按钮透传属性（JSON 对象） | — | — |
| `progress-text` | 进度文本模板：`{{current}}/{{total}}` 替换；设置后计数区用模板渲染 | `string` | — |
| `scroll-into-view-options` | 滚动到目标的 `scrollIntoView` options（JSON，默认 `{"behavior":"smooth","block":"center"}`） | `string` | — |
| `scroll-padding` | 滚动到目标时的留白（px，写目标 scroll-margin） | — | — |
| `show-bullets` | 圆点指示器（点击圆点跳步） | `boolean` | — |
| `show-close` | 显示关闭按钮（默认 true，`false` 隐藏） | `string` | `true` |
| `show-progress` | 弹层顶部进度条（宽度随步骤推进） | `boolean` | — |
| `skip-button-props` | 跳过按钮透传属性（JSON 对象） | — | — |
| `skip-missing-element` | 目标缺失/等待超时跳过该步骤（默认停在当前步骤） | `boolean` | — |
| `steps` | 步骤 JSON（`TourStep[] \| string`）；property 赋值支持函数/元素 target | `TourStep[] \| string` | `[]` |
| `storage-key` | localStorage 记忆键（`dont-show-again` / `persist` / hint dismiss 共用） | `string` | `oas-tour-dismiss` |
| `target-area-clickable` | 高亮区可交互（拦截层隐藏，点击穿透目标） | `string` | `false` |
| `type` | 弹层类型：`default` / `primary`（主色底弹层，非模态场景强调） | `string` | `default` |
| `typewriter` | 打字机动画：描述逐字显示 | `string` | `false` |
| `typewriter-speed` | 打字机速率（ms/字符，默认 20） | `string` | `20` |
| `wait-for-element` | 等待目标出现（毫秒，异步步骤；全局默认，step 级 `waitForElement` 优先） | — | — |
| `z-index` | 遮罩层级（默认 `--oas-z-modal`） | — | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-cancel` | 跳过 / Esc / 遮罩点击关闭，`detail: { index, total, source }`（source: skip/esc/close/mask） |
| `oas-close` | 点击关闭按钮，`detail: { index, total }` |
| `oas-destroy` | 引导关闭（含外部移除 open），`detail: { index, total }` |
| `oas-dismiss` | 「不再显示」命中，引导启动被拦截，`detail: {}` |
| `oas-finish` | 最后一步点击「完成」，`detail: { index, total }` |
| `oas-highlight-end` | 步骤高亮完成，`detail: { index, total }` |
| `oas-highlight-start` | 步骤高亮开始（异步等待命中后），`detail: { index, total }` |
| `oas-skip` | 点击「跳过」按钮，`detail: { index, total }` |
| `oas-step` | 步骤切换，`detail: { index, current, total, next, prev }` |

### 插槽

| 名称 | 说明 |
| --- | --- |
| `cover` | 步骤封面富内容（插槽优先于 step.cover 图片） |

遮罩高亮目标，`role="dialog"` + `aria-modal="true"`；支持「上一步 / 下一步 / 跳过」、键盘 ←/→ 与 Esc。
