# Menubar

A desktop-app-style top menu bar (File / Edit / View). Click or hover expands submenus (cascading popups), with arrow key support, `Alt` access keys and a focus trap.

## Multi-group radio (independent checkmarks per group)

The `value` of a `type: "group"` item acts as a **group id**. Leaves inside the same group record their selection independently; when `value` is a JSON object string (`{"group-id":"selected"}`), groups don't interfere — both "Mode" and "Theme" can show a checkmark at once.

<DemoBlock title="Multi-group radio">
  <oas-menubar id="menubar-groups" onoas-select="menubarGroupsLog(event)" value='{"mode":"preview","theme":"dark"}' items='[{"label":"View","value":"view","accessKey":"v","children":[{"type":"group","label":"Mode","value":"mode","children":[{"label":"Edit","value":"edit"},{"label":"Preview","value":"preview"}]},{"type":"group","label":"Theme","value":"theme","children":[{"label":"Light","value":"light"},{"label":"Dark","value":"dark"}]}]}]'></oas-menubar>
  <oas-tag id="menubar-groups-result" type="info">mode: preview, theme: dark</oas-tag>
</DemoBlock>

## Action items (kind: "action")

Leaves with `kind: "action"` render as plain actions (`menuitem`): no checkmark, clicks do **not** write back `value`, and only `oas-select` is dispatched (`detail.kind === "action"`). Fits "Open / Save / About" style items.

