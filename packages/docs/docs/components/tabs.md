# Tabs 标签页

标签式内容切换，支持键盘方向键导航；未激活面板通过 `hidden` 隐藏。`oas-tabs` + `oas-tab-panel` 配套使用。

## 基础用法

<DemoBlock title="基础用法">
  <oas-tabs active="a">
    <oas-tab-panel label="标签一" value="a"><p>内容一：基础信息展示。</p></oas-tab-panel>
    <oas-tab-panel label="标签二" value="b"><p>内容二：更多详情。</p></oas-tab-panel>
    <oas-tab-panel label="标签三" value="c"><p>内容三：其他补充说明。</p></oas-tab-panel>
  </oas-tabs>
</DemoBlock>

## 默认选中

<DemoBlock title="active 指定">
  <oas-tabs active="c">
    <oas-tab-panel label="标签一" value="a"><p>内容一</p></oas-tab-panel>
    <oas-tab-panel label="标签二" value="b"><p>内容二</p></oas-tab-panel>
    <oas-tab-panel label="标签三" value="c"><p>默认选中内容三</p></oas-tab-panel>
  </oas-tabs>
</DemoBlock>

## 富内容面板

<DemoBlock title="富内容">
  <oas-tabs active="a">
    <oas-tab-panel label="表单" value="a">
      <oas-space direction="vertical" size="small" style="width: 100%">
        <oas-input placeholder="请输入姓名" style="width: 240px"></oas-input>
        <oas-space>
          <oas-button type="primary" size="small">提交</oas-button>
          <oas-button size="small">取消</oas-button>
        </oas-space>
      </oas-space>
    </oas-tab-panel>
    <oas-tab-panel label="列表" value="b">
      <oas-space direction="vertical" size="small" style="width: 100%">
        <oas-tag type="success">已启用</oas-tag>
        <oas-tag>待处理</oas-tag>
      </oas-space>
    </oas-tab-panel>
  </oas-tabs>
</DemoBlock>

## 卡片式

<DemoBlock title="卡片式标签">
  <oas-tabs type="card" active="a">
    <oas-tab-panel label="标签一" value="a"><p>内容一：卡片式标签带边框，激活标签与面板连通，四边有线。</p></oas-tab-panel>
    <oas-tab-panel label="标签二" value="b"><p>内容二：更多详情。</p></oas-tab-panel>
    <oas-tab-panel label="标签三" value="c"><p>内容三：其他补充说明。</p></oas-tab-panel>
  </oas-tabs>
</DemoBlock>

通过 `type="card"` 切换为卡片式：每个标签带独立边框，激活标签底边与面板背景同色（连通无断线），整体四边有线包裹。

## 切换事件

<DemoBlock title="oas-change 事件">
  <oas-tabs id="tabs-demo" active="a">
    <oas-tab-panel label="标签一" value="a"><p>内容一</p></oas-tab-panel>
    <oas-tab-panel label="标签二" value="b"><p>内容二</p></oas-tab-panel>
  </oas-tabs>
</DemoBlock>

<oas-tag type="primary" id="tabs-info">当前激活：a</oas-tag>

## 可关闭

`closable`：每个标签右侧显示关闭 ×（`span[tabindex="-1"]`，读屏经 `aria-label` 命名，Enter / Space 触发关闭）。点击 × 派发 `oas-close`，`detail: { key }`；组件不自动删除面板，交由宿主移除（移除后标签栏增量刷新）。

<DemoBlock title="可关闭标签">
  <oas-tabs id="tabs-closable" closable active="a">
    <oas-tab-panel label="标签一" value="a"><p>内容一</p></oas-tab-panel>
    <oas-tab-panel label="标签二" value="b"><p>内容二</p></oas-tab-panel>
    <oas-tab-panel label="标签三" value="c"><p>内容三</p></oas-tab-panel>
  </oas-tabs>
</DemoBlock>

> 关闭非激活标签：标签立即消失（可见反馈）。关闭激活标签：自动切到剩余第一个标签，并弹出消息提示。

## 右键菜单（新建 + 批量关闭）

`context-menu`：右键任意标签弹出操作菜单——新建 / 关闭 / 关闭其他 / 关闭左侧所有 / 关闭右侧所有 / 关闭全部（新建与关闭族间有分隔线）。新建派发 `oas-add`（与 `addable` 的 + 按钮同一契约，`detail.label` 是 locale 默认产物名，宿主可忽略自行命名——实际场景多为「新建文件」等宿主语义，菜单项文案保持中性「新建」）；关闭类每项按目标集合逐个派发 `oas-close`（`detail: { key }`），宿主按 key 移除对应面板即可（与 `closable` 同一契约）。弹层支持外部点击 / Escape 关闭。

