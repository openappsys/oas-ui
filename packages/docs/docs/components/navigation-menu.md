# NavigationMenu 多级导航

网站式多级导航栏：顶级触发器悬停/点击打开统一视口面板（大面板多列链接卡），支持延迟开合、受控打开项、键盘导航，`href` 叶子项渲染为链接。

## 基础用法（大面板）

<DemoBlock title="基础用法">
  <oas-navigation-menu keep-mounted id="nav-basic" onoas-select="navLog(event)" onoas-change="navChange(event)" items='[{"label":"产品","value":"products","children":[{"label":"组件","value":"components","href":"/components","icon":"grid","description":"30+ 开箱即用组件"},{"label":"文档","value":"docs","href":"/docs","icon":"book","description":"完整 API 文档与指南"},{"label":"更多","value":"more","children":[{"label":"博客","value":"blog","href":"/blog"},{"label":"社区","value":"community","href":"/community"}]}]},{"label":"定价","value":"pricing","href":"/pricing"},{"label":"关于","value":"about","href":"/about"}]'></oas-navigation-menu>
  <oas-tag id="nav-result" type="info">尚未选择</oas-tag>
</DemoBlock>

## 受控打开（value + oas-change）

<DemoBlock title="受控打开">
  <oas-button-group>
    <oas-button id="nav-open-a" size="small">打开产品</oas-button>
    <oas-button id="nav-open-b" size="small">打开资源</oas-button>
    <oas-button id="nav-close" size="small">关闭</oas-button>
  </oas-button-group>
  <br />
  <oas-navigation-menu id="nav-controlled" value="products" onoas-change="navControlled(event)" items='[{"label":"产品","value":"products","children":[{"label":"组件","value":"components","href":"/components","icon":"grid","description":"30+ 开箱即用组件"},{"label":"文档","value":"docs","href":"/docs","icon":"book","description":"完整 API 文档与指南"}]},{"label":"资源","value":"resources","children":[{"label":"主题","value":"themes","href":"/themes","icon":"star","description":"主题定制与令牌"},{"label":"指南","value":"guide","href":"/guide","icon":"mail","description":"上手与最佳实践"}]},{"label":"定价","value":"pricing","href":"/pricing"}]'></oas-navigation-menu>
  <oas-tag id="nav-controlled-result" type="info">当前打开：products</oas-tag>
</DemoBlock>

## 延迟开合

<DemoBlock title="延迟开合">
  <oas-navigation-menu delay-duration="300" skip-delay-duration="500" items='[{"label":"产品","value":"products","children":[{"label":"组件","value":"components","href":"/components","description":"30+ 组件"},{"label":"文档","value":"docs","href":"/docs","description":"API 文档"}]},{"label":"资源","value":"resources","children":[{"label":"主题","value":"themes","href":"/themes","description":"主题定制"},{"label":"指南","value":"guide","href":"/guide","description":"上手指南"}]}]'></oas-navigation-menu>
</DemoBlock>

## 垂直方向

<DemoBlock title="垂直方向">
  <oas-navigation-menu orientation="vertical" items='[{"label":"产品","value":"products","children":[{"label":"组件","value":"components","href":"/components","icon":"grid","description":"30+ 组件"},{"label":"文档","value":"docs","href":"/docs","icon":"book","description":"API 文档"}]},{"label":"定价","value":"pricing","href":"/pricing"},{"label":"关于","value":"about","href":"/about"}]'></oas-navigation-menu>
</DemoBlock>

## 多列网格

<DemoBlock title="多列网格（columns=3）">
  <oas-navigation-menu columns="3" items='[{"label":"产品","value":"products","children":[{"label":"组件","value":"components","href":"/components","icon":"grid","description":"30+ 组件"},{"label":"文档","value":"docs","href":"/docs","icon":"book","description":"API 文档"},{"label":"主题","value":"themes","href":"/themes","icon":"star","description":"主题定制"},{"label":"指南","value":"guide","href":"/guide","icon":"mail","description":"上手实践"},{"label":"博客","value":"blog","href":"/blog","icon":"edit","description":"技术博客"},{"label":"社区","value":"community","href":"/community","icon":"user","description":"用户社区"}]}]'></oas-navigation-menu>
</DemoBlock>

## 遮罩 + 保挂载 + 箭头

<DemoBlock title="遮罩 + 保挂载 + 箭头">
  <oas-navigation-menu backdrop keep-mounted arrow items='[{"label":"产品","value":"products","children":[{"label":"组件","value":"components","href":"/components","icon":"grid","description":"30+ 组件"},{"label":"文档","value":"docs","href":"/docs","icon":"book","description":"API 文档"}]}]'></oas-navigation-menu>
  <p class="demo-tip">backdrop 打开时显示遮罩；keep-mounted 关闭后保留面板 DOM；arrow 显示指向箭头。</p>
