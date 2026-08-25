# Anchor

Tracks the current section on scroll and highlights it automatically; clicking an anchor smooth-scrolls to the target. Supports custom scroll containers, click landing offsets, multi-level nesting, horizontal direction, affix, a moving ink bar, style variants and history control.

## Basic usage

`scroll-container` points to a local scroll container (selector or element id): both the observation root and the click landing target use it; when unset the viewport is used.

<DemoBlock title="Scroll spy (scroll-container)">
  <div style="display: flex; gap: 16px; width: 100%; align-items: stretch">
    <oas-anchor style="width: 128px; flex-shrink: 0" scroll-container="#anchor-sc-1" items='[{"href":"#anchor-sec-1","title":"Chapter 1"},{"href":"#anchor-sec-2","title":"Chapter 2"},{"href":"#anchor-sec-3","title":"Chapter 3"}]'></oas-anchor>
    <div id="anchor-sc-1" style="flex: 1; height: 240px; overflow: auto; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-4)">
      <h4 id="anchor-sec-1" style="margin-top: 0">Chapter 1</h4>
      <p style="color: var(--oas-color-text-secondary)">Section 1 content: demonstrates scroll spy and highlight tracking.</p>
      <h4 id="anchor-sec-2">Chapter 2</h4>
      <p style="color: var(--oas-color-text-secondary)">When scrolled into view, the anchor highlights the current section.</p>
      <h4 id="anchor-sec-3">Chapter 3</h4>
      <p style="color: var(--oas-color-text-secondary)">Click an anchor to smooth-scroll to the corresponding section.</p>
    </div>
  </div>
</DemoBlock>

## Highlight offset and trigger boundary