<DemoBlock title="右键批量关闭（context-menu）">
  <oas-tabs id="tabs-contextmenu" closable context-menu active="b">
    <oas-tab-panel label="仪表盘" value="a"><p>仪表盘内容</p></oas-tab-panel>
    <oas-tab-panel label="订单" value="b"><p>订单内容</p></oas-tab-panel>
    <oas-tab-panel label="商品" value="c"><p>商品内容</p></oas-tab-panel>
    <oas-tab-panel label="用户" value="d"><p>用户内容</p></oas-tab-panel>
    <oas-tab-panel label="设置" value="e"><p>设置内容</p></oas-tab-panel>
  </oas-tabs>
</DemoBlock>

> 右键「商品」试试「新建」与「关闭左侧所有」/「关闭其他」——新建派发 `oas-add` 宿主追加面板；关闭按 key 逐个派发 `oas-close`，宿主移除对应面板。

> 宿主可按业务改文案（如「新建文件」）：覆盖 locale 个别键即可——`setLocale({ name: 'zh-CN', messages: { ...zhCN, 'tabs.ctxNew': '新建文件' } })`（从 `@oas-ui/i18n` 导入 `setLocale`/`zhCN`；同名注册即覆盖，只动需要的键）。

## 徽标

`oas-tab-panel` 的 `badge` 属性在标签标题旁渲染徽标（数字或文本）。

<DemoBlock title="带徽标的标签">
  <oas-tabs active="a">
    <oas-tab-panel label="标签一" value="a" badge="3"><p>内容一：徽标展示数量。</p></oas-tab-panel>
    <oas-tab-panel label="标签二" value="b" badge="新"><p>内容二：徽标也可以显示文本。</p></oas-tab-panel>
    <oas-tab-panel label="标签三" value="c"><p>内容三：无徽标。</p></oas-tab-panel>
  </oas-tabs>
</DemoBlock>

## 动态增删标签

`addable`：标签栏末尾显示 + 按钮（`aria-label` 走 locale），点击派发 `oas-add`（`detail: { label }`，默认新标签文案「新标签」走 locale，宿主可直接使用或自定义）。组件不自动新增面板，宿主监听 `oas-add` 追加 `oas-tab-panel` 即可，标签栏增量刷新；配合 `closable` 可同时增删。新增后选中态与键盘焦点（roving tabindex）自动落到新标签；关闭激活标签后焦点落到剩余选中标签。

<DemoBlock title="动态增删标签">
  <oas-tabs id="tabs-editable" addable closable active="a">
    <oas-tab-panel label="标签一" value="a"><p>内容一：点 × 关闭，点 + 新增。</p></oas-tab-panel>
    <oas-tab-panel label="标签二" value="b"><p>内容二：可继续增删。</p></oas-tab-panel>
  </oas-tabs>
</DemoBlock>

## 图标标签

`oas-tab-panel` 的 `icon` 属性：标签标题前渲染图标（复用 `oas-icon` 图标集），图标 + 文字组合。也支持在面板内放一个 `slot="icon"` 的直接子元素作为自定义图标（emoji / SVG 等）。

<DemoBlock title="图标标签">
  <oas-tabs id="tabs-icon" active="a">
    <oas-tab-panel label="收藏" value="a" icon="star"><p>内容一：icon 属性渲染图标。</p></oas-tab-panel>
    <oas-tab-panel label="消息" value="b" icon="mail"><p>内容二：图标 + 文字组合。</p></oas-tab-panel>
    <oas-tab-panel label="搜索" value="c" icon="search"><p>内容三。</p></oas-tab-panel>
    <oas-tab-panel label="自定义" value="d"><span slot="icon">🚀</span><p>内容四：slot="icon" 自定义图标。</p></oas-tab-panel>
  </oas-tabs>
</DemoBlock>

## 标签位置

`tab-position`：`top`（默认，标签横向一排、内容在下方）/ `left`（标签纵排左侧、内容在右）/ `right` / `bottom`。

<DemoBlock title="left 纵向标签">
  <oas-tabs tab-position="left" active="a">
    <oas-tab-panel label="标签一" value="a"><p>内容一：标签纵向排列在左侧，内容在右侧。</p></oas-tab-panel>
    <oas-tab-panel label="标签二" value="b"><p>内容二</p></oas-tab-panel>
    <oas-tab-panel label="标签三" value="c"><p>内容三</p></oas-tab-panel>
  </oas-tabs>
</DemoBlock>

<DemoBlock title="right 纵向标签">
  <oas-tabs tab-position="right" active="a">
    <oas-tab-panel label="标签一" value="a"><p>内容一：标签纵向排列在右侧，内容在左侧。</p></oas-tab-panel>
    <oas-tab-panel label="标签二" value="b"><p>内容二</p></oas-tab-panel>
    <oas-tab-panel label="标签三" value="c"><p>内容三</p></oas-tab-panel>
  </oas-tabs>
</DemoBlock>

