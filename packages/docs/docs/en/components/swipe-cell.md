# SwipeCell

Reveal a row of action buttons by swiping a list item horizontally: the default slot is the **content layer** (the list item body) and `slot="actions"` is the **action button group** (the host places `button` / `oas-button` elements). Swiping the content layer toward inline-start reveals the inline-end action area; releasing snaps to open or closed based on the drag threshold. `oas-open` / `oas-close` are dispatched once each when the open / closed state settles (programmatic `open` attribute changes dispatch them too). An item can also carry a group on the **other side** (`slot="actions-start"`, see "Two-Sided Swipe")—the two sides open exclusively on the same item.

## side: Actions on the Left (Swipe Right)

By default actions attach to the inline-end side (right in LTR, revealed by swiping left); `side="start"` moves them to inline-start (left in LTR, **revealed by swiping right**). `side` is an interaction choice orthogonal to text direction—in RTL both the side and the swipe direction mirror automatically. Note: when the same item also has `slot="actions-start"`, `side` is ignored and `slot="actions"` always stays on inline-end (this slot is for the single-group case).

<DemoBlock title='side="start": swipe right'>
  <div style="width: 100%">
    <oas-swipe-cell id="swipe-side" side="start">
      <div style="padding: var(--oas-space-3) var(--oas-space-4); background: var(--oas-color-bg); border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md)">Swipe right for actions</div>
      <oas-button slot="actions" type="primary">Edit</oas-button>
    </oas-swipe-cell>
  </div>
</DemoBlock>

## Multiple Buttons

`slot="actions"` accepts multiple buttons: the component measures their total width and reveals the whole row on swipe (each button clicks independently):

<DemoBlock title="Edit + Delete">
  <div style="width: 100%">
    <oas-swipe-cell id="swipe-multi">
      <div style="padding: var(--oas-space-3) var(--oas-space-4); background: var(--oas-color-bg); border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md)">Swipe left to reveal two actions</div>
      <oas-button slot="actions" type="primary">Edit</oas-button>
      <oas-button slot="actions" type="danger">Delete</oas-button>
    </oas-swipe-cell>
  </div>
</DemoBlock>

## Two-Sided Swipe (Actions on Both Sides)

An item can carry an action group on each side at once: `slot="actions"` on inline-end (left-swipe in LTR) and `slot="actions-start"` on inline-start (right-swipe in LTR). A single gesture drags both ways and can cross zero to switch sides end-to-end; only one side opens per item. The `open-side` attribute reflects the current side (`start` / `end`), and `oas-open`'s `detail` carries `{ side }`.

<DemoBlock title="Left-swipe Delete / Right-swipe Archive">
  <div style="width: 100%">
    <oas-swipe-cell id="swipe-dual">
      <div style="padding: var(--oas-space-3) var(--oas-space-4); background: var(--oas-color-bg); border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md)">Swipe left for Delete, swipe right for Archive</div>
      <oas-button slot="actions-start" type="primary">Archive</oas-button>
      <oas-button slot="actions" type="danger">Delete</oas-button>
    </oas-swipe-cell>
  </div>
</DemoBlock>

## Basic Usage

A single swipe item: put the content in the default slot and the action button in `slot="actions"`. Swipe left (LTR) to reveal the right-hand action area and release to snap.

<DemoBlock title="Single swipe item">
  <div style="width: 100%">
    <oas-swipe-cell>
      <div style="padding: var(--oas-space-3) var(--oas-space-4); background: var(--oas-color-bg); border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md)">Swipe left to see actions</div>
      <oas-button slot="actions" type="danger" style="height: 100%">Delete</oas-button>
    </oas-swipe-cell>
  </div>
</DemoBlock>

## Single-Open Exclusion & Events

At most one swipe item is open within the same document at a time: once an item settles open it broadcasts and automatically closes any other open item. Clicking empty space, scrolling a container, or pressing Esc also closes the current item. The feedback area below shows the most recent `oas-open` / `oas-close`.

<DemoBlock title="Multiple swipe items + event feedback">
  <div style="width: 100%; display: flex; flex-direction: column; gap: var(--oas-space-2)">
    <oas-swipe-cell id="swipe-demo-1">
      <div style="padding: var(--oas-space-3) var(--oas-space-4); background: var(--oas-color-bg); border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md)">Item one</div>
      <oas-button slot="actions" type="primary" style="height: 100%">Edit</oas-button>
    </oas-swipe-cell>
    <oas-swipe-cell id="swipe-demo-2">
      <div style="padding: var(--oas-space-3) var(--oas-space-4); background: var(--oas-color-bg); border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md)">Item two</div>
      <oas-button slot="actions" type="primary" style="height: 100%">Edit</oas-button>
    </oas-swipe-cell>
    <oas-swipe-cell id="swipe-demo-3">
      <div style="padding: var(--oas-space-3) var(--oas-space-4); background: var(--oas-color-bg); border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md)">Item three</div>
      <oas-button slot="actions" type="danger" style="height: 100%">Delete</oas-button>
    </oas-swipe-cell>
    <span id="swipe-demo-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">Swipe any item to see event feedback</span>
  </div>
