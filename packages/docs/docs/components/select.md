# Select 选择器

下拉选择器，支持单选、多选、分组、可清空、远程搜索与自定义创建，尺寸/校验态/受控展开/多选上限齐备，键盘可操作。

## 单选

<DemoBlock title="单选">
  <oas-select placeholder="请选择水果" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"},{"label":"草莓","value":"strawberry"}]'></oas-select>
</DemoBlock>

## 无障碍名称（label）

<DemoBlock title="label（可访问名称）">
  <oas-select id="select-label-set" label="所属城市" placeholder="请选择城市" options='[{"label":"北京","value":"bj"},{"label":"上海","value":"sh"}]'></oas-select>
  <oas-select id="select-label-fallback" placeholder="无 label，回退占位文本" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"}]'></oas-select>
  <span id="select-label-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 280px"></span>
</DemoBlock>

`label` 作为触发器的可访问名称（`aria-label`）来源：设置后读屏朗读该名称并优先于占位文本；未设置时回退 `placeholder`。字段标签的可视渲染位由 `oas-form-item` 承担，`label for` 原生关联（点击聚焦）走 form-associated 通道。

## 预设值

<DemoBlock title="预设值（value）">
  <oas-select value="banana" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"}]'></oas-select>
</DemoBlock>

## 多选

<DemoBlock title="多选（multiple）">
  <oas-select multiple value='["apple","banana","orange","strawberry"]' placeholder="可多选" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"},{"label":"草莓","value":"strawberry"},{"label":"西瓜","value":"watermelon"}]'></oas-select>
</DemoBlock>

多选时 `value` 为 JSON 数组，选中项以标签展示，可单独移除；标签默认换行展示、触发器随内容增高（不设置 `max-tag-count` 时不会折叠）。

## 隐藏已选项（hide-selected）

<DemoBlock title="hide-selected：多选时已选选项从下拉隐藏">
  <oas-select id="select-hide-selected" multiple hide-selected clearable placeholder="选中的不再出现" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"},{"label":"草莓","value":"strawberry"}]'></oas-select>
  <span id="select-hide-selected-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 200px"></span>
</DemoBlock>

`hide-selected`（仅多选生效）让已选选项从下拉列表隐藏——列表只展示「还可以选什么」，适合选项较多的多选场景；清空（clearable）或移除标签后选项自动回到列表。全部选完时下拉显示空态。

## 禁用

<DemoBlock title="禁用">
  <oas-select disabled value="apple" placeholder="禁用" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"}]'></oas-select>
</DemoBlock>

## 尺寸

<DemoBlock title="尺寸（size）">
  <oas-space size="small">
    <oas-select size="small" placeholder="small" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"}]'></oas-select>
    <oas-select placeholder="medium（默认）" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"}]'></oas-select>
    <oas-select size="large" placeholder="large" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"}]'></oas-select>
  </oas-space>
</DemoBlock>

`size` 支持 `small` / `medium`（默认）/ `large`，控高与字号对齐全局尺寸 token；未显式设置时就近读取 `oas-config-provider` 的 `size` 注入（全局密度联动）。表格内用 `small`、筛选条用 `large` 等场景直接可用。

## 形态

<DemoBlock title="variant 形态">
  <oas-space size="small">
    <oas-select placeholder="outlined（默认）" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"}]'></oas-select>
    <oas-select variant="filled" placeholder="filled 填充" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"}]'></oas-select>
    <oas-select variant="borderless" placeholder="borderless 无框" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"}]'></oas-select>
  </oas-space>
</DemoBlock>

`variant` 对齐 `oas-input` 三值形态：`outlined`（默认描边）/ `filled`（填充底色，聚焦/展开才出边框）/ `borderless`（无框无底色，用于纯文本嵌入或筛选条等低装饰场景）；非法值静默回落默认。`status` 校验态语义色优先于形态底色。

## 校验状态

<DemoBlock title="校验状态（status）">
  <oas-space size="small">
    <oas-select status="success" value="apple" placeholder="success" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"}]'></oas-select>
    <oas-select status="warning" placeholder="warning" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"}]'></oas-select>
    <oas-select status="error" placeholder="error" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"}]'></oas-select>
  </oas-space>
</DemoBlock>

`status` 支持 `success` / `warning` / `error`，联动触发器边框与焦点环颜色；`error` 会同步宿主 `aria-invalid="true"`（屏幕阅读器可识别校验失败），宿主直接设 `aria-invalid` 也能获得同等视觉。常与表单校验联动使用。

## 只读

<DemoBlock title="只读（readonly）与禁用对比">
  <oas-space size="small">
    <oas-select readonly value="banana" placeholder="只读" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"}]'></oas-select>
    <oas-select disabled value="banana" placeholder="禁用" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"}]'></oas-select>
    <oas-select readonly multiple value='["apple","banana"]' placeholder="多选只读" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"}]'></oas-select>
  </oas-space>
</DemoBlock>

`readonly` 与 `disabled` 是两种表单语义：只读可聚焦、可复制、不弹下拉、值照常提交（清空与标签移除入口一并隐藏）；禁用不可聚焦、值不提交。展示「由别处决定的值」用只读，禁用交互用禁用。

## 空态

<DemoBlock title="无数据">
  <oas-select placeholder="暂无选项" options='[]'></oas-select>
</DemoBlock>

选项为空时下拉显示「暂无数据」。

## 自定义空态

<DemoBlock title="自定义空态（empty 插槽）">
  <oas-select searchable placeholder="输入不存在的关键词看空态" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"}]'>
    <template slot="empty">
      <span style="display:inline-flex;align-items:center;gap:4px">🍒 没有找到匹配的水果</span>
    </template>
  </oas-select>
</DemoBlock>

