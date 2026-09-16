# FloatButton

A circular action button fixed to the bottom-right corner of the page by default, for quick actions like "New" and "Feedback"; supports a badge, a custom icon, extended text and link mode.

> The demos add `style="position: relative"` to keep them in the document flow while establishing a positioning context (group/menu expansion layers anchor relative to the main button); in real use it is fixed to the bottom-right by default, adjustable via the `--oas-float-button-bottom` / `--oas-float-button-right` CSS variables (default `var(--oas-space-6)`, i.e. 32px).

## Basic usage

<DemoBlock title="With badge">
  <oas-float-button badge="3" style="position: relative; box-shadow: none"></oas-float-button>
</DemoBlock>

## Without badge

<DemoBlock title="Without badge">
  <oas-float-button style="position: relative; box-shadow: none"></oas-float-button>
</DemoBlock>

## Custom icon

<DemoBlock title="Custom icon">
  <oas-float-button style="position: relative; box-shadow: none"><span slot="icon">✎</span></oas-float-button>
</DemoBlock>

## Shape

`shape` offers two shapes: `circle` (default, round) / `square` (capsule rounded rectangle).

<DemoBlock title="Shape">
  <oas-float-button style="position: relative; box-shadow: none"><span slot="icon">✎</span></oas-float-button>
  <oas-float-button shape="square" style="position: relative; box-shadow: none"><span slot="icon">✎</span></oas-float-button>
</DemoBlock>

## Type

`type` controls visual intensity: `primary` (default, solid primary with white text) / `default` (weakened: light background with dark text).

<DemoBlock title="Type">
  <oas-float-button type="default" style="position: relative; box-shadow: none"><span slot="icon">✎</span></oas-float-button>
  <oas-float-button style="position: relative; box-shadow: none"><span slot="icon">✎</span></oas-float-button>
</DemoBlock>

## Extended text

Writing text into the default slot turns the button into a horizontal capsule (icon + text in a row).

<DemoBlock title="Extended text">
  <oas-float-button style="position: relative; box-shadow: none">New</oas-float-button>
  <oas-float-button type="default" style="position: relative; box-shadow: none">Feedback</oas-float-button>
</DemoBlock>

## Size

`size` has five tiers: `xs` (24px) / `sm` (32px) / `md` (40px) / `lg` (default 48px) / `xl` (56px).

<DemoBlock title="Size">
  <oas-float-button size="xs" style="position: relative; box-shadow: none"></oas-float-button>
  <oas-float-button size="sm" style="position: relative; box-shadow: none"></oas-float-button>
  <oas-float-button size="md" style="position: relative; box-shadow: none"></oas-float-button>
  <oas-float-button style="position: relative; box-shadow: none"></oas-float-button>
  <oas-float-button size="xl" style="position: relative; box-shadow: none"></oas-float-button>
</DemoBlock>

## Disabled

`disabled` disables the button: not clickable, `oas-click` not fired, with weakened styles (translucent + disabled palette).

<DemoBlock title="Disabled">
  <oas-float-button disabled style="position: relative; box-shadow: none"><span slot="icon">✎</span></oas-float-button>
  <oas-float-button disabled style="position: relative; box-shadow: none">New</oas-float-button>
</DemoBlock>

## Dragging and magnetic snapping

`draggable` enables drag positioning: press and drag to move the button freely (free positioning under `fixed`, clamped inside the viewport so it never slides out). A displacement over 4px counts as a drag and releasing does not fire `oas-click`; within 4px it counts as a click and fires normally. Disabled state is not draggable.

`magnetic` works together with `draggable`: on release the button snaps to the nearest edge of the chosen axis — `x` snaps to the left/right edges, `y` to the top/bottom edges, with a transition (`prefers-reduced-motion` snaps instantly). The three buttons below are fixed to the bottom-right corner by default; press and drag to try it (the magnetic ones snap to the edge on release).

<DemoBlock title="Draggable (press and drag the bottom-right button)">
  <oas-float-button draggable onoas-click="message.info('This is a click (not a drag) firing oas-click')" style="--oas-float-button-bottom: 88px"></oas-float-button>
</DemoBlock>

<DemoBlock title="Draggable + magnetic x (snaps to the nearest left/right edge)">
  <oas-float-button draggable magnetic="x" style="--oas-float-button-bottom: 152px"></oas-float-button>
</DemoBlock>

<DemoBlock title="Draggable + magnetic y (snaps to the nearest top/bottom edge)">
  <oas-float-button draggable magnetic="y" style="--oas-float-button-right: 112px; --oas-float-button-bottom: 216px"></oas-float-button>
</DemoBlock>

## Link

`href` renders an `<a>` element (native link semantics and keyboard reachability), optionally with `target`; when disabled it degrades to a non-clickable `<span>`.

