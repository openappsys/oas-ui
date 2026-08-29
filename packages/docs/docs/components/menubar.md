# Menubar 应用菜单栏

桌面应用式顶部菜单条（文件 / 编辑 / 视图），点击 / 悬停展开子菜单（级联浮出），支持方向键、`Alt` 访问键与焦点陷阱。

## 多组单选（radio 组独立勾选）

`type: "group"` 项的 `value` 作为**组 id**，同一组内的叶子按该组独立记录选中值；`value` 属性传 JSON 对象（`{"组id":"选中值"}`）时各组互不干扰——「模式」和「主题」两组可各自显示打勾。

<DemoBlock title="多组单选（组独立勾选）">
  <oas-menubar id="menubar-groups" onoas-select="menubarGroupsLog(event)" value='{"mode":"preview","theme":"dark"}' items='[{"label":"视图","value":"view","accessKey":"v","children":[{"type":"group","label":"模式","value":"mode","children":[{"label":"编辑","value":"edit"},{"label":"预览","value":"preview"}]},{"type":"group","label":"主题","value":"theme","children":[{"label":"浅色","value":"light"},{"label":"暗色","value":"dark"}]}]}]'></oas-menubar>
  <oas-tag id="menubar-groups-result" type="info">mode: preview, theme: dark</oas-tag>
</DemoBlock>

## 动作项（kind: "action"）

`kind: "action"` 的叶子项按普通动作渲染（`menuitem`），无勾选态、点击**不写回** `value`、只派发 `oas-select`（`detail.kind === "action"`）——适合「打开 / 保存 / 关于」这类非设置项。

<DemoBlock title="动作项（kind: action）">
  <oas-menubar id="menubar-action" onoas-select="menubarActionLog(event)" value="mode" items='[{"label":"文件","value":"file","accessKey":"f","children":[{"label":"打开","value":"open","kind":"action"},{"label":"保存","value":"save","kind":"action"},{"type":"divider"},{"label":"模式","value":"mode","kind":"radio"},{"label":"主题","value":"theme","kind":"radio"}]}]'></oas-menubar>
  <oas-tag id="menubar-action-result" type="info">value: mode（动作项点击不改变）</oas-tag>
</DemoBlock>

## 快捷键（shortcut）

`shortcut` 字段（如 `"Ctrl+N"`）：右侧渲染快捷键提示，并自动绑定 `document` 级 keydown——命中即触发对应项选择（`preventDefault` 拦截浏览器默认行为）。绑定规则：`修饰键+键` 直接绑定；单键仅限功能键（F1–F12）可绑定，其余单键（字母/数字/Delete 等）仅作展示不绑定。

<DemoBlock title="快捷键（shortcut）">
  <oas-menubar id="menubar-shortcut" onoas-select="menubarShortcutLog(event)" items='[{"label":"文件","value":"file","accessKey":"f","children":[{"label":"新建","value":"new","shortcut":"Ctrl+N"},{"label":"打开","value":"open","shortcut":"Ctrl+O"},{"type":"divider"},{"label":"保存","value":"save","shortcut":"Ctrl+S","kind":"action"}]}]'></oas-menubar>
  <oas-tag id="menubar-shortcut-result" type="info">按 Ctrl+N / Ctrl+O / Ctrl+S 试试</oas-tag>
</DemoBlock>

## 基础用法

<DemoBlock title="基础用法">
  <oas-menubar id="menubar-basic" onoas-select="menubarLog(event)" items='[{"label":"文件","value":"file","accessKey":"f","children":[{"label":"新建","value":"new"},{"label":"打开","value":"open"},{"type":"divider"},{"label":"退出","value":"quit"}]},{"label":"编辑","value":"edit","accessKey":"e","children":[{"label":"撤销","value":"undo"},{"label":"重做","value":"redo"},{"type":"divider"},{"label":"复制","value":"copy"},{"label":"粘贴","value":"paste"}]},{"label":"视图","value":"view","accessKey":"v","children":[{"label":"全屏","value":"fullscreen"},{"label":"缩放","value":"zoom","children":[{"label":"放大","value":"zoom-in"},{"label":"缩小","value":"zoom-out"}]}]}]'></oas-menubar>
  <oas-tag id="menubar-result" type="info">尚未选择</oas-tag>
