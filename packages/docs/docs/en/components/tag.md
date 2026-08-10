# Tag

A small tag used for marking and categorization.

## Types

<DemoBlock title="Tag types">
  <oas-tag>默认</oas-tag>
  <oas-tag type="primary">主色</oas-tag>
  <oas-tag type="success">成功</oas-tag>
  <oas-tag type="warning">警告</oas-tag>
  <oas-tag type="danger">危险</oas-tag>
  <oas-tag type="info">信息</oas-tag>
</DemoBlock>

## Radius & size

<DemoBlock title="Radius & size">
  <oas-tag round type="primary">胶囊标签</oas-tag>
  <oas-tag size="small">小号</oas-tag>
  <oas-tag size="medium">中号</oas-tag>
  <oas-tag size="large">大号</oas-tag>
</DemoBlock>

## Closable

Clicking × dispatches `oas-close` (cancelable; `preventDefault` can prevent removal).

<DemoBlock title="Closable tags">
  <oas-tag closable type="success">可关闭</oas-tag>
  <oas-tag closable type="info">点 × 关闭</oas-tag>
  <oas-tag closable type="danger">关闭后消失</oas-tag>
</DemoBlock>

## Chip & clickable

`chip`: pill radius + compact padding; `clickable`: the whole tag is clickable, dispatching `oas-click` on click/Enter/Space.

<DemoBlock title="Chip">
  <oas-tag chip>默认 chip</oas-tag>
  <oas-tag chip type="primary">主色 chip</oas-tag>
  <oas-tag chip type="success">成功 chip</oas-tag>
  <oas-tag chip type="warning">警告 chip</oas-tag>
  <oas-tag chip closable type="info">可关闭 chip</oas-tag>
</DemoBlock>

<DemoBlock title="Clickable">
  <oas-tag clickable chip type="primary">点我派发 oas-click</oas-tag>
  <oas-tag clickable chip type="success">可点 chip</oas-tag>
  <oas-tag clickable type="danger">普通可点标签</oas-tag>
  <oas-tag clickable chip disabled type="warning">禁用不可点</oas-tag>
</DemoBlock>

> In chip mode, `disabled` tags cannot be clicked (no `oas-click`) nor closed (close button disabled).

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

## Icon tags

The default slot can hold an icon — combining an icon and text forms an icon tag.

<DemoBlock title="Icon tags">
  <oas-tag type="primary"><svg width="12" height="12" viewBox="0 0 16 16" style="vertical-align: -1px; margin-right: 4px;" aria-hidden="true"><path d="M8 1.5l1.9 4.2 4.6.4-3.5 3 1.1 4.5L8 11.4 3.9 13.6 5 9.1 1.5 6.1l4.6-.4z" fill="currentColor"/></svg>精选</oas-tag>
  <oas-tag type="success"><svg width="12" height="12" viewBox="0 0 16 16" style="vertical-align: -1px; margin-right: 4px;" aria-hidden="true"><path d="M6.5 11.5L2.8 7.8l1.2-1.2 2.5 2.5 6-6 1.2 1.2z" fill="currentColor"/></svg>已完成</oas-tag>
  <oas-tag chip type="warning"><svg width="12" height="12" viewBox="0 0 16 16" style="vertical-align: -1px; margin-right: 4px;" aria-hidden="true"><path d="M8 1.5l1.9 4.2 4.6.4-3.5 3 1.1 4.5L8 11.4 3.9 13.6 5 9.1 1.5 6.1l4.6-.4z" fill="currentColor"/></svg>关注</oas-tag>
  <oas-tag chip closable type="info"><svg width="12" height="12" viewBox="0 0 16 16" style="vertical-align: -1px; margin-right: 4px;" aria-hidden="true"><circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 4.5V8l2.5 1.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>定时</oas-tag>
</DemoBlock>

## API

| Prop | Description | Type | Default |
| --- | --- | --- | --- |
| `type` | Type | `default` / `primary` / `success` / `warning` / `danger` / `info` | `default` |
| `size` | Size | `small` / `medium` / `large` | `medium` |
| `closable` | Closable | boolean | `false` |
| `round` | Rounded | boolean | `false` |
| `chip` | Chip (pill radius + compact padding) | boolean | `false` |
| `clickable` | Whole tag clickable (focusable, dispatches `oas-click`) | boolean | `false` |
| `disabled` | Disabled (cannot be clicked or closed) | boolean | `false` |

| Event | Description |
| --- | --- |
| `oas-close` | Close, `cancelable`; `preventDefault` prevents removal |
| `oas-click` | Whole-tag click (when `clickable`), detail contains originalEvent |
