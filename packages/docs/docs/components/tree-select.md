# TreeSelect 树形选择器

树形结构选择，支持父子级联多选、搜索过滤、懒加载与标签化回显。

## 单选

<DemoBlock title="单选">
  <oas-tree-select placeholder="请选择节点" options='[{"label":"前端","value":"fe","children":[{"label":"框架","value":"framework","children":[{"label":"Vue","value":"vue"},{"label":"React","value":"react"}]},{"label":"样式","value":"css"}]},{"label":"后端","value":"be","children":[{"label":"Node","value":"node"}]}]'></oas-tree-select>
</DemoBlock>

点击节点即选中并关闭下拉，支持展开 / 收起子级。键盘：`Tab` 聚焦、`Enter/Space/↑/↓` 展开、`↑/↓` 移动高亮、`Enter/Space` 选中、`→/←` 展开收起、`Esc` 关闭。

## 多选（父子联动 + 标签回显）

<DemoBlock title="多选（multiple）">
  <oas-tree-select id="ts-multi" multiple placeholder="可选择多个节点" options='[{"label":"前端","value":"fe","children":[{"label":"框架","value":"framework","children":[{"label":"Vue","value":"vue"},{"label":"React","value":"react"}]},{"label":"样式","value":"css"}]},{"label":"后端","value":"be","children":[{"label":"Node","value":"node"}]}]'></oas-tree-select>
</DemoBlock>

多选时选中父级会级联选中全部子级，再次点击取消；父级节点呈「全选 / 半选」态。选中项以标签（chip）回显在触发器内：点击标签上的 `×` 可单个移除；触发器聚焦时按 `Backspace` 删除末尾一项。

> 视觉变更说明：v2.4 起多选回显从「文本拼接 + 等N项」改为标签形态（支持单个移除的通用形态），属于破坏性视觉变更；如需折叠展示请搭配 `max-tag-count`。

## 搜索过滤（filterable）

<DemoBlock title="搜索过滤（filterable）">
  <oas-tree-select id="ts-search" filterable placeholder="点击展开后搜索节点" options='[{"label":"前端","value":"fe","children":[{"label":"框架","value":"framework","children":[{"label":"Vue","value":"vue"},{"label":"React","value":"react"}]},{"label":"样式","value":"css"}]},{"label":"后端","value":"be","children":[{"label":"Node","value":"node"}]}]'></oas-tree-select>
  <span id="ts-search-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

设置 `filterable` 后面板顶部出现独立搜索框：命中节点与其祖先（路径上下文）、全部后代一并显示（宽松匹配）；无匹配时显示空态。搜索框内 `↑/↓` 移动高亮（落在首个命中节点）、`Enter` 选中、`Esc` 关闭面板并还焦触发器。选中后默认清空搜索词，`reserve-keyword` 可保留。输入时派发 `oas-search`（`detail.value` 为关键词，可配合 `loading` 做远程搜索）。自定义匹配逻辑：`el.filter = (label, option) => boolean`。

## 父子解联（check-strictly）

<DemoBlock title="父子解联（check-strictly）">
  <div style="display: flex; gap: var(--oas-space-3); flex-wrap: wrap; width: 100%">
    <div>
      <oas-tree-select id="ts-cascade" multiple placeholder="级联（默认）" options='[{"label":"前端","value":"fe","children":[{"label":"框架","value":"framework","children":[{"label":"Vue","value":"vue"},{"label":"React","value":"react"}]},{"label":"样式","value":"css"}]}]'></oas-tree-select>
      <p style="margin: 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">级联：值 = <span id="ts-cascade-out">—</span></p>
    </div>
    <div>
      <oas-tree-select id="ts-strictly" multiple check-strictly placeholder="父子解联" options='[{"label":"前端","value":"fe","children":[{"label":"框架","value":"framework","children":[{"label":"Vue","value":"vue"},{"label":"React","value":"react"}]},{"label":"样式","value":"css"}]}]'></oas-tree-select>
      <p style="margin: 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">解联：值 = <span id="ts-strictly-out">—</span></p>
    </div>
  </div>
</DemoBlock>

`multiple` 默认父子级联（勾选父级即勾选全部子级）。设置 `check-strictly` 后勾选互不级联、无半选态，`value` 即勾选集合本身（`check-strategy` 此时不再生效）——覆盖「任意层级独立多选」场景。

## 勾选策略（check-strategy）

`check-strategy` 控制多选时写入 `value` 的节点集合：`all`（默认）父级与子级全部进入值；`parent` 只保留父级（子级全选时以父级为代表）；`child` 只保留叶子节点。三种策略共用同一套级联勾选逻辑，仅对外值不同：

<DemoBlock title="勾选策略对比（all / parent / child）">
  <div style="display: flex; gap: var(--oas-space-3); flex-wrap: wrap; width: 100%">
    <div>
      <oas-tree-select id="ts-strategy-all" multiple check-strategy="all" placeholder="all：勾选父级 → 父级+全部子级" options='[{"label":"前端","value":"fe","children":[{"label":"框架","value":"framework","children":[{"label":"Vue","value":"vue"},{"label":"React","value":"react"}]},{"label":"样式","value":"css"}]},{"label":"后端","value":"be","children":[{"label":"Node","value":"node"}]}]'></oas-tree-select>
      <p style="margin: 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">all：值 = <span id="ts-out-all">—</span></p>
    </div>
    <div>
      <oas-tree-select id="ts-strategy-parent" multiple check-strategy="parent" placeholder="parent：勾选父级 → 只父级" options='[{"label":"前端","value":"fe","children":[{"label":"框架","value":"framework","children":[{"label":"Vue","value":"vue"},{"label":"React","value":"react"}]},{"label":"样式","value":"css"}]},{"label":"后端","value":"be","children":[{"label":"Node","value":"node"}]}]'></oas-tree-select>
      <p style="margin: 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">parent：值 = <span id="ts-out-parent">—</span></p>
    </div>
    <div>
      <oas-tree-select id="ts-strategy-child" multiple check-strategy="child" placeholder="child：勾选父级 → 只叶子" options='[{"label":"前端","value":"fe","children":[{"label":"框架","value":"framework","children":[{"label":"Vue","value":"vue"},{"label":"React","value":"react"}]},{"label":"样式","value":"css"}]},{"label":"后端","value":"be","children":[{"label":"Node","value":"node"}]}]'></oas-tree-select>
      <p style="margin: 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">child：值 = <span id="ts-out-child">—</span></p>
    </div>
  </div>
</DemoBlock>

勾选「前端」后三个策略的 `value` 分别为：`all` → `["fe","framework","vue","react","css"]`，`parent` → `["fe"]`，`child` → `["vue","react","css"]`（顺序随 demo 数据中「框架」子节点的声明顺序）。`parent` 策略下逐个勾选叶子，待某父级子节点全选后，值自动收敛为该父级。

## 懒加载（lazy / load）

<DemoBlock title="懒加载（lazy + load）">
  <div style="display: flex; gap: var(--oas-space-3); flex-wrap: wrap">
    <oas-tree-select id="ts-lazy" lazy placeholder="展开大区加载城市" options='[{"label":"华东大区","value":"east"},{"label":"华北大区","value":"north"}]'></oas-tree-select>
    <oas-tree-select id="ts-cache" lazy multiple value='["js"]' cache-data='[{"value":"js","label":"江苏"}]' placeholder="cache-data 回显兜底" options='[{"label":"华东大区","value":"east"}]'></oas-tree-select>
  </div>
</DemoBlock>

设置 `lazy` 后，无 `children` 且未标记 `isLeaf` / `loaded` 的节点视为「未加载」：展开时显示 spinner、派发 `oas-load`（`detail.value`）并调用 `el.load({ value })`；宿主把子节点合入数据后重新设置 `options`，spinner 随之消失。显式叶子用 `isLeaf: true` 标记。右侧示例：预设了尚未加载的值 `js`，通过 `cache-data`（JSON：`[{ value, label }]`）让回显不显示原始 value。

## 路径回显（show-path）

