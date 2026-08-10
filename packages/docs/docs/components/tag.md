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
  <oas-tag size="small">小号</oas-tag>
  <oas-tag size="medium">中号</oas-tag>
  <oas-tag size="large">大号</oas-tag>
</DemoBlock>

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

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `chip` | 胶囊 | — | — |
| `clickable` | 整签可点 | — | — |
| `closable` | 可关闭 | — | — |
| `disabled` | 禁用 | — | — |
| `round` | 圆角 | — | — |
| `size` | 尺寸 | `TagSize` | `medium` |
| `type` | 类型 | `TagType` | `default` |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-click` | 整签点击（`clickable` 时），detail 含 originalEvent |
| `oas-close` | 关闭，`cancelable`，preventDefault 阻止移除 |

### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | — |
