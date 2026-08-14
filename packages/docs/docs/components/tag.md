# Tag 标签

用于标记和分类的小型标签。

## 类型

<DemoBlock title="标签类型">
  <oas-tag>默认</oas-tag>
  <oas-tag type="primary">主色</oas-tag>
  <oas-tag type="success">成功</oas-tag>
  <oas-tag type="warning">警告</oas-tag>
  <oas-tag type="danger">危险</oas-tag>
  <oas-tag type="info">信息</oas-tag>
</DemoBlock>

## 圆角与尺寸

<DemoBlock title="圆角与尺寸">
  <oas-tag round type="primary">胶囊标签</oas-tag>
  <oas-tag size="xs">超小</oas-tag>
  <oas-tag size="small">小号</oas-tag>
  <oas-tag size="medium">中号</oas-tag>
  <oas-tag size="large">大号</oas-tag>
  <oas-tag size="xl">超大</oas-tag>
</DemoBlock>

`size` 支持 `xs` / `small` / `medium`（默认）/ `large` / `xl` 五档；非法值回落 `medium` 并提示告警。

## 可关闭

点击 × 触发 `oas-close`（cancelable，preventDefault 可阻止移除）。

<DemoBlock title="可关闭标签">
  <oas-tag closable type="success">可关闭</oas-tag>
  <oas-tag closable type="info">点 × 关闭</oas-tag>
  <oas-tag closable type="danger">关闭后消失</oas-tag>
</DemoBlock>

## 胶囊与可点击

`chip`：胶囊圆角 + 紧凑 padding；`clickable`：整签可点，点击/Enter/Space 派发 `oas-click`。

<DemoBlock title="chip 胶囊">
  <oas-tag chip>默认 chip</oas-tag>
  <oas-tag chip type="primary">主色 chip</oas-tag>
  <oas-tag chip type="success">成功 chip</oas-tag>
  <oas-tag chip type="warning">警告 chip</oas-tag>
  <oas-tag chip closable type="info">可关闭 chip</oas-tag>
</DemoBlock>

<DemoBlock title="clickable 可点击">
  <oas-tag clickable chip type="primary">点我派发 oas-click</oas-tag>
  <oas-tag clickable chip type="success">可点 chip</oas-tag>
  <oas-tag clickable type="danger">普通可点标签</oas-tag>
  <oas-tag clickable chip disabled type="warning">禁用不可点</oas-tag>
</DemoBlock>

> chip 态下 `disabled` 不可点（不派发 `oas-click`）不可关（关闭按钮 disabled）。

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  const { message } = await import('@oas-ui/ui')
  window.message = message
  document.addEventListener('oas-close', () => {
    window.message?.info('标签已关闭')
  })
  document.addEventListener('oas-click', (e) => {
    const text = (e.target?.textContent || '标签').trim()
    window.message?.info(`点击了「${text}」`)
  })
})
</script>

## 图标标签

默认插槽可放图标——图标 + 文字组合成图标标签。

<DemoBlock title="图标标签">
  <oas-tag type="primary"><svg width="12" height="12" viewBox="0 0 16 16" style="vertical-align: -1px; margin-right: 4px;" aria-hidden="true"><path d="M8 1.5l1.9 4.2 4.6.4-3.5 3 1.1 4.5L8 11.4 3.9 13.6 5 9.1 1.5 6.1l4.6-.4z" fill="currentColor"/></svg>精选</oas-tag>
  <oas-tag type="success"><svg width="12" height="12" viewBox="0 0 16 16" style="vertical-align: -1px; margin-right: 4px;" aria-hidden="true"><path d="M6.5 11.5L2.8 7.8l1.2-1.2 2.5 2.5 6-6 1.2 1.2z" fill="currentColor"/></svg>已完成</oas-tag>
  <oas-tag chip type="warning"><svg width="12" height="12" viewBox="0 0 16 16" style="vertical-align: -1px; margin-right: 4px;" aria-hidden="true"><path d="M8 1.5l1.9 4.2 4.6.4-3.5 3 1.1 4.5L8 11.4 3.9 13.6 5 9.1 1.5 6.1l4.6-.4z" fill="currentColor"/></svg>关注</oas-tag>
  <oas-tag chip closable type="info"><svg width="12" height="12" viewBox="0 0 16 16" style="vertical-align: -1px; margin-right: 4px;" aria-hidden="true"><circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 4.5V8l2.5 1.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>定时</oas-tag>
</DemoBlock>

## 可选中

`checkable` 开启可选中：点击 / Enter / Space 切换 `checked` 并派发 `oas-change`（`detail: { checked }`）；选中态为实心填充。`checkable` 与 `closable` 互斥（关闭按钮隐藏）。

<DemoBlock title="checkable 可选中">
  <oas-tag checkable onoas-change="message.info('「默认」' + (event.detail.checked ? '已选中' : '已取消'))">默认</oas-tag>
  <oas-tag checkable checked type="success" onoas-change="message.info('「成功」' + (event.detail.checked ? '已选中' : '已取消'))">成功</oas-tag>
  <oas-tag checkable chip type="primary" onoas-change="message.info('「胶囊」' + (event.detail.checked ? '已选中' : '已取消'))">胶囊</oas-tag>
  <oas-tag checkable disabled type="warning">禁用不可选</oas-tag>
