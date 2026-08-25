# Command

A command palette (⌘K to invoke, hotkey configurable) — search filtering, score-based ranking, keyboard selection, Enter to execute, nested sub-pages, recent history and multi-select batch run. `open` is controlled: it can be set externally, and the configurable global shortcut or Esc closes it (each open/close fires one `oas-open-change`).

## Basic usage

<DemoBlock title="Basic usage (open with ⌘J / Ctrl+J)">
  <oas-command id="command-basic" hotkey="mod+j" onoas-select="commandLog(event)" items='[{"label":"New file","value":"new-file","keywords":["create","file"],"group":"File"},{"label":"Open file","value":"open-file","group":"File"},{"label":"Save","value":"save","group":"File"},{"label":"Undo","value":"undo","keywords":["ctrl z"],"group":"Edit"},{"label":"Redo","value":"redo","keywords":["ctrl y"],"group":"Edit"},{"label":"Select all","value":"select-all","keywords":["select"],"group":"Edit"}]'></oas-command>
  <oas-tag id="command-result" type="info">Press ⌘J / Ctrl+J to open the command palette, or control open externally (the docs site search uses Ctrl+K, so this demo uses Ctrl+J)</oas-tag>
</DemoBlock>

## Controlled open

The `open` attribute is externally controlled: an external button sets `open` to open the palette; it closes via Esc / backdrop click / selecting a command (the component removes `open`; the host syncs state through `oas-open-change`).

> When open, the backdrop covers the full screen, so no external "close" button is provided — use Esc / click the backdrop / select a command to close.

<DemoBlock title="Externally controlled open (sync via oas-open-change)">
  <oas-space size="small">
    <oas-button type="primary" onclick="cmdOpen()">Open command palette</oas-button>
    <oas-tag id="command-ctrl-status" type="info">open: false</oas-tag>
    <oas-tag id="command-ctrl-selected" type="success">Nothing selected</oas-tag>
  </oas-space>
  <oas-command id="command-controlled" hotkey="false" onoas-select="commandCtrlSelect(event)" items='[{"label":"Set theme","value":"theme","group":"Appearance"},{"label":"Toggle dark mode","value":"dark","group":"Appearance"},{"label":"View shortcuts","value":"shortcuts","group":"Help"}]'></oas-command>
</DemoBlock>

## Groups and empty state

Group titles render from the `group` field; an empty state shows when nothing matches (plain "No matching commands" when the query is empty, or "No commands found for "word"" with a search term).

<DemoBlock title="Groups and empty state">
  <oas-command id="command-empty" hotkey="false" items='[{"label":"Deploy","value":"deploy","group":"Actions"},{"label":"Rollback","value":"rollback","group":"Actions"}]'></oas-command>
  <oas-space size="small">
    <oas-button id="command-empty-btn" type="primary">Open (try searching "deploy" and "xyz")</oas-button>
    <oas-tag id="command-empty-result" type="info">Nothing selected</oas-tag>
  </oas-space>
</DemoBlock>

## Icons · descriptions · shortcut labels

Item fields `icon` (SVG path `d` or a full `<svg>` markup), `description` (secondary line) and `shortcut` (right-aligned kbd with `meta`/`ctrl`/`shift`/`alt` symbol mapping).

<DemoBlock title="Icon + description + shortcut">
  <oas-command id="command-icons" hotkey="false" items='[{"label":"New file","value":"new-file","icon":"M4 4h16v16H4z","shortcut":"meta+n","description":"Create a blank document","group":"File"},{"label":"Open file","value":"open-file","icon":"M4 4h16v16H4z","shortcut":"ctrl+o","description":"Open recent documents","group":"File"},{"label":"Save","value":"save","icon":"M4 4h16v16H4z","shortcut":"ctrl+s","description":"Save current document","group":"File"},{"label":"Undo","value":"undo","shortcut":"ctrl+z","group":"Edit"},{"label":"Settings","value":"settings","icon":"M4 4h16v16H4z","description":"Open preferences","group":"System"}]'></oas-command>
  <oas-space size="small">
    <oas-button id="command-icons-btn" type="primary">Open</oas-button>
    <oas-tag id="command-icons-result" type="info">Nothing selected</oas-tag>
  </oas-space>
</DemoBlock>

## Configurable invocation shortcut

The `hotkey` attribute configures the combo (`mod`/`meta`/`ctrl`/`alt`/`shift`, comma-separated for multiple); `false` disables the built-in listener. Default is `mod+k` (⌘K / Ctrl+K).

