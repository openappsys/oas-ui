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

## Selectable

`checkable` enables selection: click / Enter / Space toggles `checked` and dispatches `oas-change` (`detail: { checked }`); the selected state is a solid fill. `checkable` is mutually exclusive with `closable` (the close button is hidden).

<DemoBlock title="checkable tags">
  <oas-tag checkable onoas-change="message.info('Default ' + (event.detail.checked ? 'selected' : 'deselected'))">Default</oas-tag>
  <oas-tag checkable checked type="success" onoas-change="message.info('Success ' + (event.detail.checked ? 'selected' : 'deselected'))">Success</oas-tag>
  <oas-tag checkable chip type="primary" onoas-change="message.info('Chip ' + (event.detail.checked ? 'selected' : 'deselected'))">Chip</oas-tag>
  <oas-tag checkable disabled type="warning">Disabled, not selectable</oas-tag>
</DemoBlock>

## Variants

`variant` provides three shapes: `outlined` / `filled` / `solid`; when unset, the legacy type rendering is kept (`default` white bg with gray border, colored types soft fill, `primary` solid).

<DemoBlock title="Outlined">
  <oas-tag variant="outlined">Default</oas-tag>
  <oas-tag variant="outlined" type="primary">Primary</oas-tag>
  <oas-tag variant="outlined" type="success">Success</oas-tag>
  <oas-tag variant="outlined" type="danger">Danger</oas-tag>
</DemoBlock>

<DemoBlock title="Filled">
  <oas-tag variant="filled">Default</oas-tag>
  <oas-tag variant="filled" type="primary">Primary</oas-tag>
  <oas-tag variant="filled" type="success">Success</oas-tag>
  <oas-tag variant="filled" type="warning">Warning</oas-tag>
</DemoBlock>

<DemoBlock title="Solid">
  <oas-tag variant="solid">Default</oas-tag>
  <oas-tag variant="solid" type="primary">Primary</oas-tag>
  <oas-tag variant="solid" type="success">Success</oas-tag>
  <oas-tag variant="solid" type="warning">Warning</oas-tag>
  <oas-tag variant="solid" type="danger">Danger</oas-tag>
</DemoBlock>

## Custom color

`color` accepts any CSS color value and overrides the `type` semantic color; it renders as `filled` when `variant` is unset.

<DemoBlock title="color custom">
  <oas-tag color="#7c3aed">Purple</oas-tag>
  <oas-tag color="#0ea5e9" variant="outlined">Sky outlined</oas-tag>
  <oas-tag color="#e11d48" variant="solid">Rose solid</oas-tag>
  <oas-tag color="#16a34a" variant="filled">Green filled</oas-tag>
</DemoBlock>

## Icon

The `icon` attribute reuses the oas-icon icon set; the icon renders before the text, sized to the font.

<DemoBlock title="Icon tags">
  <oas-tag icon="star" type="primary">Featured</oas-tag>
  <oas-tag icon="check" type="success">Completed</oas-tag>
  <oas-tag icon="clock" chip type="warning">Scheduled</oas-tag>
  <oas-tag icon="mail" chip closable type="info">Mail</oas-tag>
</DemoBlock>

## Link

When `href` is set, the tag renders a native `<a>` internally; `target` is passed through.

<DemoBlock title="href link tags">
  <oas-tag href="https://example.com" target="_blank" type="primary">Open in new tab</oas-tag>
  <oas-tag href="https://example.com" variant="outlined">Outlined link</oas-tag>
</DemoBlock>

## Max width ellipsis

`max-width` limits the tag content width; overflow is truncated with an ellipsis.

<DemoBlock title="max-width ellipsis">
  <oas-tag max-width="120px" type="primary">This is a very long tag label that will be truncated with an ellipsis when it exceeds the maximum width</oas-tag>
  <oas-tag max-width="80px" chip>Short</oas-tag>
</DemoBlock>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `checkable` | Selectable: click / Enter / Space toggles `checked` and dispatches `oas-change`; mutually exclusive with `closable` | `boolean` | — |
| `checked` | Checked state (effective when `checkable`) | `boolean` | — |
| `chip` | Chip (pill radius + compact padding) | `boolean` | — |
| `clickable` | Whole tag clickable (focusable, dispatches `oas-click`) | `boolean` | — |
| `closable` | Closable | `boolean` | — |
| `color` | Custom color (any CSS value), overrides the `type` semantic color; renders as `filled` when `variant` is unset | `string` | — |
| `disabled` | Disabled (cannot be clicked or closed) | `boolean` | — |
| `href` | Link URL: renders a native `<a>` when set | `string` | — |
| `icon` | Icon name (reusing the oas-icon icon set), placed before the text, sized to the font | `string` | — |
| `max-width` | Max width of the tag content (e.g. `120px`); overflow is truncated with an ellipsis | `string` | — |
| `round` | Rounded | `boolean` | — |
| `size` | Size: `xs` / `small` / `medium` (default) / `large` / `xl`; invalid values fall back to `medium` with a warning | `TagSize` | `medium` |
| `target` | How the link opens (`_blank` / `_self` etc.), with `href` | `string` | — |
| `type` | Type | `TagType` | `default` |
| `variant` | Shape (orthogonal to `type`): `outlined` / `filled` / `solid`; when unset, keeps the legacy type rendering | `string` | — |

### Events

| Event | Description |
| --- | --- |
| `oas-change` | Selection toggled when `checkable`, `detail: { checked }` |
| `oas-click` | Whole-tag click (when `clickable`), detail contains originalEvent |
| `oas-close` | Close, `cancelable`; `preventDefault` prevents removal |

### Slots

| Name | Description |
| --- | --- |
| default | Tag content |
