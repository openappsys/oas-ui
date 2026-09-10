# Carousel

Cycles through multiple screens of content in the same viewport, with manual switching and autoplay support.

## Basic Usage

<DemoBlock title="Basic carousel">
  <div style="width: 100%">
    <oas-carousel>
      <div style="background: var(--oas-color-primary); color: var(--oas-color-text-on-primary); height: 200px">Slide 1</div>
      <div style="background: var(--oas-color-success); color: var(--oas-color-text-on-success); height: 200px">Slide 2</div>
      <div style="background: var(--oas-color-warning); color: var(--oas-color-text-on-warning); height: 200px">Slide 3</div>
    </oas-carousel>
  </div>
</DemoBlock>

Click the dots at the bottom to switch screens; autoplay is off by default.

## Initial Index

<DemoBlock title="Controlled index">
  <div style="width: 100%">
    <oas-carousel index="1">
      <div style="background: var(--oas-color-primary); color: var(--oas-color-text-on-primary); height: 160px">Slide 1</div>
      <div style="background: var(--oas-color-success); color: var(--oas-color-text-on-success); height: 160px">Slide 2</div>
      <div style="background: var(--oas-color-danger); color: var(--oas-color-text-on-danger); height: 160px">Slide 3</div>
    </oas-carousel>
  </div>
</DemoBlock>

`index` specifies the current screen (starting from 0).

## Autoplay

<DemoBlock title="Autoplay">
  <div style="width: 100%">
    <oas-carousel autoplay interval="2000">
      <div style="background: var(--oas-color-primary); color: var(--oas-color-text-on-primary); height: 160px">Auto 1</div>
      <div style="background: var(--oas-color-success); color: var(--oas-color-text-on-success); height: 160px">Auto 2</div>
      <div style="background: var(--oas-color-warning); color: var(--oas-color-text-on-warning); height: 160px">Auto 3</div>
    </oas-carousel>
  </div>
</DemoBlock>

Setting `autoplay` enables autoplay, and `interval` controls the interval (in milliseconds).

## Arrow Modes

The left/right arrows support three display modes, controlled by the `arrows` attribute: `always` (always shown) / `hover` (shown on hover, default) / `never` (hidden). Clicking an arrow switches to the previous / next screen, looping around at the ends.

<DemoBlock title="Always shown (always)">
  <div style="width: 100%">
    <oas-carousel arrows="always">
      <div style="background: var(--oas-color-primary); color: var(--oas-color-text-on-primary); height: 160px">Slide 1</div>
      <div style="background: var(--oas-color-success); color: var(--oas-color-text-on-success); height: 160px">Slide 2</div>
      <div style="background: var(--oas-color-warning); color: var(--oas-color-text-on-warning); height: 160px">Slide 3</div>
    </oas-carousel>
  </div>
</DemoBlock>

<DemoBlock title="Shown on hover (hover)">
  <div style="width: 100%">
    <oas-carousel arrows="hover">
      <div style="background: var(--oas-color-primary); color: var(--oas-color-text-on-primary); height: 160px">Slide 1</div>
      <div style="background: var(--oas-color-success); color: var(--oas-color-text-on-success); height: 160px">Slide 2</div>
      <div style="background: var(--oas-color-warning); color: var(--oas-color-text-on-warning); height: 160px">Slide 3</div>
    </oas-carousel>
  </div>
</DemoBlock>

<DemoBlock title="Hidden (never)">
  <div style="width: 100%">
    <oas-carousel arrows="never">
      <div style="background: var(--oas-color-primary); color: var(--oas-color-text-on-primary); height: 160px">Slide 1</div>
      <div style="background: var(--oas-color-success); color: var(--oas-color-text-on-success); height: 160px">Slide 2</div>
      <div style="background: var(--oas-color-warning); color: var(--oas-color-text-on-warning); height: 160px">Slide 3</div>
    </oas-carousel>
  </div>
</DemoBlock>

The default (when `arrows` is not specified) is the hover mode: arrows are hidden by default and smoothly fade in when the mouse hovers over or the keyboard focuses the carousel area. Not specifying `arrows` is equivalent to `arrows="hover"`.

## Image Carousel

Carousel items are not limited to color blocks — putting in an `<img>` or SVG makes an image banner.

