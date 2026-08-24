# Tour

Step-by-step feature onboarding with a fullscreen overlay and target highlighting. Supports 12-direction placement with overflow flipping, scroll-following repositioning, mask/form customization, keyboard navigation, async steps, hints beacons and a "Don't show again" memory.

## Basic usage

<DemoBlock title="Start the tour">
  <oas-button type="primary" onclick="document.getElementById('tour-basic').setAttribute('open','')">Start tour</oas-button>
  <oas-tour id="tour-basic" steps='[{"selector":"#tour-b1","title":"Step 1","description":"This is the first highlighted area, located via selector."},{"selector":"#tour-b2","title":"Step 2","description":"Click Next or Finish to advance."}]'></oas-tour>
  <div id="tour-b1" style="margin-top: 12px; height: 60px; padding: 0 12px; white-space: nowrap; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center">Highlighted area 1</div>
  <div id="tour-b2" style="margin-top: 12px; height: 60px; padding: 0 12px; white-space: nowrap; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center">Highlighted area 2</div>
</DemoBlock>

## Tour events

`oas-step` carries `detail: { index, current, total, next, prev }`; closing events (cancel/finish/close/skip/destroy) carry `detail: { index, total }`.

<DemoBlock title="Step events">
  <oas-button type="primary" onclick="document.getElementById('tour-event').setAttribute('open','')">Start tour</oas-button>
  <oas-tour id="tour-event" onoas-step="tourLog(event)" onoas-finish="message.success('Tour complete')" onoas-cancel="message.info('Tour skipped')" onoas-skip="message.info('Skip clicked')" onoas-close="message.info('Close clicked')" steps='[{"selector":"#tour-e1","title":"Step 1","description":"Observe the step-change event output."},{"selector":"#tour-e2","title":"Step 2","description":"Click Finish to fire oas-finish; Esc / Skip fires oas-cancel."}]'></oas-tour>
  <oas-tag id="tour-result" type="info">Not started</oas-tag>
  <div id="tour-e1" style="margin-top: 12px; height: 60px; padding: 0 12px; white-space: nowrap; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center">Highlighted area 1</div>
  <div id="tour-e2" style="margin-top: 12px; height: 60px; padding: 0 12px; white-space: nowrap; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center">Highlighted area 2</div>
</DemoBlock>

## Controlled step and visibility

Both `open` and `current` are controlled attributes: an external button / JS sets `open` to start the tour, and sets `current` to jump directly to a given step (no need to click through).

<DemoBlock title="Controlled open / current">
  <oas-space>
    <oas-button type="primary" onclick="tourCtlOpen()">Start tour (set open)</oas-button>
    <oas-button onclick="tourCtlJump(1)">Jump to step 2 (current=1)</oas-button>
    <oas-button onclick="tourCtlJump(2)">Jump to step 3 (current=2)</oas-button>
    <oas-button onclick="tourCtlClose()">Finish (remove open)</oas-button>
  </oas-space>
  <oas-tour id="tour-ctrl" steps='[{"selector":"#tour-c1","title":"Step 1","description":"You can jump steps by setting current via an external button."},{"selector":"#tour-c2","title":"Step 2","description":"The current step highlight follows the attribute."},{"selector":"#tour-c3","title":"Step 3","description":"Remove open directly to end the tour."}]'></oas-tour>
  <div id="tour-c1" style="margin-top: 12px; height: 60px; padding: 0 12px; white-space: nowrap; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center">Controlled highlight area 1</div>
  <div id="tour-c2" style="margin-top: 12px; height: 60px; padding: 0 12px; white-space: nowrap; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center">Controlled highlight area 2</div>
  <div id="tour-c3" style="margin-top: 12px; height: 60px; padding: 0 12px; white-space: nowrap; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center">Controlled highlight area 3</div>
</DemoBlock>

## Placement and arrow

`placement` supports 12 directions (top/bottom/left/right × start/end/center) plus `center`; it auto-flips along the main axis when space is insufficient. `arrow="false"` hides the arrow.

