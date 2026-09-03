# Popover

A click / hover / focus triggered popup panel that can hold a title, body text and arbitrary custom content. Supports 12-way placement, dual-axis offset, open/close animation, portal, modal mode and nested popovers.

## Basic usage

<DemoBlock title="Trigger on click">
  <oas-popover title="Card title" content="Click the trigger to toggle visibility; click outside or press Esc to close." placement="bottom">
    <oas-button type="primary">Click to open</oas-button>
  </oas-popover>
</DemoBlock>

## Placement

`placement` supports 12 directions: the four bases `top / bottom / left / right` each with `-start` / `-end` cross-axis alignment (`bottom-start` aligns the panel's left edge with the trigger's left edge, the most common form). When space is insufficient the panel flips along the main axis and keeps the alignment suffix (`bottom-start` → `top-start`); after alignment it is still clamped to the viewport.

<DemoBlock title="Four directions">
  <oas-popover title="Title" content="Content" placement="top">
    <oas-button>Up</oas-button>
  </oas-popover>
  <oas-popover title="Title" content="Content" placement="bottom">
    <oas-button>Down</oas-button>
  </oas-popover>
  <oas-popover title="Title" content="Content" placement="left">
    <oas-button>Left</oas-button>
  </oas-popover>
  <oas-popover title="Title" content="Content" placement="right">
    <oas-button>Right</oas-button>
  </oas-popover>
</DemoBlock>

<DemoBlock title="12-way placement (-start / -end)">
  <oas-space size="small">
    <oas-popover title="Title" content="Content" placement="bottom-start">
      <oas-button>bottom-start</oas-button>
    </oas-popover>
    <oas-popover title="Title" content="Content" placement="bottom-end">
      <oas-button>bottom-end</oas-button>
    </oas-popover>
    <oas-popover title="Title" content="Content" placement="right-start">
      <oas-button>right-start</oas-button>
    </oas-popover>
    <oas-popover title="Title" content="Content" placement="top-end">
      <oas-button>top-end</oas-button>
    </oas-popover>
  </oas-space>
</DemoBlock>

## Trigger methods

`trigger` controls the trigger method: `click` (default) / `hover` / `focus` / `contextmenu` / `manual`, space separated for multiple (e.g. `"click hover"`). For hover triggering, `hover-delay` / `hover-hide-delay` control the open/close debounce (default 150 / 100ms; without debounce hover flickers open/closed); the hover area is the trigger plus the panel (moving across the gap does not close it). `manual` mode binds no host events at all — visibility is fully controlled by the host `open` attribute.

<DemoBlock title="Hover trigger">
  <oas-space size="small">
    <oas-popover trigger="hover" title="Hover card" content="trigger=hover: opens on mouse enter, closes on leave (including moving into the panel)." placement="bottom">
      <oas-button>Hover to open</oas-button>
    </oas-popover>
    <oas-popover trigger="click hover" title="Multiple triggers" content="trigger=&quot;click hover&quot;: both click and hover toggle it." placement="bottom">
      <oas-button>Click or hover</oas-button>
    </oas-popover>
    <oas-popover trigger="contextmenu" title="Context menu" content="trigger=contextmenu: right-click opens it." placement="bottom">
      <oas-button>Right-click to open</oas-button>
    </oas-popover>
  </oas-space>
</DemoBlock>

<DemoBlock title="Custom open/close delays">
  <oas-space size="small">
    <oas-popover trigger="hover" hover-delay="400" title="hover-delay=400" content="Opens 400ms after hover." placement="bottom">
      <oas-button>hover-delay=400</oas-button>
    </oas-popover>
    <oas-popover trigger="hover" hover-hide-delay="400" title="hover-hide-delay=400" content="Closes 400ms after leaving." placement="bottom">
      <oas-button>hover-hide-delay=400</oas-button>
    </oas-popover>
  </oas-space>
</DemoBlock>

<DemoBlock title="Generic delays (open-delay / close-delay)">
  <oas-space size="small">
    <oas-popover open-delay="400" title="open-delay=400" content="Opens 400ms after click." placement="bottom">
      <oas-button>open-delay=400</oas-button>
    </oas-popover>
    <oas-popover close-delay="400" title="close-delay=400" content="Hides 400ms after the close request." placement="bottom">
      <oas-button>close-delay=400</oas-button>
    </oas-popover>
  </oas-space>
</DemoBlock>

## Disabled

`disabled` disables the whole popover: click / hover / focus / right-click / key triggers are all ignored; the host is desaturated (opacity .6) and `aria-disabled` is synced. Disabled trigger elements (such as native disabled buttons) do not dispatch mouse events — wrap them in a span before attaching a popover.

<DemoBlock title="Whole popover disabled">
  <oas-space size="small">
    <oas-popover disabled title="Disabled" content="Will not open." placement="bottom">
      <oas-button>Disabled (click)</oas-button>
    </oas-popover>
    <oas-popover disabled trigger="hover" title="Disabled" content="Will not open." placement="bottom">
      <oas-button>Disabled (hover)</oas-button>
    </oas-popover>
  </oas-space>
</DemoBlock>

## Width

`width` controls the panel width: a number (px), `"trigger"` (same width as the trigger) or any CSS value (e.g. `50%`). `width="trigger"` fits the "panel as wide as the control" dropdown-select shape.

<DemoBlock title="Width (width)">
  <oas-space size="small">
    <oas-popover title="Fixed width" content="width=280: fixed 280px panel." placement="bottom" width="280">
      <oas-button>width="280"</oas-button>
    </oas-popover>
    <oas-popover id="pop-width-trigger" title="Same as trigger" content="width=trigger: panel width equals the trigger width." placement="bottom" width="trigger">
      <oas-button style="width: 220px">width="trigger" (220px)</oas-button>
    </oas-popover>
    <oas-popover title="Percentage width" content="width=50%: 50% of the host width." placement="bottom" width="50%">
      <oas-button>width="50%"</oas-button>
    </oas-popover>
  </oas-space>
