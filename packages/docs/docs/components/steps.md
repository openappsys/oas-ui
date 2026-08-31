# Steps 步骤条

引导用户按流程完成任务的步骤指示器，支持等待 / 进行中 / 完成 / 错误四种状态、纵向排布与可点击跳转。

## 基础用法

<DemoBlock title="进行中">
  <oas-steps current="1" steps='[{"title":"创建订单","description":"填写订单信息"},{"title":"确认支付","description":"选择支付方式"},{"title":"完成发货","description":"等待收货"}]'></oas-steps>
</DemoBlock>

## 完成态

<DemoBlock title="全部完成">
  <oas-steps current="3" steps='[{"title":"创建订单"},{"title":"确认支付"},{"title":"完成发货"}]'></oas-steps>
</DemoBlock>

## 初始步骤

<DemoBlock title="初始等待">
  <oas-steps current="0" steps='[{"title":"第一步"},{"title":"第二步"},{"title":"第三步"}]'></oas-steps>
</DemoBlock>

## 四种状态

通过每步的 `status` 字段显式指定状态：`wait` 等待（次要色 + 序号）、`process` 进行中（主色 + 序号）、`finish` 完成（成功色 + ✓）、`error` 错误（危险色 + ✕）。

<DemoBlock title="wait / process / finish / error">
  <oas-steps steps='[{"title":"等待中","description":"尚未开始","status":"wait"},{"title":"进行中","description":"正在处理","status":"process"},{"title":"已完成","description":"处理成功","status":"finish"},{"title":"出错","description":"处理失败","status":"error"}]'></oas-steps>
</DemoBlock>

## 可点击切换

`clickable` 开启后步骤项可点击跳转（整项可点，Enter/Space 键盘可达），点击派发 `oas-change`（detail 为 `{ index }`）并切换当前步。

<DemoBlock title="点击步骤切换当前步">
  <oas-steps clickable current="1" onoas-change="message.info('切换到第 ' + (event.detail.index + 1) + ' 步')" steps='[{"title":"创建订单","description":"填写订单信息"},{"title":"确认支付","description":"选择支付方式"},{"title":"完成发货","description":"等待收货"}]'></oas-steps>
</DemoBlock>

## 带图标步骤

通过每步的 `icon` 字段（`iconRegistry` 键）在指示器位置渲染图标，显式 `icon` 优先于状态默认图标（序号 / ✓ / ✕）；`icon` 无匹配时不渲染，回落状态默认图标。

<DemoBlock title="图标步骤">
  <oas-steps current="1" steps='[{"title":"创建订单","description":"填写订单信息","icon":"edit"},{"title":"确认支付","description":"选择支付方式","icon":"check-circle"},{"title":"完成发货","description":"等待收货","icon":"download"}]'></oas-steps>
</DemoBlock>

## 线性模式

`linear` 开启后（配合 `clickable`/`navigation`）仅允许点击 `index <= current` 的步骤：已过步骤可回跳、当前步可停留，未来步骤禁点且点击静默（不派发 `oas-change`）。

<DemoBlock title="线性模式（禁跳步）">
  <oas-steps linear clickable current="1" onoas-change="message.info('切换到第 ' + (event.detail.index + 1) + ' 步')" steps='[{"title":"创建订单","description":"填写订单信息"},{"title":"确认支付","description":"选择支付方式"},{"title":"完成发货","description":"等待收货"}]'></oas-steps>
</DemoBlock>

## 标签横排

`label-placement="horizontal"` 将标题与图标同行排布（图标左、标题右），连接线对准图标中心；默认 `vertical` 保持图标在上、标题在下。

<DemoBlock title="标签横排">
  <oas-steps label-placement="horizontal" current="1" steps='[{"title":"创建订单","description":"填写订单信息"},{"title":"确认支付","description":"选择支付方式"},{"title":"完成发货","description":"等待收货"}]'></oas-steps>
</DemoBlock>

## 禁用步骤

通过每步的 `disabled` 字段禁用步骤：`clickable`/`navigation` 下禁点（无按钮语义、键盘跳过）、视觉弱化（弱化色 token）；显式 `status` 仍正常显示。

