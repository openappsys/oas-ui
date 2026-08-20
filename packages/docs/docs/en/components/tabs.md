# Tabs

Tab-based content switching with arrow-key navigation; inactive panels are hidden via the `hidden` attribute. Use `oas-tabs` together with `oas-tab-panel`.

## Basic usage

<DemoBlock title="Basic usage">
  <oas-tabs active="a">
    <oas-tab-panel label="Tab 1" value="a"><p>Content 1: basic information display.</p></oas-tab-panel>
    <oas-tab-panel label="Tab 2" value="b"><p>Content 2: more details.</p></oas-tab-panel>
    <oas-tab-panel label="Tab 3" value="c"><p>Content 3: other supplementary notes.</p></oas-tab-panel>
  </oas-tabs>
</DemoBlock>

## Default selection

<DemoBlock title="Specify active">
  <oas-tabs active="c">
    <oas-tab-panel label="Tab 1" value="a"><p>Content 1</p></oas-tab-panel>
    <oas-tab-panel label="Tab 2" value="b"><p>Content 2</p></oas-tab-panel>
    <oas-tab-panel label="Tab 3" value="c"><p>Content 3 selected by default</p></oas-tab-panel>
  </oas-tabs>
</DemoBlock>

## Rich content panels

<DemoBlock title="Rich content">
  <oas-tabs active="a">
    <oas-tab-panel label="Form" value="a">
      <oas-space direction="vertical" size="small" style="width: 100%">
        <oas-input placeholder="Enter your name" style="width: 240px"></oas-input>
        <oas-space>
          <oas-button type="primary" size="small">Submit</oas-button>
          <oas-button size="small">Cancel</oas-button>
        </oas-space>
      </oas-space>
    </oas-tab-panel>
    <oas-tab-panel label="List" value="b">
      <oas-space direction="vertical" size="small" style="width: 100%">
        <oas-tag type="success">Enabled</oas-tag>
        <oas-tag>Pending</oas-tag>
      </oas-space>
    </oas-tab-panel>
  </oas-tabs>
</DemoBlock>

## Card style

<DemoBlock title="Card-style tabs">
  <oas-tabs type="card" active="a">
    <oas-tab-panel label="Tab 1" value="a"><p>Content 1: card-style tabs have borders; the active tab connects with the panel, and the whole is wrapped by a four-side border.</p></oas-tab-panel>
    <oas-tab-panel label="Tab 2" value="b"><p>Content 2: more details.</p></oas-tab-panel>
    <oas-tab-panel label="Tab 3" value="c"><p>Content 3: other supplementary notes.</p></oas-tab-panel>
  </oas-tabs>
</DemoBlock>

Switch to the card style with `type="card"`: every tab has its own border, the active tab's bottom edge shares the panel's background color (connected without a break), and the whole is wrapped by a continuous four-side border.

## Switch event

<DemoBlock title="oas-change event">
  <oas-tabs id="tabs-demo" active="a">
    <oas-tab-panel label="Tab 1" value="a"><p>Content 1</p></oas-tab-panel>
    <oas-tab-panel label="Tab 2" value="b"><p>Content 2</p></oas-tab-panel>
  </oas-tabs>
</DemoBlock>

<oas-tag type="primary" id="tabs-info">Current active: a</oas-tag>

## Closable

`closable`: each tab shows a close × on the right (`span[tabindex="-1"]`, named for screen readers via `aria-label`, triggered by Enter / Space). Clicking × fires `oas-close` with `detail: { key }`; the component does not remove the panel automatically — the host removes it (the tab bar then refreshes incrementally).

<DemoBlock title="Closable tabs">
  <oas-tabs id="tabs-closable" closable active="a">
    <oas-tab-panel label="Tab 1" value="a"><p>Content 1</p></oas-tab-panel>
    <oas-tab-panel label="Tab 2" value="b"><p>Content 2</p></oas-tab-panel>
    <oas-tab-panel label="Tab 3" value="c"><p>Content 3</p></oas-tab-panel>
  </oas-tabs>
</DemoBlock>

> Closing an inactive tab: the tab disappears immediately (visible feedback). Closing the active tab: it automatically switches to the first remaining tab and shows a message.

## Badges

The `badge` attribute of `oas-tab-panel` renders a badge (number or text) next to the tab title.

