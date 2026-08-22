# BackTop

A back-to-top button fixed to a corner of the viewport: it auto-appears once you scroll past a threshold, and clicking smooth-scrolls back to the top. Supports custom scroll targets, a scroll progress ring, reverse (scroll-to-bottom) mode, full-width bars and more.

## Basic usage

By default it listens to window scroll: the button auto-appears once you scroll past `visibility-height` (default 400px), and clicking smooth-scrolls back to the top (jumps directly under `prefers-reduced-motion`).

<DemoBlock title="Basic usage">
  <oas-back-top></oas-back-top>
</DemoBlock>

## Custom position

Numeric positioning via `bottom` / `right` (default `32px`).

<DemoBlock title="Custom position">
  <oas-back-top visible bottom="96px"></oas-back-top>
  <oas-back-top visible right="96px" bottom="32px"></oas-back-top>
</DemoBlock>

## Show / hide control

When the `visible` attribute is present the component is controlled (show/hide fully decided by the host, scroll does not interfere); when absent it auto-toggles by the scroll threshold. Both kinds of switches dispatch `oas-visibility-change` (`detail.visible`).

<DemoBlock title="Show / hide control">
  <oas-button onclick="document.getElementById('bt-ctrl').toggleAttribute('visible')">Show / Hide</oas-button>
  <oas-back-top id="bt-ctrl" bottom="180px" onoas-visibility-change="document.getElementById('bt-state').textContent = 'State: ' + (event.detail.visible ? 'shown' : 'hidden')"></oas-back-top>
  <p id="bt-state" style="color: var(--oas-color-text-secondary)">State: hidden</p>
</DemoBlock>

## Click event

<DemoBlock title="Click event">
  <oas-button onclick="document.getElementById('bt-event').setAttribute('visible','')">Show button</oas-button>
  <oas-back-top id="bt-event" visible bottom="240px" onoas-click="message.info('About to smooth-scroll back to top')"></oas-back-top>
</DemoBlock>

## Custom content

The default slot renders custom content (it replaces the built-in arrow icon when present).

<DemoBlock title="Custom content">
  <oas-back-top visible bottom="280px" right="96px">⬆ Top</oas-back-top>
</DemoBlock>

## Threshold & target container

`visibility-height` tunes the auto-show threshold (default 400); `target` sets the scroll target container (a CSS selector, default: window): once the container is scrolled past the threshold the button appears, and clicking scrolls back to that container's top.

<DemoBlock title="Threshold & target container">
  <div id="bt-scroll-box" style="height: 200px; overflow: auto; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-4); background: var(--oas-color-bg-hover)">
    <p style="color: var(--oas-color-text-secondary)">This is a local scroll container: once you scroll past 200px the button at the bottom-right appears; clicking goes back to the container top.</p>
    <p style="margin-top: 600px; color: var(--oas-color-text-secondary)">Container bottom — scroll back and try it.</p>
  </div>
  <oas-back-top target="#bt-scroll-box" visibility-height="200" bottom="96px" right="80px"></oas-back-top>
</DemoBlock>

## Scroll duration & easing

`duration` controls the scroll duration (ms); `easing` selects the easing curve (default `quart-out`).

<DemoBlock title="Scroll duration & easing">
  <oas-back-top visible duration="1200" easing="back-out" bottom="320px" right="96px"></oas-back-top>
</DemoBlock>

## Shape & size

`shape` round (default) / square; `size` three tiers: `small` (32px) / `medium` (default, 40px) / `large` (48px).

<DemoBlock title="Shape & size">
  <oas-back-top visible shape="square" size="large" bottom="360px" right="96px"></oas-back-top>
  <oas-back-top visible size="small" bottom="360px"></oas-back-top>
</DemoBlock>

## Theme variants

`theme` three variants: `light` (default) / `primary` / `dark` (auto-inverted in dark theme to keep contrast).

<DemoBlock title="Theme variants">
  <oas-back-top visible theme="primary" bottom="400px" right="96px"></oas-back-top>
  <oas-back-top visible theme="dark" bottom="400px"></oas-back-top>
</DemoBlock>

## Transition

`transition` switches the enter/exit transition: `fade` (default) / `scale` / `none` (auto-disabled under `prefers-reduced-motion`).

<DemoBlock title="Transition">
  <oas-back-top visible transition="scale" bottom="440px" right="96px"></oas-back-top>
  <oas-back-top visible transition="none" bottom="440px"></oas-back-top>
</DemoBlock>

## Scroll progress

`show-progress` draws a scroll progress ring around the button edge (computed over the `target` container scroll range).

<DemoBlock title="Scroll progress">
  <oas-back-top visible show-progress bottom="480px"></oas-back-top>
</DemoBlock>

## Reverse (scroll to bottom)

`reverse` turns the button into a "scroll to bottom" control: it hides near the container bottom, and clicking scrolls to the container bottom.