</DemoBlock>

## 禁用项

<DemoBlock title="禁用项">
  <oas-navigation-menu items='[{"label":"首页","value":"home","href":"/"},{"label":"产品","value":"products","children":[{"label":"组件","value":"components","href":"/components"},{"label":"文档","value":"docs","href":"/docs","disabled":true}]}]'></oas-navigation-menu>
</DemoBlock>

## 箭头跟随触发器

弹出层箭头默认停在不指向任何触发器；打开面板后箭头位置由 JS 按当前触发器的位置/宽度写入，切换触发器时箭头跟随移动。

<DemoBlock title="箭头跟随触发器">
  <oas-navigation-menu id="nav-arrow" delay-duration="0" items='[{"label":"产品","value":"products","children":[{"label":"组件","value":"components","href":"/components"},{"label":"文档","value":"docs","href":"/docs"}]},{"label":"资源","value":"resources","children":[{"label":"主题","value":"themes","href":"/themes"},{"label":"指南","value":"guide","href":"/guide"}]},{"label":"定价","value":"pricing","href":"/pricing"}]'></oas-navigation-menu>
  <p class="demo-tip">依次悬停/点击「产品」「资源」：箭头跟随指向打开的触发器。</p>
</DemoBlock>

## 窄视口碰撞翻转

面板宽于剩余视口时自动处理碰撞：右缘溢出改为右对齐（不越出视口），下缘不足向上弹；空间充足时保持正常位置。

<DemoBlock title="窄容器碰撞翻转">
  <div style="width: 260px">
    <oas-navigation-menu id="nav-flip" delay-duration="0" loop="false" items='[{"label":"产品","value":"products","children":[{"label":"组件库","value":"components","href":"/components","description":"30+ 开箱即用组件"},{"label":"设计规范","value":"design","href":"/design","description":"视觉语言与令牌"},{"label":"主题定制","value":"theming","href":"/theming","description":"三层层级令牌"}]}]'></oas-navigation-menu>
  </div>
  <p class="demo-tip">容器宽 260px：面板右侧放不下时 right 对齐，仍完整落在容器/视口内。</p>
</DemoBlock>

## Sub 二级级联

面板项带 `sub` 字段（二级导航数据）时渲染「二级触发器」，点击在面板内打开覆盖式二级面板（slide-in 级联动画）：`Esc` / `←` 逐层回退到主面板（焦点回触发器），再 `Esc` 关闭整个面板；`↓` 在二级链接间移动、跳过禁用项，`Enter` 选择。与 inline section 折叠并存（`sub` 优先于 `children`）。

<DemoBlock title="Sub 二级级联">
  <oas-navigation-menu id="nav-sub" delay-duration="0" onoas-select="navSubLog(event)" items='[{"label":"产品","value":"products","children":[{"label":"组件","value":"components","href":"/components","icon":"grid","description":"30+ 开箱即用组件"},{"label":"学习中心","value":"learn","sub":[{"label":"文档","value":"docs","href":"/docs"},{"label":"教程","value":"tutorial","href":"/tutorial"},{"label":"社区","value":"community","href":"/community"},{"label":"案例","value":"showcase","href":"/showcase"}]}]},{"label":"定价","value":"pricing","href":"/pricing"}]'></oas-navigation-menu>
  <oas-tag id="nav-sub-result" type="info">点「学习中心」在面板内展开二级导航</oas-tag>
</DemoBlock>

## 营销位插槽（panel-footer）

`slot="panel-footer"` 在面板底部渲染营销位容器（CTA 卡片等），有内容才显示；与面板联动打开，`--vp-h` 高度过渡自动把营销位计入。

<DemoBlock title="panel-footer 营销位插槽">
  <oas-navigation-menu id="nav-footer" delay-duration="0" items='[{"label":"产品","value":"products","children":[{"label":"组件","value":"components","href":"/components","icon":"grid","description":"30+ 开箱即用组件"},{"label":"文档","value":"docs","href":"/docs","icon":"book","description":"完整 API 文档与指南"}]}]'>
    <div slot="panel-footer" style="display: flex; gap: 12px; align-items: center; justify-content: space-between">
      <span style="font-size: var(--oas-font-size-sm); color: var(--oas-color-text-secondary)">想先聊聊需求？</span>
      <oas-button size="small" type="primary">预约演示</oas-button>
    </div>
  </oas-navigation-menu>
  <p class="demo-tip">面板底部出现营销区（仅在有内容时渲染）。</p>
