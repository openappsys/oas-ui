# NavigationMenu

A website-style multi-level navigation bar: top-level triggers open a unified viewport panel (mega-panel multi-column link cards) on hover/click, with delayed open/close, a controlled open value, and full keyboard navigation. Leaf items with `href` render as links.

## Basic usage (mega panel)

<DemoBlock title="Basic usage">
  <oas-navigation-menu keep-mounted id="nav-basic" onoas-select="navLog(event)" onoas-change="navChange(event)" items='[{"label":"Products","value":"products","children":[{"label":"Components","value":"components","href":"/components","icon":"grid","description":"30+ ready-to-use components"},{"label":"Docs","value":"docs","href":"/docs","icon":"book","description":"Full API docs and guides"},{"label":"More","value":"more","children":[{"label":"Blog","value":"blog","href":"/blog"},{"label":"Community","value":"community","href":"/community"}]}]},{"label":"Pricing","value":"pricing","href":"/pricing"},{"label":"About","value":"about","href":"/about"}]'></oas-navigation-menu>
  <oas-tag id="nav-result" type="info">Nothing selected</oas-tag>
</DemoBlock>

## Controlled open (value + oas-change)

<DemoBlock title="Controlled open">
  <oas-button-group>
    <oas-button id="nav-open-a" size="small">Open Products</oas-button>
    <oas-button id="nav-open-b" size="small">Open Resources</oas-button>
    <oas-button id="nav-close" size="small">Close</oas-button>
  </oas-button-group>
  <br />
  <oas-navigation-menu id="nav-controlled" value="products" onoas-change="navControlled(event)" items='[{"label":"Products","value":"products","children":[{"label":"Components","value":"components","href":"/components","icon":"grid","description":"30+ ready-to-use components"},{"label":"Docs","value":"docs","href":"/docs","icon":"book","description":"Full API docs and guides"}]},{"label":"Resources","value":"resources","children":[{"label":"Themes","value":"themes","href":"/themes","icon":"star","description":"Theming and tokens"},{"label":"Guide","value":"guide","href":"/guide","icon":"mail","description":"Getting started and best practices"}]},{"label":"Pricing","value":"pricing","href":"/pricing"}]'></oas-navigation-menu>
  <oas-tag id="nav-controlled-result" type="info">Currently open: products</oas-tag>
</DemoBlock>

## Delayed open/close

<DemoBlock title="Delayed open/close">
  <oas-navigation-menu delay-duration="300" skip-delay-duration="500" items='[{"label":"Products","value":"products","children":[{"label":"Components","value":"components","href":"/components","description":"30+ components"},{"label":"Docs","value":"docs","href":"/docs","description":"API docs"}]},{"label":"Resources","value":"resources","children":[{"label":"Themes","value":"themes","href":"/themes","description":"Theming"},{"label":"Guide","value":"guide","href":"/guide","description":"Getting started"}]}]'></oas-navigation-menu>
</DemoBlock>

## Vertical orientation

<DemoBlock title="Vertical">
  <oas-navigation-menu orientation="vertical" items='[{"label":"Products","value":"products","children":[{"label":"Components","value":"components","href":"/components","icon":"grid","description":"30+ components"},{"label":"Docs","value":"docs","href":"/docs","icon":"book","description":"API docs"}]},{"label":"Pricing","value":"pricing","href":"/pricing"},{"label":"About","value":"about","href":"/about"}]'></oas-navigation-menu>
</DemoBlock>

## Multi-column grid

<DemoBlock title="Multi-column grid (columns=3)">
  <oas-navigation-menu columns="3" items='[{"label":"Products","value":"products","children":[{"label":"Components","value":"components","href":"/components","icon":"grid","description":"30+ components"},{"label":"Docs","value":"docs","href":"/docs","icon":"book","description":"API docs"},{"label":"Themes","value":"themes","href":"/themes","icon":"star","description":"Theming"},{"label":"Guide","value":"guide","href":"/guide","icon":"mail","description":"Getting started"},{"label":"Blog","value":"blog","href":"/blog","icon":"edit","description":"Tech blog"},{"label":"Community","value":"community","href":"/community","icon":"user","description":"User community"}]}]'></oas-navigation-menu>
</DemoBlock>

## Backdrop + keep-mounted + arrow