<DemoBlock title="Custom shortcut (ctrl+shift+p) and disabled">
  <oas-space size="small">
    <oas-tag id="command-hotkey-status" type="info">closed (press ctrl+shift+p to open)</oas-tag>
    <oas-button id="command-hotkey-btn" type="primary">Open externally</oas-button>
  </oas-space>
  <oas-command id="command-hotkey" hotkey="ctrl+shift+p" items='[{"label":"Open terminal","value":"terminal","shortcut":"ctrl+shift+`"},{"label":"Open task manager","value":"tasks"},{"label":"Restart app","value":"restart"}]'></oas-command>
  <oas-space size="small">
    <oas-button id="command-no-hotkey-btn" type="default">The instance below has hotkey="false" (⌘K will not open it)</oas-button>
  </oas-space>
  <oas-command id="command-no-hotkey" hotkey="false" items='[{"label":"Hotkey-disabled instance","value":"disabled-hotkey"}]'></oas-command>
</DemoBlock>

## Match highlighting

While searching, the matched characters in the label are wrapped in `<mark>` — instant feedback as you type.

<DemoBlock title="Search highlight">
  <oas-command id="command-highlight" hotkey="false" items='[{"label":"File manager","value":"files","group":"Tools"},{"label":"Open file","value":"open-file","group":"Tools"},{"label":"Recent files","value":"recent-files","group":"Tools"},{"label":"Compare files","value":"diff","group":"Tools"},{"label":"Terminal","value":"terminal","group":"System"}]'></oas-command>
  <oas-space size="small">
    <oas-button id="command-highlight-btn" type="primary">Open (type "file" to see highlighting)</oas-button>
    <oas-tag id="command-highlight-result" type="info">Nothing selected</oas-tag>
  </oas-space>
</DemoBlock>

## External filtering (should-filter=false)

`should-filter="false"` disables built-in filtering and ranking — filtering is fully delegated to the host: the component fires `oas-input` as you type, and the host requests an async data source and writes back `items`. This demo simulates a 600ms server search; when there are no results it returns a `forceMount` "create" entry (rendered regardless of filtering).

<DemoBlock title="should-filter=false + async data source">
  <oas-command id="command-filter" should-filter="false" hotkey="false" items='[{"label":"Open file","value":"open-file","group":"File"},{"label":"Open settings","value":"open-settings","group":"System"},{"label":"New document","value":"new-doc","group":"File"},{"label":"Open palette","value":"open-palette","group":"System"}]'></oas-command>
  <oas-space size="small">
    <oas-button id="command-filter-btn" type="primary">Open (type "open")</oas-button>
    <oas-tag id="command-filter-output" type="info">All commands</oas-tag>
  </oas-space>
</DemoBlock>

## Empty-state slot

`slot="empty"` customizes the empty result rendering (replacing the default "No commands found…" text); the host reads the current query via `el.query`. Example: a "create xxx" button when nothing matches.

<DemoBlock title="Empty-state slot">
  <oas-command id="command-empty-slot" hotkey="false" items='[{"label":"Deploy","value":"deploy"},{"label":"Rollback","value":"rollback"}]'>
    <div slot="empty" style="display:flex;flex-direction:column;align-items:center;gap:8px">
      <span>No matching commands</span>
      <oas-button type="primary" size="small" onclick="commandEmptySlotCreate()">Create "<span id="command-empty-slot-q">…</span>"</oas-button>
    </div>
  </oas-command>
  <oas-space size="small">
    <oas-button id="command-empty-slot-btn" type="primary">Open (search "xyz" to see the slot)</oas-button>
    <oas-tag id="command-empty-slot-result" type="info">Nothing created</oas-tag>
  </oas-space>
</DemoBlock>

## Nested pages / breadcrumb fallback

The item field `page` (array of commands) defines a sub-page: selecting it enters the sub-page (a breadcrumb bar with a back button appears at the top), `Esc` or `Backspace` with an empty query goes back, and only at the root does `Esc` close the panel. Each push/pop fires one `oas-page-change`.