<DemoBlock title="bottom 标签在下方">
  <oas-tabs tab-position="bottom" active="a">
    <oas-tab-panel label="标签一" value="a"><p>内容一：标签横向排列在下方，内容在上方。</p></oas-tab-panel>
    <oas-tab-panel label="标签二" value="b"><p>内容二</p></oas-tab-panel>
    <oas-tab-panel label="标签三" value="c"><p>内容三</p></oas-tab-panel>
  </oas-tabs>
</DemoBlock>

## 禁用标签

`oas-tab-panel` 加 `disabled` 禁用单个标签：不可聚焦/不可点、`aria-disabled`、视觉降饱和，键盘方向键自动跳过。

<DemoBlock title="禁用标签">
  <oas-tabs active="a">
    <oas-tab-panel label="可用" value="a"><p>内容一：可正常切换。</p></oas-tab-panel>
    <oas-tab-panel label="已禁用" value="b" disabled><p>内容二：此标签被禁用。</p></oas-tab-panel>
    <oas-tab-panel label="可用" value="c"><p>内容三：方向键会跳过中间的禁用标签。</p></oas-tab-panel>
  </oas-tabs>
</DemoBlock>

## 尺寸档位

`size`：`xs / small / medium（默认）/ large / xl` 五档，字号与内边距随档位变化。

<DemoBlock title="尺寸档位">
  <oas-space direction="vertical" size="large" style="width: 100%">
    <oas-tabs size="small" active="a">
      <oas-tab-panel label="小" value="a"><p>small 档</p></oas-tab-panel>
      <oas-tab-panel label="标签" value="b"><p>内容</p></oas-tab-panel>
    </oas-tabs>
    <oas-tabs size="medium" active="a">
      <oas-tab-panel label="中（默认）" value="a"><p>medium 档</p></oas-tab-panel>
      <oas-tab-panel label="标签" value="b"><p>内容</p></oas-tab-panel>
    </oas-tabs>
    <oas-tabs size="large" active="a">
      <oas-tab-panel label="大" value="a"><p>large 档</p></oas-tab-panel>
      <oas-tab-panel label="标签" value="b"><p>内容</p></oas-tab-panel>
    </oas-tabs>
  </oas-space>
</DemoBlock>

## 居中与均分

`centered`：标签栏整体居中；`justified`：标签均分占满整行宽度。

<DemoBlock title="居中标签">
  <oas-tabs centered active="a">
    <oas-tab-panel label="标签一" value="a"><p>内容一：标签栏居中。</p></oas-tab-panel>
    <oas-tab-panel label="标签二" value="b"><p>内容二</p></oas-tab-panel>
    <oas-tab-panel label="标签三" value="c"><p>内容三</p></oas-tab-panel>
  </oas-tabs>
</DemoBlock>

<DemoBlock title="均分标签">
  <oas-tabs justified active="a">
    <oas-tab-panel label="标签一" value="a"><p>内容一：标签均分占满整行。</p></oas-tab-panel>
    <oas-tab-panel label="标签二" value="b"><p>内容二</p></oas-tab-panel>
    <oas-tab-panel label="标签三" value="c"><p>内容三</p></oas-tab-panel>
  </oas-tabs>
</DemoBlock>

## 溢出滚动

标签过多超出容器宽度时，标签栏自动可横向滚动并显示左右箭头（`tab-position="left/right"` 时为纵向滚动 + 上下箭头），鼠标滚轮也可横向滑动标签。`without-scroll-controls` 可关闭箭头（仅保留滚动）。新增/激活的标签会自动滚动到可见区域（不会在溢出时藏在最右）；`addable` 的 + 按钮固定在标签栏末尾，不随标签滚动被遮挡。

<DemoBlock title="溢出滚动">
  <div style="max-width: 420px">
    <oas-tabs active="t1">
      <oas-tab-panel v-for="i in 12" :key="i" :label="'标签' + i" :value="'t' + i"><p>内容 {{ i }}</p></oas-tab-panel>
    </oas-tabs>
  </div>
</DemoBlock>

<DemoBlock title="关闭滚动箭头">
  <div style="max-width: 420px">
    <oas-tabs without-scroll-controls active="t1">
      <oas-tab-panel v-for="i in 12" :key="i" :label="'标签' + i" :value="'t' + i"><p>内容 {{ i }}</p></oas-tab-panel>
    </oas-tabs>
  </div>
</DemoBlock>

`scroll-position`：激活/新增标签滚动到可见区时的对齐位置——`auto`（默认 nearest，最小滚动）/ `start` / `center` / `end`。

<DemoBlock title="激活滚动居中">
  <div style="max-width: 420px">
    <oas-tabs scroll-position="center" active="t6">
      <oas-tab-panel v-for="i in 12" :key="i" :label="'标签' + i" :value="'t' + i"><p>内容 {{ i }}</p></oas-tab-panel>
    </oas-tabs>
  </div>
</DemoBlock>

## 更多收缩下拉