</DemoBlock>

## Threshold / Disabled / Programmatic Open

`threshold` sets the release snap distance (default 40px; a drag beyond it snaps open, otherwise it bounces back); `disabled` disables all gestures; `open` is readable and writable for controlled or programmatic open/close (true when either side is open). Programmatic `open` changes dispatch `oas-open` / `oas-close`; the `open-side` attribute (or same-named property) selects/reads which side opens—setting `open-side` together with `open` opens that side, and `detail.side` reports which.

<DemoBlock title="threshold and disabled">
  <div style="width: 100%; display: flex; flex-direction: column; gap: var(--oas-space-2)">
    <oas-swipe-cell threshold="100">
      <div style="padding: var(--oas-space-3) var(--oas-space-4); background: var(--oas-color-bg); border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md)">Threshold 100px: drag farther to snap open</div>
      <oas-button slot="actions" type="danger" style="height: 100%">Delete</oas-button>
    </oas-swipe-cell>
    <oas-swipe-cell disabled>
      <div style="padding: var(--oas-space-3) var(--oas-space-4); background: var(--oas-color-bg); border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md)">Disabled: gestures have no effect</div>
      <oas-button slot="actions" type="danger" disabled style="height: 100%">Delete</oas-button>
    </oas-swipe-cell>
  </div>
</DemoBlock>

<DemoBlock title="Programmatic open">
  <div style="width: 100%; display: flex; flex-direction: column; gap: var(--oas-space-2)">
    <oas-swipe-cell id="swipe-open-demo" open>
      <div style="padding: var(--oas-space-3) var(--oas-space-4); background: var(--oas-color-bg); border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md)">Initially open: the action area is already revealed</div>
      <oas-button slot="actions" type="primary" style="height: 100%">Edit</oas-button>
    </oas-swipe-cell>
    <div style="display: flex; gap: var(--oas-space-2)">
      <oas-button id="swipe-open-toggle" size="small">Toggle open</oas-button>
    </div>
  </div>
</DemoBlock>

## Keyboard & Accessibility

- The action area is `role="group"` with an accessible name (i18n `swipeCell.actionsLabel`); with two sides, each group has its own.
- Action buttons are natively tabbable in the DOM: focusing into the matching side's action area opens that side automatically, so keyboard users can see and operate the buttons without a swipe gesture.
- Press Esc to close an open item; under `prefers-reduced-motion` the snap has no transition.
- The component does not change the role or semantics of the content layer; screen readers read it using the structure provided by the host.

## API

### oas-swipe-cell

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `disabled` | Disable all gestures | `boolean` | — |
| `open` | Open state (read/write; true when either side is open; programmatic changes dispatch oas-open / oas-close) | `boolean` | — |
| `open-side` | Current/target open side: `start` / `end`; set together with `open` to open that side, read back to reflect the current side | `'' \| 'start' \| 'end'` | — |
| `side` | Side the actions attach to: `end` (default, inline-end—right in LTR / left in RTL, swipe toward inline-start) / `start` (inline-start, swipe toward inline-end—rightward in LTR); orthogonal to text direction, mirrors automatically in RTL; ignored when the item also has `actions-start` | `string` | `end` |
| `threshold` | Release snap threshold (px); a drag beyond it snaps open, otherwise it bounces closed | — | — |

#### Events

| Event | Description |
| --- | --- |
| `oas-close` | Dispatched when the closed state settles (gesture, outside click, scroll, Esc, or programmatic open change) |
| `oas-open` | Dispatched when the open state settles (gesture or programmatic open change); `detail: { side }` reports the side |

#### Slots

| Name | Description |
| --- | --- |
| default | Content layer (list item body); the component does not change its semantics |
| `actions` | Action button group (placed on the inline-end side; role=group + aria-label) |
| `actions-start` | Second action button group (placed on the inline-start side, revealed by swiping right; opens exclusively with `actions` on the same item) |

#### CSS Variables

| CSS Variable | Default |
| --- | --- |
| `--oas-swipe-cell-actions-bg` | `var(--oas-color-bg-hover)` |
| `--oas-swipe-cell-bg` | `var(--oas-color-bg)` |
| `--oas-swipe-cell-offset` | `0px` |

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  customElements.whenDefined('oas-swipe-cell').then(() => {
    const out = document.getElementById('swipe-demo-out')
    const show = (id, type) => {
      if (out) out.textContent = `${id} → oas-${type}`
    }
    for (const id of ['swipe-demo-1', 'swipe-demo-2', 'swipe-demo-3']) {
      const el = document.getElementById(id)
      el?.addEventListener('oas-open', () => show(id, 'open'))
      el?.addEventListener('oas-close', () => show(id, 'close'))
    }
    const toggle = document.getElementById('swipe-open-toggle')
    const openDemo = document.getElementById('swipe-open-demo')
    toggle?.addEventListener('click', () => {
      openDemo?.toggleAttribute('open')
    })
  })
})
</script>
