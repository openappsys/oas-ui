# ScrollArea

A container that wraps content and takes over the scrollbar appearance: a thin custom scrollbar that thickens on hover; with `auto-hide` it is only shown while scrolling or hovering, and scroll events are throttled.

## Basic usage

`height` fixes the viewport height and content that overflows scrolls vertically; the scrollbar renders as a thin bar that thickens on hover.

<DemoBlock title="Fixed-height scrolling">
  <oas-scroll-area height="200" style="width: 320px">
    <div style="padding: var(--oas-space-2)">
      <p style="margin: var(--oas-space-2) 0">Line 1: ScrollArea supports a custom scrollbar appearance</p>
      <p style="margin: var(--oas-space-2) 0">Line 2: thin bar that thickens on hover</p>
      <p style="margin: var(--oas-space-2) 0">Line 3: scroll events throttled into oas-scroll</p>
      <p style="margin: var(--oas-space-2) 0">Line 4: smooth wheel scrolling</p>
      <p style="margin: var(--oas-space-2) 0">Line 5: auto-hide supported</p>
      <p style="margin: var(--oas-space-2) 0">Line 6: horizontal content also gets the custom scrollbar</p>
      <p style="margin: var(--oas-space-2) 0">Line 7: colors use theme tokens</p>
      <p style="margin: var(--oas-space-2) 0">Line 8: great for lists, logs and long text</p>
      <p style="margin: var(--oas-space-2) 0">Line 9: no scrollbar when content fits</p>
      <p style="margin: var(--oas-space-2) 0">Line 10: custom content slot</p>
    </div>
  </oas-scroll-area>
</DemoBlock>

## Width and horizontal scrolling

`width` fixes the viewport width; wide content produces a horizontal scrollbar.

<DemoBlock title="Horizontal scrolling">
  <oas-scroll-area height="120" style="width: 100%">
    <div style="display: flex; gap: var(--oas-space-3); padding: var(--oas-space-2); width: max-content">
      <div style="flex-shrink: 0; width: 200px; height: 80px; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center; color: var(--oas-color-text-secondary)">Card 1</div>
      <div style="flex-shrink: 0; width: 200px; height: 80px; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center; color: var(--oas-color-text-secondary)">Card 2</div>
      <div style="flex-shrink: 0; width: 200px; height: 80px; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center; color: var(--oas-color-text-secondary)">Card 3</div>
      <div style="flex-shrink: 0; width: 200px; height: 80px; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center; color: var(--oas-color-text-secondary)">Card 4</div>
      <div style="flex-shrink: 0; width: 200px; height: 80px; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center; color: var(--oas-color-text-secondary)">Card 5</div>
      <div style="flex-shrink: 0; width: 200px; height: 80px; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center; color: var(--oas-color-text-secondary)">Card 6</div>
    </div>
  </oas-scroll-area>
</DemoBlock>

## auto-hide

With `auto-hide` the scrollbar is hidden normally and only appears while scrolling or hovering the viewport, then fades out automatically after stopping.

<DemoBlock title="auto-hide">
  <oas-scroll-area auto-hide height="160" style="width: 320px">
    <div style="padding: var(--oas-space-2)">
      <p style="margin: var(--oas-space-2) 0">Scroll to see the scrollbar: hidden normally, shown while scrolling</p>
      <p style="margin: var(--oas-space-2) 0">Stop for a second and the scrollbar fades out automatically</p>
      <p style="margin: var(--oas-space-2) 0">Hovering over the area also shows it temporarily</p>
      <p style="margin: var(--oas-space-2) 0">Great for UIs where a scrollbar would distract from reading</p>
      <p style="margin: var(--oas-space-2) 0">Recommended for mobile card lists</p>
    </div>
  </oas-scroll-area>
</DemoBlock>

## Scroll event

Scroll events are throttled with rAF and fire `oas-scroll`; `detail` carries `{ scrollTop, scrollLeft }`.