<DemoBlock title="Action items (kind: action)">
  <oas-menubar id="menubar-action" onoas-select="menubarActionLog(event)" value="mode" items='[{"label":"File","value":"file","accessKey":"f","children":[{"label":"Open","value":"open","kind":"action"},{"label":"Save","value":"save","kind":"action"},{"type":"divider"},{"label":"Mode","value":"mode","kind":"radio"},{"label":"Theme","value":"theme","kind":"radio"}]}]'></oas-menubar>
  <oas-tag id="menubar-action-result" type="info">value: mode (actions don't change it)</oas-tag>
</DemoBlock>

## Shortcuts (shortcut)

The `shortcut` field (e.g. `"Ctrl+N"`): renders a key hint on the right, and auto-binds a `document`-level keydown — pressing the combo selects that item (`preventDefault` blocks the browser default). Binding rules: `modifier+key` combos bind directly; single keys bind only for function keys (F1–F12) — any other single key (letters/digits/Delete etc.) is display-only and not bound.

<DemoBlock title="Shortcuts">
  <oas-menubar id="menubar-shortcut" onoas-select="menubarShortcutLog(event)" items='[{"label":"File","value":"file","accessKey":"f","children":[{"label":"New","value":"new","shortcut":"Ctrl+N"},{"label":"Open","value":"open","shortcut":"Ctrl+O"},{"type":"divider"},{"label":"Save","value":"save","shortcut":"Ctrl+S","kind":"action"}]}]'></oas-menubar>
  <oas-tag id="menubar-shortcut-result" type="info">Try Ctrl+N / Ctrl+O / Ctrl+S</oas-tag>
</DemoBlock>

## Basic usage

<DemoBlock title="Basic usage">
  <oas-menubar id="menubar-basic" onoas-select="menubarLog(event)" items='[{"label":"File","value":"file","accessKey":"f","children":[{"label":"New","value":"new"},{"label":"Open","value":"open"},{"type":"divider"},{"label":"Quit","value":"quit"}]},{"label":"Edit","value":"edit","accessKey":"e","children":[{"label":"Undo","value":"undo"},{"label":"Redo","value":"redo"},{"type":"divider"},{"label":"Copy","value":"copy"},{"label":"Paste","value":"paste"}]},{"label":"View","value":"view","accessKey":"v","children":[{"label":"Fullscreen","value":"fullscreen"},{"label":"Zoom","value":"zoom","children":[{"label":"Zoom in","value":"zoom-in"},{"label":"Zoom out","value":"zoom-out"}]}]}]'></oas-menubar>
  <oas-tag id="menubar-result" type="info">Nothing selected</oas-tag>
</DemoBlock>

## Disabled items and groups

Submenus support `disabled`, `type: "divider"` separators and `type: "group"` group titles.

<DemoBlock title="Disabled items and groups">
  <oas-menubar onoas-select="menubarLog2(event)" items='[{"label":"File","value":"file","accessKey":"f","children":[{"type":"group","label":"Recent","children":[{"label":"Project A","value":"proj-a"},{"label":"Project B","value":"proj-b"}]},{"type":"divider"},{"label":"Save","value":"save"},{"label":"Save as","value":"save-as","disabled":true}]}]'></oas-menubar>
  <oas-tag id="menubar-result-2" type="info">Nothing selected</oas-tag>
</DemoBlock>

## Controlled selection

The `value` attribute is controlled (it is in `observedAttributes`): an external `setAttribute('value', ...)` takes effect immediately and syncs the selected item (check/highlight) to the corresponding leaf item; internal clicks also write back to `value` (uncontrolled channel), and the host can listen to `oas-select` to take over.

<DemoBlock title="Controlled selection (value attribute)">
  <oas-space size="small">
    <oas-button size="small" onclick="mbSet('new')">Select "New"</oas-button>
    <oas-button size="small" onclick="mbSet('undo')">Select "Undo"</oas-button>
    <oas-button size="small" onclick="mbSet('')">Clear selection</oas-button>
    <oas-tag id="mb-value-status" type="info">value: -</oas-tag>
  </oas-space>
  <oas-menubar id="mb-value" items='[{"label":"File","value":"file","accessKey":"f","children":[{"label":"New","value":"new"},{"label":"Open","value":"open"},{"type":"divider"},{"label":"Quit","value":"quit"}]},{"label":"Edit","value":"edit","accessKey":"e","children":[{"label":"Undo","value":"undo"},{"label":"Redo","value":"redo"}]}]'></oas-menubar>
</DemoBlock>

## Checkbox items and keep-open (checkbox + close-on-select)

Leaves with `kind: "checkbox"` toggle a multi-select checked set (`value` is a JSON array); toggling a checkbox does **not** close the submenu (continuous toggling). `close-on-select="false"` keeps the submenu open even after radio/action selections.

<DemoBlock title="Checkbox + close-on-select">
  <oas-menubar id="menubar-checkbox" onoas-select="menubarCheckboxLog(event)" close-on-select="false" value='["grid"]' items='[{"label":"View","value":"view","accessKey":"v","children":[{"type":"group","label":"Show","children":[{"label":"Gridlines","value":"grid","kind":"checkbox"},{"label":"Ruler","value":"ruler","kind":"checkbox"}]},{"type":"divider"},{"label":"Fullscreen","value":"fullscreen"}]}]'></oas-menubar>
  <oas-tag id="menubar-checkbox-result" type="info">Checked: ["grid"]</oas-tag>
</DemoBlock>

## Controlled open (open)

The `open` attribute holds the value of the currently open top-level menu (`open=""` closes all). Controlled attribute: an external `setAttribute('open', ...)` opens/switches/closes immediately; internal changes write `open` back and dispatch `oas-open-change` (`detail: { value, open }`) for the host to take over.

<DemoBlock title="Controlled open (open attribute)">
  <oas-space size="small">
    <oas-button size="small" onclick="mbOpen('file')">Open "File"</oas-button>
    <oas-button size="small" onclick="mbOpen('edit')">Open "Edit"</oas-button>
    <oas-button size="small" onclick="mbOpen('')">Close</oas-button>
    <oas-tag id="mb-open-status" type="info">open: -</oas-tag>
  </oas-space>
  <oas-menubar id="mb-open" items='[{"label":"File","value":"file","accessKey":"f","children":[{"label":"New","value":"new"},{"label":"Open","value":"open"}]},{"label":"Edit","value":"edit","accessKey":"e","children":[{"label":"Undo","value":"undo"},{"label":"Redo","value":"redo"}]}]'></oas-menubar>
</DemoBlock>

## Trigger mode and arrow-key wrap (trigger / loop)

`trigger="click"` (default): a top-level menu **opens on click first**; once one is open, hovering another top-level item switches to it (desktop convention). `trigger="hover"` opens directly on hover. `loop="false"` disables wrap-around at the edges.

<DemoBlock title="Hover opens directly (trigger)">
  <oas-menubar onoas-select="menubarLog2(event)" trigger="hover" items='[{"label":"File","value":"file","accessKey":"f","children":[{"label":"New","value":"new"},{"label":"Open","value":"open"}]},{"label":"Edit","value":"edit","accessKey":"e","children":[{"label":"Undo","value":"undo"}]}]'></oas-menubar>
  <oas-tag id="menubar-trigger-result" type="info">hover opens directly (no click-first)</oas-tag>
</DemoBlock>

<DemoBlock title="No wrap-around (loop)">
  <oas-menubar loop="false" items='[{"label":"File","value":"file","accessKey":"f","children":[{"label":"New","value":"new"}]},{"label":"Edit","value":"edit","accessKey":"e","children":[{"label":"Undo","value":"undo"}]},{"label":"View","value":"view","accessKey":"v","children":[{"label":"Fullscreen","value":"fullscreen"}]}]'></oas-menubar>
  <oas-tag type="info">← stops at the first, → stops at the last</oas-tag>
</DemoBlock>

## Disabled bar (disabled)

`disabled` disables the whole bar: top-level/sub-item clicks, keyboard navigation, shortcut hotkeys and Alt access keys are all blocked.

<DemoBlock title="Disabled bar (disabled)">
  <oas-menubar disabled items='[{"label":"File","value":"file","accessKey":"f","children":[{"label":"New","value":"new"}]},{"label":"Edit","value":"edit","accessKey":"e","children":[{"label":"Undo","value":"undo"}]}]'></oas-menubar>
  <oas-tag type="info">The whole bar is inert</oas-tag>
</DemoBlock>

## Popup positioning and arrow (side / align / offset / show-arrow)

`side` controls the first-level popup side (default `bottom`), `align` its alignment (default `start`), `offset` the gap to the trigger (px); `show-arrow` draws a visual arrow pointing at the trigger.

<DemoBlock title="Popup positioning + arrow (side / align / offset / show-arrow)">
  <oas-menubar side="top" align="end" offset="8" show-arrow items='[{"label":"File","value":"file","accessKey":"f","children":[{"label":"New","value":"new"},{"label":"Open","value":"open"}]},{"label":"Edit","value":"edit","accessKey":"e","children":[{"label":"Undo","value":"undo"}]}]'></oas-menubar>
  <oas-tag type="info">side=top / align=end / offset=8 / show-arrow</oas-tag>
</DemoBlock>

## Vertical orientation (orientation)

`orientation="vertical"`: the bar stacks vertically, first-level popups default to the right; ↑/↓ move between top-level items, → opens a submenu.

<DemoBlock title="Vertical (orientation)">
  <oas-menubar orientation="vertical" items='[{"label":"File","value":"file","accessKey":"f","children":[{"label":"New","value":"new"},{"label":"Open","value":"open"}]},{"label":"Edit","value":"edit","accessKey":"e","children":[{"label":"Undo","value":"undo"},{"label":"Redo","value":"redo"}]}]'></oas-menubar>
</DemoBlock>

## Mobile hamburger folding (breakpoint)

`breakpoint="600"`: when the viewport is ≤ 600px wide the bar folds into a hamburger button + popup menu (narrow-width folding); widen the window to restore the full bar.

<DemoBlock title="Mobile hamburger (breakpoint)">
  <oas-menubar id="menubar-mobile" breakpoint="600" onoas-select="menubarMobileLog(event)" items='[{"label":"File","value":"file","accessKey":"f","children":[{"label":"New","value":"new"},{"label":"Open","value":"open"}]},{"label":"Edit","value":"edit","accessKey":"e","children":[{"label":"Undo","value":"undo"}]}]'></oas-menubar>
  <oas-tag id="menubar-mobile-result" type="info">Shrink the window (≤600px) to try the hamburger</oas-tag>
</DemoBlock>

## Icons (icon)

Both top-level items and sub-items accept an `icon` field (icon-set name); icons follow the text color.

<DemoBlock title="Icons (icon)">
  <oas-menubar items='[{"label":"File","value":"file","icon":"gear","children":[{"label":"New","value":"new","icon":"plus"},{"label":"Open","value":"open","icon":"search"},{"label":"Save","value":"save","icon":"download"}]},{"label":"Account","value":"account","icon":"user","children":[{"label":"Profile","value":"profile","icon":"user"},{"label":"Log out","value":"logout","icon":"close"}]}]'></oas-menubar>
</DemoBlock>

## Icon color (iconColor)

Both top-level items and sub-items accept an `iconColor` field (fixes the icon color, overriding the selected/disabled default); it defaults to `currentColor` following the text color. The declarative child channel uses the `icon-color` attribute.

<DemoBlock title="Icon color (iconColor / icon-color)">
  <oas-menubar id="menubar-iconcolor" items='[{"label":"File","value":"file","icon":"gear","iconColor":"var(--oas-color-primary)","children":[{"label":"New","value":"new","icon":"plus","iconColor":"var(--oas-color-success)"},{"label":"Open","value":"open","icon":"search"}]},{"label":"Account","value":"account","icon":"user","iconColor":"#8b5cf6","children":[{"label":"Log out","value":"logout","icon":"trash","iconColor":"var(--oas-color-danger)"}]}]'></oas-menubar>
</DemoBlock>

## Link navigation (href)

Leaves (both inside submenus and top-level leaves) with `href` render as real `<a>` links: right-click new window and middle-click open work natively, good for SEO; clicks still dispatch `oas-select` and write back `value` (the link's default navigation is not blocked). `target="_blank"` automatically adds `rel="noopener"`.

<DemoBlock title="Link navigation (real href links)">
  <oas-menubar id="menubar-href" onoas-select="menubarHrefLog(event)" items='[{"label":"Docs","value":"docs","accessKey":"d","href":"/guide/intro"},{"label":"Community","value":"community","accessKey":"c","href":"/community","target":"_blank","children":[{"label":"Forum","value":"forum","href":"/community/forum","target":"_blank"},{"label":"Contribute","value":"contrib","href":"/community/contrib"}]}]'></oas-menubar>
  <oas-tag id="menubar-href-result" type="info">Clicking a leaf navigates and fires oas-select</oas-tag>
</DemoBlock>

## Declarative child channel

Besides the `items` JSON, you can write items declaratively with `<oas-menubar-item>` / `<oas-menubar-group>` / `<oas-menubar-divider>` (the `items` attribute **wins when explicitly set**; otherwise child elements are parsed and converge to the same render path). The default slot text is the label; attributes map to the `MenubarItem` fields: `value` / `disabled` / `icon` / `kind` / `danger` / `href` / `target` / `rel` / `shortcut` / `access-key` / `indeterminate`. Nesting child elements directly inside `<oas-menubar-item>` recursively becomes a submenu; `<oas-menubar-group>` uses its `label` attribute as the group title (`value` can serve as a radio group id) and flattens its children to the same level. Child additions/removals, attribute and text changes re-render automatically (MutationObserver).

<DemoBlock title="Declarative child channel (group / divider / nesting / checkbox / indeterminate / shortcut / danger / href)">
  <oas-space direction="vertical" size="small">
    <oas-menubar id="menubar-decl" onoas-select="menubarDeclLog(event)">
      <oas-menubar-item value="file" access-key="f">File
        <oas-menubar-group label="Recent">
          <oas-menubar-item value="proj-a">Project A</oas-menubar-item>
          <oas-menubar-item value="proj-b">Project B</oas-menubar-item>
        </oas-menubar-group>
        <oas-menubar-divider></oas-menubar-divider>
        <oas-menubar-item value="save" shortcut="Ctrl+S" kind="action">Save</oas-menubar-item>
        <oas-menubar-item value="docs" href="/components/" target="_blank" rel="noopener">Component docs</oas-menubar-item>
      </oas-menubar-item>
      <oas-menubar-item value="view" access-key="v">View
        <oas-menubar-item value="all" kind="checkbox" indeterminate>Select all</oas-menubar-item>
        <oas-menubar-item value="grid" kind="checkbox">Gridlines</oas-menubar-item>
        <oas-menubar-item value="del" danger>Delete</oas-menubar-item>
      </oas-menubar-item>
    </oas-menubar>
    <oas-tag id="menubar-decl-result" type="info">Nothing selected (try Alt+F to open "File", Ctrl+S to trigger Save)</oas-tag>
  </oas-space>
</DemoBlock>

<DemoBlock title="Dynamic add/remove (MutationObserver auto-refresh)">
  <oas-space direction="vertical" size="small">
    <oas-button size="small" onclick="menubarDeclAdd()">Append a top-level item</oas-button>
    <oas-menubar id="menubar-decl-dyn">
      <oas-menubar-item value="file">File
        <oas-menubar-item value="new">New</oas-menubar-item>
      </oas-menubar-item>
    </oas-menubar>
  </oas-space>
</DemoBlock>

## Horizontal overflow folding (···)

When the container is too narrow, top-level items that don't fit fold into a trailing "···" item; clicking it opens a popup with the folded items (selecting works). When the selected item is folded, "···" highlights. Only in horizontal mode; vertical and the mobile hamburger don't fold. A folded top-level item that has a submenu is treated as a plain selectable item inside the popup (cascading submenus are not expanded there).

<DemoBlock title="Overflow folding (narrow container)">
  <oas-menubar id="menubar-overflow" style="width: 380px" onoas-select="menubarOverflowLog(event)" items='[{"label":"Home","value":"home"},{"label":"Products","value":"products","children":[{"label":"Components","value":"components"},{"label":"Theming","value":"theming"}]},{"label":"Solutions","value":"solutions"},{"label":"Developer docs","value":"docs"},{"label":"Downloads","value":"download"},{"label":"About","value":"about"},{"label":"Help","value":"help"}]'></oas-menubar>
  <oas-tag id="menubar-overflow-result" type="info">Container fixed at 380px; overflowing items fold into "···"</oas-tag>
</DemoBlock>

## Indeterminate checkboxes

`kind: "checkbox"` items support `indeterminate: true`: they render `aria-checked="mixed"` with a horizontal dash inside the box (distinct from the ✓ of a fully checked item), for parent/child "partially selected" scenarios. The half-selected state is computed by the host and passed via the items JSON; after toggling, the host can update the items to clear the flag.

<DemoBlock title="Indeterminate checkbox">
  <oas-menubar id="menubar-indeterminate" onoas-select="menubarIndeterminateLog(event)" value='["all","grid"]' items='[{"label":"View","value":"view","accessKey":"v","children":[{"type":"group","label":"Show","children":[{"label":"Select all","value":"all","kind":"checkbox","indeterminate":true},{"label":"Gridlines","value":"grid","kind":"checkbox"},{"label":"Ruler","value":"ruler","kind":"checkbox"}]}]}]'></oas-menubar>
  <oas-tag id="menubar-indeterminate-result" type="info">"Select all" is in the mixed state</oas-tag>
</DemoBlock>

## Leading/trailing slots (start / end)

`slot="start"` (logo position) / `slot="end"` (avatar position) decorative slots: rendered inside the bar when they have content; keyboard navigation skips them automatically (not part of arrow keys or the focus trap).

<DemoBlock title="start / end slots (logo / avatar)">
  <oas-menubar items='[{"label":"File","value":"file","accessKey":"f","children":[{"label":"New","value":"new"},{"label":"Open","value":"open"}]},{"label":"Edit","value":"edit","accessKey":"e","children":[{"label":"Undo","value":"undo"}]}]'>
    <oas-avatar slot="start" size="28">O</oas-avatar>
    <oas-avatar slot="end" size="28" src="https://picsum.photos/seed/isui-mb-avatar/80">U</oas-avatar>
  </oas-menubar>
  <p class="demo-tip">Put a logo/graphic in `start` and an avatar in `end`; arrow keys move between menu items and never jump into the slots.</p>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  window.menubarGroupsLog = (e) => {
    const tag = document.getElementById('menubar-groups-result')
    if (tag) {
      const v = JSON.parse(document.getElementById('menubar-groups')?.getAttribute('value') || '{}')
      tag.textContent = `mode: ${v.mode || '-'}, theme: ${v.theme || '-'}`
    }
  }
  window.menubarActionLog = (e) => {
    const tag = document.getElementById('menubar-action-result')
    if (tag) {
      tag.textContent = e.detail.kind === 'action'
        ? `Action: ${e.detail.value} (value unchanged)`
        : `Selected: ${e.detail.value} (kind: radio)`
    }
  }
  window.menubarShortcutLog = (e) => {
    const tag = document.getElementById('menubar-shortcut-result')
    if (tag) tag.textContent = `Triggered: ${e.detail.value}`
  }
  window.menubarLog = (e) => {
    const tag = document.getElementById('menubar-result')
    if (tag) tag.textContent = `Selected: ${e.detail.value}`
  }
  window.menubarLog2 = (e) => {
    const tag = document.getElementById('menubar-result-2')
    if (tag) tag.textContent = `Selected: ${e.detail.value}`
  }

  window.menubarCheckboxLog = (e) => {
    const tag = document.getElementById('menubar-checkbox-result')
    const mb = document.getElementById('menubar-checkbox')
    if (tag && mb) {
      const v = JSON.parse(mb.getAttribute('value') || '[]')
      tag.textContent = `Checked: ${JSON.stringify(v)} (checkbox keeps open)`
    }
  }

  window.menubarMobileLog = (e) => {
    const tag = document.getElementById('menubar-mobile-result')
    if (tag) tag.textContent = `Selected: ${e.detail.value} (hamburger mode)`
  }

  window.menubarHrefLog = (e) => {
    const tag = document.getElementById('menubar-href-result')
    if (tag) tag.textContent = `oas-select: ${e.detail.value} (rendered as a real <a> link)`
  }

  window.menubarDeclLog = (e) => {
    const tag = document.getElementById('menubar-decl-result')
    if (tag) tag.textContent = `Selected: ${e.detail.value} (via declarative child channel)`
  }
  window.menubarDeclAdd = () => {
    const mb = document.getElementById('menubar-decl-dyn')
    if (!mb) return
    const n = mb.children.length + 1
    const item = document.createElement('oas-menubar-item')
    item.setAttribute('value', `dyn-${n}`)
    item.textContent = `Dynamic item ${n}`
    mb.appendChild(item)
  }

  window.menubarOverflowLog = (e) => {
    const tag = document.getElementById('menubar-overflow-result')
    if (tag) tag.textContent = `Selected: ${e.detail.value} (from "···" popup or the bar)`
  }

  window.menubarIndeterminateLog = (e) => {
    const tag = document.getElementById('menubar-indeterminate-result')
    const mb = document.getElementById('menubar-indeterminate')
    if (tag && mb) {
      const v = JSON.parse(mb.getAttribute('value') || '[]')
      tag.textContent = `Checked: ${JSON.stringify(v)} ("Select all" stays mixed; host can clear the flag via items)`
    }
  }

  const mb = document.getElementById('mb-value')
  const status = document.getElementById('mb-value-status')
  if (mb && status) {
    const sync = () => {
      status.textContent = `value: ${mb.getAttribute('value') || '-'}`
    }
    window.mbSet = (v) => {
      // value is in observedAttributes: setAttribute triggers an immediate re-render
      mb.setAttribute('value', v)
    }
    // Controlled takeover: clicks inside the menu already write back to value; the host can also listen to oas-select
    mb.addEventListener('oas-select', (e) => mbSet(e.detail.value))
    sync()
    new MutationObserver(sync).observe(mb, { attributes: true, attributeFilter: ['value'] })
  }

  const mbOpenEl = document.getElementById('mb-open')
  const mbOpenStatus = document.getElementById('mb-open-status')
  if (mbOpenEl && mbOpenStatus) {
    const syncOpen = () => {
      mbOpenStatus.textContent = `open: ${mbOpenEl.getAttribute('open') || '(closed)'}`
    }
    window.mbOpen = (v) => {
      // open is in observedAttributes: setAttribute triggers an immediate open/close
      mbOpenEl.setAttribute('open', v)
    }
    // Internal changes (clicking a top-level item / hover switch) also write back open + dispatch oas-open-change
    mbOpenEl.addEventListener('oas-open-change', () => syncOpen())
    syncOpen()
    new MutationObserver(syncOpen).observe(mbOpenEl, { attributes: true, attributeFilter: ['open'] })
  }
})
</script>