<DemoBlock title="路径回显（show-path + separator）">
  <div style="display: flex; gap: var(--oas-space-3); flex-wrap: wrap">
    <oas-tree-select value="vue" show-path placeholder="默认分隔符" options='[{"label":"前端","value":"fe","children":[{"label":"框架","value":"framework","children":[{"label":"Vue","value":"vue"},{"label":"React","value":"react"}]}]}]'></oas-tree-select>
    <oas-tree-select value="vue" show-path separator="-" placeholder="自定义分隔符" options='[{"label":"前端","value":"fe","children":[{"label":"框架","value":"framework","children":[{"label":"Vue","value":"vue"},{"label":"React","value":"react"}]}]}]'></oas-tree-select>
  </div>
</DemoBlock>

`show-path` 让选中项按「根 → 自身」的完整路径回显（如 `前端 / 框架 / Vue`），用于两个子树存在同名节点时的消歧；`separator` 自定义分隔符（默认 `" / "`）。

## 多选标签管理（max-tag-count / max）

<DemoBlock title="标签折叠与多选上限">
  <oas-tree-select id="ts-tags" multiple max-tag-count="2" placeholder="max-tag-count=2，超出折叠" options='[{"label":"前端","value":"fe","children":[{"label":"Vue","value":"vue"},{"label":"React","value":"react"}]},{"label":"后端","value":"be","children":[{"label":"Node","value":"node"}]},{"label":"算法","value":"algo"}]'></oas-tree-select>
  <p style="margin: 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">值 = <span id="ts-tags-out">—</span></p>
  <oas-tree-select id="ts-max" multiple check-strictly max="3" placeholder="max=3，达上限后未选项禁用" options='[{"label":"前端","value":"fe","children":[{"label":"Vue","value":"vue"},{"label":"React","value":"react"}]},{"label":"后端","value":"be"},{"label":"算法","value":"algo"}]'></oas-tree-select>
  <p style="margin: 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">值 = <span id="ts-max-out">—</span></p>
</DemoBlock>

`max-tag-count` 控制触发器内最多显示的标签数，超出折叠为 `+N`（悬浮 title 列出隐藏项）；`max` 限制可选节点数（按勾选数量计），达到上限后未勾选节点呈禁用态、已勾选仍可取消。

## 可清空与前后缀（clearable / prefix / suffix）

<DemoBlock title="clearable + prefix / suffix">
  <div style="display: flex; gap: var(--oas-space-3); flex-wrap: wrap">
    <oas-tree-select clearable value="vue" prefix="部门" suffix="必填" placeholder="可清空" options='[{"label":"前端","value":"fe","children":[{"label":"Vue","value":"vue"},{"label":"React","value":"react"}]}]'></oas-tree-select>
  </div>
</DemoBlock>

`clearable` 有值时触发器显示清空按钮（点击清空并派发 `oas-clear`）；`prefix` / `suffix` 为触发器内前后缀文本，也可用 `template[slot="prefix"]` / `[slot="suffix"]` 插槽自定义内容。

## 尺寸与校验态（size / status）

<DemoBlock title="size 三档 + status 校验态">
  <div style="display: flex; gap: var(--oas-space-3); flex-wrap: wrap; align-items: center">
    <oas-tree-select size="small" placeholder="small" options='[{"label":"Vue","value":"vue"}]'></oas-tree-select>
    <oas-tree-select placeholder="medium（默认）" options='[{"label":"Vue","value":"vue"}]'></oas-tree-select>
    <oas-tree-select size="large" placeholder="large" options='[{"label":"Vue","value":"vue"}]'></oas-tree-select>
    <oas-tree-select status="error" placeholder="error" options='[{"label":"Vue","value":"vue"}]'></oas-tree-select>
    <oas-tree-select status="warning" placeholder="warning" options='[{"label":"Vue","value":"vue"}]'></oas-tree-select>
    <oas-tree-select status="success" placeholder="success" options='[{"label":"Vue","value":"vue"}]'></oas-tree-select>
  </div>
</DemoBlock>

`size`：`small` / `medium`（默认）/ `large`，高度与字号对齐全局尺寸 token；`status`：`error` / `warning` / `success` 校验态描边（`aria-invalid` 宿主属性仍然兼容，等同 error）。

## 字段别名（field-names）