<DemoBlock title="禁用步骤">
  <oas-steps clickable current="1" onoas-change="message.info('切换到第 ' + (event.detail.index + 1) + ' 步')" steps='[{"title":"创建订单","description":"填写订单信息"},{"title":"确认支付","description":"选择支付方式"},{"title":"完成发货","description":"等待收货","disabled":true}]'></oas-steps>
</DemoBlock>

## 点状步骤

`progress-dot` 将步骤指示器切换为圆点（当前步圆点放大并带柔光晕），连线为细线；配合 `clickable` 圆点可点击跳转（含键盘）。

<DemoBlock title="点状步骤">
  <oas-steps progress-dot clickable current="1" onoas-change="message.info('切换到第 ' + (event.detail.index + 1) + ' 步')" steps='[{"title":"创建订单"},{"title":"确认支付"},{"title":"完成发货"}]'></oas-steps>
</DemoBlock>

## 导航模式

`navigation` 将步骤切换为箭头导航条：当前步骤主色高亮、前序步骤浅主色、等待步骤灰色，描述隐藏；步骤项隐式可点（无需 `clickable`）。底部提供「上一步 / 下一步」按钮（首步/末步对应禁用），点击步骤或按钮都会派发 `oas-change`（detail 为 `{ index }`）并切换当前步。

<DemoBlock title="导航模式（上一步 / 下一步）">
  <oas-steps navigation current="1" onoas-change="message.info('当前步骤：第 ' + (event.detail.index + 1) + ' 步')" steps='[{"title":"填写资料"},{"title":"确认信息"},{"title":"提交完成"}]'></oas-steps>
</DemoBlock>

## 无描述

<DemoBlock title="仅标题">
  <oas-steps current="1" steps='[{"title":"注册"},{"title":"实名认证"},{"title":"开通完成"}]'></oas-steps>
</DemoBlock>

## 纵向

<DemoBlock title="纵向方向">
  <div style="width: 260px">
    <oas-steps direction="vertical" current="1" steps='[{"title":"填写资料","description":"基本信息与联系方式"},{"title":"上传证件","description":"身份证正反面"},{"title":"审核通过","description":"等待管理员审核"}]'></oas-steps>
  </div>
</DemoBlock>

## 容器状态

`status` 属性（`wait` / `process` / `finish` / `error`）覆盖 `current` 推导的「当前步」状态，适合「全流程标错 / 当前步完成」等容器级场景；每步显式 `status` 仍最高优先。

<DemoBlock title="容器 status 覆盖当前步">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-tag type="danger">容器 status="error"：当前步变为错误态</oas-tag>
    <oas-steps status="error" current="1" steps='[{"title":"创建订单","description":"填写订单信息"},{"title":"确认支付","description":"支付网关异常"},{"title":"完成发货","description":"等待收货"}]'></oas-steps>
    <oas-tag type="success">容器 status="finish"：当前步变为完成态</oas-tag>
    <oas-steps status="finish" current="1" steps='[{"title":"创建订单"},{"title":"确认支付"},{"title":"完成发货"}]'></oas-steps>
  </oas-space>
</DemoBlock>

## 操作提示

每步的 `extra` 字段在描述下方渲染一行弱化小字操作提示（`textContent` 渲染，禁 HTML 注入）。

<DemoBlock title="extra 操作提示">
  <oas-steps current="1" steps='[{"title":"上传证件","description":"身份证正反面","extra":"仅支持 jpg/png，小于 5MB"},{"title":"人脸核验","description":"保持光线充足","extra":"需开启摄像头权限"},{"title":"审核通过","description":"等待管理员审核","extra":"通常 1 个工作日内"}]'></oas-steps>
</DemoBlock>

## 步骤标识回传

每步的 `id` 字段随 `oas-change` 事件回传（`detail: { index, id? }`）；未设置 `id` 时 detail 保持 `{ index }`（向后兼容）。

<DemoBlock title="oas-change 回传 id">
  <oas-steps id="steps-id" clickable current="1" steps='[{"title":"创建订单","id":"create","description":"填写订单信息"},{"title":"确认支付","id":"pay","description":"选择支付方式"},{"title":"完成发货","id":"ship","description":"等待收货"}]'></oas-steps>
  <oas-tag type="info" id="steps-id-info">点击步骤查看回传 id</oas-tag>
</DemoBlock>

## 跳步拦截