</DemoBlock>

## 形态

`variant` 提供三种形态：`outlined`（描边）/ `filled`（浅底）/ `solid`（实心）；缺省保持原有类型渲染（`default` 白底灰框、有色 type 浅底、`primary` 实心）。

<DemoBlock title="outlined 描边">
  <oas-tag variant="outlined">默认</oas-tag>
  <oas-tag variant="outlined" type="primary">主色</oas-tag>
  <oas-tag variant="outlined" type="success">成功</oas-tag>
  <oas-tag variant="outlined" type="danger">危险</oas-tag>
</DemoBlock>

<DemoBlock title="filled 浅底">
  <oas-tag variant="filled">默认</oas-tag>
  <oas-tag variant="filled" type="primary">主色</oas-tag>
  <oas-tag variant="filled" type="success">成功</oas-tag>
  <oas-tag variant="filled" type="warning">警告</oas-tag>
</DemoBlock>

<DemoBlock title="solid 实心">
  <oas-tag variant="solid">默认</oas-tag>
  <oas-tag variant="solid" type="primary">主色</oas-tag>
  <oas-tag variant="solid" type="success">成功</oas-tag>
  <oas-tag variant="solid" type="warning">警告</oas-tag>
  <oas-tag variant="solid" type="danger">危险</oas-tag>
</DemoBlock>

## 自定义颜色

`color` 接受任意 CSS 色值，覆盖 `type` 语义色；未指定 `variant` 时按 `filled` 渲染。

<DemoBlock title="color 自定义色">
  <oas-tag color="#7c3aed">紫色</oas-tag>
  <oas-tag color="#0ea5e9" variant="outlined">天蓝描边</oas-tag>
  <oas-tag color="#e11d48" variant="solid">玫红实心</oas-tag>
  <oas-tag color="#16a34a" variant="filled">绿色浅底</oas-tag>
</DemoBlock>

## 图标

`icon` 属性复用 oas-icon 图标集，图标渲染在文字前、尺寸跟随字号。

<DemoBlock title="icon 图标标签">
  <oas-tag icon="star" type="primary">精选</oas-tag>
  <oas-tag icon="check" type="success">已完成</oas-tag>
  <oas-tag icon="clock" chip type="warning">定时</oas-tag>
  <oas-tag icon="mail" chip closable type="info">邮件</oas-tag>
</DemoBlock>

## 链接

`href` 设置后内部渲染为原生链接 `<a>`，`target` 透传打开方式。

<DemoBlock title="href 链接标签">
  <oas-tag href="https://example.com" target="_blank" type="primary">新窗口打开</oas-tag>
  <oas-tag href="https://example.com" variant="outlined">描边链接</oas-tag>
</DemoBlock>

## 超长省略

`max-width` 限制标签内容宽度，超出部分以省略号截断。

<DemoBlock title="max-width 省略">
  <oas-tag max-width="120px" type="primary">这是一段超长的标签文本内容，超出最大宽度后将以省略号截断显示</oas-tag>
  <oas-tag max-width="80px" chip>短标签</oas-tag>
</DemoBlock>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `checkable` | 可选中：点击 / Enter / Space 切换 `checked` 并派发 `oas-change`；与 `closable` 互斥 | `boolean` | — |
| `checked` | 选中态（`checkable` 时生效） | `boolean` | — |
| `chip` | 胶囊 | `boolean` | — |
| `clickable` | 整签可点 | `boolean` | — |
| `closable` | 可关闭 | `boolean` | — |
| `color` | 自定义颜色（任意 CSS 色值），覆盖 `type` 语义色；未指定 `variant` 时按 `filled` 渲染 | `string` | — |
| `disabled` | 禁用 | `boolean` | — |
| `href` | 链接地址：设置后内部渲染为原生链接 `<a>` | `string` | — |
| `icon` | 图标名（复用 oas-icon 图标集），置于文字前，尺寸跟随字号 | `string` | — |
| `max-width` | 标签内容最大宽度（如 `120px`），超出省略显示 | `string` | — |
| `round` | 圆角 | `boolean` | — |
| `size` | 尺寸：`xs` / `small` / `medium`（默认）/ `large` / `xl`；非法值回落 `medium` 并告警 | `TagSize` | `medium` |
| `target` | 链接打开方式（`_blank` / `_self` 等），配合 `href` | `string` | — |
| `type` | 类型 | `TagType` | `default` |
| `variant` | 形态（与 `type` 正交）：`outlined`（描边）/ `filled`（浅底）/ `solid`（实心）；缺省保持类型默认渲染 | `string` | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-change` | `checkable` 时选中态切换，`detail: { checked }` |
| `oas-click` | 整签点击（`clickable` 时），detail 含 originalEvent |
| `oas-close` | 关闭，`cancelable`，preventDefault 阻止移除 |

### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | 标签内容 |
