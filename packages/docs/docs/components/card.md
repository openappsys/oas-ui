# Card 卡片

用于承载一组相关内容的信息容器。

## 基础用法

<DemoBlock title="基础卡片">
  <div style="width: 100%">
    <oas-card title="项目概览">
      <p>这是一张基础卡片，展示一组摘要信息。</p>
      <p>内容区支持任意自定义结构。</p>
    </oas-card>
  </div>
</DemoBlock>

## 无标题

<DemoBlock title="无标题卡片">
  <div style="width: 100%">
    <oas-card>
      <p>省略 <code>title</code> 属性时，仅保留内容区。</p>
    </oas-card>
  </div>
</DemoBlock>

## 可悬浮

<DemoBlock title="悬浮阴影">
  <div style="width: 100%">
    <oas-card title="悬浮卡片" hoverable>
      <p>将鼠标移入卡片，可看到阴影过渡效果。</p>
    </oas-card>
  </div>
</DemoBlock>

## 扩展区

<DemoBlock title="带操作扩展区">
  <div style="width: 100%">
    <oas-card title="权限管理">
      <p>通过 <code>extra</code> 插槽在标题右侧放置操作。</p>
      <oas-button slot="extra" size="small">新建</oas-button>
    </oas-card>
  </div>
</DemoBlock>

## 封面图

`cover-src` 属性或 `cover` 插槽可在卡片顶部放一张全宽封面图（object-fit: cover 自适应裁切）。

<DemoBlock title="cover-src 封面图">
  <div style="width: 320px">
    <oas-card title="城市骑行" cover-src="https://picsum.photos/seed/isui-card-cover/640/360" cover-alt="沿江骑行照片">
      <p style="color: var(--oas-color-text-secondary); margin: 0;">沿江 15 公里休闲骑行线路，周末出发正合适。</p>
    </oas-card>
  </div>
</DemoBlock>

<DemoBlock title="cover 插槽自定义封面">
  <div style="width: 320px">
    <oas-card title="山景徒步">
      <svg slot="cover" viewBox="0 0 400 180" preserveAspectRatio="none" style="width:100%; height:150px; display:block;"><defs><linearGradient id="ccg1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0b6cff"/><stop offset="1" stop-color="#0891b2"/></linearGradient></defs><rect width="400" height="180" fill="url(#ccg1)"/><text x="200" y="100" font-size="22" text-anchor="middle" fill="#fff" font-family="sans-serif">封面图</text></svg>
      <p style="color: var(--oas-color-text-secondary); margin: 0;">周末两日轻装徒步路线推荐，无需露营装备。</p>
    </oas-card>
  </div>
</DemoBlock>

## 封面 + 操作区（商品卡）

底部 `actions` 插槽放按钮组，上方自动带分隔线。

<DemoBlock title="商品卡">
  <div style="width: 320px">
    <oas-card title="无线降噪耳机" hoverable cover-src="https://picsum.photos/seed/isui-card-product/640/360" cover-alt="耳机产品图">
      <p style="color: var(--oas-color-text-secondary); margin: 0;">主动降噪 · 30 小时续航 · 蓝牙 5.3</p>
      <p style="color: var(--oas-color-primary); font-weight: 600; margin: var(--oas-space-2) 0 0;">¥ 899</p>
      <oas-button slot="actions" size="small">查看详情</oas-button>
      <oas-button slot="actions" size="small" type="primary">加入购物车</oas-button>
    </oas-card>
  </div>
</DemoBlock>

## 可点击（clickable）

`clickable` 整卡可点：可聚焦、Enter/Space 触发 `oas-click`，焦点环随键盘聚焦出现。点击操作区内的按钮不会触发整卡点击。

<DemoBlock title="可点击卡片">
  <div style="width: 320px">
    <oas-card clickable title="项目概览" hoverable>
      <p style="color: var(--oas-color-text-secondary); margin: 0;">点击整卡或按 Enter/Space 触发 oas-click。</p>
    </oas-card>
  </div>
</DemoBlock>

<DemoBlock title="可点击 + 操作区互不干扰">
  <div style="width: 320px">
    <oas-card clickable title="协作项目" cover-src="https://picsum.photos/seed/isui-card-team/640/360" cover-alt="团队协作插画">
      <p style="color: var(--oas-color-text-secondary); margin: 0;">点卡片主体触发整卡点击；点右下按钮走各自操作。</p>
      <oas-button slot="actions" size="small">邀请成员</oas-button>
      <oas-button slot="actions" size="small" type="danger">归档</oas-button>
    </oas-card>
  </div>