`oas-before-change` 事件（cancelable）：点击可点击步骤、键盘 Enter/Space 或导航上一步/下一步按钮跳步前派发，`detail: { index }`；宿主 `preventDefault()` 可取消本次跳转。适合「有未保存修改时阻止跳步」场景。

<DemoBlock title="oas-before-change 拦截">
  <oas-checkbox id="steps-guard">有未保存修改（勾选后跳步被拦截）</oas-checkbox>
  <oas-steps id="steps-before" clickable current="1" style="margin-top: 12px" steps='[{"title":"创建订单","description":"填写订单信息"},{"title":"确认支付","description":"选择支付方式"},{"title":"完成发货","description":"等待收货"}]'></oas-steps>
</DemoBlock>

## 加载中

每步的 `loading` 字段在指示器位置显示 CSS 旋转圈（走 token），显式 `icon` / 序号 / 进度环让位 loading。

<DemoBlock title="loading 步骤">
  <oas-steps current="1" steps='[{"title":"提交订单","status":"finish"},{"title":"等待支付","loading":true,"description":"支付网关处理中"},{"title":"完成发货","description":"等待收货"}]'></oas-steps>
</DemoBlock>

## 可选步骤

每步的 `optional` 字段在标题旁渲染弱化「可选」文案（走 i18n：中文「可选」/ 英文「Optional」，随 locale 切换）。

<DemoBlock title="optional 可选标记">
  <oas-steps current="1" steps='[{"title":"填写资料","optional":true,"description":"基本信息与联系方式"},{"title":"上传证件","description":"身份证正反面"},{"title":"绑定银行卡","optional":true,"description":"可稍后绑定"}]'></oas-steps>
</DemoBlock>

## 无连接线

`lineless` 隐藏全部连接线（紧凑形态，保留指示器与状态色）。

<DemoBlock title="lineless 无连接线">
  <oas-steps lineless current="1" steps='[{"title":"创建订单"},{"title":"确认支付"},{"title":"完成发货"}]'></oas-steps>
</DemoBlock>

## 紧凑模式

`simple` 紧凑模式：单行小尺寸（指示器缩小、描述隐藏、连接线贴紧），与 `progress-dot` / `navigation` 互斥（simple 优先）。

<DemoBlock title="simple 紧凑模式">
  <oas-steps simple clickable current="1" onoas-change="message.info('切换到第 ' + (event.detail.index + 1) + ' 步')" steps='[{"title":"创建订单"},{"title":"确认支付"},{"title":"完成发货"}]'></oas-steps>
</DemoBlock>

## 连接线形态

`separator` 控制连接线形态：`line`（默认实线）/ `dashed`（虚线）/ `arrow`（末端箭头三角）。

<DemoBlock title="separator 三形态">
  <oas-space direction="vertical" size="large" style="width: 100%">
    <oas-steps separator="dashed" current="1" steps='[{"title":"创建订单","description":"填写订单信息"},{"title":"确认支付","description":"选择支付方式"},{"title":"完成发货","description":"等待收货"}]'></oas-steps>
    <oas-steps separator="arrow" current="1" steps='[{"title":"创建订单","description":"填写订单信息"},{"title":"确认支付","description":"选择支付方式"},{"title":"完成发货","description":"等待收货"}]'></oas-steps>
  </oas-space>
</DemoBlock>

## 进度环

每步的 `percent`（0-100）仅在 `process` 步生效：指示器显示进度圆环（SVG circle stroke-dasharray，走 token），序号让位；非 process 步忽略。

<DemoBlock title="percent 进度环">
  <oas-steps current="1" steps='[{"title":"下载资源","status":"finish"},{"title":"处理数据","percent":65,"description":"正在处理 65%"},{"title":"完成","description":"等待处理结果"}]'></oas-steps>
</DemoBlock>

## 窄屏自动纵向

`responsive` 开启后，容器宽度小于 640px 时自动按纵向布局渲染（ResizeObserver 监听，断连自动清理）；显式 `direction` 设置时 responsive 优先，`navigation` 强制横向保持不变。

<DemoBlock title="responsive 窄屏转纵向">
  <div style="width: 100%; min-width: 280px; max-width: 100%; overflow: auto; resize: horizontal; padding: 8px 0">
    <oas-steps responsive current="1" steps='[{"title":"创建订单","description":"填写订单信息"},{"title":"确认支付","description":"选择支付方式"},{"title":"完成发货","description":"等待收货"}]'></oas-steps>
  </div>
  <p style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-xs)">拖动容器右下角缩放到 640px 以下，步骤自动转为纵向布局。</p>
