# Menu 菜单

独立的菜单列表，支持选中态与键盘导航。

## 基础用法

<DemoBlock title="基础用法">
  <oas-menu style="width: 200px" items='[{"label":"编辑","value":"edit"},{"label":"复制","value":"copy"},{"label":"删除","value":"delete"}]'></oas-menu>
</DemoBlock>

## 默认选中

<DemoBlock title="默认选中（value 回显）">
  <oas-menu style="width: 200px" value="delete" items='[{"label":"编辑","value":"edit"},{"label":"复制","value":"copy"},{"label":"删除","value":"delete"}]'></oas-menu>
</DemoBlock>

## 禁用项

<DemoBlock title="禁用项">
  <oas-menu style="width: 200px" items='[{"label":"编辑","value":"edit"},{"label":"删除","value":"delete","disabled":true},{"label":"复制","value":"copy"}]'></oas-menu>
</DemoBlock>

## 多级子菜单

带 `children` 的菜单项显示展开箭头（›），点击或悬停展开子菜单，子菜单缩进展示；键盘 `ArrowRight` 进入、`ArrowLeft` 返回。

<DemoBlock title="多级子菜单">
  <oas-space direction="vertical" size="small">
    <oas-menu id="menu-nested" style="width: 200px" onoas-select="menuNestedLog(event)" items='[{"label":"编辑","value":"edit","children":[{"label":"复制","value":"copy"},{"label":"剪切","value":"cut"}]},{"label":"文件","value":"file","children":[{"label":"新建","value":"new","children":[{"label":"文件","value":"new-file"},{"label":"窗口","value":"new-window"}]},{"label":"打开","value":"open","children":[{"label":"最近文件","value":"recent"},{"label":"项目","value":"project"}]}]},{"label":"视图","value":"view"}]'></oas-menu>
    <oas-tag id="menu-nested-result" type="info">尚未选择</oas-tag>
  </oas-space>
</DemoBlock>

## 水平导航

`mode="horizontal"` 时菜单项横排，呈顶部导航条样式；一级子菜单向下浮出，二级及以上仍向右浮出。

<DemoBlock title="水平导航（顶部导航条样式）">
  <oas-menu mode="horizontal" style="width: 100%" onoas-select="menuHLog(event)" items='[{"label":"首页","value":"home"},{"label":"产品","value":"products","children":[{"label":"组件","value":"components","children":[{"label":"基础","value":"basic"},{"label":"数据","value":"data"}]},{"label":"文档","value":"docs"},{"label":"下载","value":"download"}]},{"label":"关于","value":"about"},{"label":"联系","value":"contact"}]'></oas-menu>
  <oas-tag id="menu-h-result" type="info">尚未选择</oas-tag>
</DemoBlock>

## 收起态

`collapsed`（仅 vertical 生效）将菜单收窄为只显示图标，悬停或点击图标项时子菜单向右浮出，子菜单内仍为完整菜单。

<DemoBlock title="收起态（只显示图标）">
  <oas-menu collapsed onoas-select="menuCLog(event)" items='[{"label":"首页","value":"home","icon":"menu"},{"label":"消息","value":"message","icon":"mail","children":[{"label":"收件箱","value":"inbox"},{"label":"已发送","value":"sent"}]},{"label":"用户","value":"user","icon":"user"},{"label":"设置","value":"settings","icon":"gear","children":[{"label":"个人资料","value":"profile"},{"label":"安全","value":"security"}]}]'></oas-menu>
  <oas-tag id="menu-c-result" type="info">尚未选择</oas-tag>
</DemoBlock>

## 分组

`type: "group"` 的菜单项渲染为带组标题的分区（组标题小字、次要色、不可点），组内子项平铺在同一层，可继续混入子菜单与分隔线。

<DemoBlock title="分组">
  <oas-menu style="width: 200px" items='[{"type":"group","label":"导航","children":[{"label":"首页","value":"home"},{"label":"关于","value":"about"}]},{"type":"group","label":"操作","children":[{"label":"新建","value":"new"},{"label":"设置","value":"settings","children":[{"label":"个人资料","value":"profile"},{"label":"安全","value":"security"}]}]}]'></oas-menu>