`more`：溢出时标签栏可横向滚动（滚轮/拖拽），末尾「更多」下拉列出**当前滚动视口之外**的标签作快捷跳转（标签全部渲染不隐藏，通用的滚动+镜像做法）；视口外项较多时下拉顶部带搜索框可实时过滤；点选下拉项平滑滚动到可见区（激活项与相邻项因连续排布自然一起进入视口）。新增/激活的标签会自动平滑滚动到可见区域。

<DemoBlock title="更多收缩下拉">
  <div style="max-width: 380px">
    <oas-tabs more active="t1">
      <oas-tab-panel v-for="i in 12" :key="i" :label="'标签' + i" :value="'t' + i"><p>内容 {{ i }}</p></oas-tab-panel>
    </oas-tabs>
  </div>
</DemoBlock>

## 面板显隐策略

`panel-mode`：`keep`（默认，未激活面板 `hidden` 保留 DOM）/ `lazy`（未访问的面板内容不挂载，首次激活才渲染，之后常驻）/ `destroy`（切换即卸载非激活面板内容）。重内容面板（图表/编辑器）用 lazy/destroy 避免未激活面板持续占用资源。

<DemoBlock title="面板显隐策略">
  <oas-space direction="vertical" size="large" style="width: 100%">
    <oas-tabs panel-mode="lazy" active="a">
      <oas-tab-panel label="懒加载" value="a"><p>lazy：未访问的面板内容暂不挂载。</p></oas-tab-panel>
      <oas-tab-panel label="面板二" value="b"><p>切到我才首次渲染。</p></oas-tab-panel>
    </oas-tabs>
    <oas-tabs panel-mode="destroy" active="a">
      <oas-tab-panel label="切换卸载" value="a"><p>destroy：切走即卸载我的内容。</p></oas-tab-panel>
      <oas-tab-panel label="面板二" value="b"><p>切回时重新挂载。</p></oas-tab-panel>
    </oas-tabs>
  </oas-space>
</DemoBlock>

## 手动激活

`activation="manual"`：方向键只移动焦点不切换面板，Enter / Space 才切换（无障碍手动激活模式，适合面板内容重、切换代价高的场景）。默认 `auto`（方向键立即切换）。

<DemoBlock title="手动激活">
  <oas-tabs activation="manual" active="a">
    <oas-tab-panel label="标签一" value="a"><p>内容一：方向键移动焦点，Enter/Space 才切换。</p></oas-tab-panel>
    <oas-tab-panel label="标签二" value="b"><p>内容二</p></oas-tab-panel>
    <oas-tab-panel label="标签三" value="c"><p>内容三</p></oas-tab-panel>
  </oas-tabs>
</DemoBlock>

## 切换动画

`animated`：标签选中态过渡 + 面板淡入动画（只动 color/border/opacity，不碰 layout）。

<DemoBlock title="切换动画">
  <oas-tabs animated active="a">
    <oas-tab-panel label="标签一" value="a"><p>内容一：切换有过渡动画。</p></oas-tab-panel>
    <oas-tab-panel label="标签二" value="b"><p>内容二</p></oas-tab-panel>
    <oas-tab-panel label="标签三" value="c"><p>内容三</p></oas-tab-panel>
  </oas-tabs>
</DemoBlock>

## 切换前拦截

`oas-before-change` 事件（cancelable）：切换前派发，`detail: { value }`；宿主 `preventDefault()` 可拦截本次切换（点击与键盘均生效）。适合「有未保存修改时阻止切换」场景。

<DemoBlock title="切换前拦截">
  <oas-checkbox id="tabs-guard">有未保存修改（勾选后切换被拦截）</oas-checkbox>
  <oas-tabs id="tabs-before" active="a" style="margin-top: 12px">
    <oas-tab-panel label="表单" value="a"><p>内容一：勾选上方复选框后再切换会被拦截。</p></oas-tab-panel>
    <oas-tab-panel label="列表" value="b"><p>内容二</p></oas-tab-panel>
    <oas-tab-panel label="设置" value="c"><p>内容三</p></oas-tab-panel>
  </oas-tabs>
</DemoBlock>

## 可编辑重命名

`oas-tab-panel` 加 `editable`：双击标签进入输入框编辑态，Enter 确认（派发 `oas-rename`，`detail: { value, label }`，组件自动写回新 label）/ Esc 或失焦取消。

<DemoBlock title="可编辑重命名">
  <oas-tabs id="tabs-rename" active="a">
    <oas-tab-panel label="文档一" value="a" editable><p>内容一：双击我的标签可重命名。</p></oas-tab-panel>
    <oas-tab-panel label="文档二" value="b" editable><p>内容二</p></oas-tab-panel>
    <oas-tab-panel label="不可编辑" value="c"><p>内容三：此标签不可重命名。</p></oas-tab-panel>
  </oas-tabs>
</DemoBlock>

## 拖拽排序