<DemoBlock title="字段别名（field-names）">
  <oas-tree-select id="ts-fields" placeholder="数据字段为 name/id/subs" field-names='{"label":"name","value":"id","children":"subs","disabled":"off"}' options='[{"name":"前端","id":"fe","subs":[{"name":"Vue","id":"vue"},{"name":"内部锁定","id":"lock","off":true}]},{"name":"后端","id":"be"}]'></oas-tree-select>
</DemoBlock>

后端数据字段名不一致时，用 `field-names`（JSON）声明 `label` / `value` / `children` / `disabled` 到原始字段的映射，无需在宿主侧转换整棵树。

## 受控开合（open）

<DemoBlock title="受控开合（open + oas-open-change）">
  <oas-tree-select id="ts-open" open="" placeholder="open 属性受控" options='[{"label":"前端","value":"fe","children":[{"label":"Vue","value":"vue"},{"label":"React","value":"react"}]}]'></oas-tree-select>
  <oas-button id="ts-open-btn" size="small">切换 open</oas-button>
  <span id="ts-open-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

`open` 属性存在即受控（值为 `false` 表示受控关闭）：内部点击不再直接改开合，只派发 `oas-open-change`（`detail.open`），由宿主回写 `open` 属性决定；未设置 `open` 时为非受控（开合同样派发该事件，便于宿主感知首开做数据预载）。

## 展开行为（default-expand-all / tree-lines / expand-trigger）

<DemoBlock title="默认全展 / 树线 / 点击节点展开">
  <div style="display: flex; gap: var(--oas-space-3); flex-wrap: wrap">
    <oas-tree-select id="ts-expand-all" default-expand-all tree-lines placeholder="默认全展 + 树线" options='[{"label":"前端","value":"fe","children":[{"label":"框架","value":"framework","children":[{"label":"Vue","value":"vue"},{"label":"React","value":"react"}]},{"label":"样式","value":"css"}]},{"label":"后端","value":"be","children":[{"label":"Node","value":"node"}]}]'></oas-tree-select>
    <oas-tree-select expand-trigger="node" placeholder="点击父级标签同时展开" options='[{"label":"前端","value":"fe","children":[{"label":"框架","value":"framework","children":[{"label":"Vue","value":"vue"}]}]},{"label":"后端","value":"be"}]'></oas-tree-select>
  </div>
</DemoBlock>

`default-expand-all` 首次打开默认展开全部节点（显式设置 `expanded` 属性时以 `expanded` 为准）；`tree-lines` 显示层级缩进引导线；`expand-trigger="node"` 时点击父级标签在选中之外同时展开（默认 `toggle` 仅箭头展开）。

## 自定义节点渲染

<DemoBlock title="oas-node-render 事件">
  <oas-tree-select id="ts-node" placeholder="子节点数徽标" options='[{"label":"前端","value":"fe","children":[{"label":"Vue","value":"vue"},{"label":"React","value":"react"}]},{"label":"后端","value":"be","children":[{"label":"Node","value":"node"}]}]'></oas-tree-select>
</DemoBlock>

<DemoBlock title="template[slot=node] 模板">
  <oas-tree-select id="ts-node-tpl" v-pre placeholder="自定义节点模板" options='[{"label":"前端","value":"fe","children":[{"label":"Vue","value":"vue"},{"label":"React","value":"react"}]},{"label":"设计","value":"design"}]'>
    <template slot="node">
      <span style="display: inline-flex; align-items: center; gap: var(--oas-space-1); min-width: 0; color: var(--oas-color-primary)">
        <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <circle cx="8" cy="8" r="5" fill="none" stroke="currentColor" stroke-width="1.5"/>
        </svg>
        <span data-node-label style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap"></span>
      </span>
    </template>
  </oas-tree-select>
</DemoBlock>

两个通道：监听 `oas-node-render`（`detail: { node, element, level, expanded, selected, checked }`）在事件里改写 `element`；或用 `template[slot="node"]` 提供静态骨架、`[data-node-label]` 自动绑定节点 label（与 oas-tree 通道一致）。树的 ARIA（`treeitem` / `aria-level`）不受自定义渲染影响。

## 面板头尾与加载态（header / footer / loading / empty）