</DemoBlock>

## 禁用项与分组

子菜单内支持 `disabled`、`type: "divider"` 分隔线与 `type: "group"` 分组标题。

<DemoBlock title="禁用项与分组">
  <oas-menubar onoas-select="menubarLog2(event)" items='[{"label":"文件","value":"file","accessKey":"f","children":[{"type":"group","label":"最近","children":[{"label":"项目 A","value":"proj-a"},{"label":"项目 B","value":"proj-b"}]},{"type":"divider"},{"label":"保存","value":"save"},{"label":"另存为","value":"save-as","disabled":true}]}]'></oas-menubar>
  <oas-tag id="menubar-result-2" type="info">尚未选择</oas-tag>
</DemoBlock>

## 受控选中

`value` 属性受控（已列入 observedAttributes）：外部 `setAttribute('value', ...)` 即时生效，选中项（勾选/高亮）同步到对应叶子项；组件内部点击也会写回 `value`（非受控通道），宿主可监听 `oas-select` 自行接管。

<DemoBlock title="受控选中（value 属性）">
  <oas-space size="small">
    <oas-button size="small" onclick="mbSet('new')">选中「新建」</oas-button>
    <oas-button size="small" onclick="mbSet('undo')">选中「撤销」</oas-button>
    <oas-button size="small" onclick="mbSet('')">清除选中</oas-button>
    <oas-tag id="mb-value-status" type="info">value: -</oas-tag>
  </oas-space>
  <oas-menubar id="mb-value" items='[{"label":"文件","value":"file","accessKey":"f","children":[{"label":"新建","value":"new"},{"label":"打开","value":"open"},{"type":"divider"},{"label":"退出","value":"quit"}]},{"label":"编辑","value":"edit","accessKey":"e","children":[{"label":"撤销","value":"undo"},{"label":"重做","value":"redo"}]}]'></oas-menubar>
</DemoBlock>

## 复选与不收起（checkbox + close-on-select）

`kind: "checkbox"` 叶子按多选勾选（`value` 为 JSON 数组），点击切换勾选**不收起**子菜单（连续勾选场景）；`close-on-select="false"` 让 radio/动作项选中后也保持展开。

<DemoBlock title="复选与不收起（checkbox + close-on-select）">
  <oas-menubar id="menubar-checkbox" onoas-select="menubarCheckboxLog(event)" close-on-select="false" value='["grid"]' items='[{"label":"视图","value":"view","accessKey":"v","children":[{"type":"group","label":"显示","children":[{"label":"网格线","value":"grid","kind":"checkbox"},{"label":"标尺","value":"ruler","kind":"checkbox"}]},{"type":"divider"},{"label":"全屏","value":"fullscreen"}]}]'></oas-menubar>
  <oas-tag id="menubar-checkbox-result" type="info">勾选集: ["grid"]</oas-tag>
</DemoBlock>

## 受控打开（open）

`open` 属性表达当前打开的顶级菜单 value（`""` 为全部收起）。受控属性：外部 `setAttribute('open', ...)` 即时打开/切换/关闭；组件内部变化会写回 `open` 并派发 `oas-open-change`（`detail: { value, open }`），宿主可监听接管。

<DemoBlock title="受控打开（open 属性）">
  <oas-space size="small">
    <oas-button size="small" onclick="mbOpen('file')">打开「文件」</oas-button>
    <oas-button size="small" onclick="mbOpen('edit')">打开「编辑」</oas-button>
    <oas-button size="small" onclick="mbOpen('')">收起</oas-button>
    <oas-tag id="mb-open-status" type="info">open: -</oas-tag>
  </oas-space>
  <oas-menubar id="mb-open" items='[{"label":"文件","value":"file","accessKey":"f","children":[{"label":"新建","value":"new"},{"label":"打开","value":"open"}]},{"label":"编辑","value":"edit","accessKey":"e","children":[{"label":"撤销","value":"undo"},{"label":"重做","value":"redo"}]}]'></oas-menubar>
</DemoBlock>

## 触发方式与方向键循环（trigger / loop）

