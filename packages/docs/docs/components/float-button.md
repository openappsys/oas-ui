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
| `href` | 链接地址：设置后渲染 `<a>` 元素（原生链接语义与键盘可达）替代按钮；禁用时降级为 `span` | `string` | — |
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