<DemoBlock title="面板头尾插槽 + loading 遮罩">
  <oas-tree-select id="ts-panel" v-pre filterable loading placeholder="面板头尾 + 加载遮罩" options='[{"label":"前端","value":"fe","children":[{"label":"Vue","value":"vue"}]}]'>
    <template slot="header"><span style="font-weight: 600">选择成员</span></template>
    <template slot="footer"><span>数据每 5 分钟刷新</span></template>
  </oas-tree-select>
  <oas-button id="ts-loading-btn" size="small">切换 loading</oas-button>
</DemoBlock>

`template[slot="header"]` / `[slot="footer"]` 在面板顶部 / 底部插入任意内容；`loading` 显示面板加载遮罩（常与远程搜索、懒加载配合）；空态文案可用 `empty` 属性或 `template[slot="empty"]` 插槽自定义（默认走内置多语言文案）。

## 扁平数据（宿主工具函数）

<DemoBlock title="后端平表 {id, pId} → 树">
  <oas-tree-select id="ts-flat" placeholder="平表数据组合示例" options='[]'></oas-tree-select>
</DemoBlock>

组件不提供扁平数据属性——后端平表在宿主侧一行 reduce 即可转树（零摩擦），本页示例的数据转换函数见下方脚本：

## 预设值

<DemoBlock title="预设值（value）">
  <oas-tree-select value="vue" options='[{"label":"前端","value":"fe","children":[{"label":"框架","value":"framework","children":[{"label":"Vue","value":"vue"},{"label":"React","value":"react"}]}]}]'></oas-tree-select>
</DemoBlock>

## 受控展开（expanded）

`expanded` 为 JSON 数组，声明展开节点的 value 集合（受控通道）：外部修改属性即时反映到下拉树。以下预设展开「前端 → 框架」，并用按钮外部驱动：

<DemoBlock title="受控展开（expanded）">
  <oas-tree-select id="tree-expanded" expanded='["fe","framework"]' placeholder="点击查看预展开节点" options='[{"label":"前端","value":"fe","children":[{"label":"框架","value":"framework","children":[{"label":"Vue","value":"vue"},{"label":"React","value":"react"}]},{"label":"样式","value":"css"}]},{"label":"后端","value":"be","children":[{"label":"Node","value":"node"}]}]'></oas-tree-select>
  <oas-button id="tree-expand-all" size="small">全部展开</oas-button>
  <oas-button id="tree-collapse-all" size="small">全部收起</oas-button>
</DemoBlock>

预设 `expanded='["fe","framework"]'` 使首次展开下拉时「前端」「框架」已展开；点击「全部展开」外部写入 `expanded='["fe","framework","be"]'`，全部收起写入 `'[]'`，下拉打开时即时重渲染。

## 大数据量（虚拟滚动）

<DemoBlock title="万级节点虚拟滚动">
  <oas-tree-select id="ts-virtual" multiple virtual height="288" item-height="36" expanded='["dept-0"]' placeholder="点击展开万级部门树" options='[]'></oas-tree-select>
  <oas-button id="ts-expand-all" size="small">全部展开</oas-button>
  <oas-button id="ts-collapse-all" size="small">全部收起</oas-button>
</DemoBlock>

设置 `virtual` 开启虚拟滚动（搭配 `height` 视口高度、`item-height` 行高）：下拉复用 `oas-virtual-list` 只渲染可见窗口，10100 个节点（100 部门 × 100 成员）滚动流畅；键盘 `↑/↓` 移动高亮、`Enter` 勾选、`→/←` 展开收起，`aria-activedescendant` 随窗口滚动保持有效。`filterable` 与虚拟滚动可叠加（过滤结果进窗口渲染）。数据由脚本注入（`options` 属性通道），展开集合受 `expanded` 属性控制，点击「全部展开」外部写入全量节点集合。

## 弹层定位（滚动容器）