</DemoBlock>

## 带图标

`icon` 使用 `@oas-ui/icons` 的图标名（iconRegistry），以内联 SVG 渲染在文字左侧。

<DemoBlock title="带图标">
  <oas-menu style="width: 200px" items='[{"label":"搜索","value":"search","icon":"search"},{"label":"用户","value":"user","icon":"user"},{"label":"设置","value":"settings","icon":"gear"},{"label":"下载","value":"download","icon":"download"}]'></oas-menu>
</DemoBlock>

## 图标颜色（iconColor）

`iconColor` 字段显式固定图标颜色（优先于选中/禁用态默认色），支持任意 CSS 色值或 token；缺省 `currentColor` 随文字色。子元素声明式通道用 `icon-color` 属性。

<DemoBlock title="图标颜色（iconColor / icon-color）">
  <oas-space direction="vertical" size="small">
    <oas-menu id="menu-iconcolor" style="width: 220px" items='[{"label":"搜索","value":"search","icon":"search","iconColor":"var(--oas-color-primary)"},{"label":"用户","value":"user","icon":"user","iconColor":"#06b6d4"},{"label":"组织","value":"org","icon":"organization","iconColor":"#8b5cf6"},{"label":"设置","value":"settings","icon":"gear","iconColor":"var(--oas-color-warning)"}]'></oas-menu>
    <oas-menu id="menu-iconcolor-decl" style="width: 220px">
      <oas-menu-item value="download" icon="download" icon-color="var(--oas-color-success)">下载</oas-menu-item>
      <oas-menu-item value="delete" icon="trash" icon-color="var(--oas-color-danger)">删除</oas-menu-item>
      <oas-menu-item value="plain" icon="star">无 icon-color</oas-menu-item>
    </oas-menu>
  </oas-space>
</DemoBlock>

## 分隔线

`type: "divider"` 渲染一条细分隔线，不可点、不参与键盘导航。

<DemoBlock title="分隔线">
  <oas-menu style="width: 200px" items='[{"label":"编辑","value":"edit","icon":"edit"},{"label":"复制","value":"copy","icon":"copy"},{"type":"divider"},{"label":"删除","value":"delete","icon":"trash"}]'></oas-menu>
</DemoBlock>

## 子元素声明式通道

除 `items` JSON 外，可用 `<oas-menu-item>` / `<oas-menu-group>` / `<oas-menu-divider>` 子元素声明式书写（`items` 属性**显式设置时优先**，未设置时解析子元素收敛到同一渲染路径）。默认插槽文本为 label，属性对齐 `items` 字段：`value` / `disabled` / `loading` / `icon` / `kind` / `danger` / `href` / `target` / `rel`；`<oas-menu-item>` 内直接嵌套子元素即递归为子菜单，`<oas-menu-group>` 的 `label` 属性为组标题（`value` 可作 radio 组 id），组内子元素平铺同层。子元素增删、属性与文本变化会自动重渲染（MutationObserver）。

<DemoBlock title="子元素声明式（分组 / 分隔线 / 嵌套 / checkbox / danger / href）">
  <oas-space direction="vertical" size="small">
    <oas-menu id="menu-decl" style="width: 240px" value='["grid"]' onoas-select="menuDeclLog(event)">
      <oas-menu-group label="导航">
        <oas-menu-item value="home">首页</oas-menu-item>
        <oas-menu-item value="docs" href="/components/" target="_blank" rel="noopener">组件文档</oas-menu-item>
      </oas-menu-group>
      <oas-menu-divider></oas-menu-divider>
      <oas-menu-item value="edit">编辑
        <oas-menu-item value="copy">复制</oas-menu-item>
        <oas-menu-item value="cut">剪切</oas-menu-item>
      </oas-menu-item>
      <oas-menu-item value="grid" kind="checkbox">显示网格线</oas-menu-item>
      <oas-menu-item value="wrap" kind="checkbox">自动换行</oas-menu-item>
      <oas-menu-divider></oas-menu-divider>
      <oas-menu-item value="delete" danger>删除</oas-menu-item>
    </oas-menu>
    <oas-tag id="menu-decl-result" type="info">尚未选择</oas-tag>
  </oas-space>
