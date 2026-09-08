# Marquee

A purely presentational component that loops long content seamlessly via a slot; supports pause on hover and static fallback under `prefers-reduced-motion`. Scroll speed is a true pixels-per-second value (the component measures content width to derive duration), and content shorter than the container is auto-filled. No events.

::: warning Breaking change: `speed` semantics changed from "seconds" to "pixels per second"
In previous versions `speed` was the duration of a single loop (seconds): `speed="8"` meant one full loop in 8 seconds — the wider the content, the faster it visually moved, so the same value produced wildly different speeds across containers.
Now `speed` is the true scroll speed (pixels per second, default 48): the component measures the content width with a ResizeObserver and derives the animation duration (duration = content width ÷ speed), so the visual speed stays constant regardless of content or container width.

Migration guide: small legacy values (e.g. `speed="8"`) now mean 8px/s (extremely slow) — re-set them to a target speed (24–120 is common). To keep duration semantics, override the CSS variable `--oas-marquee-duration` directly (the measurement write will still overwrite it; not recommended).
:::

## Basic Usage

<DemoBlock title="Default looping scroll (48px/s)">
  <oas-marquee style="border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-2) 0;">
    OAS-UI component library · Web Components with no framework dependencies · Complete TypeScript types · Accessible ·
  </oas-marquee>
</DemoBlock>

## Speed Control

<DemoBlock title="speed=96 fast / speed=24 slow (pixels per second)">
  <oas-marquee speed="96" style="border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-2) 0;">
    Fast scrolling: 96 pixels per second
  </oas-marquee>
  <oas-marquee speed="24" style="border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-2) 0; margin-top: var(--oas-space-3);">
    Slow scrolling: 24 pixels per second
  </oas-marquee>
</DemoBlock>

With the same `speed="48"`, a 200px short text and a 2000px long text scroll at exactly the same visual speed (under the old "duration" semantics they differed by 10x) — this is why the speed semantics changed.

## Auto-fill

When content is shorter than the container, duplicating it only once leaves blank space on the right after half a loop (a broken seam). The component measures the container and content widths and auto-fills the clone group with enough copies, so the viewport always has content during a full one-group translation — seamless, no broken seam.

<DemoBlock title="auto-fill: short content loops seamlessly in a wide container">
  <oas-marquee style="border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-2) 0;">
    ✦ Short notice
  </oas-marquee>
</DemoBlock>

- The clone count is capped (50): with extremely short content in an extremely wide container, blank space is preferred over unbounded DOM growth; for heavy content like image walls, keep the content itself at least one viewport wide.
- The fill count is re-derived automatically when the container size changes (ResizeObserver).

## Vertical Scrolling

`orientation="vertical"` switches to vertical scrolling (announcement-style long text). **The container must have a fixed height** (overflow clipping only makes sense with one), given via host styles.

<DemoBlock title="orientation=vertical: vertical scrolling (fixed 96px height container)">
  <oas-marquee orientation="vertical" style="height: 96px; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-2);">
    <div>Notice 1: v2.6 display components batch released</div>
    <div>Notice 2: marquee supports true pixels-per-second speed</div>
    <div>Notice 3: content shorter than the viewport is auto-filled</div>
    <div>Notice 4: appending content does not jump the scroll</div>
  </oas-marquee>
</DemoBlock>

A vertical marquee is continuous-flow semantics; for "scroll one item at a time and pause", use `oas-carousel` with vertical direction.

## Reverse Scrolling

<DemoBlock title="reverse: opposite directions (two rows in counter-flow)">
  <oas-marquee style="border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-2) 0;">
    Forward: flows from left to right · OAS-UI · Web Components ·
  </oas-marquee>
  <oas-marquee reverse style="border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-2) 0; margin-top: var(--oas-space-3);">
    Reverse: flows from right to left · OAS-UI · Web Components ·
  </oas-marquee>
</DemoBlock>

## Edge Fading

`fade-edges` fades out both container edges (mask-image mask, off by default — fading softens edges and changes existing appearances, enable on demand). The fade width is controlled by the CSS variable `--oas-marquee-fade-size` (default 24px).