<DemoBlock title="Backdrop + keep-mounted + arrow">
  <oas-navigation-menu backdrop keep-mounted arrow items='[{"label":"Products","value":"products","children":[{"label":"Components","value":"components","href":"/components","icon":"grid","description":"30+ components"},{"label":"Docs","value":"docs","href":"/docs","icon":"book","description":"API docs"}]}]'></oas-navigation-menu>
  <p class="demo-tip">backdrop shows an overlay when open; keep-mounted keeps the panel DOM after closing; arrow shows the pointer arrow.</p>
</DemoBlock>

## Disabled items

<DemoBlock title="Disabled items">
  <oas-navigation-menu items='[{"label":"Home","value":"home","href":"/"},{"label":"Products","value":"products","children":[{"label":"Components","value":"components","href":"/components"},{"label":"Docs","value":"docs","href":"/docs","disabled":true}]}]'></oas-navigation-menu>
</DemoBlock>

## Arrow follows the trigger

By default the popup arrow doesn't point at any trigger; once the panel opens, JS writes the arrow position from the current trigger's offset/width, and the arrow follows when you switch triggers.

<DemoBlock title="Arrow follows the trigger">
  <oas-navigation-menu id="nav-arrow" delay-duration="0" items='[{"label":"Products","value":"products","children":[{"label":"Components","value":"components","href":"/components"},{"label":"Docs","value":"docs","href":"/docs"}]},{"label":"Resources","value":"resources","children":[{"label":"Themes","value":"themes","href":"/themes"},{"label":"Guide","value":"guide","href":"/guide"}]},{"label":"Pricing","value":"pricing","href":"/pricing"}]'></oas-navigation-menu>
  <p class="demo-tip">Hover/click "Products" then "Resources": the arrow follows the open trigger.</p>
</DemoBlock>

## Collision flip in narrow viewports

When the panel is wider than the remaining viewport, collisions are handled automatically: right-edge overflow switches to right-alignment (never leaves the viewport), bottom overflow flips up; with enough space it stays in its normal position.

<DemoBlock title="Narrow container collision flip">
  <div style="width: 260px">
    <oas-navigation-menu id="nav-flip" delay-duration="0" loop="false" items='[{"label":"Products","value":"products","children":[{"label":"Components","value":"components","href":"/components","description":"30+ ready-to-use components"},{"label":"Design system","value":"design","href":"/design","description":"Visual language and tokens"},{"label":"Theming","value":"theming","href":"/theming","description":"Three-layer token architecture"}]}]'></oas-navigation-menu>
  </div>
  <p class="demo-tip">Container is 260px: when there's no room on the right, the panel right-aligns and stays fully inside the container/viewport.</p>
</DemoBlock>

## Sub second-level cascade

A panel item with a `sub` field (second-level nav data) renders a "sub trigger"; clicking opens an overlay second-level panel inside the panel (slide-in cascade animation): `Esc` / `←` steps back to the main panel (focus returns to the trigger), another `Esc` closes the whole panel; `↓` moves between the second-level links (skipping disabled ones), `Enter` selects. Coexists with the inline section folding (`sub` takes precedence over `children`).

<DemoBlock title="Sub second-level cascade">
  <oas-navigation-menu id="nav-sub" delay-duration="0" onoas-select="navSubLog(event)" items='[{"label":"Products","value":"products","children":[{"label":"Components","value":"components","href":"/components","icon":"grid","description":"30+ ready-to-use components"},{"label":"Learn","value":"learn","sub":[{"label":"Docs","value":"docs","href":"/docs"},{"label":"Tutorials","value":"tutorial","href":"/tutorial"},{"label":"Community","value":"community","href":"/community"},{"label":"Showcase","value":"showcase","href":"/showcase"}]}]},{"label":"Pricing","value":"pricing","href":"/pricing"}]'></oas-navigation-menu>
  <oas-tag id="nav-sub-result" type="info">Click "Learn" to expand the second-level nav inside the panel</oas-tag>
</DemoBlock>

## Marketing slot (panel-footer)

`slot="panel-footer"` renders a footer container at the bottom of the panel (CTA cards etc.) — only when it has content; it opens together with the panel, and the `--vp-h` height transition includes it.

<DemoBlock title="panel-footer marketing slot">
  <oas-navigation-menu id="nav-footer" delay-duration="0" items='[{"label":"Products","value":"products","children":[{"label":"Components","value":"components","href":"/components","icon":"grid","description":"30+ ready-to-use components"},{"label":"Docs","value":"docs","href":"/docs","icon":"book","description":"Full API docs and guides"}]}]'>
    <div slot="panel-footer" style="display: flex; gap: 12px; align-items: center; justify-content: space-between">
      <span style="font-size: var(--oas-font-size-sm); color: var(--oas-color-text-secondary)">Want to talk about your needs first?</span>
      <oas-button size="small" type="primary">Book a demo</oas-button>
    </div>
  </oas-navigation-menu>
  <p class="demo-tip">A marketing area appears at the bottom of the panel (only rendered when it has content).</p>
