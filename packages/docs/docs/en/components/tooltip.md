# Tooltip

A simple text prompt bubble triggered on hover or keyboard focus.

## Basic usage

<DemoBlock title="Trigger on hover">
  <oas-tooltip content="This is a tooltip text">
    <oas-button type="primary">Hover to view</oas-button>
  </oas-tooltip>
</DemoBlock>

## Placement

<DemoBlock title="Four directions">
  <oas-tooltip content="Hint on top" placement="top">
    <oas-button>Up</oas-button>
  </oas-tooltip>
  <oas-tooltip content="Hint at the bottom" placement="bottom">
    <oas-button>Down</oas-button>
  </oas-tooltip>
  <oas-tooltip content="Hint on the left" placement="left">
    <oas-button>Left</oas-button>
  </oas-tooltip>
  <oas-tooltip content="Hint on the right" placement="right">
    <oas-button>Right</oas-button>
  </oas-tooltip>
</DemoBlock>

When space is insufficient, the tooltip automatically flips along the main axis and avoids the viewport edges.

## Arrow

By default an arrow pointing at the trigger element's edge is shown; `arrow="false"` hides the arrow; `arrow-point-at-center` makes the arrow point at the trigger element's center (when the panel is shifted by viewport-edge avoidance, the arrow still points at the anchor center).

<DemoBlock title="Arrow visibility and pointing">
  <oas-space size="large" wrap>
    <oas-tooltip id="tt-arrow-default" content="Arrow is shown by default">
      <oas-button>Default</oas-button>
    </oas-tooltip>
    <oas-tooltip id="tt-arrow-off" content="arrow=false: arrow hidden" arrow="false">
      <oas-button>No arrow</oas-button>
    </oas-tooltip>
    <oas-tooltip id="tt-arrow-center" content="arrow-point-at-center: arrow points at the trigger center" arrow-point-at-center>
      <oas-button>Point at center</oas-button>
    </oas-tooltip>
  </oas-space>
</DemoBlock>

`arrow-position="merge"` merges the arrow with the panel corner into a right triangle (only for `*-start` / `*-end` placements).

<DemoBlock title="Arrow merge mode">
  <oas-tooltip content="Arrow merged into the corner" placement="bottom-start" arrow-position="merge">
    <oas-button>bottom-start + merge</oas-button>
  </oas-tooltip>
</DemoBlock>

## Viewport auto adjust

By default the tooltip automatically flips along the main axis and avoids the viewport edges when space is insufficient; `auto-adjust-overflow="false"` disables the auto adjust so the panel keeps the declared placement (it may overflow the viewport).

<DemoBlock title="Auto adjust disabled">
  <oas-tooltip content="auto-adjust-overflow=false: keeps placement=bottom" placement="bottom" auto-adjust-overflow="false">
    <oas-button>Auto adjust off</oas-button>
  </oas-tooltip>
</DemoBlock>

## Focus trigger

<DemoBlock title="Trigger on keyboard focus">
  <oas-tooltip content="You can also see me by focusing with Tab">
    <oas-button>Focus me with Tab</oas-button>
  </oas-tooltip>
</DemoBlock>

## Controlled display

The `open` attribute is controlled: an external button can set/remove `open` to show/hide the tooltip (hover/focus triggers still apply in addition).

<DemoBlock title="Controlled display (open attribute)">
  <oas-space size="small">
    <oas-button type="primary" size="small" onclick="tipCtrl(true)">Show</oas-button>
    <oas-button size="small" onclick="tipCtrl(false)">Hide</oas-button>
    <oas-tag id="tip-status" type="info">open: false</oas-tag>
  </oas-space>
  <oas-tooltip id="tip-ctrl" content="Visibility controlled by the open attribute" placement="bottom">
    <oas-button>Trigger element</oas-button>
  </oas-tooltip>
</DemoBlock>

## Long text

<DemoBlock title="Long text and max width">
  <oas-tooltip content="This is a longer tooltip text demonstrating the max-width limit and automatic wrapping (at most 240px)." placement="bottom">
    <oas-button>Hover to view long hint</oas-button>
  </oas-tooltip>
</DemoBlock>

## Virtual trigger

Virtual mode (`virtual`) does not bind to a host trigger element: `open` is fully controlled externally, and the position is set by `virtual-anchor` (an anchor element selector) or `virtual-x` / `virtual-y` (viewport coordinates). `placement` still applies. It suits scenarios where a normal trigger element is impossible, such as chart points or floating hints during drag.