`trigger="click"`（缺省）：顶级菜单**首开用点击**，一旦有菜单打开，hover 顶级项即切换（桌面应用共识）；`trigger="hover"` 保持 hover 直开。`loop="false"` 关闭方向键在边界处循环。

<DemoBlock title="hover 直开（trigger 配置）">
  <oas-menubar onoas-select="menubarLog2(event)" trigger="hover" items='[{"label":"文件","value":"file","accessKey":"f","children":[{"label":"新建","value":"new"},{"label":"打开","value":"open"}]},{"label":"编辑","value":"edit","accessKey":"e","children":[{"label":"撤销","value":"undo"}]}]'></oas-menubar>
  <oas-tag id="menubar-trigger-result" type="info">hover 即开（无 click-first）</oas-tag>
</DemoBlock>

<DemoBlock title="方向键不循环（loop 配置）">
  <oas-menubar loop="false" items='[{"label":"文件","value":"file","accessKey":"f","children":[{"label":"新建","value":"new"}]},{"label":"编辑","value":"edit","accessKey":"e","children":[{"label":"撤销","value":"undo"}]},{"label":"视图","value":"view","accessKey":"v","children":[{"label":"全屏","value":"fullscreen"}]}]'></oas-menubar>
  <oas-tag type="info">← 在首项、→ 在末项停止</oas-tag>
</DemoBlock>

## 整栏禁用（disabled）

`disabled` 整栏禁用：顶级项/子项点击、键盘导航、shortcut 快捷键与 Alt 访问键全部拦截。

<DemoBlock title="整栏禁用（disabled）">
  <oas-menubar disabled items='[{"label":"文件","value":"file","accessKey":"f","children":[{"label":"新建","value":"new"}]},{"label":"编辑","value":"edit","accessKey":"e","children":[{"label":"撤销","value":"undo"}]}]'></oas-menubar>
  <oas-tag type="info">整栏不可交互</oas-tag>
</DemoBlock>

## 弹出定位与箭头（side / align / offset / show-arrow）

`side` 控制一级下拉弹出侧（缺省 `bottom`）、`align` 对齐（缺省 `start`）、`offset` 与触发器的间距（px）；`show-arrow` 显示指向触发器的视觉箭头。

<DemoBlock title="弹出定位与箭头（side / align / offset / show-arrow）">
  <oas-menubar side="top" align="end" offset="8" show-arrow items='[{"label":"文件","value":"file","accessKey":"f","children":[{"label":"新建","value":"new"},{"label":"打开","value":"open"}]},{"label":"编辑","value":"edit","accessKey":"e","children":[{"label":"撤销","value":"undo"}]}]'></oas-menubar>
  <oas-tag type="info">side=top / align=end / offset=8 / show-arrow</oas-tag>
</DemoBlock>

## 竖排（orientation）

`orientation="vertical"`：bar 纵向排布，一级下拉缺省向右弹出；键盘 ↑/↓ 移动顶级项、→ 打开子菜单。

<DemoBlock title="竖排（orientation 配置）">
  <oas-menubar orientation="vertical" items='[{"label":"文件","value":"file","accessKey":"f","children":[{"label":"新建","value":"new"},{"label":"打开","value":"open"}]},{"label":"编辑","value":"edit","accessKey":"e","children":[{"label":"撤销","value":"undo"},{"label":"重做","value":"redo"}]}]'></oas-menubar>
</DemoBlock>

## 移动端汉堡收纳（breakpoint）

`breakpoint="600"`：视口宽度 ≤ 600px 时菜单栏折叠为汉堡按钮 + 弹出菜单（窄宽收纳）；拉宽窗口自动恢复完整菜单栏。

<DemoBlock title="移动端汉堡收纳（breakpoint）">
  <oas-menubar id="menubar-mobile" breakpoint="600" onoas-select="menubarMobileLog(event)" items='[{"label":"文件","value":"file","accessKey":"f","children":[{"label":"新建","value":"new"},{"label":"打开","value":"open"}]},{"label":"编辑","value":"edit","accessKey":"e","children":[{"label":"撤销","value":"undo"}]}]'></oas-menubar>
  <oas-tag id="menubar-mobile-result" type="info">拉窄窗口（≤600px）试试汉堡按钮</oas-tag>