</DemoBlock>

## 自定义编号

每步的 `prefix` 字段在指示器位渲染自定义编号文本（如「A」「01」）替代默认序号；优先级：显式 `icon` > `prefix` > 默认序号；`finish` / `error` 的 ✓/✕ 不受影响（`textContent` 渲染，禁 HTML 注入）。

<DemoBlock title="prefix 自定义编号">
  <oas-steps current="1" steps='[{"title":"创建订单","prefix":"01","description":"填写订单信息"},{"title":"确认支付","prefix":"02","description":"选择支付方式"},{"title":"完成发货","prefix":"03","description":"等待收货"}]'></oas-steps>
  <oas-steps style="margin-top: 16px" current="1" steps='[{"title":"资料填写","prefix":"A"},{"title":"实名认证","prefix":"B"},{"title":"开通完成","prefix":"C"}]'></oas-steps>
</DemoBlock>

## 中段折叠

`max-count`（最小 2）限制可见步骤数：超出时中段折叠为「省略步」（⋯，不可点、连接线连续），首步、末步与当前步恒可见，窗口随 `current` 平移；非法值 / 小于 2 忽略（全量显示）。

<DemoBlock title="max-count 折叠（点击步骤观察窗口平移）">
  <oas-steps clickable max-count="5" current="0" onoas-change="message.info('切换到第 ' + (event.detail.index + 1) + ' 步')" steps='[{"title":"S1"},{"title":"S2"},{"title":"S3"},{"title":"S4"},{"title":"S5"},{"title":"S6"},{"title":"S7"},{"title":"S8"},{"title":"S9"},{"title":"S10"}]'></oas-steps>
</DemoBlock>

## 倒序

`reverse` 视觉倒序（横向 `row-reverse` / 纵向 `column-reverse`）：编号显示 = 总数 - index（视觉流向递增）；状态推导仍按 `steps` 数组序，`oas-change` 回传数组 `index` 不变。

<DemoBlock title="reverse 倒序（横向 / 纵向）">
  <oas-steps reverse current="1" steps='[{"title":"创建订单","description":"填写订单信息"},{"title":"确认支付","description":"选择支付方式"},{"title":"完成发货","description":"等待收货"}]'></oas-steps>
  <div style="width: 260px; margin-top: 16px">
    <oas-steps reverse direction="vertical" current="1" steps='[{"title":"填写资料","description":"基本信息与联系方式"},{"title":"上传证件","description":"身份证正反面"},{"title":"审核通过","description":"等待管理员审核"}]'></oas-steps>
  </div>
</DemoBlock>

## 内容右侧

`content-placement="right"`（横向模式，默认 `bottom`）将标题 / 描述 / 提示整体置于指示器右侧；纵向忽略（纵向本身即图标左 / 内容右）；与 `label-placement` 正交。

<DemoBlock title="content-placement 内容右侧">
  <oas-steps content-placement="right" current="1" steps='[{"title":"创建订单","description":"填写订单信息"},{"title":"确认支付","description":"选择支付方式","extra":"支持多种支付渠道"},{"title":"完成发货","description":"等待收货"}]'></oas-steps>
</DemoBlock>

## 箭头分格

`arrow` 箭头分格形态（横向专用）：每项 `clip-path` 箭头分格（首项平头、相邻凹凸衔接），激活主色填充 / 完成浅主色 / 等待灰；连接线隐藏（分格自衔接）；与 `simple` 互斥（simple 优先）、`navigation` 下忽略。

<DemoBlock title="arrow 箭头分格（含 error 态）">
  <oas-steps arrow clickable current="1" onoas-change="message.info('切换到第 ' + (event.detail.index + 1) + ' 步')" steps='[{"title":"创建订单","description":"填写订单信息"},{"title":"确认支付","description":"选择支付方式"},{"title":"人工审核","description":"风控复核"},{"title":"完成发货","description":"等待收货"}]'></oas-steps>
  <oas-steps style="margin-top: 16px" arrow reverse current="2" steps='[{"title":"创建订单"},{"title":"确认支付"},{"title":"完成发货"}]'></oas-steps>