</DemoBlock>

<DemoBlock title="动态增删（MutationObserver 自动刷新）">
  <oas-space direction="vertical" size="small">
    <oas-button size="small" onclick="menuDeclAdd()">追加一项</oas-button>
    <oas-menu id="menu-decl-dyn" style="width: 200px">
      <oas-menu-item value="home">首页</oas-menu-item>
      <oas-menu-item value="settings">设置</oas-menu-item>
    </oas-menu>
  </oas-space>
</DemoBlock>

## 暗色菜单

`theme="dark"` 使菜单局部使用暗色 token（深背景 + 浅文字），独立于全局主题；不设置时跟随全局主题。

<DemoBlock title="暗色菜单">
  <oas-space style="padding: 16px; border-radius: 8px; background: var(--oas-color-bg-hover)">
    <oas-menu theme="dark" style="width: 200px" items='[{"label":"编辑","value":"edit","icon":"edit","children":[{"label":"复制","value":"copy","icon":"copy"},{"label":"剪切","value":"cut"}]},{"label":"设置","value":"settings","icon":"gear"},{"type":"divider"},{"label":"删除","value":"delete","icon":"trash"}]'></oas-menu>
  </oas-space>
</DemoBlock>

## 选择事件

<DemoBlock title="选择事件">
  <oas-space direction="vertical" size="small">
    <oas-menu id="menu-event" style="width: 200px" onoas-select="menuLog(event)" items='[{"label":"编辑","value":"edit"},{"label":"复制","value":"copy"},{"label":"删除","value":"delete"}]'></oas-menu>
    <oas-tag id="menu-result" type="info">尚未选择</oas-tag>
  </oas-space>
</DemoBlock>

## 多选（checkbox）

`kind: "checkbox"` 的叶子项渲染为方块勾选框（`role="menuitemcheckbox"`，与 radio 的 ✓ 区分）；多选勾选集以 JSON 数组形态写入 `value`，点击某项后 `oas-select` 的 `detail` 携带 `checked`（本次点击后的勾选态）。

<DemoBlock title="多选（checkbox）">
  <oas-space direction="vertical" size="small">
    <oas-menu id="menu-cb" style="width: 240px" value='["grid"]' onoas-select="menuCbLog(event)" items='[{"label":"显示网格线","value":"grid","kind":"checkbox"},{"label":"自动换行","value":"wrap","kind":"checkbox"},{"label":"深色模式","value":"dark","kind":"checkbox"}]'></oas-menu>
    <oas-tag id="menu-cb-result" type="info">尚未勾选</oas-tag>
  </oas-space>
</DemoBlock>

## 危险操作项

`danger: true` 使用红色语义（`--oas-color-danger`），用于删除、退出登录等危险操作；hover / 键盘高亮时红底加深。

<DemoBlock title="危险操作项（danger）">
  <oas-space direction="vertical" size="small">
    <oas-menu id="menu-danger" style="width: 200px" onoas-select="menuDangerLog(event)" items='[{"label":"编辑","value":"edit","icon":"edit"},{"type":"divider"},{"label":"删除","value":"delete","icon":"trash","danger":true},{"label":"退出登录","value":"logout","danger":true}]'></oas-menu>
    <oas-tag id="menu-danger-result" type="info">尚未选择</oas-tag>
  </oas-space>
</DemoBlock>

## 链接项（href）

`href` 使菜单项渲染为 `<a>`（锚点语义：支持中键 / 右键新窗口，SEO 友好），`target` / `rel` 原样透传；点击仍会派发 `oas-select` 并写入选中态。示例链接用 `target="_blank"` 新开标签页，避免离开文档页。