<DemoBlock title="12 directions and auto-flip">
  <oas-space>
    <oas-button type="primary" onclick="document.getElementById('tour-pos').setAttribute('open','')">Right placement (placement=right)</oas-button>
    <oas-button onclick="document.getElementById('tour-pos-edge').setAttribute('open','')">Auto-flip at bottom</oas-button>
    <oas-button onclick="document.getElementById('tour-noarrow').setAttribute('open','')">No arrow (arrow=false)</oas-button>
  </oas-space>
  <oas-tour id="tour-pos" placement="right" steps='[{"selector":"#tour-p1","title":"Right placement","description":"placement=right, the popup is vertically centered on the right side of the target."},{"selector":"#tour-p2","title":"12 directions","description":"top/bottom/left/right × start/end/center are all supported."}]'></oas-tour>
  <oas-tour id="tour-pos-edge" steps='[{"selector":"#tour-p3","title":"Auto-flip at the bottom","description":"The target sits near the viewport bottom, so the popup flips above automatically."}]'></oas-tour>
  <oas-tour id="tour-noarrow" arrow="false" steps='[{"selector":"#tour-p1","title":"No arrow","description":"arrow=false hides the pointing arrow of the popup."}]'></oas-tour>
  <div id="tour-p1" style="margin-top: 12px; height: 60px; padding: 0 12px; white-space: nowrap; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center">Right placement target</div>
  <div id="tour-p2" style="margin-top: 12px; height: 60px; padding: 0 12px; white-space: nowrap; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center">Multi-direction target</div>
  <div id="tour-p3" style="position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); height: 56px; padding: 0 12px; white-space: nowrap; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center; background: var(--oas-color-bg)">Bottom target (viewport edge)</div>
</DemoBlock>

## Scroll to target and repositioning