</DemoBlock>

## 可选中卡（selectable）

`selectable` 让整卡可点选切换选中态——适合图片/标题/描述/操作区俱全的大卡片做多选。选中态为 primary 描边 + 浅 primary 底 + 右上勾选角标；点击卡内的按钮/链接等交互元素不会触发选中；键盘 Space/Enter 同样生效。

单卡语义为 `role="checkbox"`（`aria-checked` 同步）；**多卡组场景**宿主可在卡片上挂 `role="radio"`（组件不覆盖宿主显式角色）并自行管理互斥选中。

宿主不设 `selected` 时组件内部切换并反射属性（非受控）；设了 `selected` 即受控——组件只派发 `oas-change`（detail 为 `{ selected }`，切换后的新状态），选中态由宿主监听回写。`loading` 骨架态不可选；与 `href` 同设时点选优先于跳转（卡内显式链接/按钮仍走各自操作）。

<DemoBlock title="多选卡（非受控）">
  <div style="width: 100%;">
    <p id="card-select-count" style="margin: 0 0 var(--oas-space-3); color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm);">已选 0 项</p>
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--oas-space-4);">
      <oas-card selectable hoverable title="方案 A">
        <p style="color: var(--oas-color-text-secondary); margin: 0;">轻量起步，适合小团队验证想法。</p>
        <oas-button slot="actions" size="small">查看详情</oas-button>
      </oas-card>
      <oas-card selectable hoverable title="方案 B">
        <p style="color: var(--oas-color-text-secondary); margin: 0;">标准协作套件，含自动化工作流。</p>
        <oas-button slot="actions" size="small">查看详情</oas-button>
      </oas-card>
      <oas-card selectable hoverable title="方案 C">
        <p style="color: var(--oas-color-text-secondary); margin: 0;">企业级管控，私有部署与审计。</p>
        <oas-button slot="actions" size="small">查看详情</oas-button>
      </oas-card>
    </div>
  </div>
</DemoBlock>

<DemoBlock title="受控单选卡组（宿主回写 oas-change）">
  <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--oas-space-4); width: 100%;">
    <oas-card data-select-radio selectable role="radio" title="基础版" selected>
      <p style="color: var(--oas-color-text-secondary); margin: 0;">5 人以内 · 基础看板</p>
    </oas-card>
    <oas-card data-select-radio selectable role="radio" title="专业版">
      <p style="color: var(--oas-color-text-secondary); margin: 0;">不限人数 · 自动化流程</p>
    </oas-card>
    <oas-card data-select-radio selectable role="radio" title="旗舰版">
      <p style="color: var(--oas-color-text-secondary); margin: 0;">私有部署 · 审计日志</p>
    </oas-card>
  </div>
</DemoBlock>



`loading` 时内容区切换为骨架占位（微光动画），正文隐藏；宿主同步 `aria-busy`。

<DemoBlock title="加载骨架">
  <div style="width: 320px">
    <oas-card id="card-loading" title="数据加载中" loading>
      <p style="margin: 0;">数据加载完成后展示正文。</p>
    </oas-card>
    <oas-button id="card-loading-toggle" size="small" style="margin-top: var(--oas-space-3)">切换 loading</oas-button>
  </div>
</DemoBlock>

## 紧凑尺寸（size）

`size="small"` 收紧内边距与标题字号，适合信息密度高的列表场景；默认 `medium`。

<DemoBlock title="size=small 紧凑卡片">
  <div style="width: 320px">
    <oas-card size="small" title="紧凑卡片">
      <p style="color: var(--oas-color-text-secondary); margin: 0;">更小的内边距与标题字号。</p>
      <oas-button slot="actions" size="small">查看</oas-button>
    </oas-card>
  </div>
</DemoBlock>

## 无边框形态（variant）

`variant="borderless"` 去掉容器描边，适合嵌套在卡片内做设置分组；默认 `outlined`。

<DemoBlock title="无边框嵌套（设置面板）">
  <div style="width: 100%">
    <oas-card title="通知设置">
      <div style="display: grid; gap: var(--oas-space-2);">
        <oas-card variant="borderless" size="small" title="站内通知">
          <p style="color: var(--oas-color-text-secondary); margin: 0;">接收被提及、指派与评论回复的提醒。</p>
        </oas-card>
        <oas-divider></oas-divider>
        <oas-card variant="borderless" size="small" title="邮件 Digest">
          <p style="color: var(--oas-color-text-secondary); margin: 0;">每周一汇总发送项目动态摘要。</p>
        </oas-card>
      </div>
    </oas-card>
  </div>