<DemoBlock title="Image banner (SVG)">
  <div style="width: 100%">
    <oas-carousel arrows="always">
      <svg viewBox="0 0 800 260" preserveAspectRatio="none" style="width:100%; height:220px; display:block;"><defs><linearGradient id="cbg1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0b6cff"/><stop offset="1" stop-color="#16a34a"/></linearGradient></defs><rect width="800" height="260" fill="url(#cbg1)"/><text x="400" y="140" font-size="36" text-anchor="middle" fill="#fff" font-family="sans-serif">Summer Event</text></svg>
      <svg viewBox="0 0 800 260" preserveAspectRatio="none" style="width:100%; height:220px; display:block;"><defs><linearGradient id="cbg2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7c3aed"/><stop offset="1" stop-color="#0891b2"/></linearGradient></defs><rect width="800" height="260" fill="url(#cbg2)"/><text x="400" y="140" font-size="36" text-anchor="middle" fill="#fff" font-family="sans-serif">Autumn Arrivals</text></svg>
      <svg viewBox="0 0 800 260" preserveAspectRatio="none" style="width:100%; height:220px; display:block;"><defs><linearGradient id="cbg3" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d97706"/><stop offset="1" stop-color="#dc2626"/></linearGradient></defs><rect width="800" height="260" fill="url(#cbg3)"/><text x="400" y="140" font-size="36" text-anchor="middle" fill="#fff" font-family="sans-serif">Winter Sale</text></svg>
    </oas-carousel>
  </div>
</DemoBlock>

<DemoBlock title="Image carousel (img + autoplay)">
  <div style="width: 100%">
    <oas-carousel autoplay interval="2500">
      <img src="https://picsum.photos/seed/isui-cv-1/800/260" alt="Slide 1" style="width:100%; height:220px; object-fit: cover; display:block;">
      <img src="https://picsum.photos/seed/isui-cv-2/800/260" alt="Slide 2" style="width:100%; height:220px; object-fit: cover; display:block;">
      <img src="https://picsum.photos/seed/isui-cv-3/800/260" alt="Slide 3" style="width:100%; height:220px; object-fit: cover; display:block;">
    </oas-carousel>
  </div>
</DemoBlock>

## Events

<DemoBlock title="Change event">
  <div style="width: 100%">
    <oas-carousel id="carousel-event">
      <div style="background: var(--oas-color-primary); color: var(--oas-color-text-on-primary); height: 160px">Slide 1</div>
      <div style="background: var(--oas-color-success); color: var(--oas-color-text-on-success); height: 160px">Slide 2</div>
      <div style="background: var(--oas-color-danger); color: var(--oas-color-text-on-danger); height: 160px">Slide 3</div>
    </oas-carousel>
    <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: 0">
      Current slide: <span id="carousel-current">1</span>
    </p>
  </div>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  document.querySelector('#carousel-event')?.addEventListener('oas-change', (e) => {
    document.querySelector('#carousel-current').textContent = String(e.detail.index + 1)
  })
})
</script>

## Indicators

Indicators support hiding, outside placement, and a line shape via `indicators` / `indicator-position` / `indicator-type`. Dot colors use component-level CSS variables `--oas-carousel-dot-bg` / `--oas-carousel-dot-active-bg` (white by default, suited for dark slides; override on the host for light slides).

<DemoBlock title="Hidden indicators (indicators=false)">
  <div style="width: 100%">
    <oas-carousel indicators="false" arrows="always">
      <div style="background: var(--oas-color-primary); color: var(--oas-color-text-on-primary); height: 160px">Slide 1</div>
      <div style="background: var(--oas-color-success); color: var(--oas-color-text-on-success); height: 160px">Slide 2</div>
      <div style="background: var(--oas-color-warning); color: var(--oas-color-text-on-warning); height: 160px">Slide 3</div>
    </oas-carousel>
  </div>
</DemoBlock>

<DemoBlock title="Outside indicators (indicator-position=outside)">
  <div style="width: 100%">
    <oas-carousel indicator-position="outside" arrows="always">
      <div style="background: var(--oas-color-primary); color: var(--oas-color-text-on-primary); height: 160px">Slide 1</div>
      <div style="background: var(--oas-color-success); color: var(--oas-color-text-on-success); height: 160px">Slide 2</div>
      <div style="background: var(--oas-color-warning); color: var(--oas-color-text-on-warning); height: 160px">Slide 3</div>
    </oas-carousel>
  </div>
</DemoBlock>