<DemoBlock title="Link">
  <oas-float-button href="https://example.com" target="_blank" style="position: relative; box-shadow: none"><span slot="icon">✈</span></oas-float-button>
  <oas-float-button href="https://example.com" target="_blank" type="default" style="position: relative; box-shadow: none">Open example</oas-float-button>
</DemoBlock>

## Group mode

`mode="group"`: a main button with stacked child buttons. Child buttons are host-filled light DOM (`slot="action"`, both `button` and `a` work):

- A child button may carry a `label` attribute — a bubble hint floats on hover / keyboard focus (the hint channel for icon-only children)
- A child button may carry a `badge` attribute — `dot` status dot / number (capped at `99+` above 99)
- `expand-direction` expanding direction: `up` (default) / `down` / `left` / `right`; horizontal directions mirror automatically in RTL
- `trigger` activation: `click` (default) / `hover` (falls back to click on touch screens) / `manual` (controlled attribute only)
- `expanded` controlled expanded state + `oas-expand-change` event (`detail: { expanded }`)
- Clicking any child button collapses the group; Esc / outside click collapses and refocuses the main button

<DemoBlock title="Group (click the main button to expand; children carry label bubbles and badges)">
  <oas-float-button mode="group" expand-direction="down" style="position: relative">
    <span slot="icon">＋</span>
    <button slot="action" type="button" label="Edit"><span>✎</span></button>
    <a slot="action" href="https://example.com" target="_blank" label="Docs (link child)"><span>📄</span></a>
    <button slot="action" type="button" label="Messages" badge="3"><span>✉</span></button>
  </oas-float-button>
</DemoBlock>

<DemoBlock title="Expand event (click the main button to toggle; oas-expand-change message feedback)">
  <oas-float-button mode="group" expand-direction="down" style="position: relative" onoas-expand-change="message.info('Expanded: ' + event.detail.expanded)">
    <span slot="icon">＋</span>
    <button slot="action" type="button" label="Copy"><span>⧉</span></button>
    <button slot="action" type="button" label="Delete"><span>🗑</span></button>
  </oas-float-button>
</DemoBlock>

<DemoBlock title="Controlled expansion (trigger=manual: the component never toggles by itself; the host flips the expanded attribute, no event dispatched)">
  <oas-float-button
    id="fb-manual-demo-en"
    mode="group"
    expand-direction="down"
    trigger="manual"
    style="position: relative"
  >
    <span slot="icon">＋</span>
    <button slot="action" type="button" label="Copy"><span>⧉</span></button>
    <button slot="action" type="button" label="Delete"><span>🗑</span></button>
  </oas-float-button>
  <button style="margin-inline-start: 8px; cursor: pointer" onclick="document.getElementById('fb-manual-demo-en').toggleAttribute('expanded')">Toggle expanded</button>
</DemoBlock>

## Menu mode

`mode="menu"`: clicking the main button pops up an action menu (data-driven by the `actions` JSON; closed by `Esc` / outside click):

- Action item: `{ label, icon?, href?, target?, badge? }` — items with `href` render as link menu items (mutually exclusive with clickable actions)
- `badge`: `dot` status dot / number (capped at `99+` above 99)
- Selecting an item dispatches `oas-select` (`detail: { index, label, href? }`) and collapses automatically
- Only vertical directions are supported: `expand-direction="up"` (default) / `"down"`
- Keyboard reachable: opening focuses the first item, arrow keys navigate cyclically, `Esc` closes and refocuses the main button

<DemoBlock title="Menu (click the main button to pop up; see the message feedback on selection)">
  <oas-float-button
    mode="menu"
    expand-direction="down"
    style="position: relative"
    onoas-select="message.info('Selected: ' + event.detail.label + (event.detail.href ? ' (link ' + event.detail.href + ')' : ''))"
    actions='[
      { "label": "Edit", "icon": "edit" },
      { "label": "Copy", "icon": "copy", "badge": "5" },
      { "label": "Notifications", "icon": "alert-circle", "badge": "dot" },
      { "label": "Help docs", "icon": "external-link", "href": "https://example.com", "target": "_blank" },
      { "label": "Archive", "icon": "check-circle", "badge": "128" }
    ]'
  >
    <span slot="icon">☰</span>
  </oas-float-button>
</DemoBlock>

## Badges: status dot and number capping

`badge` supports three values: a number (corner badge), `dot` (status dot, no number), or arbitrary text; pure numbers above `99` are capped to `99+` automatically. Group child buttons (`badge` attribute) and menu action items (`badge` field) follow the same rule.

<DemoBlock title="Badge capping and status dot">
  <oas-float-button badge="8" style="position: relative; box-shadow: none"></oas-float-button>
  <oas-float-button badge="120" style="position: relative; box-shadow: none"></oas-float-button>
  <oas-float-button badge="dot" style="position: relative; box-shadow: none"></oas-float-button>
