# HoverCard

A hover/focus-triggered preview card whose popup stays open on hover (no flicker). Rich content slot, 12-way placement, separate open/close delays, arrow (incl. corner-merge), dual-axis offset, collision tuning, append-to container, delay groups and controlled display.

## Basic usage

Hover or focus the trigger to show the preview card.

<DemoBlock title="Trigger on hover">
  <oas-hover-card title="User info" content="Hover to view the user details." placement="bottom">
    <oas-button type="primary">Hover to view</oas-button>
  </oas-hover-card>
</DemoBlock>

## Rich content slot

The `slot="content"` slot accepts any HTML preview (links / buttons / images…). **The popup stays open on hover**: moving the pointer from the trigger into the card keeps it open, so links and buttons inside stay interactive (the hover area = trigger + popup panel).

<DemoBlock title="Rich preview (hoverable popup)">
  <oas-hover-card placement="bottom">
    <oas-button>Hover to view user</oas-button>
    <div slot="content" style="width: 260px">
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px">
        <oas-avatar size="small">O</oas-avatar>
        <div>
          <div style="font-weight: 600">Ouyang Xiaoyu</div>
          <div style="color: var(--oas-color-text-secondary)">Frontend Engineer · Hangzhou</div>
        </div>
      </div>
      <div style="margin-bottom: 12px; color: var(--oas-color-text-secondary)">Into open source and Web Components — code and writing.</div>
      <oas-space size="small">
        <oas-button size="small" type="primary">Message</oas-button>
        <oas-link href="https://example.com" target="_blank">Profile</oas-link>
      </oas-space>
    </div>
  </oas-hover-card>
</DemoBlock>

## Placement

12 directions: top / bottom / left / right × start / center / end.

<DemoBlock title="12 directions">
  <oas-space direction="vertical" size="small">
    <oas-space size="small">
      <oas-hover-card title="Title" content="Content" placement="top-start"><oas-button>top-start</oas-button></oas-hover-card>
      <oas-hover-card title="Title" content="Content" placement="top"><oas-button>top</oas-button></oas-hover-card>
      <oas-hover-card title="Title" content="Content" placement="top-end"><oas-button>top-end</oas-button></oas-hover-card>
    </oas-space>
    <oas-space size="small">
      <oas-hover-card title="Title" content="Content" placement="bottom-start"><oas-button>bottom-start</oas-button></oas-hover-card>
      <oas-hover-card title="Title" content="Content" placement="bottom"><oas-button>bottom</oas-button></oas-hover-card>
      <oas-hover-card title="Title" content="Content" placement="bottom-end"><oas-button>bottom-end</oas-button></oas-hover-card>
    </oas-space>
    <oas-space size="small">
      <oas-hover-card title="Title" content="Content" placement="left-start"><oas-button>left-start</oas-button></oas-hover-card>
      <oas-hover-card title="Title" content="Content" placement="left"><oas-button>left</oas-button></oas-hover-card>
      <oas-hover-card title="Title" content="Content" placement="left-end"><oas-button>left-end</oas-button></oas-hover-card>
    </oas-space>
    <oas-space size="small">
      <oas-hover-card title="Title" content="Content" placement="right-start"><oas-button>right-start</oas-button></oas-hover-card>
      <oas-hover-card title="Title" content="Content" placement="right"><oas-button>right</oas-button></oas-hover-card>
      <oas-hover-card title="Title" content="Content" placement="right-end"><oas-button>right-end</oas-button></oas-hover-card>
    </oas-space>
  </oas-space>
</DemoBlock>

## Show / hide delay

`open-delay` / `close-delay` are configured separately: appears about 800ms after hover, closes 300ms after leaving. `delay` is a legacy alias (applies to both when the individual ones are unset).

<DemoBlock title="Separate delays (open-delay / close-delay)">
  <oas-space size="small">
    <oas-hover-card title="Delayed card" content="Appears about 800ms after hover; closes 300ms after leaving." open-delay="800" close-delay="300" placement="bottom">
      <oas-button>Separate delays</oas-button>
    </oas-hover-card>
    <oas-hover-card title="Delayed card" content="delay alias: 400ms for both." delay="400" placement="bottom">
      <oas-button>delay alias</oas-button>
    </oas-hover-card>
  </oas-space>
</DemoBlock>

## Arrow

The arrow is shown by default; `arrow="false"` hides it; `arrow-point-at-center` keeps the arrow pointing at the trigger center.