<DemoBlock title="Line indicators (indicator-type=line)">
  <div style="width: 100%">
    <oas-carousel indicator-type="line" arrows="always">
      <div style="background: var(--oas-color-primary); color: var(--oas-color-text-on-primary); height: 160px">Slide 1</div>
      <div style="background: var(--oas-color-success); color: var(--oas-color-text-on-success); height: 160px">Slide 2</div>
      <div style="background: var(--oas-color-warning); color: var(--oas-color-text-on-warning); height: 160px">Slide 3</div>
    </oas-carousel>
  </div>
</DemoBlock>

## Fade

Set `effect="fade"` for a full-screen crossfade between slides (default `slide` translates the track). Under `prefers-reduced-motion` it degrades to an instant switch.

<DemoBlock title="Crossfade (effect=fade)">
  <div style="width: 100%">
    <oas-carousel effect="fade" arrows="always">
      <div style="background: linear-gradient(135deg, var(--oas-color-primary), var(--oas-color-success)); color: var(--oas-color-text-on-primary); height: 200px">Fade 1</div>
      <div style="background: linear-gradient(135deg, var(--oas-color-warning), var(--oas-color-danger)); color: var(--oas-color-text-on-warning); height: 200px">Fade 2</div>
      <div style="background: linear-gradient(135deg, var(--oas-color-danger), var(--oas-color-primary)); color: var(--oas-color-text-on-danger); height: 200px">Fade 3</div>
    </oas-carousel>
  </div>
</DemoBlock>

## Switching Methods

The component exposes imperative methods `next()` / `prev()` / `goTo(index)`, and the `oas-change` event (`detail` carries `index` and `prevIndex`) — together they enable custom interactions such as thumbnails driving the main carousel.

<DemoBlock title="Imperative switching (next / prev / goTo)">
  <div style="width: 100%">
    <oas-carousel id="carousel-methods" arrows="never">
      <div style="background: var(--oas-color-primary); color: var(--oas-color-text-on-primary); height: 160px">Slide 1</div>
      <div style="background: var(--oas-color-success); color: var(--oas-color-text-on-success); height: 160px">Slide 2</div>
      <div style="background: var(--oas-color-warning); color: var(--oas-color-text-on-warning); height: 160px">Slide 3</div>
    </oas-carousel>
    <oas-button size="small" style="margin-top: var(--oas-space-3)" onclick="document.getElementById('carousel-methods').prev()">Previous</oas-button>
    <oas-button size="small" type="primary" style="margin-top: var(--oas-space-3)" onclick="document.getElementById('carousel-methods').next()">Next</oas-button>
    <oas-button size="small" style="margin-top: var(--oas-space-3)" onclick="document.getElementById('carousel-methods').goTo(2)">Go to slide 3</oas-button>
  </div>
</DemoBlock>

## Loop Toggle

Looping is on by default; with `loop="false"` the carousel stops at the ends (the previous arrow is disabled on the first slide and the next arrow on the last), which suits step-by-step guides or banners with an end call-to-action.

<DemoBlock title="No loop (loop=false)">
  <div style="width: 100%">
    <oas-carousel loop="false" arrows="always">
      <div style="background: var(--oas-color-primary); color: var(--oas-color-text-on-primary); height: 160px">Step 1</div>
      <div style="background: var(--oas-color-success); color: var(--oas-color-text-on-success); height: 160px">Step 2</div>
      <div style="background: var(--oas-color-warning); color: var(--oas-color-text-on-warning); height: 160px">Step 3 (last)</div>
    </oas-carousel>
  </div>
</DemoBlock>

## Autoplay Pause

While autoplaying, hovering or keyboard-focusing the carousel pauses it, and it resumes when the pointer/focus leaves; the carousel also stops when the page becomes hidden and continues when visible again (WCAG 2.2.2 pause requirement). Use `pause-on-hover="false"` to disable hover pausing.

<DemoBlock title="Pause on hover (default)">
  <div style="width: 100%">
    <oas-carousel autoplay interval="2000" arrows="always">
      <div style="background: var(--oas-color-primary); color: var(--oas-color-text-on-primary); height: 160px">Hover me 1</div>
      <div style="background: var(--oas-color-success); color: var(--oas-color-text-on-success); height: 160px">Hover me 2</div>
      <div style="background: var(--oas-color-warning); color: var(--oas-color-text-on-warning); height: 160px">Hover me 3</div>
    </oas-carousel>
  </div>
</DemoBlock>

Hover (or Tab-focus) the carousel area above and autoplay pauses on the current slide; it continues from the next tick after you leave.