## API

### oas-menubar

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `align` | First-level popup alignment: `start` (default) / `center` / `end`; with `side` top/bottom it aligns on the horizontal axis, with left/right on the vertical axis | `string` | — |
| `breakpoint` | Mobile breakpoint (px, e.g. `600`): when the viewport width is ≤ the breakpoint the bar collapses into a hamburger button + popup menu (narrow-width folding) | `string` | — |
| `close-on-select` | Whether selecting a leaf closes the open submenu, default `true` (desktop menubar convention); `close-on-select="false"` keeps it open (multi-select scenario); `kind:"checkbox"` items never close on toggle | `string` | — |
| `disabled` | Disable the whole bar: top-level/sub-item clicks, keyboard navigation, shortcut hotkeys and Alt access keys are all blocked; visually desaturated | `boolean` | — |
| `items` | Top-level menu items JSON (with submenu `children`) | `string` | `[]` |
| `loop` | Arrow-key wrap-around toggle, default `true` (loops at edges); explicit `loop="false"` stops at the edges | `string` | — |
| `offset` | Gap between the first-level popup and its trigger (px, default 4) | `string` | — |
| `open` | Value of the currently open top-level menu (`open=""` closes all). Controlled attribute (in `observedAttributes`): an external `setAttribute('open', ...)` opens/switches/closes immediately; internal click/hover/keyboard changes write it back and dispatch `oas-open-change`, letting the host take over | `string` | — |
| `orientation` | Arrangement direction: `horizontal` (default) / `vertical` (bar stacks vertically, first-level popups default to the right, arrow keys move top-level items up/down) | — | — |
| `show-arrow` | Show a visual arrow on the popup pointing at the trigger | — | — |
| `side` | First-level popup side: `bottom` (default horizontal) / `top` / `left` / `right` (default vertical); cascading submenus are unaffected | `string` | — |
| `trigger` | Top-level menu trigger: `click` (default, click to open first, then hover switches — desktop convention) / `hover` (hover opens directly) | — | — |
| `value` | Selected value. As a plain string it is a single global selection (no-group scenarios, backward compatible); as a JSON object string (e.g. `{"mode":"preview","theme":"dark"}`) selections are recorded per group id — the `value` of a `type:"group"` item acts as the group id; as a JSON array string (e.g. `["grid","wrap"]`) it is the checkbox checked-set (`kind:"checkbox"` items, multi-select) | `string` | — |