<DemoBlock title="oas-scroll event">
  <div style="width: 320px">
    <oas-scroll-area id="sa-event" height="160">
      <div style="padding: var(--oas-space-2)">
        <p style="margin: var(--oas-space-2) 0">Line 1: scroll events throttled</p>
        <p style="margin: var(--oas-space-2) 0">Line 2: detail carries scrollTop / scrollLeft</p>
        <p style="margin: var(--oas-space-2) 0">Line 3: great for scroll listeners and lazy loading</p>
        <p style="margin: var(--oas-space-2) 0">Line 4: complements virtual-list scrolling</p>
        <p style="margin: var(--oas-space-2) 0">Line 5: scrollbar position stays in sync</p>
        <p style="margin: var(--oas-space-2) 0">Line 6: keep scrolling to see the output</p>
        <p style="margin: var(--oas-space-2) 0">Line 7: throttling avoids high-frequency events</p>
        <p style="margin: var(--oas-space-2) 0">Line 8: the last example</p>
      </div>
    </oas-scroll-area>
    <p style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: var(--oas-space-2) 0 0">
      scrollTop: <span id="sa-scrolltop">0</span>
    </p>
  </div>
</DemoBlock>

## Programmatic scrolling

The component instance exposes `scrollTo(options)` / `scrollToTop()` / `scrollToBottom()` / `scrollIntoView(selectorOrEl)` methods (delegating to native viewport scrolling; `behavior` is smooth by default) for host-controlled programmatic scrolling.

<DemoBlock title="Programmatic scroll methods">
  <div style="width: 320px">
    <oas-scroll-area id="sa-prog" height="180">
      <div style="padding: var(--oas-space-2)">
        <p style="margin: var(--oas-space-2) 0">Line 1: programmatic scrolling demo (buttons call instance methods)</p>
        <p style="margin: var(--oas-space-2) 0">Line 2: scrollTo accepts { top, left, behavior }</p>
        <p style="margin: var(--oas-space-2) 0">Line 3: scrollToTop / scrollToBottom in one call</p>
        <p style="margin: var(--oas-space-2) 0">Line 4: scrollIntoView locates an element inside the container</p>
        <p style="margin: var(--oas-space-2) 0; padding: var(--oas-space-2); background: var(--oas-color-bg-hover); border-radius: var(--oas-radius-sm)" id="sa-prog-target">Target line: located by scrollIntoView</p>
        <p style="margin: var(--oas-space-2) 0">Line 6: smooth scrolling handled by the browser</p>
        <p style="margin: var(--oas-space-2) 0">Line 7: great for "back to top" and "load-more positioning"</p>
        <p style="margin: var(--oas-space-2) 0">Line 8: keep scrolling to the bottom</p>
        <p style="margin: var(--oas-space-2) 0">Line 9: more content to fill the height</p>
        <p style="margin: var(--oas-space-2) 0">Line 10: the last line</p>
      </div>
    </oas-scroll-area>
    <oas-space style="margin-top: var(--oas-space-2)">
      <oas-button size="small" onclick="window.saProg && window.saProg.scrollToBottom()">Scroll to bottom</oas-button>
      <oas-button size="small" onclick="window.saProg && window.saProg.scrollToTop()">Back to top</oas-button>
      <oas-button size="small" onclick="window.saProg && window.saProg.scrollTo({ top: 120 })">Scroll to 120px</oas-button>
      <oas-button size="small" onclick="window.saProg && window.saProg.scrollIntoView('#sa-prog-target')">Locate target</oas-button>
    </oas-space>
  </div>
</DemoBlock>

## Scroll shadow

`scroll-shadow` enables scroll edge shadows (CSS-only, same technique as the modal): the shadow fades at an edge as you scroll toward it, and both top and bottom edges show shadows while in the middle.

<DemoBlock title="scroll-shadow">
  <oas-scroll-area scroll-shadow height="180" style="width: 320px">
    <div style="padding: var(--oas-space-2)">
      <p style="margin: var(--oas-space-2) 0">Line 1: scroll-shadow shows scroll edge shadows</p>
      <p style="margin: var(--oas-space-2) 0">Line 2: at the top, the upper shadow fades away</p>
      <p style="margin: var(--oas-space-2) 0">Line 3: in the middle, shadows appear at both edges</p>
      <p style="margin: var(--oas-space-2) 0">Line 4: hinting that more content exists in that direction</p>
      <p style="margin: var(--oas-space-2) 0">Line 5: at the bottom, the lower shadow fades away</p>
      <p style="margin: var(--oas-space-2) 0">Line 6: great for long lists, chat logs and news articles</p>
      <p style="margin: var(--oas-space-2) 0">Line 7: pure CSS, zero JS cost</p>
      <p style="margin: var(--oas-space-2) 0">Line 8: keep scrolling to watch the shadows change</p>
    </div>
  </oas-scroll-area>