<DemoBlock title="Disable hover pause (pause-on-hover=false)">
  <div style="width: 100%">
    <oas-carousel autoplay interval="2000" pause-on-hover="false" arrows="always">
      <div style="background: var(--oas-color-primary); color: var(--oas-color-text-on-primary); height: 160px">Won't pause on hover 1</div>
      <div style="background: var(--oas-color-success); color: var(--oas-color-text-on-success); height: 160px">Won't pause on hover 2</div>
      <div style="background: var(--oas-color-warning); color: var(--oas-color-text-on-warning); height: 160px">Won't pause on hover 3</div>
    </oas-carousel>
  </div>
</DemoBlock>

## Vertical

Set `direction="vertical"` to switch along the vertical axis. The vertical viewport is 200px tall by default; override it with the CSS variable `--oas-carousel-height`. Indicators move to the right side and the arrows rotate 90°.

<DemoBlock title="Vertical (direction=vertical)">
  <div style="width: 100%">
    <oas-carousel direction="vertical" arrows="always" style="--oas-carousel-height: 160px">
      <div style="background: var(--oas-color-primary); color: var(--oas-color-text-on-primary); height: 100%">Slide 1</div>
      <div style="background: var(--oas-color-success); color: var(--oas-color-text-on-success); height: 100%">Slide 2</div>
      <div style="background: var(--oas-color-warning); color: var(--oas-color-text-on-warning); height: 100%">Slide 3</div>
    </oas-carousel>
  </div>
</DemoBlock>

## Multiple Slides per View

`slides-per-view` sets how many slides are shown per screen, and `gap` sets the spacing between them (px). Indicators and stepping follow "page" semantics (one group per step). When the last page holds fewer slides than a full group, it aligns to the track end without exposing a blank area.

<DemoBlock title="Two slides per view (slides-per-view=2 + gap)">
  <div style="width: 100%">
    <oas-carousel slides-per-view="2" gap="16" arrows="always">
      <div style="background: var(--oas-color-primary); color: var(--oas-color-text-on-primary); height: 160px">Pic 1</div>
      <div style="background: var(--oas-color-success); color: var(--oas-color-text-on-success); height: 160px">Pic 2</div>
      <div style="background: var(--oas-color-warning); color: var(--oas-color-text-on-warning); height: 160px">Pic 3</div>
      <div style="background: var(--oas-color-danger); color: var(--oas-color-text-on-danger); height: 160px">Pic 4</div>
    </oas-carousel>
  </div>
</DemoBlock>

## Drag to Switch

Press and drag horizontally (vertically in vertical mode) past the threshold to switch; release before the threshold and the track springs back. Touch and mouse are unified via Pointer Events; horizontal dragging leaves vertical page scrolling intact (`touch-action: pan-y`) so it never fights the page scroll gesture. The autoplay timer resets after a drag ends.

<DemoBlock title="Drag to switch (press and drag)">
  <div style="width: 100%">
    <oas-carousel id="carousel-drag" arrows="never">
      <div style="background: var(--oas-color-primary); color: var(--oas-color-text-on-primary); height: 160px">Drag me left 1</div>
      <div style="background: var(--oas-color-success); color: var(--oas-color-text-on-success); height: 160px">Drag me left 2</div>
      <div style="background: var(--oas-color-warning); color: var(--oas-color-text-on-warning); height: 160px">Drag me left 3</div>
    </oas-carousel>
  </div>
</DemoBlock>

## Card Mode

Set `type="card"` for a card-style carousel: the current card is centered as the main body (60% of the width by default) while the neighboring cards peek out on both sides, scaled down and dimmed. Click any neighbor card to switch to it directly, or use the arrow keys while focus is inside a slide. In non-loop mode (`loop="false"`) the first/last cards sit flush against the edges — the first card sticks to the left showing the right neighbor, and the last card sticks to the right showing the left neighbor, so no edge is left hanging. Card width, card gap, and neighbor scale are controlled by the CSS variables `--oas-carousel-card-width` / `--oas-carousel-card-gap` / `--oas-carousel-card-scale`. Card mode is horizontal-only and mutually exclusive with `slides-per-view` / `effect` / `direction` (card mode wins when both are set); arrows / indicators / autoplay / drag / loop all compose with it.