</DemoBlock>

## Offset and collision tuning

`offset` is a dual-axis offset: `"main distance"` or `"main distance, cross offset"` (default 8, 0). Collision tuning: `collision-padding` viewport clamp gap (default 4px); `fallback-placements` custom fallback sequence (when the requested placement does not fit, each candidate is tried in order); `hide-when-detached` hides the panel when the anchor is fully outside the viewport.

<DemoBlock title="Dual-axis offset (offset)">
  <oas-space size="small">
    <oas-popover title="Offset" content="offset=&quot;12, 20&quot;: main axis 12px + cross axis shifted right 20px." placement="bottom" offset="12, 20">
      <oas-button>offset="12, 20"</oas-button>
    </oas-popover>
    <oas-popover title="Main axis only" content="offset=&quot;16&quot;: main-axis gap 16px." placement="bottom" offset="16">
      <oas-button>offset="16"</oas-button>
    </oas-popover>
  </oas-space>
</DemoBlock>

<DemoBlock title="Collision tuning (collision-padding / fallback-placements / hide-when-detached)">
  <oas-space size="small">
    <oas-popover title="Padding" content="collision-padding=20: keeps a 20px gap when the panel hugs the viewport edge." placement="bottom" collision-padding="20">
      <oas-button>collision-padding=20</oas-button>
    </oas-popover>
    <oas-popover title="Fallbacks" content="fallback-placements=&quot;left, right&quot;: tries left first when the bottom does not fit." placement="bottom" fallback-placements="left, right">
      <oas-button>fallback-placements</oas-button>
    </oas-popover>
    <oas-popover title="Hide when detached" content="hide-when-detached: the panel hides once the trigger scrolls out of the viewport." placement="right" hide-when-detached>
      <oas-button>hide-when-detached</oas-button>
    </oas-popover>
  </oas-space>
</DemoBlock>

## Initial focus and keyboard

`focus-on-open` moves focus into the first focusable element of the panel when opened; `initial-focus` precisely focuses the element matched by a selector (higher priority, falls back to focus-on-open when unresolvable). `trigger-keys` toggles open when the listed keys are pressed while the trigger is focused (space separated).

<DemoBlock title="Specified initial focus (initial-focus)">
  <oas-popover title="Initial focus" initial-focus="#pop-focus-name" placement="bottom" focus-on-open>
    <oas-button>Open (focus lands in the input)</oas-button>
    <div slot="content">
      <p style="margin: 0 0 8px">On open, focus goes straight into the input below:</p>
      <oas-input id="pop-focus-name" placeholder="Name"></oas-input>
    </div>
  </oas-popover>
</DemoBlock>

<DemoBlock title="Open with keys (trigger-keys)">
  <oas-popover trigger-keys="Enter" title="Open with keys" content="Focus the trigger button and press Enter to toggle." placement="bottom">
    <oas-button>Focus then press Enter</oas-button>
  </oas-popover>
</DemoBlock>

## Portal

`append-to` moves the panel outside the host container (to `body` or a selector), avoiding clipping by the host's `overflow: hidden` / `clip`; positioning is viewport-based and unaffected by the move. After the panel leaves the shadow, clicks inside the panel still do not trigger outside-click close.

<DemoBlock title="Portal (append-to)">
  <div id="pop-port-host" style="overflow: hidden; padding: 12px; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md);">
    <oas-popover title="Portal panel" content="The panel is mounted to body (append-to=body) and is not clipped by the host's overflow:hidden." placement="bottom" append-to="body">
      <oas-button type="primary">Open portal panel</oas-button>
    </oas-popover>
  </div>
</DemoBlock>

## Arrow and viewport auto adjust

By default an arrow pointing at the trigger element's edge is shown; `arrow="false"` hides the arrow; `arrow-point-at-center` makes the arrow point at the trigger element's center (when the panel is shifted by viewport-edge avoidance, the arrow still points at the anchor center). By default the panel automatically flips along the main axis and avoids the viewport edges when space is insufficient; `auto-adjust-overflow="false"` disables the auto adjust so the panel keeps the declared placement (it may overflow the viewport).

<DemoBlock title="Arrow visibility and pointing">
  <oas-space size="large" wrap>
    <oas-popover id="pop-arrow-default" title="Default" content="Arrow is shown by default" placement="bottom">
      <oas-button>Default</oas-button>
    </oas-popover>
    <oas-popover id="pop-arrow-off" title="No arrow" content="arrow=false: arrow hidden" placement="bottom" arrow="false">
      <oas-button>No arrow</oas-button>
    </oas-popover>
    <oas-popover id="pop-arrow-center" title="Point at center" content="arrow-point-at-center: arrow points at the trigger center" placement="bottom" arrow-point-at-center>
      <oas-button>Point at center</oas-button>
    </oas-popover>
  </oas-space>
</DemoBlock>

<DemoBlock title="Merged arrow (arrow-merge)">
  <oas-space size="small">
    <oas-popover title="Merged corner" content="arrow-merge: the arrow sits flush at the panel corner and the adjacent corner radius is zeroed (only -start/-end placements)." placement="bottom-start" arrow-merge>
      <oas-button>bottom-start merged</oas-button>
    </oas-popover>
    <oas-popover title="Reference" content="Without arrow-merge: the arrow is centered on the panel edge." placement="bottom-start">
      <oas-button>Reference</oas-button>
    </oas-popover>
  </oas-space>
</DemoBlock>

<DemoBlock title="Auto adjust disabled">
  <oas-popover title="Keep placement" content="auto-adjust-overflow=false: the panel keeps the declared placement and may overflow the viewport." placement="bottom" auto-adjust-overflow="false">
    <oas-button>Auto adjust off</oas-button>
  </oas-popover>
</DemoBlock>

## Custom content