</DemoBlock>

## Event feedback

Clicking dispatches `oas-click` (bubbles + composed), and `detail.originalEvent` is the native click event.

<DemoBlock title="Click event">
  <oas-float-button badge="5" style="position: relative; box-shadow: none" onoas-click="message.info('Float button clicked, detail.originalEvent type: ' + event.detail.originalEvent.type)"></oas-float-button>
</DemoBlock>

## Hover hint

The hover hint is composed by the host: wrap `oas-float-button` with `oas-tooltip` — the tooltip treats its first child as the trigger anchor and shows the hint on hover / keyboard focus (in real fixed bottom-right usage this works the same, as the tooltip positions against the anchor). The component ships no built-in tooltip prop, keeping the FAB single-responsibility and the hint logic in the composition layer.

<DemoBlock title="Tooltip composition">
  <oas-tooltip content="New document" placement="top">
    <oas-float-button style="position: relative; box-shadow: none"></oas-float-button>
  </oas-tooltip>
  <oas-tooltip content="Send feedback" placement="left">
    <oas-float-button type="default" style="position: relative; box-shadow: none"><span slot="icon">✎</span></oas-float-button>
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
| `actions` | menu-mode items JSON `[{label, value?, icon?, href?, target?, danger?, disabled?}]`; selecting emits oas-select and requests collapse | `string` | `[]` |
| `aria-label` | Accessible name: overrides the built-in label when set explicitly (icon-only defaults to locale "Quick actions"; extended text lets the visible text win) | — | — |
| `badge` | Badge number at the top-right corner | `string` | — |
| `disabled` | Disabled: not clickable, `oas-click` not fired, weakened styles; in `href` mode it degrades to a non-clickable `span` | `boolean` | — |
| `draggable` | Draggable: press and drag to move the button (free positioning under `fixed`, clamped inside the viewport); displacement > 4px counts as a drag, in which case releasing does not fire `oas-click` (within the threshold it fires normally) | `boolean` | — |
| `expand-direction` | Expand direction: up (default) / down / left / right; horizontal directions mirror automatically in RTL | `string` | `up` |
| `expanded` | group/menu expanded state (controlled, single source of truth): gestures only emit oas-expand-change; the host closes by removing the attribute | `boolean` | — |
| `href` | Link URL: when set, renders an `<a>` element (native link semantics and keyboard reachability) instead of a button; degrades to a `span` when disabled | `string` | — |
| `magnetic` | Magnetic: `x` snaps to the nearest left/right edge, `y` to the nearest top/bottom edge, with a transition on release; empty means no snapping (requires `draggable`) | `string` | — |
| `mode` | Mode: single (default) / group (main button + slotted actions expand vertically) / menu (actions JSON popup menu) | `string` | `single` |
| `shape` | Shape: `circle` (default, round) / `square` (capsule rounded rectangle) | `string` | `circle` |
| `size` | Size tier: `xs` (24px) / `small` (32px) / `medium` (40px) / `large` (default 48px) / `xl` (56px); `sm`/`md`/`lg` are accepted aliases; invalid values fall back to `large` with a warning | `string` | `large` |
| `target` | Link open mode (effective in `href` mode, e.g. `_blank`) | `string` | — |
| `trigger` | Expand trigger: click (default) / hover (debounced with grace period) / manual (fully controlled; outside click and Esc do not auto-collapse) | `string` | `click` |
| `type` | Visual intensity: `primary` (default, solid primary) / `default` (weakened: light background with dark text) | `string` | `primary` |

### Events

| Event | Description |
| --- | --- |
| `oas-click` | Clicked, `detail: { originalEvent }` |
| `oas-expand-change` | Emitted on expand/collapse, `detail: { open }`; controlled semantics — the component never mutates expanded, the host writes it back |
| `oas-select` | A menu item was selected in menu mode, detail: { index, label, value? }; the component then requests a collapse (emitting oas-expand-change — the host closes by removing expanded) |

### Slots

| Name | Description |
| --- | --- |
| default | Extended text: writing text into the default slot turns the button into a horizontal capsule (icon + text in a row) |
| `action` | group-mode child buttons (native button/a or oas-button); clicking collapses the group and restores focus to the main button; badges and custom icons supported |
| `icon` | Icon (default ＋) |

### CSS Variables

| CSS Variable | Default |
| --- | --- |
| `--oas-float-button-bottom` | `var(--oas-space-6)` |
| `--oas-float-button-right` | `var(--oas-space-6)` |
| `--oas-tooltip-bg` | `var(--oas-color-text-primary)` |
| `--oas-tooltip-color` | `var(--oas-color-bg)` |

The default position is `position: fixed; bottom/right`, adjustable via the `--oas-float-button-bottom` / `--oas-float-button-right` CSS variables (default `var(--oas-space-6)`).