`sortable`：标签可拖拽换位（原生 HTML5 拖拽）。落点后派发 `oas-reorder`，`detail: { fromIndex, toIndex }`；组件不自动移动 DOM，宿主据此重排 `oas-tab-panel` 顺序。

<DemoBlock title="拖拽排序">
  <oas-tabs id="tabs-sortable" sortable active="a">
    <oas-tab-panel label="标签一" value="a"><p>内容一：拖拽标签可换位。</p></oas-tab-panel>
    <oas-tab-panel label="标签二" value="b"><p>内容二</p></oas-tab-panel>
    <oas-tab-panel label="标签三" value="c"><p>内容三</p></oas-tab-panel>
    <oas-tab-panel label="标签四" value="d"><p>内容四</p></oas-tab-panel>
  </oas-tabs>
</DemoBlock>

## 嵌套标签页

`oas-tab-panel` 内可再嵌套 `oas-tabs`，内外层独立管理各自的选中态（外层只识别直接子面板，不抓内层面板）。

<DemoBlock title="嵌套标签页">
  <oas-tabs active="outer-a">
    <oas-tab-panel label="概览" value="outer-a"><p>外层内容：概览。</p></oas-tab-panel>
    <oas-tab-panel label="详情" value="outer-b">
      <oas-tabs active="inner-x" type="card" style="margin-top: 8px">
        <oas-tab-panel label="基本" value="inner-x"><p>内层内容：基本信息。</p></oas-tab-panel>
        <oas-tab-panel label="高级" value="inner-y"><p>内层内容：高级设置。</p></oas-tab-panel>
      </oas-tabs>
    </oas-tab-panel>
  </oas-tabs>
</DemoBlock>

## 自定义标签内容

`oas-tab-panel` 内放一个 `slot="label"` 的直接子元素，可完全自定义标签内容（富文本/图标组合等），fallback 到 `label` 属性纯文本。该元素不被面板默认插槽投影，专供标签位使用。

<DemoBlock title="自定义标签内容">
  <oas-tabs active="a">
    <oas-tab-panel label="普通" value="a"><p>内容一：默认文本标签。</p></oas-tab-panel>
    <oas-tab-panel value="b">
      <span slot="label"><oas-tag type="success" size="small">VIP</oas-tag> 会员</span>
      <p>内容二：自定义富文本标签。</p>
    </oas-tab-panel>
    <oas-tab-panel value="c">
      <span slot="label"><span style="color: var(--oas-color-danger)">●</span> 紧急</span>
      <p>内容三：带状态点的标签。</p>
    </oas-tab-panel>
  </oas-tabs>
</DemoBlock>

## 悬停切换

`trigger="hover"`：悬停标签即切换（默认 `click`）。disabled 标签悬停不触发。

<DemoBlock title="悬停切换">
  <oas-tabs trigger="hover" active="a">
    <oas-tab-panel label="标签一" value="a"><p>内容一：悬停标签即切换。</p></oas-tab-panel>
    <oas-tab-panel label="标签二" value="b"><p>内容二</p></oas-tab-panel>
    <oas-tab-panel label="标签三" value="c"><p>内容三</p></oas-tab-panel>
  </oas-tabs>
</DemoBlock>

## 取消激活

`allow-deactivation`：点击当前激活标签取消其激活（进入无选中态）；默认重复点击已激活标签保持激活。

<DemoBlock title="取消激活">
  <oas-tabs allow-deactivation active="a">
    <oas-tab-panel label="标签一" value="a"><p>内容一：再点一次当前标签可取消激活。</p></oas-tab-panel>
    <oas-tab-panel label="标签二" value="b"><p>内容二</p></oas-tab-panel>
  </oas-tabs>
</DemoBlock>

## 图标堆叠与纯图标

`stacked`：图标在上、文字在下（纵向堆叠）。`icon-only`（oas-tab-panel）：纯图标标签无文字（label 提供 aria-label 兜底可访问名称）。

<DemoBlock title="图标堆叠 + 纯图标">
  <oas-space direction="vertical" size="large" style="width: 100%">
    <oas-tabs stacked active="a">
      <oas-tab-panel label="收藏" value="a" icon="star"><p>内容一：图标上文字下。</p></oas-tab-panel>
      <oas-tab-panel label="消息" value="b" icon="mail"><p>内容二</p></oas-tab-panel>
      <oas-tab-panel label="搜索" value="c" icon="search"><p>内容三</p></oas-tab-panel>
    </oas-tabs>
    <oas-tabs active="a">
      <oas-tab-panel label="收藏" value="a" icon="star" icon-only><p>内容一：纯图标标签（悬停看 tooltip 语义靠 aria-label）。</p></oas-tab-panel>
      <oas-tab-panel label="消息" value="b" icon="mail" icon-only><p>内容二</p></oas-tab-panel>
      <oas-tab-panel label="设置" value="c" icon="gear" icon-only><p>内容三</p></oas-tab-panel>
    </oas-tabs>
  </oas-space>