<DemoBlock title="Custom content (slot=content)">
  <oas-popover title="Actions panel" placement="bottom">
    <oas-button>Open panel</oas-button>
    <div slot="content" style="line-height: 1.8">
      You can place arbitrary custom content via <code>slot="content"</code>.
    </div>
  </oas-popover>
</DemoBlock>

## Close button and declarative close

`closable` shows a close button at the panel's top-right (`part="close"`); clicking it closes and restores focus. Any element inside the content with `data-popover="close"` becomes a declarative close control — clicking it closes the popover (great for "Done" / "Got it" style action buttons).

<DemoBlock title="Close button and declarative close">
  <oas-space size="small">
    <oas-popover title="Closable" content="The ✕ at the top-right closes it." placement="bottom" closable>
      <oas-button>closable</oas-button>
    </oas-popover>
    <oas-popover title="Declarative close" placement="bottom">
      <oas-button>Close from a panel button</oas-button>
      <div slot="content" style="text-align: center">
        <oas-button size="small" type="primary" data-popover="close">Got it</oas-button>
      </div>
    </oas-popover>
  </oas-space>
</DemoBlock>

## Color variants

`color` semantic variants: `primary` / `success` / `warning` / `danger` — a tinted panel background plus a semantic border (arrow included), all derived from tokens (auto-adapted to the dark theme).

<DemoBlock title="Color variants (color)">
  <oas-space size="small">
    <oas-popover title="Primary" content="color=primary: primary tinted background + primary border." placement="bottom" color="primary">
      <oas-button type="primary">primary</oas-button>
    </oas-popover>
    <oas-popover title="Success" content="color=success: success variant." placement="bottom" color="success">
      <oas-button type="success">success</oas-button>
    </oas-popover>
    <oas-popover title="Warning" content="color=warning: warning variant." placement="bottom" color="warning">
      <oas-button type="warning">warning</oas-button>
    </oas-popover>
    <oas-popover title="Danger" content="color=danger: danger variant." placement="bottom" color="danger">
      <oas-button type="danger">danger</oas-button>
    </oas-popover>
  </oas-space>
</DemoBlock>

## Open/close animation

The panel plays a fade + scale animation on open and close; `transform-origin` is direction-aware (expanding from the edge that faces the trigger, hugging the aligned edge for -start/-end). Animations are disabled under `prefers-reduced-motion`.

<DemoBlock title="Direction-aware animation">
  <oas-space size="small">
    <oas-popover title="Animated" content="Expands / collapses from the trigger side." placement="bottom">
      <oas-button>Try it</oas-button>
    </oas-popover>
    <oas-popover title="Animated" content="Expands from the right." placement="right-start">
      <oas-button>Right expand</oas-button>
    </oas-popover>
  </oas-space>
</DemoBlock>

## Live content and auto close

By default (without `fresh`) the content is frozen while closed and the latest value is written when opened; with `fresh` the closed state keeps syncing content (avoids flicker for controlled content). `auto-close` auto closes after the given duration (onboarding / guided-tour scenarios).

<DemoBlock title="fresh: content keeps updating while closed">
  <oas-space size="small">
    <oas-button size="small" type="primary" onclick="popFreshSet('v1')">Content → v1</oas-button>
    <oas-button size="small" onclick="popFreshSet('v2')">Content → v2 (closed)</oas-button>
    <oas-tag id="pop-fresh-tag" type="info">content: -</oas-tag>
  </oas-space>
  <oas-popover id="pop-fresh" title="fresh" content="-" placement="bottom" fresh>
    <oas-button>Open to see the content</oas-button>
  </oas-popover>
</DemoBlock>

<DemoBlock title="auto-close: closes after a timeout">
  <oas-popover title="Auto close in 3s" content="auto-close=3000: closes 3s after opening." placement="bottom" auto-close="3000">
    <oas-button>Open (closes after 3s)</oas-button>
  </oas-popover>
</DemoBlock>

## Nested popovers

A floating layer can open a child popover / tooltip from its own content: the child layer anchors correctly and stacks above the parent; closing the parent closes the child as well; `Esc` closes one layer at a time and restores focus each time.

<DemoBlock title="Nested popovers (pop from a card)">
  <oas-popover id="pop-parent" title="Main card" placement="bottom" focus-on-open>
    <oas-button type="primary">Open main card</oas-button>
    <div slot="content" style="width: 240px; line-height: 1.8">
      <p style="margin: 0 0 8px">Open a child layer from within the parent panel:</p>
      <oas-popover id="pop-child" title="Child card" content="The child closes together with the parent; Esc closes layer by layer." placement="right" focus-on-open>
        <oas-button size="small">Open child card</oas-button>
      </oas-popover>
    </div>
  </oas-popover>
</DemoBlock>

## Virtual triggering

In `virtual` mode there is no real anchor (same as tooltip): the host positions the popover with `virtual-x` / `virtual-y` viewport coordinates or a `virtual-anchor` element selector, ideal for chart / canvas coordinate hints; `open` controls visibility. In virtual mode neither clicking the trigger nor clicking outside changes the state — the lifecycle is fully host-controlled.

<DemoBlock title="Virtual triggering (canvas cursor tracking)">
  <oas-popover id="pop-virt" virtual virtual-x="0" virtual-y="0" placement="top" title="Canvas coordinate"></oas-popover>
  <div id="virt-canvas" style="position: relative; height: 140px; width: 100%; min-width: 200px; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md); background: var(--oas-color-bg-hover);">
    <p style="position: absolute; inset: 0; margin: 0; display: grid; place-items: center; text-align: center; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm);">Move the mouse to see coordinate hints</p>
  </div>
</DemoBlock>