<DemoBlock title="Nested pages">
  <oas-command id="command-pages" hotkey="false" items='[{"label":"Change theme","value":"theme","page":[{"label":"Light","value":"light"},{"label":"Dark","value":"dark"},{"label":"Follow system","value":"system"}]},{"label":"Change language","value":"lang","page":[{"label":"简体中文","value":"zh"},{"label":"English","value":"en"}]},{"label":"Open settings","value":"settings"},{"label":"About this app","value":"about"}]'></oas-command>
  <oas-space size="small">
    <oas-button id="command-pages-btn" type="primary">Open (select "Change theme" to enter the sub-page)</oas-button>
    <oas-tag id="command-pages-result" type="info">Nothing selected</oas-tag>
  </oas-space>
</DemoBlock>

## Declarative child-element channel

Besides the `items` JSON, commands can be declared with `<oas-command-item>` child elements (`items` **takes precedence when explicitly set**; otherwise the child elements are parsed and converge onto the same rendering path). The default slot text becomes the label, and attributes align with the `items` fields: `value` / `group` / `disabled` / `icon` / `shortcut` / `description` / `view` / `force-mount` / `separator`; `keywords` is a comma-separated string participating in search matching. Nested `<oas-command-item>` elements directly inside an item recursively become its `page` sub-page. Child additions/removals, attribute and text changes re-render automatically (MutationObserver).

<DemoBlock title="Declarative children (groups / separator / shortcuts / nested sub-page)">
  <oas-command id="command-decl" hotkey="false" onoas-select="commandDeclLog(event)">
    <oas-command-item value="new-file" group="File" shortcut="meta+n" description="Create a blank document">New file</oas-command-item>
    <oas-command-item value="open-file" group="File" shortcut="ctrl+o" description="Open recent documents">Open file</oas-command-item>
    <oas-command-item value="sep1" separator>Separator</oas-command-item>
    <oas-command-item value="theme">Change theme
      <oas-command-item value="light">Light</oas-command-item>
      <oas-command-item value="dark">Dark</oas-command-item>
    </oas-command-item>
    <oas-command-item value="undo" group="Edit" shortcut="ctrl+z">Undo</oas-command-item>
  </oas-command>
  <oas-space size="small">
    <oas-button id="command-decl-btn" type="primary">Open (no `items` set — uses the child channel)</oas-button>
    <oas-button id="command-decl-add" type="default">Dynamically append an item</oas-button>
    <oas-tag id="command-decl-result" type="info">Nothing selected</oas-tag>
  </oas-space>
</DemoBlock>

## Recent history

`recent` tracks recently used commands: selected items are pinned to the top (deduped, capped at 10); `recent-storage-key` enables localStorage persistence (restored across instances). This demo swaps the item set after selection to simulate "command set changes" — reopen to see the "Recent" group.

<DemoBlock title="Recent history (localStorage persistence)">
  <oas-command id="command-recent" recent recent-storage-key="command-demo" hotkey="false" items='[{"label":"Deploy to production","value":"deploy","group":"Actions"},{"label":"Rollback release","value":"rollback","group":"Actions"},{"label":"View logs","value":"logs","group":"Actions"},{"label":"Clear cache","value":"clear-cache","group":"Ops"}]'></oas-command>
  <oas-space size="small">
    <oas-button id="command-recent-btn" type="primary">Open (select a few items, then reopen to see recents pinned)</oas-button>
    <oas-tag id="command-recent-result" type="info">Nothing selected</oas-tag>
  </oas-space>
</DemoBlock>

## Loading and limit

`loading` shows an async loading placeholder (spinner row + `aria-busy`); `limit` caps the rendered item count (default 50).

<DemoBlock title="Loading and limit">
  <oas-command id="command-loading" hotkey="false" items='[{"label":"Task A","value":"a"},{"label":"Task B","value":"b"}]'></oas-command>
  <oas-command id="command-limit" hotkey="false" limit="3" items='[{"label":"Command 0","value":"c0"},{"label":"Command 1","value":"c1"},{"label":"Command 2","value":"c2"},{"label":"Command 3","value":"c3"},{"label":"Command 4","value":"c4"},{"label":"Command 5","value":"c5"}]'></oas-command>
  <oas-space size="small">
    <oas-button id="command-loading-btn" type="primary">Open first and toggle loading</oas-button>
    <oas-button id="command-limit-btn" type="default">Open second (limit=3)</oas-button>
    <oas-tag id="command-limit-result" type="info">limit renders only the first 3 items</oas-tag>
  </oas-space>
</DemoBlock>

## Multiple-select commands