When the target is off-screen the tour scrolls to it (`scroll-into-view-options` is passed through; `scroll-padding` sets the target's scroll-margin). During the tour the highlight and popup follow scroll/resize automatically (`auto-reposition`, enabled by default).

<DemoBlock title="Scroll to target and scroll-follow">
  <oas-button type="primary" onclick="document.getElementById('tour-scroll').setAttribute('open','')">Start tour (target below the fold)</oas-button>
  <oas-tour id="tour-scroll" scroll-into-view-options='{"behavior":"smooth","block":"center"}' scroll-padding="80" auto-reposition steps='[{"selector":"#tour-s1","title":"Scroll positioning","description":"The target is below the fold; it scrolls to the viewport center before highlighting."},{"selector":"#tour-s2","title":"Scroll follow","description":"Scroll the page during the tour; the highlight and popup reposition to follow."}]'></oas-tour>
  <div style="height: 900px"></div>
  <div id="tour-s1" style="margin-top: 12px; height: 60px; padding: 0 12px; white-space: nowrap; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center">Below-the-fold target 1 (scrolled to)</div>
  <div id="tour-s2" style="margin-top: 12px; height: 60px; padding: 0 12px; white-space: nowrap; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center">Below-the-fold target 2</div>
</DemoBlock>

## Overlay and form

`mask="false"` disables the overlay (non-modal; the rest of the page stays interactive during the tour); `mask='{"color":"..."}'` customizes the overlay color; `type="primary"` uses a primary-colored popup for emphasis; `gap` controls the highlight padding and radius (a number or `{padding, radius}`).

<DemoBlock title="Non-modal + primary popup">
  <oas-space>
    <oas-button type="primary" onclick="document.getElementById('tour-modal').setAttribute('open','')">Non-modal + primary popup</oas-button>
    <oas-button onclick="document.getElementById('tour-mask-color').setAttribute('open','')">Custom overlay color</oas-button>
  </oas-space>
  <oas-tour id="tour-modal" mask="false" type="primary" gap='{"padding":8,"radius":12}' arrow steps='[{"selector":"#tour-m1","title":"Non-modal tour","description":"No overlay; the primary popup emphasizes the step, and gap controls padding/radius."},{"selector":"#tour-m2","title":"Non-modal form","description":"The rest of the page stays interactive during the tour."}]'></oas-tour>
  <oas-tour id="tour-mask-color" mask='{"color":"rgba(18, 34, 51, 0.85)"}' steps='[{"selector":"#tour-m1","title":"Custom overlay color","description":"mask={\"color\":\"...\"} customizes the overlay color; everything else behaves like modal."}]'></oas-tour>
  <div id="tour-m1" style="margin-top: 12px; height: 60px; padding: 0 12px; white-space: nowrap; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center">Non-modal highlight 1</div>
  <div id="tour-m2" style="margin-top: 12px; height: 60px; padding: 0 12px; white-space: nowrap; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center">Non-modal highlight 2</div>
</DemoBlock>

## Keyboard navigation and indicators

`keyboard` (enabled by default) advances steps with ←/→; `show-bullets` renders clickable dot indicators; `show-progress` shows a top progress bar; `progress-text` is a template (placeholders `current`/`total`, each wrapped in double curly braces) for custom counter text; `indicators="number"` shows a numeric counter.

<DemoBlock title="Keyboard + dots + progress bar">
  <oas-space>
    <oas-button type="primary" onclick="tourKeyOpen()">Start tour (keyboard + dots + progress)</oas-button>
    <oas-button onclick="document.getElementById('tour-nokey').setAttribute('open','')">Disable keyboard navigation</oas-button>
  </oas-space>
  <oas-tour id="tour-key" keyboard show-bullets show-progress steps='[{"selector":"#tour-k1","title":"Keyboard navigable","description":"Press ← / → to advance; dots are clickable to jump."},{"selector":"#tour-k2","title":"Progress bar","description":"The top progress bar advances with the steps; the counter uses the template text."},{"selector":"#tour-k3","title":"Last step","description":"Press → to finish the tour."}]'></oas-tour>
  <oas-tour id="tour-nokey" keyboard="false" indicators="number" steps='[{"selector":"#tour-k1","title":"Keyboard disabled","description":"keyboard=false disables arrow-key navigation."}]'></oas-tour>
  <div id="tour-k1" style="margin-top: 12px; height: 60px; padding: 0 12px; white-space: nowrap; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center">Keyboard target 1</div>
  <div id="tour-k2" style="margin-top: 12px; height: 60px; padding: 0 12px; white-space: nowrap; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center">Keyboard target 2</div>
  <div id="tour-k3" style="margin-top: 12px; height: 60px; padding: 0 12px; white-space: nowrap; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center">Keyboard target 3</div>
</DemoBlock>

## Button visibility and pass-through props

`hide-prev` / `hide-skip` / `hide-next` / `hide-counter` control button/counter visibility; `*-button-props` (next/prev/skip/finish) pass arbitrary attributes to the buttons (JSON object).

<DemoBlock title="Button visibility and props">
  <oas-space>
    <oas-button type="primary" onclick="document.getElementById('tour-btn').setAttribute('open','')">Visibility + props</oas-button>
    <oas-button onclick="document.getElementById('tour-hide').setAttribute('open','')">Hide all actions</oas-button>
  </oas-space>
  <oas-tour id="tour-btn" hide-prev hide-skip next-button-props='{"data-demo":"1"}' prev-button-props='{"disabled":""}' skip-button-props='{"data-demo":"skip"}' finish-button-props='{"data-demo":"finish"}' steps='[{"selector":"#tour-bt1","title":"Button customization","description":"hide-prev / hide-skip hide buttons; next-button-props etc. pass through attributes."},{"selector":"#tour-bt2","title":"Finish props","description":"finish-button-props applies to the Finish button of the last step."}]'></oas-tour>
  <oas-tour id="tour-hide" hide-prev hide-skip hide-next hide-counter steps='[{"selector":"#tour-bt1","title":"No action buttons","description":"Leave via Esc / overlay click / keyboard navigation only."}]'></oas-tour>
  <div id="tour-bt1" style="margin-top: 12px; height: 60px; padding: 0 12px; white-space: nowrap; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center">Button customization target 1</div>
  <div id="tour-bt2" style="margin-top: 12px; height: 60px; padding: 0 12px; white-space: nowrap; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center">Button customization target 2</div>
</DemoBlock>

## Close button customization

`show-close="false"` hides the close button; `close-icon` replaces its content with arbitrary HTML.

<DemoBlock title="Close button customization">
  <oas-space>
    <oas-button type="primary" onclick="document.getElementById('tour-close').setAttribute('open','')">Custom close icon</oas-button>
    <oas-button onclick="document.getElementById('tour-noclose').setAttribute('open','')">No close button</oas-button>
  </oas-space>
  <oas-tour id="tour-close" show-close close-icon='<svg viewBox="0 0 12 12" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M2 2l8 8M10 2l-8 8"/></svg>' steps='[{"selector":"#tour-cl1","title":"Custom close icon","description":"close-icon accepts any HTML (including SVG) to replace the default ✕."}]'></oas-tour>
  <oas-tour id="tour-noclose" show-close="false" steps='[{"selector":"#tour-cl1","title":"No close button","description":"show-close=false hides the close button in the top-right corner."}]'></oas-tour>
  <div id="tour-cl1" style="margin-top: 12px; height: 60px; padding: 0 12px; white-space: nowrap; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center">Close button target</div>
</DemoBlock>

## Overlay click and highlight interaction

`mask-click-behavior`: `close` (default) / `next` (advance on overlay click) / `none` (ignore); `target-area-clickable` makes the highlight area interactive (clicks pass through); `disabled-interaction` blocks interaction with the highlighted area; `advance-on-click` advances when the highlight area is clicked ("try it here" interactive tours).

<DemoBlock title="Overlay click behavior + highlight interaction">
  <oas-space>
    <oas-button type="primary" onclick="document.getElementById('tour-masknext').setAttribute('open','')">Overlay click advances</oas-button>
    <oas-button onclick="document.getElementById('tour-masknone').setAttribute('open','')">Overlay click ignored</oas-button>
    <oas-button onclick="document.getElementById('tour-interact').setAttribute('open','')">Highlight interactive</oas-button>
    <oas-button onclick="document.getElementById('tour-disabled').setAttribute('open','')">Highlight blocked</oas-button>
    <oas-button onclick="document.getElementById('tour-adv').setAttribute('open','')">Click highlight to advance</oas-button>
  </oas-space>
  <oas-tour id="tour-masknext" mask-click-behavior="next" steps='[{"selector":"#tour-ai1","title":"Overlay click advances","description":"mask-click-behavior=next: click anywhere on the overlay to go to the next step."},{"selector":"#tour-ai2","title":"Step two","description":"Keep clicking the overlay or use the buttons."}]'></oas-tour>
  <oas-tour id="tour-masknone" mask-click-behavior="none" steps='[{"selector":"#tour-ai1","title":"Overlay click ignored","description":"mask-click-behavior=none: clicking the overlay does nothing."}]'></oas-tour>
  <oas-tour id="tour-interact" target-area-clickable steps='[{"selector":"#tour-ai1","title":"Highlight interactive","description":"target-area-clickable: buttons/links on the highlighted target stay clickable (the overlay does not intercept)."}]'></oas-tour>
  <oas-tour id="tour-disabled" disabled-interaction steps='[{"selector":"#tour-ai1","title":"Highlight blocked","description":"disabled-interaction: an interceptor covers the target, so it cannot be clicked."}]'></oas-tour>
  <oas-tour id="tour-adv" advance-on-click steps='[{"selector":"#tour-ai1","title":"Click me","description":"Click the highlighted area to go directly to the next step."},{"selector":"#tour-ai2","title":"One step further","description":"Interactive tour: click the highlight to advance."}]'></oas-tour>
  <div id="tour-ai1" style="margin-top: 12px; height: 60px; padding: 0 12px; white-space: nowrap; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center">Highlight interaction target 1</div>
  <div id="tour-ai2" style="margin-top: 12px; height: 60px; padding: 0 12px; white-space: nowrap; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center">Highlight interaction target 2</div>
</DemoBlock>

## Async steps

`wait-for-element` (ms) waits for the target to appear (e.g. "the previous step opened a dialog, wait for its inner element to render"); `skip-missing-element` skips the step when the target is missing / the wait times out.

<DemoBlock title="Wait for async targets and skip">
  <oas-space>
    <oas-button type="primary" onclick="tourAsync()">Wait for async target</oas-button>
    <oas-button onclick="document.getElementById('tour-skipmiss').setAttribute('open','')">Skip missing target</oas-button>
  </oas-space>
  <oas-tour id="tour-async" wait-for-element="500" steps='[{"selector":"#tour-wait","title":"Async target","description":"The target appears after a 400ms delay; the tour waits before highlighting."},{"selector":"#tour-a2","title":"Next step","description":"The tour continues once the target appears."}]'></oas-tour>
  <oas-tour id="tour-skipmiss" wait-for-element="300" skip-missing-element steps='[{"selector":"#tour-ghost","title":"Missing target","description":"The target does not exist; the step is skipped after 300ms."},{"selector":"#tour-a2","title":"After skipping","description":"skip-missing-element worked; we jumped here."}]'></oas-tour>
  <div id="tour-wait" style="margin-top: 12px; height: 60px; padding: 0 12px; white-space: nowrap; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: none; align-items: center; justify-content: center">Delayed target (visible after 400ms)</div>
  <div id="tour-a2" style="margin-top: 12px; height: 60px; padding: 0 12px; white-space: nowrap; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center">Regular target</div>
</DemoBlock>

## Dialog mode

`mode="dialog"` (or step-level `mode: "dialog"`) renders a centered dialog step without a target as a first-class step type.

<DemoBlock title="Dialog mode">
  <oas-button type="primary" onclick="document.getElementById('tour-dialog').setAttribute('open','')">Start tour</oas-button>
  <oas-tour id="tour-dialog" mode="dialog" steps='[{"title":"Welcome","description":"A centered dialog step without a target, good for overview explanations."},{"title":"Step two","description":"Continue the tour; popup and dialog steps can be mixed."}]'></oas-tour>
</DemoBlock>

## Lifecycle events

`oas-highlight-start` / `oas-highlight-end` fire when the step highlight starts/completes (after async waits resolve); `oas-destroy` fires when the tour closes (including external removal of `open`).

<DemoBlock title="Lifecycle events">
  <oas-button type="primary" onclick="document.getElementById('tour-life').setAttribute('open','')">Start tour</oas-button>
  <oas-tour id="tour-life" onoas-highlight-start="tourLife('start', event)" onoas-highlight-end="tourLife('end', event)" onoas-destroy="tourLife('destroy', event)" steps='[{"selector":"#tour-l1","title":"Highlight lifecycle","description":"Highlight start/complete events are logged here; useful for analytics and dynamic steps."},{"selector":"#tour-l2","title":"Close = destroy","description":"Closing the tour (close button / Esc / removing open) fires oas-destroy."}]'></oas-tour>
  <oas-tag id="tour-life-result" type="info">No events yet</oas-tag>
  <div id="tour-l1" style="margin-top: 12px; height: 60px; padding: 0 12px; white-space: nowrap; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center">Lifecycle target 1</div>
  <div id="tour-l2" style="margin-top: 12px; height: 60px; padding: 0 12px; white-space: nowrap; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center">Lifecycle target 2</div>
</DemoBlock>

## Don't show again and multi-page tours

With `dont-show-again`, checking "Don't show this again" on close remembers the choice via `storage-key`; the next start is blocked and `oas-dismiss` fires. `persist` persists open/current state so a remount after route changes resumes the tour (multi-page tours).

<DemoBlock title="Don't show again">
  <oas-space>
    <oas-button type="primary" onclick="tourDismissDemo()">Open tour (blocked once remembered)</oas-button>
    <oas-button onclick="tourClearDismiss()">Clear memory</oas-button>
  </oas-space>
  <oas-tour id="tour-dsa" dont-show-again storage-key="oas-tour-dsa-demo" onoas-dismiss="message.info('Remembered; not shown again')" steps='[{"selector":"#tour-d1","title":"Do not show again","description":"Check Do not show again and close; the next start is blocked."}]'></oas-tour>
  <div id="tour-d1" style="margin-top: 12px; height: 60px; padding: 0 12px; white-space: nowrap; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center">Memory target</div>
</DemoBlock>

<DemoBlock title="Multi-page tour (persist)">
  <oas-space>
    <oas-button type="primary" onclick="document.getElementById('tour-persist').setAttribute('open','')">Start tour</oas-button>
    <oas-button onclick="tourReload()">Simulate route change (remount)</oas-button>
  </oas-space>
  <oas-tour id="tour-persist" persist storage-key="oas-tour-persist-demo" steps='[{"selector":"#tour-ps1","title":"Multi-page tour","description":"State is persisted on open; a remount resumes the current step."},{"selector":"#tour-ps2","title":"Resume after switching","description":"Simulate a route change and come back; the tour stays on this step."}]'></oas-tour>
  <div id="tour-ps1" style="margin-top: 12px; height: 60px; padding: 0 12px; white-space: nowrap; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center">Multi-page target 1</div>
  <div id="tour-ps2" style="margin-top: 12px; height: 60px; padding: 0 12px; white-space: nowrap; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center">Multi-page target 2</div>
</DemoBlock>

## Typewriter and scroll lock

`typewriter` + `typewriter-speed` reveal the description character by character; `lock-scroll` locks page scrolling during the tour; `close-on-press-escape="false"` disables Esc.

<DemoBlock title="Typewriter animation + scroll lock">
  <oas-button type="primary" onclick="document.getElementById('tour-tw').setAttribute('open','')">Start tour</oas-button>
  <oas-tour id="tour-tw" typewriter typewriter-speed="30" lock-scroll close-on-press-escape steps='[{"selector":"#tour-t1","title":"Typewriter animation","description":"This description reveals itself character by character, for a marketing-page tour vibe.","cover":"https://picsum.photos/seed/oas-tour/320/120"},{"selector":"#tour-t2","title":"Scroll lock, no Esc","description":"lock-scroll locks page scrolling; with close-on-press-escape=false, Esc does not close."}]'></oas-tour>
  <div id="tour-t1" style="margin-top: 12px; height: 60px; padding: 0 12px; white-space: nowrap; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center">Typewriter target 1 (with cover image)</div>
  <div id="tour-t2" style="margin-top: 12px; height: 60px; padding: 0 12px; white-space: nowrap; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center">Typewriter target 2</div>
</DemoBlock>

## Hints beacon mode

`hints` renders persistent pulsing beacons (no `open` needed); clicking a beacon opens a bubble. Hints with `dismissable` + `id` are remembered in localStorage (`oas-tour-hint-${id}`) and hidden afterwards.

<DemoBlock title="Hints beacon mode">
  <oas-tour id="tour-hints" hints='[{"id":"hint-1","selector":"#tour-h1","title":"Pulse hint","description":"Click the beacon for details; it disappears after closing.","placement":"top","dismissable":true},{"id":"hint-2","selector":"#tour-h2","title":"Persistent hint","description":"This hint can be reopened any time; it is not remembered.","placement":"right"}]'></oas-tour>
  <div id="tour-h1" style="margin-top: 12px; height: 60px; padding: 0 12px; white-space: nowrap; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center">Beacon target 1 (dismissable)</div>
  <div id="tour-h2" style="margin-top: 12px; height: 60px; padding: 0 12px; white-space: nowrap; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center">Beacon target 2 (persistent)</div>
</DemoBlock>

## Mount point and z-index

`append-to="body"` (or a selector) mounts the whole overlay into the given container; `z-index` customizes the stacking level.

<DemoBlock title="Mount point and z-index">
  <oas-button type="primary" onclick="document.getElementById('tour-portal').setAttribute('open','')">append-to body + high z-index</oas-button>
  <oas-tour id="tour-portal" append-to="body" z-index="9999" steps='[{"selector":"#tour-pp1","title":"Mounted to body","description":"The overlay moves into a body portal container with z-index=9999 on top of everything."}]'></oas-tour>
  <div id="tour-pp1" style="margin-top: 12px; height: 60px; padding: 0 12px; white-space: nowrap; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center">Mount target</div>
</DemoBlock>

## Advanced customization (dual-axis gap / arrow aiming / no auto-reposition)

`gap` supports a dual-axis `offset` (`number` for all sides / `[horizontal, vertical]` array, orthogonal to `padding`); `arrow-point-at-center` keeps the arrow pointing at the target center after viewport avoidance shifts the popup; `auto-reposition="false"` disables overflow flipping and viewport avoidance (keeps the declared placement).

<DemoBlock title="Dual-axis gap + arrow at center + no auto-reposition">
  <oas-space>
    <oas-button type="primary" onclick="document.getElementById('tour-gap2').setAttribute('open','')">Dual-axis gap offset</oas-button>
    <oas-button onclick="document.getElementById('tour-center-arrow').setAttribute('open','')">Arrow at center</oas-button>
    <oas-button onclick="document.getElementById('tour-noflip').setAttribute('open','')">No auto-reposition</oas-button>
  </oas-space>
  <oas-tour id="tour-gap2" gap='{"offset":[16,24]}' steps='[{"selector":"#tour-g1","title":"Dual-axis gap","description":"offset:[16,24]: the highlight and mask hole expand 16px horizontally / 24px vertically."}]'></oas-tour>
  <oas-tour id="tour-center-arrow" arrow-point-at-center steps='[{"selector":"#tour-g2","title":"Arrow points to the center","description":"The target sits near the left edge; after viewport avoidance shifts the popup, the arrow still aims at the target center."}]'></oas-tour>
  <oas-tour id="tour-noflip" auto-reposition="false" steps='[{"selector":"#tour-g3","title":"No auto-reposition","description":"auto-reposition=false: the popup keeps its declared bottom placement (the overflowing part is off-viewport), for comparison with the default auto-flip."}]'></oas-tour>
  <div id="tour-g1" style="margin-top: 12px; height: 60px; padding: 0 12px; white-space: nowrap; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center">Dual-axis gap target</div>
  <div id="tour-g2" style="margin-top: 12px; margin-left: 24px; width: 120px; height: 60px; padding: 0 12px; white-space: nowrap; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center">Left-edge target</div>
  <div id="tour-g3" style="position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); height: 56px; padding: 0 12px; white-space: nowrap; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center; background: var(--oas-color-bg)">Bottom target (viewport edge)</div>
</DemoBlock>

## Custom indicators and actions (slots)

`slot="indicators"` replaces the built-in dots/number indicator (render with the `current`/`total` from the `oas-step` event); `slot="actions"` replaces the whole built-in button area with your own controls.

<DemoBlock title="Custom indicators and actions">
  <oas-button type="primary" onclick="document.getElementById('tour-slots').setAttribute('open','')">Start tour</oas-button>
  <oas-tour id="tour-slots" show-bullets onoas-step="tourSlotsSync(event)" steps='[{"selector":"#tour-sl1","title":"Custom indicators","description":"slot=indicators replaces the built-in dots/number indicator."},{"selector":"#tour-sl2","title":"Custom actions","description":"slot=actions replaces the whole button area; custom buttons control stepping."}]'>
    <span slot="indicators" class="tour-slots-ind">1 / 2</span>
    <div slot="actions" style="display: flex; gap: 8px; align-items: center">
      <oas-button size="small" onclick="tourSlotsGo(-1)">Previous</oas-button>
      <oas-button type="primary" size="small" onclick="tourSlotsGo(1)">Next</oas-button>
    </div>
  </oas-tour>
  <div id="tour-sl1" style="margin-top: 12px; height: 60px; padding: 0 12px; white-space: nowrap; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center">Custom slot target 1</div>
  <div id="tour-sl2" style="margin-top: 12px; height: 60px; padding: 0 12px; white-space: nowrap; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center">Custom slot target 2</div>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  const { message } = await import('@oas-ui/ui')
  window.message = message
  window.tourLog = (e) => {
    const tag = document.getElementById('tour-result')
    if (tag) tag.textContent = `Current step: ${e.detail.index + 1}`
  }
  window.tourCtlOpen = () => document.getElementById('tour-ctrl').setAttribute('open', '')
  window.tourCtlJump = (i) => document.getElementById('tour-ctrl').setAttribute('current', String(i))
  window.tourCtlClose = () => document.getElementById('tour-ctrl').removeAttribute('open')
  // progress-text contains {{current}} placeholders; set via setAttribute to avoid Vue interpolation
  window.tourKeyOpen = () => {
    document.getElementById('tour-key').setAttribute('progress-text', '{{current}}/{{total}} steps')
    document.getElementById('tour-key').setAttribute('open', '')
  }
  // Async step: reveal the target after 400ms
  window.tourAsync = () => {
    setTimeout(() => {
      const el = document.getElementById('tour-wait')
      if (el) el.style.display = 'flex'
    }, 400)
    document.getElementById('tour-async').setAttribute('open', '')
  }
  window.tourLife = (phase, e) => {
    const tag = document.getElementById('tour-life-result')
    if (tag) tag.textContent = `Event: ${phase} (step ${e.detail.index + 1})`
  }
  // "Don't show again": preset the memory to simulate a previous choice
  window.tourDismissDemo = () => {
    localStorage.setItem('oas-tour-dsa-demo', '1')
    document.getElementById('tour-dsa').setAttribute('open', '')
  }
  window.tourClearDismiss = () => {
    localStorage.removeItem('oas-tour-dsa-demo')
    message.success('Memory cleared; the tour can open again')
  }
  // Multi-page tour: simulate a route change (remove and remount; persist restores state)
  window.tourReload = () => {
    const host = document.getElementById('tour-persist')
    if (!host) return
    const parent = host.parentElement
    const steps = host.getAttribute('steps')
    host.remove()
    const el = document.createElement('oas-tour')
    el.id = 'tour-persist'
    el.setAttribute('persist', '')
    el.setAttribute('storage-key', 'oas-tour-persist-demo')
    el.setAttribute('steps', steps ?? '[]')
    parent?.appendChild(el)
  }
  // Custom slots: sync the indicator text with the step; custom action buttons control stepping
  window.tourSlotsGo = (d) => {
    const tour = document.getElementById('tour-slots')
    if (!tour) return
    const cur = Number(tour.getAttribute('current') ?? '0') + d
    tour.setAttribute('current', String(cur))
  }
  window.tourSlotsSync = (e) => {
    const tour = document.getElementById('tour-slots')
    if (!tour) return
    const ind = tour.querySelector('[slot="indicators"]')
    if (ind) ind.textContent = `${e.detail.current + 1} / ${e.detail.total}`
  }
})
</script>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `advance-on-click` | Click the highlighted area to advance to the next step (interactive tour) | `boolean` | — |
| `append-to` | Mount point: `body` or a CSS selector (moves the whole overlay into the target container) | `string` | — |
| `arrow` | Whether to show the arrow (boolean, default true; `false` hides) | `string` | `true` |
| `arrow-point-at-center` | Arrow points to the target center projection (stays accurate after viewport avoidance shifts the popup; by default the arrow sticks to the placement edge) | `boolean` | — |
| `auto-reposition` | Auto reposition on scroll/resize + overflow flip/viewport avoidance (default true; `false` keeps the declared placement without flipping or avoidance) | `string` | `true` |
| `close-icon` | Custom close button content (HTML string) | `string` | — |
| `close-on-press-escape` | Close on Esc (default true) | `string` | `true` |
| `current` | Current step index | `string` | `0` |
| `disabled-interaction` | Disable interaction on the highlighted area (interceptor covers target) | — | — |
| `dont-show-again` | Don't show again switch (boolean; if checked on close, remembered in localStorage) | `boolean` | — |
| `finish-button-props` | Props passed through to the finish button (JSON object) | — | — |
| `gap` | Highlight padding: number (padding px) or `{"padding","radius","offset"}`; `offset` expands the highlight outward (number for all sides / `[horizontal, vertical]` dual-axis, orthogonal to padding); default padding 4 | `string` | — |
| `hide-counter` | Hide the step counter | `boolean` | — |
| `hide-next` | Hide the next button | — | — |
| `hide-prev` | Hide the previous button | — | — |
| `hide-skip` | Hide the skip button | — | — |
| `hints` | Hints beacon mode: JSON `[{id,selector,title,description,placement,dismissable}]`; persistent pulsing beacons, click to open a bubble, `dismissable` is remembered after close | `string` | `[]` |
| `indicators` | Counter style: `dots` (default) / `number` / `none` | `string` | `dots` |
| `keyboard` | Keyboard ←/→ to advance steps (default true; `false` disables) | `string` | `true` |
| `lock-scroll` | Lock page scrolling during the tour (restored on close) | `boolean` | — |
| `mask` | Overlay switch/customization: `false` to disable (non-modal) or `{"color","style"}` to customize (default true); step-level override | `string` | `true` |
| `mask-click-behavior` | Overlay click behavior: `close` (default) / `next` (advance) / `none` (ignore) | `string` | `close` |
| `mode` | Popup mode: `popup` (default) / `dialog` (centered dialog without target); step-level override | `string` | `popup` |
| `next-button-props` | Props passed through to the next button (JSON object, e.g. `{"data-x":"1"}`) | — | — |
| `open` | Start the tour (boolean attribute; starts when present) | `boolean` | — |
| `persist` | Multi-page tour: open/current state persisted to localStorage and restored on reconnect | `boolean` | — |
| `placement` | Popup placement: 12 directions (top/bottom/left/right × start/end/center) + `center` (centered when no target); default `bottom`; auto-flips when space is insufficient; step-level override | `TourPlacement` | `bottom` |
| `prev-button-props` | Props passed through to the previous button (JSON object) | — | — |
| `progress-text` | Progress text template: `current`/`total` placeholders each wrapped in double curly braces; when set, the counter area uses the template | `string` | — |
| `scroll-into-view-options` | `scrollIntoView` options for scrolling to the target (JSON; default `{"behavior":"smooth","block":"center"}`) | `string` | — |
| `scroll-padding` | Padding when scrolling to the target (px; applied as target scroll-margin) | — | — |
| `show-bullets` | Dot indicators (click a dot to jump) | `boolean` | — |
| `show-close` | Show the close button (default true; `false` hides) | `string` | `true` |
| `show-progress` | Progress bar at the top of the popup (width advances with steps) | `boolean` | — |
| `skip-button-props` | Props passed through to the skip button (JSON object) | — | — |
| `skip-missing-element` | Skip the step when the target is missing / wait times out (default stays on the current step) | `boolean` | — |
| `steps` | Steps JSON (`TourStep[] \| string`); property assignment supports function/element targets | `TourStep[] \| string` | `[]` |
| `storage-key` | localStorage key (shared by `dont-show-again` / `persist` / hint dismiss) | `string` | `oas-tour-dismiss` |
| `target-area-clickable` | Highlight area is interactive (interceptor hidden, clicks pass through to target) | `string` | `true` |
| `type` | Popup type: `default` / `primary` (primary-colored popup for non-modal emphasis) | `string` | `default` |
| `typewriter` | Typewriter animation: description revealed character by character | `string` | `true` |
| `typewriter-speed` | Typewriter speed (ms per character, default 20) | `string` | `20` |
| `wait-for-element` | Wait for the target to appear (ms, async steps; global default, step-level `waitForElement` wins) | — | — |
| `z-index` | Overlay z-index (default `--oas-z-modal`) | — | — |

