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