</DemoBlock>

## Declarative child channel

Besides the `items` JSON, you can write items declaratively with `<oas-navigation-menu-item>` (the `items` attribute **wins when explicitly set**). The default slot text is the label; attributes map to the `NavItem`/`MenuItem` scalar fields (`value`/`href`/`target`/`icon`/`description`/`active`/`disabled` etc.). Direct child items recurse into `children` (inline second-level nav inside the panel); an item with the `sub` attribute parses its children into the overlay second-level nav; `<oas-navigation-menu-group>` is the group carrier (`type: "group"` semantics — its items are flattened into the grid). Child additions/removals, attribute and text changes re-render automatically.

<DemoBlock title="Child channel basic">
  <oas-navigation-menu id="nav-child" delay-duration="0" onoas-select="navChildLog(event)">
    <oas-navigation-menu-item value="products">Products
      <oas-navigation-menu-item value="components" href="/components" icon="star" description="30+ ready-to-use components">Components</oas-navigation-menu-item>
      <oas-navigation-menu-item value="docs" href="/docs" icon="book" description="Full API docs and guides">Docs</oas-navigation-menu-item>
    </oas-navigation-menu-item>
    <oas-navigation-menu-item value="pricing" href="/pricing">Pricing</oas-navigation-menu-item>
    <oas-navigation-menu-item value="about" href="/about">About</oas-navigation-menu-item>
  </oas-navigation-menu>
  <oas-tag id="nav-child-result" type="info">Not selected yet</oas-tag>
</DemoBlock>

<DemoBlock title="Second-level cascade (sub) and groups">
  <oas-navigation-menu id="nav-child-sub" delay-duration="0">
    <oas-navigation-menu-item value="products">Products
      <oas-navigation-menu-group>
        <oas-navigation-menu-item value="components" href="/components" icon="star" description="30+ components">Components</oas-navigation-menu-item>
        <oas-navigation-menu-item value="themes" href="/themes" icon="heart" description="Theming and tokens">Themes</oas-navigation-menu-item>
      </oas-navigation-menu-group>
      <oas-navigation-menu-item value="learn" sub>Learn
        <oas-navigation-menu-item value="docs" href="/docs">Docs</oas-navigation-menu-item>
        <oas-navigation-menu-item value="tutorial" href="/tutorial">Tutorials</oas-navigation-menu-item>
      </oas-navigation-menu-item>
    </oas-navigation-menu-item>
  </oas-navigation-menu>
  <p class="demo-tip">With the `sub` attribute the children render as an overlay second-level nav inside the panel; group carrier items are flattened into the grid.</p>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  window.navLog = (e) => {
    const tag = document.getElementById('nav-result')
    if (tag) tag.textContent = `Selected: ${e.detail.value}`
  }
  window.navChange = (e) => {
    const tag = document.getElementById('nav-result')
    if (tag) tag.textContent = `Selected: ${e.detail.value || '(closed)'}`
  }
  window.navControlled = (e) => {
    const tag = document.getElementById('nav-controlled-result')
    if (tag) tag.textContent = `Currently open: ${e.detail.value || '(closed)'}`
  }
  window.navSubLog = (e) => {
    const tag = document.getElementById('nav-sub-result')
    if (tag) tag.textContent = `Selected: ${e.detail.value}`
  }
  window.navChildLog = (e) => {
    const tag = document.getElementById('nav-child-result')
    if (tag) tag.textContent = `Selected: ${e.detail.value}`
  }
  const controlled = document.getElementById('nav-controlled')
  const setOpen = (v) => controlled && controlled.setAttribute('value', v)
  document.getElementById('nav-open-a')?.addEventListener('click', () => setOpen('products'))
  document.getElementById('nav-open-b')?.addEventListener('click', () => setOpen('resources'))
  document.getElementById('nav-close')?.addEventListener('click', () => setOpen(''))
})
</script>

## API