<DemoBlock title="滚动容器内使用">
  <div style="height: 160px; overflow: auto; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-3)">
    <p style="margin: 0 0 var(--oas-space-2); color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">overflow 容器内的树选择器：</p>
    <oas-tree-select id="ts-scroll" placeholder="展开不被容器裁剪" options='[{"label":"前端","value":"fe","children":[{"label":"Vue","value":"vue"},{"label":"React","value":"react"}]},{"label":"后端","value":"be"}]'></oas-tree-select>
    <p style="height: 220px; margin: var(--oas-space-3) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">↓ 向下滚动：弹层以 fixed 定位锚定触发器，不随容器裁剪；视口空间不足时自动向上翻转。</p>
  </div>
</DemoBlock>

下拉面板使用 `fixed` 定位 + 视口计算锚定触发器下方（宽度对齐触发器，空间不足自动翻转），在模态、滚动容器内不会被 `overflow` 裁剪。定位微调可走 `::part(dropdown)`。

## 禁用

<DemoBlock title="禁用">
  <oas-tree-select disabled value="vue" placeholder="禁用" options='[{"label":"前端","value":"fe","children":[{"label":"Vue","value":"vue"}]}]'></oas-tree-select>
</DemoBlock>

## 空态

<DemoBlock title="无数据">
  <oas-tree-select placeholder="暂无数据" options='[]'></oas-tree-select>
</DemoBlock>

<DemoBlock title="自定义空态（empty）+ 保留搜索词（reserve-keyword）">
  <oas-space size="large" wrap>
    <oas-tree-select placeholder="自定义空态文案" empty="没有可选节点，先去创建" options='[]'></oas-tree-select>
    <oas-tree-select filterable reserve-keyword placeholder="选中后搜索词保留" options='[{"label":"前端","value":"fe","children":[{"label":"Vue","value":"vue"},{"label":"React","value":"react"}]}]'></oas-tree-select>
  </oas-space>
</DemoBlock>

## 事件

<DemoBlock title="变化事件">
  <oas-tree-select id="tree-event" multiple placeholder="选择后触发 oas-change" options='[{"label":"前端","value":"fe","children":[{"label":"Vue","value":"vue"},{"label":"React","value":"react"}]},{"label":"后端","value":"be","children":[{"label":"Node","value":"node"}]}]'></oas-tree-select>
  <span id="tree-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 220px"></span>
</DemoBlock>