`offset` controls the highlight detection line (how early a section's top crosses the line); `bounds` is an extra lead for the trigger boundary (default 5) to avoid highlight flicker.

<DemoBlock title="Highlight offset (offset / bounds)">
  <div style="display: flex; gap: 16px; width: 100%; align-items: stretch">
    <oas-anchor style="width: 128px; flex-shrink: 0" offset="80" scroll-container="#anchor-sc-2" items='[{"href":"#anchor-sec-4","title":"Chapter 1"},{"href":"#anchor-sec-5","title":"Chapter 2"}]'></oas-anchor>
    <div id="anchor-sc-2" style="flex: 1; height: 240px; overflow: auto; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-4)">
      <h4 id="anchor-sec-4" style="margin-top: 0">Chapter 1</h4>
      <p style="color: var(--oas-color-text-secondary)">offset controls the offset of the top highlight detection zone.</p>
      <h4 id="anchor-sec-5">Chapter 2</h4>
      <p style="color: var(--oas-color-text-secondary)">The highlight switches earlier when a section top crosses the offset line.</p>
    </div>
  </div>
</DemoBlock>

<DemoBlock title="Trigger boundary (bounds)">
  <div style="display: flex; gap: 16px; width: 100%; align-items: stretch">
    <oas-anchor style="width: 128px; flex-shrink: 0" bounds="40" scroll-container="#anchor-sc-3" items='[{"href":"#anchor-sec-b1","title":"Chapter 1"},{"href":"#anchor-sec-b2","title":"Chapter 2"}]'></oas-anchor>
    <div id="anchor-sc-3" style="flex: 1; height: 240px; overflow: auto; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-4)">
      <h4 id="anchor-sec-b1" style="margin-top: 0">Chapter 1</h4>
      <p style="color: var(--oas-color-text-secondary)">A larger bounds triggers the highlight switch earlier.</p>
      <h4 id="anchor-sec-b2">Chapter 2</h4>
      <p style="color: var(--oas-color-text-secondary)">Default is 5px; set to 40px here so the switch point difference is visible.</p>
    </div>
  </div>
</DemoBlock>

## Click events

`oas-click` and `oas-change` are separate: **clicking** an anchor fires `oas-click` (`detail: { href, item }`); both clicks and **scroll-driven** highlight changes fire `oas-change` (`detail: { href, prevHref }`) — listen to `oas-click` when you want to react to user actions only.

<DemoBlock title="Click events (oas-click / oas-change separation)">
  <div style="display: flex; gap: 16px; width: 100%; align-items: stretch">
    <oas-anchor style="width: 128px; flex-shrink: 0" onoas-click="anchorClickLog(event)" onoas-change="anchorLog(event)" scroll-container="#anchor-sc-4" items='[{"href":"#anchor-sec-6","title":"Chapter 1"},{"href":"#anchor-sec-7","title":"Chapter 2"}]'></oas-anchor>
    <div id="anchor-sc-4" style="flex: 1; height: 240px; overflow: auto; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-4)">
      <h4 id="anchor-sec-6" style="margin-top: 0">Chapter 1</h4>
      <p style="color: var(--oas-color-text-secondary)">Click a left anchor: only oas-click fires. Scroll this container to switch highlights: only oas-change fires.</p>
      <h4 id="anchor-sec-7">Chapter 2</h4>
      <p style="color: var(--oas-color-text-secondary)">oas-click carries the full item (href/title etc.).</p>
    </div>
  </div>
  <oas-tag id="anchor-result" type="info" style="margin-top: 8px">Nothing clicked</oas-tag>
  <oas-tag id="anchor-click-result" type="info" style="margin-top: 8px; margin-left: 8px">No oas-click yet</oas-tag>
</DemoBlock>

## Controlled highlight

`active` is a controlled attribute: an external set/remove of `active` directly controls the currently highlighted item (the scroll spy still takes over as you scroll).

<DemoBlock title="Controlled active">
  <oas-space>
    <oas-button onclick="anchorSetActive('#anchor-sec-c1')">Highlight Chapter 1</oas-button>
    <oas-button onclick="anchorSetActive('#anchor-sec-c2')">Highlight Chapter 2</oas-button>
    <oas-button onclick="anchorSetActive('#anchor-sec-c3')">Highlight Chapter 3</oas-button>
    <oas-button onclick="document.getElementById('anchor-ctrl').removeAttribute('active')">Clear highlight</oas-button>
  </oas-space>
  <div style="display: flex; gap: 16px; width: 100%; align-items: stretch; margin-top: 8px">
    <oas-anchor id="anchor-ctrl" style="width: 128px; flex-shrink: 0" scroll-container="#anchor-sc-ctrl" items='[{"href":"#anchor-sec-c1","title":"Chapter 1"},{"href":"#anchor-sec-c2","title":"Chapter 2"},{"href":"#anchor-sec-c3","title":"Chapter 3"}]'></oas-anchor>
    <div id="anchor-sc-ctrl" style="flex: 1; height: 240px; overflow: auto; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-4)">
      <h4 id="anchor-sec-c1" style="margin-top: 0">Chapter 1</h4>
      <p style="color: var(--oas-color-text-secondary)">Click a left button to set <code>active</code>; the anchor highlights the corresponding item immediately.</p>
      <h4 id="anchor-sec-c2">Chapter 2</h4>
      <p style="color: var(--oas-color-text-secondary)">When scrolling this container, the scroll spy takes over highlighting.</p>
      <h4 id="anchor-sec-c3">Chapter 3</h4>
      <p style="color: var(--oas-color-text-secondary)">"Clear highlight" removes <code>active</code>, restoring the no-highlight state.</p>
    </div>
  </div>
</DemoBlock>

## Click landing offset and alignment

`target-offset` controls the distance between the target and the container top after clicking (avoids fixed headers); it falls back to `offset` when unset. `block` controls the landing alignment (`start` / `center` / `end` / `nearest` — nearest does not scroll when the target is already fully visible, minimal scroll); `duration` controls the smooth scroll duration, while `animation="false"` or `duration="0"` jumps instantly.

<DemoBlock title="Click landing (target-offset / block / duration / animation)">
  <div style="display: flex; gap: 16px; width: 100%; align-items: stretch">
    <div style="width: 160px; flex-shrink: 0; position: relative">
      <div style="position: absolute; top: 80px; left: 0; right: 0; border-top: 2px dashed var(--oas-color-primary); opacity: 0.5; pointer-events: none"></div>
      <oas-anchor style="width: 160px" target-offset="80" duration="500" scroll-container="#anchor-sc-5" items='[{"href":"#anchor-sec-l1","title":"Chapter 1"},{"href":"#anchor-sec-l2","title":"Chapter 2"}]'></oas-anchor>
    </div>
    <div id="anchor-sc-5" style="flex: 1; height: 240px; overflow: auto; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-4)">
      <h4 id="anchor-sec-l1" style="margin-top: 0">Chapter 1</h4>
      <p style="color: var(--oas-color-text-secondary)">The dashed line marks the 80px landing line: after a click Chapter 1 aligns to it.</p>
      <h4 id="anchor-sec-l2">Chapter 2</h4>
      <p style="color: var(--oas-color-text-secondary)"><code>duration=500</code> smooth-scrolls over about 500ms.</p>
    </div>
  </div>
</DemoBlock>

<DemoBlock title="Landing alignment (block)">
  <div style="display: flex; gap: 16px; width: 100%; align-items: stretch">
    <oas-anchor style="width: 128px; flex-shrink: 0" block="center" scroll-container="#anchor-sc-6" items='[{"href":"#anchor-sec-m1","title":"Chapter 1"},{"href":"#anchor-sec-m2","title":"Chapter 2"}]'></oas-anchor>
    <div id="anchor-sc-6" style="flex: 1; height: 240px; overflow: auto; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-4)">
      <h4 id="anchor-sec-m1" style="margin-top: 0">Chapter 1</h4>
      <p style="color: var(--oas-color-text-secondary)">block="center": the target section is vertically centered in the container.</p>
      <h4 id="anchor-sec-m2">Chapter 2</h4>
      <p style="color: var(--oas-color-text-secondary)">Click me to see the centered landing.</p>
    </div>
  </div>
</DemoBlock>

<DemoBlock title="Minimal scroll landing (block=nearest)">
  <div style="display: flex; gap: 16px; width: 100%; align-items: stretch">
    <oas-anchor style="width: 128px; flex-shrink: 0" block="nearest" scroll-container="#anchor-sc-12" items='[{"href":"#anchor-sec-n1","title":"Chapter 1"},{"href":"#anchor-sec-n2","title":"Chapter 2"},{"href":"#anchor-sec-n3","title":"Chapter 3"}]'></oas-anchor>
    <div id="anchor-sc-12" style="flex: 1; height: 240px; overflow: auto; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-4)">
      <h4 id="anchor-sec-n1" style="margin-top: 0">Chapter 1</h4>
      <p style="color: var(--oas-color-text-secondary)">block="nearest": no scroll at all when the target is already fully visible.</p>
      <p style="color: var(--oas-color-text-secondary)">Click "Chapter 3" first to scroll to the bottom, then click "Chapter 1" — if Chapter 1 is already visible nothing scrolls (minimal scroll).</p>
      <h4 id="anchor-sec-n2" style="margin-top: var(--oas-space-4)">Chapter 2</h4>
      <p style="color: var(--oas-color-text-secondary)">A target below the container scrolls just enough for its bottom to appear.</p>
      <h4 id="anchor-sec-n3" style="margin-top: var(--oas-space-4)">Chapter 3</h4>
      <p style="color: var(--oas-color-text-secondary)">A target above the container scrolls just enough for its top to appear.</p>
    </div>
  </div>
</DemoBlock>

<DemoBlock title="Instant landing (animation)">
  <div style="display: flex; gap: 16px; width: 100%; align-items: stretch">
    <oas-anchor style="width: 128px; flex-shrink: 0" animation="false" scroll-container="#anchor-sc-7" items='[{"href":"#anchor-sec-i1","title":"Chapter 1"},{"href":"#anchor-sec-i2","title":"Chapter 2"}]'></oas-anchor>
    <div id="anchor-sc-7" style="flex: 1; height: 240px; overflow: auto; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-4)">
      <h4 id="anchor-sec-i1" style="margin-top: 0">Chapter 1</h4>
      <p style="color: var(--oas-color-text-secondary)">animation="false": clicking jumps to the target instantly, no smooth transition.</p>
      <h4 id="anchor-sec-i2">Chapter 2</h4>
      <p style="color: var(--oas-color-text-secondary)">Equivalent to duration="0".</p>
    </div>
  </div>
</DemoBlock>

## Nesting and target markers

`items` supports `children` for multi-level nesting (indented; child items take part in scroll highlighting). `<oas-anchor-target>` marks scroll targets component-style (its `id` is synced to the inner `part=target` element) instead of hand-writing heading ids. `internal-scrollable` makes the anchor list itself internally scrollable.

<DemoBlock title="Nesting (children / oas-anchor-target / internal-scrollable)">
  <div style="display: flex; gap: 16px; width: 100%; align-items: stretch">
    <oas-anchor internal-scrollable style="width: 160px; flex-shrink: 0; height: 280px" scroll-container="#anchor-sc-8" items='[{"href":"#anchor-nest-1","title":"Chapter 1","children":[{"href":"#anchor-nest-1-1","title":"1.1 Section"},{"href":"#anchor-nest-1-2","title":"1.2 Section"},{"href":"#anchor-nest-1-3","title":"1.3 Section"},{"href":"#anchor-nest-1-4","title":"1.4 Section"},{"href":"#anchor-nest-1-5","title":"1.5 Section"}]},{"href":"#anchor-nest-2","title":"Chapter 2"}]'></oas-anchor>
    <div id="anchor-sc-8" style="flex: 1; height: 280px; overflow: auto; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-4)">
      <oas-anchor-target id="anchor-nest-1"><h4 style="margin-top: 0">Chapter 1</h4></oas-anchor-target>
      <p style="color: var(--oas-color-text-secondary)">Headings wrapped by oas-anchor-target serve as scroll landing targets.</p>
      <oas-anchor-target id="anchor-nest-1-1"><h5 style="margin-top: var(--oas-space-4)">1.1 Section</h5></oas-anchor-target>
      <p style="color: var(--oas-color-text-secondary)">Child anchors are indented and take part in highlight detection.</p>
      <oas-anchor-target id="anchor-nest-1-2"><h5 style="margin-top: var(--oas-space-4)">1.2 Section</h5></oas-anchor-target>
      <p style="color: var(--oas-color-text-secondary)">Child anchors are indented and take part in highlight detection.</p>
      <oas-anchor-target id="anchor-nest-1-3"><h5 style="margin-top: var(--oas-space-4)">1.3 Section</h5></oas-anchor-target>
      <p style="color: var(--oas-color-text-secondary)">Child anchors are indented and take part in highlight detection.</p>
      <oas-anchor-target id="anchor-nest-1-4"><h5 style="margin-top: var(--oas-space-4)">1.4 Section</h5></oas-anchor-target>
      <p style="color: var(--oas-color-text-secondary)">Child anchors are indented and take part in highlight detection.</p>
      <oas-anchor-target id="anchor-nest-1-5"><h5 style="margin-top: var(--oas-space-4)">1.5 Section</h5></oas-anchor-target>
      <p style="color: var(--oas-color-text-secondary)">Child anchors are indented and take part in highlight detection.</p>
      <oas-anchor-target id="anchor-nest-2"><h4 style="margin-top: var(--oas-space-4)">Chapter 2</h4></oas-anchor-target>
      <p style="color: var(--oas-color-text-secondary)">internal-scrollable: the anchor list scrolls internally when it overflows.</p>
    </div>
  </div>
</DemoBlock>

## Horizontal direction

<DemoBlock title="Horizontal (direction=horizontal)">
  <div style="display: flex; gap: 16px; width: 100%; align-items: stretch">
    <oas-anchor direction="horizontal" scroll-container="#anchor-sc-9" style="width: 200px; flex-shrink: 0" items='[{"href":"#anchor-sec-h1","title":"Chapter 1"},{"href":"#anchor-sec-h2","title":"Chapter 2"},{"href":"#anchor-sec-h3","title":"Chapter 3"}]'></oas-anchor>
    <div id="anchor-sc-9" style="flex: 1; height: 240px; overflow: auto; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-4)">
      <h4 id="anchor-sec-h1" style="margin-top: 0">Chapter 1</h4>
      <p style="color: var(--oas-color-text-secondary)">In horizontal mode the items are laid out in a row and the ink bar slides horizontally.</p>
      <h4 id="anchor-sec-h2">Chapter 2</h4>
      <p style="color: var(--oas-color-text-secondary)">Scroll the container to observe highlight switching.</p>
      <h4 id="anchor-sec-h3">Chapter 3</h4>
      <p style="color: var(--oas-color-text-secondary)">Clicking an anchor still lands on the section.</p>
    </div>
  </div>
</DemoBlock>

## Affix

`affix` pins the anchor bar while scrolling (sticky positioning); `affix-offset` is the distance from the viewport top when affixed. This demo watches the viewport scroll.

<DemoBlock title="Affix (affix / affix-offset)">
  <div style="display: flex; gap: 16px; width: 100%; align-items: flex-start">
    <oas-anchor affix affix-offset="16" style="width: 128px; flex-shrink: 0; align-self: flex-start" items='[{"href":"#anchor-affix-1","title":"Chapter 1"},{"href":"#anchor-affix-2","title":"Chapter 2"},{"href":"#anchor-affix-3","title":"Chapter 3"}]'></oas-anchor>
    <div style="flex: 1; min-width: 0">
      <h4 id="anchor-affix-1" style="margin-top: 0">Chapter 1</h4>
      <p style="color: var(--oas-color-text-secondary)">Scroll the page down: the left anchor bar sticks 16px below the viewport top.</p>
      <h4 id="anchor-affix-2" style="margin-top: var(--oas-space-6)">Chapter 2</h4>
      <p style="color: var(--oas-color-text-secondary)">The highlight follows the current section as the page scrolls.</p>
      <h4 id="anchor-affix-3" style="margin-top: var(--oas-space-6)">Chapter 3</h4>
      <p style="color: var(--oas-color-text-secondary)">Pair affix-offset with a fixed page header to clear it.</p>
    </div>
  </div>
</DemoBlock>

## Style variants and sizes

<DemoBlock title="Style variants and sizes (variant / size)">
  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 24px; width: 100%">
    <div>
      <p style="margin: 0 0 8px; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-xs)">default</p>
      <oas-anchor variant="default" active="#anchor-v-1" items='[{"href":"#anchor-v-1","title":"Chapter 1"},{"href":"#anchor-v-2","title":"Chapter 2"},{"href":"#anchor-v-3","title":"Chapter 3"}]'></oas-anchor>
    </div>
    <div>
      <p style="margin: 0 0 8px; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-xs)">underline</p>
      <oas-anchor variant="underline" active="#anchor-v-1" items='[{"href":"#anchor-v-1","title":"Chapter 1"},{"href":"#anchor-v-2","title":"Chapter 2"},{"href":"#anchor-v-3","title":"Chapter 3"}]'></oas-anchor>
    </div>
    <div>
      <p style="margin: 0 0 8px; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-xs)">lineless</p>
      <oas-anchor variant="lineless" active="#anchor-v-2" items='[{"href":"#anchor-v-1","title":"Chapter 1"},{"href":"#anchor-v-2","title":"Chapter 2"},{"href":"#anchor-v-3","title":"Chapter 3"}]'></oas-anchor>
    </div>
    <div>
      <p style="margin: 0 0 8px; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-xs)">block</p>
      <oas-anchor variant="block" active="#anchor-v-3" items='[{"href":"#anchor-v-1","title":"Chapter 1"},{"href":"#anchor-v-2","title":"Chapter 2"},{"href":"#anchor-v-3","title":"Chapter 3"}]'></oas-anchor>
    </div>
    <div>
      <p style="margin: 0 0 8px; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-xs)">size=small</p>
      <oas-anchor size="small" active="#anchor-v-1" items='[{"href":"#anchor-v-1","title":"Chapter 1"},{"href":"#anchor-v-2","title":"Chapter 2"},{"href":"#anchor-v-3","title":"Chapter 3"}]'></oas-anchor>
    </div>
    <div>
      <p style="margin: 0 0 8px; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-xs)">size=large</p>
      <oas-anchor size="large" active="#anchor-v-2" items='[{"href":"#anchor-v-1","title":"Chapter 1"},{"href":"#anchor-v-2","title":"Chapter 2"},{"href":"#anchor-v-3","title":"Chapter 3"}]'></oas-anchor>
    </div>
  </div>
</DemoBlock>

## History control

Clicking an anchor updates the URL hash by default (`history.pushState`); `replace` switches to `replaceState`; `hash="false"` writes nothing.

<DemoBlock title="History control (hash / replace)">
  <div style="display: flex; gap: 16px; width: 100%; align-items: stretch">
    <oas-anchor style="width: 128px; flex-shrink: 0" onoas-change="anchorLogHistory(event)" scroll-container="#anchor-sc-10" items='[{"href":"#anchor-sec-his1","title":"Chapter 1"},{"href":"#anchor-sec-his2","title":"Chapter 2"}]'></oas-anchor>
    <oas-anchor style="width: 128px; flex-shrink: 0" replace scroll-container="#anchor-sc-10" items='[{"href":"#anchor-sec-his1","title":"Chapter 1"},{"href":"#anchor-sec-his2","title":"Chapter 2"}]'></oas-anchor>
    <oas-anchor style="width: 128px; flex-shrink: 0" hash="false" scroll-container="#anchor-sc-10" items='[{"href":"#anchor-sec-his1","title":"Chapter 1"},{"href":"#anchor-sec-his2","title":"Chapter 2"}]'></oas-anchor>
    <div id="anchor-sc-10" style="flex: 1; height: 240px; overflow: auto; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-4)">
      <h4 id="anchor-sec-his1" style="margin-top: 0">Chapter 1</h4>
      <p style="color: var(--oas-color-text-secondary)">Three anchors watch the same container: default pushState, replace via replaceState, and hash=false writes nothing.</p>
      <h4 id="anchor-sec-his2">Chapter 2</h4>
      <p style="color: var(--oas-color-text-secondary)">Click the first column's anchors to watch the URL hash change.</p>
    </div>
  </div>
  <oas-tag id="anchor-history-result" type="info" style="margin-top: 8px">Nothing clicked</oas-tag>
</DemoBlock>

## Custom highlight

`get-current-anchor` names a global function that receives the scroll-computed candidate href and returns the href to actually highlight; framework users can also pass a function via the `getCurrentAnchor` property.

<DemoBlock title="Custom highlight (get-current-anchor)">
  <div style="display: flex; gap: 16px; width: 100%; align-items: stretch">
    <oas-anchor style="width: 128px; flex-shrink: 0" get-current-anchor="anchorForceThird" onoas-change="anchorLogCustom(event)" scroll-container="#anchor-sc-11" items='[{"href":"#anchor-sec-g1","title":"Chapter 1"},{"href":"#anchor-sec-g2","title":"Chapter 2"},{"href":"#anchor-sec-g3","title":"Chapter 3"}]'></oas-anchor>
    <div id="anchor-sc-11" style="flex: 1; height: 240px; overflow: auto; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-4)">
      <h4 id="anchor-sec-g1" style="margin-top: 0">Chapter 1</h4>
      <p style="color: var(--oas-color-text-secondary)">No matter where you scroll, the custom strategy forces Chapter 3 to be highlighted.</p>
      <h4 id="anchor-sec-g2">Chapter 2</h4>
      <p style="color: var(--oas-color-text-secondary)">The event detail.href also comes from the custom strategy.</p>
      <h4 id="anchor-sec-g3">Chapter 3</h4>
      <p style="color: var(--oas-color-text-secondary)">The actually highlighted item.</p>
    </div>
  </div>
  <oas-tag id="anchor-custom-result" type="info" style="margin-top: 8px">Not scrolled yet</oas-tag>
</DemoBlock>

## External links

Setting `target` (e.g. `_blank`) on an item leaves the default behavior to the browser (with `rel="noopener noreferrer"` added automatically) and excludes it from scrolling/highlighting.

<DemoBlock title="External links (item target)">
  <oas-anchor items='[{"href":"https://example.com","title":"External docs","target":"_blank"},{"href":"https://example.com/faq","title":"External FAQ","target":"_blank"}]'></oas-anchor>
</DemoBlock>

## Declarative child channel

Besides the `items` JSON, you can write items declaratively with `<oas-anchor-item>` (the `items` attribute **wins when explicitly set**). The default slot text is the title; attributes map to the `AnchorItem` fields: `href`/`target`/`target-offset`; direct child `<oas-anchor-item>` elements recurse into `children` multi-level nesting (indented, and they participate in scroll highlighting too). Child additions/removals, attribute and text changes re-render automatically.

<DemoBlock title="Child channel basic">
  <div style="display: flex; gap: 16px; width: 100%; align-items: stretch">
    <oas-anchor style="width: 160px; flex-shrink: 0" scroll-container="#anchor-sc-child">
      <oas-anchor-item href="#anchor-child-1">Chapter 1</oas-anchor-item>
      <oas-anchor-item href="#anchor-child-2">Chapter 2</oas-anchor-item>
    </oas-anchor>
    <div id="anchor-sc-child" style="flex: 1; height: 240px; overflow: auto; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-4)">
      <oas-anchor-target id="anchor-child-1"><h4 style="margin-top: 0">Chapter 1</h4></oas-anchor-target>
      <p style="color: var(--oas-color-text-secondary)">Write anchor items declaratively with oas-anchor-item; scroll highlighting behaves the same as the items channel.</p>
      <oas-anchor-target id="anchor-child-2"><h4 style="margin-top: var(--oas-space-4)">Chapter 2</h4></oas-anchor-target>
      <p style="color: var(--oas-color-text-secondary)">Clicking an anchor scrolls smoothly to the target section.</p>
    </div>
  </div>
</DemoBlock>

<DemoBlock title="Nesting and attributes (children / target-offset)">
  <div style="display: flex; gap: 16px; width: 100%; align-items: stretch">
    <oas-anchor style="width: 160px; flex-shrink: 0" target-offset="80" scroll-container="#anchor-sc-child2">
      <oas-anchor-item href="#anchor-child2-1">Chapter 1
        <oas-anchor-item href="#anchor-child2-1-1">1.1 Sub-section</oas-anchor-item>
        <oas-anchor-item href="#anchor-child2-1-2">1.2 Sub-section</oas-anchor-item>
      </oas-anchor-item>
      <oas-anchor-item href="#anchor-child2-2" target-offset="40">Chapter 2</oas-anchor-item>
    </oas-anchor>
    <div id="anchor-sc-child2" style="flex: 1; height: 240px; overflow: auto; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-4)">
      <oas-anchor-target id="anchor-child2-1"><h4 style="margin-top: 0">Chapter 1</h4></oas-anchor-target>
      <oas-anchor-target id="anchor-child2-1-1"><h5 style="margin-top: var(--oas-space-4)">1.1 Sub-section</h5></oas-anchor-target>
      <oas-anchor-target id="anchor-child2-1-2"><h5 style="margin-top: var(--oas-space-4)">1.2 Sub-section</h5></oas-anchor-target>
      <oas-anchor-target id="anchor-child2-2"><h4 style="margin-top: var(--oas-space-4)">Chapter 2</h4></oas-anchor-target>
      <p style="color: var(--oas-color-text-secondary)">A per-item `target-offset` overrides the global landing offset; child items also participate in scroll highlighting.</p>
      <p style="color: var(--oas-color-text-secondary)">Scroll to the bottom of this section and watch the left-side highlight follow.</p>
      <p style="color: var(--oas-color-text-secondary)">Click "Chapter 2" on the left to smooth-scroll to this section.</p>
      <p style="color: var(--oas-color-text-secondary)">Extra content to make the container overflow and scroll.</p>
      <p style="color: var(--oas-color-text-secondary)">One more paragraph to ensure scrollability.</p>
    </div>
  </div>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  window.anchorLog = (e) => {
    const tag = document.getElementById('anchor-result')
    if (tag) tag.textContent = `Located: ${e.detail.href} (previous ${e.detail.prevHref || 'none'})`
  }
  window.anchorClickLog = (e) => {
    const tag = document.getElementById('anchor-click-result')
    if (tag) tag.textContent = `oas-click: ${e.detail.href} (${e.detail.item.title})`
  }
  window.anchorSetActive = (href) => document.getElementById('anchor-ctrl').setAttribute('active', href)
  window.anchorLogHistory = (e) => {
    const tag = document.getElementById('anchor-history-result')
    if (tag) tag.textContent = `Located: ${e.detail.href}, URL hash: ${location.hash || 'none'}`
  }
  window.anchorLogCustom = (e) => {
    const tag = document.getElementById('anchor-custom-result')
    if (tag) tag.textContent = `Highlighted: ${e.detail.href} (custom strategy)`
  }
  window.anchorForceThird = () => '#anchor-sec-g3'
})
</script>

