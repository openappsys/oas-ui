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

## Custom close

`close-icon` customizes the close button icon (an oas-icon icon-set name, default ×); `close-label` customizes the close button's aria-label (screen-reader announcement, defaulting to the locale "Close").

<DemoBlock title="Custom close icon & label">
  <oas-tag closable close-icon="trash" type="danger">Trash close</oas-tag>
  <oas-tag closable close-icon="minus" type="info">Minus close</oas-tag>
  <oas-tag closable close-label="Remove the Test tag" type="success">Custom label</oas-tag>
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
// Full example code for the code view (script prop): drag & close-animation logic at a glance
const dragScript = `// Native HTML5 drag reorder: dragstart records the index → drop reorders the array → re-render
const wrap = document.getElementById('drag-tags')
let order = ['Vue', 'React', 'Svelte', 'Solid']
let from = -1
const render = () => {
  wrap.innerHTML = order.map((t) => \`<oas-tag closable draggable="true">\${t}</oas-tag>\`).join('')
}
wrap.addEventListener('dragstart', (e) => {
  from = [...wrap.children].indexOf(e.target.closest('oas-tag'))
})
wrap.addEventListener('dragover', (e) => e.preventDefault())
wrap.addEventListener('drop', (e) => {
  e.preventDefault()
  const to = [...wrap.children].indexOf(e.target.closest('oas-tag'))
  if (from >= 0 && to >= 0 && from !== to) {
    order.splice(to, 0, ...order.splice(from, 1))
    render()
  }
})
render()`
const closeAnimScript = `// oas-close is cancelable: preventDefault stops the default removal, fade out first, then remove
document.getElementById('close-anim').addEventListener('oas-close', (e) => {
  e.preventDefault()
  const tag = e.target
  tag.style.transition = 'opacity 240ms, transform 240ms'
  tag.style.opacity = '0'
  tag.style.transform = 'scale(0.92)'
  setTimeout(() => tag.remove(), 240)
})`
const asyncCloseScript = `// Async close: preventDefault stops auto-removal → loading → after the async task, done() exits loading → remove
document.getElementById('async-close').addEventListener('oas-close', (e) => {
  e.preventDefault()
  const tag = e.target
  tag.setAttribute('loading', '')
  setTimeout(() => {
    e.detail.done()
    window.message?.success('Async confirmed, tag removed')
    tag.remove()
  }, 1200)
})`
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

  // Drag-to-reorder demo: native HTML5 drag & drop over a set of closable tags
  const dragWrap = document.getElementById('drag-tags')
  if (dragWrap) {
    let dragTags = ['Vue', 'React', 'Svelte', 'Solid']
    const renderDragTags = () => {
      dragWrap.innerHTML = dragTags
        .map((t) => `<oas-tag closable draggable="true">${t}</oas-tag>`)
        .join('')
    }
    let dragIndex = -1
    dragWrap.addEventListener('dragstart', (e) => {
      const tag = e.target.closest('oas-tag')
      dragIndex = tag ? [...dragWrap.children].indexOf(tag) : -1
      if (tag) tag.style.opacity = '0.4'
    })
    dragWrap.addEventListener('dragover', (e) => e.preventDefault())
    dragWrap.addEventListener('drop', (e) => {
      e.preventDefault()
      const target = e.target.closest('oas-tag')
      const to = target ? [...dragWrap.children].indexOf(target) : -1
      if (dragIndex >= 0 && to >= 0 && dragIndex !== to) {
        const [moved] = dragTags.splice(dragIndex, 1)
        dragTags.splice(to, 0, moved)
        renderDragTags()
      }
    })
    dragWrap.addEventListener('dragend', () => {
      dragIndex = -1
      for (const t of dragWrap.children) t.style.opacity = ''
    })
    renderDragTags()
  }

  // Close animation demo: preventDefault + opacity/transform transition then remove
  const closeAnim = document.getElementById('close-anim')
  closeAnim?.addEventListener('oas-close', (e) => {
    e.preventDefault()
    const tag = e.target
    tag.style.transition = 'opacity 240ms, transform 240ms'
    tag.style.opacity = '0'
    tag.style.transform = 'scale(0.92)'
    setTimeout(() => tag.remove(), 240)
  })

  // Async close demo: preventDefault → loading (spinner) → after async done() exits loading → remove
  const asyncClose = document.getElementById('async-close')
  asyncClose?.addEventListener('oas-close', (e) => {
    e.preventDefault()
    const tag = e.target
    tag.setAttribute('loading', '')
    setTimeout(() => {
      e.detail.done()
      window.message?.success('Async confirmed, tag removed')
      tag.remove()
    }, 1200)
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

`checkable` enables selection: click / Enter / Space toggles `checked` and dispatches `oas-change` (`detail: { checked }`); the selected state is a solid fill with a √ check icon before the text (`checked-icon` can customize the icon name). `checkable` is mutually exclusive with `closable` (the close button is hidden).

<DemoBlock title="checkable tags">
  <oas-tag checkable onoas-change="message.info('Default ' + (event.detail.checked ? 'selected' : 'deselected'))">Default</oas-tag>
  <oas-tag checkable checked type="success" onoas-change="message.info('Success ' + (event.detail.checked ? 'selected' : 'deselected'))">Success</oas-tag>
  <oas-tag checkable chip type="primary" onoas-change="message.info('Chip ' + (event.detail.checked ? 'selected' : 'deselected'))">Chip</oas-tag>
  <oas-tag checkable disabled type="warning">Disabled, not selectable</oas-tag>
</DemoBlock>

<DemoBlock title="checkable check icons">
  <oas-tag checkable checked onoas-change="message.info('Default ' + (event.detail.checked ? 'selected' : 'deselected'))">Selected (√)</oas-tag>
  <oas-tag checkable checked type="success" checked-icon="star" onoas-change="message.info('Star ' + (event.detail.checked ? 'selected' : 'deselected'))">Star check</oas-tag>
  <oas-tag checkable chip type="primary" checked-icon="check-circle" onoas-change="message.info('Chip ' + (event.detail.checked ? 'selected' : 'deselected'))">Circle-check chip</oas-tag>
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

## Preset colors

`color` accepts 11 preset names (`magenta` / `red` / `volcano` / `orange` / `gold` / `lime` / `green` / `cyan` / `blue` / `geekblue` / `purple`, mapped to `--oas-preset-*` tokens, auto-brightened in dark theme); any CSS color value also works (see Custom color above). Unknown preset names are treated as plain color values.

<DemoBlock title="Preset colors filled">
  <oas-tag color="magenta">magenta</oas-tag>
  <oas-tag color="red">red</oas-tag>
  <oas-tag color="volcano">volcano</oas-tag>
  <oas-tag color="orange">orange</oas-tag>
  <oas-tag color="gold">gold</oas-tag>
  <oas-tag color="lime">lime</oas-tag>
  <oas-tag color="green">green</oas-tag>
  <oas-tag color="cyan">cyan</oas-tag>
  <oas-tag color="blue">blue</oas-tag>
  <oas-tag color="geekblue">geekblue</oas-tag>
  <oas-tag color="purple">purple</oas-tag>
</DemoBlock>

<DemoBlock title="Preset colors solid">
  <oas-tag color="magenta" variant="solid">magenta</oas-tag>
  <oas-tag color="red" variant="solid">red</oas-tag>
  <oas-tag color="volcano" variant="solid">volcano</oas-tag>
  <oas-tag color="orange" variant="solid">orange</oas-tag>
  <oas-tag color="gold" variant="solid">gold</oas-tag>
  <oas-tag color="lime" variant="solid">lime</oas-tag>
  <oas-tag color="green" variant="solid">green</oas-tag>
  <oas-tag color="cyan" variant="solid">cyan</oas-tag>
  <oas-tag color="blue" variant="solid">blue</oas-tag>
  <oas-tag color="geekblue" variant="solid">geekblue</oas-tag>
  <oas-tag color="purple" variant="solid">purple</oas-tag>
</DemoBlock>

## Status dot

`dot` renders a small dot before the text (color follows `type` / `color`); `processing` adds a pulsing animation (disabled under `prefers-reduced-motion`) and implies `dot`.

<DemoBlock title="dot status dots">
  <oas-tag dot>Default</oas-tag>
  <oas-tag dot type="success">Published</oas-tag>
  <oas-tag dot type="warning">Reviewing</oas-tag>
  <oas-tag dot color="magenta">Custom color dot</oas-tag>
</DemoBlock>

<DemoBlock title="processing pulse">
  <oas-tag processing type="primary">Processing</oas-tag>
  <oas-tag processing type="warning">Waiting</oas-tag>
  <oas-tag processing type="info" round>Polling</oas-tag>
</DemoBlock>

## Hit & emphasis

`hit` draws an opaque semantic-color border (follows the custom color when set); `strong` makes the text bold (font-weight 600).

<DemoBlock title="hit bordered">
  <oas-tag hit>Default</oas-tag>
  <oas-tag hit type="primary">Primary border</oas-tag>
  <oas-tag hit color="green">Custom color border</oas-tag>
  <oas-tag hit variant="outlined">Outlined hit</oas-tag>
</DemoBlock>

<DemoBlock title="strong">
  <oas-tag strong type="danger">Important</oas-tag>
  <oas-tag strong chip type="primary">Bold chip</oas-tag>
</DemoBlock>

## Multiline

`multiline` allows content to wrap (auto height + vertical padding compensation, for long content on mobile); when combined with `max-width`, the width constraint still applies — content wraps instead of being truncated.

<DemoBlock title="multiline">
  <oas-tag multiline max-width="220px" type="primary">This is a long tag label that wraps naturally in a narrow container on mobile instead of being truncated</oas-tag>
  <oas-tag multiline max-width="220px" hit>A second multiline label showing the auto-height layout with vertical padding compensation</oas-tag>
</DemoBlock>

## Avatar tags

When the default slot holds an `oas-avatar` (or `<img>`), it is adapted automatically: sized to the tag tier, circular, with a negative margin to hug the left edge.

<DemoBlock title="Avatar tags">
  <oas-tag chip><oas-avatar>J</oas-avatar>Jim</oas-tag>
  <oas-tag type="primary"><oas-avatar>A</oas-avatar>Anna</oas-tag>
  <oas-tag size="large"><oas-avatar>M</oas-avatar>Mike</oas-tag>
  <oas-tag chip closable type="success"><oas-avatar>Z</oas-avatar>Zoe</oas-tag>
</DemoBlock>

## Drag to reorder

A set of `closable` tags supports native HTML5 drag & drop reordering (`dragstart` / `dragover` / `drop`, re-rendered from the reordered array; no third-party dependency).

<DemoBlock title="Drag to reorder" :script="dragScript">
  <div id="drag-tags" style="display: inline-flex; flex-wrap: wrap; gap: 8px;"></div>
</DemoBlock>

## Close animation

`oas-close` is a cancelable event: after `preventDefault` the tag is not removed automatically, so you can fade it out first and then remove it.

<DemoBlock title="Close animation" :script="closeAnimScript">
  <oas-space id="close-anim" size="small">
    <oas-tag closable type="success">Fade out & remove</oas-tag>
    <oas-tag closable type="info">Click × to animate</oas-tag>
    <oas-tag closable type="danger">Animated close</oas-tag>
  </oas-space>
</DemoBlock>

## Async close

`loading` enters the closing-loading state: the close button shows a spinner and is disabled (`aria-busy` synced). Inside `oas-close`, `preventDefault` stops the auto-removal, the host runs the async task, then calls `event.detail.done()` to exit loading before removing the tag.

<DemoBlock title="Async close" :script="asyncCloseScript">
  <oas-space id="async-close" size="small">
    <oas-tag closable type="primary">Click × to simulate async confirm</oas-tag>
    <oas-tag closable type="success">Removed after async</oas-tag>
  </oas-space>
</DemoBlock>

## Tag group

`oas-tag-group` groups several `checkable` tags into a value selector: single-select (`value` as a single value) and multi-select (`multiple` + comma-separated `value`). Clicking a tag toggles selection and dispatches `oas-change` (single: `detail: { value }` / multiple: `detail: { value: [] }`); `disabled` disables the whole group. Child `checked` states are managed by the group (controlled).

<DemoBlock title="tag-group single">
  <oas-tag-group value="b" onoas-change="message.info('Selected: ' + event.detail.value)">
    <oas-tag checkable value="a">Option A</oas-tag>
    <oas-tag checkable value="b">Option B</oas-tag>
    <oas-tag checkable value="c">Option C</oas-tag>
  </oas-tag-group>
</DemoBlock>

<DemoBlock title="tag-group multiple">
  <oas-tag-group multiple value="a,c" aria-label="Multi-select tag group" onoas-change="message.info('Selected: ' + event.detail.value.join(', '))">
    <oas-tag checkable value="a">Tag A</oas-tag>
    <oas-tag checkable value="b">Tag B</oas-tag>
    <oas-tag checkable value="c">Tag C</oas-tag>
  </oas-tag-group>
</DemoBlock>

<DemoBlock title="tag-group disabled">
  <oas-tag-group disabled value="a" aria-label="Disabled tag group">
    <oas-tag checkable value="a">Disabled A</oas-tag>
    <oas-tag checkable value="b">Disabled B</oas-tag>
    <oas-tag checkable value="c">Disabled C</oas-tag>
  </oas-tag-group>
</DemoBlock>

## API

### oas-tag

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `checkable` | Selectable: click / Enter / Space toggles `checked` and dispatches `oas-change`; mutually exclusive with `closable` | `boolean` | — |
| `checked` | Checked state (effective when `checkable`) | `boolean` | — |
| `checked-icon` | Checkmark icon before a checked checkable tag (iconRegistry name, default check) | `string` | `check` |
| `chip` | Chip (pill radius + compact padding) | `boolean` | — |
| `clickable` | Whole tag clickable (focusable, dispatches `oas-click`) | `boolean` | — |
| `closable` | Closable | `boolean` | — |
| `close-icon` | Custom close-button icon (iconRegistry name), replaces the default × | `string` | — |
| `close-label` | aria-label of the close button (a11y context, e.g. "Remove tag xx"); defaults to the locale "Close" | `string` | — |
| `color` | Custom color: 11 preset names (`magenta` / `red` / `volcano` / `orange` / `gold` / `lime` / `green` / `cyan` / `blue` / `geekblue` / `purple`, mapped to `--oas-preset-*` tokens) or any CSS value, overrides the `type` semantic color; renders as `filled` when `variant` is unset | `string` | — |
| `disabled` | Disabled (cannot be clicked or closed) | `boolean` | — |
| `dot` | Status dot before the text (8px, color follows `type` / `color`) | `boolean` | — |
| `hit` | Heavy border: opaque semantic-color outline (follows the custom color when set) | `boolean` | — |
| `href` | Link URL: renders a native `<a>` when set | `string` | — |
| `icon` | Icon name (reusing the oas-icon icon set), placed before the text, sized to the font | `string` | — |
| `loading` | Loading state: spinner replaces the close icon and blocks clicks (`oas-close` detail has a `done()` callback the host calls after async work) | `boolean` | — |
| `max-width` | Max width of the tag content (e.g. `120px`); overflow is truncated with an ellipsis; with `multiline` it only constrains the width so content wraps | `string` | — |
| `multiline` | Multiline: content wraps (auto height + vertical padding compensation); with `max-width` content wraps instead of being truncated | `boolean` | — |
| `processing` | Pulsing status dot (implies `dot`); disabled under `prefers-reduced-motion` | `boolean` | — |
| `round` | Rounded | `boolean` | — |
| `size` | Size: `xs` / `small` / `medium` (default) / `large` / `xl`; invalid values fall back to `medium` with a warning | `TagSize` | `medium` |
| `strong` | Bold text (font-weight 600) | `boolean` | — |
| `target` | How the link opens (`_blank` / `_self` etc.), with `href` | `string` | — |
| `type` | Type | `TagType` | `default` |
| `variant` | Shape (orthogonal to `type`): `outlined` / `filled` / `solid`; when unset, keeps the legacy type rendering | `string` | — |

| Event | Description |
| --- | --- |
| `oas-change` | Selection toggled when `checkable`, `detail: { checked }` |
| `oas-click` | Whole-tag click (when `clickable`), detail contains originalEvent |
| `oas-close` | Close, `cancelable`; `preventDefault` prevents removal |

| Name | Description |
| --- | --- |
| default | Tag content |

### oas-tag-group

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `aria-label` | Accessible name of the group container (defaults to i18n "Tag group") | — | — |
| `disabled` | Disables the whole group (children cannot toggle) | `boolean` | — |
| `multiple` | Multi-select mode (`value` holds comma-separated selected values) | `boolean` | — |
| `value` | Selected value: a single value for single-select, comma-separated for multi-select | `string` | — |

| Event | Description |
| --- | --- |
| `oas-change` | Selection change. Single: `detail: { value }`; multiple: `detail: { value: [] }` |

| Name | Description |
| --- | --- |
| default | Multiple `<oas-tag checkable value="x">` children |

> Tag group API table is generated by the generator.