| Event | Description |
| --- | --- |
| `oas-open-change` | The open top-level menu changed, `detail: { value, open }` (`value` = currently open top-level menu value, `open` = whether anything is open). Fired both on controlled `setAttribute('open')` and internal click/hover/keyboard changes (not on the first frame) |
| `oas-select` | An item was selected, `detail: { value, kind?, checked? }`. `kind` only appears for action items (`kind: "action"`); checkbox items carry `checked` (new checked state); radio items omit `detail.kind` |

| Name | Description |
| --- | --- |
| `end` | Trailing decorative slot (e.g. avatar): `<div slot="end">` renders when it has content; keyboard navigation skips it |
| `start` | Leading decorative slot (e.g. logo): `<div slot="start">` renders when it has content; keyboard navigation skips it |

### oas-menubar-item

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `access-key` | Alt access key (single character); defaults to the first ASCII letter of the label | — | — |
| `danger` | Destructive item: danger color semantics (delete/logout operations) | — | — |
| `disabled` | Disable this item | — | — |
| `href` | Link URL: with `href` the item renders as a native `<a>` (real navigation + still fires `oas-select`) | — | — |
| `icon` | Leading icon (`@oas-ui/icons` registry icon name) | — | — |
| `icon-color` | Icon color: fixes the icon to this color (overrides the selected/disabled default); defaults to `currentColor` following the text color | — | — |
| `indeterminate` | Checkbox indeterminate state: renders `aria-checked="mixed"` + a dash inside the box (only for `kind="checkbox"` items) | — | — |
| `kind` | Leaf semantics: `radio` (default, selectable) / `action` (no checked state, does not write back `value`) / `checkbox` (multi-select, `value` is the checked-set array) | — | — |
| `rel` | Link rel (with `href`) | — | — |
| `shortcut` | Shortcut hint (e.g. `"Ctrl+N"`): rendered as a trailing kbd + a document-level keydown binding that triggers select on hit | — | — |
| `target` | Link target (with `href`) | — | — |
| `value` | Selection value (data-carrier field of the declarative child channel) | — | — |