## API

### oas-anchor

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `active` | Currently highlighted href (controlled: external set/remove takes effect immediately; the scroll spy writes it back) | `string` | — |
| `affix` | Enable affix (sticky positioning, sticks to the scroll viewport/container) | `boolean` | — |
| `affix-offset` | Distance from the scroll viewport top when affixed (px) | `string` | `0` |
| `animation` | Smooth scroll switch (default true; `false` jumps instantly) | `string` | `true` |
| `block` | Scroll landing alignment: `start` / `center` / `end` / `nearest` (does not scroll when the target is already fully visible — minimal scroll; aligns to top when above, to bottom when below) | `ScrollBlock` | `start` |
| `bounds` | Trigger boundary (px, default 5): extra lead for a section's top crossing the detection line, avoids highlight flicker | `string` | `5` |
| `direction` | Layout direction: `vertical` / `horizontal` | `string` | `vertical` |
| `duration` | Smooth scroll duration in ms (default 300; `0` jumps instantly) | `string` | `300` |
| `get-current-anchor` | Custom highlight strategy: attribute names a global function that receives the computed candidate href and returns the actual href to highlight; the `getCurrentAnchor` property also accepts a function | `((activeHref: string) => string) \| null` | — |
| `hash` | Whether clicking updates the URL hash (default true; `false` disables) | `string` | `true` |
| `internal-scrollable` | Make the anchor list itself internally scrollable (max-height + overflow-y: auto) | `boolean` | — |
| `items` | Anchor items JSON; items support `children` (multi-level nesting), `target` (e.g. `_blank`) and per-item `targetOffset` | `AnchorItem[] \| string` | `[]` |
| `offset` | Highlight detection offset in px: how early a section's top crosses the detection line | `string` | `0` |
| `replace` | History control: use `history.replaceState` instead of pushState | `boolean` | — |
| `scroll-container` | Scroll container selector or element id; when unset the viewport (window) is used | `HTMLElement \| string \| null` | — |
| `size` | Size: `small` / `medium` / `large` | `string` | `medium` |
| `target-offset` | Click landing offset in px (avoids fixed headers); falls back to `offset` when unset; per-item `targetOffset` wins | `string` | — |
| `variant` | Style variant: `default` (rail + moving ink) / `underline` (sliding underline) / `lineless` (no axis) / `block` (filled background) | `string` | `default` |