`template[slot="empty"]` 同时覆盖「暂无数据」与「无匹配选项」两处默认文案（走 locale registry），克隆进下拉空态区。

## 可搜索

<DemoBlock title="可搜索（searchable）">
  <oas-select searchable placeholder="输入关键词过滤" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"},{"label":"草莓","value":"strawberry"},{"label":"西瓜","value":"watermelon"}]'></oas-select>
</DemoBlock>

打开下拉后可直接输入过滤，无匹配时显示「无匹配选项」。

## 自定义过滤

<DemoBlock title="自定义过滤（filterMethod）">
  <oas-select id="select-filter" searchable placeholder="试试输入 apple / 果" options='[{"label":"苹果 Apple","value":"apple"},{"label":"香蕉 Banana","value":"banana"},{"label":"橙子 Orange","value":"orange"}]'></oas-select>
</DemoBlock>

默认按 `label` 包含匹配；设置 `el.filterMethod = (query, option) => boolean`（JS property 通道，attribute 传不了函数）可接管本地过滤，`query` 为原始输入、`option` 为完整选项对象。本例（见本页底部脚本）同时匹配 `value` 与 `label`（拼音首字母等自定义规则同理）；`remote` 模式下数据面过滤由宿主负责，`filterMethod` 不生效。

## 搜索输入受控（input-value）

<DemoBlock title="input-value（受控搜索词）">
  <oas-select id="select-input-value" searchable placeholder="输入关键词，属性实时回显" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"}]'></oas-select>
  <span id="select-input-value-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 220px"></span>
</DemoBlock>

`input-value` 让搜索词可控：属性在场即搜索框的真相源（预设/外部更新会同步进搜索框并重过滤）；用户输入写回属性并派发 `oas-input-value-change`（`detail: { value }`），宿主可监听事件也可直接读属性。

## 保留搜索词（reserve-keyword）

<DemoBlock title="reserve-keyword（选中后保留搜索词）">
  <oas-space size="small">
    <oas-select multiple searchable placeholder="默认：选中后清空搜索词" options='[{"label":"苹果","value":"apple"},{"label":"苹果汁","value":"juice"},{"label":"香蕉","value":"banana"}]'></oas-select>
    <oas-select multiple searchable reserve-keyword placeholder="reserve-keyword：保留搜索词" options='[{"label":"苹果","value":"apple"},{"label":"苹果汁","value":"juice"},{"label":"香蕉","value":"banana"}]'></oas-select>
  </oas-space>
</DemoBlock>

多选 + 可搜索时，选中一项后默认清空搜索词（列表恢复全量，方便连续挑选不同项）；设置 `reserve-keyword` 后保留搜索词，适合在同类结果里连续多选。

## 高亮首项（default-active-first-option）

<DemoBlock title="default-active-first-option（展开高亮第一项）">
  <oas-space size="small">
    <oas-select value="orange" placeholder="缺省：高亮当前选中项" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"}]'></oas-select>
    <oas-select value="orange" default-active-first-option placeholder="设置后：高亮第一项" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"}]'></oas-select>
  </oas-space>
</DemoBlock>

设置后展开下拉高亮第一个可见项（回车即选首项），缺省高亮当前选中项。

## 分组

<DemoBlock title="分组（group）">
  <oas-select placeholder="按组浏览" options='[{"group":"温带水果","label":"苹果","value":"apple"},{"group":"温带水果","label":"梨","value":"pear"},{"group":"热带水果","label":"香蕉","value":"banana"},{"group":"热带水果","label":"芒果","value":"mango"},{"label":"其他","value":"other"}]'></oas-select>
</DemoBlock>

<DemoBlock title="分组多选">
  <oas-select multiple placeholder="分组多选" options='[{"group":"温带水果","label":"苹果","value":"apple"},{"group":"温带水果","label":"梨","value":"pear"},{"group":"热带水果","label":"香蕉","value":"banana"},{"group":"热带水果","label":"芒果","value":"mango"}]'></oas-select>
</DemoBlock>

选项带 `group` 字段时按组渲染组标题（不可选），组内选项缩进；键盘 `↑`/`↓` 跨组连续导航。

## 可清空

<DemoBlock title="可清空（clearable）">
  <oas-select clearable value="apple" placeholder="可清空" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"}]'></oas-select>
  <oas-select clearable multiple value='["apple","banana"]' placeholder="多选可清空" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"}]'></oas-select>
</DemoBlock>

有选中值时显示清空按钮，点击清空值并派发 `oas-clear` 与 `oas-change`。

## 触发器前后缀与自定义图标

<DemoBlock title="prefix / suffix / suffix-icon / clear-icon 插槽与 show-arrow">
  <oas-space size="small" direction="vertical">
    <oas-select id="select-affix-demo" placeholder="前缀图标 + 后缀文本" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"}]'>
      <template slot="prefix"><span style="display:inline-flex">📍</span></template>
      <template slot="suffix"><span style="display:inline-flex">城市</span></template>
    </oas-select>
    <oas-select id="select-icons-demo" clearable value="apple" placeholder="自定义下拉箭头与清空图标" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"}]'>
      <template slot="suffix-icon"><span style="display:inline-flex">⌄</span></template>
      <template slot="clear-icon"><span style="display:inline-flex">✕</span></template>
    </oas-select>
    <oas-select id="select-no-arrow" show-arrow="false" placeholder="隐藏下拉箭头（show-arrow）" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"}]'></oas-select>
  </oas-space>
</DemoBlock>

`template[slot="prefix"]` / `template[slot="suffix"]` 渲染进触发器前后缀（图标、单位文本等）；`template[slot="suffix-icon"]` 替换默认下拉箭头（展开时随容器旋转）；`template[slot="clear-icon"]` 替换清空按钮默认 × 图标。`show-arrow="false"` 隐藏默认箭头（无箭头的搜索触发等场景）。

