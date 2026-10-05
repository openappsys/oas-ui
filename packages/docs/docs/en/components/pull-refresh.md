# PullRefresh

A mobile pull-to-refresh container: the default slot is the scrollable content (a list, etc.) and the container itself is the scroll box (height constrained by the host). Keep pulling down past the top of the list to reveal the indicator, which follows the finger with a resistance curve (asymptotically approaching the distance cap); releasing past the threshold triggers a refresh — `oas-refresh` is dispatched and the component parks at the threshold height showing the refreshing visual. When the host finishes the async refresh it removes `refreshing`, and the component plays the success copy before bouncing back. Mouse drag works the same on desktop (unified pointer events); wheel scrolling is unaffected. Colors derive from semantic tokens and adapt to dark mode automatically.

## Basic Usage

Give the container a fixed height (host-constrained) and put a plain list inside. On touch screens keep pulling down at the top of the list; on desktop hold the left mouse button and drag vertically. On release the host sets `refreshing` to start the async refresh and removes it when done (the demo simulates a 900 ms data fetch).

<DemoBlock title="Pull to refresh with visible event feedback">
  <div style="width: 100%">
    <oas-pull-refresh id="pr-basic" style="height: 280px; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md)">
      <div style="padding: 10px 14px; border-bottom: 1px solid var(--oas-color-border)">Item 01 — keep pulling down at the top</div>
      <div style="padding: 10px 14px; border-bottom: 1px solid var(--oas-color-border)">Item 02</div>
      <div style="padding: 10px 14px; border-bottom: 1px solid var(--oas-color-border)">Item 03</div>
      <div style="padding: 10px 14px; border-bottom: 1px solid var(--oas-color-border)">Item 04</div>
      <div style="padding: 10px 14px; border-bottom: 1px solid var(--oas-color-border)">Item 05</div>
      <div style="padding: 10px 14px; border-bottom: 1px solid var(--oas-color-border)">Item 06</div>
      <div style="padding: 10px 14px; border-bottom: 1px solid var(--oas-color-border)">Item 07</div>
      <div style="padding: 10px 14px; border-bottom: 1px solid var(--oas-color-border)">Item 08</div>
      <div style="padding: 10px 14px; border-bottom: 1px solid var(--oas-color-border)">Item 09</div>
      <div style="padding: 10px 14px; border-bottom: 1px solid var(--oas-color-border)">Item 10</div>
      <div style="padding: 10px 14px">Item 11 (scroll back to the top and pull again)</div>
    </oas-pull-refresh>
    <p id="pr-basic-out" style="margin: 8px 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">Pull down from the top inside the list →</p>
  </div>
</DemoBlock>

## Threshold and Resistance

`threshold` (default 60 px) is the pull distance required at release to trigger a refresh; `max-pull` (default 100 px) caps the distance — while pulling, the distance follows the resistance curve `pull = maxPull × (1 − e^(−dy/maxPull))` and asymptotically approaches the cap (diminishing gain per pixel for a physical damping feel). Past the threshold the arrow flips and the copy changes to "Release to refresh"; releasing below it springs back with zero side effects.

<DemoBlock title="threshold=40 / max-pull=160: lighter trigger, longer travel">
  <div style="width: 100%">
    <oas-pull-refresh id="pr-threshold" threshold="40" max-pull="160" style="height: 240px; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md)">
      <div style="padding: 10px 14px; border-bottom: 1px solid var(--oas-color-border)">Item 01 — pull past 40 px and release to trigger</div>
      <div style="padding: 10px 14px; border-bottom: 1px solid var(--oas-color-border)">Item 02</div>
      <div style="padding: 10px 14px; border-bottom: 1px solid var(--oas-color-border)">Item 03</div>
      <div style="padding: 10px 14px; border-bottom: 1px solid var(--oas-color-border)">Item 04</div>
      <div style="padding: 10px 14px; border-bottom: 1px solid var(--oas-color-border)">Item 05</div>
      <div style="padding: 10px 14px; border-bottom: 1px solid var(--oas-color-border)">Item 06</div>
      <div style="padding: 10px 14px; border-bottom: 1px solid var(--oas-color-border)">Item 07</div>
      <div style="padding: 10px 14px">Item 08</div>
    </oas-pull-refresh>
    <p id="pr-threshold-out" style="margin: 8px 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">Try a shorter pull →</p>
  </div>
</DemoBlock>

## Disabled

`disabled` turns the gesture off entirely (the config-provider global disabled injection behaves the same): setting it mid-drag cancels immediately and springs back without dispatching any event.

