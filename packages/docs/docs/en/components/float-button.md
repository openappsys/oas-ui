# FloatButton

A circular action button fixed to the bottom-right corner of the page by default, for quick actions like "New" and "Feedback"; supports a badge, a custom icon, extended text and link mode.

> The demos add `style="position: relative; inset: 0"` to keep them in the document flow while establishing a positioning context (group/menu expansion layers anchor relative to the main button); in real use it is fixed to the bottom-right by default, adjustable via the `--oas-float-button-bottom` / `--oas-float-button-right` CSS variables (default `var(--oas-space-6)`, i.e. 32px).

## Basic usage

<DemoBlock title="With badge">
  <oas-float-button badge="3" style="position: relative; inset: 0; box-shadow: none"></oas-float-button>
</DemoBlock>

## Without badge

<DemoBlock title="Without badge">
  <oas-float-button style="position: relative; inset: 0; box-shadow: none"></oas-float-button>
</DemoBlock>

## Custom icon

<DemoBlock title="Custom icon">
  <oas-float-button style="position: relative; inset: 0; box-shadow: none"><span slot="icon">✎</span></oas-float-button>
</DemoBlock>

## Shape

`shape` offers two shapes: `circle` (default, round) / `square` (capsule rounded rectangle).

<DemoBlock title="Shape">
  <oas-float-button style="position: relative; inset: 0; box-shadow: none"><span slot="icon">✎</span></oas-float-button>
  <oas-float-button shape="square" style="position: relative; inset: 0; box-shadow: none"><span slot="icon">✎</span></oas-float-button>
</DemoBlock>

## Type

`type` controls visual intensity: `primary` (default, solid primary with white text) / `default` (weakened: light background with dark text).

<DemoBlock title="Type">
  <oas-float-button type="default" style="position: relative; inset: 0; box-shadow: none"><span slot="icon">✎</span></oas-float-button>
  <oas-float-button style="position: relative; inset: 0; box-shadow: none"><span slot="icon">✎</span></oas-float-button>
</DemoBlock>

## Extended text

Writing text into the default slot turns the button into a horizontal capsule (icon + text in a row).

<DemoBlock title="Extended text">
  <oas-float-button style="position: relative; inset: 0; box-shadow: none">New</oas-float-button>
  <oas-float-button type="default" style="position: relative; inset: 0; box-shadow: none">Feedback</oas-float-button>
</DemoBlock>

## Size

`size` has five tiers: `xs` (24px) / `sm` (32px) / `md` (40px) / `lg` (default 48px) / `xl` (56px).

<DemoBlock title="Size">
  <oas-float-button size="xs" style="position: relative; inset: 0; box-shadow: none"></oas-float-button>
  <oas-float-button size="sm" style="position: relative; inset: 0; box-shadow: none"></oas-float-button>
  <oas-float-button size="md" style="position: relative; inset: 0; box-shadow: none"></oas-float-button>
  <oas-float-button style="position: relative; inset: 0; box-shadow: none"></oas-float-button>
  <oas-float-button size="xl" style="position: relative; inset: 0; box-shadow: none"></oas-float-button>
</DemoBlock>

## Disabled

`disabled` disables the button: not clickable, `oas-click` not fired, with weakened styles (translucent + disabled palette).

<DemoBlock title="Disabled">
  <oas-float-button disabled style="position: relative; inset: 0; box-shadow: none"><span slot="icon">✎</span></oas-float-button>
  <oas-float-button disabled style="position: relative; inset: 0; box-shadow: none">New</oas-float-button>
</DemoBlock>

## Dragging and magnetic snapping

`draggable` enables drag positioning: press and drag to move the button freely (free positioning under `fixed`, clamped inside the viewport so it never slides out). A displacement over 4px counts as a drag and releasing does not fire `oas-click`; within 4px it counts as a click and fires normally. Disabled state is not draggable.