<DemoBlock title="fade-edges: logo wall with faded edges">
  <oas-marquee fade-edges style="border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-3) 0;">
    <svg viewBox="0 0 40 40" width="36" height="36" style="margin: 0 var(--oas-space-4); vertical-align: middle;"><rect width="40" height="40" rx="10" fill="#0b6cff"/><text x="20" y="26" font-size="18" text-anchor="middle" fill="#fff" font-family="sans-serif">A</text></svg>
    <svg viewBox="0 0 40 40" width="36" height="36" style="margin: 0 var(--oas-space-4); vertical-align: middle;"><rect width="40" height="40" rx="10" fill="#16a34a"/><text x="20" y="26" font-size="18" text-anchor="middle" fill="#fff" font-family="sans-serif">B</text></svg>
    <svg viewBox="0 0 40 40" width="36" height="36" style="margin: 0 var(--oas-space-4); vertical-align: middle;"><rect width="40" height="40" rx="10" fill="#d97706"/><text x="20" y="26" font-size="18" text-anchor="middle" fill="#fff" font-family="sans-serif">C</text></svg>
    <svg viewBox="0 0 40 40" width="36" height="36" style="margin: 0 var(--oas-space-4); vertical-align: middle;"><rect width="40" height="40" rx="10" fill="#dc2626"/><text x="20" y="26" font-size="18" text-anchor="middle" fill="#fff" font-family="sans-serif">D</text></svg>
    <svg viewBox="0 0 40 40" width="36" height="36" style="margin: 0 var(--oas-space-4); vertical-align: middle;"><rect width="40" height="40" rx="10" fill="#7c3aed"/><text x="20" y="26" font-size="18" text-anchor="middle" fill="#fff" font-family="sans-serif">E</text></svg>
    <svg viewBox="0 0 40 40" width="36" height="36" style="margin: 0 var(--oas-space-4); vertical-align: middle;"><rect width="40" height="40" rx="10" fill="#0891b2"/><text x="20" y="26" font-size="18" text-anchor="middle" fill="#fff" font-family="sans-serif">F</text></svg>
  </oas-marquee>
</DemoBlock>

## Pause on Hover

<DemoBlock title="pause-on-hover: pauses on mouse hover / focus">
  <oas-marquee pause-on-hover style="border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-2) 0;">
    Hover over this line to pause the scroll; move away to resume.
  </oas-marquee>
</DemoBlock>

## Dynamic Content Updates

When the host appends to or modifies the slot, the component rebuilds the clone group while preserving the animation phase (it records the current phase and resumes with a negative `animation-delay`), so the scroll position users see does not jump. The instance below appends a live notice every 3 seconds:

<DemoBlock title="Appending content: no scroll jump">
  <oas-marquee id="mq-live" pause-on-hover style="border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-2) 0;">
    All systems normal ·
  </oas-marquee>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  // whenDefined guard: slotchange-driven clone rebuild and phase preservation require an upgraded element
  customElements.whenDefined('oas-marquee').then(() => {
    const mq = document.querySelector('#mq-live')
    if (!mq) return
    let n = 0
    setInterval(() => {
      n += 1
      const span = document.createElement('span')
      span.textContent = ` Live notice ${n} ·`
      mq.appendChild(span)
    }, 3000)
  })
})
</script>

## Element Content

<DemoBlock title="slot supports arbitrary element combinations">
  <oas-marquee speed="60" style="border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-2) 0;">
    <oas-tag>New</oas-tag>
    <span style="margin: 0 var(--oas-space-3);">v1.6 display components are released</span>
    <oas-tag type="success">Recommended</oas-tag>
    <span style="margin-left: var(--oas-space-3);">Built on Web Components standards</span>
  </oas-marquee>
</DemoBlock>

## Image / Logo Wall

Content is not limited to text — putting images or logos in the slot produces the classic seamless "brand wall" scrolling.