</DemoBlock>

## 箭头分格自定义

`arrow` 分格的几何与配色均走 CSS 变量开口：`--oas-steps-arrow-gap` 控制分格块间距（设 `0` 时凹凸互嵌贴边，相邻块靠颜色区分）、`--oas-steps-arrow` 控制凸尖水平深度（深度越大凸尖越钝、夹角越小）、`--oas-steps-arrow-item-bg-N`（N=1..8）逐格覆盖背景色（按 DOM 位置生效，未设回落状态色；超过 8 步回落状态色）。

<DemoBlock title="自定义间距与每块颜色（gap 0 互嵌贴边）">
  <oas-steps arrow style="--oas-steps-arrow-gap: 0px; --oas-steps-arrow-item-bg-1: color-mix(in srgb, var(--oas-color-primary) 20%, transparent); --oas-steps-arrow-item-bg-2: color-mix(in srgb, var(--oas-color-success) 20%, transparent); --oas-steps-arrow-item-bg-3: color-mix(in srgb, var(--oas-color-warning) 20%, transparent); --oas-steps-arrow-item-bg-4: color-mix(in srgb, var(--oas-color-danger) 20%, transparent)" steps='[{"title":"主色格","status":"wait"},{"title":"成功格","status":"wait"},{"title":"警告格","status":"wait"},{"title":"危险格","status":"wait"}]'></oas-steps>
</DemoBlock>

<DemoBlock title="自定义间距（gap 大于 0，块间留空隙）">
  <oas-steps arrow clickable current="1" style="--oas-steps-arrow-gap: 16px" steps='[{"title":"创建订单","description":"填写订单信息"},{"title":"确认支付","description":"选择支付方式"},{"title":"完成发货","description":"等待收货"}]'></oas-steps>
</DemoBlock>

<DemoBlock title="箭头深度 / 角度对比">
  <oas-space direction="vertical" size="large" style="width: 100%">
    <oas-steps arrow current="1" steps='[{"title":"默认深度 10px"},{"title":"确认支付"},{"title":"完成发货"}]'></oas-steps>
    <oas-steps arrow style="--oas-steps-arrow: 16px" current="1" steps='[{"title":"加深 16px（凸尖更钝）"},{"title":"确认支付"},{"title":"完成发货"}]'></oas-steps>
  </oas-space>
</DemoBlock>

## 形态组合

组合语义：`simple` 优先于 `progress-dot` / `navigation`（simple 下点状与导航形态让位）；`navigation` 下 `responsive` 转纵向忽略（导航强制横向的现状保持）。

<DemoBlock title="组合：simple + progress-dot">
  <oas-steps simple progress-dot current="1" steps='[{"title":"创建订单"},{"title":"确认支付"},{"title":"完成发货"}]'></oas-steps>
</DemoBlock>

<DemoBlock title="组合：navigation + responsive（窄屏仍强制横向）">
  <div style="width: 380px">
    <oas-steps navigation responsive current="1" steps='[{"title":"填写资料"},{"title":"确认信息"},{"title":"提交完成"}]'></oas-steps>
  </div>