<DemoBlock title="Virtual anchor follow (chart points)">
  <div class="vp-chart" id="vp-chart">
    <span class="vp-dot" id="vp-dot-0" style="left: 15%; bottom: 45%" data-label="Q1 revenue 12.4w"></span>
    <span class="vp-dot" id="vp-dot-1" style="left: 40%; bottom: 75%" data-label="Q2 revenue 15.1w"></span>
    <span class="vp-dot" id="vp-dot-2" style="left: 65%; bottom: 35%" data-label="Q3 revenue 18.9w"></span>
    <span class="vp-dot" id="vp-dot-3" style="left: 90%; bottom: 60%" data-label="Q4 revenue 21.6w"></span>
    <span class="vp-axis">Month →</span>
  </div>
  <oas-tooltip id="tt-anchor" virtual virtual-anchor="#vp-dot-0" content="Q1 revenue 12.4w" placement="top"></oas-tooltip>
  <p class="vp-hint">Hover any point to see the hint (the tooltip is anchored to that point).</p>
</DemoBlock>

<DemoBlock title="Coordinate follow (mouse move)">
  <div class="vp-canvas" id="vp-canvas">
    Move the mouse inside this area
    <oas-tag id="tt-follow-status" type="info" size="small">Not following</oas-tag>
  </div>
  <oas-tooltip id="tt-follow" virtual virtual-x="0" virtual-y="0" content="Coords: 0, 0" placement="bottom"></oas-tooltip>
</DemoBlock>