<DemoBlock title="Tabs with badges">
  <oas-tabs active="a">
    <oas-tab-panel label="Tab 1" value="a" badge="3"><p>Content 1: the badge shows a count.</p></oas-tab-panel>
    <oas-tab-panel label="Tab 2" value="b" badge="New"><p>Content 2: the badge can also display text.</p></oas-tab-panel>
    <oas-tab-panel label="Tab 3" value="c"><p>Content 3: no badge.</p></oas-tab-panel>
  </oas-tabs>
</DemoBlock>

## Dynamic add/remove tabs

`addable`: shows a + button at the end of the tab bar (`aria-label` from locale); clicking fires `oas-add` (`detail: { label }` — the default new-tab label "New tab" comes from locale, use it directly or customize it). The component does not add a panel — the host appends an `oas-tab-panel` on `oas-add` and the tab bar refreshes incrementally; combine with `closable` to add and remove. After adding, the selection and keyboard focus (roving tabindex) land on the new tab; after closing the active tab, focus moves to the remaining selected tab.

<DemoBlock title="Dynamic add/remove tabs">
  <oas-tabs id="tabs-editable" addable closable active="a">
    <oas-tab-panel label="Tab 1" value="a"><p>Content 1: close with ×, add with +.</p></oas-tab-panel>
    <oas-tab-panel label="Tab 2" value="b"><p>Content 2: keep adding/removing.</p></oas-tab-panel>
  </oas-tabs>
</DemoBlock>

## Icon tabs

The `icon` attribute of `oas-tab-panel` renders an icon before the tab title (reuses the `oas-icon` icon set) as an icon + text combo. You can also put a direct child with `slot="icon"` inside the panel as a custom icon (emoji / SVG etc.).

<DemoBlock title="Icon tabs">
  <oas-tabs id="tabs-icon" active="a">
    <oas-tab-panel label="Star" value="a" icon="star"><p>Content 1: icon rendered via the `icon` attribute.</p></oas-tab-panel>
    <oas-tab-panel label="Mail" value="b" icon="mail"><p>Content 2: icon + text combo.</p></oas-tab-panel>
    <oas-tab-panel label="Search" value="c" icon="search"><p>Content 3.</p></oas-tab-panel>
    <oas-tab-panel label="Custom" value="d"><span slot="icon">🚀</span><p>Content 4: custom icon via `slot="icon"`.</p></oas-tab-panel>
  </oas-tabs>
</DemoBlock>

## Tab position

`tab-position`: `top` (default — tabs in a horizontal row above the content) / `left` (tabs stacked on the left, content on the right) / `right` / `bottom`.

<DemoBlock title="left vertical tabs">
  <oas-tabs tab-position="left" active="a">
    <oas-tab-panel label="Tab 1" value="a"><p>Content 1: tabs stack vertically on the left, content on the right.</p></oas-tab-panel>
    <oas-tab-panel label="Tab 2" value="b"><p>Content 2</p></oas-tab-panel>
    <oas-tab-panel label="Tab 3" value="c"><p>Content 3</p></oas-tab-panel>
  </oas-tabs>
</DemoBlock>

<DemoBlock title="right vertical tabs">
  <oas-tabs tab-position="right" active="a">
    <oas-tab-panel label="Tab 1" value="a"><p>Content 1: tabs stack vertically on the right, content on the left.</p></oas-tab-panel>
    <oas-tab-panel label="Tab 2" value="b"><p>Content 2</p></oas-tab-panel>
    <oas-tab-panel label="Tab 3" value="c"><p>Content 3</p></oas-tab-panel>
  </oas-tabs>
</DemoBlock>

<DemoBlock title="bottom tabs">
  <oas-tabs tab-position="bottom" active="a">
    <oas-tab-panel label="Tab 1" value="a"><p>Content 1: tabs sit horizontally at the bottom, content above.</p></oas-tab-panel>
    <oas-tab-panel label="Tab 2" value="b"><p>Content 2</p></oas-tab-panel>
    <oas-tab-panel label="Tab 3" value="c"><p>Content 3</p></oas-tab-panel>
  </oas-tabs>
</DemoBlock>

## Disabled tab

Add `disabled` to an `oas-tab-panel` to disable a single tab: not focusable/clickable, `aria-disabled`, visually dimmed, and skipped by arrow-key navigation.

<DemoBlock title="Disabled tab">
  <oas-tabs active="a">
    <oas-tab-panel label="Enabled" value="a"><p>Content 1: switches normally.</p></oas-tab-panel>
    <oas-tab-panel label="Disabled" value="b" disabled><p>Content 2: this tab is disabled.</p></oas-tab-panel>
    <oas-tab-panel label="Enabled" value="c"><p>Content 3: arrow keys skip the disabled tab in between.</p></oas-tab-panel>
  </oas-tabs>