<DemoBlock title="Card mode (type=card, click a side card to switch)">
  <div style="width: 100%">
    <oas-carousel type="card" autoplay interval="3000">
      <div style="background: var(--oas-color-primary); color: var(--oas-color-text-on-primary); height: 200px; border-radius: var(--oas-radius-lg)">Card 1</div>
      <div style="background: var(--oas-color-success); color: var(--oas-color-text-on-success); height: 200px; border-radius: var(--oas-radius-lg)">Card 2</div>
      <div style="background: var(--oas-color-warning); color: var(--oas-color-text-on-warning); height: 200px; border-radius: var(--oas-radius-lg)">Card 3</div>
      <div style="background: var(--oas-color-danger); color: var(--oas-color-text-on-danger); height: 200px; border-radius: var(--oas-radius-lg)">Card 4</div>
      <div style="background: linear-gradient(135deg, var(--oas-color-primary), var(--oas-color-success)); color: var(--oas-color-text-on-primary); height: 200px; border-radius: var(--oas-radius-lg)">Card 5</div>
    </oas-carousel>
  </div>
</DemoBlock>

## Explicit Pause Button

Besides the automatic hover/focus pause, `pause-button` renders an explicit pause/play button (pinned to the top-right corner). The explicit pause takes priority: once paused, moving the mouse away will not resume autoplay; clicking play while `autoplay` is off enables autoplay. The button's `aria-pressed` and label follow the paused state.

<DemoBlock title="Explicit pause button (pause-button)">
  <div style="width: 100%">
    <oas-carousel autoplay interval="2000" pause-button>
      <div style="background: var(--oas-color-primary); color: var(--oas-color-text-on-primary); height: 160px">Click the corner button to pause 1</div>
      <div style="background: var(--oas-color-success); color: var(--oas-color-text-on-success); height: 160px">Click the corner button to pause 2</div>
      <div style="background: var(--oas-color-warning); color: var(--oas-color-text-on-warning); height: 160px">Click the corner button to pause 3</div>
    </oas-carousel>
  </div>
</DemoBlock>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `arrows` | Arrow display mode: `always` (always shown) / `hover` (shown on hover) / `never` (hidden) | `string` | `hover` |
| `autoplay` | Whether to autoplay | `boolean` | — |
| `direction` | Direction: `horizontal` (default) / `vertical` (fixed-height viewport via `--oas-carousel-height`) | `string` | `horizontal` |
| `effect` | Transition effect: `slide` (default) / `fade` (stacked cross-fade, degrades to instant under reduced-motion) | `string` | `slide` |
| `gap` | Gap between slides in px (with `slides-per-view`) | `string` | `0` |
| `index` | Current screen index (starting from 0) | `string` | `0` |
| `indicator-position` | Indicator position: `inside` (default, overlaid) / `outside` (in-flow, grows the container) | `string` | `inside` |
| `indicator-type` | Indicator type: `dot` (default) / `line` (widens when active) | `string` | `dot` |
| `indicators` | Indicator switch (default true; `"false"` hides them) | `string` | `true` |
| `interval` | Autoplay interval (ms) | `string` | `3000` |
| `loop` | Loop around (default on; `"false"` stops at the edges and disables the corresponding arrow) | `string` | — |
| `pause-button` | Show an explicit pause/play button (default off; click toggles autoplay pause/resume and takes priority over hover pausing; clicking play while autoplay is off enables it) | `boolean` | — |
| `pause-on-hover` | Pause autoplay on hover/focus (default true; `"false"` disables; always pauses when the page is hidden) | `string` | `true` |
| `slides-per-view` | Slides per page (default 1; index is page-based, last page aligns to the track end) | `string` | `1` |
| `type` | Carousel layout type: `"card"` enables card mode — the current card is centered as the main body with neighboring cards peeking on both sides (scaled down, dimmed); clicking a neighbor card switches to it directly; mutually exclusive with `slides-per-view`/`effect`/`direction` (card mode wins); card width/gap/neighbor scale via `--oas-carousel-card-width` / `--oas-carousel-card-gap` / `--oas-carousel-card-scale` | `string` | — |

### Events

| Event | Description |
| --- | --- |
| `oas-change` | Current screen changed, `detail: { index }` |

### Slots

| Name | Description |
| --- | --- |
| default | — |

### Parts (::part())

| Part                           | Description                                                    |
| ------------------------------ | -------------------------------------------------------------- |
| `viewport` / `track`           | Viewport and sliding track                                     |
| `dots` / `dot`                 | Bottom indicator container and a single dot                    |
| `arrow-prev` / `arrow-next`    | Left/right arrow buttons, absolutely positioned at the vertical center of the two sides of the carousel; can be styled independently |
