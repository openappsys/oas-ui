# FloatButton 悬浮按钮

默认固定于页面右下角的圆形操作按钮，常用于「新建」「反馈」等快捷操作，支持角标、自定义图标、扩展文字与链接化。

> 演示中已加 `style="position: static"` 避免固定定位影响页面布局；实际使用默认固定在右下角，位置可通过 `--oas-float-button-bottom` / `--oas-float-button-right` 两个 CSS 变量调整（默认 `var(--oas-space-6)`，即 32px）。

## 基础用法

<DemoBlock title="带角标">
  <oas-float-button badge="3" style="position: static; box-shadow: none"></oas-float-button>
</DemoBlock>

## 无角标

<DemoBlock title="无角标">
  <oas-float-button style="position: static; box-shadow: none"></oas-float-button>
</DemoBlock>

## 自定义图标

<DemoBlock title="自定义图标">
  <oas-float-button style="position: static; box-shadow: none"><span slot="icon">✎</span></oas-float-button>
</DemoBlock>

## 形状

`shape` 两种形状：`circle`（默认，正圆）/ `square`（胶囊圆角矩形）。

<DemoBlock title="形状">
  <oas-float-button style="position: static; box-shadow: none"><span slot="icon">✎</span></oas-float-button>
  <oas-float-button shape="square" style="position: static; box-shadow: none"><span slot="icon">✎</span></oas-float-button>
</DemoBlock>

## 类型

`type` 两种视觉强度：`primary`（默认，主色实底白字）/ `default`（弱化：浅底深字）。

<DemoBlock title="类型">
  <oas-float-button type="default" style="position: static; box-shadow: none"><span slot="icon">✎</span></oas-float-button>
  <oas-float-button style="position: static; box-shadow: none"><span slot="icon">✎</span></oas-float-button>
</DemoBlock>

## 扩展文字

默认插槽写入文字后自动变为横向胶囊形态（图标 + 文字横排）。

<DemoBlock title="扩展文字">
  <oas-float-button style="position: static; box-shadow: none">新建</oas-float-button>
  <oas-float-button type="default" style="position: static; box-shadow: none">反馈</oas-float-button>
</DemoBlock>

## 尺寸

`size` 五档：`xs`（24px）/ `sm`（32px）/ `md`（40px）/ `lg`（默认 48px）/ `xl`（56px）。

<DemoBlock title="尺寸">
  <oas-float-button size="xs" style="position: static; box-shadow: none"></oas-float-button>
  <oas-float-button size="sm" style="position: static; box-shadow: none"></oas-float-button>
  <oas-float-button size="md" style="position: static; box-shadow: none"></oas-float-button>
  <oas-float-button style="position: static; box-shadow: none"></oas-float-button>
  <oas-float-button size="xl" style="position: static; box-shadow: none"></oas-float-button>
</DemoBlock>

## 禁用

`disabled` 禁用：不可点击、不派发 `oas-click`，样式弱化（半透明 + 禁用配色）。

<DemoBlock title="禁用">
  <oas-float-button disabled style="position: static; box-shadow: none"><span slot="icon">✎</span></oas-float-button>
  <oas-float-button disabled style="position: static; box-shadow: none">新建</oas-float-button>
</DemoBlock>

## 拖拽与磁吸

`draggable` 开启拖拽定位：按住按钮拖动即可自由移动（`fixed` 自由定位，位置夹取在视口内不滑出）。位移 >4px 视为拖拽、松手不派发 `oas-click`；≤4px 视为点击正常派发。禁用态不可拖。

`magnetic` 配合 `draggable` 使用：松手时吸附到最近的对应轴边缘——`x` 吸附左右、`y` 吸附上下，带过渡动画（`prefers-reduced-motion` 下直切）。下方三个按钮默认固定于页面右下角，可按住拖动试试（磁吸示例松手会自动贴边）。

<DemoBlock title="拖拽（按住右下角按钮拖动）">
  <oas-float-button draggable onoas-click="message.info('这是点击（非拖拽）触发的 oas-click')" style="--oas-float-button-bottom: 88px"></oas-float-button>
</DemoBlock>

<DemoBlock title="拖拽 + 磁吸 x（松手贴最近左右边缘）">
  <oas-float-button draggable magnetic="x" style="--oas-float-button-bottom: 152px"></oas-float-button>
</DemoBlock>