</DemoBlock>

## Size

`size`: five steps `xs / small / medium (default) / large / xl`; font-size and padding follow the step.

<DemoBlock title="Size steps">
  <oas-space direction="vertical" size="large" style="width: 100%">
    <oas-tabs size="small" active="a">
      <oas-tab-panel label="Small" value="a"><p>small</p></oas-tab-panel>
      <oas-tab-panel label="Tab" value="b"><p>Content</p></oas-tab-panel>
    </oas-tabs>
    <oas-tabs size="medium" active="a">
      <oas-tab-panel label="Medium (default)" value="a"><p>medium</p></oas-tab-panel>
      <oas-tab-panel label="Tab" value="b"><p>Content</p></oas-tab-panel>
    </oas-tabs>
    <oas-tabs size="large" active="a">
      <oas-tab-panel label="Large" value="a"><p>large</p></oas-tab-panel>
      <oas-tab-panel label="Tab" value="b"><p>Content</p></oas-tab-panel>
    </oas-tabs>
  </oas-space>
</DemoBlock>

## Centered &amp; justified

`centered`: center the tab bar; `justified`: distribute tabs evenly across the full row width.

<DemoBlock title="Centered tabs">
  <oas-tabs centered active="a">
    <oas-tab-panel label="Tab 1" value="a"><p>Content 1: the tab bar is centered.</p></oas-tab-panel>
    <oas-tab-panel label="Tab 2" value="b"><p>Content 2</p></oas-tab-panel>
    <oas-tab-panel label="Tab 3" value="c"><p>Content 3</p></oas-tab-panel>
  </oas-tabs>
</DemoBlock>

<DemoBlock title="Justified tabs">
  <oas-tabs justified active="a">
    <oas-tab-panel label="Tab 1" value="a"><p>Content 1: tabs fill the whole row evenly.</p></oas-tab-panel>
    <oas-tab-panel label="Tab 2" value="b"><p>Content 2</p></oas-tab-panel>
    <oas-tab-panel label="Tab 3" value="c"><p>Content 3</p></oas-tab-panel>
  </oas-tabs>
</DemoBlock>

## Overflow scrolling

When there are more tabs than fit, the tab bar scrolls horizontally with left/right arrows (vertical scroll + up/down arrows for `tab-position="left/right"`), and the mouse wheel also slides the tabs horizontally. `without-scroll-controls` hides the arrows (scrolling remains). Newly added/activated tabs auto-scroll into view (never hidden at the far end on overflow); the `addable` + button stays pinned at the end of the tab bar, never scrolled out of view.

<DemoBlock title="Overflow scrolling">
  <div style="max-width: 420px">
    <oas-tabs active="t1">
      <oas-tab-panel v-for="i in 12" :key="i" :label="'Tab ' + i" :value="'t' + i"><p>Content {{ i }}</p></oas-tab-panel>
    </oas-tabs>
  </div>
</DemoBlock>

<DemoBlock title="Scroll arrows off">
  <div style="max-width: 420px">
    <oas-tabs without-scroll-controls active="t1">
      <oas-tab-panel v-for="i in 12" :key="i" :label="'Tab ' + i" :value="'t' + i"><p>Content {{ i }}</p></oas-tab-panel>
    </oas-tabs>
  </div>
</DemoBlock>

## More collapse dropdown

`more`: collapse overflowed tabs into a trailing "More" dropdown instead of scroll arrows (mutually exclusive). The More button highlights in the primary color when the active tab is collapsed; with many collapsed items a search box at the top of the dropdown filters them live; when opened, the selected item auto-scrolls into view.

<DemoBlock title="More collapse dropdown">
  <div style="max-width: 380px">
    <oas-tabs more active="t1">
      <oas-tab-panel v-for="i in 12" :key="i" :label="'Tab ' + i" :value="'t' + i"><p>Content {{ i }}</p></oas-tab-panel>
    </oas-tabs>
  </div>
</DemoBlock>

## Panel visibility strategy

`panel-mode`: `keep` (default, inactive panels stay in DOM via `hidden`) / `lazy` (unvisited panel content is not mounted until first activation, then stays) / `destroy` (inactive panel content is unmounted on switch). Use lazy/destroy for heavy panels (charts/editors) so inactive panels don't keep consuming resources.