### oas-navigation-menu

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `arrow` | Pointer arrow on the popup, shown by default; `arrow="false"` hides it | `string` | `true` |
| `backdrop` | Show an overlay when open (clicking the overlay closes) | `boolean` | — |
| `columns` | Panel grid columns, default 2 (mega-panel multi-column link cards) | `string` | `2` |
| `delay-duration` | Hover open/close delay in ms, default 200; clicks and keyboard are immediate | `string` | `200` |
| `items` | Navigation items JSON (hierarchical; leaf items can carry `description` text and an `icon` to render mega-panel link cards) | `string` | `[]` |
| `keep-mounted` | Keep the panel DOM mounted when closed (crawler/SEO indexing) | `boolean` | — |
| `loop` | Top-level arrow-key wrap-around toggle, default `true` (loops at edges); explicit `loop="false"` stops at the edges (aligned with menubar) | `string` | — |
| `orientation` | Layout direction: `horizontal` (default) / `vertical` (panel appears to the right of triggers) | `string` | `horizontal` |
| `skip-delay-duration` | Skip-delay window in ms, default 300: hovering another trigger within this window after a close opens it immediately | `string` | `300` |
| `value` | Controlled open item (top-level trigger value; empty string = closed; when present the open state follows the attribute and interactions only dispatch `oas-change` for the host to update) | `string` | — |

| Event | Description |
| --- | --- |
| `oas-change` | The open item changed, `detail: { value }` (value is the open top-level item value; empty string = closed) |
| `oas-select` | An item was selected (top-level leaf link, panel link card or secondary sub-nav link), `detail: { value }` |

| Name | Description |
| --- | --- |
| `panel-footer` | Marketing slot at the bottom of the panel: `<div slot="panel-footer">` (CTA cards etc.) renders a footer container inside the panel when it has content |

### oas-navigation-menu-item

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `active` | Current-page marker: the link renders `aria-current="page"` (applies to top-level and panel links) | — | — |
| `danger` | Destructive item (red semantics) | — | — |
| `description` | Link-card description: rendered under the title in mega-panel mode | — | — |
| `disabled` | Disabled: renders aria-disabled and blocks clicks/keyboard/hover | — | — |
| `href` | Link URL: leaf items with `href` render as `<a>` (top-level and panel link cards) | — | — |
| `icon` | Icon name (`@oas-ui/icons` registry icon name): panel link-card icon | — | — |
| `icon-color` | Icon color: fixes the icon to this color (overrides the selected/disabled default); defaults to `currentColor` following the text color | — | — |
| `kind` | Leaf item semantics: `radio` (default) / `action` / `checkbox` | — | — |
| `loading` | Loading: blocks interaction until data-driven recovery | — | — |
| `rel` | Link rel (custom, e.g. `noopener`) | — | — |
| `sub` | Boolean: when present its direct child items parse into `sub` (overlay second-level nav inside the panel); otherwise they recurse into `children` (inline secondary sub-nav) | — | — |
| `target` | Link open target (e.g. `_blank`) | — | — |
| `value` | Selection value (required): top-level triggers and panel items use it for open/select/keyboard | — | — |

| Name | Description |
| --- | --- |
| default | Navigation item label content (default slot text; direct child items/group carriers are excluded) |

### oas-navigation-menu-group

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `label` | Optional group title (not rendered by this component's panel — it only carries data, matching the `type: "group"` field of the JSON channel) | — | — |

| Name | Description |
| --- | --- |
| default | Grouped navigation items (`oas-navigation-menu-item` children, flattened into the grid when the panel renders) |

`NavItem` fields (inherits `MenuItem`):

| Field         | Description                                            | Type      |
| ------------- | ------------------------------------------------------ | --------- |
| `label`       | Navigation text                                        | `string`  |
| `value`       | Selection value                                        | `string`  |
| `href`        | Link URL (optional); leaf items with `href` render as `<a>` and are navigable | `string` |
| `target`      | Link open target (optional)                            | `string`  |
| `icon`        | Icon name (optional); panel link-card icon             | `string`  |
| `description` | Link-card description (optional); rendered under the title in mega-panel mode | `string` |
| `active`      | Current-page marker (optional); renders `aria-current="page"` on the link | `boolean` |
| `disabled`    | Disabled                                               | `boolean` |
| `children`    | Sub navigation items (optional); a top-level item with children opens the mega panel, and panel children with children render as an inline secondary sub-nav | `NavItem[]` |

Interaction: hover (after `delay-duration`) / click a top-level trigger to open the unified viewport panel; click a panel link card to select and fire `oas-select`; the open item change fires `oas-change`. Clicking outside closes; `Esc` closes the panel; `←`/`→` (vertical `↑`/`↓`) switch top level, `↓` (vertical `→`) opens the panel and focuses the first item, `↓`/`↑` move within the panel, `→` expands an inline secondary sub-nav, `Enter` selects; while the panel is open `Tab` cycles among panel items (focus trap).