<DemoBlock title="Virtual triggering (anchor coordinates)">
  <oas-space size="small">
    <oas-button type="primary" size="small" onclick="event.stopPropagation(); popPointShow(160, 90)">Open at (160, 90)</oas-button>
    <oas-button size="small" onclick="event.stopPropagation(); popPointHide()">Close</oas-button>
    <oas-tag id="pop-point-status" type="info">open: false</oas-tag>
  </oas-space>
  <oas-popover id="pop-point" virtual virtual-x="160" virtual-y="90" placement="right" title="Point hint" content="Anchor coordinates are set by virtual-x / virtual-y, suitable for chart data point hints."></oas-popover>
</DemoBlock>

<DemoBlock title="Virtual triggering (anchor element)">
  <div id="pop-chart" style="position: relative; height: 120px; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md); background: var(--oas-color-bg-hover);">
    <div id="pop-dot-0" style="position: absolute; left: 90px; top: 34px; width: 8px; height: 8px; border-radius: 50%; background: var(--oas-color-primary);"></div>
    <div id="pop-dot-1" style="position: absolute; left: 200px; top: 60px; width: 8px; height: 8px; border-radius: 50%; background: var(--oas-color-primary);"></div>
  </div>
  <oas-popover id="pop-anchor" virtual virtual-anchor="#pop-dot-0" placement="top" title="Data point" content="The anchor element is set by virtual-anchor, suitable for chart data point hints."></oas-popover>
</DemoBlock>

## Modal mode

`modal` turns the popover into a modal floating layer: full-screen backdrop + focus trap (Tab / Shift+Tab cycle inside the panel, escaped focus is pulled back, only the topmost modal traps) + scroll lock (intercepts wheel / scroll keys while keeping the scrollbar visible) + `aria-modal`. Clicking the backdrop closes and restores focus.

<DemoBlock title="Modal mode (backdrop + focus lock + scroll lock)">
  <oas-popover title="Modal panel" content="A backdrop dims the page; Tab focus is trapped inside the panel; page scrolling is blocked; click the backdrop or press Esc to close." placement="bottom" modal focus-on-open>
    <oas-button type="primary">Open modal panel</oas-button>
    <div slot="content">
      <p style="margin: 0 0 8px">Focus is trapped inside the panel:</p>
      <oas-space size="small">
        <oas-button size="small" type="primary" data-popover="close">Done</oas-button>
        <oas-button size="small" data-popover="close">Cancel</oas-button>
      </oas-space>
    </div>
  </oas-popover>
</DemoBlock>

## Accessibility wiring & keyboard

The trigger element gets ARIA wiring automatically: `aria-haspopup="dialog"` + `aria-expanded` (follows open state) + `aria-controls` (panel id), so screen readers can perceive the floating layer. `trigger-keys` defaults to `Enter Space` — focus the trigger and press Enter / Space to toggle (idempotent with the synthesized click on native buttons, no flicker); override with other keys via the attribute.

<DemoBlock title="Keyboard toggle (default Enter / Space)">
  <oas-popover title="Keyboard toggle" content="Focus the button and press Enter or Space to toggle; press again to close." placement="bottom">
    <oas-button>Focus, then Enter / Space</oas-button>
  </oas-popover>
</DemoBlock>

## trap-focus focus trap

`trap-focus` decouples the focus trap from modal: no backdrop, no scroll lock, but Tab / Shift+Tab cycle inside the panel without escaping — ideal for form popovers (the background stays interactive while focus stays put). `modal` + `trap-focus` stack idempotently (the trap is mounted once).

<DemoBlock title="trap-focus (form popover, focus stays inside)">
  <oas-popover title="Fill in info" placement="bottom" trap-focus focus-on-open closable>
    <oas-button type="primary">Open form popover</oas-button>
    <div slot="content" style="display: grid; gap: 8px; min-width: 220px">
      <oas-input placeholder="Name" aria-label="Name"></oas-input>
      <oas-input placeholder="Email" aria-label="Email"></oas-input>
      <oas-button size="small" type="primary" data-popover="close">Submit</oas-button>
    </div>
  </oas-popover>
</DemoBlock>

## Close behavior switches

`close-on-outside` / `close-on-escape` (both default `true`, preserving current behavior) control "close on outside click" and "close on Esc" respectively; `oas-before-close` is a cancelable close event (`preventDefault()` blocks the close). Every close entry point (trigger toggle / outside click / Esc / close button / declarative close / backdrop / auto-close / in-panel select) passes through it first — `detail.source` labels the origin.

<DemoBlock title="Close switches + cancelable close (oas-before-close)">
  <oas-space size="small" wrap>
    <oas-popover title="Outside click stays open" content="close-on-outside=false: clicking outside does not close; use ✕ or Esc." placement="bottom" closable close-on-outside="false">
      <oas-button>No outside close</oas-button>
    </oas-popover>
    <oas-popover title="Esc stays open" content="close-on-escape=false: pressing Esc does not close; clicking outside does." placement="bottom" closable close-on-escape="false">
      <oas-button>No Esc close</oas-button>
    </oas-popover>
    <oas-popover id="pop-guard" title="Intercept close" content="While “Intercept close” is checked, nothing can close this panel; uncheck to close." placement="bottom" closable>
      <oas-button>Intercept-close demo</oas-button>
      <div slot="content" style="min-width: 200px">
        <label style="display: inline-flex; align-items: center; gap: 6px; cursor: pointer">
          <oas-checkbox id="pop-guard-check"></oas-checkbox>Intercept close
        </label>
      </div>
    </oas-popover>
  </oas-space>
</DemoBlock>

## Size & style variables

`size` tiers: `small` / `medium` (default) / `large` — padding, min-width and font-size scale with the tier (token based). The panel look is customizable via component-level CSS variables: `--oas-popover-bg` / `--oas-popover-border` / `--oas-popover-shadow` / `--oas-popover-radius` / `--oas-popover-padding` / `--oas-popover-min-width` (defaults fall back to global tokens; dark theme follows automatically).