`multiple` mode: Enter/click toggles checks (fires `oas-change { values }`), and a "Run n" confirm button in the footer executes the batch (fires `oas-select { values }`).

<DemoBlock title="Multi-select batch run">
  <oas-command id="command-multi" multiple hotkey="false" items='[{"label":"Remove unused variables","value":"unused","group":"Cleanup"},{"label":"Format code","value":"format","group":"Cleanup"},{"label":"Minify assets","value":"minify","group":"Cleanup"},{"label":"Generate type definitions","value":"dts","group":"Build"},{"label":"Run tests","value":"test","group":"Build"}]'></oas-command>
  <oas-space size="small">
    <oas-button id="command-multi-btn" type="primary">Open (check several items, then press "Run n" in the footer)</oas-button>
    <oas-tag id="command-multi-result" type="info">Nothing executed</oas-tag>
  </oas-space>
</DemoBlock>

## In-panel views (Raycast style)

The item field `view` defines a view: selecting it renders the form/panel carried by `<slot name="view-{view}">` (deploy params, quick actions…), `Esc`/breadcrumb goes back. Each enter/exit fires one `oas-view-change`.

<DemoBlock title="View slot (deploy form)">
  <oas-command id="command-views" hotkey="false" items='[{"label":"Deploy app","value":"deploy","view":"deploy"},{"label":"Notify members","value":"notify","view":"notify"},{"label":"Open settings","value":"settings"}]'>
    <div slot="view-deploy" style="display:flex;flex-direction:column;gap:12px;padding:8px 4px">
      <oas-input placeholder="Environment (prod / staging)"></oas-input>
      <oas-space size="small">
        <oas-button type="primary" size="small" onclick="commandViewDeploy()">Run deploy</oas-button>
        <oas-tag type="info">Esc returns to the command list</oas-tag>
      </oas-space>
    </div>
    <div slot="view-notify" style="display:flex;flex-direction:column;gap:12px;padding:8px 4px">
      <oas-input placeholder="Member emails, comma separated"></oas-input>
      <oas-button type="primary" size="small" onclick="commandViewNotify()">Send notification</oas-button>
    </div>
  </oas-command>
  <oas-space size="small">
    <oas-button id="command-views-btn" type="primary">Open (select "Deploy app" to enter the form)</oas-button>
    <oas-tag id="command-views-result" type="info">Nothing done</oas-tag>
  </oas-space>
</DemoBlock>

## Controlled query and active item

`value` is the controlled search query (two-way by echoing `oas-input` back); `selected` is the controlled active item (the host echoes `oas-active` back). `close-on-select="false"` keeps the panel open after selection for consecutive actions.

<DemoBlock title="Controlled value / selected">
  <oas-command id="command-controlled-state" value="file" selected="open-file" close-on-select="false" hotkey="false" items='[{"label":"New file","value":"new-file","group":"File"},{"label":"Open file","value":"open-file","group":"File"},{"label":"Save","value":"save","group":"File"},{"label":"Undo","value":"undo","group":"Edit"}]'></oas-command>
  <oas-space size="small">
    <oas-button id="command-controlled-state-btn" type="primary">Open (value/selected two-way controlled)</oas-button>
    <oas-tag id="command-controlled-value" type="info">value: file</oas-tag>
    <oas-tag id="command-controlled-active" type="success">active: open-file</oas-tag>
    <oas-tag id="command-controlled-exec" type="warning">Nothing executed</oas-tag>
  </oas-space>
</DemoBlock>

## Custom footer

`slot="footer"` replaces the default shortcut hints (`↑↓ navigate / ↵ select / esc close`).

<DemoBlock title="Footer slot">
  <oas-command id="command-footer" hotkey="false" items='[{"label":"Open file","value":"open-file"},{"label":"Save","value":"save"}]'>
    <span slot="footer">↑↓ navigate · ↵ select · esc close</span>
  </oas-command>
  <oas-space size="small">
    <oas-button id="command-footer-btn" type="primary">Open (see the custom footer hints)</oas-button>
    <oas-tag id="command-footer-result" type="info">Nothing selected</oas-tag>
  </oas-space>
</DemoBlock>

## Mount container (append-to)

`append-to`: the whole panel (backdrop + palette) moves into a portal host inside the target container (isolated shadow + style injection + slot bridging — `empty`/`footer`/`view-*` slot content travels with the panel), for nested transform / stacking-context scenarios.