</DemoBlock>

## 子元素声明式通道

除 `items` JSON 外，可用 `<oas-navigation-menu-item>` 子元素声明式书写（`items` 属性**显式设置时优先**）。默认插槽文本为 label；属性对齐 `NavItem`/`MenuItem` 标量字段（`value`/`href`/`target`/`icon`/`description`/`active`/`disabled` 等）。直接子项默认递归为 `children`（面板内 inline 二级子导航）；带 `sub` 属性的项其子项解析为面板内覆盖式二级导航；`<oas-navigation-menu-group>` 为分组载体（`type: "group"` 语义，组内子项平铺进网格）。子元素增删、属性与文本变化会自动重渲染。

<DemoBlock title="子元素基础">
  <oas-navigation-menu id="nav-child" delay-duration="0" onoas-select="navChildLog(event)">
    <oas-navigation-menu-item value="products">产品
      <oas-navigation-menu-item value="components" href="/components" icon="star" description="30+ 开箱即用组件">组件</oas-navigation-menu-item>
      <oas-navigation-menu-item value="docs" href="/docs" icon="book" description="完整 API 文档与指南">文档</oas-navigation-menu-item>
    </oas-navigation-menu-item>
    <oas-navigation-menu-item value="pricing" href="/pricing">定价</oas-navigation-menu-item>
    <oas-navigation-menu-item value="about" href="/about">关于</oas-navigation-menu-item>
  </oas-navigation-menu>
  <oas-tag id="nav-child-result" type="info">尚未选择</oas-tag>
</DemoBlock>

<DemoBlock title="二级级联（sub）与分组（group）">
  <oas-navigation-menu id="nav-child-sub" delay-duration="0">
    <oas-navigation-menu-item value="products">产品
      <oas-navigation-menu-group>
        <oas-navigation-menu-item value="components" href="/components" icon="star" description="30+ 组件">组件</oas-navigation-menu-item>
        <oas-navigation-menu-item value="themes" href="/themes" icon="heart" description="主题定制与令牌">主题</oas-navigation-menu-item>
      </oas-navigation-menu-group>
      <oas-navigation-menu-item value="learn" sub>学习中心
        <oas-navigation-menu-item value="docs" href="/docs">文档</oas-navigation-menu-item>
        <oas-navigation-menu-item value="tutorial" href="/tutorial">教程</oas-navigation-menu-item>
      </oas-navigation-menu-item>
    </oas-navigation-menu-item>
  </oas-navigation-menu>
  <p class="demo-tip">带 `sub` 属性的项：子项渲染为面板内覆盖式二级导航；分组载体内的子项平铺进网格。</p>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  window.navLog = (e) => {
    const tag = document.getElementById('nav-result')
    if (tag) tag.textContent = `已选择：${e.detail.value}`
  }
  window.navChange = (e) => {
    const tag = document.getElementById('nav-result')
    if (tag) tag.textContent = `已选择：${e.detail.value || '（关闭）'}`
  }
  window.navControlled = (e) => {
    const tag = document.getElementById('nav-controlled-result')
    if (tag) tag.textContent = `当前打开：${e.detail.value || '（关闭）'}`
  }
  window.navSubLog = (e) => {
    const tag = document.getElementById('nav-sub-result')
    if (tag) tag.textContent = `已选择：${e.detail.value}`
  }
  window.navChildLog = (e) => {
    const tag = document.getElementById('nav-child-result')
    if (tag) tag.textContent = `已选择：${e.detail.value}`
  }
  const controlled = document.getElementById('nav-controlled')
  const setOpen = (v) => controlled && controlled.setAttribute('value', v)
  document.getElementById('nav-open-a')?.addEventListener('click', () => setOpen('products'))
  document.getElementById('nav-open-b')?.addEventListener('click', () => setOpen('resources'))
  document.getElementById('nav-close')?.addEventListener('click', () => setOpen(''))
})
</script>

## API