<DemoBlock title="Panel visibility strategy">
  <oas-space direction="vertical" size="large" style="width: 100%">
    <oas-tabs panel-mode="lazy" active="a">
      <oas-tab-panel label="Lazy" value="a"><p>lazy: unvisited panel content is not mounted yet.</p></oas-tab-panel>
      <oas-tab-panel label="Panel 2" value="b"><p>I render only when first activated.</p></oas-tab-panel>
    </oas-tabs>
    <oas-tabs panel-mode="destroy" active="a">
      <oas-tab-panel label="Destroy" value="a"><p>destroy: my content unmounts on switch.</p></oas-tab-panel>
      <oas-tab-panel label="Panel 2" value="b"><p>Remounts when switching back.</p></oas-tab-panel>
    </oas-tabs>
  </oas-space>
</DemoBlock>

## Manual activation

`activation="manual"`: arrow keys move focus only; Enter / Space switches the panel (a11y manual activation, good when panel content is heavy and switching is costly). Default `auto` (arrow keys switch immediately).

<DemoBlock title="Manual activation">
  <oas-tabs activation="manual" active="a">
    <oas-tab-panel label="Tab 1" value="a"><p>Content 1: arrows move focus, Enter/Space switches.</p></oas-tab-panel>
    <oas-tab-panel label="Tab 2" value="b"><p>Content 2</p></oas-tab-panel>
    <oas-tab-panel label="Tab 3" value="c"><p>Content 3</p></oas-tab-panel>
  </oas-tabs>
</DemoBlock>

## Switch animation

`animated`: selection transition + panel fade-in (animates color/border/opacity only, no layout).

<DemoBlock title="Switch animation">
  <oas-tabs animated active="a">
    <oas-tab-panel label="Tab 1" value="a"><p>Content 1: switching animates.</p></oas-tab-panel>
    <oas-tab-panel label="Tab 2" value="b"><p>Content 2</p></oas-tab-panel>
    <oas-tab-panel label="Tab 3" value="c"><p>Content 3</p></oas-tab-panel>
  </oas-tabs>
</DemoBlock>

## Before-change interception

The `oas-before-change` event (cancelable) fires before switching with `detail: { value }`; the host can `preventDefault()` to veto the switch (works for both click and keyboard). Useful for "block switching when there are unsaved changes".

<DemoBlock title="Before-change interception">
  <oas-checkbox id="tabs-guard">Unsaved changes (switching is blocked while checked)</oas-checkbox>
  <oas-tabs id="tabs-before" active="a" style="margin-top: 12px">
    <oas-tab-panel label="Form" value="a"><p>Content 1: check the box above, then switching is vetoed.</p></oas-tab-panel>
    <oas-tab-panel label="List" value="b"><p>Content 2</p></oas-tab-panel>
    <oas-tab-panel label="Settings" value="c"><p>Content 3</p></oas-tab-panel>
  </oas-tabs>
</DemoBlock>

## Editable rename

Add `editable` to an `oas-tab-panel`: double-click the tab to enter an input editing state; Enter confirms (emits `oas-rename` with `detail: { value, label }`, and the component writes the new label back); Esc or blur cancels.

<DemoBlock title="Editable rename">
  <oas-tabs id="tabs-rename" active="a">
    <oas-tab-panel label="Doc One" value="a" editable><p>Content 1: double-click my tab to rename.</p></oas-tab-panel>
    <oas-tab-panel label="Doc Two" value="b" editable><p>Content 2</p></oas-tab-panel>
    <oas-tab-panel label="Not editable" value="c"><p>Content 3: this tab cannot be renamed.</p></oas-tab-panel>
  </oas-tabs>
</DemoBlock>

## Drag sorting

`sortable`: tabs can be drag-sorted (native HTML5 drag &amp; drop). After drop it emits `oas-reorder` with `detail: { fromIndex, toIndex }`; the component does not move DOM itself — the host reorders the `oas-tab-panel` list accordingly.

<DemoBlock title="Drag sorting">
  <oas-tabs id="tabs-sortable" sortable active="a">
    <oas-tab-panel label="Tab 1" value="a"><p>Content 1: drag tabs to reorder.</p></oas-tab-panel>
    <oas-tab-panel label="Tab 2" value="b"><p>Content 2</p></oas-tab-panel>
    <oas-tab-panel label="Tab 3" value="c"><p>Content 3</p></oas-tab-panel>
    <oas-tab-panel label="Tab 4" value="d"><p>Content 4</p></oas-tab-panel>
  </oas-tabs>
