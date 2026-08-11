# Tag

A small tag used for marking and categorization.

## Types

<DemoBlock title="Tag types">
  <oas-tag>Default</oas-tag>
  <oas-tag type="primary">Primary</oas-tag>
  <oas-tag type="success">Success</oas-tag>
  <oas-tag type="warning">Warning</oas-tag>
  <oas-tag type="danger">Danger</oas-tag>
  <oas-tag type="info">Info</oas-tag>
</DemoBlock>

## Radius & size

<DemoBlock title="Radius & size">
  <oas-tag round type="primary">Pill</oas-tag>
  <oas-tag size="xs">XS</oas-tag>
  <oas-tag size="small">Small</oas-tag>
  <oas-tag size="medium">Medium</oas-tag>
  <oas-tag size="large">Large</oas-tag>
  <oas-tag size="xl">XL</oas-tag>
</DemoBlock>

`size` supports five tiers: `xs` / `small` / `medium` (default) / `large` / `xl`; invalid values fall back to `medium` with a warning.

## Closable

Clicking × dispatches `oas-close` (cancelable; `preventDefault` can prevent removal).

<DemoBlock title="Closable tags">
  <oas-tag closable type="success">Closable</oas-tag>
  <oas-tag closable type="info">Click × to close</oas-tag>
  <oas-tag closable type="danger">Removed after close</oas-tag>
</DemoBlock>

## Chip & clickable

`chip`: pill radius + compact padding; `clickable`: the whole tag is clickable, dispatching `oas-click` on click/Enter/Space.

<DemoBlock title="Chip">
  <oas-tag chip>Default chip</oas-tag>
  <oas-tag chip type="primary">Primary chip</oas-tag>
  <oas-tag chip type="success">Success chip</oas-tag>
  <oas-tag chip type="warning">Warning chip</oas-tag>
  <oas-tag chip closable type="info">Closable chip</oas-tag>
</DemoBlock>

<DemoBlock title="Clickable">
  <oas-tag clickable chip type="primary">Click me to dispatch oas-click</oas-tag>
  <oas-tag clickable chip type="success">Clickable chip</oas-tag>
  <oas-tag clickable type="danger">Regular clickable tag</oas-tag>
  <oas-tag clickable chip disabled type="warning">Disabled, not clickable</oas-tag>
</DemoBlock>

> In chip mode, `disabled` tags cannot be clicked (no `oas-click`) nor closed (close button disabled).

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  const { message } = await import('@oas-ui/ui')
  window.message = message
  document.addEventListener('oas-close', () => {
    window.message?.info('Tag closed')
  })
  document.addEventListener('oas-click', (e) => {
    const text = (e.target?.textContent || 'tag').trim()
    window.message?.info(`Clicked "${text}"`)
  })
})
</script>

## Icon tags

The default slot can hold an icon — combining an icon and text forms an icon tag.

<DemoBlock title="Icon tags">
  <oas-tag type="primary"><svg width="12" height="12" viewBox="0 0 16 16" style="vertical-align: -1px; margin-right: 4px;" aria-hidden="true"><path d="M8 1.5l1.9 4.2 4.6.4-3.5 3 1.1 4.5L8 11.4 3.9 13.6 5 9.1 1.5 6.1l4.6-.4z" fill="currentColor"/></svg>Featured</oas-tag>
  <oas-tag type="success"><svg width="12" height="12" viewBox="0 0 16 16" style="vertical-align: -1px; margin-right: 4px;" aria-hidden="true"><path d="M6.5 11.5L2.8 7.8l1.2-1.2 2.5 2.5 6-6 1.2 1.2z" fill="currentColor"/></svg>Completed</oas-tag>
  <oas-tag chip type="warning"><svg width="12" height="12" viewBox="0 0 16 16" style="vertical-align: -1px; margin-right: 4px;" aria-hidden="true"><path d="M8 1.5l1.9 4.2 4.6.4-3.5 3 1.1 4.5L8 11.4 3.9 13.6 5 9.1 1.5 6.1l4.6-.4z" fill="currentColor"/></svg>Follow</oas-tag>
  <oas-tag chip closable type="info"><svg width="12" height="12" viewBox="0 0 16 16" style="vertical-align: -1px; margin-right: 4px;" aria-hidden="true"><circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 4.5V8l2.5 1.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>Scheduled</oas-tag>
</DemoBlock>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `chip` | Chip (pill radius + compact padding) | `boolean` | — |
| `clickable` | Whole tag clickable (focusable, dispatches `oas-click`) | `boolean` | — |
| `closable` | Closable | `boolean` | — |
| `disabled` | Disabled (cannot be clicked or closed) | `boolean` | — |
| `round` | Rounded | `boolean` | — |
| `size` | Size: `xs` / `small` / `medium` (default) / `large` / `xl`; invalid values fall back to `medium` with a warning | `TagSize` | `medium` |
| `type` | Type | `TagType` | `default` |

### Events

| Event | Description |
| --- | --- |
| `oas-click` | Whole-tag click (when `clickable`), detail contains originalEvent |
| `oas-close` | Close, `cancelable`; `preventDefault` prevents removal |

### Slots

| Name | Description |
| --- | --- |
| default | — |