<DemoBlock title="append-to mount container">
  <oas-space size="small">
    <oas-button id="command-append-btn" type="primary">Open (the panel mounts into the container below)</oas-button>
    <oas-tag id="command-append-result" type="info">Nothing selected</oas-tag>
  </oas-space>
  <oas-command id="command-append" append-to="#command-append-panel" hotkey="false" items='[{"label":"Open file","value":"open-file"},{"label":"Save","value":"save"}]'>
    <span slot="footer">↑↓ navigate · ↵ select · esc close (travels with the panel)</span>
  </oas-command>
  <div id="command-append-panel" style="position: relative; width: 100%; height: 240px; margin-top: 16px; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md)"></div>
</DemoBlock>

## Virtual scrolling

`virtual` enables windowed rendering for large datasets (reuses oas-virtual-list; falls back to full rendering when groups or recents are present). This demo preloads 20,000 commands and renders only the visible window.

<DemoBlock title="Virtual scrolling (20k items)">
  <oas-command id="command-virtual" virtual item-height="36" hotkey="false" items='[]'></oas-command>
  <oas-space size="small">
    <oas-button id="command-virtual-btn" type="primary">Open (20k items, arrow keys to scroll)</oas-button>
    <oas-tag id="command-virtual-result" type="info">Nothing selected</oas-tag>
  </oas-space>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  window.commandLog = (e) => {
    const tag = document.getElementById('command-result')
    if (tag) tag.textContent = `Selected: ${e.detail.value}`
  }

  // Controlled open: sync state via oas-open-change (instead of MutationObserver)
  const ctrl = document.getElementById('command-controlled')
  const ctrlStatus = document.getElementById('command-ctrl-status')
  const ctrlSelected = document.getElementById('command-ctrl-selected')
  if (ctrl && ctrlStatus) {
    const sync = () => {
      ctrlStatus.textContent = `open: ${ctrl.hasAttribute('open')}`
    }
    window.cmdOpen = () => ctrl.setAttribute('open', '')
    window.commandCtrlSelect = (e) => {
      if (ctrlSelected) ctrlSelected.textContent = `Selected: ${e.detail.value}`
    }
    sync()
    ctrl.addEventListener('oas-open-change', sync)
  }

  // Groups and empty state
  document.getElementById('command-empty-btn')?.addEventListener('click', () => {
    document.getElementById('command-empty')?.setAttribute('open', '')
  })
  document.getElementById('command-empty')?.addEventListener('oas-select', (e) => {
    const tag = document.getElementById('command-empty-result')
    if (tag) tag.textContent = `Selected: ${e.detail.value}`
  })

  // Icons / descriptions / shortcuts
  document.getElementById('command-icons-btn')?.addEventListener('click', () => {
    document.getElementById('command-icons')?.setAttribute('open', '')
  })
  document.getElementById('command-icons')?.addEventListener('oas-select', (e) => {
    const tag = document.getElementById('command-icons-result')
    if (tag) tag.textContent = `Selected: ${e.detail.value}`
  })

  // Custom shortcut
  const hotkeyEl = document.getElementById('command-hotkey')
  const hotkeyStatus = document.getElementById('command-hotkey-status')
  if (hotkeyEl && hotkeyStatus) {
    hotkeyEl.addEventListener('oas-open-change', (e) => {
      hotkeyStatus.textContent = e.detail.open
        ? 'open (press ctrl+shift+p or Esc to close)'
        : 'closed (press ctrl+shift+p to open)'
    })
  }
  document.getElementById('command-hotkey-btn')?.addEventListener('click', () => {
    document.getElementById('command-hotkey')?.setAttribute('open', '')
  })
  document.getElementById('command-no-hotkey-btn')?.addEventListener('click', () => {
    const el = document.getElementById('command-no-hotkey')
    el?.toggleAttribute('open')
  })

  // Match highlighting
  document.getElementById('command-highlight-btn')?.addEventListener('click', () => {
    document.getElementById('command-highlight')?.setAttribute('open', '')
  })
  document.getElementById('command-highlight')?.addEventListener('oas-select', (e) => {
    const tag = document.getElementById('command-highlight-result')
    if (tag) tag.textContent = `Selected: ${e.detail.value}`
  })

  // should-filter=false external filtering (simulated async data source, 600ms)
  const filterEl = document.getElementById('command-filter')
  const filterOut = document.getElementById('command-filter-output')
  const FILTER_ALL = [
    { label: 'Open file', value: 'open-file', group: 'File' },
    { label: 'Open settings', value: 'open-settings', group: 'System' },
    { label: 'New document', value: 'new-doc', group: 'File' },
    { label: 'Open palette', value: 'open-palette', group: 'System' },
  ]
  let filterTimer = 0
  if (filterEl && filterOut) {
    filterEl.addEventListener('oas-input', (e) => {
      const q = e.detail.value
      window.clearTimeout(filterTimer)
      filterEl.setAttribute('loading', '')
      filterOut.textContent = `Requesting… ("${q}")`
      filterTimer = window.setTimeout(() => {
        if (!filterEl.isConnected) return
        filterEl.removeAttribute('loading')
        const matched = FILTER_ALL.filter((i) => i.label.toLowerCase().includes(q.toLowerCase()))
        const list = q
          ? matched.length > 0
            ? matched
            : [{ label: `Create "${q}"`, value: `create:${q}`, forceMount: true }]
          : FILTER_ALL
        filterEl.setAttribute('items', JSON.stringify(list))
        filterOut.textContent = q ? `Server returned ${matched.length} results` : 'All commands'
      }, 600)
    })
  }
  document.getElementById('command-filter-btn')?.addEventListener('click', () => {
    document.getElementById('command-filter')?.setAttribute('open', '')
  })

  // Empty-state slot
  const emptySlot = document.getElementById('command-empty-slot')
  if (emptySlot) {
    window.commandEmptySlotCreate = () => {
      const q = emptySlot.query
      const tag = document.getElementById('command-empty-slot-result')
      if (tag) tag.textContent = `Created: ${q || '…'}`
    }
    emptySlot.addEventListener('oas-input', () => {
      const qEl = document.getElementById('command-empty-slot-q')
      if (qEl) qEl.textContent = emptySlot.query || '…'
    })
  }
  document.getElementById('command-empty-slot-btn')?.addEventListener('click', () => {
    document.getElementById('command-empty-slot')?.setAttribute('open', '')
  })

  // Nested pages
  document.getElementById('command-pages-btn')?.addEventListener('click', () => {
    document.getElementById('command-pages')?.setAttribute('open', '')
  })
  document.getElementById('command-pages')?.addEventListener('oas-select', (e) => {
    const tag = document.getElementById('command-pages-result')
    if (tag) tag.textContent = `Selected: ${e.detail.value}`
  })

  // Declarative child channel: open + dynamic append (MutationObserver auto-refresh)
  const declEl = document.getElementById('command-decl')
  if (declEl) {
    window.commandDeclLog = (e) => {
      const tag = document.getElementById('command-decl-result')
      if (tag) tag.textContent = `Selected: ${e.detail.value}`
    }
    document.getElementById('command-decl-add')?.addEventListener('click', () => {
      const n = declEl.children.length + 1
      const item = document.createElement('oas-command-item')
      item.setAttribute('value', `dyn-${n}`)
      item.textContent = `Dynamic command ${n}`
      declEl.appendChild(item)
    })
  }
  document.getElementById('command-decl-btn')?.addEventListener('click', () => {
    document.getElementById('command-decl')?.setAttribute('open', '')
  })

  // Recent history: swap the command set after selection so the "Recent" group is visible on reopen
  const recentEl = document.getElementById('command-recent')
  const RECENT_NEXT = [
    { label: 'View system status', value: 'sysinfo', group: 'Ops' },
    { label: 'Network diagnostics', value: 'netdiag', group: 'Ops' },
    { label: 'Disk cleanup', value: 'diskclean', group: 'Ops' },
  ]
  if (recentEl) {
    recentEl.addEventListener('oas-select', (e) => {
      const tag = document.getElementById('command-recent-result')
      if (tag) tag.textContent = `Selected: ${e.detail.value}`
      // Simulate a changed command set: those commands are gone next time, recents show history
      recentEl.setAttribute('items', JSON.stringify(RECENT_NEXT))
    })
  }
  document.getElementById('command-recent-btn')?.addEventListener('click', () => {
    document.getElementById('command-recent')?.setAttribute('open', '')
  })

  // Loading / limit
  const loadingEl = document.getElementById('command-loading')
  document.getElementById('command-loading-btn')?.addEventListener('click', () => {
    if (!loadingEl) return
    if (loadingEl.hasAttribute('open')) {
      loadingEl.toggleAttribute('loading')
    } else {
      loadingEl.setAttribute('open', '')
    }
  })
  document.getElementById('command-limit-btn')?.addEventListener('click', () => {
    document.getElementById('command-limit')?.setAttribute('open', '')
  })

  // Multi-select
  const multiEl = document.getElementById('command-multi')
  const multiOut = document.getElementById('command-multi-result')
  if (multiEl && multiOut) {
    multiEl.addEventListener('oas-select', (e) => {
      multiOut.textContent = `Executed: ${e.detail.values.join(', ')}`
    })
  }
  document.getElementById('command-multi-btn')?.addEventListener('click', () => {
    document.getElementById('command-multi')?.setAttribute('open', '')
  })

  // View slots
  const viewsEl = document.getElementById('command-views')
  if (viewsEl) {
    window.commandViewDeploy = () => {
      const tag = document.getElementById('command-views-result')
      if (tag) tag.textContent = 'Deploy triggered (form lives in the view slot)'
    }
    window.commandViewNotify = () => {
      const tag = document.getElementById('command-views-result')
      if (tag) tag.textContent = 'Notification sent'
    }
  }
  document.getElementById('command-views-btn')?.addEventListener('click', () => {
    document.getElementById('command-views')?.setAttribute('open', '')
  })

  // Controlled value / selected
  const csEl = document.getElementById('command-controlled-state')
  const csValue = document.getElementById('command-controlled-value')
  const csActive = document.getElementById('command-controlled-active')
  const csExec = document.getElementById('command-controlled-exec')
  if (csEl && csValue) {
    csEl.addEventListener('oas-input', (e) => {
      csEl.setAttribute('value', e.detail.value)
      csValue.textContent = `value: ${e.detail.value}`
    })
    csEl.addEventListener('oas-active', (e) => {
      csEl.setAttribute('selected', e.detail.value)
      if (csActive) csActive.textContent = `active: ${e.detail.value}`
    })
    csEl.addEventListener('oas-select', (e) => {
      if (csExec) csExec.textContent = `Executed: ${e.detail.value}`
    })
  }
  document.getElementById('command-controlled-state-btn')?.addEventListener('click', () => {
    document.getElementById('command-controlled-state')?.setAttribute('open', '')
  })

  // Footer slot
  document.getElementById('command-footer-btn')?.addEventListener('click', () => {
    document.getElementById('command-footer')?.setAttribute('open', '')
  })
  document.getElementById('command-footer')?.addEventListener('oas-select', (e) => {
    const tag = document.getElementById('command-footer-result')
    if (tag) tag.textContent = `Selected: ${e.detail.value}`
  })

  // append-to mount container
  document.getElementById('command-append-btn')?.addEventListener('click', () => {
    document.getElementById('command-append')?.setAttribute('open', '')
  })
  document.getElementById('command-append')?.addEventListener('oas-select', (e) => {
    const tag = document.getElementById('command-append-result')
    if (tag) tag.textContent = `Selected: ${e.detail.value}`
  })

  // Virtual scrolling: preload 20,000 items
  const virtualEl = document.getElementById('command-virtual')
  if (virtualEl) {
    const rows = Array.from({ length: 20000 }, (_, i) => ({
      label: `Command ${i}`,
      value: `cmd-${i}`,
      keywords: [`v${i}`],
    }))
    virtualEl.setAttribute('items', JSON.stringify(rows))
  }
  document.getElementById('command-virtual-btn')?.addEventListener('click', () => {
    document.getElementById('command-virtual')?.setAttribute('open', '')
  })
  document.getElementById('command-virtual')?.addEventListener('oas-select', (e) => {
    const tag = document.getElementById('command-virtual-result')
    if (tag) tag.textContent = `Selected: ${e.detail.value}`
  })
})
</script>