</DemoBlock>

## 图标（icon）

顶级项与子项支持 `icon` 字段（图标集名），图标跟随文字色。

<DemoBlock title="图标（icon）">
  <oas-menubar items='[{"label":"文件","value":"file","icon":"gear","children":[{"label":"新建","value":"new","icon":"plus"},{"label":"打开","value":"open","icon":"search"},{"label":"保存","value":"save","icon":"download"}]},{"label":"账户","value":"account","icon":"user","children":[{"label":"资料","value":"profile","icon":"user"},{"label":"登出","value":"logout","icon":"close"}]}]'></oas-menubar>
</DemoBlock>

## 图标颜色（iconColor）

顶级项与子项支持 `iconColor` 字段（显式固定图标色，优先于选中/禁用态默认色；缺省 `currentColor` 随文字色）。子元素声明式通道用 `icon-color` 属性。

<DemoBlock title="图标颜色（iconColor / icon-color）">
  <oas-menubar id="menubar-iconcolor" items='[{"label":"文件","value":"file","icon":"gear","iconColor":"var(--oas-color-primary)","children":[{"label":"新建","value":"new","icon":"plus","iconColor":"var(--oas-color-success)"},{"label":"打开","value":"open","icon":"search"}]},{"label":"账户","value":"account","icon":"user","iconColor":"#8b5cf6","children":[{"label":"登出","value":"logout","icon":"trash","iconColor":"var(--oas-color-danger)"}]}]'></oas-menubar>
</DemoBlock>

## 链接导航（href）

叶子项（子菜单内与顶级叶子）带 `href` 时渲染为真链接 `<a>`：可右键新窗口、中键新开、利于 SEO；点击仍照常派发 `oas-select` 并写回 `value`（链接默认跳转不拦截）。`target="_blank"` 自动补 `rel="noopener"`。

<DemoBlock title="链接导航（href 真链接）">
  <oas-menubar id="menubar-href" onoas-select="menubarHrefLog(event)" items='[{"label":"文档","value":"docs","accessKey":"d","href":"/guide/intro"},{"label":"社区","value":"community","accessKey":"c","href":"/community","target":"_blank","children":[{"label":"讨论区","value":"forum","href":"/community/forum","target":"_blank"},{"label":"贡献指南","value":"contrib","href":"/community/contrib"}]}]'></oas-menubar>
  <oas-tag id="menubar-href-result" type="info">点叶子项会导航并派发 oas-select</oas-tag>
</DemoBlock>

## 子元素声明式通道

除 `items` JSON 外，可用 `<oas-menubar-item>` / `<oas-menubar-group>` / `<oas-menubar-divider>` 子元素声明式书写（`items` 属性**显式设置时优先**，未设置时解析子元素收敛到同一渲染路径）。默认插槽文本为 label，属性对齐 `MenubarItem` 字段：`value` / `disabled` / `icon` / `kind` / `danger` / `href` / `target` / `rel` / `shortcut` / `access-key` / `indeterminate`；`<oas-menubar-item>` 内直接嵌套子元素即递归为子菜单，`<oas-menubar-group>` 的 `label` 属性为组标题（`value` 可作 radio 组 id），组内子元素平铺同层。子元素增删、属性与文本变化会自动重渲染（MutationObserver）。

<DemoBlock title="子元素声明式（分组 / 分隔线 / 嵌套 / checkbox / indeterminate / shortcut / danger / href）">
  <oas-space direction="vertical" size="small">
    <oas-menubar id="menubar-decl" onoas-select="menubarDeclLog(event)">
      <oas-menubar-item value="file" access-key="f">文件
        <oas-menubar-group label="最近">
          <oas-menubar-item value="proj-a">项目 A</oas-menubar-item>
          <oas-menubar-item value="proj-b">项目 B</oas-menubar-item>
        </oas-menubar-group>
        <oas-menubar-divider></oas-menubar-divider>
        <oas-menubar-item value="save" shortcut="Ctrl+S" kind="action">保存</oas-menubar-item>
        <oas-menubar-item value="docs" href="/components/" target="_blank" rel="noopener">组件文档</oas-menubar-item>
      </oas-menubar-item>
      <oas-menubar-item value="view" access-key="v">视图
        <oas-menubar-item value="all" kind="checkbox" indeterminate>全选</oas-menubar-item>
        <oas-menubar-item value="grid" kind="checkbox">网格线</oas-menubar-item>
        <oas-menubar-item value="del" danger>删除</oas-menubar-item>
      </oas-menubar-item>
    </oas-menubar>
    <oas-tag id="menubar-decl-result" type="info">尚未选择（试试 Alt+F 打开「文件」、Ctrl+S 触发保存）</oas-tag>
  </oas-space>