<DemoBlock title="Size tiers (size)">
  <oas-space size="small">
    <oas-popover title="Small" content="size=small: compact padding + smaller font." placement="bottom" size="small">
      <oas-button>small</oas-button>
    </oas-popover>
    <oas-popover title="Default" content="size=medium (default)." placement="bottom">
      <oas-button>medium</oas-button>
    </oas-popover>
    <oas-popover title="Large" content="size=large: roomy padding + larger font." placement="bottom" size="large">
      <oas-button>large</oas-button>
    </oas-popover>
  </oas-space>
</DemoBlock>

<DemoBlock title="Panel CSS variables (--oas-popover-*)">
  <oas-popover title="Variable styled" content="Panel look customized via --oas-popover-bg / --oas-popover-border / --oas-popover-radius (the arrow follows the same colors)." placement="bottom" style="--oas-popover-bg: var(--oas-color-bg-hover); --oas-popover-border: var(--oas-color-primary); --oas-popover-radius: var(--oas-radius-lg);">
    <oas-button>Variable-styled panel</oas-button>
  </oas-popover>
</DemoBlock>

## Structured slots & description

`slot="header"` takes over the whole head region (the title area steps aside); `slot="footer"` renders a footer action area (separated from the body by a divider); `slot="description"` renders a supplementary note and wires `aria-describedby` automatically (screen readers can announce the panel description).

<DemoBlock title="header / footer / description slots">
  <oas-popover placement="bottom">
    <oas-button type="primary">Open structured panel</oas-button>
    <div slot="header" style="display: flex; align-items: center; gap: 6px; font-weight: 600">Member settings <oas-tag size="small">Pro</oas-tag></div>
    <div slot="content" style="line-height: 1.8">Body content: independent from header / footer / description.</div>
    <p slot="description" style="margin: 0">Changes apply immediately on close — no save needed.</p>
    <div slot="footer" style="display: flex; justify-content: flex-end; gap: 8px">
      <oas-button size="small" data-popover="close">Cancel</oas-button>
      <oas-button size="small" type="primary" data-popover="close">OK</oas-button>
    </div>
  </oas-popover>
</DemoBlock>

## Height constraint & in-panel scrolling

`available-height` constrains the panel max-height to the remaining viewport space along the main axis; `scrollable` enables in-panel scrolling (head / footer fixed, body area scrolls) so long content no longer overflows the viewport. The two are often combined for long lists.

<DemoBlock title="scrollable + available-height (long list scrolls)">
  <oas-popover title="Notifications" placement="bottom" scrollable available-height>
    <oas-button type="primary">Open notifications (scrollable)</oas-button>
    <div slot="content" style="display: grid; gap: 10px; min-width: 260px">
      <p style="margin: 0">Panel height stays within the remaining viewport; the body scrolls internally:</p>
      <div style="display: grid; gap: 8px">
        <oas-tag>Notice 1</oas-tag><oas-tag>Notice 2</oas-tag><oas-tag>Notice 3</oas-tag><oas-tag>Notice 4</oas-tag>
        <oas-tag>Notice 5</oas-tag><oas-tag>Notice 6</oas-tag><oas-tag>Notice 7</oas-tag><oas-tag>Notice 8</oas-tag>
        <oas-tag>Notice 9</oas-tag><oas-tag>Notice 10</oas-tag>
      </div>
    </div>
  </oas-popover>
</DemoBlock>

## Focus return & empty state

`final-focus` sets where focus goes after closing (selector; or pass an element via the `finalFocusEl` property, which takes precedence); the default returns to the trigger. `hide-empty` keeps the panel hidden when it has no content at all (no title / content / slot content) — no blank panels popping up.

<DemoBlock title="final-focus (focus moves to a chosen element after close)">
  <oas-space size="small">
    <oas-input id="pop-final-input" placeholder="Focus returns here on close" style="width: 220px"></oas-input>
    <oas-popover title="Focus return" content="After closing, focus moves to the input next to it instead of the trigger." placement="bottom" final-focus="#pop-final-input" closable>
      <oas-button>Open (close via ✕ to see focus)</oas-button>
    </oas-popover>
  </oas-space>
</DemoBlock>

<DemoBlock title="hide-empty (no blank panel)">
  <oas-space size="small">
    <oas-button size="small" onclick="popEmptySet('')">Clear content</oas-button>
    <oas-button size="small" onclick="popEmptySet('Now it has content')">Fill content</oas-button>
    <oas-tag id="pop-empty-status" type="info">content: (empty)</oas-tag>
  </oas-space>
  <oas-popover id="pop-empty" title="Empty-state guard" content="" placement="bottom" hide-empty>
    <oas-button>Won't open while empty</oas-button>
  </oas-popover>
</DemoBlock>

## Scroll behavior (sticky / close-on-scroll)

`sticky` tiers: `partial` (default, repositions with the anchor on scroll) / `always` (once the anchor scrolls out, the panel pins to the viewport edge and stays visible) / `off` (does not follow scroll). `close-on-scroll` instead closes on scroll — dropdown-style popovers collapsing on scroll often feels right.

<DemoBlock title="sticky=always (panel pins to the edge after the anchor leaves)">
  <div id="pop-sticky-scroll" style="height: 120px; overflow-y: auto; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md); padding: 12px">
    <div style="height: 320px; display: grid; place-items: center start">
      <oas-popover title="Pinned" content="sticky=always: scroll this container — after the trigger leaves the viewport, the panel pins to the edge and stays." placement="right" sticky="always" open>
        <oas-button>Scroll the area below</oas-button>
      </oas-popover>
    </div>
    <p style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: 8px 0">↓ Scroll here ↓</p>
  </div>
</DemoBlock>

<DemoBlock title="close-on-scroll (closes on scroll)">
  <div id="pop-closeonscroll-box" style="height: 120px; overflow-y: auto; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md); padding: 12px">
    <div style="height: 320px">
      <oas-popover title="Close on scroll" content="close-on-scroll: scrolling the container while open closes the panel immediately." placement="right" close-on-scroll>
        <oas-button>Open, then scroll here</oas-button>
      </oas-popover>
    </div>
  </div>