`magnetic` works together with `draggable`: on release the button snaps to the nearest edge of the chosen axis — `x` snaps to the left/right edges, `y` to the top/bottom edges, with a transition (`prefers-reduced-motion` snaps instantly). The three buttons below are fixed to the bottom-right corner by default; press and drag to try it (the magnetic ones snap to the edge on release).

<DemoBlock title="Draggable (press and drag the button within the container)">
  <div style="position: relative; inset: 0; height: 180px; width: 100%">
    <oas-float-button draggable onoas-click="message.info('This is a click (not a drag) firing oas-click')" style="position: absolute; --oas-float-button-bottom: 16px; --oas-float-button-right: 16px"></oas-float-button>
  </div>
</DemoBlock>

<DemoBlock title="Draggable + magnetic x (snaps to the nearest left/right edge)">
  <div style="position: relative; inset: 0; height: 180px; width: 100%">
    <oas-float-button draggable magnetic="x" style="position: absolute; --oas-float-button-bottom: 16px; --oas-float-button-right: 16px"></oas-float-button>
  </div>
</DemoBlock>

<DemoBlock title="Draggable + magnetic y (snaps to the nearest top/bottom edge)">
  <div style="position: relative; inset: 0; height: 180px; width: 100%">
    <oas-float-button draggable magnetic="y" style="position: absolute; --oas-float-button-bottom: 16px; --oas-float-button-right: 16px"></oas-float-button>
  </div>
</DemoBlock>

## Link

`href` renders an `<a>` element (native link semantics and keyboard reachability), optionally with `target`; when disabled it degrades to a non-clickable `<span>`.

<DemoBlock title="Link">
  <oas-float-button href="https://example.com" target="_blank" style="position: relative; inset: 0; box-shadow: none"><span slot="icon">✈</span></oas-float-button>
  <oas-float-button href="https://example.com" target="_blank" type="default" style="position: relative; inset: 0; box-shadow: none">Open example</oas-float-button>
</DemoBlock>

## Group mode

`mode="group"`: a main button with stacked child buttons. Child buttons come in two channels:

**`actions` data channel (recommended, standard circular child buttons)** — rendered by the component inside the shadow root, immune to host-page CSS overrides:

- Action item: `{ label, icon?, href?, target?, badge? }` — items with `href` render as link children (with `rel="noopener noreferrer"` added automatically), mutually exclusive with clickable actions
- `label` serves both as the accessible name and as the bubble hint on hover / keyboard focus
- `badge`: `dot` status dot / number (capped at `99+` above 99)
- Selecting an action item dispatches `oas-select` (`detail: { index, label, href? }`) and collapses the group, restoring focus to the main button

**`slot="action"` custom channel** — the host provides the child elements itself, for cases the data channel cannot express: custom visuals, `oas-button`/custom components, framework-reactive content, per-item behaviors:

- Children get a default circular form, but it is carried via `::slotted` and **can be overridden by host-page global styles** (e.g. a reset's `button { background: transparent }`); use `actions` when the form must be guaranteed, or let the child carry its own visuals (e.g. `oas-button`)
- Supports the `label` (bubble text) and `badge` attributes
- The two channels are **mutually exclusive**; when both are provided `actions` wins

Shared behavior:

- `expand-direction` expanding direction: `up` (default) / `down` / `left` / `right`; horizontal directions mirror automatically in RTL
- `trigger` activation: `click` (default) / `hover` (falls back to click on touch screens) / `manual` (controlled attribute only)
- `expanded` controlled expanded state + `oas-expand-change` event (`detail: { expanded }`)
- Esc collapses and refocuses the main button; an outside click collapses without refocusing

<DemoBlock title="Group (actions-rendered children; see the message feedback on child click)">
  <oas-float-button
    id="fb-actions-demo"
    mode="group"
    expand-direction="down"
    style="position: relative; inset: 0"
    onoas-select="message.info('Selected: ' + event.detail.label + (event.detail.href ? ' (link ' + event.detail.href + ')' : ''))"
    actions='[
      { "label": "Edit", "icon": "edit" },
      { "label": "Help docs", "icon": "external-link", "href": "https://example.com", "target": "_blank" },
      { "label": "Messages", "icon": "mail", "badge": "3" }
    ]'
  >
    <span slot="icon">＋</span>
  </oas-float-button>