</DemoBlock>

<DemoBlock title="动态增删（MutationObserver 自动刷新）">
  <oas-space direction="vertical" size="small">
    <oas-button size="small" onclick="menubarDeclAdd()">追加顶级项</oas-button>
    <oas-menubar id="menubar-decl-dyn">
      <oas-menubar-item value="file">文件
        <oas-menubar-item value="new">新建</oas-menubar-item>
      </oas-menubar-item>
    </oas-menubar>
  </oas-space>
</DemoBlock>

## 水平溢出收纳（···）

容器宽度不足时，放不下的顶级项自动收进末尾「···」收纳项，点击弹层显示被收项（点选即选中）；选中项被收纳时「···」高亮。仅水平模式；竖排与移动端汉堡不收纳。被收纳的含子菜单顶级项在弹层内按叶子项点选（弹层内不展开级联子菜单）。

<DemoBlock title="水平溢出收纳（窄容器自动收进 ···）">
  <oas-menubar id="menubar-overflow" style="width: 380px" onoas-select="menubarOverflowLog(event)" items='[{"label":"首页","value":"home"},{"label":"产品中心","value":"products","children":[{"label":"组件库","value":"components"},{"label":"主题定制","value":"theming"}]},{"label":"解决方案","value":"solutions"},{"label":"开发者文档","value":"docs"},{"label":"下载中心","value":"download"},{"label":"关于我们","value":"about"},{"label":"帮助中心","value":"help"}]'></oas-menubar>
  <oas-tag id="menubar-overflow-result" type="info">容器固定 380px，超宽项收进「···」</oas-tag>
</DemoBlock>

## 半选态（indeterminate）

`kind: "checkbox"` 项支持 `indeterminate: true`：渲染 `aria-checked="mixed"` + 方块内横线减号（区别于全选的 ✓），供父子联动「部分选中」场景——半选状态由宿主算好后随 items JSON 传入，点击切换勾选后宿主可更新 items 取消半选标记。

<DemoBlock title="checkbox 半选（indeterminate）">
  <oas-menubar id="menubar-indeterminate" onoas-select="menubarIndeterminateLog(event)" value='["all","grid"]' items='[{"label":"视图","value":"view","accessKey":"v","children":[{"type":"group","label":"显示","children":[{"label":"全选","value":"all","kind":"checkbox","indeterminate":true},{"label":"网格线","value":"grid","kind":"checkbox"},{"label":"标尺","value":"ruler","kind":"checkbox"}]}]}]'></oas-menubar>
  <oas-tag id="menubar-indeterminate-result" type="info">「全选」为半选（mixed）</oas-tag>
</DemoBlock>

## 头尾插槽（start / end）

`slot="start"`（logo 位）/ `slot="end"`（头像位）装饰插槽：有内容时在 bar 内渲染，键盘导航自动跳过（不参与方向键/焦点陷阱）。