<style>
.vp-chart {
  position: relative;
  width: 100%;
  height: 160px;
  background: var(--oas-color-bg-hover);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
}
.vp-dot {
  position: absolute;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--oas-color-primary);
  cursor: pointer;
  transform: translate(-50%, -50%);
}
.vp-dot:hover {
  background: var(--oas-color-primary-hover);
}
.vp-axis {
  position: absolute;
  left: var(--oas-space-4);
  bottom: var(--oas-space-2);
  font-size: var(--oas-font-size-xs);
  /* text-secondary on bg-hover is 4.39:1 < 4.5:1 → use text-primary */
  color: var(--oas-color-text-primary);
}
.vp-canvas {
  width: 100%;
  height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--oas-space-3);
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-primary);
  background: var(--oas-color-bg-hover);
  border: 1px dashed var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  cursor: crosshair;
}
.vp-hint {
  margin: var(--oas-space-2) 0 0;
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
.vp-clip {
  overflow: hidden;
  border: 1px dashed var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  padding: var(--oas-space-4);
  display: inline-block;
}
</style>

## Triggers

The `trigger` attribute supports space-separated multi-selection: `hover` / `focus` / `click` / `contextmenu` / `touch` (long press) / `manual` (fully controlled). Defaults to `hover focus touch` — long press works out of the box on touch screens (mouse pointers are filtered automatically; the hold duration is tuned by `touch-delay`).

<DemoBlock title="Click trigger">
  <oas-tooltip trigger="click" content="Click me to see the tooltip">
    <oas-button>Click trigger</oas-button>
  </oas-tooltip>
</DemoBlock>

<DemoBlock title="Context menu trigger">
  <oas-tooltip trigger="contextmenu" content="Right-click to show the tooltip">
    <oas-button>Right-click me</oas-button>
  </oas-tooltip>
</DemoBlock>

<DemoBlock title="Manual trigger">
  <oas-space size="small">
    <oas-button size="small" onclick="manualTip(true)">Show</oas-button>
    <oas-button size="small" onclick="manualTip(false)">Hide</oas-button>
  </oas-space>
  <oas-tooltip id="tip-manual" trigger="manual" content="Only controlled by the open attribute">
    <oas-button>Controlled trigger</oas-button>
  </oas-tooltip>
</DemoBlock>

## Show / hide delay

`open-delay` / `close-delay` control the delay (ms) before showing/hiding on hover, avoiding accidental triggers when moving across quickly. Keyboard focus opens immediately without waiting for `open-delay` (keyboard users have already positioned themselves; a wait adds no information).

<DemoBlock title="Open and close delays">
  <oas-tooltip trigger="hover" open-delay="300" close-delay="200" content="Shows 300ms after hover, hides 200ms after leave">
    <oas-button>300ms delayed show</oas-button>
  </oas-tooltip>
</DemoBlock>

When moving quickly across multiple triggers, `skip-delay-duration` (default 300ms) makes the next tooltip skip its open-delay and appear immediately, keeping the interaction responsive.

<DemoBlock title="Delay group (skip-delay-duration)">
  <oas-space size="large" wrap>
    <oas-tooltip trigger="hover" open-delay="300" skip-delay-duration="500" content="First: 300ms delayed">
      <oas-button>Hover me (moving from the previous one shows instantly)</oas-button>
    </oas-tooltip>
    <oas-tooltip trigger="hover" open-delay="300" skip-delay-duration="500" content="Second: skips the delay when moving from the first">
      <oas-button>Then hover me</oas-button>
    </oas-tooltip>
  </oas-space>
</DemoBlock>

On touch devices a long press shows the hint (`touch` is included by default; `touch-delay` controls the hold duration, default 500ms; desktop mouse long presses are filtered).

<DemoBlock title="Touch long-press trigger">
  <oas-tooltip trigger="touch" touch-delay="600" content="Shows after a 600ms long press (touch)">
    <oas-button>Long-press me (touch)</oas-button>
  </oas-tooltip>
</DemoBlock>

## Rich content

The `content` attribute shows plain text; for rich content (links, icons, multiple lines) use the `slot="content"` slot. The slot takes precedence over the attribute text.

If the rich content holds interactive elements (links, etc.), combine `interactive` (hoverable popup — entering it keeps it open) with `close-delay` (time for the pointer to travel from the anchor into the popup) — this is also the recommended shape for WCAG 1.4.13 "hoverable".

<DemoBlock title="Rich content slot">
  <oas-tooltip placement="top">
    <oas-button>Hover for rich content</oas-button>
    <span slot="content">
      <oas-space size="small" direction="vertical">
        <span><strong>Key hint</strong></span>
        <span>Can include a <a href="#" onclick="return false">link</a> or icons</span>
        <oas-icon name="info" size="16" color="var(--oas-color-primary)"></oas-icon>
      </oas-space>
    </span>
  </oas-tooltip>
</DemoBlock>

<DemoBlock title="interactive + close-delay combo">
  <oas-tooltip interactive close-delay="120" open-delay="200" placement="bottom">
    <oas-button>Hover then move into the popup to click</oas-button>
    <span slot="content">
      <oas-space size="small" direction="vertical">
        <span>Moving the pointer into this popup keeps it open</span>
        <a href="#" onclick="return false">A clickable link</a>
      </oas-space>
    </span>
  </oas-tooltip>
</DemoBlock>

## Keyboard accessibility

While open, pressing <kbd>Esc</kbd> closes the tooltip and restores focus to the trigger; while open, the trigger is linked to the popup via `aria-describedby` (readable by screen readers).

<DemoBlock title="Esc close + aria-describedby">
  <oas-tooltip id="tip-esc" content="Press Esc to close me" placement="bottom">
    <oas-button>Focus and press Esc</oas-button>
  </oas-tooltip>
</DemoBlock>

`trigger-keys` lets you specify keys (space-separated) that open the tooltip when focused, e.g. `trigger-keys="F1"`.

<DemoBlock title="trigger-keys open">
  <oas-tooltip trigger="hover" trigger-keys="F1" content="Focus and press F1 to open">
    <oas-button>Focus and press F1</oas-button>
  </oas-tooltip>
</DemoBlock>

## Max width

The default max width is `240px` (opened via the `--oas-tooltip-max-width` token); the `max-width` attribute overrides it (number or CSS length).

<DemoBlock title="Custom max width">
  <oas-tooltip content="This content is very long, very long, very long, very long, very long, very long, very long, very long, very long, very long, very long" max-width="360" placement="bottom">
    <oas-button>max-width=360</oas-button>
  </oas-tooltip>
</DemoBlock>

## Disabled

With `disabled`, the tooltip never shows (neither hover nor a controlled `open`).

<DemoBlock title="Disabled">
  <oas-tooltip disabled content="Never shown">
    <oas-button>Disabled tooltip</oas-button>
  </oas-tooltip>
</DemoBlock>

## Hoverable popup

`interactive` keeps the popup open while hovering it (links inside stay reachable).

<DemoBlock title="Interactive popup">
  <oas-tooltip interactive placement="bottom" content="Hovering the popup keeps it open; links inside are clickable">
    <oas-button>Interactive</oas-button>
  </oas-tooltip>
</DemoBlock>

## Offset and collision

`offset` controls the main-axis distance (default 8px), `skidding` the cross-axis offset, and `collision-padding` the viewport-edge avoidance margin (default 4px).

<DemoBlock title="offset / skidding">
  <oas-tooltip content="offset=16 keeps it farther" offset="16" placement="bottom">
    <oas-button>offset=16</oas-button>
  </oas-tooltip>
  <oas-tooltip content="skidding=24 shifts right" skidding="24" placement="bottom">
    <oas-button>skidding=24</oas-button>
  </oas-tooltip>
</DemoBlock>

<DemoBlock title="collision-padding">
  <oas-tooltip content="Keeps 20px from the left edge" collision-padding="20" placement="bottom">
    <oas-button>collision-padding=20</oas-button>
  </oas-tooltip>
</DemoBlock>

## Color variants

The `color` attribute supports semantic colors (`primary` / `success` / `warning` / `danger`), the 11 preset names (e.g. `magenta`, `blue`), or any CSS color. All of them go through tokens (with dark variants).

<DemoBlock title="Color variants">
  <oas-space size="large" wrap>
    <oas-tooltip content="Primary tooltip" color="primary">
      <oas-button>primary</oas-button>
    </oas-tooltip>
    <oas-tooltip content="Success tooltip" color="success">
      <oas-button>success</oas-button>
    </oas-tooltip>
    <oas-tooltip content="Warning tooltip" color="warning">
      <oas-button>warning</oas-button>
    </oas-tooltip>
    <oas-tooltip content="Danger tooltip" color="danger">
      <oas-button>danger</oas-button>
    </oas-tooltip>
  </oas-space>
</DemoBlock>

## Mount point

`append-to` mounts the popup into the given container (`body` or a CSS selector), escaping clipping contexts such as an `overflow: hidden` ancestor.

<DemoBlock title="append-to body">
  <div class="vp-clip">
    <oas-tooltip content="Fully visible even though the parent clips overflow" append-to="body" placement="bottom">
      <oas-button>Mount to body</oas-button>
    </oas-tooltip>
  </div>
</DemoBlock>

## Auto close

`auto-close` (ms) closes the tooltip automatically after it opens — useful for onboarding hints.

<DemoBlock title="Auto close">
  <oas-tooltip trigger="click" auto-close="1500" content="Closes automatically after 1.5s">
    <oas-button>Click, then it auto-closes</oas-button>
  </oas-tooltip>
</DemoBlock>

## Fresh content

`fresh` is enabled by default: content changes are synced immediately even while closed (reopening always shows the latest). `fresh="false"` freezes the content while closed.

<DemoBlock title="Fresh content sync">
  <oas-tooltip id="tip-fresh" content="Initial content" trigger="hover">
    <oas-button>Hover to view (buttons below change the content)</oas-button>
  </oas-tooltip>
  <oas-button size="small" onclick="freshChange()">Change content</oas-button>
</DemoBlock>

## Scroll follow and close on scroll

While open, a normal anchor is also repositioned in real time on scroll / window resize (`scroll` capture + rAF throttling), so the popup no longer detaches from the anchor; `close-on-scroll` closes on scroll instead (for compact hints that should not chase the page).

<DemoBlock title="Scroll follow">
  <div class="tt-scrollbox">
    <p class="tt-boxhint">Scroll the box: while open, the tooltip follows the button</p>
    <div class="tt-spacer"></div>
    <oas-tooltip content="I follow the scrollbar" placement="top">
      <oas-button type="primary">Keep following on scroll</oas-button>
    </oas-tooltip>
    <div class="tt-spacer"></div>
  </div>
</DemoBlock>

<DemoBlock title="close-on-scroll">
  <div class="tt-scrollbox">
    <p class="tt-boxhint">Open the hint by hovering, then scroll the container — it closes immediately</p>
    <div class="tt-spacer"></div>
    <oas-tooltip close-on-scroll content="Scroll once and I disappear" placement="top">
      <oas-button>Close on scroll</oas-button>
    </oas-tooltip>
    <div class="tt-spacer"></div>
  </div>
</DemoBlock>

## Click trigger with outside dismiss

When `trigger` includes `click` / `contextmenu`, pressing anywhere outside the popup and the trigger closes it (light dismiss) — no need to click the trigger again. Pure `hover`/`focus`/`touch` triggers or a controlled `open` do not install outside dismiss.

<DemoBlock title="click + outside dismiss">
  <oas-space size="small">
    <oas-tooltip id="tt-outside" trigger="click" content="Click to open; click anywhere else to close me" placement="bottom">
      <oas-button>Click trigger</oas-button>
    </oas-tooltip>
    <oas-tag id="tt-outside-status" type="info" size="small">closed</oas-tag>
  </oas-space>
  <p class="vp-hint">Click to open, then click anywhere outside the popup / button (watch the status tag).</p>
</DemoBlock>

## Accessible name semantics (label)

`a11y` switches the tooltip's semantic role: the default `description` puts `aria-describedby` on the trigger pointing to the popup (supplementary description); `label` uses `aria-labelledby` instead — for icon-only triggers without their own text, the hint text acts as the accessible name. On close the trigger's original aria value is restored, never clobbering host-set attributes.

<DemoBlock title="label accessible name">
  <oas-tooltip id="tt-label" a11y="label" content="Add to favorites" placement="bottom">
    <oas-button aria-label="Favorite button">☆ Favorite</oas-button>
  </oas-tooltip>
  <oas-button size="small" onclick="labelOpen()">Toggle open</oas-button>
  <oas-tag id="tt-label-status" type="info" size="small">aria: -</oas-tag>
  <p class="vp-hint">While open the button gets aria-labelledby pointing to the popup (accessible name = hint text); it is restored on close.</p>
</DemoBlock>

## Arrow side mode and arrow-offset

`arrow-position="side"` snaps the arrow to the half of the panel that contains the anchor-center projection (when the panel is shifted by viewport avoidance, the arrow hugs the matching side instead of staying centered). `arrow-offset` (px, only effective in `side`) controls the arrow's inset from the panel end, default 4px (a safe amount that keeps it out of the rounded corners).

<DemoBlock title="Arrow side and offset">
  <oas-space size="large" wrap>
    <oas-tooltip content="side: arrow snaps to the anchor side" placement="bottom" arrow-position="side">
      <oas-button>side arrow</oas-button>
    </oas-tooltip>
    <oas-tooltip content="side + arrow-offset=16 (inset 16px)" placement="bottom" arrow-position="side" arrow-offset="16">
      <oas-button>arrow-offset=16</oas-button>
    </oas-tooltip>
  </oas-space>
  <p class="vp-hint">Scroll the trigger to a viewport edge before opening to see the side arrow hug the anchor side.</p>
</DemoBlock>

## Animation customization (CSS variable hooks)

The entry animation duration / easing / name are CSS variables (set them on the `<oas-tooltip>` element — custom properties cascade into the shadow): `--oas-tooltip-duration` (default 0.15s), `--oas-tooltip-easing` (default ease), `--oas-tooltip-animation` (default `oas-tooltip-in`; `none` disables the entry animation). Under `prefers-reduced-motion: reduce` the animation is always off.

<DemoBlock title="Duration / easing / animation toggle">
  <oas-space size="large" wrap>
    <oas-tooltip
      style="--oas-tooltip-duration: 0.32s; --oas-tooltip-easing: cubic-bezier(0.34, 1.56, 0.64, 1)"
      content="320ms springy entry"
    >
      <oas-button>Custom duration &amp; easing</oas-button>
    </oas-tooltip>
    <oas-tooltip style="--oas-tooltip-animation: none" content="Animation off (--oas-tooltip-animation: none)">
      <oas-button>Disable entry animation</oas-button>
    </oas-tooltip>
  </oas-space>
</DemoBlock>

## Smart placement and collision boundary

- `placement="auto"` (also `auto-start` / `auto-end`): picks the roomiest side on open;
- `fallback-placements`: a fallback sequence (space/comma-separated 12-direction placements) — when the primary side does not fit, the first fitting candidate wins;
- `collision-boundary`: swap the flip/avoid boundary from the viewport to a given element rect (e.g. a scroll container's visible area; pair with `append-to` to avoid clipping);
- `fallback-axis-side`: cross-axis fallback when both main-axis sides are tight (`start` / `end`, default `none`).

<DemoBlock title="auto placement and fallback sequence">
  <oas-space size="large" wrap>
    <oas-tooltip content="placement=auto: pick the roomiest direction" placement="auto">
      <oas-button>auto placement</oas-button>
    </oas-tooltip>
    <oas-tooltip content="fallback-placements=left,top: try left, then top, when bottom is tight" placement="bottom" fallback-placements="left,top">
      <oas-button>Fallback sequence</oas-button>
    </oas-tooltip>
  </oas-space>
</DemoBlock>

<DemoBlock title="collision-boundary = scroll container">
  <div class="tt-scrollbox" id="tt-boundary-box">
    <p class="tt-boxhint">collision-boundary points at this container: the hint flips/avoids within its visible area</p>
    <div class="tt-spacer"></div>
    <oas-tooltip
      id="tt-boundary-tip"
      content="I am placed within the container bounds"
      placement="bottom"
      append-to="body"
      collision-boundary="#tt-boundary-box"
    >
      <oas-button>Bound to container</oas-button>
    </oas-tooltip>
    <div class="tt-spacer"></div>
  </div>
</DemoBlock>

<DemoBlock title="Cross-axis fallback (fallback-axis-side)">
  <oas-tooltip content="Falls back to the left when both top and bottom are tight (start)" placement="bottom" fallback-axis-side="start">
    <oas-button>fallback-axis-side=start</oas-button>
  </oas-tooltip>
</DemoBlock>

## Follow cursor

`follow-cursor`: while open, moving the cursor inside the trigger area repositions the popup to follow the cursor in real time (reuses the viewport-coordinate channel, rAF throttled). Good for large hover surfaces.

<DemoBlock title="follow-cursor">
  <oas-tooltip id="tt-fc" follow-cursor content="Following the cursor" placement="top">
    <div class="tt-area">Move the mouse inside this area — the hint follows</div>
  </oas-tooltip>
</DemoBlock>

## Width following the trigger

`width="trigger"` makes the popup as wide as the trigger (a number or CSS length sets the width directly); the width is still capped by `--oas-tooltip-max-width` (default 240px), which is adjustable.

<DemoBlock title="width customization">
  <oas-space size="large" wrap>
    <oas-tooltip content="As wide as the button" width="trigger" placement="top">
      <oas-button>width=trigger hint</oas-button>
    </oas-tooltip>
    <oas-tooltip content="Fixed 320px width" width="320" placement="bottom">
      <oas-button>width=320</oas-button>
    </oas-tooltip>
  </oas-space>
</DemoBlock>

## Event source (oas-open-change)

`oas-open-change`'s `detail` now carries `{ open, source, reason }`: `source` is the trigger channel (`hover` / `focus` / `click` / `contextmenu` / `touch` / `key` / `escape` / `outside` / `scroll` / `auto-close` / `attribute`), `reason` refines the cause (e.g. `escape-key` / `outside-pointer` / `timeout` / `long-press`). External controlled `setAttribute` paths report `attribute`.

<DemoBlock title="Event source feedback">
  <oas-tooltip id="tt-evt" trigger="click" content="Hover / click / Esc to try the sources" placement="bottom">
    <oas-button>Event source</oas-button>
  </oas-tooltip>
  <p class="vp-hint" id="tt-evt-status">Not triggered yet</p>
</DemoBlock>

<style>
.tt-scrollbox {
  max-height: 190px;
  overflow: auto;
  border: 1px dashed var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  padding: var(--oas-space-3);
  background: var(--oas-color-bg);
}
.tt-boxhint {
  margin: 0 0 var(--oas-space-2);
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
.tt-spacer {
  height: 260px;
}
.tt-area {
  padding: var(--oas-space-8) var(--oas-space-4);
  border: 1px dashed var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg-hover);
  text-align: center;
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
  cursor: crosshair;
}
</style>

## Edge cases

<DemoBlock title="Empty content">
  <oas-tooltip placement="bottom">
    <oas-button>Tooltip without content</oas-button>
  </oas-tooltip>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const tip = document.getElementById('tip-ctrl')
  const status = document.getElementById('tip-status')
  if (tip && status) {
    const sync = () => {
      status.textContent = `open: ${tip.hasAttribute('open')}`
    }
    window.tipCtrl = (open) => {
      if (open) tip.setAttribute('open', '')
      else tip.removeAttribute('open')
    }
    sync()
    // Both hover/focus triggers and external control change open; keep status synced with MutationObserver
    new MutationObserver(sync).observe(tip, { attributes: true, attributeFilter: ['open'] })
  }

  // Virtual anchor: hover a point → point virtual-anchor at it + update content + open
  const anchorTip = document.getElementById('tt-anchor')
  if (anchorTip) {
    document.querySelectorAll('#vp-chart .vp-dot').forEach((dot) => {
      dot.addEventListener('mouseenter', () => {
        anchorTip.setAttribute('virtual-anchor', `#${dot.id}`)
        anchorTip.setAttribute('content', dot.dataset.label || '')
        anchorTip.setAttribute('open', '')
      })
      dot.addEventListener('mouseleave', () => anchorTip.removeAttribute('open'))
    })
  }

  // Coordinate follow: canvas mousemove → virtual-x/y + open; close on leave
  const canvas = document.getElementById('vp-canvas')
  const followTip = document.getElementById('tt-follow')
  const followStatus = document.getElementById('tt-follow-status')
  if (canvas && followTip) {
    canvas.addEventListener('mousemove', (e) => {
      followTip.setAttribute('virtual-x', String(e.clientX))
      followTip.setAttribute('virtual-y', String(e.clientY))
      followTip.setAttribute('content', `Coords: ${e.clientX}, ${e.clientY}`)
      followTip.setAttribute('open', '')
    })
    canvas.addEventListener('mouseleave', () => followTip.removeAttribute('open'))
  }
  if (followTip && followStatus) {
    const syncFollow = () => {
      followStatus.textContent = followTip.hasAttribute('open') ? 'Following' : 'Not following'
    }
    syncFollow()
    new MutationObserver(syncFollow).observe(followTip, {
      attributes: true,
      attributeFilter: ['open'],
    })
  }

  // manual trigger: external buttons control show/hide
  const manualTip = document.getElementById('tip-manual')
  if (manualTip) {
    window.manualTip = (open) => {
      if (open) manualTip.setAttribute('open', '')
      else manualTip.removeAttribute('open')
    }
  }

  // fresh demo: change content dynamically to show sync while closed
  const freshTip = document.getElementById('tip-fresh')
  if (freshTip) {
    window.freshChange = () => {
      freshTip.setAttribute('content', `Content updated: ${new Date().toLocaleTimeString()}`)
    }
  }

  // outside-dismiss status feedback
  const outsideTip = document.getElementById('tt-outside')
  const outsideStatus = document.getElementById('tt-outside-status')
  if (outsideTip && outsideStatus) {
    const syncOutside = () => {
      outsideStatus.textContent = outsideTip.hasAttribute('open') ? 'open' : 'closed'
    }
    syncOutside()
    outsideTip.addEventListener('oas-open-change', syncOutside)
  }

  // label semantics: show the button aria binding + toggle
  const labelTip = document.getElementById('tt-label')
  const labelStatus = document.getElementById('tt-label-status')
  if (labelTip && labelStatus) {
    const labelAnchor = labelTip.querySelector(':scope > *')
    const syncLabel = () => {
      const a =
        (labelAnchor && labelAnchor.getAttribute('aria-labelledby')) ||
        (labelAnchor && labelAnchor.getAttribute('aria-describedby')) ||
        ''
      labelStatus.textContent =
        labelTip.hasAttribute('open') && a ? `aria: ${a}` : 'aria: -'
    }
    window.labelOpen = () => {
      if (labelTip.hasAttribute('open')) labelTip.removeAttribute('open')
      else labelTip.setAttribute('open', '')
    }
    syncLabel()
    labelTip.addEventListener('oas-open-change', syncLabel)
    if (labelAnchor) {
      new MutationObserver(syncLabel).observe(labelAnchor, {
        attributes: true,
        attributeFilter: ['aria-labelledby', 'aria-describedby'],
      })
    }
  }

  // event-source demo: oas-open-change detail { open, source, reason }
  const evtTip = document.getElementById('tt-evt')
  const evtStatus = document.getElementById('tt-evt-status')
  if (evtTip && evtStatus) {
    evtTip.addEventListener('oas-open-change', (e) => {
      const d = e.detail || {}
      evtStatus.textContent = `open=${d.open} · source=${d.source}${
        d.reason ? ` · reason=${d.reason}` : ''
      }`
    })
  }
})
</script>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `a11y` | — | `string` | `description` |
| `append-to` | Popup mount point: `body` or a CSS selector. Moves the popup into an isolated shadow inside the target container (styles stay scoped), escaping clipping contexts such as `overflow: hidden` / transform; while mounted, `::part(tip)` cannot pierce from the host — customize via CSS variables or class selectors | `string` | — |
| `arrow` | Whether to show the arrow (default true; `arrow="false"` hides it, the element and `::part(arrow)` are kept) | `string` | `true` |
| `arrow-offset` | — | — | — |
| `arrow-point-at-center` | Make the arrow point at the trigger element's center (default points at the trigger's edge; the arrow still points at the anchor center when the panel is shifted by viewport-edge avoidance) | `boolean` | — |
| `arrow-position` | Arrow shape: `center` (default, arrow centered on the panel edge) / `merge` (only for `*-start`/`*-end` placements; a right triangle merges flush with the panel corner — legs collinear with the panel edges, tip pointing orthogonally toward the anchor) | `string` | `center` |
| `auto-adjust-overflow` | Viewport-edge auto flip and avoidance (default true; `"false"` disables it, keeping the declared placement, which may overflow the viewport) | `string` | `true` |
| `auto-close` | Auto-close after opening (ms); `0` or absent disables it | — | — |
| `close-delay` | Hide delay (ms, default 0): close after mouseleave/focusout | — | — |
| `close-on-scroll` | — | `boolean` | — |
| `collision-boundary` | — | `Element \| null` | — |
| `collision-padding` | Viewport-edge avoidance margin (px, default 4): the distance kept from the edge when the popup is clamped | — | — |
| `color` | Color variant: semantic `primary`/`success`/`warning`/`danger`, one of the 11 preset names (e.g. `magenta`, `blue`), or any CSS color. All go through tokens (with dark variants); the arrow background follows | `string` | — |
| `content` | Tooltip content text (the `slot="content"` rich content takes precedence when present) | `string` | — |
| `disabled` | Disabled: the tooltip never shows (neither hover nor a controlled `open`) | `boolean` | — |
| `fallback-axis-side` | — | `string` | `none` |
| `fallback-placements` | — | `string` | — |
| `follow-cursor` | — | `boolean` | — |
| `fresh` | Content freshness (default true): content changes are synced immediately even while closed; `"false"` freezes the content while closed, updating on next open | `string` | `true` |
| `interactive` | Hoverable popup: moving the mouse into the popup keeps it open (`pointer-events: auto`), links inside stay reachable | `boolean` | — |
| `max-width` | Popup max width (number in px or CSS length; defaults to the `--oas-tooltip-max-width` token, 240px) | `string` | — |
| `offset` | Main-axis distance (px, default 10): the gap between the popup and the anchor along the main axis | — | — |
| `open` | Controlled display (boolean attribute; shows when present) | `boolean` | — |
| `open-delay` | Show delay (ms, default 0): open after mouseenter/focusin; skipped when `skip-delay-duration` hits | — | — |
| `placement` | Popup placement (12 directions: top/bottom/left/right × start/center/end) | `string` | `top` |
| `skidding` | Cross-axis offset (px, default 0): top/bottom placements shift horizontally (positive right, negative left); left/right placements shift vertically (positive down, negative up) | — | — |
| `skip-delay-duration` | Global delay-group threshold (ms, default 300): when a tooltip closes, the next one opened within this window skips its open-delay and shows immediately (responsive for consecutive hovers); `"0"` disables it | — | — |
| `touch-delay` | Touch long-press trigger duration (ms, default 500): with `touch` in `trigger`, pointerdown held to the threshold opens; releasing/moving out earlier cancels | — | — |
| `trigger` | Trigger modes (space-separated multi-select): `hover` / `focus` / `click` / `contextmenu` / `touch` / `manual`, default `hover focus`; `manual` is fully controlled | `string` | `hover focus touch` |
| `trigger-keys` | Specified keys (space-separated, e.g. `F1`): pressing one while the trigger is focused opens the tooltip | `string` | — |
| `virtual` | Virtual trigger mode: not bound to a host trigger element; `open` is fully controlled externally and the position is set by `virtual-anchor` or `virtual-x`/`virtual-y` (for chart points, floating hints during drag) | `boolean` | — |
| `virtual-anchor` | Anchor element selector (e.g. `#chart-point-1`); the tooltip is positioned by that element's rect. Mutually exclusive with `virtual-x`/`virtual-y` (coordinates take precedence) | — | — |
| `virtual-x` | Virtual anchor viewport X coordinate (px, e.g. mouse `clientX`); position by coordinates when set together with `virtual-y` | — | — |
| `virtual-y` | Virtual anchor viewport Y coordinate (px, e.g. mouse `clientY`); position by coordinates when set together with `virtual-x` | — | — |
| `width` | — | `string` | — |

### Events

| Event | Description |
| --- | --- |
| `oas-open-change` | Fired when the `open` state changes (show/hide), `detail: { open }` |

### Slots

| Name | Description |
| --- | --- |
| default | Trigger element (hover/focus trigger); optional in `virtual` mode |
| `content` | Rich content (takes precedence over the `content` attribute text when present) |

`oas-open-change`: fired when the `open` state changes (show/hide), `detail: { open }`. Shown/hidden on hover or focus; `role="tooltip"`, the popup uses `pointer-events: none` so it never blocks interactions.