</DemoBlock>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `arrow` | 箭头分格形态（横向专用）：每项 clip-path 箭头分格（首项平头、相邻凹凸衔接），激活主色填充 / 完成浅主色 / 等待灰，连接线隐藏（布尔，存在即开启；与 simple 互斥，simple 优先；navigation 下忽略） | `boolean` | — |
| `clickable` | 步骤可点击跳转（布尔，存在即开启） | `boolean` | — |
| `content-placement` | 内容块位置：`bottom`（默认，标题/描述在指示器下方）/ `right`（整体置于指示器右侧，横向模式）；纵向忽略；与 label-placement 正交 | `string` | — |
| `current` | 当前步骤索引（0 起） | `string` | `0` |
| `direction` | 方向（导航模式下强制横向；responsive 窄屏时优先转纵向） | `string` | `horizontal` |
| `label-placement` | 标签排布：`vertical`（默认，图标上/标题下）/ `horizontal`（图标左/标题右同行） | `string` | — |
| `linear` | 线性模式：仅允许点击 `index <= current` 的步骤（布尔，存在即开启；未来步禁点，点击静默） | `boolean` | — |
| `lineless` | 隐藏全部连接线（布尔，存在即开启；紧凑形态） | `boolean` | — |
| `max-count` | 可见步骤数上限（最小 2）：超出时中段折叠为省略步（⋯，不可点、连接线连续），首/末/当前步恒可见，窗口随 current 平移；非法值 / 小于 2 忽略（全量显示） | `string` | — |
| `navigation` | 导航模式：箭头导航条 + 底部上一步/下一步按钮（布尔，存在即开启；与 simple 互斥，simple 优先） | `boolean` | — |
| `progress-dot` | 点状步骤：指示器为圆点、连线为细线（布尔，存在即开启；与 simple 互斥，simple 优先） | `boolean` | — |
| `responsive` | 窄屏自动纵向：容器宽度 < 640px 时按 vertical 布局渲染（布尔，存在即开启；ResizeObserver 监听，断连自动清理；navigation 下忽略） | `boolean` | — |
| `reverse` | 视觉倒序：横向 `row-reverse` / 纵向 `column-reverse`；编号显示 = 总数 - index（视觉流向递增），状态推导仍按 steps 数组序（布尔，存在即开启） | `boolean` | — |
| `separator` | 连接线形态：`line`（默认）/ `dashed`（虚线）/ `arrow`（末端三角）；navigation / arrow 下不生效 | `string` | — |
| `simple` | 紧凑模式：单行小尺寸（指示器缩小、描述隐藏、连接线贴紧）（布尔，存在即开启；优先于 progress-dot/navigation） | `boolean` | — |
| `status` | 容器级状态覆盖当前步（`wait` / `process` / `finish` / `error`）；每步显式 `status` 仍最高优先 | `StepStatus` | — |
| `steps` | `[{ title, description?, status?, icon?, disabled?, extra?, id?, loading?, optional?, percent?, prefix? }]` JSON 字符串 | `StepItem[] \| string` | `[]` |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-before-change` | 跳步前派发（cancelable，`detail: { index }`）；宿主 `preventDefault()` 可取消本次跳转（步骤点击/键盘/导航按钮均生效） |
| `oas-change` | 点击可点击步骤或导航按钮时触发（含键盘触发）；`detail: { index, id? }`（0 起，`id` 为步骤 `id` 字段回传，未设置时保持 `{ index }`） |

状态规则：显式 `status`（`wait` / `process` / `finish` / `error`）优先；未指定时按 `current` 推导——索引 `< current` 为 `finish`（✓），`=== current` 为 `process`，其余为 `wait`。

### CSS 变量

| 变量 | 默认 | 说明 |
| --- | --- | --- |
| `--oas-steps-arrow` | `10px` | 箭头分格凸尖水平深度（深度越大凸尖越钝、夹角越小），随 clip-path polygon 联动 |
| `--oas-steps-arrow-gap` | `var(--oas-space-3)` | 分格块间距；设 `0` 时凹凸互嵌贴边（相邻块靠 per-index 颜色区分） |
| `--oas-steps-arrow-item-bg-N`（N=1..8） | 回落状态色（`--oas-steps-item-bg` → `--oas-color-bg-hover`） | 逐格背景色覆盖（按 DOM 位置，非数据索引）；超过 8 步回落状态色 |

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  // id 回传：展示 oas-change detail.id
  const idEl = document.getElementById('steps-id')
  const idInfo = document.getElementById('steps-id-info')
  idEl?.addEventListener('oas-change', (e) => {
    idInfo.textContent = `跳转到「${e.detail.id ?? e.detail.index + 1}」`
    idInfo.setAttribute('type', 'primary')
  })

  // 跳步拦截：勾选守卫后 preventDefault veto 本次跳步
  const guard = document.getElementById('steps-guard')
  const beforeEl = document.getElementById('steps-before')
  beforeEl?.addEventListener('oas-before-change', (e) => {
    if (guard?.checked) {
      e.preventDefault()
      message.warning(`已拦截跳到第 ${e.detail.index + 1} 步（有未保存修改）`)
    }
  })
  beforeEl?.addEventListener('oas-change', () => {
    message.info(`已切换到第 ${beforeEl.getAttribute('current') === null ? 0 : Number(beforeEl.getAttribute('current')) + 1} 步`)
  })
})
</script>