## API

### oas-command

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `append-to` | Mount container selector (e.g. `#panel`): the whole panel (backdrop + palette) moves into a portal host inside the target container (isolated shadow + style injection + slot bridging — empty/footer/view-* slots travel with the panel), for nested transform/stacking-context scenarios; without it the panel is fixed-positioned inside the component's own shadow | `string` | — |
| `close-on-select` | Close the panel after selecting (default true; `false` keeps it open for consecutive actions) | `string` | — |
| `hotkey` | Invocation shortcut combos, e.g. `ctrl+k` / `meta+shift+p` (comma-separated for multiple; supports mod/meta/ctrl/alt/shift); `false` disables the built-in listener (default `mod+k`) | `string` | `mod+k` |
| `item-height` | Virtual row height (default `36`) | `string` | `36` |
| `items` | Command items JSON (root page; sub-pages via `item.page`, supports `icon` / `shortcut` / `description` / `page` / `view` / `forceMount` / `separator` fields) | `CommandItem[] \| string` | `[]` |
| `limit` | Max rendered items (default `50`; not applied in virtual mode) | `string` | `50` |
| `loading` | Async loading placeholder (loading row in the list + `aria-busy`) | `boolean` | — |
| `multiple` | Multiple-select mode (toggle checks + batch run via the footer confirm button) | `boolean` | — |
| `open` | Whether open (controlled; auto-removed after selection / Esc; fires `oas-open-change` on open and close) | `boolean` | — |
| `recent` | Track recently used (selected items pinned to top, deduped, capped at 10) | `boolean` | — |
| `recent-storage-key` | localStorage key for recent persistence (requires `recent`; restored across instances) | `string` | — |
| `selected` | Active item value (controlled; arrow keys / hover fire `oas-active` for the host to echo back) | `string` | — |
| `should-filter` | `false` disables built-in filtering and score sorting (filtering delegated to the host, for async/server data sources) | `string` | `true` |
| `value` | Search query (controlled; two-way via `oas-input` echo-back) | `string` | — |
| `virtual` | Virtual scrolling for large datasets (reuses oas-virtual-list) | `boolean` | — |