## 远程搜索

<DemoBlock title="远程搜索（remote + loading）">
  <oas-select id="select-remote" remote searchable placeholder="输入关键词模拟远程搜索" options='[]'></oas-select>
  <span id="select-remote-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 180px"></span>
</DemoBlock>

`remote` 模式下组件不做本地过滤，输入派发 `oas-input` 供宿主请求；请求期间由宿主置 `loading` 显示加载占位。示例中模拟 800ms 延迟过滤：

<DemoBlock title="远程加载占位">
  <oas-select remote searchable loading placeholder="loading 占位演示" options='[]'></oas-select>
</DemoBlock>

## 加载文案（loading-text）

<DemoBlock title="loading-text（自定义加载文案）">
  <oas-select remote searchable loading loading-text="数据加载中，请稍候…" placeholder="加载占位自定义文案" options='[]'></oas-select>
</DemoBlock>

`loading-text` 覆盖加载占位的默认文案（缺省走 locale 内置文案），与 `remote` / `loading` 搭配使用。

## 远程搜索防抖

<DemoBlock title="远程搜索防抖（debounce）">
  <oas-select id="select-debounce" remote searchable debounce="300" placeholder="连续输入只派发末次" options='[]'></oas-select>
  <span id="select-debounce-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 220px"></span>
</DemoBlock>

`debounce`（毫秒，默认 `0` 立即派发不干扰现状）只作用于 `remote` 模式的 `oas-input` 事件派发——窗口内连续输入合并为末次一次，宿主免写 `setTimeout` 样板；本地过滤不受影响（始终即时）。

## 标签折叠

<DemoBlock title="标签折叠（max-tag-count）">
  <oas-select multiple max-tag-count="2" value='["apple","banana","orange","strawberry"]' placeholder="超出折叠为 +N" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"},{"label":"草莓","value":"strawberry"},{"label":"西瓜","value":"watermelon"}]'></oas-select>
</DemoBlock>

多选标签默认换行展示、不折叠；仅显式设置 `max-tag-count` 时按数量折叠为 `+N`（悬浮显示剩余项）。

## 提示文案与自适应宽度

<DemoBlock title="hint 提示 / auto-width 自适应宽度">
  <oas-space size="small" direction="vertical">
    <oas-select hint="选择你的常驻城市，可随时修改" placeholder="触发器下方提示文案（hint）" options='[{"label":"北京","value":"bj"},{"label":"上海","value":"sh"}]'></oas-select>
    <oas-select auto-width value="banana" placeholder="auto-width" options='[{"label":"苹果","value":"apple"},{"label":"香蕉 Banana","value":"banana"}]'></oas-select>
  </oas-space>
</DemoBlock>

`hint` 在触发器下方渲染一行提示文案（`aria-describedby` 关联，读屏可达）；`auto-width` 让触发器宽度随选中项/内容自适应收缩（缺省固定 `220px`）。

## 触发器预留最宽选项（reserve-width）

<DemoBlock title="reserve-width + auto-width：切值不抖（点开下拉切换选中项对比）">
  <oas-space size="small" direction="vertical">
    <oas-select id="sel-reserve" reserve-width auto-width value="a" placeholder="选择对齐" options='[{"label":"左对齐","value":"a"},{"label":"居中对齐","value":"b"},{"label":"两端对齐并自动换行","value":"c"}]'></oas-select>
    <oas-select id="sel-narrow" auto-width value="a" placeholder="对照（无预留）" options='[{"label":"左对齐","value":"a"},{"label":"居中对齐","value":"b"},{"label":"两端对齐并自动换行","value":"c"}]'></oas-select>
  </oas-space>
  <div style="margin-top: var(--oas-space-2)">
    <span id="sel-reserve-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
  </div>
</DemoBlock>

`reserve-width`（opt-in）量测全部选项 label 与 placeholder 的最大文本宽，锁定触发器最小宽度：切换选中值时触发器尺寸不抖动。常与 `auto-width` 组合——宽度随内容收缩后由预留值托底（上方第一个 select 锁定到最宽选项，第二个为对照；点开下拉切换选中项即可看到差别）。`options` 属性与子元素声明式通道都参与量测，内容变化自动重测；移除属性解除锁定。文本宽为近似值（触发器余量经 CSS 变量 `--oas-select-reserve-pad` 调整，默认 46px）。

## 多选上限

<DemoBlock title="多选上限（max-count）">
  <oas-space size="small">
    <oas-select id="select-max" multiple max-count="2" placeholder="最多选 2 项" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"},{"label":"草莓","value":"strawberry"}]'></oas-select>
    <oas-tag id="select-max-log" type="warning">超限提示</oas-tag>
  </oas-space>
</DemoBlock>

`multiple` 模式设置 `max-count` 后，选中数达上限时未选项禁用置灰（已选项仍可取消，取消后恢复可选）；点击/键盘尝试超限选择派发 `oas-exceed-limit`（`detail: { value, max }`），本例用它更新提示标签。单选模式 `max-count` 不生效。投票、标签数上限等场景直接可用。

## 允许创建

<DemoBlock title="允许创建（allow-create）">
  <oas-select id="select-create" allow-create searchable placeholder="输入不存在的选项创建" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"}]'></oas-select>
  <span id="select-create-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 220px"></span>
</DemoBlock>

搜索无匹配时显示「创建 xxx」项，点击或回车后以输入值创建新选项并纳入选中，创建时派发 `oas-create`（`detail: { value, label }` 为创建文本）。

## 自定义选项渲染

<DemoBlock title="自定义选项（图标 + 富文本）">
  <oas-select id="select-custom" multiple searchable placeholder="选择带图标的水果" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"},{"label":"草莓","value":"strawberry"}]'></oas-select>