<DemoBlock title="Arrow (default / hidden / pointing at center)">
  <oas-hover-card title="Title" content="With arrow" placement="top"><oas-button>Default arrow</oas-button></oas-hover-card>
  <oas-hover-card title="Title" content="No arrow" placement="top" arrow="false"><oas-button>Hidden arrow</oas-button></oas-hover-card>
  <oas-hover-card title="Title" content="Arrow points at the trigger center" placement="top" arrow-point-at-center><oas-button>Point at center</oas-button></oas-hover-card>
</DemoBlock>

## Corner-merged arrow

`arrow-merge`: for *-start / *-end placements the arrow fuses with the panel corner into a right-angle triangle.

<DemoBlock title="Corner-merged arrow (arrow-merge)">
  <oas-hover-card title="Title" content="Merged arrow" placement="bottom-start" arrow-merge><oas-button>bottom-start</oas-button></oas-hover-card>
  <oas-hover-card title="Title" content="Merged arrow" placement="bottom-end" arrow-merge><oas-button>bottom-end</oas-button></oas-hover-card>
</DemoBlock>

## Dual-axis offset

`offset` main-axis distance (gap between popup and trigger), `skidding` cross-axis shift.

<DemoBlock title="Dual-axis offset (offset / skidding)">
  <oas-hover-card title="Title" content="Main-axis distance 20px" placement="bottom" offset="20"><oas-button>offset=20</oas-button></oas-hover-card>
  <oas-hover-card title="Title" content="Cross-axis shift 24px" placement="bottom" skidding="24"><oas-button>skidding=24</oas-button></oas-hover-card>
</DemoBlock>

## Width

`width` as a number (px) or `trigger` / `target` (same width as the trigger).

<DemoBlock title="Width (width)">
  <oas-hover-card title="Title" content="Fixed width 320px" width="320" placement="bottom"><oas-button>width=320</oas-button></oas-hover-card>
  <oas-hover-card title="Title" content="Same width as the trigger" width="trigger" placement="bottom"><oas-button>width=trigger</oas-button></oas-hover-card>
</DemoBlock>

## Append-to container

`append-to`: the card is absolutely positioned inside the specified container (the container is promoted to a positioning context) — handy for custom panels / overlay regions.

<DemoBlock title="append-to container">
  <oas-space size="small">
    <oas-hover-card title="Title" content="The card renders inside the container below" placement="bottom" append-to="#hc-panel">
      <oas-button>Hover to view</oas-button>
    </oas-hover-card>
  </oas-space>
  <div id="hc-panel" style="position: static; min-height: 120px; margin-top: 16px; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-3)"></div>
</DemoBlock>

## Collision tuning

`collision-padding` viewport clamping padding; `fallback-placements` custom fallback sequence; `hide-when-detached` hides the card when the anchor is scrolled out of view; `auto-adjust-overflow="false"` disables auto adjustment.

<DemoBlock title="Collision tuning">
  <oas-space size="small">
    <oas-hover-card title="Title" content="Viewport clamping padding 24px" placement="right" collision-padding="24"><oas-button>Collision padding</oas-button></oas-hover-card>
    <oas-hover-card title="Title" content="Falls back to left / top when there's no space" placement="bottom" fallback-placements="left,top"><oas-button>Fallback</oas-button></oas-hover-card>
    <oas-hover-card title="Title" content="Hidden when the anchor is scrolled out of view" placement="bottom" hide-when-detached><oas-button>Hide detached</oas-button></oas-hover-card>
    <oas-hover-card title="Title" content="No auto adjustment; strict declared placement" placement="bottom" auto-adjust-overflow="false"><oas-button>No adjust</oas-button></oas-hover-card>
  </oas-space>
</DemoBlock>

## Disabled

`disabled`: hover/focus no longer opens the popup (the controlled `open` attribute still works).

<DemoBlock title="Disabled (disabled)">
  <oas-hover-card title="Title" content="Not shown when disabled" placement="bottom" disabled>
    <oas-button disabled>Hover does nothing</oas-button>
  </oas-hover-card>
</DemoBlock>

## Delay group

Triggers sharing the same `group` value share delays: moving the pointer between members skips the open-delay (opens immediately) and closes the previous one immediately.

<DemoBlock title="Delay group (group)">
  <oas-space size="small">
    <oas-hover-card title="User A" content="Switches instantly on consecutive hover" placement="bottom" group="hc-demo-group" open-delay="600">
      <oas-button>User A</oas-button>
    </oas-hover-card>
    <oas-hover-card title="User B" content="Switches instantly on consecutive hover" placement="bottom" group="hc-demo-group" open-delay="600">
      <oas-button>User B</oas-button>
    </oas-hover-card>
    <oas-hover-card title="User C" content="Switches instantly on consecutive hover" placement="bottom" group="hc-demo-group" open-delay="600">
      <oas-button>User C</oas-button>
    </oas-hover-card>
  </oas-space>