</DemoBlock>

## Cursor-anchored context menu & touch long-press

With `trigger="contextmenu"`, right-clicking opens the panel **at the cursor position** (no longer anchored to the trigger center); on touch devices, holding for 500ms opens at the touch point (no right-click on mobile). After opening, scrolling snaps the panel back to the trigger side (a cursor point has no scroll semantics).

<DemoBlock title="contextmenu cursor anchoring (right-click / touch long-press)">
  <oas-popover trigger="contextmenu" title="Cursor menu" placement="right" arrow="false">
    <oas-button>Right-click anywhere around here</oas-button>
    <div slot="content">
      <p style="margin: 0 0 8px">The panel appears at the cursor:</p>
      <oas-space size="small" direction="vertical">
        <oas-button size="small" data-popover="close">Action one</oas-button>
        <oas-button size="small" data-popover="close">Action two</oas-button>
      </oas-space>
    </div>
  </oas-popover>
</DemoBlock>

## Auto-close after in-panel select

With `dismiss-on-select`, any click inside the panel (including slot content) counts as a completed selection and closes the panel — no need for `data-popover="close"` on option panels. The close still passes through `oas-before-close` (interceptable).

<DemoBlock title="dismiss-on-select (select to close)">
  <oas-space size="small">
    <oas-popover title="Choose a language" placement="bottom" dismiss-on-select>
      <oas-button type="primary">Pick one</oas-button>
      <div slot="content" style="display: grid; gap: 6px; min-width: 160px">
        <oas-button size="small">简体中文</oas-button>
        <oas-button size="small">English</oas-button>
        <oas-button size="small">日本語</oas-button>
      </div>
    </oas-popover>
    <oas-tag id="pop-dismiss-status" type="info">open: false</oas-tag>
  </oas-space>
</DemoBlock>

## Content destroy & lazy mount

`destroy-on-hide` unmounts the panel content presentation on close (slot nodes detached from assignment, attribute text cleared) and re-mounts on reopen — heavy-content popovers (charts / big lists) cost zero rendering while closed, equivalent to lazy mounting. Host light DOM nodes are never removed.

<DemoBlock title="destroy-on-hide (destroy on close, rebuild on reopen)">
  <oas-space size="small">
    <oas-popover id="pop-destroy" title="Heavy panel" placement="bottom" destroy-on-hide>
      <oas-button type="primary">Open heavy panel</oas-button>
      <div slot="content" style="min-width: 240px">
        <p style="margin: 0 0 8px">This content is unmounted on close (remounted on reopen):</p>
        <oas-progress value="72"></oas-progress>
      </div>
    </oas-popover>
    <oas-tag id="pop-destroy-status" type="info">Content unmounted while closed</oas-tag>
  </oas-space>
</DemoBlock>

## Breakpoints & trigger fine-tuning

`placement` / `size` support breakpoint shorthand (same protocol as space/grid): `"bottom md:right"` = base value + space-separated `breakpoint:value` pairs (sm=640 / md=768 / lg=1024 / xl=1280, mobile-first min-width) — below the panel on the bottom, at ≥768px on the right. `trigger="mousedown"` opens on press (no release needed, one beat faster than click).

<DemoBlock title="placement breakpoint shorthand (resize the window to see it switch)">
  <oas-popover title="Breakpoint placement" content="Below 768px the panel sits at the bottom; at ≥ 768px it moves to the right." placement="bottom md:right">
    <oas-button>bottom md:right</oas-button>
  </oas-popover>
</DemoBlock>

<DemoBlock title="trigger=mousedown (opens on press)">
  <oas-space size="small">
    <oas-popover title="Opens on press" content="trigger=mousedown: opens the moment the mouse is pressed, no release needed." placement="bottom" trigger="mousedown">
      <oas-button>mousedown</oas-button>
    </oas-popover>
    <oas-popover title="Compare" content="Default click: a full click (press + release) is needed." placement="bottom">
      <oas-button>click (compare)</oas-button>
    </oas-popover>
  </oas-space>
</DemoBlock>

## render-panel pure panel rendering

`render-panel` targets host-assembled scenarios: the popover binds no trigger at all (treated as `manual`, no trigger ARIA wiring); combined with `virtual-x` / `virtual-y` coordinates or `append-to`, the host fully owns placement and visibility — e.g. custom triggers or canvas-embedded panels.

<DemoBlock title="render-panel (host-assembled trigger)">
  <oas-space size="small">
    <oas-button size="small" type="primary" onclick="popPanelShow(event)">Host's own button: open pure panel</oas-button>
    <oas-button size="small" onclick="popPanelHide()">Close</oas-button>
    <oas-tag id="pop-render-status" type="info">open: false</oas-tag>
  </oas-space>
  <oas-popover id="pop-render-panel" render-panel virtual virtual-x="0" virtual-y="0" placement="bottom" title="Pure panel" content="Rendered via render-panel: no trigger binding; visibility and position are fully host-controlled."></oas-popover>
</DemoBlock>

## Controlled display

The `open` attribute is controlled: an external button can set/remove `open` to control visibility (clicking outside / pressing Esc still closes it).