| Name | Description |
| --- | --- |
| default | Menubar item label content (default slot text); direct child `<oas-menubar-item>`/`<oas-menubar-group>`/`<oas-menubar-divider>` elements recursively become the submenu `children` |

### oas-menubar-group

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `label` | Group title (small secondary text, not clickable) | — | — |
| `value` | Radio group id (picking inside the group only updates that group's selected value) | — | — |

| Name | Description |
| --- | --- |
| default | Group items: child `<oas-menubar-item>`/`<oas-menubar-group>`/`<oas-menubar-divider>` elements flatten to the same level |

### oas-menubar-divider

| Name | Description |
| --- | --- |
| default | Divider data carrier (no attributes; the host parses it as `type: "divider"`) |

> **Event detail note**: the `detail` of `oas-select` is a component-internal object (`value`/`kind`) — **not** a native `Event`, so you can't `preventDefault()` on it or read a native `event.target` from it. To reach the native event, use the outer parameter of your listener (e.g. in `addEventListener('oas-select', (e) => ...)`, `e` is a `CustomEvent` and `e.detail` is the component data).

`MenubarItem` fields (inherits `MenuItem`):

| Field       | Description                                                       | Type          |
| ----------- | ----------------------------------------------------------------- | ------------- |
| `label`     | Menu text                                                         | `string`      |
| `value`     | Selection value (declared in the items JSON; after render the host tag carries a `data-value` lowercased attribute for internal lookup — hosts shouldn't rely on it as public API) | `string` |
| `kind`      | Leaf semantics: `radio` (default, checkable, participates in `value`) / `action` (action item, no checkmark, doesn't write back `value` on click) | `string` |
| `shortcut`  | Shortcut hint (e.g. `"Ctrl+N"`); renders as a right-side kbd and auto-binds a `document`-level keydown (selects the item on match, `preventDefault`) | `string` |
| `accessKey` | `Alt` access key (single character); defaults to the first ASCII letter of `label` | `string` |
| `disabled`  | Disabled                                                          | `boolean`     |
| `children`  | Submenu items (nested recursively, cascading to the right)        | `MenubarItem[]` |

Keyboard: at top level `←`/`→` switch, `↓`/`Enter` opens the submenu, `Esc` closes; inside a submenu `↑`/`↓` move, `→` enters a cascading submenu, `←` returns to the parent; `Home`/`End` jump. Pressing `Alt` alone focuses the menu bar, `Alt + access key` opens the matching top-level menu. While a submenu is open, `Tab` cycles among its items (focus trap); `roving tabindex` keeps only the current top-level item tab-reachable.