<DemoBlock title="拖拽 + 磁吸 y（松手贴最近上下边缘）">
  <oas-float-button draggable magnetic="y" style="--oas-float-button-right: 112px; --oas-float-button-bottom: 216px"></oas-float-button>
</DemoBlock>

## 链接

`href` 渲染为 `<a>` 元素（原生链接语义与键盘可达），可配 `target`；禁用时降级为不可点击的 `<span>`。

<DemoBlock title="链接">
  <oas-float-button href="https://example.com" target="_blank" style="position: static; box-shadow: none"><span slot="icon">✈</span></oas-float-button>
  <oas-float-button href="https://example.com" target="_blank" type="default" style="position: static; box-shadow: none">打开示例</oas-float-button>
</DemoBlock>

## 分组模式

`mode="group"`：主钮 + 子钮堆叠展开。子钮为宿主自填的 light DOM（`slot="action"`，`button` / `a` 均可）：

- 子钮可带 `label` 属性——hover / 键盘聚焦时浮现气泡提示（icon-only 子钮的提示通路）
- 子钮可带 `badge` 属性——角标，`dot` 状态点 / 数字（超 99 封顶 `99+`）
- `expand-direction` 展开方向：`up`（默认）/ `down` / `left` / `right`，RTL 下横向方向自动镜像
- `trigger` 触发方式：`click`（默认）/ `hover`（触屏自动回落 click）/ `manual`（仅受控属性驱动）
- `expanded` 受控展开态 + `oas-expand-change` 事件（`detail: { expanded }`）
- 点击任一子钮后组自动收起；Esc / 点击外部收起并回焦主钮

<DemoBlock title="分组（点击主钮展开，子钮带 label 气泡与角标）">
  <oas-float-button mode="group" expand-direction="down" style="position: static">
    <span slot="icon">＋</span>
    <button slot="action" type="button" label="编辑"><span>✎</span></button>
    <a slot="action" href="https://example.com" target="_blank" label="文档（链接子钮）"><span>📄</span></a>
    <button slot="action" type="button" label="消息" badge="3"><span>✉</span></button>
  </oas-float-button>
</DemoBlock>

<DemoBlock title="展开事件（点击主钮切换，oas-expand-change 消息反馈）">
  <oas-float-button mode="group" expand-direction="down" style="position: static" onoas-expand-change="message.info('展开态：' + event.detail.expanded)">
    <span slot="icon">＋</span>
    <button slot="action" type="button" label="复制"><span>⧉</span></button>
    <button slot="action" type="button" label="删除"><span>🗑</span></button>
  </oas-float-button>
</DemoBlock>

<DemoBlock title="受控展开（trigger=manual：组件不自切，宿主切换 expanded 属性，组件不派发事件）">
  <oas-float-button
    id="fb-manual-demo"
    mode="group"
    expand-direction="down"
    trigger="manual"
    style="position: static"
  >
    <span slot="icon">＋</span>
    <button slot="action" type="button" label="复制"><span>⧉</span></button>
    <button slot="action" type="button" label="删除"><span>🗑</span></button>
  </oas-float-button>
  <button style="margin-inline-start: 8px; cursor: pointer" onclick="document.getElementById('fb-manual-demo').toggleAttribute('expanded')">切换 expanded</button>
</DemoBlock>

## 菜单模式

`mode="menu"`：主钮点击弹出动作菜单（`actions` JSON 数据驱动，`Esc` / 点击外部关闭）：

- 动作项：`{ label, icon?, href?, target?, badge? }`——带 `href` 渲染为链接菜单项（与可点动作互斥）
- `badge`：`dot` 状态点 / 数字（超 99 封顶 `99+`）
- 选择动作项派发 `oas-select`（`detail: { index, label, href? }`）并自动收起
- 展开方向只支持纵向：`expand-direction="up"`（默认）/ `"down"`
- 键盘可达：展开自动聚焦首项，方向键循环导航，`Esc` 关闭并回焦主钮