<DemoBlock title="start / end 插槽（logo / 头像）">
  <oas-menubar items='[{"label":"文件","value":"file","accessKey":"f","children":[{"label":"新建","value":"new"},{"label":"打开","value":"open"}]},{"label":"编辑","value":"edit","accessKey":"e","children":[{"label":"撤销","value":"undo"}]}]'>
    <oas-avatar slot="start" size="28">O</oas-avatar>
    <oas-avatar slot="end" size="28" src="https://picsum.photos/seed/isui-mb-avatar/80">U</oas-avatar>
  </oas-menubar>
  <p class="demo-tip">start 位放 logo 文字/图形，end 位放头像；方向键在菜单项间移动，不会跳进插槽。</p>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  window.menubarGroupsLog = (e) => {
    const tag = document.getElementById('menubar-groups-result')
    if (tag) {
      const v = JSON.parse(document.getElementById('menubar-groups')?.getAttribute('value') || '{}')
      tag.textContent = `mode: ${v.mode || '-'}, theme: ${v.theme || '-'}`
    }
  }
  window.menubarActionLog = (e) => {
    const tag = document.getElementById('menubar-action-result')
    if (tag) {
      tag.textContent = e.detail.kind === 'action'
        ? `动作：${e.detail.value}（value 不变）`
        : `选中：${e.detail.value}（kind: radio）`
    }
  }
  window.menubarShortcutLog = (e) => {
    const tag = document.getElementById('menubar-shortcut-result')
    if (tag) tag.textContent = `已触发：${e.detail.value}`
  }
  window.menubarLog = (e) => {
    const tag = document.getElementById('menubar-result')
    if (tag) tag.textContent = `已选择：${e.detail.value}`
  }
  window.menubarLog2 = (e) => {
    const tag = document.getElementById('menubar-result-2')
    if (tag) tag.textContent = `已选择：${e.detail.value}`
  }

  window.menubarCheckboxLog = (e) => {
    const tag = document.getElementById('menubar-checkbox-result')
    const mb = document.getElementById('menubar-checkbox')
    if (tag && mb) {
      const v = JSON.parse(mb.getAttribute('value') || '[]')
      tag.textContent = `勾选集: ${JSON.stringify(v)}（checkbox 不收起）`
    }
  }

  window.menubarMobileLog = (e) => {
    const tag = document.getElementById('menubar-mobile-result')
    if (tag) tag.textContent = `已选择：${e.detail.value}（汉堡模式）`
  }

  window.menubarHrefLog = (e) => {
    const tag = document.getElementById('menubar-href-result')
    if (tag) tag.textContent = `oas-select：${e.detail.value}（已渲染为 <a> 真链接）`
  }

  window.menubarDeclLog = (e) => {
    const tag = document.getElementById('menubar-decl-result')
    if (tag) tag.textContent = `已选择：${e.detail.value}（来自子元素声明式通道）`
  }
  window.menubarDeclAdd = () => {
    const mb = document.getElementById('menubar-decl-dyn')
    if (!mb) return
    const n = mb.children.length + 1
    const item = document.createElement('oas-menubar-item')
    item.setAttribute('value', `dyn-${n}`)
    item.textContent = `动态项 ${n}`
    mb.appendChild(item)
  }

  window.menubarOverflowLog = (e) => {
    const tag = document.getElementById('menubar-overflow-result')
    if (tag) tag.textContent = `已选择：${e.detail.value}（来自「···」弹层或条上）`
  }

  window.menubarIndeterminateLog = (e) => {
    const tag = document.getElementById('menubar-indeterminate-result')
    const mb = document.getElementById('menubar-indeterminate')
    if (tag && mb) {
      const v = JSON.parse(mb.getAttribute('value') || '[]')
      tag.textContent = `勾选集: ${JSON.stringify(v)}（「全选」仍标 mixed，宿主可随 items 更新半选标记）`
    }
  }

  const mb = document.getElementById('mb-value')
  const status = document.getElementById('mb-value-status')
  if (mb && status) {
    const sync = () => {
      status.textContent = `value: ${mb.getAttribute('value') || '-'}`
    }
    window.mbSet = (v) => {
      // value 在 observedAttributes 中：直接 setAttribute 即触发即时重渲染
      mb.setAttribute('value', v)
    }
    // 受控接管：菜单内点击组件已写回 value；宿主亦可监听 oas-select 自行决定
    mb.addEventListener('oas-select', (e) => mbSet(e.detail.value))
    sync()
    new MutationObserver(sync).observe(mb, { attributes: true, attributeFilter: ['value'] })
  }

  const mbOpenEl = document.getElementById('mb-open')
  const mbOpenStatus = document.getElementById('mb-open-status')
  if (mbOpenEl && mbOpenStatus) {
    const syncOpen = () => {
      mbOpenStatus.textContent = `open: ${mbOpenEl.getAttribute('open') || '(收起)'}`
    }
    window.mbOpen = (v) => {
      // open 在 observedAttributes 中：直接 setAttribute 即触发即时打开/收起
      mbOpenEl.setAttribute('open', v)
    }
    // 内部变化（点击顶级项/hover 切换）也会写回 open 并派发 oas-open-change
    mbOpenEl.addEventListener('oas-open-change', (e) => {
      syncOpen()
      window.__lastOpenChange = e.detail
    })
    syncOpen()
    new MutationObserver(syncOpen).observe(mbOpenEl, { attributes: true, attributeFilter: ['open'] })
  }
})
</script>