</DemoBlock>

监听 `oas-option-render`（每个选项行）与 `oas-tag-render`（多选标签），`detail.element` 为对应文本容器，宿主可改写为任意内容（图标、富文本）；也可在组件内放 `<template slot="option">` / `<template slot="tag">` 提供静态骨架，`[data-option-label]` / `[data-tag-label]` 节点自动绑定选项/标签文本。

## 大数据量（虚拟滚动）

<DemoBlock title="万级选项虚拟滚动">
  <oas-select id="select-virtual" virtual searchable clearable item-height="36" placeholder="1 万条选项，滚动流畅" options='[]'></oas-select>
</DemoBlock>

设置 `virtual` 后仅渲染可视窗口（复用 `oas-virtual-list` 的窗口计算，首尾 padding 撑起滚动高度），万级选项滚动流畅；`item-height` 可调定高（默认 `36`）。键盘 `↑`/`↓` 导航时窗口自动跟随高亮项，`aria-activedescendant` 保持指向可见项；带 `group` 的选项自动回退全量渲染。

## 下拉高度定制

<DemoBlock title="下拉高度（--oas-select-dropdown-height）">
  <oas-space size="small">
    <oas-select style="--oas-select-dropdown-height: 120px" placeholder="下拉最高 120px" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"},{"label":"草莓","value":"strawberry"},{"label":"西瓜","value":"watermelon"},{"label":"葡萄","value":"grape"}]'></oas-select>
    <oas-select id="select-height-virtual" virtual style="--oas-select-dropdown-height: 160px" placeholder="虚拟模式同样生效" options='[]'></oas-select>
  </oas-space>
</DemoBlock>

下拉最大高度走 CSS 变量 `--oas-select-dropdown-height`（默认 `240px`），宿主覆盖即可调整，不占属性 API；虚拟滚动模式同样跟随（重开下拉生效）。下拉宽度维持对齐触发器（通行做法是面板可更宽，等宽是保守基线）。

## 子元素声明式通道

除 `options` JSON 外，可用 `<oas-option>` 子元素声明式书写选项（对齐原生 `<select><option>` 心智：默认插槽文本为 label，属性对齐 `options` 字段——`value` / `disabled` / `group` 分组标题）。`options` 属性*显式设置时优先*，未设置时解析子元素收敛到同一渲染路径（虚拟滚动 / 分组 / 搜索等能力完全一致）。子元素增删、属性与文本变化会自动重渲染（MutationObserver）。

<DemoBlock title="子元素声明式（对齐原生 select 心智）">
  <oas-space size="small" direction="vertical">
    <oas-select id="select-decl" placeholder="选择水果" value="banana">
      <oas-option value="apple" group="温带水果">苹果</oas-option>
      <oas-option value="banana" group="温带水果">香蕉</oas-option>
      <oas-option value="orange" group="热带水果">橙子</oas-option>
      <oas-option value="mango" group="热带水果">芒果</oas-option>
      <oas-option value="other" disabled>其他（禁用）</oas-option>
    </oas-select>
    <oas-space size="small">
      <oas-button id="select-decl-add" size="small">动态追加选项</oas-button>
      <oas-tag id="select-decl-result" type="info">oas-change: banana</oas-tag>
    </oas-space>
  </oas-space>
</DemoBlock>

## 字段映射（宿主 .map()）

业务数据字段名（`name`/`id`/`team` 等）与组件契约（`label`/`value`）不一致时，用宿主 `.map()` 一行对齐即可，无需字段别名属性——Web Components 的 JSON 序列化边界天然逼宿主过一道组装，字段映射在这一步零成本完成：

<DemoBlock title="业务字段映射（.map() 双通道）">
  <oas-space size="small" direction="vertical">
    <oas-select id="select-map-json" placeholder="options 通道（.map + property 赋值）"></oas-select>
    <oas-select id="select-map-child" placeholder="子元素通道（.map + oas-option）"></oas-select>
  </oas-space>
</DemoBlock>

两个通道等价（本页底部脚本）：`MEMBERS.map((m) => ({ label: m.name, value: m.id }))` 后走 `el.options = ...` property 赋值（setter 反射 attribute），或 `.map()` 生成 `<oas-option>` 子元素逐个追加。

## 下拉头尾插槽

<DemoBlock title="下拉头尾插槽（header / footer）">
  <oas-select id="select-header" multiple placeholder="全选条 + 追加操作" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"}]'>
    <template slot="header">
      <label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;margin:0">
        <input type="checkbox" id="select-header-all" />全选
      </label>
    </template>
    <template slot="footer">
      <button type="button" id="select-header-add" style="appearance:none;border:none;background:transparent;padding:0;color:var(--oas-color-primary);cursor:pointer;font-size:inherit">＋ 追加一项</button>
    </template>
  </oas-select>
</DemoBlock>

`template[slot="header"]` 渲染在搜索框之下、选项之上，`template[slot="footer"]` 渲染在选项之下（全选条、追加按钮等场景）。注意：键盘 `↑`/`↓` 导航不进入头尾区，头尾内的交互内容需可用 Tab 聚焦（如本例 checkbox/button）或建模为选项；逻辑由宿主自管。

## 受控展开

<DemoBlock title="受控展开（open + oas-open-change）">
  <oas-space size="small" direction="vertical">
    <oas-space size="small">
      <oas-select id="select-open-a" placeholder="① 选角色（选完自动展开 ②）" options='[{"label":"管理员","value":"admin"},{"label":"开发","value":"dev"},{"label":"访客","value":"guest"}]'></oas-select>
      <oas-select id="select-open-b" placeholder="② 选权限" options='[{"label":"读","value":"read"},{"label":"写","value":"write"},{"label":"删","value":"delete"}]'></oas-select>
    </oas-space>
    <oas-tag id="select-open-log" type="info">事件日志</oas-tag>
  </oas-space>