</DemoBlock>

## 底条（footer）

`footer` 插槽是独立于操作区的任意底栏：放补充说明、元信息；`actions` 仍是按钮操作区。

<DemoBlock title="footer 底条 + actions 操作区">
  <div style="width: 320px">
    <oas-card title="服务协议更新">
      <p style="color: var(--oas-color-text-secondary); margin: 0;">我们更新了数据处理条款，请确认后继续。</p>
      <oas-button slot="actions" size="small" type="primary">同意并继续</oas-button>
      <p slot="footer" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: 0;">更新于 2026-09-01 · 适用于全部工作区</p>
    </oas-card>
  </div>
</DemoBlock>

## 标题分割线（header-bordered）

标题区底部分割线默认显示；`header-bordered="false"` 关闭。

<DemoBlock title="header-bordered=false">
  <div style="display: grid; gap: var(--oas-space-3); width: 100%;">
    <oas-card title="默认：带分割线">
      <p style="color: var(--oas-color-text-secondary); margin: 0;">标题与内容之间保留分隔线。</p>
    </oas-card>
    <oas-card title="关闭分割线" header-bordered="false">
      <p style="color: var(--oas-color-text-secondary); margin: 0;">标题紧贴内容，适合轻量分组。</p>
    </oas-card>
  </div>
</DemoBlock>

## 阴影三态（shadow）

`shadow="none | hover | always"`：悬浮阴影、常显阴影或无阴影。`hoverable` 布尔等价于 `shadow="hover"`（旧用法保持兼容）；显式 `shadow` 声明优先于 `hoverable`。

<DemoBlock title="shadow=always 常显阴影">
  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--oas-space-4); width: 100%;">
    <oas-card shadow="always" title="常显阴影">
      <p style="color: var(--oas-color-text-secondary); margin: 0;">阴影始终存在，突出层级。</p>
    </oas-card>
    <oas-card shadow="hover" title="悬浮阴影">
      <p style="color: var(--oas-color-text-secondary); margin: 0;">移入时阴影 + 上浮（hoverable 同款）。</p>
    </oas-card>
  </div>
</DemoBlock>

## 用户卡（Meta）

`slot="avatar"` 在标题左侧放头像；`description` 属性（或 `slot="description"`）在标题下方放一行次级小字。两者任一在场时，标题区自动变为「头像 + 标题 + 副文案」形态。

<DemoBlock title="Meta 用户卡">
  <div style="width: 360px">
    <oas-card description="前端工程师 · 上海">
      <oas-avatar slot="avatar" src="https://picsum.photos/seed/isui-card-meta/160" size="48" alt="成员头像"></oas-avatar>
      <span slot="title">林晓</span>
      <oas-button slot="extra" size="small">关注</oas-button>
      <p style="color: var(--oas-color-text-secondary); margin: 0;">负责组件库架构与渲染性能优化，最近在研究 SSR 水合。</p>
      <div slot="footer">
        <oas-tag size="small">组件</oas-tag>
        <oas-tag size="small">性能</oas-tag>
      </div>
    </oas-card>
  </div>
</DemoBlock>

## 链接卡（href）

`clickable` + `href` 时整卡语义为链接：内部锚点承载地址，焦点与键盘 Enter 都由锚点原生支持；`target` 一并透传。点击卡片内嵌的按钮/链接仍走各自操作，不会误触发整卡跳转。

<DemoBlock title="href 链接卡">
  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--oas-space-4); width: 100%;">
    <oas-card href="#card-link-anchor" title="组件设计规范" shadow="hover">
      <p style="color: var(--oas-color-text-secondary); margin: 0;">点击卡片任意处跳转（键盘 Enter 同样生效）。</p>
    </oas-card>
    <oas-card href="https://example.com" target="_blank" title="外部链接" shadow="hover">
      <p style="color: var(--oas-color-text-secondary); margin: 0;">新标签页打开，带 target 透传。</p>
    </oas-card>
  </div>
  <span id="card-link-anchor"></span>
</DemoBlock>

## 组合：标签页