<DemoBlock title="链接项（href）">
  <oas-space direction="vertical" size="small">
    <oas-menu id="menu-href" style="width: 220px" onoas-select="menuHrefLog(event)" items='[{"label":"组件总览","value":"overview","href":"/components/","icon":"menu","target":"_blank","rel":"noopener"},{"label":"快速开始","value":"start","href":"/guide/getting-started","icon":"search","target":"_blank","rel":"noopener"},{"label":"普通项","value":"plain","icon":"star"}]'></oas-menu>
    <oas-tag id="menu-href-result" type="info">尚未选择</oas-tag>
  </oas-space>
</DemoBlock>

## 长菜单滚动

`max-height` 限定菜单可视高度（纯数字自动补 `px`），超出部分在菜单内部滚动，适合长列表。

<DemoBlock title="长菜单滚动（max-height）">
  <oas-menu style="width: 200px" max-height="200" items='[{"label":"项目一","value":"p1"},{"label":"项目二","value":"p2"},{"label":"项目三","value":"p3"},{"label":"项目四","value":"p4"},{"label":"项目五","value":"p5"},{"label":"项目六","value":"p6"},{"label":"项目七","value":"p7"},{"label":"项目八","value":"p8"},{"label":"项目九","value":"p9"},{"label":"项目十","value":"p10"},{"label":"项目十一","value":"p11"},{"label":"项目十二","value":"p12"}]'></oas-menu>
</DemoBlock>

## 字符定位（typeahead）

菜单聚焦后直接输入字符，即跳转到 `label` 匹配的项（连续字符缓冲，500ms 无输入自动重置；前缀匹配优先，无前缀则包含匹配）。示例标签带英文便于按键触发：按 `c` 跳到 Copy，继续按 `u`（组合 `cu`）跳到 Cut。

<DemoBlock title="字符定位（typeahead）">
  <oas-space direction="vertical" size="small">
    <oas-menu id="menu-typeahead" style="width: 200px" items='[{"label":"Copy 复制","value":"copy","icon":"copy"},{"label":"Cut 剪切","value":"cut"},{"label":"Paste 粘贴","value":"paste"},{"label":"Undo 撤销","value":"undo"},{"label":"Redo 重做","value":"redo"}]'></oas-menu>
    <oas-tag id="menu-typeahead-hint" type="info">菜单已聚焦，直接按键试试（如 c → Copy、cu → Cut）</oas-tag>
  </oas-space>
</DemoBlock>

## inline 侧边导航

`mode="inline"` 时子菜单就地展开（不浮出），是侧边导航的主流形态；展开 / 收起带高度过渡动画，支持多级嵌套。

<DemoBlock title="inline 就地展开">
  <div style="width: 100%; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-4)">
    <oas-menu mode="inline" style="width: 240px" items='[{"label":"工作台","value":"workspace","icon":"menu","children":[{"label":"概览","value":"overview"},{"label":"数据统计","value":"stats"}]},{"label":"项目管理","value":"project","icon":"star","children":[{"label":"进行中","value":"active","children":[{"label":"迭代一","value":"s1"},{"label":"迭代二","value":"s2"}]},{"label":"已完成","value":"done"}]},{"label":"设置","value":"settings","icon":"gear"}]'></oas-menu>
  </div>
</DemoBlock>

## 受控展开

`expanded`（JSON 数组）为受控属性：外部设置 / 更新它即可指定展开的子菜单集合；每次展开 / 收起派发 `oas-expand-change`（`detail: { expanded, value, isExpanded }`），受控场景下宿主据此把状态写回 `expanded`。

<DemoBlock title="expanded 受控展开">
  <oas-space>
    <oas-button onclick="menuCtrlSet('workspace')">展开「工作台」</oas-button>
    <oas-button onclick="menuCtrlSet('message')">展开「消息中心」</oas-button>
    <oas-button onclick="menuCtrlCollapse()">全部收起</oas-button>
  </oas-space>
  <oas-menu id="menu-ctrl" mode="inline" style="width: 240px; margin-top: 8px" onoas-expand-change="menuCtrlChange(event)" items='[{"label":"工作台","value":"workspace","children":[{"label":"概览","value":"overview"}]},{"label":"消息中心","value":"message","children":[{"label":"收件箱","value":"inbox"}]},{"label":"设置","value":"settings"}]'></oas-menu>
  <oas-tag id="menu-ctrl-result" type="info">尚未操作</oas-tag>