<DemoBlock title="disabled: gesture does not respond">
  <div style="width: 100%">
    <oas-pull-refresh id="pr-disabled" disabled style="height: 180px; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md)">
      <div style="padding: 10px 14px; border-bottom: 1px solid var(--oas-color-border)">Item 01 — pulling does nothing (disabled)</div>
      <div style="padding: 10px 14px; border-bottom: 1px solid var(--oas-color-border)">Item 02</div>
      <div style="padding: 10px 14px; border-bottom: 1px solid var(--oas-color-border)">Item 03</div>
      <div style="padding: 10px 14px; border-bottom: 1px solid var(--oas-color-border)">Item 04</div>
      <div style="padding: 10px 14px">Item 05</div>
    </oas-pull-refresh>
    <p id="pr-disabled-out" style="margin: 8px 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">Pulling while disabled never dispatches oas-refresh</p>
  </div>
</DemoBlock>

## Scroll Coordination and Accessibility

- The container carries `overscroll-behavior-y: contain` (no scroll chaining: pulling past the top never hands off to the page or triggers a page-level pull-to-refresh) and `touch-action: pan-y`; when the pointer starts at the top and moves down, the component takes over the gesture and calls `preventDefault` to block native scrolling; starting below the top or pulling up hands everything back to native scrolling.
- Wheel scrolling is unaffected (the gesture is driven by pointer drags only).
- The indicator is `role="status"` + `aria-live="polite"`: copy changes (Pull to refresh → Release to refresh → Refreshing… → Refresh successful) are announced to screen readers; the component never grabs keyboard focus and the content semantics are entirely provided by the host.
- Under `prefers-reduced-motion` the spring-back/flip transitions are disabled (state changes apply instantly; the spinner remains).

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  // whenDefined guards against the pre-upgrade expando shadowing setters
  Promise.all([customElements.whenDefined('oas-pull-refresh')]).then(() => {
    // oas-refresh → host sets refreshing to simulate an async fetch → removes it → success copy → reset
    const wire = (id, outId, delay) => {
      const host = document.getElementById(id)
      const out = document.getElementById(outId)
      let timer = null
      host?.addEventListener('oas-refresh', () => {
        if (out) out.textContent = 'oas-refresh dispatched → host fetching data (refreshing, parked)'
        host.setAttribute('refreshing', '')
        clearTimeout(timer)
        timer = setTimeout(() => {
          host.removeAttribute('refreshing')
          if (out) out.textContent = 'Refresh complete (refreshing removed → "Refresh successful" → bounced back)'
        }, delay)
      })
    }
    wire('pr-basic', 'pr-basic-out', 900)
    wire('pr-threshold', 'pr-threshold-out', 700)
    wire('pr-disabled', 'pr-disabled-out', 700)
  })
})
</script>

## API

### oas-pull-refresh

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `disabled` | Disables the pull gesture entirely (the config-provider global disabled injection behaves the same); setting it mid-drag cancels immediately and springs back without dispatching | `boolean` | — |
| `max-pull` | Pull distance cap (px, default 100): the resistance curve `pull = maxPull × (1 − e^(−dy/maxPull))` approaches the cap with diminishing gain | — | — |
| `refreshing` | Refreshing (host-controlled): after oas-refresh the host sets it to start the async refresh and removes it when done; the component plays the success copy for about 600ms then bounces back; further pulls are ignored while refreshing; setting it without a gesture (programmatic refresh) parks at the refreshing visual too, without dispatching | `boolean` | — |
| `threshold` | Pull distance threshold to trigger a refresh (px, default 60): oas-refresh is dispatched on release only when the pulled distance reaches it; invalid/non-positive falls back to the default; the effective value is clamped to max-pull | — | — |

#### Events

| Event | Description |
| --- | --- |
| `oas-refresh` | Dispatched once when the pull is released past the threshold; the component parks at the threshold height in the refreshing visual and waits for the host to set refreshing (it stays parked otherwise) |

#### Slots

| Name | Description |
| --- | --- |
| default | Scrollable content (a list, etc.); the container itself is the scroll box (overflow-y: auto), height constrained by the host |

#### CSS Variables

| CSS Variable | Default |
| --- | --- |
| `--oas-pull-refresh-indicator-height` | `48px` |
| `--oas-pull-refresh-label-color` | `var(--oas-color-text-secondary)` |
| `--oas-pull-refresh-spinner-color` | `var(--oas-color-primary)` |

#### Parts

| Part | Description |
| --- | --- |
| `root` | Scroll box container (overflow-y: auto + no scroll chaining) |
| `track` | Translation layer (carries the pull transform, spring-back transition) |
| `indicator` | Indicator area (role="status" + aria-live="polite") |
| `arrow` | Pull-down arrow (flips past the threshold; hidden while refreshing/success) |
| `spinner` | Rotating indicator while refreshing (mutually exclusive with the arrow) |
| `label` | State copy (i18n, four states) |
| `content` | Content area (default slot projection) |
