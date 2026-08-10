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

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const el = document.getElementById('sa-event')
  const out = document.getElementById('sa-scrolltop')
  el?.addEventListener('oas-scroll', (e) => {
    out.textContent = String(e.detail.scrollTop)
  })
})
</script>

## API

| Property    | Description                                            | Type      | Default |
| ----------- | ------------------------------------------------------ | --------- | ------- |
| `height`    | Viewport height (px); when unset, grows with the content | `number`  | —       |
| `width`     | Viewport width (px); when unset, fills the host width   | `number`  | —       |
| `auto-hide` | The scrollbar is shown only while scrolling/hovering, then auto-hides after a timeout | `boolean` | `false` |

| Event        | Description                                                       |
| ------------ | ----------------------------------------------------------------- |
| `oas-scroll` | Scroll event (rAF-throttled), `detail: { scrollTop, scrollLeft }` |

Parts: `::part(viewport)` is the scrolling viewport, `::part(track-v)` / `::part(track-h)` are the scroll tracks, `::part(thumb-v)` / `::part(thumb-h)` are the scroll thumbs. The viewport is focusable (`tabindex="0"`) and scrolls with arrow keys.