</DemoBlock>

## 选中不收起

浮出形态（vertical / horizontal）默认选中叶子项即收起展开的子菜单（展开态是临时的）；`close-on-select="false"` 可保持展开，适合在浮层里连续选多项。`mode="inline"` 侧边导航默认不收（用户需看到所在分区），`close-on-select="true"` 可改为收起。`kind="checkbox"` 项的勾选切换永不收起。

<DemoBlock title="选中不收起（close-on-select）">
  <oas-space direction="vertical" size="large">
    <div style="width: 100%; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-4)">
      <p style="margin: 0 0 var(--oas-space-2); font-size: var(--oas-font-size-sm); color: var(--oas-color-text-secondary)">vertical + close-on-select="false"：点叶子后子菜单保持展开</p>
      <oas-menu id="menu-keep-open" close-on-select="false" style="width: 200px" onoas-select="menuKeepOpenLog(event)" items='[{"label":"编辑","value":"edit","children":[{"label":"复制","value":"copy"},{"label":"剪切","value":"cut"}]},{"label":"文件","value":"file","children":[{"label":"打开","value":"open","children":[{"label":"最近文件","value":"recent"},{"label":"项目","value":"project"}]}]},{"label":"视图","value":"view"}]'></oas-menu>
      <oas-tag id="menu-keep-open-result" type="info">尚未选择</oas-tag>
    </div>
    <div style="width: 100%; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-4)">
      <p style="margin: 0 0 var(--oas-space-2); font-size: var(--oas-font-size-sm); color: var(--oas-color-text-secondary)">inline + close-on-select="true"：点叶子后收起父级子菜单</p>
      <oas-menu id="menu-inline-close" mode="inline" close-on-select="true" style="width: 240px" onoas-select="menuInlineCloseLog(event)" items='[{"label":"仪表盘","value":"dash","children":[{"label":"概览","value":"dash-overview"},{"label":"分析","value":"dash-analytics"}]},{"label":"设置","value":"settings"}]'></oas-menu>
      <oas-tag id="menu-inline-close-result" type="info">尚未选择</oas-tag>
    </div>
  </oas-space>
</DemoBlock>

## 手风琴

`accordion`（配合 `mode="inline"`）使同级子菜单互斥：展开一个自动收起同级的其他展开项。

<DemoBlock title="手风琴互斥（inline + accordion）">
  <div style="width: 100%; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-4)">
    <oas-menu mode="inline" accordion style="width: 240px" items='[{"label":"账号管理","value":"account","children":[{"label":"个人资料","value":"profile"},{"label":"安全设置","value":"security"}]},{"label":"通知设置","value":"notice","children":[{"label":"站内信","value":"inbox"},{"label":"邮件通知","value":"email"}]},{"label":"偏好设置","value":"pref","children":[{"label":"外观主题","value":"theme"},{"label":"界面语言","value":"lang"}]}]'></oas-menu>
  </div>
</DemoBlock>

## 水平溢出收纳

`mode="horizontal"` 下容器宽度不足时，超宽的菜单项自动收进末尾「···」子菜单，导航条不换行、不截断。