| Event | Description |
| --- | --- |
| `oas-active` | Active item changed, `detail: { value }` (basis for controlled `selected` echo-back) |
| `oas-change` | Multi-select toggle, `detail: { values }` |
| `oas-input` | Search input, `detail: { value }` (request channel for `should-filter=false` external filtering) |
| `oas-open-change` | Panel opened/closed, `detail: { open }` |
| `oas-page-change` | Sub-page pushed/popped, `detail: { title, depth, direction }` (`direction: push\|pop`) |
| `oas-select` | A command was executed, `detail: { value }`; multi-select confirm `detail: { values }` |
| `oas-view-change` | View entered/exited, `detail: { view, title }` (exiting sends `view: ''`) |

| Name | Description |
| --- | --- |
| `empty` | Custom empty state (read the current query via `el.query`, e.g. a "create xyz" entry) |
| `footer` | Custom footer bar (defaults to `↑↓ navigate / ↵ select / esc close` hints) |

### oas-command-item

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `description` | Secondary description line | — | — |
| `disabled` | Disable this item (not selectable via Enter/click, skipped by arrow keys) | — | — |
| `force-mount` | Ignore filtering and always render (create-type entry) | — | — |
| `group` | Group name (optional); same-group items render a group title | — | — |
| `icon` | Item icon: SVG path `d` string or a full `<svg>` markup | — | — |
| `keywords` | Search keywords (comma-separated string, trimmed into `string[]`), matched in addition to the label | — | — |
| `separator` | Render as a separator row (not navigable/selectable) | — | — |
| `shortcut` | Shortcut label (right-aligned kbd), e.g. `meta+p` / `ctrl+shift+s` | — | — |
| `value` | Selection value (data-carrier field of the declarative child channel) | — | — |
| `view` | View slot name: selecting enters `<slot name="view-{view}">` (in-panel view) | — | — |

| Name | Description |
| --- | --- |
| default | Command item label content (default slot text); direct child `<oas-command-item>` elements recursively become the `page` sub-page |

`CommandItem` fields:

| Field      | Description                                        | Type       |
| ---------- | -------------------------------------------------- | ---------- |
| `label`    | Display text                                       | `string`   |
| `value`    | Selected value (`oas-select` detail.value)         | `string`   |
| `keywords` | Search keywords (optional), matched in addition to the label | `string[]` |
| `group`    | Group name (optional); same-group items render a group title | `string`   |
| `disabled` | Disables the item (not selectable via Enter/click, skipped by arrow keys) | `boolean` |

Keyboard: `↑`/`↓` move the highlight (skipping disabled items), `Enter` executes and closes (multi-select toggles checks), `Esc` closes (sub-pages pop first), `Backspace` with an empty query pops a sub-page, `Tab` cycles between the search input and the options (focus trap); on open the search input is focused, and on close focus returns to the source element. The global shortcut defaults to `⌘K` / `Ctrl+K` (`hotkey` is configurable or can be disabled).