</DemoBlock>

设置 `open` 属性即受控展开（属性在场=展开、移除=收起，property 通道 `el.open = true` 同样可达）；用户手势（点击/Esc/点外部/选中收起）派发 `oas-open-change`（`detail: { open }`）但不强制写回——由宿主决定是否增删属性（对齐受控组件惯例）。本例：① 选完自动展开 ②，② 的关闭事件由宿主仲裁移除属性。

## 自动聚焦与 Tab 序

<DemoBlock title="autofocus / tabindex">
  <oas-space size="small" direction="vertical">
    <oas-select autofocus placeholder="挂载后自动聚焦（autofocus）" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"}]'></oas-select>
    <oas-select id="select-tabindex" tabindex="2" placeholder="tabindex=2 透传触发器" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"}]'></oas-select>
  </oas-space>
</DemoBlock>

`autofocus` 挂载后自动聚焦触发器（原生 autofocus 不穿透 Shadow DOM，组件转接）；`tabindex` 透传到内部触发器控制 Tab 序（宿主属性写完即转移，避免宿主与触发器双 Tab 停靠点）。

## 展开方向

<DemoBlock title="展开方向（placement）">
  <oas-space size="small">
    <oas-select placement="top" placeholder="向上展开" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"}]'></oas-select>
    <oas-select placeholder="auto（默认）" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"}]'></oas-select>
    <oas-select placement="bottom" placeholder="向下展开" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"}]'></oas-select>
  </oas-space>
</DemoBlock>

`placement` 支持 `auto`（默认，下方优先 + 空间不足自动翻转）/ `top`（强制上方）/ `bottom`（强制下方）。底部表单、向上弹更自然的长列表场景用 `top`。

## 选中对象

<DemoBlock title="选中对象（oas-change 携带 option）">
  <oas-select id="select-option-detail" placeholder="选择后看完整对象" options='[{"group":"温带","label":"苹果","value":"apple"},{"group":"热带","label":"香蕉","value":"banana"},{"group":"热带","label":"橙子","value":"orange"}]'></oas-select>
  <span id="select-option-detail-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 240px"></span>
</DemoBlock>

`oas-change` 的 `detail` 除 `value` 外携带完整选项对象：单选为 `option`（`label`/`value`/`group`/`disabled` 全量，未匹配为 `null`），多选为 `options` 数组——表单提交要完整对象时宿主不再需要反查。

## 焦点事件

<DemoBlock title="焦点事件（oas-focus / oas-blur）">
  <oas-space size="small">
    <oas-select id="select-focus" searchable placeholder="聚焦 / 失焦看日志" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"}]'></oas-select>
    <oas-tag id="select-focus-log" type="info">焦点日志</oas-tag>
  </oas-space>
</DemoBlock>

组件整体获得/失去焦点时派发 `oas-focus` / `oas-blur`（表单联动常用）；触发器 ↔ 搜索框等组件内焦点转移不误报。

## 事件

<DemoBlock title="变化事件">
  <oas-select id="select-event" multiple placeholder="选择后触发 oas-change" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"}]'></oas-select>
  <span id="select-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 180px"></span>
</DemoBlock>