</DemoBlock>

## 指示线定制

激活指示线（line 模式 ::after）走 CSS 变量开口：`--oas-tabs-indicator-color`（颜色）、`--oas-tabs-indicator-size`（厚度）。`hide-indicator` 直接隐藏指示线。

<DemoBlock title="指示线定制">
  <oas-space direction="vertical" size="large" style="width: 100%">
    <oas-tabs active="a" style="--oas-tabs-indicator-color: var(--oas-color-success); --oas-tabs-indicator-size: 3px">
      <oas-tab-panel label="标签一" value="a"><p>内容一：自定义指示线颜色与厚度。</p></oas-tab-panel>
      <oas-tab-panel label="标签二" value="b"><p>内容二</p></oas-tab-panel>
    </oas-tabs>
    <oas-tabs hide-indicator active="a">
      <oas-tab-panel label="标签一" value="a"><p>内容一：隐藏激活指示线。</p></oas-tab-panel>
      <oas-tab-panel label="标签二" value="b"><p>内容二</p></oas-tab-panel>
    </oas-tabs>
  </oas-space>
</DemoBlock>

## 选中防抖

`reserve-selected-space`：选中标签文字加粗时预载宽度，选中/未选中标签宽度一致、切换不抖动（选中态 font-weight 500 不撑宽）。

<DemoBlock title="选中防抖">
  <oas-tabs reserve-selected-space active="a">
    <oas-tab-panel label="标签一" value="a"><p>内容一：切换标签宽度不抖动。</p></oas-tab-panel>
    <oas-tab-panel label="标签二二" value="b"><p>内容二</p></oas-tab-panel>
    <oas-tab-panel label="标签三三三" value="c"><p>内容三</p></oas-tab-panel>
  </oas-tabs>
</DemoBlock>

## 链接标签

`oas-tab-panel` 设 `href`：该标签渲染为 `<a>` 链接（锚点语义：右键新窗口/中键打开/SEO 可爬），搭配 `target`/`rel`。适合标签即页面路由的场景。

<DemoBlock title="链接标签">
  <oas-tabs active="a">
    <oas-tab-panel label="组件总览" value="a" href="/components/"><p>内容一：我是链接，可右键新窗口打开。</p></oas-tab-panel>
    <oas-tab-panel label="GitHub" value="b" href="https://github.com/openappsys/oas-ui" target="_blank" rel="noopener"><p>内容二：外链新窗口。</p></oas-tab-panel>
    <oas-tab-panel label="普通" value="c"><p>内容三：无 href 仍是普通标签。</p></oas-tab-panel>
  </oas-tabs>
</DemoBlock>

## 纯导航模式

`hide-content`：只渲染标签栏、不渲染面板区——tabs 当导航条用（切换只派发 `oas-change`，内容/路由由宿主接管）。

<DemoBlock title="纯导航模式">
  <oas-tabs hide-content active="a">
    <oas-tab-panel label="首页" value="a"></oas-tab-panel>
    <oas-tab-panel label="文档" value="b"></oas-tab-panel>
    <oas-tab-panel label="设置" value="c"></oas-tab-panel>
  </oas-tabs>
  <p style="color: var(--oas-color-text-secondary); font-size: 13px; margin-top: 8px">上方只有标签栏，无面板区；切换只发事件，内容由宿主接管。</p>
</DemoBlock>

## 数据驱动

`items`：JSON 数组数据驱动渲染（与 `oas-tab-panel` 子元素并存时 items 优先）。每项支持 `label / value / icon / badge / disabled / href / target / rel / closable / editable / iconOnly`。

<DemoBlock title="数据驱动">
  <oas-tabs
    active="home"
    items='[{"label":"首页","value":"home","icon":"star"},{"label":"消息","value":"msg","icon":"mail","badge":"5"},{"label":"文档","value":"doc","href":"/components/"},{"label":"禁用","value":"dis","disabled":true}]'
  ></oas-tabs>
</DemoBlock>