<DemoBlock title="水平溢出收纳">
  <oas-menu mode="horizontal" style="width: 380px" items='[{"label":"首页","value":"home"},{"label":"产品中心","value":"products","icon":"menu"},{"label":"解决方案","value":"solutions","icon":"search"},{"label":"开发者文档","value":"docs"},{"label":"下载中心","value":"download","icon":"download"},{"label":"关于我们","value":"about","icon":"user"},{"label":"联系合作","value":"contact"},{"label":"帮助中心","value":"help"}]'></oas-menu>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  window.menuLog = (e) => {
    const tag = document.getElementById('menu-result')
    if (tag) tag.textContent = `已选择：${e.detail.value}`
  }
  window.menuNestedLog = (e) => {
    const tag = document.getElementById('menu-nested-result')
    if (tag) tag.textContent = `已选择：${e.detail.value}`
  }
  window.menuHLog = (e) => {
    const tag = document.getElementById('menu-h-result')
    if (tag) tag.textContent = `已选择：${e.detail.value}`
  }
  window.menuCLog = (e) => {
    const tag = document.getElementById('menu-c-result')
    if (tag) tag.textContent = `已选择：${e.detail.value}`
  }
  window.menuCbLog = (e) => {
    const tag = document.getElementById('menu-cb-result')
    const menu = document.getElementById('menu-cb')
    if (tag && menu) {
      let values = []
      try {
        values = JSON.parse(menu.getAttribute('value') || '[]')
      } catch {
        values = []
      }
      tag.textContent = values.length ? `已勾选：${values.join('、')}` : '未勾选任何项'
    }
  }
  window.menuDangerLog = (e) => {
    const tag = document.getElementById('menu-danger-result')
    if (tag) tag.textContent = `已选择：${e.detail.value}`
  }
  window.menuHrefLog = (e) => {
    const tag = document.getElementById('menu-href-result')
    if (tag) tag.textContent = `已选择：${e.detail.value}`
  }
  window.menuDeclLog = (e) => {
    const tag = document.getElementById('menu-decl-result')
    if (tag) tag.textContent = `已选择：${e.detail.value}`
  }
  window.menuDeclAdd = () => {
    const menu = document.getElementById('menu-decl-dyn')
    if (!menu) return
    const n = menu.children.length + 1
    const item = document.createElement('oas-menu-item')
    item.setAttribute('value', `dyn-${n}`)
    item.textContent = `动态项 ${n}`
    menu.appendChild(item)
  }
  window.menuKeepOpenLog = (e) => {
    const tag = document.getElementById('menu-keep-open-result')
    if (tag) tag.textContent = `已选择：${e.detail.value}（子菜单保持展开）`
  }
  window.menuInlineCloseLog = (e) => {
    const tag = document.getElementById('menu-inline-close-result')
    if (tag) tag.textContent = `已选择：${e.detail.value}（父级已收起）`
  }
  window.menuCtrlSet = (value) => {
    const menu = document.getElementById('menu-ctrl')
    if (menu) menu.setAttribute('expanded', JSON.stringify([value]))
  }
  window.menuCtrlCollapse = () => {
    const menu = document.getElementById('menu-ctrl')
    if (menu) menu.setAttribute('expanded', '[]')
  }
  window.menuCtrlChange = (e) => {
    const { expanded, value, isExpanded } = e.detail
    const menu = document.getElementById('menu-ctrl')
    // 受控：把组件内部展开状态同步回 expanded 属性
    if (menu) menu.setAttribute('expanded', JSON.stringify(expanded))
    const tag = document.getElementById('menu-ctrl-result')
    if (tag) {
      tag.textContent = `${isExpanded ? '展开' : '收起'}「${value}」；当前展开：${expanded.length ? expanded.join('、') : '（无）'}`
    }
  }
  // typeahead：聚焦菜单，使字符定位立即可用
  const ta = document.getElementById('menu-typeahead')
  ta?.shadowRoot?.querySelector('.menu')?.focus({ preventScroll: true })
})
</script>

## API

### oas-menu

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `accordion` | 手风琴互斥（inline 模式同级只展开一个子菜单） | `boolean` | — |
| `close-on-select` | 选中叶子项后是否收起展开的子菜单。缺省分形态：inline 侧边导航不收、浮出形态收；checkbox 项勾选切换永不收起 | `string` | — |
| `collapsed` | 收起态（仅 vertical）：只显示图标，子菜单向右浮出 | — | — |
| `expanded` | 受控展开项集合（JSON 数组字符串，inline 模式哪些子菜单展开）；非受控时内部管理 | `string` | — |
| `items` | 菜单项 JSON（支持 disabled / loading 禁点、icon、children 子菜单） | `string` | `[]` |
| `max-height` | 长菜单最大高度，超出内部滚动（数字补 px） | `string` | — |
| `mode` | 布局模式：`vertical` 纵向菜单 / `horizontal` 顶部导航条 | — | — |
| `theme` | 局部主题：`dark` 使用暗色 token（独立于全局主题） | — | — |
| `value` | 当前选中值。纯字符串时全局单选（无组场景，兼容旧用法）；JSON 对象字符串（如 `{"sort":"name","view":"list"}`）时按组 id 作用域独立记录——`type:"group"` 项的 `value` 作组 id，组内点选只更新该组 | `string` | — |