</DemoBlock>

## Stick to bottom

With `stick-to-bottom`, when new content is appended and the user is already at the bottom (within 8px), the viewport auto-scrolls to the new bottom; appends never interrupt reading history. Perfect for chat and log streams.

<DemoBlock title="stick-to-bottom">
  <div style="width: 320px">
    <oas-scroll-area id="sa-stick" stick-to-bottom height="200" style="border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md)">
      <div id="sa-chat" style="padding: var(--oas-space-2); display: flex; flex-direction: column; gap: var(--oas-space-2)">
        <div style="padding: var(--oas-space-2); background: var(--oas-color-bg-hover); border-radius: var(--oas-radius-sm)">Message 1: welcome to stick-to-bottom</div>
        <div style="padding: var(--oas-space-2); background: var(--oas-color-bg-hover); border-radius: var(--oas-radius-sm)">Message 2: appends auto-scroll to the bottom when you are there</div>
        <div style="padding: var(--oas-space-2); background: var(--oas-color-bg-hover); border-radius: var(--oas-radius-sm)">Message 3: appends never interrupt reading history</div>
        <div style="padding: var(--oas-space-2); background: var(--oas-color-bg-hover); border-radius: var(--oas-radius-sm)">Message 4: scroll to the bottom first, then hit append</div>
      </div>
    </oas-scroll-area>
    <oas-button size="small" style="margin-top: var(--oas-space-2)" onclick="window.saAppend && window.saAppend()">Append a message</oas-button>
    <p style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: var(--oas-space-2) 0 0">
      Click "Append a message" to see auto-sticking; scroll up to the middle first and append again — you won't be dragged back down.
    </p>
  </div>
</DemoBlock>

## End-reached event (oas-end-reached)

`oas-end-reached` fires when scrolling reaches the container bottom (or the horizontal right edge), with `detail: { direction: 'bottom' | 'right' }`. `end-distance` sets how many px before the edge counts as reached (default 0). After firing, you must leave the edge and come back to fire again — the classic infinite-scroll pattern.

<DemoBlock title="oas-end-reached event">
  <div style="width: 320px">
    <oas-scroll-area id="sa-end" end-distance="10" height="160">
      <div id="sa-end-list" style="padding: var(--oas-space-2)">
        <p style="margin: var(--oas-space-2) 0">Initial 1: scroll to the bottom to fire oas-end-reached</p>
        <p style="margin: var(--oas-space-2) 0">Initial 2: end-distance=10 fires slightly early</p>
        <p style="margin: var(--oas-space-2) 0">Initial 3: new items are appended on fire</p>
        <p style="margin: var(--oas-space-2) 0">Initial 4: leave the bottom and come back to fire again</p>
        <p style="margin: var(--oas-space-2) 0">Initial 5: the classic infinite-scroll use case</p>
      </div>
    </oas-scroll-area>
    <p style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: var(--oas-space-2) 0 0">
      Fired: <span id="sa-end-count">0</span>
    </p>
  </div>
</DemoBlock>

## RTL

When the host sets `dir="rtl"`, horizontal scrollbar behavior and wheel translation follow RTL semantics: in Chromium/Firefox the horizontal `scrollLeft` lives in the negative range `[-max, 0]`, wheel-to-horizontal translation scrolls in the opposite direction from LTR, and the thumb position is computed from the absolute value.