<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  const { message } = await import('@oas-ui/ui')
  const tabs = document.getElementById('tabs-demo')
  const info = document.getElementById('tabs-info')
  tabs?.addEventListener('oas-change', (e) => {
    info.textContent = `当前激活：${e.detail.value}`
  })

  const closableTabs = document.getElementById('tabs-closable')
  closableTabs?.addEventListener('oas-close', (e) => {
    const key = e.detail.key
    message?.info(`关闭标签「${key}」`)
    const target = closableTabs.querySelector(`oas-tab-panel[value="${key}"]`)
    const wasActive = closableTabs.getAttribute('active') === key
    target?.remove()
    if (wasActive) {
      const first = closableTabs.querySelector('oas-tab-panel')
      closableTabs.setAttribute('active', first?.getAttribute('value') ?? '')
    }
  })

  // 动态增删：宿主监听 oas-add 追加面板（label 直接用 e.detail.label，可自定义）；
  // oas-close 关闭面板，激活标签被关闭时切到剩余第一个
  const editable = document.getElementById('tabs-editable')
  let seq = 2
  editable?.addEventListener('oas-add', (e) => {
    const label = `${e.detail.label} ${++seq}`
    const value = `new-${seq}`
    const panel = document.createElement('oas-tab-panel')
    panel.setAttribute('label', label)
    panel.setAttribute('value', value)
    panel.innerHTML = `<p>内容：${label}，可继续增删。</p>`
    editable.appendChild(panel)
    editable.setAttribute('active', value)
    message?.info(`新增标签「${label}」`)
  })
  editable?.addEventListener('oas-close', (e) => {
    const key = e.detail.key
    message?.info(`关闭标签「${key}」`)
    const target = editable.querySelector(`oas-tab-panel[value="${key}"]`)
    const wasActive = editable.getAttribute('active') === key
    target?.remove()
    if (wasActive) {
      const first = editable.querySelector('oas-tab-panel')
      editable.setAttribute('active', first?.getAttribute('value') ?? '')
    }
  })

  // 右键菜单：新建派发 oas-add（宿主追加面板并激活）；关闭按 oas-close 的 key 逐个移除面板（与 closable 同一契约）
  const ctxTabs = document.getElementById('tabs-contextmenu')
  let ctxSeq = 0
  ctxTabs?.addEventListener('oas-add', (e) => {
    ctxSeq += 1
    const value = `new-${ctxSeq}`
    const panel = document.createElement('oas-tab-panel')
    panel.setAttribute('label', `${e.detail.label} ${ctxSeq}`)
    panel.setAttribute('value', value)
    panel.innerHTML = `<p>新建的标签页（${value}）</p>`
    ctxTabs.appendChild(panel)
    ctxTabs.setAttribute('active', value)
    message?.info(`新建标签「${value}」`)
  })
  ctxTabs?.addEventListener('oas-close', (e) => {
    const key = e.detail.key
    message?.info(`关闭标签「${key}」`)
    const target = ctxTabs.querySelector(`oas-tab-panel[value="${key}"]`)
    const wasActive = ctxTabs.getAttribute('active') === key
    target?.remove()
    if (wasActive) {
      const first = ctxTabs.querySelector('oas-tab-panel')
      ctxTabs.setAttribute('active', first?.getAttribute('value') ?? '')
    }
  })

  // 切换前拦截：勾选「有未保存修改」时 veto 切换
  const guard = document.getElementById('tabs-guard')
  const beforeTabs = document.getElementById('tabs-before')
  beforeTabs?.addEventListener('oas-before-change', (e) => {
    if (guard?.hasAttribute('checked')) {
      e.preventDefault()
      message?.warning('有未保存修改，已拦截切换')
    }
  })

  // 重命名：组件已自动写回 label，这里仅提示
  const renameTabs = document.getElementById('tabs-rename')
  renameTabs?.addEventListener('oas-rename', (e) => {
    message?.success(`已重命名为「${e.detail.label}」`)
  })

  // 拖拽排序：宿主据此重排面板顺序
  const sortableTabs = document.getElementById('tabs-sortable')
  sortableTabs?.addEventListener('oas-reorder', (e) => {
    const { fromIndex, toIndex } = e.detail
    const panels = [...sortableTabs.querySelectorAll(':scope > oas-tab-panel')]
    const moved = panels[fromIndex]
    if (!moved) return
    moved.remove()
    const rest = [...sortableTabs.querySelectorAll(':scope > oas-tab-panel')]
    if (toIndex >= rest.length) sortableTabs.appendChild(moved)
    else sortableTabs.insertBefore(moved, rest[toIndex])
    message?.info(`标签从 ${fromIndex + 1} 移到 ${toIndex + 1}`)
  })
})
</script>

## API