| 事件 | 说明 |
| --- | --- |
| `oas-expand-change` | 子菜单展开状态变化，`detail: { expanded: string[], value, isExpanded }`（受控/非受控都派发） |
| `oas-select` | 选择某项，`detail: { value, kind? }`。`kind` 仅动作项（`kind: "action"`）出现，值为 "action"；radio 项 `detail.kind` 不出现 |

### oas-menu-item

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `danger` | 破坏性项：红色语义（删除/退出等危险操作） | — | — |
| `disabled` | 禁用该项 | — | — |
| `href` | 链接地址：有 href 时渲染为原生 `<a>`（真实跳转 + 照常派发 `oas-select`） | — | — |
| `icon` | 前置图标（`@oas-ui/icons` 注册表图标名） | — | — |
| `icon-color` | 图标颜色：显式固定该色（优先于选中/禁用态默认色）；缺省 currentColor 随文字色 | — | — |
| `kind` | 叶子项语义：`radio`（默认，可勾选）/ `action`（动作项，无勾选态、不写回 value）/ `checkbox`（多选勾选，value 数组勾选集） | — | — |
| `loading` | 加载中：渲染 spinner、禁点，由数据驱动恢复 | — | — |
| `rel` | 链接 rel（配合 href） | — | — |
| `target` | 链接 target（配合 href） | — | — |
| `value` | 选中值（子元素声明式通道的数据载体字段） | — | — |

| 名称 | 说明 |
| --- | --- |
| 默认 | 菜单项 label 内容（默认插槽文本）；直接子元素 `<oas-menu-item>`/`<oas-menu-group>`/`<oas-menu-divider>` 递归为子菜单 children |

### oas-menu-group

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `label` | 分组标题（组标题小字、次要色、不可点） | — | — |
| `value` | radio 组 id（组内点选只更新该组选中值） | — | — |

| 名称 | 说明 |
| --- | --- |
| 默认 | 组内菜单项：子元素 `<oas-menu-item>`/`<oas-menu-group>`/`<oas-menu-divider>` 平铺同层 |

### oas-menu-divider

| 名称 | 说明 |
| --- | --- |
| 默认 | 分隔线数据载体（无属性，宿主解析为 `type: "divider"`） |

`MenuItem` 字段：

| 字段       | 说明                                                                 | 类型         |
| ---------- | -------------------------------------------------------------------- | ------------ |
| `label`    | 菜单项文字                                                           | `string`     |
| `value`    | 选中值                                                               | `string`     |
| `type`     | 菜单项类型：`item`（默认）/ `group`（分组标题）/ `divider`（分隔线） | `string`     |
| `kind`     | 叶子项语义：`radio`（默认，可勾选）/ `action`（动作项，无勾选态、点击不写回 value） | `string` |
| `icon`     | 图标名（`registerIcon()` 自定义或 `@oas-ui/icons` 内置图标名）     | `string`     |
| `iconColor`| 图标颜色（可选）：显式固定该色，优先于选中/禁用态默认色；缺省 currentColor 随文字色 | `string` |
| `disabled` | 禁用该项                                                             | `boolean`    |
| `children` | 子菜单项数组，结构与父项一致（可继续嵌套）                           | `MenuItem[]` |

`children` 为可选子菜单项数组；有 `children` 的项点击/悬停展开子菜单，选中态只落在叶子项。`group` 的 `children` 平铺展示在同一层，组标题不可点、不参与键盘导航；`divider` 不可点、不参与键盘导航。

键盘导航：方向键移动（自动跳过组标题与分隔线）、Enter 选择（含子菜单的项 Enter/ArrowRight 进入）、Home / End 跳转、ArrowLeft 返回父级；`role="menu"` + `menuitemradio`（子菜单父项为 `menuitem`），选中项显示对勾。
