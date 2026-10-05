# SwipeCell

Reveal a row of action buttons by swiping a list item horizontally: the default slot is the **content layer** (the list item body) and `slot="actions"` is the **action button group** (the host places `button` / `oas-button` elements). Swiping the content layer toward inline-start reveals the inline-end action area; releasing snaps to open or closed based on the drag threshold. `oas-open` / `oas-close` are dispatched once each when the open / closed state settles (programmatic `open` attribute changes dispatch them too).

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

`threshold` sets the release snap distance (default 40px; a drag beyond it snaps open, otherwise it bounces back); `disabled` disables all gestures; `open` is readable and writable for controlled or programmatic open/close. Programmatic `open` changes also dispatch `oas-open` / `oas-close`.

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

- The action area is `role="group"` with an accessible name (i18n `swipeCell.actionsLabel`).
- Action buttons are natively tabbable in the DOM: focusing into the action area opens the item automatically, so keyboard users can see and operate the buttons without a swipe gesture.
- Press Esc to close an open item; under `prefers-reduced-motion` the snap has no transition.
- The component does not change the role or semantics of the content layer; screen readers read it using the structure provided by the host.

## API

### oas-swipe-cell

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `disabled` | Disable all gestures | `boolean` | — |
| `open` | Open state (read/write; programmatic changes dispatch oas-open / oas-close) | `boolean` | — |
| `threshold` | Release snap threshold (px); a drag beyond it snaps open, otherwise it bounces closed | — | — |

#### Events

| Event | Description |
| --- | --- |
| `oas-close` | Dispatched when the closed state settles (gesture, outside click, scroll, Esc, or programmatic open change) |
| `oas-open` | Dispatched when the open state settles (gesture or programmatic open change) |

#### Slots

| Name | Description |
| --- | --- |
| default | Content layer (list item body); the component does not change its semantics |
| `actions` | Action button group (placed on the inline-end side; role=group + aria-label) |

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