监听 `oas-change`，`detail.value` 单选为字符串、多选为数组：

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  // reserve-width demo：切换选中项后显示触发器宽度（锁宽 vs 对照）
  const reserveOut = document.getElementById('sel-reserve-out')
  const reserveSel = document.getElementById('sel-reserve')
  const narrowSel = document.getElementById('sel-narrow')
  if (reserveSel && reserveOut) {
    const report = (el) => (el ? `（触发器宽 ${Math.round(el.getBoundingClientRect().width)}px）` : '')
    reserveSel.addEventListener('oas-change', (e) => {
      reserveOut.textContent = `已选：${e.detail.value} ${report(reserveSel)} vs 对照 ${report(narrowSel)}`
    })
  }

  const el = document.getElementById('select-event')
  const out = document.getElementById('select-output')
  el?.addEventListener('oas-change', (e) => {
    out.textContent = `oas-change: [${e.detail.value.join(', ')}]`
  })

  // hide-selected demo：展开/选择后回显剩余可选与当前值（真实链路可见反馈）
  const hideSel = document.getElementById('select-hide-selected')
  const hideSelOut = document.getElementById('select-hide-selected-output')
  const syncHideSel = () => {
    if (!hideSel || !hideSelOut) return
    const root = hideSel.shadowRoot
    const visible = root ? [...root.querySelectorAll('[role="option"] .option-label')].map((n) => n.textContent) : []
    let current = []
    try {
      current = JSON.parse(hideSel.getAttribute('value') ?? '[]')
    } catch {
      current = []
    }
    hideSelOut.textContent = `当前值: [${current.join(', ') || '—'}] · 下拉剩余 ${visible.length} 项`
  }
  hideSel?.addEventListener('oas-change', syncHideSel)
  hideSel?.addEventListener('oas-open-change', () => setTimeout(syncHideSel, 60))
  hideSel?.addEventListener('oas-clear', () => setTimeout(syncHideSel, 60))

  // 远程搜索 demo：模拟宿主请求，输入 800ms 后按 label 过滤回填 options
  const remote = document.getElementById('select-remote')
  const remoteOut = document.getElementById('select-remote-output')
  const REMOTE_ALL = [
    { label: '苹果', value: 'apple' },
    { label: '香蕉', value: 'banana' },
    { label: '橙子', value: 'orange' },
    { label: '草莓', value: 'strawberry' },
    { label: '西瓜', value: 'watermelon' },
  ]
  let remoteTimer = 0
  remote?.addEventListener('oas-input', (e) => {
    const q = e.detail.value
    window.clearTimeout(remoteTimer)
    remote.setAttribute('loading', '')
    remoteTimer = window.setTimeout(() => {
      remote.removeAttribute('loading')
      remote.setAttribute(
        'options',
        JSON.stringify(q ? REMOTE_ALL.filter((o) => o.label.includes(q)) : REMOTE_ALL),
      )
    }, 800)
  })
  remote?.addEventListener('oas-change', (e) => {
    remoteOut.textContent = `oas-change: ${e.detail.value}`
  })

  // 自定义选项渲染 demo：图标 + 富文本（oas-option-render / oas-tag-render 改写 element）
  const custom = document.getElementById('select-custom')
  const CUSTOM_ICONS = { apple: '🍎', banana: '🍌', orange: '🍊', strawberry: '🍓' }
  custom?.addEventListener('oas-option-render', (e) => {
    const { option, element } = e.detail
    element.innerHTML = ''
    const ic = document.createElement('span')
    ic.textContent = CUSTOM_ICONS[option.value] ?? '•'
    const txt = document.createElement('span')
    txt.textContent = option.label
    element.append(ic, txt)
  })
  custom?.addEventListener('oas-tag-render', (e) => {
    const { value, element } = e.detail
    element.innerHTML = ''
    const ic = document.createElement('span')
    ic.textContent = CUSTOM_ICONS[value] ?? '•'
    element.append(ic)
  })

  // 虚拟滚动 demo：1 万条选项
  const virtual = document.getElementById('select-virtual')
  if (virtual) {
    virtual.setAttribute(
      'options',
      JSON.stringify(
        Array.from({ length: 10000 }, (_, i) => ({ label: `选项 ${i}`, value: `v${i}` })),
      ),
    )
  }

  // 子元素声明式通道 demo：选中反馈 + 动态追加（MutationObserver 自动刷新）
  const declSelect = document.getElementById('select-decl')
  const declResult = document.getElementById('select-decl-result')
  declSelect?.addEventListener('oas-change', (e) => {
    declResult.textContent = `oas-change: ${e.detail.value}`
  })
  document.getElementById('select-decl-add')?.addEventListener('click', () => {
    if (!declSelect) return
    const n = declSelect.children.length + 1
    const opt = document.createElement('oas-option')
    opt.setAttribute('value', `dyn-${n}`)
    opt.textContent = `动态水果 ${n}`
    declSelect.appendChild(opt)
  })

  // 自定义过滤 demo：filterMethod 同时匹配 value 与 label（拼音首字母等自定义规则同理）
  const filterEl = document.getElementById('select-filter')
  if (filterEl) {
    filterEl.filterMethod = (query, option) =>
      option.value.includes(query.toLowerCase()) ||
      option.label.toLowerCase().includes(query.toLowerCase())
  }

  // 远程防抖 demo：组件已按 debounce=300 合并派发，宿主直接消费 oas-input
  const debounceEl = document.getElementById('select-debounce')
  const debounceOut = document.getElementById('select-debounce-output')
  let debounceCount = 0
  debounceEl?.addEventListener('oas-input', (e) => {
    debounceCount += 1
    debounceOut.textContent = `第 ${debounceCount} 次派发：${JSON.stringify(e.detail.value)}`
  })

  // 多选上限 demo：oas-exceed-limit 反馈超限提示
  const maxEl = document.getElementById('select-max')
  const maxLog = document.getElementById('select-max-log')
  maxEl?.addEventListener('oas-exceed-limit', (e) => {
    maxLog.textContent = `已达上限 ${e.detail.max} 项，无法再选「${e.detail.value}」`
  })
  maxEl?.addEventListener('oas-change', () => {
    maxLog.textContent = '超限提示'
  })

  // 下拉高度 demo：虚拟模式填入数据
  const heightVirtual = document.getElementById('select-height-virtual')
  if (heightVirtual) {
    heightVirtual.setAttribute(
      'options',
      JSON.stringify(Array.from({ length: 1000 }, (_, i) => ({ label: `选项 ${i}`, value: `v${i}` }))),
    )
  }

  // 字段映射 demo：业务字段（name/id/team）→ 组件契约（label/value），.map() 一行对齐
  const MEMBERS = [
    { name: '林岚', id: 'u1', team: '设计部' },
    { name: '陈默', id: 'u2', team: '前端组' },
    { name: '苏晴', id: 'u3', team: '前端组' },
    { name: '周野', id: 'u4', team: '数据组' },
  ]
  const mapJson = document.getElementById('select-map-json')
  if (mapJson) {
    // property 赋值必须等组件 upgrade 完成（升级前赋值会在实例挂自有属性遮蔽原型
    // setter → attribute 为空 → 下拉显示「暂无数据」；oas-option 子元素通道无时序问题）
    customElements.whenDefined('oas-select').then(() => {
      mapJson.options = MEMBERS.map((m) => ({ label: `${m.name}（${m.team}）`, value: m.id }))
    })
  }
  const mapChild = document.getElementById('select-map-child')
  for (const o of MEMBERS.map((m) => ({ value: m.id, label: m.name }))) {
    const opt = document.createElement('oas-option')
    opt.setAttribute('value', o.value)
    opt.textContent = o.label
    mapChild?.appendChild(opt)
  }

  // 下拉头尾插槽 demo：header 全选 / footer 追加（逻辑宿主自管）
  const headerSelect = document.getElementById('select-header')
  const headerAll = document.getElementById('select-header-all')
  const HEADER_OPTIONS = [
    { label: '苹果', value: 'apple' },
    { label: '香蕉', value: 'banana' },
    { label: '橙子', value: 'orange' },
  ]
  headerAll?.addEventListener('change', () => {
    if (!headerSelect || !(headerAll instanceof HTMLInputElement)) return
    headerSelect.setAttribute(
      'value',
      JSON.stringify(headerAll.checked ? HEADER_OPTIONS.map((o) => o.value) : []),
    )
  })
  headerSelect?.addEventListener('oas-change', (e) => {
    if (headerAll instanceof HTMLInputElement) {
      headerAll.checked = e.detail.value.length === HEADER_OPTIONS.length
    }
  })
  let headerAddCount = 0
  document.getElementById('select-header-add')?.addEventListener('click', () => {
    if (!headerSelect) return
    headerAddCount += 1
    const next = [...HEADER_OPTIONS, { label: `追加项 ${headerAddCount}`, value: `extra-${headerAddCount}` }]
    headerSelect.setAttribute('options', JSON.stringify(next))
  })

  // 受控展开 demo：① 选完自动展开 ②；② 的关闭事件由宿主仲裁移除属性
  const openA = document.getElementById('select-open-a')
  const openB = document.getElementById('select-open-b')
  const openLog = document.getElementById('select-open-log')
  const logOpen = (tag, open) => {
    openLog.textContent = `${tag} oas-open-change: ${open}`
  }
  openA?.addEventListener('oas-change', () => {
    if (openB) {
      openB.setAttribute('open', '')
      logOpen('②', true)
    }
  })
  openA?.addEventListener('oas-open-change', (e) => logOpen('①', e.detail.open))
  openB?.addEventListener('oas-open-change', (e) => {
    logOpen('②', e.detail.open)
    if (!e.detail.open) openB?.removeAttribute('open')
  })

  // 选中对象 demo：detail.option / detail.options 携带完整对象
  const detailEl = document.getElementById('select-option-detail')
  const detailOut = document.getElementById('select-option-detail-output')
  detailEl?.addEventListener('oas-change', (e) => {
    const opt = e.detail.option
    detailOut.textContent = opt
      ? `option: { label: ${opt.label}, value: ${opt.value}, group: ${opt.group ?? '—'} }`
      : 'option: null'
  })

  // 焦点事件 demo
  const focusEl = document.getElementById('select-focus')
  const focusLog = document.getElementById('select-focus-log')
  focusEl?.addEventListener('oas-focus', () => {
    focusLog.textContent = 'oas-focus'
  })
  focusEl?.addEventListener('oas-blur', () => {
    focusLog.textContent = 'oas-blur'
  })

  // input-value 受控 demo：属性写回 + 事件回显
  const ivEl = document.getElementById('select-input-value')
  const ivOut = document.getElementById('select-input-value-output')
  ivEl?.addEventListener('oas-input-value-change', (e) => {
    ivOut.textContent = `input-value: ${JSON.stringify(e.detail.value)}`
  })

  // oas-create demo：创建反馈
  const createEl = document.getElementById('select-create')
  const createOut = document.getElementById('select-create-output')
  createEl?.addEventListener('oas-create', (e) => {
    createOut.textContent = `oas-create: ${e.detail.label}`
  })

  // label（可访问名称）demo：读取触发器 aria-label（设置 label 与回退 placeholder 对照）
  const readSelectLabel = () => {
    const a = document.getElementById('select-label-set')?.shadowRoot?.querySelector('[part="trigger"]')?.getAttribute('aria-label')
    const b = document.getElementById('select-label-fallback')?.shadowRoot?.querySelector('[part="trigger"]')?.getAttribute('aria-label')
    const out = document.getElementById('select-label-output')
    if (a !== undefined && b !== undefined && a !== null && b !== null && out) {
      out.textContent = `aria-label：设置「${a}」 / 回退「${b}」`
    } else {
      setTimeout(readSelectLabel, 60)
    }
  }
  readSelectLabel()
})
</script>