<DemoBlock title="Controlled display (open attribute)">
  <oas-space size="small">
    <oas-button type="primary" size="small" onclick="event.stopPropagation(); popoverCtrl(true)">Open</oas-button>
    <oas-button size="small" onclick="event.stopPropagation(); popoverCtrl(false)">Close</oas-button>
    <oas-tag id="pop-status" type="info">open: false</oas-tag>
  </oas-space>
  <oas-popover id="pop-ctrl" title="Controlled panel" content="Controlled by the open attribute; clicking outside / Esc closes it." placement="bottom">
    <oas-button>Trigger element</oas-button>
  </oas-popover>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const pop = document.getElementById('pop-ctrl')
  const status = document.getElementById('pop-status')
  if (pop && status) {
    const sync = () => {
      status.textContent = `open: ${pop.hasAttribute('open')}`
    }
    window.popoverCtrl = (open) => {
      if (open) pop.setAttribute('open', '')
      else pop.removeAttribute('open')
    }
    sync()
    // Clicking outside / Esc makes the component remove open; keep status synced with MutationObserver
    new MutationObserver(sync).observe(pop, { attributes: true, attributeFilter: ['open'] })
  }

  // Virtual triggering: canvas cursor tracking (the host updates virtual-x/virtual-y on mousemove; open controls visibility)
  const virt = document.getElementById('pop-virt')
  const canvas = document.getElementById('virt-canvas')
  if (virt && canvas) {
    canvas.addEventListener('mousemove', (e) => {
      virt.setAttribute('open', '')
      virt.setAttribute('virtual-x', String(e.clientX))
      virt.setAttribute('virtual-y', String(e.clientY))
      virt.setAttribute('content', `x: ${e.clientX}px, y: ${e.clientY}px`)
    })
    canvas.addEventListener('mouseleave', () => virt.removeAttribute('open'))
  }

  // Virtual triggering: anchor coordinates (the host sets virtual-x/virtual-y explicitly then opens)
  const point = document.getElementById('pop-point')
  if (point) {
    window.popPointShow = (x, y) => {
      point.setAttribute('virtual-x', String(x))
      point.setAttribute('virtual-y', String(y))
      point.setAttribute('open', '')
    }
    window.popPointHide = () => point.removeAttribute('open')
    // oas-open-change visible feedback: status tag echoes open
    const st = document.getElementById('pop-point-status')
    point.addEventListener('oas-open-change', (e) => {
      if (st) st.textContent = `open: ${e.detail.open}`
    })
  }

  // Virtual triggering: anchor element (hover a dot shows the popover; virtual-anchor anchors it)
  const anchor = document.getElementById('pop-anchor')
  const dot0 = document.getElementById('pop-dot-0')
  const dot1 = document.getElementById('pop-dot-1')
  if (anchor && dot0 && dot1) {
    dot0.addEventListener('mouseenter', () => {
      anchor.setAttribute('virtual-anchor', '#pop-dot-0')
      anchor.setAttribute('open', '')
    })
    dot1.addEventListener('mouseenter', () => {
      anchor.setAttribute('virtual-anchor', '#pop-dot-1')
      anchor.setAttribute('open', '')
    })
    const hide = () => anchor.removeAttribute('open')
    dot0.addEventListener('mouseleave', hide)
    dot1.addEventListener('mouseleave', hide)
  }

  // fresh: content keeps updating while closed (external buttons change content, synced while closed)
  const fresh = document.getElementById('pop-fresh')
  const freshTag = document.getElementById('pop-fresh-tag')
  if (fresh && freshTag) {
    window.popFreshSet = (v) => {
      fresh.setAttribute('content', v)
      freshTag.textContent = `content: ${v}`
    }
    // oas-open-change probe echo: demonstrates the event is triggerable
    fresh.addEventListener('oas-open-change', (e) => {
      freshTag.textContent = `open: ${e.detail.open}, content: ${fresh.getAttribute('content')}`
    })
  }

  // P5 intercept close: while checked, oas-before-close preventDefault blocks every close path
  const guard = document.getElementById('pop-guard')
  const guardCheck = document.getElementById('pop-guard-check')
  if (guard && guardCheck) {
    guard.addEventListener('oas-before-close', (e) => {
      if (guardCheck.hasAttribute('checked')) e.preventDefault()
    })
  }

  // P15 hide-empty: no blank panel
  const emptyPop = document.getElementById('pop-empty')
  const emptyStatus = document.getElementById('pop-empty-status')
  if (emptyPop && emptyStatus) {
    window.popEmptySet = (v) => {
      emptyPop.setAttribute('content', v)
      emptyStatus.textContent = `content: ${v === '' ? '(empty)' : v}`
    }
  }

  // P21 dismiss-on-select: status echo
  const dismiss = document.querySelector('#pop-dismiss-status')
  const dismissPop = document.querySelector('oas-popover[dismiss-on-select]')
  if (dismiss && dismissPop) {
    const syncDismiss = () => {
      dismiss.textContent = `open: ${dismissPop.hasAttribute('open')}`
    }
    dismissPop.addEventListener('oas-open-change', (e) => {
      dismiss.textContent = `open: ${e.detail.open}`
    })
    syncDismiss()
  }

  // P22 destroy-on-hide: state echo
  const destroyPop = document.getElementById('pop-destroy')
  const destroyStatus = document.getElementById('pop-destroy-status')
  if (destroyPop && destroyStatus) {
    destroyPop.addEventListener('oas-open-change', (e) => {
      destroyStatus.textContent = e.detail.open ? 'Panel open (content mounted)' : 'Content unmounted while closed'
    })
  }

  // P25 render-panel: host-assembled trigger (host's own button controls the pure panel)
  const panel = document.getElementById('pop-render-panel')
  const panelStatus = document.getElementById('pop-render-status')
  if (panel && panelStatus) {
    window.popPanelShow = (e) => {
      panel.setAttribute('virtual-x', String(e.clientX))
      panel.setAttribute('virtual-y', String(e.clientY + 12))
      panel.setAttribute('open', '')
    }
    window.popPanelHide = () => panel.removeAttribute('open')
    panel.addEventListener('oas-open-change', (e) => {
      panelStatus.textContent = `open: ${e.detail.open}`
    })
  }
})
</script>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `append-to` | Portal mount target: the panel moves into the target container (`body` or a CSS selector) when opened and moves back into the host shadow when closed; for panels clipped by host containers (overflow) | `string` | — |
| `arrow` | Whether to show the arrow (default true; `arrow="false"` hides it, the element and `::part(arrow)` are kept) | `string` | `true` |
| `arrow-merge` | Merge the arrow with the panel corner (C1): a right triangle merges flush with the panel corner — legs collinear with the panel edges (their strokes continue the panel border band), tip pointing orthogonally toward the anchor; the matching corner radius is zeroed; only takes effect for *-start/*-end placements, center placements are unaffected | `boolean` | — |
| `arrow-point-at-center` | Make the arrow point at the trigger element's center (default points at the trigger's edge; the arrow still points at the anchor center when the panel is shifted by viewport-edge avoidance) | — | — |
| `auto-adjust-overflow` | Viewport-edge auto flip and avoidance (default true; `"false"` disables it, keeping the declared placement, which may overflow the viewport) | `string` | `true` |
| `auto-close` | Auto close after opening for the given duration in ms, e.g. `auto-close="3000"`; not set means no auto close | `string` | — |
| `available-height` | — | `boolean` | — |
| `closable` | Show a close button at the panel's top-right (`part="close"`); clicking it closes and restores focus to the trigger | `boolean` | — |
| `close-delay` | Generic close delay in ms (default 0; used by non-hover trigger paths, hover paths prefer hover-hide-delay) | `string` | — |
| `close-on-escape` | — | — | — |
| `close-on-outside` | — | `string` | `true` |
| `close-on-scroll` | — | `boolean` | — |
| `collision-padding` | Viewport-edge clamping padding in px (default 4), the gap kept when the panel avoids viewport edges | `string` | — |
| `color` | Color variant: `primary` / `success` / `warning` / `danger` (tinted panel background + semantic border, derived from tokens including dark variants); unset or invalid keeps the neutral panel | `string` | — |
| `content` | Body text | `string` | — |
| `destroy-on-hide` | — | `boolean` | — |
| `disabled` | Disable the whole popover: click / hover / focus / contextmenu / trigger-keys triggers are all ignored; the host is desaturated and aria-disabled is synced | `boolean` | — |
| `dismiss-on-select` | — | `boolean` | — |
| `fallback-placements` | Custom fallback sequence (comma or space separated, e.g. `"left, right"`): when the requested placement does not fit, each candidate in the sequence is tried for fit; the first fit wins, if none fit the last one is clamped; unset uses the default main-axis flip | `string` | — |
| `final-focus` | — | `string` | — |
| `focus-on-open` | Moves focus into the first focusable element of the panel when opened | `boolean` | — |
| `fresh` | Keep updating the content while closed (by default the content is frozen while closed and the latest value is written when opened; with fresh the closed state keeps writing) | `boolean` | — |
| `hide-empty` | — | `boolean` | — |
| `hide-when-detached` | Hide the panel when the anchor is fully detached from the viewport (the open state is kept, avoiding a panel floating off-screen) | `boolean` | — |
| `hover-delay` | Hover-trigger open debounce in ms (default 150; falls back to open-delay when unset) | `string` | — |
| `hover-hide-delay` | Hover-trigger close debounce in ms (default 100; falls back to close-delay when unset) | `string` | — |
| `initial-focus` | Focus the element matched by the selector when opened (host light DOM first, including slot content; falls back to focus-on-open when unresolvable), higher priority than focus-on-open | `string` | — |
| `modal` | Modal mode: full-screen backdrop + focus trap (Tab cycles inside the panel) + scroll lock + aria-modal; clicking the backdrop closes | `boolean` | — |
| `offset` | Dual-axis offset: `"main distance"` or `"main distance, cross offset"` in px (default 8, 0), e.g. `offset="12, 20"` | — | — |
| `open` | Controlled display (boolean attribute; shows when present) | `boolean` | — |
| `open-delay` | Generic open delay in ms (default 0; used by non-hover trigger paths, hover paths prefer hover-delay) | `string` | — |
| `placement` | Popup placement (12 directions: four bases top/bottom/left/right each with -start/-end cross-axis alignment) | `string` | `top` |
| `render-panel` | — | `boolean` | — |
| `scrollable` | — | `boolean` | — |
| `size` | — | `string` | `medium` |
| `sticky` | — | `string` | `partial` |
| `title` | Title text (rendered into the visible title region; absorbed from the host on read so no native hover tooltip remains; pass an empty string to clear); use slot="title" for rich content | `string` | — |
| `trap-focus` | — | `boolean` | — |
| `trigger` | Trigger method: `click` (default) / `hover` / `focus` / `contextmenu` / `manual`, space separated for multiple (e.g. `"click hover"`) | `string` | `click` |
| `trigger-keys` | Toggle open when the listed keys are pressed while the trigger is focused (space separated, e.g. `"Enter Space"`); no key binding when unset | `string` | `Enter Space` |
| `virtual` | Virtual trigger mode (same as tooltip; no anchor element) | `boolean` | — |
| `virtual-anchor` | Virtual anchor element selector (used when virtual-x/virtual-y are unset) | — | — |
| `virtual-x` | Virtual anchor x (viewport coordinate, px) | — | — |
| `virtual-y` | Virtual anchor y (viewport coordinate, px) | — | — |
| `width` | Panel width: a number (px) / `"trigger"` (same width as the trigger) / any CSS value (e.g. `50%`, `240px`); unset keeps the default | `string` | — |

### Events

| Event | Description |
| --- | --- |
| `oas-before-close` | — |
| `oas-open-change` | open state changed, `detail: { open }` |

### Slots

| Name | Description |
| --- | --- |
| default | — |
| `content` | — |
| `description` | — |
| `footer` | — |
| `header` | — |
| `title` | Rich title content slot, overrides the title attribute text when present |

Clicking the trigger toggles visibility; clicking outside or pressing Esc closes it; `role="dialog"`. Nested popovers: closing the parent cascades to children; `Esc` closes one layer at a time and restores focus to the trigger.