## API

### oas-menubar

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `align` | 一级下拉对齐：`start`（缺省）/ `center` / `end`；`side` 为 top/bottom 时沿水平轴，为 left/right 时沿垂直轴 | `string` | — |
| `breakpoint` | 移动端断点（px，如 `600`）：视口宽度 ≤ 断点时 bar 折叠为汉堡按钮 + 弹出菜单（窄宽收纳） | `string` | — |
| `close-on-select` | 选中叶子项后是否收起展开的子菜单，缺省 `true`（桌面菜单栏共识）；`close-on-select="false"` 保持展开（连选场景）；`kind:"checkbox"` 项勾选切换永不收起 | `string` | — |
| `disabled` | 整栏禁用：顶级项/子项点击、键盘导航、shortcut 快捷键、Alt 访问键全部拦截，视觉降饱和 | `boolean` | — |
| `items` | 顶级菜单项 JSON（含子菜单 children） | `string` | `[]` |
| `loop` | 方向键循环导航开关，缺省 `true`（边界循环）；显式 `loop="false"` 时边界停止 | `string` | — |
| `offset` | 一级下拉与触发器间距（px，缺省 4） | `string` | — |
| `open` | 当前打开的顶级菜单 value（`open=""` 表示全部收起）。受控属性（observedAttributes）：外部 `setAttribute('open', ...)` 即时打开/切换/关闭；内部点击/hover/键盘变化会写回本属性并派发 `oas-open-change`，宿主可监听接管 | `string` | — |
| `orientation` | 排列方向：`horizontal`（缺省）/ `vertical`（竖排：bar 纵向、一级下拉缺省向右弹、键盘上下移动顶级） | — | — |
| `show-arrow` | 显示弹出层指向触发器的视觉箭头 | — | — |
| `side` | 一级下拉弹出侧：`bottom`（水平缺省）/ `top` / `left` / `right`（竖排缺省）；级联子菜单不受影响 | `string` | — |
| `trigger` | 顶级菜单触发方式：`click`（默认，首开需点击、打开后 hover 切换——桌面应用共识）/ `hover`（hover 直开） | — | — |
| `value` | 选中值。纯字符串时全局单选（无组场景，兼容旧用法）；JSON 对象字符串（如 `{"mode":"preview","theme":"dark"}`）时按组 id 作用域独立记录——`type:"group"` 项的 `value` 作组 id；JSON 数组字符串（如 `["grid","wrap"]`）时为 checkbox 勾选集（`kind:"checkbox"` 项多选） | `string` | — |

| 事件 | 说明 |
| --- | --- |
| `oas-open-change` | 顶级打开菜单变化，`detail: { value, open }`（`value` = 当前打开顶级菜单 value，`open` = 是否打开）。受控 `setAttribute('open')` 与内部点击/hover/键盘触发都会派发（首帧不派发） |
| `oas-select` | 选择某项，`detail: { value, kind?, checked? }`。`kind` 仅动作项（`kind: "action"`）出现，值为 `"action"`；checkbox 项带 `checked`（切换后勾选态）；radio 项 `detail.kind` 不出现 |

| 名称 | 说明 |
| --- | --- |
| `end` | 栏尾装饰位（如头像）：`<div slot="end">` 有内容时显示，键盘导航跳过 |
| `start` | 栏首装饰位（如 logo）：`<div slot="start">` 有内容时显示，键盘导航跳过 |