## required 必填

<DemoBlock title="required 必填（原生校验链）">
  <oas-select required name="fruit" placeholder="水果" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"}]'></oas-select>
</DemoBlock>

`required` 驱动原生校验链（form-associated）：未填时 `checkValidity()` 为 false（`valueMissing`），原生表单提交被阻止；填写后自动恢复 `:valid`。

## API

### oas-select

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `allow-create` | 无匹配时允许以输入值创建新选项 | `boolean` | — |
| `auto-width` | 触发器宽度随选中项收缩 | — | — |
| `autofocus` | 挂载后自动聚焦触发器 | `boolean` | — |
| `clearable` | 可清空（有值时显示清空按钮，清空派发 `oas-clear`） | `boolean` | — |
| `debounce` | 远程搜索输入防抖毫秒（默认 0 立即；仅 remote 模式 oas-input 防抖，本地过滤始终即时） | — | — |
| `default-active-first-option` | 展开时高亮首个可见项（缺省高亮当前选中项） | `boolean` | — |
| `disabled` | 禁用 | `boolean` | — |
| `hide-selected` | 多选时已选选项从下拉列表隐藏，清空/取消后回到列表（仅 multiple 生效） | `boolean` | — |
| `hint` | 触发器下方提示文案（aria-describedby 关联） | `string` | — |
| `input-value` | 搜索词受控源：输入写回属性并派发 oas-input-value-change，外部更新同步进搜索框 | `string` | — |
| `item-height` | 虚拟滚动时每项固定高度（px） | `string` | `36` |
| `label` | 触发器可访问名称（aria-label），优先于 placeholder 回退 | `string` | — |
| `loading` | 远程加载占位（与 `remote` 搭配使用） | `boolean` | — |
| `loading-text` | 自定义加载占位文案（缺省 locale） | `string` | — |
| `max-count` | 多选上限：达上限未选项禁用置灰并派 oas-exceed-limit，已选项仍可取消；单选行为不变 | — | — |
| `max-tag-count` | 多选标签按数量折叠为 `+N`（需显式设置；未设置时标签默认换行展示，不折叠） | `boolean` | — |
| `multiple` | 多选 | `boolean` | — |
| `name` | 表单字段名（原生 FormData 提交的 key；多选时作为同名多条 entry 的 key；无 name 浏览器自动不提交） | `string` | — |
| `open` | 受控展开：属性在场=展开、移除=收起；宿主手势只派 oas-open-change 通知（组件不强制写回） | `boolean` | `false` |
| `options` | 选项，JSON 数组 `[{ label, value, disabled?, group? }]` | `Option[] \| string` | `[]` |
| `placeholder` | 占位提示 | — | — |
| `placement` | 下拉方向：`auto`（默认，下方优先自动翻转）/ `top` / `bottom`（强制不翻转） | `string` | `auto` |
| `readonly` | 只读：可聚焦可复制、不弹层、值不可改（隐藏清空与移除按钮） | `boolean` | — |
| `remote` | 远程搜索：不做本地过滤，输入派发 `oas-input` 供宿主请求 | `boolean` | — |
| `required` | 必填标记（驱动原生校验链 valueMissing；不透传内层控件） | `boolean` | — |
| `reserve-keyword` | searchable 选中后保留搜索词（缺省清空，对齐 tree-select） | `boolean` | — |
| `reserve-width` | 触发器预留最宽选项宽（opt-in）：量测全部选项 label 与 placeholder 的最大文本宽锁定触发器最小宽度，切换选中值时尺寸不抖动；常与 auto-width 组合（收缩后由预留值托底）；options/子元素变化自动重测；移除属性解除锁定 | `boolean` | — |
| `searchable` | 可搜索（打开下拉后输入过滤） | `boolean` | — |
| `show-arrow` | 显式 `"false"` 隐藏默认下拉箭头 | `string` | `true` |
| `size` | 尺寸档位 `small` / `medium`（默认）/ `large`：控高/字号/标签高联动 | `string` | `medium` |
| `status` | 校验态：`error` / `warning` / `success`；error 联动宿主 aria-invalid | `string` | — |
| `tabindex` | 透传内部触发器控制 Tab 序（宿主属性委托后移除，防双停靠点） | — | — |
| `value` | 当前值（多选为 JSON 数组） | `string \| string[]` | — |
| `variant` | 形态变体：`outlined`（默认）/ `filled` / `borderless`，非法值静默回落；status 语义色优先 | `string` | — |
| `virtual` | 大数据量虚拟滚动：只渲染可视窗口，滚动流畅（复用 oas-virtual-list）；带 `group` 的选项自动回退全量渲染 | `boolean` | — |