<DemoBlock title="Reverse (scroll to bottom)">
  <div id="bt-rev-box" style="height: 200px; overflow: auto; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-4); background: var(--oas-color-bg-hover)">
    <p style="color: var(--oas-color-text-secondary)">This is a local scroll container: in `reverse` mode the button appears while you are not at the bottom; clicking scrolls to the bottom.</p>
    <p style="margin-top: 600px; color: var(--oas-color-text-secondary)">Container bottom.</p>
  </div>
  <oas-back-top reverse target="#bt-rev-box" bottom="96px" right="80px"></oas-back-top>
</DemoBlock>

## Full-width bar

`expand` makes the button span the full viewport bottom (content centered horizontally) and ignores `position` / `bottom` / `right`. This instance appears at the bottom once the page is scrolled past the threshold, and disappears again after clicking back to the top.

<DemoBlock title="Full-width bar">
  <oas-back-top expand>Back to top ↑</oas-back-top>
</DemoBlock>

## Position

`position` is an 8-direction enum (replacing the numeric `bottom` / `right`): `top-left` / `top-center` / `top-right` / `middle-left` / `middle-right` / `bottom-left` / `bottom-center` / `bottom-right` (`middle-*` vertically centers).

<DemoBlock title="Position">
  <oas-back-top visible position="bottom-left"></oas-back-top>
  <oas-back-top visible position="bottom-center"></oas-back-top>
</DemoBlock>

## Tooltip & badge

`tooltip` shows a bubble hint on hover / keyboard focus; `badge` shows content in a small badge at the button's top-right corner.

<DemoBlock title="Tooltip & badge">
  <oas-back-top visible tooltip="Back to top" badge="3" bottom="560px" right="96px"></oas-back-top>
</DemoBlock>

## Mount point

`append-to` teleports the component under the given container. This instance migrates its host under `#bt-app-root` (open the devtools to see the DOM move).

<DemoBlock title="Mount point">
  <div id="bt-app-root" style="border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-3); color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">Mount target container #bt-app-root</div>
  <oas-back-top append-to="#bt-app-root" bottom="600px"></oas-back-top>
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
| `append-to` | Teleport mount point: a CSS selector; on connect the component is moved under that container (kept in place when unset) | `string` | — |
| `badge` | Badge content: text/number shown in a small badge at the button's top-right corner | `string` | — |
| `bottom` | Distance from the viewport bottom | `string` | `32px` |
| `duration` | Smooth-scroll duration (ms), default 400; 0 or `prefers-reduced-motion` jumps directly | `string` | `400` |
| `easing` | Scroll easing function: `linear` / `ease` / `ease-in` / `ease-out` / `ease-in-out` / `quad-*` / `cubic-*` / `quart-*` / `quint-*` / `expo-*` / `circ-*` / `back-*`, default `quart-out` | `string` | `quart-out` |
| `expand` | Full-width bar mode: the button spans the full viewport bottom (content centered horizontally); ignores `position` / `bottom` / `right` | `boolean` | — |
| `position` | 8-direction enum: `top-left` / `top-center` / `top-right` / `middle-left` / `middle-right` / `bottom-left` / `bottom-center` / `bottom-right`; replaces the numeric `bottom` / `right` positioning when set (`middle-*` vertically centers); invalid values silently fall back to `bottom` / `right` | `string` | — |
| `reverse` | Reverse mode: becomes a "scroll to bottom" button (hidden near the container bottom; clicking scrolls to the container bottom) | `boolean` | — |
| `right` | Distance from the viewport right edge | `string` | `32px` |
| `shape` | Button shape: `circle` (default, round) / `square` (square corners) | `string` | `circle` |
| `show-progress` | Scroll progress ring: a progress ring around the button edge (SVG circle computed over the `target` container scroll range) | `boolean` | — |
| `size` | Size tier: `small` (32px) / `medium` (default, 40px) / `large` (48px) | `string` | `medium` |
| `target` | Scroll target container: a CSS selector; when set the component listens to that container's scroll and scrolls back to its top/bottom (default: window) | `string` | — |
| `theme` | Theme variant: `light` (default, light) / `primary` (primary fill) / `dark` (dark surface, auto-inverted in dark theme to keep contrast) | `string` | `light` |
| `tooltip` | Hover hint text: shows a bubble tooltip on hover / keyboard focus | `string` | — |
| `transition` | Enter/exit transition: `fade` (default, fade in/out) / `scale` (zoom) / `none`; disabled under `prefers-reduced-motion` | `string` | `fade` |
| `visibility-height` | Scroll threshold (px): the button auto-shows once scrolled beyond it, default 400 | `string` | `400` |
| `visible` | Controlled visibility: when present the host fully controls show/hide (scroll does not interfere); when absent the button auto-toggles by the scroll threshold | `boolean` | — |

### Events

| Event | Description |
| --- | --- |
| `oas-click` | The button was clicked (then scrolls to the target container top/bottom) |
| `oas-visibility-change` | Visibility state changed, `detail: { visible: boolean }` (dispatched on both controlled and uncontrolled switches; the initial sync on mount is not dispatched) |

### Slots

| Name | Description |
| --- | --- |
| default | Custom button content (replaces the built-in arrow icon when present) |

The button is fixed to the viewport (the `:host` is `position: fixed`, `z-index` via `--oas-z-fixed`); when hidden the button gets `aria-hidden="true"` and the host sets `pointer-events: none` so it never blocks clicks underneath.