### Events

| Event | Description |
| --- | --- |
| `oas-cancel` | Skipped / Esc / overlay click, `detail: { index, total, source }` (source: skip/esc/close/mask) |
| `oas-close` | Close button clicked, `detail: { index, total }` |
| `oas-destroy` | Tour closed (including external removal of `open`), `detail: { index, total }` |
| `oas-dismiss` | Don't show again matched; tour start was blocked, `detail: {}` |
| `oas-finish` | Finish was clicked on the last step, `detail: { index, total }` |
| `oas-highlight-end` | Step highlight completed, `detail: { index, total }` |
| `oas-highlight-start` | Step highlight started (after async wait resolves), `detail: { index, total }` |
| `oas-skip` | Skip button clicked, `detail: { index, total }` |
| `oas-step` | Step changed, `detail: { index, current, total, next, prev }` |

### Slots

| Name | Description |
| --- | --- |
| `actions` | Custom action area (replaces the whole built-in button area; hides the built-in prev/skip/next buttons when present) |
| `cover` | Step cover rich content (slot takes precedence over the step.cover image) |
| `indicators` | Custom indicator area (render with the `oas-step` current/total; hides the built-in dots/number indicator when present) |

The overlay highlights the target, `role="dialog"` + `aria-modal="true"` (downgraded to `aria-modal="false"` in non-modal form when `mask="false"`); supports "Previous / Next / Skip", keyboard ←/→ and Esc.