### oas-tabs

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `activation` | 键盘激活模式：`auto`（默认，方向键立即切换）/ `manual`（方向键只移焦点，Enter/Space 才切换，a11y 手动激活） | `string` | `auto` |
| `active` | 激活标签的 `value` | `string` | — |
| `addable` | 标签栏末尾显示 + 按钮，点击派发 `oas-add`（组件不自动新增面板） | `boolean` | — |
| `allow-deactivation` | 允许点击当前激活标签取消激活（无选中态）；默认重复点击已激活标签保持激活 | `boolean` | — |
| `animated` | 选中态过渡 + 面板淡入动画（只动 color/border/opacity，不碰 layout） | `boolean` | — |
| `centered` | 标签栏整体居中（横向时） | `boolean` | — |
| `closable` | 每个标签显示关闭 ×，点击派发 `oas-close`（组件不自动删除） | `boolean` | — |
| `context-menu` | 标签右键操作菜单（新建/关闭/关闭其他/关闭左侧所有/关闭右侧所有/关闭全部；新建派发 oas-add，关闭类按目标集合逐个派发 oas-close） | `boolean` | — |
| `hide-content` | 纯导航模式：渲染标签栏但不渲染面板区（tabs 当导航条，宿主接管内容/路由） | `boolean` | — |
| `hide-indicator` | 隐藏激活指示线（line 模式的 ::after 下划线） | `boolean` | — |
| `items` | 数据驱动渲染：JSON 数组 `[{ label, value, icon?, badge?, disabled?, href?, target?, rel?, closable?, editable?, iconOnly? }]`，与 `oas-tab-panel` 子元素并存时 items 优先 | `string` | — |
| `justified` | 标签均分占满标签栏宽度 | `boolean` | — |
| `more` | 溢出收缩为「更多」下拉（替代滚动箭头，二者互斥）；放不下的标签收进下拉，选中项被收起时更多按钮高亮 | `boolean` | — |
| `panel-mode` | 面板显隐策略：`keep`（默认，hidden 保留 DOM）/ `lazy`（未访问的未激活面板不挂载，首次激活才渲染）/ `destroy`（切换即卸载非激活面板内容） | `string` | `keep` |
| `reserve-selected-space` | 选中加粗防抖：预载选中态文字宽度，选中/未选中标签宽度一致、切换不抖动 | `boolean` | — |
| `scroll-position` | 激活标签滚动定位策略：`auto`（默认 nearest）/ `start` / `center` / `end`（激活/新增标签滚动到可见时的对齐位置） | `string` | `auto` |
| `size` | 标签档位：`xs/small/medium/large/xl`（默认 medium），字号/内边距随档位；非法值回落 medium 并告警 | `string` | `medium` |
| `sortable` | 标签可拖拽换位（原生 HTML5 DnD），落点后派发 `oas-reorder`（宿主据此重排面板数据，组件不自动移动 DOM） | `boolean` | — |
| `stacked` | 图标在上、文字在下（纵向堆叠标签） | `boolean` | — |
| `tab-position` | 标签栏位置：`top`（默认）/ `left` / `right` / `bottom` | `string` | `top` |
| `trigger` | 切换触发方式：`click`（默认）/ `hover`（悬停即切换，disabled 不触发） | `string` | `click` |
| `type` | 样式变体：`line`（下划线，默认）/ `card`（卡片式） | `string` | `line` |
| `without-scroll-controls` | 关闭溢出时的左右/上下滚动箭头（默认溢出自动显示箭头） | `boolean` | — |

| 事件 | 说明 |
| --- | --- |
| `oas-add` | 点击 + 新增按钮，`detail: { label }`（默认新标签文案「新标签」走 locale，宿主自定义或直接使用） |
| `oas-before-change` | 切换前派发（cancelable），`detail: { value }`；宿主 `preventDefault()` 可 veto 本次切换（点击/键盘均生效；宿主直接 setAttribute 不触发） |
| `oas-change` | 切换，`detail: { value }` |
| `oas-close` | 点击标签关闭 ×，`detail: { key }`（`key` 为该标签 `value`，组件不自动移除） |
| `oas-rename` | editable 标签双击重命名确认（Enter），`detail: { value, label }`；组件自动把新 label 写回面板，宿主可据此持久化 |
| `oas-reorder` | sortable 拖拽换位后派发，`detail: { fromIndex, toIndex }`；宿主据此重排 `oas-tab-panel` 顺序（组件不自动移动 DOM） |

| 名称 | 说明 |
| --- | --- |
| 默认 | — |

### oas-tab-panel

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `badge` | 标签标题旁的徽标（数字或文本） | — | — |
| `disabled` | 禁用该标签：不可聚焦/不可点、`aria-disabled`、视觉降饱和，键盘导航跳过 | — | — |
| `editable` | 标签可双击重命名：双击进入输入框编辑态，Enter 确认（派发 `oas-rename`）/ Esc 取消 | — | — |
| `href` | tab 渲染为链接：该标签渲染为 `<a>`（锚点语义：右键新窗口/中键打开/SEO 可爬），搭配 target/rel | — | — |
| `icon` | 标签标题前的图标名（复用 `oas-icon` 图标集，如 `mail`） | — | — |
| `icon-only` | 纯图标标签：只渲染图标无文字（需 label 提供 aria-label 兜底可访问名称） | — | — |
| `label` | 标签文本 | — | — |
| `rel` | 链接 rel（仅 href 时生效，如 `noopener`） | — | — |
| `target` | 链接 target（仅 href 时生效，如 `_blank`） | — | — |
| `value` | 标签值 | — | — |

| 名称 | 说明 |
| --- | --- |
| 默认 | — |

键盘：聚焦标签列表后 ← / → / ↑ / ↓ 循环切换；关闭按钮聚焦后 Enter / Space 触发关闭。`oas-tab-panel` 声明 `hidden` 属性隐藏未激活面板（内容保留在 DOM）。