<DemoBlock title="菜单（点击主钮弹出，选择项看消息反馈）">
  <oas-float-button
    mode="menu"
    expand-direction="down"
    style="position: static"
    onoas-select="message.info('选中：' + event.detail.label + (event.detail.href ? '（链接 ' + event.detail.href + '）' : ''))"
    actions='[
      { "label": "编辑", "icon": "edit" },
      { "label": "复制", "icon": "copy", "badge": "5" },
      { "label": "通知", "icon": "alert-circle", "badge": "dot" },
      { "label": "帮助文档", "icon": "external-link", "href": "https://example.com", "target": "_blank" },
      { "label": "归档", "icon": "check-circle", "badge": "128" }
    ]'
  >
    <span slot="icon">☰</span>
  </oas-float-button>
</DemoBlock>

## 徽标：状态点与数字封顶

`badge` 支持三种取值：数字（右上角标）、`dot`（状态点，无数字）、任意文本；纯数字超 `99` 自动封顶为 `99+`。分组子钮（`badge` 属性）与菜单动作项（`badge` 字段）同规则。

<DemoBlock title="徽标封顶与状态点">
  <oas-float-button badge="8" style="position: static; box-shadow: none"></oas-float-button>
  <oas-float-button badge="120" style="position: static; box-shadow: none"></oas-float-button>
  <oas-float-button badge="dot" style="position: static; box-shadow: none"></oas-float-button>
</DemoBlock>

## 事件反馈

点击派发 `oas-click`（bubbles + composed），`detail.originalEvent` 为原生点击事件。

<DemoBlock title="点击事件">
  <oas-float-button badge="5" style="position: static; box-shadow: none" onoas-click="message.info('悬浮按钮被点击，detail.originalEvent 类型：' + event.detail.originalEvent.type)"></oas-float-button>
</DemoBlock>

## 悬浮提示

悬浮提示由宿主用 `oas-tooltip` 包裹组合实现：tooltip 以第一个子元素为触发锚点，hover / 键盘聚焦 FAB 即显示提示（真实使用中 FAB 固定右下角时同样生效，tooltip 按锚点定位）。组件内置不加 tooltip prop，保持 FAB 职责单一，提示逻辑交给组合层。

<DemoBlock title="tooltip 组合">
  <oas-tooltip content="新建文档" placement="top">
    <oas-float-button style="position: static; box-shadow: none"></oas-float-button>
  </oas-tooltip>
  <oas-tooltip content="反馈问题" placement="left">
    <oas-float-button type="default" style="position: static; box-shadow: none"><span slot="icon">✎</span></oas-float-button>
  </oas-tooltip>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  const { message } = await import('@oas-ui/ui')
  window.message = message
})
</script>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `aria-label` | 无障碍可访问名称：显式设置时覆盖内置文案（纯图标默认走 locale「悬浮操作」；有扩展文字时让位给可见文本） | — | — |
| `badge` | 右上角标数字 | `string` | — |
| `disabled` | 禁用：不可点击、不派发 `oas-click`，样式弱化；`href` 模式下降级为不可点击的 `span` | `boolean` | — |
| `draggable` | 拖拽：指针按住拖动移动按钮（fixed 自由定位，位置夹取在视口内）；位移 >4px 视为拖拽，此时松手不派发 `oas-click`（阈值内正常派发） | `boolean` | — |
| `href` | 链接地址：设置后渲染 `<a>` 元素（原生链接语义与键盘可达）替代按钮；禁用时降级为 `span` | `string` | — |
| `magnetic` | 磁吸：`x` 吸附到最近的左右边缘、`y` 吸附到最近的上下边缘，松手时带过渡动画；空值不吸附（需配 `draggable`） | `string` | — |
| `shape` | 形状：`circle`（默认，正圆）/ `square`（胶囊圆角矩形） | `string` | `circle` |
| `size` | 尺寸档位：`xs`（24px）/ `sm`（32px）/ `md`（40px）/ `lg`（默认 48px）/ `xl`（56px）；非法值回落 `lg` 并告警 | `string` | `lg` |
| `target` | 链接打开方式（`href` 模式下生效，如 `_blank`） | `string` | — |
| `type` | 视觉强度：`primary`（默认，主色实底）/ `default`（弱化：浅底深字） | `string` | `primary` |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-click` | 点击，`detail: { originalEvent }` |

### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | 扩展文字：默认插槽写入文字后按钮自动变为横向胶囊形态（图标 + 文字横排） |
| `icon` | 图标（默认 ＋） |

默认定位 `position: fixed; bottom/right`，位置经 `--oas-float-button-bottom` / `--oas-float-button-right` CSS 变量调整（默认 `var(--oas-space-6)`）。