<DemoBlock title="RTL horizontal scrolling">
  <oas-scroll-area dir="rtl" height="120" style="width: 100%">
    <div style="display: flex; gap: var(--oas-space-3); padding: var(--oas-space-2); width: max-content">
      <div style="flex-shrink: 0; width: 200px; height: 80px; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center; color: var(--oas-color-text-secondary)">Card 1 (starts right)</div>
      <div style="flex-shrink: 0; width: 200px; height: 80px; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center; color: var(--oas-color-text-secondary)">Card 2</div>
      <div style="flex-shrink: 0; width: 200px; height: 80px; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center; color: var(--oas-color-text-secondary)">Card 3</div>
      <div style="flex-shrink: 0; width: 200px; height: 80px; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center; color: var(--oas-color-text-secondary)">Card 4</div>
      <div style="flex-shrink: 0; width: 200px; height: 80px; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center; color: var(--oas-color-text-secondary)">Card 5</div>
      <div style="flex-shrink: 0; width: 200px; height: 80px; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center; color: var(--oas-color-text-secondary)">Card 6 (left end)</div>
    </div>
  </oas-scroll-area>
  <p style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: var(--oas-space-2) 0 0">
    Under `dir="rtl"` the content starts right-aligned and the wheel/trackpad scroll direction is opposite to LTR. Note: the rendered horizontal scrollbar position follows the browser's native RTL behavior.
  </p>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const el = document.getElementById('sa-event')
  const out = document.getElementById('sa-scrolltop')
  el?.addEventListener('oas-scroll', (e) => {
    out.textContent = String(e.detail.scrollTop)
  })

  // programmatic scroll demo
  window.saProg = document.getElementById('sa-prog')

  // stick-to-bottom demo
  window.saAppend = () => {
    const chat = document.getElementById('sa-chat')
    if (!chat) return
    const now = new Date().toLocaleTimeString()
    const msg = document.createElement('div')
    msg.style.padding = 'var(--oas-space-2)'
    msg.style.background = 'var(--oas-color-bg-hover)'
    msg.style.borderRadius = 'var(--oas-radius-sm)'
    msg.textContent = `Message ${chat.children.length + 1}: ${now} appended`
    chat.appendChild(msg)
  }

  // end-reached demo: append + count
  const endArea = document.getElementById('sa-end')
  const list = document.getElementById('sa-end-list')
  const count = document.getElementById('sa-end-count')
  let triggered = 0
  endArea?.addEventListener('oas-end-reached', (e) => {
    if (e.detail.direction !== 'bottom') return
    triggered += 1
    count.textContent = String(triggered)
    const p = document.createElement('p')
    p.style.margin = 'var(--oas-space-2) 0'
    p.textContent = `Appended ${list.children.length + 1}: load #${triggered}`
    list.appendChild(p)
  })
})
</script>

## API

### Methods

| Method | Description |
| --- | --- |
| `scrollTo(options)` / `scrollTo(x, y)` | Scrolls to a position, `options: { top?, left?, behavior?: 'auto' \| 'smooth' }` (delegates to the viewport) |
| `scrollToTop(options?)` / `scrollToBottom(options?)` | Scrolls to the top/bottom, `options: { behavior? }`, smooth by default |
| `scrollIntoView(selectorOrEl, options?)` | Scrolls an element inside the container into view; `block` / `inline` from `options` are passed through |

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `auto-hide` | The scrollbar is shown only while scrolling/hovering, then auto-hides after a timeout | `boolean` | — |
| `end-distance` | Trigger distance for `oas-end-reached` (px, default `0`): within N px of the bottom/right edge counts as reached | `string` | `0` |
| `height` | Viewport height (px); when unset, grows with the content | — | — |
| `scroll-shadow` | Scroll edge shadow (CSS-only): the shadow fades at each edge as you scroll, hinting that more content exists | — | — |
| `stick-to-bottom` | Stick to bottom: when new content is appended and the user is at the bottom (≤8px), auto-scroll to the new bottom; never interrupts reading history | `boolean` | — |
| `width` | Viewport width (px); when unset, fills the host width | — | — |

### Events

| Event | Description |
| --- | --- |
| `oas-end-reached` | Fired when scrolling reaches the container bottom (or the horizontal right edge), `detail: { direction: 'bottom' \| 'right' }`; re-arms only after leaving the edge |
| `oas-scroll` | Scroll event (rAF-throttled), `detail: { scrollTop, scrollLeft }` |

### Slots

| Name | Description |
| --- | --- |
| default | — |

Parts: `::part(viewport)` is the scrolling viewport, `::part(track-v)` / `::part(track-h)` are the scroll tracks, `::part(thumb-v)` / `::part(thumb-h)` are the scroll thumbs. The viewport is focusable (`tabindex="0"`) and scrolls with arrow keys.