</DemoBlock>

## Controlled display & events

The `open` attribute controls visibility; visibility changes dispatch `oas-open-change` (`detail: { open }`). Hover/focus triggers still apply in addition.

<DemoBlock title="Controlled display (open + oas-open-change)">
  <oas-space size="small">
    <oas-button type="primary" size="small" onclick="hcCtrl(true)">Show</oas-button>
    <oas-button size="small" onclick="hcCtrl(false)">Hide</oas-button>
    <oas-tag id="hc-status" type="info">open: false</oas-tag>
  </oas-space>
  <oas-hover-card id="hc-ctrl" title="Controlled card" content="Visibility controlled by the open attribute." placement="bottom">
    <oas-button>Trigger element</oas-button>
  </oas-hover-card>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const hc = document.getElementById('hc-ctrl')
  const status = document.getElementById('hc-status')
  if (!hc || !status) return
  const sync = () => {
    status.textContent = `open: ${hc.hasAttribute('open')}`
  }
  window.hcCtrl = (open) => {
    if (open) hc.setAttribute('open', '')
    else hc.removeAttribute('open')
  }
  window.addEventListener('oas-open-change', (e) => {
    const el = e.target
    if (el instanceof HTMLElement && el.id === 'hc-ctrl') {
      status.textContent = `open: ${e.detail.open}`
    }
  })
  sync()
  // Both hover/focus triggers and external control change open; keep status synced with MutationObserver
  new MutationObserver(sync).observe(hc, { attributes: true, attributeFilter: ['open'] })
})
</script>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `append-to` | Positioning container selector (e.g. `#panel`): the card is absolutely positioned inside that container (container is promoted to a relative positioning context), coordinates translated accordingly; defaults to `position: fixed` viewport coordinates | — | — |
| `arrow` | Whether to show the arrow, default true; `arrow="false"` hides it (the arrow element and `::part(arrow)` remain) | `string` | `true` |
| `arrow-merge` | Corner-merged arrow mode: for *-start/*-end placements the arrow fuses with the panel corner into a right-angle triangle (the matching corner radius is zeroed); no effect for centered placements | `boolean` | — |
| `arrow-point-at-center` | Point the arrow at the trigger center (keeps pointing at the anchor after viewport clamping); by default the arrow stays at the panel center | `boolean` | — |
| `auto-adjust-overflow` | Auto-adjust at viewport edges (flip/clamp), default true; `"false"` disables it and positions strictly per the declared placement (the popup may overflow the viewport) | `string` | `true` |
| `close-delay` | Close delay in ms, separate from open-delay; falls back to the `delay` alias, then to 150 | — | — |
| `collision-padding` | Viewport clamping padding in px, default 4 | — | — |
| `content` | Content text | `string` | — |
| `delay` | Show/hide delay in ms, legacy alias: applies to both open and close when `open-delay`/`close-delay` are unset; individual values win when set | — | — |
| `disabled` | Disable the popup: hover/focus triggers no longer open it; the controlled `open` attribute still works | `boolean` | — |
| `fallback-placements` | Custom fallback sequence (comma-separated bases, e.g. `left,top`): tried in order when the requested placement lacks space; defaults to flipping to the opposite side | — | — |
| `group` | Delay group name: components sharing the same `group` value share delays — moving between members skips the open-delay (opens immediately) and closes the previous one immediately | — | — |
| `hide-when-detached` | Hide the card when the anchor is fully scrolled out of the viewport; keeps the open state and restores automatically when scrolled back | `boolean` | — |
| `offset` | Main-axis distance in px (gap between popup and trigger), default 8 | — | — |
| `open` | Controlled display (boolean attribute; shows when present) | `boolean` | — |
| `open-delay` | Open delay in ms, separate from close-delay; falls back to the `delay` alias, then to 300 | — | — |
| `placement` | Popup placement, 12 directions: top/bottom/left/right × start/center/end (e.g. `bottom-start`) | `string` | `top` |
| `skidding` | Cross-axis offset in px, shifts along the axis perpendicular to the main axis | — | — |
| `title` | Title text | `string` | — |
| `width` | Width customization: number (px) or `trigger`/`target` (same width as the trigger); falls back to CSS min-width | — | — |

### Events

| Event | Description |
| --- | --- |
| `oas-open-change` | Dispatched when the open state changes, `detail: { open }` |

### Slots

| Name | Description |
| --- | --- |
| default | Trigger (first non-`slot="content"` child), triggered on hover/focus |
| `content` | Rich content slot: free-form HTML preview inside the card (links/buttons etc., interactive) |