<DemoBlock title="Logo wall (seamless loop + faded edges)">
  <oas-marquee fade-edges style="border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-3) 0;">
    <svg viewBox="0 0 40 40" width="36" height="36" style="margin: 0 var(--oas-space-4); vertical-align: middle;"><rect width="40" height="40" rx="10" fill="#0b6cff"/><text x="20" y="26" font-size="18" text-anchor="middle" fill="#fff" font-family="sans-serif">A</text></svg>
    <svg viewBox="0 0 40 40" width="36" height="36" style="margin: 0 var(--oas-space-4); vertical-align: middle;"><rect width="40" height="40" rx="10" fill="#16a34a"/><text x="20" y="26" font-size="18" text-anchor="middle" fill="#fff" font-family="sans-serif">B</text></svg>
    <svg viewBox="0 0 40 40" width="36" height="36" style="margin: 0 var(--oas-space-4); vertical-align: middle;"><rect width="40" height="40" rx="10" fill="#d97706"/><text x="20" y="26" font-size="18" text-anchor="middle" fill="#fff" font-family="sans-serif">C</text></svg>
    <svg viewBox="0 0 40 40" width="36" height="36" style="margin: 0 var(--oas-space-4); vertical-align: middle;"><rect width="40" height="40" rx="10" fill="#dc2626"/><text x="20" y="26" font-size="18" text-anchor="middle" fill="#fff" font-family="sans-serif">D</text></svg>
    <svg viewBox="0 0 40 40" width="36" height="36" style="margin: 0 var(--oas-space-4); vertical-align: middle;"><rect width="40" height="40" rx="10" fill="#7c3aed"/><text x="20" y="26" font-size="18" text-anchor="middle" fill="#fff" font-family="sans-serif">E</text></svg>
    <svg viewBox="0 0 40 40" width="36" height="36" style="margin: 0 var(--oas-space-4); vertical-align: middle;"><rect width="40" height="40" rx="10" fill="#0891b2"/><text x="20" y="26" font-size="18" text-anchor="middle" fill="#fff" font-family="sans-serif">F</text></svg>
  </oas-marquee>
</DemoBlock>

<DemoBlock title="Image scrolling (img)">
  <oas-marquee speed="36" style="border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-2) 0;">
    <img src="https://picsum.photos/seed/isui-mq-1/120/60" alt="Image 1" style="height: 44px; border-radius: var(--oas-radius-sm); margin: 0 var(--oas-space-3); vertical-align: middle;">
    <img src="https://picsum.photos/seed/isui-mq-2/120/60" alt="Image 2" style="height: 44px; border-radius: var(--oas-radius-sm); margin: 0 var(--oas-space-3); vertical-align: middle;">
    <img src="https://picsum.photos/seed/isui-mq-3/120/60" alt="Image 3" style="height: 44px; border-radius: var(--oas-radius-sm); margin: 0 var(--oas-space-3); vertical-align: middle;">
    <img src="https://picsum.photos/seed/isui-mq-4/120/60" alt="Image 4" style="height: 44px; border-radius: var(--oas-radius-sm); margin: 0 var(--oas-space-3); vertical-align: middle;">
  </oas-marquee>
</DemoBlock>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `fade-edges` | Boolean; when present, fades out both container edges with a mask-image (off by default); fade width via `--oas-marquee-fade-size` | — | — |
| `orientation` | Scroll direction: `horizontal` (default) / `vertical` (vertical scrolling; the container needs a fixed height) | — | — |
| `pause-on-hover` | Boolean; when present, pauses the animation on hover/focus (`animation-play-state: paused`) | — | — |
| `reverse` | Boolean; when present, scrolls in the opposite direction | — | — |
| `speed` | Scroll speed in pixels per second (default 48); the animation duration is derived from the measured content width (duration = distance / speed); invalid or non-positive values fall back to the default | `string` | — |

### Slots

| Name | Description |
| --- | --- |
| default | — |

- When the system enables "reduce motion" (`prefers-reduced-motion: reduce`), the animation is disabled and content is shown statically.
- The duplicated content group carries `aria-hidden`, so screen readers do not read it twice.
- No events; purely presentational.