| Event | Description |
| --- | --- |
| `oas-change` | Fired on highlight change (both click and scroll-driven), `detail: { href, prevHref }` |
| `oas-click` | Fired when a user clicks an anchor item (separate from the scroll-driven `oas-change`, so hosts can react to user actions only; also fires for external-link `target` items), `detail: { href, item }` |

### oas-anchor-target

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `id` | Target marker id: synced to the inner `part=target` element, used by anchor items as the scroll landing target | — | — |

| Name | Description |
| --- | --- |
| default | The marked target content (e.g. multi-level headings) |

### oas-anchor-item

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `href` | Anchor target: `#id` (or an external URL; combine with `target` for external links) | — | — |
| `target` | Link target (e.g. `_blank`): when set, the default browser behavior is not intercepted (`rel="noopener noreferrer"` is added automatically) | — | — |
| `target-offset` | Per-item click landing offset (px), overriding the global `target-offset`; invalid values are ignored | — | — |

| Name | Description |
| --- | --- |
| default | Anchor item title content (default slot text; direct `oas-anchor-item` children are excluded) |

Scroll spy based on the scroll container (viewport by default); clicking smooth-scrolls to the target; `nav` + `aria-label="Anchor navigation"`, the current item has `aria-current="true"`.

A target marker component: wraps real multi-level headings and serves as the scroll landing target for anchor items; the default slot carries the marked content.