### oas-menubar-item

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `access-key` | Alt 访问键（单字符）；缺省取 label 首个 ASCII 字母 | — | — |
| `danger` | 破坏性项：红色语义（删除/退出等危险操作） | — | — |
| `disabled` | 禁用该项 | — | — |
| `href` | 链接地址：有 href 时渲染为原生 `<a>`（真实跳转 + 照常派发 `oas-select`） | — | — |
| `icon` | 前置图标（`@oas-ui/icons` 注册表图标名） | — | — |
| `icon-color` | 图标颜色：显式固定该色（优先于选中/禁用态默认色）；缺省 currentColor 随文字色 | — | — |
| `indeterminate` | checkbox 半选态：渲染 `aria-checked="mixed"` + 方块内横线减号（仅 `kind="checkbox"` 项生效） | — | — |
| `kind` | 叶子项语义：`radio`（默认，可勾选）/ `action`（动作项，无勾选态、不写回 value）/ `checkbox`（多选勾选，value 数组勾选集） | — | — |
| `rel` | 链接 rel（配合 href） | — | — |
| `shortcut` | 快捷键提示（如 `"Ctrl+N"`）：右侧 kbd 提示 + document 级 keydown 命中触发 select | — | — |
| `target` | 链接 target（配合 href） | — | — |
| `value` | 选中值（子元素声明式通道的数据载体字段） | — | — |

| 名称 | 说明 |
| --- | --- |
| 默认 | 菜单栏项 label 内容（默认插槽文本）；直接子元素 `<oas-menubar-item>`/`<oas-menubar-group>`/`<oas-menubar-divider>` 递归为子菜单 children |

### oas-menubar-group

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `label` | 分组标题（组标题小字、次要色、不可点） | — | — |
| `value` | radio 组 id（组内点选只更新该组选中值） | — | — |

| 名称 | 说明 |
| --- | --- |
| 默认 | 组内菜单项：子元素 `<oas-menubar-item>`/`<oas-menubar-group>`/`<oas-menubar-divider>` 平铺同层 |

### oas-menubar-divider

| 名称 | 说明 |
| --- | --- |
| 默认 | 分隔线数据载体（无属性，宿主解析为 `type: "divider"`） |

> **事件 detail 说明**：`oas-select` 的 `detail` 是组件内部对象（含 `value`/`kind`），**不是**原生 `Event`——不能 `preventDefault()` 或直接读原生 `event.target`。如需原生事件对象，在事件监听器上用外层参数（如 `addEventListener('oas-select', (e) => ...)` 的 `e` 是 CustomEvent，`e.detail` 才是组件数据）。

`MenubarItem` 字段（继承 `MenuItem`）：

| 字段       | 说明                                                        | 类型     |
| ---------- | ----------------------------------------------------------- | -------- |
| `label`    | 菜单文字                                                    | `string` |
| `value`    | 选中值（items JSON 中声明；渲染后宿主标签上对应 `data-value` 小写属性，供内部定位，宿主不应依赖其作为公共 API） | `string` |
| `kind`     | 叶子项语义：`radio`（默认，可勾选、参与 value）/ `action`（动作项，无勾选态、点击不写回 value） | `string` |
| `shortcut` | 快捷键提示（如 `"Ctrl+N"`）；渲染为右侧 kbd，并自动绑定 `document` 级 keydown（命中即选择该项、`preventDefault`） | `string` |
| `accessKey`| `Alt` 访问键（单字符）；缺省取 label 首个 ASCII 字母        | `string` |
| `disabled` | 禁用                                                        | `boolean`|
| `children` | 子菜单项（可继续嵌套，级联向右浮出）                        | `MenubarItem[]` |

键盘：顶级 `←`/`→` 切换、`↓`/`Enter` 打开子菜单、`Esc` 关闭；子菜单内 `↑`/`↓` 移动、`→` 进入级联、`←` 返回父级；`Home`/`End` 跳转。`Alt` 单独按下聚焦菜单栏，`Alt + 访问键` 打开对应顶级菜单。子菜单打开时 `Tab` 在子项间循环（焦点陷阱），`roving tabindex` 只保留当前顶级项可 Tab 到达。
