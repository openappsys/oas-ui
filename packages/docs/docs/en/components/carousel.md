# Carousel

Cycles through multiple screens of content in the same viewport, with manual switching and autoplay support.

## Basic Usage

<DemoBlock title="Basic carousel">
  <div style="width: 100%">
    <oas-carousel>
      <div style="background: var(--oas-color-primary); color: #fff; height: 200px">Slide 1</div>
      <div style="background: #1f2937; color: #fff; height: 200px">Slide 2</div>
      <div style="background: #374151; color: #fff; height: 200px">Slide 3</div>
    </oas-carousel>
  </div>
</DemoBlock>

Click the dots at the bottom to switch screens; autoplay is off by default.

## Initial Index

<DemoBlock title="Controlled index">
  <div style="width: 100%">
    <oas-carousel index="1">
      <div style="background: var(--oas-color-primary); color: #fff; height: 160px">Slide 1</div>
      <div style="background: #1f2937; color: #fff; height: 160px">Slide 2</div>
      <div style="background: #4b5563; color: #fff; height: 160px">Slide 3</div>
    </oas-carousel>
  </div>
</DemoBlock>

`index` specifies the current screen (starting from 0).

## Autoplay

<DemoBlock title="Autoplay">
  <div style="width: 100%">
    <oas-carousel autoplay interval="2000">
      <div style="background: var(--oas-color-primary); color: #fff; height: 160px">Auto 1</div>
      <div style="background: #1f2937; color: #fff; height: 160px">Auto 2</div>
      <div style="background: #374151; color: #fff; height: 160px">Auto 3</div>
    </oas-carousel>
  </div>
</DemoBlock>

Setting `autoplay` enables autoplay, and `interval` controls the interval (in milliseconds).

## Arrow Modes

The left/right arrows support three display modes, controlled by the `arrows` attribute: `always` (always shown) / `hover` (shown on hover, default) / `never` (hidden). Clicking an arrow switches to the previous / next screen, looping around at the ends.

<DemoBlock title="Always shown (always)">
  <div style="width: 100%">
    <oas-carousel arrows="always">
      <div style="background: var(--oas-color-primary); color: #fff; height: 160px">Slide 1</div>
      <div style="background: #1f2937; color: #fff; height: 160px">Slide 2</div>
      <div style="background: #374151; color: #fff; height: 160px">Slide 3</div>
    </oas-carousel>
  </div>
</DemoBlock>

<DemoBlock title="Shown on hover (hover)">
  <div style="width: 100%">
    <oas-carousel arrows="hover">
      <div style="background: var(--oas-color-primary); color: #fff; height: 160px">Slide 1</div>
      <div style="background: #1f2937; color: #fff; height: 160px">Slide 2</div>
      <div style="background: #374151; color: #fff; height: 160px">Slide 3</div>
    </oas-carousel>
  </div>
</DemoBlock>

<DemoBlock title="Hidden (never)">
  <div style="width: 100%">
    <oas-carousel arrows="never">
      <div style="background: var(--oas-color-primary); color: #fff; height: 160px">Slide 1</div>
      <div style="background: #1f2937; color: #fff; height: 160px">Slide 2</div>
      <div style="background: #374151; color: #fff; height: 160px">Slide 3</div>
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
      <div style="background: var(--oas-color-primary); color: #fff; height: 160px">Slide 1</div>
      <div style="background: #1f2937; color: #fff; height: 160px">Slide 2</div>
      <div style="background: #4b5563; color: #fff; height: 160px">Slide 3</div>
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

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `arrows` | Arrow display mode: `always` (always shown) / `hover` (shown on hover) / `never` (hidden) | — | `hover` |
| `autoplay` | Whether to autoplay | — | — |
| `index` | Current screen index (starting from 0) | — | `0` |
| `interval` | Autoplay interval (ms) | — | `3000` |

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
