# FloatButton

A circular action button fixed to the bottom-right corner of the page by default, for quick actions like "New" and "Feedback"; supports a badge, a custom icon, extended text and link mode.

> The demos add `style="position: static"` to avoid fixed positioning affecting the page layout; in real use it is fixed to the bottom-right by default, adjustable via the `--oas-float-button-bottom` / `--oas-float-button-right` CSS variables (default `var(--oas-space-6)`, i.e. 32px).

## Basic usage

<DemoBlock title="With badge">
  <oas-float-button badge="3" style="position: static; box-shadow: none"></oas-float-button>
</DemoBlock>

## Without badge

<DemoBlock title="Without badge">
  <oas-float-button style="position: static; box-shadow: none"></oas-float-button>
</DemoBlock>

## Custom icon

<DemoBlock title="Custom icon">
  <oas-float-button style="position: static; box-shadow: none"><span slot="icon">✎</span></oas-float-button>
</DemoBlock>

## Shape

`shape` offers two shapes: `circle` (default, round) / `square` (capsule rounded rectangle).

<DemoBlock title="Shape">
  <oas-float-button style="position: static; box-shadow: none"><span slot="icon">✎</span></oas-float-button>
  <oas-float-button shape="square" style="position: static; box-shadow: none"><span slot="icon">✎</span></oas-float-button>
</DemoBlock>

## Type

`type` controls visual intensity: `primary` (default, solid primary with white text) / `default` (weakened: light background with dark text).

<DemoBlock title="Type">
  <oas-float-button type="default" style="position: static; box-shadow: none"><span slot="icon">✎</span></oas-float-button>
  <oas-float-button style="position: static; box-shadow: none"><span slot="icon">✎</span></oas-float-button>
</DemoBlock>

## Extended text

Writing text into the default slot turns the button into a horizontal capsule (icon + text in a row).

<DemoBlock title="Extended text">
  <oas-float-button style="position: static; box-shadow: none">New</oas-float-button>
  <oas-float-button type="default" style="position: static; box-shadow: none">Feedback</oas-float-button>
</DemoBlock>

## Size

`size` has five tiers: `xs` (24px) / `sm` (32px) / `md` (40px) / `lg` (default 48px) / `xl` (56px).

<DemoBlock title="Size">
  <oas-float-button size="xs" style="position: static; box-shadow: none"></oas-float-button>
  <oas-float-button size="sm" style="position: static; box-shadow: none"></oas-float-button>
  <oas-float-button size="md" style="position: static; box-shadow: none"></oas-float-button>
  <oas-float-button style="position: static; box-shadow: none"></oas-float-button>
  <oas-float-button size="xl" style="position: static; box-shadow: none"></oas-float-button>
</DemoBlock>

## Disabled

`disabled` disables the button: not clickable, `oas-click` not fired, with weakened styles (translucent + disabled palette).

<DemoBlock title="Disabled">
  <oas-float-button disabled style="position: static; box-shadow: none"><span slot="icon">✎</span></oas-float-button>
  <oas-float-button disabled style="position: static; box-shadow: none">New</oas-float-button>
</DemoBlock>

## Link

`href` renders an `<a>` element (native link semantics and keyboard reachability), optionally with `target`; when disabled it degrades to a non-clickable `<span>`.

<DemoBlock title="Link">
  <oas-float-button href="https://example.com" target="_blank" style="position: static; box-shadow: none"><span slot="icon">✈</span></oas-float-button>
  <oas-float-button href="https://example.com" target="_blank" type="default" style="position: static; box-shadow: none">Open example</oas-float-button>
</DemoBlock>

## Event feedback

Clicking dispatches `oas-click` (bubbles + composed), and `detail.originalEvent` is the native click event.

<DemoBlock title="Click event">
  <oas-float-button badge="5" style="position: static; box-shadow: none" onoas-click="message.info('Float button clicked, detail.originalEvent type: ' + event.detail.originalEvent.type)"></oas-float-button>
</DemoBlock>

## Hover hint

The hover hint is composed by the host: wrap `oas-float-button` with `oas-tooltip` — the tooltip treats its first child as the trigger anchor and shows the hint on hover / keyboard focus (in real fixed bottom-right usage this works the same, as the tooltip positions against the anchor). The component ships no built-in tooltip prop, keeping the FAB single-responsibility and the hint logic in the composition layer.

<DemoBlock title="Tooltip composition">
  <oas-tooltip content="New document" placement="top">
    <oas-float-button style="position: static; box-shadow: none"></oas-float-button>
  </oas-tooltip>
  <oas-tooltip content="Send feedback" placement="left">
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

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `aria-label` | Accessible name: overrides the built-in label when set explicitly (icon-only defaults to locale "Quick actions"; extended text lets the visible text win) | — | — |
| `badge` | Badge number at the top-right corner | `string` | — |
| `disabled` | Disabled: not clickable, `oas-click` not fired, weakened styles; in `href` mode it degrades to a non-clickable `span` | `boolean` | — |
| `href` | Link URL: when set, renders an `<a>` element (native link semantics and keyboard reachability) instead of a button; degrades to a `span` when disabled | `string` | — |
| `shape` | Shape: `circle` (default, round) / `square` (capsule rounded rectangle) | `string` | `circle` |
| `size` | Size tier: `xs` (24px) / `sm` (32px) / `md` (40px) / `lg` (default 48px) / `xl` (56px); invalid values fall back to `lg` with a warning | `string` | `lg` |
| `target` | Link open mode (effective in `href` mode, e.g. `_blank`) | `string` | — |
| `type` | Visual intensity: `primary` (default, solid primary) / `default` (weakened: light background with dark text) | `string` | `primary` |

### Events

| Event | Description |
| --- | --- |
| `oas-click` | Clicked, `detail: { originalEvent }` |

### Slots

| Name | Description |
| --- | --- |
| default | Extended text: writing text into the default slot turns the button into a horizontal capsule (icon + text in a row) |
| `icon` | Icon (default ＋) |

The default position is `position: fixed; bottom/right`, adjustable via the `--oas-float-button-bottom` / `--oas-float-button-right` CSS variables (default `var(--oas-space-6)`).