#### Property（仅 JS property，不反射 attribute）

| Property | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `value` | 当前值：单选取选中值字符串，`multiple` 时取选中值数组（等价读 `value` 属性） | `string \| string[]` | — |

#### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-blur` | 组件失去焦点时派发 |
| `oas-change` | 选择/清空变化，`detail: { value }` |
| `oas-clear` | 点击清空按钮，`detail: { value }`（清空前的值） |
| `oas-create` | allow-create 创建新选项时派发，`detail: { value, label }` |
| `oas-exceed-limit` | 达 max-count 上限后的越界选择尝试（点击/键盘/创建三路），`detail: { value, max }` |
| `oas-focus` | 组件获得焦点时派发（trigger↔搜索框内部转移不误报） |
| `oas-input` | `remote` 模式输入，`detail: { value }`（供宿主请求） |
| `oas-input-value-change` | 搜索词变化时派发，`detail: { value }` |
| `oas-open-change` | 展开状态翻转，`detail: { open }` |
| `oas-option-render` | 每个渲染的选项行派发，`detail: { index, option, element }`（element 为选项 label 容器，宿主可改写为图标/富文本） |
| `oas-tag-render` | 多选标签渲染时派发，`detail: { value, label, element }`（element 为标签文本容器，宿主可改写） |

#### 插槽

| 名称 | 说明 |
| --- | --- |
| `template[slot="clear-icon"]` | 自定义清除按钮图标 |
| `template[slot="empty"]` | 自定义空态（覆盖「暂无数据」与「无匹配选项」默认文案） |
| `template[slot="option"]` | 选项行静态模板，克隆到每个选项 label 容器；`[data-option-label]` 节点自动绑定选项 label |
| `template[slot="prefix"]` | 触发器前缀内容模板 |
| `template[slot="suffix"]` | 触发器后缀内容模板 |
| `template[slot="suffix-icon"]` | 自定义触发器后缀图标（替换默认箭头） |
| `template[slot="tag"]` | 多选标签静态模板，克隆到每个 chip 的文本容器；`[data-tag-label]` 节点自动绑定标签 label |

#### CSS 变量

| CSS 变量 | 默认值 |
| --- | --- |
| `--oas-button-group-radius` | `var(--oas-radius-md)` |
| `--oas-glass-blur` | `none` |
| `--oas-glass-ring` | `transparent` |
| `--oas-select-dropdown-height` | `240px` |
| `--oas-select-reserve` | `0px` |

### oas-option

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `disabled` | 禁用该项（不可选） | — | — |
| `group` | 分组标题（可选）：同组连续渲染组标题（不可选），组内选项缩进 | — | — |
| `value` | 选项值（子元素声明式通道的数据载体字段） | — | — |

#### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | 选项 label 内容（默认插槽文本） |

> `options` 中带 `group` 字段的选项按组渲染组标题（不可选），组内选项缩进；键盘导航跨组连续。

键盘：`Enter` / `↓` 展开，`↑`/`↓` 移动高亮（搜索框内同样可用），`Enter` 选中，`Esc` 关闭。