卡片内可以组合其他组件，例如 `oas-tabs` 做「设置中心」式分区。

<DemoBlock title="卡片内嵌标签页">
  <div style="width: 100%">
    <oas-card title="项目设置">
      <oas-tabs active="general">
        <oas-tab-panel label="通用" value="general">
          <p style="margin: 0;">项目名称、可见范围与默认语言。</p>
        </oas-tab-panel>
        <oas-tab-panel label="成员" value="members">
          <p style="margin: 0;">邀请成员并按角色分配权限。</p>
        </oas-tab-panel>
        <oas-tab-panel label="高级" value="advanced">
          <p style="margin: 0;">归档策略、Webhook 与 API 访问令牌。</p>
        </oas-tab-panel>
      </oas-tabs>
    </oas-card>
  </div>
</DemoBlock>

## 栅格卡

宿主 grid 均分卡内块：卡片只负责容器，布局交给宿主 CSS grid。

<DemoBlock title="栅格均分">
  <div style="width: 100%">
    <oas-card title="季度概览">
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--oas-space-4); text-align: center;">
        <div>
          <p style="font-size: var(--oas-font-size-xl); font-weight: 600; margin: 0;">32</p>
          <p style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: var(--oas-space-1) 0 0;">进行中项目</p>
        </div>
        <div>
          <p style="font-size: var(--oas-font-size-xl); font-weight: 600; margin: 0;">18</p>
          <p style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: var(--oas-space-1) 0 0;">已完成交付</p>
        </div>
        <div>
          <p style="font-size: var(--oas-font-size-xl); font-weight: 600; margin: 0;">96%</p>
          <p style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: var(--oas-space-1) 0 0;">按期率</p>
        </div>
      </div>
    </oas-card>
  </div>
</DemoBlock>

## 看板卡

与 `oas-statistic` 组合成数据看板。

<DemoBlock title="统计看板">
  <div style="width: 100%">
    <oas-card title="实时看板">
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--oas-space-4);">
        <div>
          <p style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: 0 0 var(--oas-space-1);">今日访问量</p>
          <oas-statistic value="12893"></oas-statistic>
        </div>
        <div>
          <p style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: 0 0 var(--oas-space-1);">错误率</p>
          <oas-statistic value="0.42" precision="2" suffix="%"></oas-statistic>
        </div>
        <div>
          <p style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: 0 0 var(--oas-space-1);">在线会话</p>
          <oas-statistic value="864"></oas-statistic>
        </div>
      </div>
    </oas-card>
  </div>
</DemoBlock>

## 电商图卡

封面图 + 价格区 + 操作区 + 底条的典型商品卡组合。