</DemoBlock>

## Nested tabs

An `oas-tab-panel` can nest another `oas-tabs`; inner and outer manage their own selection independently (the outer only recognizes its direct child panels, not the inner ones).

<DemoBlock title="Nested tabs">
  <oas-tabs active="outer-a">
    <oas-tab-panel label="Overview" value="outer-a"><p>Outer content: overview.</p></oas-tab-panel>
    <oas-tab-panel label="Details" value="outer-b">
      <oas-tabs active="inner-x" type="card" style="margin-top: 8px">
        <oas-tab-panel label="Basic" value="inner-x"><p>Inner content: basic info.</p></oas-tab-panel>
        <oas-tab-panel label="Advanced" value="inner-y"><p>Inner content: advanced settings.</p></oas-tab-panel>
      </oas-tabs>
    </oas-tab-panel>
  </oas-tabs>
</DemoBlock>

## Custom tab label

Place a direct child element with `slot="label"` inside `oas-tab-panel` to fully customize the tab label (rich text / icon combos), falling back to the `label` attribute as plain text. That element is not projected into the panel's default slot — it is reserved for the tab label slot.

<DemoBlock title="Custom tab label">
  <oas-tabs active="a">
    <oas-tab-panel label="Plain" value="a"><p>Content 1: default text label.</p></oas-tab-panel>
    <oas-tab-panel value="b">
      <span slot="label"><oas-tag type="success" size="small">VIP</oas-tag> Member</span>
      <p>Content 2: custom rich-text label.</p>
    </oas-tab-panel>
    <oas-tab-panel value="c">
      <span slot="label"><span style="color: var(--oas-color-danger)">●</span> Urgent</span>
      <p>Content 3: label with a status dot.</p>
    </oas-tab-panel>
  </oas-tabs>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  const { message } = await import('@oas-ui/ui')
  const tabs = document.getElementById('tabs-demo')
  const info = document.getElementById('tabs-info')
  tabs?.addEventListener('oas-change', (e) => {
    info.textContent = `Current active: ${e.detail.value}`
  })

  const closableTabs = document.getElementById('tabs-closable')
  closableTabs?.addEventListener('oas-close', (e) => {
    const key = e.detail.key
    message?.info(`Closed tab "${key}"`)
    const target = closableTabs.querySelector(`oas-tab-panel[value="${key}"]`)
    const wasActive = closableTabs.getAttribute('active') === key
    target?.remove()
    if (wasActive) {
      const first = closableTabs.querySelector('oas-tab-panel')
      closableTabs.setAttribute('active', first?.getAttribute('value') ?? '')
    }
  })

  // Dynamic add/remove: the host listens for oas-add and appends a panel
  // (label uses e.detail.label directly; customize as needed). oas-close
  // removes the panel; if the active tab is closed, switch to the first remaining.
  const editable = document.getElementById('tabs-editable')
  let seq = 2
  editable?.addEventListener('oas-add', (e) => {
    const label = `${e.detail.label} ${++seq}`
    const value = `new-${seq}`
    const panel = document.createElement('oas-tab-panel')
    panel.setAttribute('label', label)
    panel.setAttribute('value', value)
    panel.innerHTML = `<p>Content: ${label}, keep adding/removing.</p>`
    editable.appendChild(panel)
    editable.setAttribute('active', value)
    message?.info(`Added tab "${label}"`)
  })
  editable?.addEventListener('oas-close', (e) => {
    const key = e.detail.key
    message?.info(`Closed tab "${key}"`)
    const target = editable.querySelector(`oas-tab-panel[value="${key}"]`)
    const wasActive = editable.getAttribute('active') === key
    target?.remove()
    if (wasActive) {
      const first = editable.querySelector('oas-tab-panel')
      editable.setAttribute('active', first?.getAttribute('value') ?? '')
    }
  })

  // before-change interception: veto switching while "unsaved changes" is checked
  const guard = document.getElementById('tabs-guard')
  const beforeTabs = document.getElementById('tabs-before')
  beforeTabs?.addEventListener('oas-before-change', (e) => {
    if (guard?.hasAttribute('checked')) {
      e.preventDefault()
      message?.warning('Unsaved changes — switch blocked')
    }
  })

  // rename: the component already wrote the label back; this only notifies
  const renameTabs = document.getElementById('tabs-rename')
  renameTabs?.addEventListener('oas-rename', (e) => {
    message?.success(`Renamed to "${e.detail.label}"`)
  })

  // drag sorting: the host reorders the panel list accordingly
  const sortableTabs = document.getElementById('tabs-sortable')
  sortableTabs?.addEventListener('oas-reorder', (e) => {
    const { fromIndex, toIndex } = e.detail
    const panels = [...sortableTabs.querySelectorAll(':scope > oas-tab-panel')]
    const moved = panels[fromIndex]
    if (!moved) return
    moved.remove()
    const rest = [...sortableTabs.querySelectorAll(':scope > oas-tab-panel')]
    if (toIndex >= rest.length) sortableTabs.appendChild(moved)
    else sortableTabs.insertBefore(moved, rest[toIndex])
    message?.info(`Tab moved from ${fromIndex + 1} to ${toIndex + 1}`)
  })
})
</script>