</DemoBlock>

<DemoBlock title="Expand event (click the main button to toggle; oas-expand-change message feedback)">
  <oas-float-button
    mode="group"
    expand-direction="down"
    style="position: relative; inset: 0"
    onoas-expand-change="message.info('Expanded: ' + event.detail.expanded)"
    actions='[
      { "label": "Copy", "icon": "copy" },
      { "label": "Delete", "icon": "trash" }
    ]'
  >
    <span slot="icon">＋</span>
  </oas-float-button>
</DemoBlock>

<DemoBlock title="Controlled expansion (trigger=manual: the component never toggles by itself; the host flips the expanded attribute, no event dispatched)">
  <oas-float-button
    id="fb-manual-demo-en"
    mode="group"
    expand-direction="down"
    trigger="manual"
    style="position: relative; inset: 0"
    actions='[
      { "label": "Copy", "icon": "copy" },
      { "label": "Delete", "icon": "trash" }
    ]'
  >
    <span slot="icon">＋</span>
  </oas-float-button>
  <button style="margin-inline-start: 8px; cursor: pointer" onclick="document.getElementById('fb-manual-demo-en').toggleAttribute('expanded')">Toggle expanded</button>
</DemoBlock>

<DemoBlock title="Custom children (slot custom channel: your own elements/components/framework-reactive content)">
  <oas-float-button id="fb-slot-demo" mode="group" expand-direction="down" style="position: relative; inset: 0">
    <span slot="icon">＋</span>
    <button slot="action" type="button" label="Edit"><span>✎</span></button>
    <a slot="action" href="https://example.com" target="_blank" label="Docs (link child)"><span>📄</span></a>
    <button slot="action" type="button" label="Messages" badge="3"><span>✉</span></button>
  </oas-float-button>
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
    style="position: relative; inset: 0"
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
  <oas-float-button badge="8" style="position: relative; inset: 0; box-shadow: none"></oas-float-button>
  <oas-float-button badge="120" style="position: relative; inset: 0; box-shadow: none"></oas-float-button>
  <oas-float-button badge="dot" style="position: relative; inset: 0; box-shadow: none"></oas-float-button>
</DemoBlock>

## Event feedback

Clicking dispatches `oas-click` (bubbles + composed), and `detail.originalEvent` is the native click event.

<DemoBlock title="Click event">
  <oas-float-button badge="5" style="position: relative; inset: 0; box-shadow: none" onoas-click="message.info('Float button clicked, detail.originalEvent type: ' + event.detail.originalEvent.type)"></oas-float-button>
</DemoBlock>

## Hover hint

The hover hint is composed by the host: wrap `oas-float-button` with `oas-tooltip` — the tooltip treats its first child as the trigger anchor and shows the hint on hover / keyboard focus (in real fixed bottom-right usage this works the same, as the tooltip positions against the anchor). The component ships no built-in tooltip prop, keeping the FAB single-responsibility and the hint logic in the composition layer.

<DemoBlock title="Tooltip composition">
  <oas-tooltip content="New document" placement="top">
    <oas-float-button style="position: relative; inset: 0; box-shadow: none"></oas-float-button>
  </oas-tooltip>
  <oas-tooltip content="Send feedback" placement="left">
    <oas-float-button type="default" style="position: relative; inset: 0; box-shadow: none"><span slot="icon">✎</span></oas-float-button>
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