### oas-navigation-menu

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `arrow` | 弹出层指向箭头，默认显示；`arrow="false"` 隐藏 | `string` | `true` |
| `backdrop` | 打开时显示遮罩（点击遮罩关闭） | `boolean` | — |
| `columns` | 面板网格列数，默认 2（大面板多列链接卡） | `string` | `2` |
| `delay-duration` | hover 开合延迟（毫秒），默认 200；点击/键盘立即生效不受影响 | `string` | `200` |
| `items` | 导航项 JSON（层级结构；叶子项可带 `description` 描述与 `icon` 图标渲染大面板链接卡） | `string` | `[]` |
| `keep-mounted` | 关闭时保留面板 DOM 不销毁（供爬虫索引/SEO） | `boolean` | — |
| `loop` | 顶级方向键循环导航开关，缺省 `true`（边界循环）；显式 `loop="false"` 时边界停止（与 menubar 对齐） | `string` | — |
| `orientation` | 布局方向：`horizontal`（默认）/ `vertical`（面板在触发器右侧） | `string` | `horizontal` |
| `skip-delay-duration` | 跳过延迟窗口（毫秒），默认 300：关闭后窗口内再次 hover 其他项直接打开跳过延迟 | `string` | `300` |
| `value` | 受控打开项（顶级触发器 value，空字符串 = 关闭；存在时打开态以属性为准，交互仅派发 `oas-change` 由宿主更新） | `string` | — |

| 事件 | 说明 |
| --- | --- |
| `oas-change` | 打开项变化，`detail: { value }`（value 为打开的顶级项 value，空字符串 = 关闭） |
| `oas-select` | 选择某项（顶级叶子链接、面板链接卡或二级子导航链接），`detail: { value }` |

| 名称 | 说明 |
| --- | --- |
| `panel-footer` | 面板底部营销位插槽：`<div slot="panel-footer">`（CTA 卡片等）有内容时面板底部渲染插槽容器 |

### oas-navigation-menu-item

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `active` | 当前页标记：链接渲染 `aria-current="page"`（顶级与面板链接均生效） | — | — |
| `danger` | 破坏性项（红色语义） | — | — |
| `description` | 链接卡描述：大面板形态下渲染在标题下方 | — | — |
| `disabled` | 禁用：渲染 aria-disabled，禁点（点击/键盘/hover 均拦截） | — | — |
| `href` | 链接地址：带 href 的叶子项渲染为 `<a>`（顶级与面板链接卡均生效） | — | — |
| `icon` | 图标名（`@oas-ui/icons` 注册表图标名）：面板链接卡图标 | — | — |
| `kind` | 叶子项语义：`radio`（默认）/ `action` / `checkbox` | — | — |
| `loading` | 加载中：禁点，由数据驱动恢复 | — | — |
| `rel` | 链接 rel（自定义，如 `noopener`） | — | — |
| `sub` | 布尔：存在时其直接子项解析为 `sub`（面板内覆盖式二级导航）；否则递归为 `children`（inline 二级子导航） | — | — |
| `target` | 链接打开方式（如 `_blank`） | — | — |
| `value` | 选中值（必须）：顶级触发器与面板项的 value，open/select/键盘都依赖 | — | — |

| 名称 | 说明 |
| --- | --- |
| 默认 | 导航项 label 内容（默认插槽文本；直接子项/分组载体不计入） |

### oas-navigation-menu-group

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `label` | 分组标题（可选；本组件面板渲染不展示分组标题，仅承载数据，与 JSON 通道 `type: "group"` 字段一致） | — | — |

| 名称 | 说明 |
| --- | --- |
| 默认 | 组内导航项（`oas-navigation-menu-item` 子元素，面板渲染时平铺进网格） |

`NavItem` 字段（继承 `MenuItem`）：

| 字段          | 说明                                                | 类型      |
| ------------- | --------------------------------------------------- | --------- |
| `label`       | 导航文字                                            | `string`  |
| `value`       | 选中值                                              | `string`  |
| `href`        | 链接地址（可选）；叶子项带 href 渲染为 `<a>` 可跳转  | `string`  |
| `target`      | 链接打开方式（可选）                                | `string`  |
| `icon`        | 图标名（可选）；面板链接卡图标                      | `string`  |
| `description` | 链接卡描述（可选）；大面板形态下渲染在标题下方      | `string`  |
| `active`      | 当前页标记（可选）；链接渲染 `aria-current="page"`  | `boolean` |
| `disabled`    | 禁用                                              | `boolean` |
| `children`    | 子导航项（可选）；有 children 的顶级项打开大面板，面板内渲染 inline 二级子导航 | `NavItem[]` |

交互：悬停（延迟 `delay-duration` 后）/ 点击顶级触发器打开统一视口面板；点击面板链接卡选择并派发 `oas-select`；打开项变化派发 `oas-change`。外部点击关闭；`Esc` 关闭面板；`←`/`→`（垂直 `↑`/`↓`）顶级切换、`↓`（垂直 `→`）打开面板聚焦首项、面板内 `↓`/`↑` 移动、`→` 展开 inline 二级子导航、`Enter` 选择；面板打开时 `Tab` 在面板项间循环（焦点陷阱）。