监听 `oas-change`，`detail.value` 单选为字符串、多选为数组；`detail.labels` 为按值顺序的回显 label 数组（`show-path` 时为路径），宿主需要「值 + label」时从这里取，无需对象值绑定。其余事件：`oas-clear`（清空，`detail.value` 为清空前的值）、`oas-search`（搜索输入）、`oas-load`（懒加载）、`oas-open-change`（开合）、`oas-node-render`（节点渲染）。

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const echo = (elId, outId) => {
    const el = document.getElementById(elId)
    const out = document.getElementById(outId)
    el?.addEventListener('oas-change', (e) => {
      const v = Array.isArray(e.detail.value) ? e.detail.value : [e.detail.value]
      out.textContent = `[${v.join(', ')}]`
    })
  }

  // 搜索过滤 demo：关键词反馈
  const tsSearch = document.getElementById('ts-search')
  const tsSearchOut = document.getElementById('ts-search-out')
  tsSearch?.addEventListener('oas-search', (e) => {
    tsSearchOut.textContent = e.detail.value ? `搜索：${e.detail.value}` : ''
  })

  // 级联 vs 解联 / 勾选策略 / 标签管理 demo：值回显
  for (const [elId, outId] of [
    ['ts-cascade', 'ts-cascade-out'],
    ['ts-strictly', 'ts-strictly-out'],
    ['ts-strategy-all', 'ts-out-all'],
    ['ts-strategy-parent', 'ts-out-parent'],
    ['ts-strategy-child', 'ts-out-child'],
    ['ts-tags', 'ts-tags-out'],
    ['ts-max', 'ts-max-out'],
  ]) {
    echo(elId, outId)
  }

  // 懒加载 demo：展开大区后延时回填城市（宿主负责数据管理，重设 options 后 spinner 消失）
  const tsLazy = document.getElementById('ts-lazy')
  if (tsLazy) {
    tsLazy.load = ({ value }) => {
      setTimeout(() => {
        const children =
          value === 'east'
            ? [
                { label: '上海', value: 'sh', isLeaf: true },
                { label: '江苏', value: 'js', isLeaf: true },
              ]
            : [{ label: '北京', value: 'bj', isLeaf: true }]
        const current = JSON.parse(tsLazy.getAttribute('options') || '[]')
        tsLazy.options = current.map((n) => (n.value === value ? { ...n, children } : n))
      }, 500)
    }
  }

  // 受控开合 demo：宿主回写 open 属性
  const tsOpen = document.getElementById('ts-open')
  const tsOpenOut = document.getElementById('ts-open-out')
  let openState = true
  document.getElementById('ts-open-btn')?.addEventListener('click', () => {
    openState = !openState
    tsOpen?.setAttribute('open', openState ? '' : 'false')
  })
  tsOpen?.addEventListener('oas-open-change', (e) => {
    tsOpenOut.textContent = `oas-open-change: ${e.detail.open}`
  })

  // 面板 loading demo：外部切换 loading 属性
  const tsPanel = document.getElementById('ts-panel')
  document.getElementById('ts-loading-btn')?.addEventListener('click', () => {
    if (tsPanel?.hasAttribute('loading')) tsPanel.removeAttribute('loading')
    else tsPanel?.setAttribute('loading', '')
  })

  // 自定义节点 demo：oas-node-render 追加子节点数徽标
  const tsNode = document.getElementById('ts-node')
  tsNode?.addEventListener('oas-node-render', (e) => {
    const { node, element } = e.detail
    if (node.children?.length) {
      const badge = document.createElement('span')
      badge.textContent = String(node.children.length)
      badge.style.cssText =
        'margin-inline-start: var(--oas-space-2); flex: none; font-size: var(--oas-font-size-xs); color: var(--oas-color-text-secondary)'
      element.appendChild(badge)
    }
  })

  // 扁平数据 demo：平表 {id, pId} → 树（宿主侧工具函数，扁平数据直吃的等价能力）
  const flatNodes = [
    { id: 'fe', pId: '', name: '前端' },
    { id: 'framework', pId: 'fe', name: '框架' },
    { id: 'vue', pId: 'framework', name: 'Vue' },
    { id: 'react', pId: 'framework', name: 'React' },
    { id: 'be', pId: '', name: '后端' },
  ]
  const toTree = (flat) => {
    const byId = new Map()
    for (const n of flat) byId.set(n.id, { label: n.name, value: n.id })
    const roots = []
    for (const n of flat) {
      const node = byId.get(n.id)
      const parent = n.pId ? byId.get(n.pId) : undefined
      if (parent) {
        ;(parent.children = parent.children || []).push(node)
      } else {
        roots.push(node)
      }
    }
    return roots
  }
  const tsFlat = document.getElementById('ts-flat')
  if (tsFlat) tsFlat.options = toTree(flatNodes)

  // 事件 demo：oas-change 反馈
  const el = document.getElementById('tree-event')
  const out = document.getElementById('tree-output')
  el?.addEventListener('oas-change', (e) => {
    out.textContent = `oas-change: [${e.detail.value.join(', ')}] / labels: [${e.detail.labels.join(', ')}]`
  })

  // 万级虚拟滚动 demo：注入 100 部门 × 100 成员 = 10100 节点，外部驱动展开集合
  const tsVirtual = document.getElementById('ts-virtual')
  if (tsVirtual) {
    const roots = Array.from({ length: 100 }, (_, i) => ({
      label: `部门 ${i}`,
      value: `dept-${i}`,
      children: Array.from({ length: 100 }, (_, j) => ({
        label: `成员 ${i}-${j}`,
        value: `m-${i}-${j}`,
      })),
    }))
    tsVirtual.options = roots
    document.getElementById('ts-expand-all')?.addEventListener('click', () => {
      tsVirtual.setAttribute('expanded', JSON.stringify(roots.map((r) => r.value)))
    })
    document.getElementById('ts-collapse-all')?.addEventListener('click', () => {
      tsVirtual.setAttribute('expanded', '[]')
    })
  }

  // expanded（受控展开）demo：外部驱动展开节点集合
  document.getElementById('tree-expand-all')?.addEventListener('click', () => {
    document.getElementById('tree-expanded')?.setAttribute('expanded', '["fe","framework","be"]')
  })
  document.getElementById('tree-collapse-all')?.addEventListener('click', () => {
    document.getElementById('tree-expanded')?.setAttribute('expanded', '[]')
  })
})
</script>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `cache-data` | 未知值回显兜底缓存（JSON），value 无匹配时按缓存出 label | `string` | `[]` |
| `check-strategy` | 多选勾选策略：`all`（默认）父级与子级全部进入值；`parent` 只保留父级（子级全选时以父级为代表）；`child` 只保留叶子节点 | `string` | `all` |
| `check-strictly` | 多选父子勾选解联（勾选父级不联动子级） | `boolean` | — |
| `clearable` | 可清空（派发 oas-clear） | `boolean` | — |
| `default-expand-all` | 默认展开全部节点（expanded 属性缺席时生效，首次内部切换后冻结） | `boolean` | — |
| `disabled` | 禁用 | `boolean` | — |
| `empty` | 空态文案/内容自定义 | `string` | — |
| `expand-trigger` | 节点展开触发：`toggle`（默认，仅箭头）/ `node`（点节点行展开） | `string` | `toggle` |
| `expanded` | 展开节点的 value 集合（JSON 数组，受控） | `string` | — |
| `field-names` | 字段别名 JSON（如 `{"label":"name","value":"id","children":"subs"}`；原始 option 不拷贝映射，node-render 拿到宿主原对象） | `string` | — |
| `filterable` | 可搜索（面板顶部独立搜索框） | `boolean` | — |
| `height` | 虚拟滚动视口高度（px）；与 `virtual` 搭配生效 | `string` | `288` |
| `item-height` | 虚拟滚动每行固定高度（px） | `string` | `36` |
| `lazy` | 懒加载（配 `el.load` 函数 property，节点含 isLeaf 标记） | `boolean` | — |
| `loading` | 面板加载态（懒加载/远程搜索时） | `boolean` | — |
| `max` | 多选上限（按勾选集合计） | `string` | — |
| `max-tag-count` | 多选标签按数量折叠 +N（带 title 列隐藏项） | `string` | — |
| `multiple` | 多选 + 父子级联 | `boolean` | — |
| `open` | 受控开合（存在即受控；`"false"`=受控关），翻转派 oas-open-change | `string` | — |
| `options` | 树形选项，JSON 数组，支持 `children` / `disabled` | `TreeOption[] \| string` | `[]` |
| `placeholder` | 占位提示 | — | — |
| `prefix` | 触发器前缀内容（slot="prefix" 可分发任意内容） | `string` | — |
| `reserve-keyword` | 选中节点后保留搜索关键词（默认清空） | `boolean` | — |
| `separator` | 路径分隔符（默认 ` / `，配 show-path） | `string` | ` / ` |
| `show-path` | 回显完整路径（初始回显与多选 labels 走路径） | `boolean` | — |
| `size` | 尺寸档位 `small` / `medium`（默认）/ `large` | `string` | `medium` |
| `status` | 校验态：`error` / `warning` / `success` | `string` | — |
| `suffix` | 触发器后缀内容（slot="suffix" 同上） | `string` | — |
| `tree-lines` | 树线缩进引导线 | `boolean` | — |
| `value` | 选中值（多选为 JSON 数组） | `string` | `[]` |
| `virtual` | 开启虚拟滚动：大数据量下拉仅渲染可见窗口（复用 oas-virtual-list），键盘/ARIA 保持 | `boolean` | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-change` | 选择变化，`detail: { value }` |
| `oas-clear` | 清空时派发，`detail` 为清空前的值 |
| `oas-load` | 懒加载节点展开加载时派发，`detail: { value }` |
| `oas-node-render` | 节点渲染时派发（自定义节点渲染通道），`detail: { node, element, level, expanded, selected, checked }` |
| `oas-open-change` | 开合状态翻转，`detail: { open }` |
| `oas-search` | 搜索输入，`detail: { value }` |

### 插槽

| 名称 | 说明 |
| --- | --- |
| `template[slot="empty"]` | 自定义空态内容 |
| `template[slot="node"]` | 自定义节点模板（`[data-node-label]` 绑定标签） |