## API

### oas-tabs

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `activation` | Keyboard activation: `auto` (default, arrow keys switch immediately) / `manual` (arrows move focus only, Enter/Space switches — a11y manual activation) | `string` | `auto` |
| `active` | The `value` of the active tab | `string` | — |
| `addable` | Shows a + button at the end of the tab bar; clicking fires `oas-add` (the component does not add a panel) | `boolean` | — |
| `animated` | Selection transition + panel fade-in (animates color/border/opacity only, no layout) | `boolean` | — |
| `centered` | Center the tab bar (when horizontal) | `boolean` | — |
| `closable` | Shows a close × on every tab; clicking fires `oas-close` (the component does not remove the panel) | `boolean` | — |
| `justified` | Distribute tabs evenly across the full tab bar width | `boolean` | — |
| `more` | Collapse overflowed tabs into a "More" dropdown instead of scroll arrows (mutually exclusive); the More button highlights when the active tab is collapsed | `boolean` | — |
| `panel-mode` | Panel visibility strategy: `keep` (default, hidden keeps DOM) / `lazy` (unvisited inactive panels not mounted until first activation) / `destroy` (unmount inactive panel content on switch) | `string` | `keep` |
| `size` | Tab size: `xs/small/medium/large/xl` (default medium), font-size/padding follow the step; invalid values fall back to medium with a warning | `string` | `medium` |
| `sortable` | Tabs are drag-sortable (native HTML5 DnD); emits `oas-reorder` after drop (host reorders panel data accordingly, the component does not move DOM itself) | `boolean` | — |
| `tab-position` | Tab bar position: `top` (default) / `left` / `right` / `bottom` | `string` | `top` |
| `type` | Style variant: `line` (underline, default) / `card` | `string` | `line` |
| `without-scroll-controls` | Disable the overflow scroll arrows (shown by default when tabs overflow) | `boolean` | — |

| Event | Description |
| --- | --- |
| `oas-add` | The + button was clicked, `detail: { label }` (default new-tab label from locale; use it or customize it) |
| `oas-before-change` | Fired before switching (cancelable), `detail: { value }`; host `preventDefault()` vetoes the switch (click/keyboard both; direct setAttribute by host does not trigger) |
| `oas-change` | Switched, `detail: { value }` |
| `oas-close` | A tab's close × was clicked, `detail: { key }` (`key` is that tab's `value`; the component does not remove the panel) |
| `oas-rename` | Editable tab rename confirmed via double-click + Enter, `detail: { value, label }`; the component writes the new label back to the panel, host may persist |
| `oas-reorder` | Fired after sortable drag reorder, `detail: { fromIndex, toIndex }`; host reorders `oas-tab-panel` accordingly (the component does not move DOM itself) |

| Name | Description |
| --- | --- |
| default | — |

### oas-tab-panel

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `badge` | Badge next to the tab title (number or text) | — | — |
| `disabled` | Disable this tab: not focusable/clickable, `aria-disabled`, visually dimmed, skipped by keyboard navigation | — | — |
| `editable` | Tab is renameable on double-click: enters an input editing state, Enter confirms (emits `oas-rename`) / Esc cancels | — | — |
| `icon` | Icon name shown before the tab title (reuses the `oas-icon` icon set, e.g. `mail`) | — | — |
| `label` | Tab text | — | — |
| `value` | Tab value | — | — |

| Name | Description |
| --- | --- |
| default | — |

Keyboard: after focusing the tab list, `←` / `→` / `↑` / `↓` cycle through tabs; with a close button focused, Enter / Space triggers close. `oas-tab-panel` declares the `hidden` attribute to hide inactive panels (content stays in the DOM).