<DemoBlock title="电商商品卡">
  <div style="width: 320px">
    <oas-card hoverable cover-src="https://picsum.photos/seed/isui-card-keyboard/640/360" cover-alt="便携机械键盘产品图">
      <span slot="title">便携机械键盘</span>
      <p style="margin: 0;">
        <span style="color: var(--oas-color-primary); font-weight: 600; font-size: var(--oas-font-size-lg);">¥ 429</span>
        <s style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin-left: var(--oas-space-2);">¥ 599</s>
      </p>
      <p style="color: var(--oas-color-text-secondary); margin: var(--oas-space-1) 0 0;">三模连接 · 热插拔 · Gasket 结构</p>
      <oas-button slot="actions" size="small" type="primary">加入购物车</oas-button>
      <oas-button slot="actions" size="small">收藏</oas-button>
      <p slot="footer" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: 0;">满 299 包邮 · 7 天无理由退换</p>
    </oas-card>
  </div>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  const { message } = await import('@oas-ui/ui')
  window.message = message
  document.addEventListener('oas-click', (e) => {
    // 排除按钮自身的 oas-click，只响应卡片整卡点击
    if (!(e.target instanceof HTMLElement)) return
    if (e.target.tagName !== 'OAS-CARD') return
    const title = e.target.getAttribute('title') || '卡片'
    window.message?.info(`点击了卡片「${title}」`)
  })
  // whenDefined 守卫：升级前 expando 遮蔽 setter（preview 构建实抓坑），
  // 等 oas-card/oas-button 升级后再挂属性/事件
  await Promise.all([
    customElements.whenDefined('oas-card'),
    customElements.whenDefined('oas-button'),
  ])
  const loadingCard = document.querySelector('#card-loading')
  const loadingToggle = document.querySelector('#card-loading-toggle')
  loadingToggle?.addEventListener('oas-click', () => {
    loadingCard?.toggleAttribute('loading')
  })

  // selectable 多选：oas-change 可见反馈 + 已选计数（反射发生在事件派发后，计数延迟一拍）
  const selectCount = document.querySelector('#card-select-count')
  const refreshSelectCount = () => {
    if (!selectCount) return
    const n = document.querySelectorAll('oas-card[selectable][selected]').length
    selectCount.textContent = `已选 ${n} 项`
  }
  document.addEventListener('oas-change', (e) => {
    if (!(e.target instanceof HTMLElement)) return
    if (e.target.tagName !== 'OAS-CARD' || !e.target.hasAttribute('selectable')) return
    if (e.target.hasAttribute('data-select-radio')) return
    const selected = (e as CustomEvent).detail.selected as boolean
    const title =
      e.target.shadowRoot?.querySelector('[part="title"]')?.textContent || '卡片'
    window.message?.[selected ? 'success' : 'info'](`${selected ? '已选中' : '已取消'}「${title}」`)
    setTimeout(refreshSelectCount, 0)
  })

  // selectable 受控单选卡组：组件只派发事件，互斥选中由宿主回写（role=radio 语义）
  const radioCards = document.querySelectorAll('[data-select-radio]')
  radioCards.forEach((card) => {
    card.addEventListener('oas-change', (e) => {
      if (!(e as CustomEvent).detail.selected) return
      radioCards.forEach((c) => c.removeAttribute('selected'))
      card.setAttribute('selected', '')
    })
  })
})
</script>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `clickable` | 整卡可点（focusable，点击/Enter/Space 派发 `oas-click`） | `boolean` | — |
| `cover-alt` | 封面图 alt 文本（无障碍） | `string` | — |
| `cover-src` | 封面图 URL，置于卡片顶部（object-fit: cover 自适应裁切） | `string` | — |
| `description` | Meta 副文（title 下方弱化小字；与 description 插槽双通道，slot 优先） | `string` | — |
| `header-bordered` | 头部分割线（默认 true；`"false"` 关闭） | — | — |
| `hoverable` | 是否开启悬浮阴影（阴影 + 上浮提升 + 指针） | `boolean` | — |
| `href` | 链接卡：整卡语义为链接（内部锚点包装，键盘/中键原生可达） | `string` | — |
| `loading` | 加载态：内容区切骨架占位（aria-busy 同步） | `boolean` | — |
| `selectable` | 可选中卡：点击整卡（或 Enter/Space）切换选中态，派发 `oas-change`；卡内按钮/链接等交互元素不触发选中；与 `href` 同设时点选优先、不跳转；loading 骨架态不可选 | `boolean` | — |
| `selected` | 选中态（配合 `selectable`）：宿主设置即为受控——组件只派发 `oas-change` 不自改属性，宿主监听回写；未设置时组件内部切换并反射该属性（非受控） | `boolean` | — |
| `shadow` | 阴影三态：`none` / `hover`（悬停浮起）/ `always`（常显）；`hoverable` 映射 `hover`，显式 shadow 优先 | `string` | — |
| `size` | 尺寸档位：`small`（紧凑 padding、标题降档）/ `medium`（默认） | — | — |
| `target` | 链接卡打开目标（配合 href，如 `_blank`） | `string` | — |
| `title` | 卡片标题（渲染进可见标题区；读取后即从宿主移除，不残留原生悬浮提示；清空传空串）；富内容用 slot="title" | `string` | — |
| `variant` | 形态：`outlined`（默认，带描边）/ `borderless`（无边框嵌入形态） | — | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-change` | 选中态切换（`selectable` 时），detail 为 `{ selected }`（切换后的新状态） |
| `oas-click` | 整卡点击（`clickable` 时），detail 含 originalEvent |

### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | 卡片内容 |
| `actions` | 底部操作区（查看/编辑/删除等按钮组），上方带分隔线 |
| `avatar` | Meta 头像位（header 左置，配合 description 成「头像+标题+副文」形态） |
| `cover` | 自定义封面内容（与 `cover-src` 二选一，`cover-src` 优先） |
| `description` | Meta 副文富内容（与 description 属性互斥，slot 优先） |
| `extra` | 标题右侧扩展区 |
| `footer` | 独立底条（与 actions 操作区分离） |
| `title` | 标题富内容插槽，有内容时覆盖 title 属性文案 |