### oas-float-button

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `actions` | Action items JSON shared by group/menu `[{label, icon?, href?, target?, badge?}]` — group renders circular child buttons inside the shadow root (recommended, immune to host-page CSS overrides), menu renders an action menu; items with href render as links (rel="noopener noreferrer" added automatically); selecting emits oas-select and collapses with focus restored to the main button | `string` | `[]` |
| `aria-label` | Accessible name: overrides the built-in label when set explicitly (icon-only defaults to locale "Quick actions"; extended text lets the visible text win) | — | — |
| `badge` | Badge number at the top-right corner | `string` | — |
| `disabled` | Disabled: not clickable, `oas-click` not fired, weakened styles; in `href` mode it degrades to a non-clickable `span` | `boolean` | — |
| `draggable` | Draggable: press and drag to move the button (free positioning under `fixed`, clamped inside the viewport); displacement > 4px counts as a drag, in which case releasing does not fire `oas-click` (within the threshold it fires normally) | `boolean` | — |
| `expand-direction` | Expand direction: up (default) / down / left / right; horizontal directions mirror automatically in RTL | `string` | `up` |
| `expanded` | group/menu expanded state: the component writes the attribute itself and emits `oas-expand-change` on gesture expand/collapse; with `trigger="manual"` it is fully controlled — the component never toggles itself and the host adds/removes the attribute | `boolean` | — |
| `href` | Link URL: when set, renders an `<a>` element (native link semantics and keyboard reachability) instead of a button; degrades to a `span` when disabled | `string` | — |
| `magnetic` | Magnetic: `x` snaps to the nearest left/right edge, `y` to the nearest top/bottom edge, with a transition on release; empty means no snapping (requires `draggable`) | `string` | — |
| `mode` | Mode: single (default) / group (main button + slotted actions expand vertically) / menu (actions JSON popup menu) | `string` | `single` |
| `shape` | Shape: `circle` (default, round) / `square` (capsule rounded rectangle) | `string` | `circle` |
| `size` | Size tier: `xs` (24px) / `small` (32px) / `medium` (40px) / `large` (default 48px) / `xl` (56px); `sm`/`md`/`lg` are accepted aliases; invalid values fall back to `large` with a warning | `string` | `large` |
| `target` | Link open mode (effective in `href` mode, e.g. `_blank`) | `string` | — |
| `trigger` | Expand trigger: click (default) / hover (debounced with grace period) / manual (fully controlled; outside click and Esc do not auto-collapse) | `string` | `click` |
| `type` | Visual intensity: `primary` (default, solid primary) / `default` (weakened: light background with dark text) | `string` | `primary` |

#### Events

| Event | Description |
| --- | --- |
| `oas-click` | Clicked, `detail: { originalEvent }` |
| `oas-expand-change` | Emitted on expand/collapse, `detail: { expanded }`; the component writes `expanded` back in sync (with `trigger="manual"` the host writes it back) |
| `oas-select` | An action item was selected in group/menu mode, `detail: { index, label, href? }`; the component then requests a collapse (emitting `oas-expand-change`; with `trigger="manual"` the host removes `expanded` to finish) |

#### Slots

| Name | Description |
| --- | --- |
| default | Extended text: writing text into the default slot turns the button into a horizontal capsule (icon + text in a row) |
| `action` | group-mode child buttons (custom channel, mutually exclusive with actions): self-filled light DOM elements/components (button/a/oas-button/custom elements) for cases the data channel cannot express — custom visuals, framework-reactive content, per-item behaviors; supports label (bubble text) and badge; the default circular form is carried via ::slotted (best-effort, can be overridden by host-page CSS) — use actions for guaranteed standard circular buttons; clicking collapses the group and restores focus to the main button |
| `icon` | Icon (default ＋) |

#### CSS Variables

| CSS Variable | Default |
| --- | --- |
| `--oas-float-button-action-size` | `calc(var(--oas-float-button-size) - var(--oas-space-2))` |
| `--oas-float-button-bottom` | `var(--oas-space-6)` |
| `--oas-float-button-right` | `var(--oas-space-6)` |
| `--oas-float-button-size` | `var(--oas-control-height-xl)` |
| `--oas-tooltip-bg` | `var(--oas-color-text-primary)` |
| `--oas-tooltip-color` | `var(--oas-color-bg)` |

The default position is `position: fixed; bottom/right`, adjustable via the `--oas-float-button-bottom` / `--oas-float-button-right` CSS variables (default `var(--oas-space-6)`).
