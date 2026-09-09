# List

Displays a collection of related items, capable of carrying a title, description, and extra actions.

## Basic Usage

<DemoBlock title="Bordered list">
  <div style="width: 100%">
    <oas-list bordered>
      <oas-list-item title="Requirements Review">
        <span slot="description">Iteration v1.0 requirements list</span>
      </oas-list-item>
      <oas-list-item title="Development Complete">
        <span slot="description">All component unit tests pass</span>
      </oas-list-item>
      <oas-list-item title="Released">
        <span slot="description">Docs site deployed</span>
        <oas-tag slot="extra" type="success">Released</oas-tag>
      </oas-list-item>
    </oas-list>
  </div>
</DemoBlock>

## Without Border

<DemoBlock title="Default dividers">
  <div style="width: 100%">
    <oas-list>
      <oas-list-item title="Documentation">
        <span slot="description">Only item dividers remain</span>
      </oas-list-item>
      <oas-list-item title="Manual">
        <span slot="description">No outer border</span>
      </oas-list-item>
    </oas-list>
  </div>
</DemoBlock>

## Size

`size` offers three density tiers: `sm` (compact) / `md` (default) / `lg` (spacious), adjusting row padding and title font size together.

<DemoBlock title="Size">
  <div style="width: 100%; display: flex; flex-direction: column; gap: var(--oas-space-4)">
    <oas-list bordered size="sm">
      <oas-list-item title="Small item"><span slot="description">size="sm": compact list</span></oas-list-item>
      <oas-list-item title="Small item"><span slot="description">Great for settings and briefs</span></oas-list-item>
    </oas-list>
    <oas-list bordered>
      <oas-list-item title="Default item"><span slot="description">size="md": regular list</span></oas-list-item>
      <oas-list-item title="Default item"><span slot="description">No size attribute means default</span></oas-list-item>
    </oas-list>
    <oas-list bordered size="lg">
      <oas-list-item title="Large item"><span slot="description">size="lg": spacious list</span></oas-list-item>
      <oas-list-item title="Large item"><span slot="description">Great for rich media rows</span></oas-list-item>
    </oas-list>
  </div>
</DemoBlock>

## Content Forms

<DemoBlock title="Multiple content forms">
  <div style="width: 100%">
    <oas-list bordered>
      <oas-list-item title="Title-only item">
        <oas-tag slot="extra" type="primary">NEW</oas-tag>
      </oas-list-item>
      <oas-list-item title="Default slot fallback">
        When no description slot is provided, content falls back to the default slot.
      </oas-list-item>
      <oas-list-item title="Todo status">
        <span slot="description">Awaiting owner confirmation</span>
        <oas-tag slot="extra" type="warning">Pending</oas-tag>
      </oas-list-item>
    </oas-list>
  </div>
</DemoBlock>

## Meta Structure (Avatar and Description)

`oas-list-item` provides structured Meta channels:

- `description` attribute: quick text channel (mutually exclusive with `slot="description"`, slot wins and supports rich content);
- `avatar` attribute: avatar URL quick channel, rendered as a circular avatar at the row start;
- `slot="avatar"`: rich avatar channel (accepts `oas-avatar` or any custom content), takes precedence over the `avatar` attribute.

<DemoBlock title="Avatar + description (attribute channel)">
  <div style="width: 100%">
    <oas-list bordered>
      <oas-list-item title="Lin Xiaoyu" description="Product manager · just updated the PRD" avatar="https://picsum.photos/seed/oas-list-a/96/96">
        <oas-tag slot="extra" type="primary">Online</oas-tag>
      </oas-list-item>
      <oas-list-item title="Chen Yining" description="Frontend engineer · commented on your design" avatar="https://picsum.photos/seed/oas-list-b/96/96">
        <oas-tag slot="extra">30 min ago</oas-tag>
      </oas-list-item>
      <oas-list-item title="Zhao Qiming" description="QA engineer · filed 3 defects" avatar="https://picsum.photos/seed/oas-list-c/96/96">
        <oas-tag slot="extra" type="warning">To confirm</oas-tag>
      </oas-list-item>
    </oas-list>
  </div>
</DemoBlock>

<DemoBlock title="Custom avatar (slot channel with oas-avatar)">
  <div style="width: 100%">
    <oas-list bordered>
      <oas-list-item title="Zhou Ke" description="The avatar slot accepts any content (e.g. oas-avatar)">
        <oas-avatar slot="avatar">Z</oas-avatar>
        <oas-tag slot="extra" type="success">Joined</oas-tag>
      </oas-list-item>
      <oas-list-item title="Wu Shuang" description="Slot takes precedence over the avatar attribute">
        <oas-avatar slot="avatar">W</oas-avatar>
        <oas-tag slot="extra">Invited</oas-tag>
      </oas-list-item>
    </oas-list>
  </div>
</DemoBlock>

## Row Interaction (clickable / selected)

With `clickable` on `oas-list-item`, the whole row becomes clickable: hover feedback, focusable (Enter / Space triggers), and an `oas-click` event on click; `selected` marks the row with highlight (`aria-selected` synced). Selection is host-controlled — common in member lists and settings lists.

<DemoBlock title="Clickable rows and selection">
  <div style="width: 100%">
    <oas-list bordered id="list-select">
      <oas-list-item clickable selected title="Notifications">
        <span slot="description">Email, inbox, desktop notifications</span>
        <oas-switch slot="extra" checked></oas-switch>
      </oas-list-item>
      <oas-list-item clickable title="Privacy">
        <span slot="description">Visibility, data authorization</span>
        <oas-switch slot="extra"></oas-switch>
      </oas-list-item>
      <oas-list-item clickable title="Security">
        <span slot="description">Two-factor auth, device management</span>
        <oas-switch slot="extra" checked></oas-switch>
      </oas-list-item>
    </oas-list>
    <p style="width: 100%; margin: var(--oas-space-3) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
      Click a row to toggle selection (single-select demo); clicking a switch does not change row selection.
    </p>
  </div>
</DemoBlock>

## Header and Footer

`slot="header"` / `slot="footer"` render custom areas at the list edges — handy for group titles, statistics, and action buttons.

<DemoBlock title="header / footer slots">
  <div style="width: 100%">
    <oas-list bordered>
      <div slot="header" style="display: flex; justify-content: space-between; align-items: center;">
        <b>Team members (3)</b>
        <oas-button size="small" variant="outlined" onclick="message.info('Open invite panel')">+ Invite</oas-button>
      </div>
      <oas-list-item title="Lin Xiaoyu"><span slot="description">Product manager</span></oas-list-item>
      <oas-list-item title="Chen Yining"><span slot="description">Frontend engineer</span></oas-list-item>
      <oas-list-item title="Zhao Qiming"><span slot="description">QA engineer</span></oas-list-item>
      <div slot="footer" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm);">
        3 members · permission sync every Monday
      </div>
    </oas-list>
  </div>
</DemoBlock>

## Loading and Empty States

<DemoBlock title="Loading state">
  <div style="width: 100%">
    <oas-list loading bordered>
      <oas-list-item title="Loading item">
        <span slot="description">Skeleton placeholder until loading finishes</span>
      </oas-list-item>
      <oas-list-item title="Loading item">
        <span slot="description">The loading attribute handles the placeholder</span>
      </oas-list-item>
    </oas-list>
  </div>
</DemoBlock>

<DemoBlock title="Empty state">
  <div style="width: 100%">
    <oas-list bordered empty></oas-list>
  </div>
  <p style="width: 100%; margin: var(--oas-space-3) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
     Setting <code>empty</code> forces the empty state; the list also shows it automatically when it has no <code>oas-list-item</code> children, and the copy can be customized via <code>empty-text</code>.
  </p>
</DemoBlock>

`slot="empty"` fully replaces the built-in empty state (icon + text), aligning with the data-component empty slot convention.

<DemoBlock title="Custom empty slot">
  <div style="width: 100%">
    <oas-list bordered empty>
      <div slot="empty" style="display: flex; flex-direction: column; align-items: center; gap: var(--oas-space-2); padding: var(--oas-space-2) 0;">
        <oas-icon name="search" style="font-size: 32px; color: var(--oas-color-text-secondary);"></oas-icon>
        <span style="color: var(--oas-color-text-secondary);">No matching tasks found</span>
        <oas-button size="small" variant="outlined" onclick="message.info('Open filter panel')">Adjust filters</oas-button>
      </div>
    </oas-list>
  </div>
</DemoBlock>

## Empty Text and Dividers

`empty-text` customizes the empty state text (default "No data").

<DemoBlock title="Custom empty text">
  <div style="width: 100%">
    <oas-list bordered empty empty-text="No matching tasks, please adjust the filters and retry"></oas-list>
  </div>
</DemoBlock>

`split` controls the item dividers: by default (without `bordered`) dividers are included; setting `bordered` turns the dividers off, and `split` can be used to re-enable them when needed.

<DemoBlock title="split dividers">
  <div style="width: 100%">
    <oas-list bordered>
      <oas-list-item title="Item 1"><span slot="description">bordered does not draw item dividers by default</span></oas-list-item>
      <oas-list-item title="Item 2"><span slot="description">Only the outer border</span></oas-list-item>
    </oas-list>
    <oas-list bordered split style="margin-top: var(--oas-space-4)">
      <oas-list-item title="Item 1"><span slot="description">bordered + split adds item dividers</span></oas-list-item>
      <oas-list-item title="Item 2"><span slot="description">Border and dividers coexist</span></oas-list-item>
    </oas-list>
  </div>
</DemoBlock>

## Stripe

`stripe` fills visually even rows (2nd, 4th, …) with a subtle background — great for audit logs and long comparison tables.

<DemoBlock title="Stripe">
  <div style="width: 100%">
    <oas-list bordered stripe id="list-stripe"></oas-list>
  </div>
</DemoBlock>

## Image and Text

The default slot of an item can hold a thumbnail, combining it with the title and description to form a rich-media list.

<DemoBlock title="Image-text list (thumbnail + title + description)">
  <div style="width: 100%">
    <oas-list bordered>
      <oas-list-item title="Product Weekly #12" description="6 new components shipped this week" avatar="https://picsum.photos/seed/isui-list-1/96/96">
        <oas-tag slot="extra">Weekly</oas-tag>
      </oas-list-item>
      <oas-list-item title="Design review log" description="Interaction states and dark theme review" avatar="https://picsum.photos/seed/isui-list-2/96/96">
        <oas-tag slot="extra">Log</oas-tag>
      </oas-list-item>
      <oas-list-item title="Release v1.6" description="All display components released" avatar="https://picsum.photos/seed/isui-list-3/96/96">
        <oas-tag slot="extra" type="success">Released</oas-tag>
      </oas-list-item>
    </oas-list>
  </div>
</DemoBlock>

## Data Channel (data + template dual channel)

Beyond declarative `oas-list-item` children, `oas-list` supports data-driven rendering: pass an array via the `data` property (recommended) or the `data` attribute (JSON string). **Object rows work out of the box**: without a template, the `{ title, description, avatar }` fields are rendered as the Meta structure automatically (primitive values render as plain text) — rows never degrade to `"[object Object]"`. There are two channels for customizing rendering (aligned with the `oas-tree` convention):

1. `template[slot="item"]`: a static skeleton cloned per item, bound to data via the `oas-item-render` event (`detail` carries `{ index, item, element }`);
2. Listen to `oas-item-render` only, without a template, and fill each row imperatively.

> Attach listeners before assigning data: assignment renders synchronously and fires `oas-item-render`, so listeners attached afterwards miss the first render.

When `data` is present the data channel wins; without it the list falls back to declarative children. Data rows are carried by `oas-list-item` (same structure, avatar, selection, and clicks as declarative rows) with a `data-index` context on each row.

<DemoBlock title="Data channel + oas-item-render">
  <div style="width: 100%">
    <oas-list bordered id="list-data"></oas-list>
    <p style="width: 100%; margin: var(--oas-space-3) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
      The data source has 5 task records. Click a row for the <code>oas-click</code> feedback.
    </p>
  </div>
</DemoBlock>

<DemoBlock title="template[slot=&quot;item&quot;] skeleton clone">
  <div style="width: 100%">
    <oas-list bordered id="list-data-tpl">
      <template slot="item">
        <span slot="title" data-field="title"></span>
        <span slot="description" data-field="description"></span>
        <oas-tag slot="extra" data-field="status"></oas-tag>
      </template>
    </oas-list>
  </div>
</DemoBlock>

## Scroll Loading (reach-bottom)

`max-height` turns the list body into a scroll container; scrolling to the bottom (threshold adjustable via `bottom-offset`, default 0) dispatches `oas-reach-bottom`, fired once per bottom entry and re-armed after scrolling away. Pair it with the `slot="load-more"` tail area for a "load more" button or a loading placeholder — the host controls fetching and when to stop.

<DemoBlock title="Reach-bottom loading + load-more tail">
  <div style="width: 100%">
    <oas-list bordered max-height="260" bottom-offset="40" id="list-infinite">
      <div slot="load-more" id="list-infinite-tail" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm);"></div>
    </oas-list>
  </div>
  <p style="width: 100%; margin: var(--oas-space-3) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    Scroll to the bottom to append 5 rows (simulated async); after 3 batches it shows "No more"; <code>bottom-offset="40"</code> triggers 40px above the end.
  </p>
</DemoBlock>

## Virtual Scrolling

Setting `height` enables virtual scrolling (embedding `oas-virtual-list`); `row-height` specifies the fixed row height (default 64 — data rows must be fixed-height). Virtual mode requires the `data` channel; massive datasets only render the visible window.

<DemoBlock title="Virtual list with 10k rows">
  <div style="width: 100%">
    <oas-list bordered height="320" row-height="57" id="list-virtual">
      <template slot="item">
        <div style="display: flex; flex-direction: column; justify-content: center; height: 100%; overflow: hidden">
          <strong data-field="title" style="font-size: var(--oas-font-size-md)"></strong>
          <span data-field="description" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); white-space: nowrap; overflow: hidden; text-overflow: ellipsis"></span>
        </div>
      </template>
    </oas-list>
  </div>
  <p style="width: 100%; margin: var(--oas-space-3) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    10,000 log records; only window rows + buffer are rendered.
  </p>
</DemoBlock>

## Composition: Pagination (oas-pagination)

The list does not build in pagination — data is host-controlled, so pagination is just "host slicing + updating data". With `oas-pagination` it takes one slice:

<DemoBlock title="Pagination composition">
  <div style="width: 100%">
    <oas-list bordered id="list-paged"></oas-list>
    <div style="display: flex; justify-content: flex-end; margin-top: var(--oas-space-3)">
      <oas-pagination id="list-paged-nav" page-size="4" total="14"></oas-pagination>
    </div>
  </div>
</DemoBlock>

## Composition: Card Wall (oas-grid + oas-card)

A grid card wall is composed from `oas-grid` + `oas-card` (the industry is also splitting grid out of list components: card styling is content, and the list only renders data):

<DemoBlock title="Card wall composition">
  <div style="width: 100%">
    <oas-grid cols="3" gap="12" id="list-card-wall"></oas-grid>
  </div>
</DemoBlock>

## Composition: Grouped List

Group titles use the `slot="header"` sections or multiple `oas-list` blocks (sticky group headers are a recorded fallback — when needed, use a `position: sticky` block inside the host scroll container):

<DemoBlock title="Grouped list (header sections)">
  <div style="width: 100%; display: flex; flex-direction: column; gap: var(--oas-space-3)">
    <oas-list bordered>
      <div slot="header"><b>In progress</b></div>
      <oas-list-item title="Component deep-dive"><span slot="description">list / timeline batch</span><oas-tag slot="extra" type="primary">In progress</oas-tag></oas-list-item>
      <oas-list-item title="Dark theme review"><span slot="description">Data components audit</span><oas-tag slot="extra" type="primary">In progress</oas-tag></oas-list-item>
    </oas-list>
    <oas-list bordered>
      <div slot="header"><b>Done</b></div>
      <oas-list-item title="Button refactor"><span slot="description">Variant semantics unification</span><oas-tag slot="extra" type="success">Done</oas-tag></oas-list-item>
    </oas-list>
  </div>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  // whenDefined guards against pre-upgrade expando shadowing the data setter
  customElements.whenDefined('oas-list').then(() => {
  // Row interaction: click to toggle selection (single select)
  const selectable = document.querySelector('#list-select')
  if (selectable) {
    selectable.addEventListener('oas-click', (e) => {
      const row = e.target
      if (!row || row.tagName.toLowerCase() !== 'oas-list-item') return
      for (const item of selectable.querySelectorAll('oas-list-item[selected]')) {
        item.removeAttribute('selected')
      }
      row.setAttribute('selected', '')
    })
  }

  // Stripe data
  const stripe = document.querySelector('#list-stripe')
  if (stripe) {
    // Attach listeners BEFORE assigning data: assignment renders synchronously and fires oas-item-render
    stripe.addEventListener('oas-item-render', (e) => {
      const { item, element } = e.detail
      element.setAttribute('title', item.title)
      element.setAttribute('description', item.description)
    })
    stripe.data = Array.from({ length: 6 }, (_, i) => ({
      title: `Audit event #${1000 + i}`,
      description: `By system · ${['created', 'updated', 'deleted'][i % 3]} a config item`,
    }))
  }

  // Data channel: imperative binding via oas-item-render
  const dataList = document.querySelector('#list-data')
  if (dataList) {
    dataList.addEventListener('oas-item-render', (e) => {
      const { item, element } = e.detail
      element.setAttribute('title', item.title)
      element.setAttribute('description', item.description)
      const tag = document.createElement('oas-tag')
      tag.setAttribute('slot', 'extra')
      tag.setAttribute(
        'type',
        item.status === 'In progress' ? 'primary' : item.status === 'Planned' ? 'success' : 'default',
      )
      tag.textContent = item.status
      element.appendChild(tag)
      element.setAttribute('clickable', '')
    })
    dataList.data = [
      { title: 'Fix tag contrast in dark mode', description: 'Status color token audit', status: 'In progress' },
      { title: 'Add timeline migration notes', description: 'color → type breaking change', status: 'In progress' },
      { title: 'List virtual scrolling integration', description: 'Embedding oas-virtual-list', status: 'Todo' },
      { title: 'Regression tests coverage', description: 'qa-regression hardening', status: 'Todo' },
      { title: 'Release v2.4.0', description: 'Deep-dive batch wrap-up', status: 'Planned' },
    ]
    dataList.addEventListener('oas-click', (e) => {
      if (e.detail && typeof e.detail.index === 'number') {
        message.info(`Clicked row ${e.detail.index + 1}: ${e.detail.item.title}`)
      }
    })
  }

  // Data channel: template skeleton clone + oas-item-render data binding
  const tplList = document.querySelector('#list-data-tpl')
  if (tplList) {
    tplList.addEventListener('oas-item-render', (e) => {
      const { item, element } = e.detail
      for (const node of element.querySelectorAll('[data-field]')) {
        const field = node.getAttribute('data-field')
        node.textContent = item[field] ?? ''
        if (node.tagName.toLowerCase() === 'oas-tag' && item.tagType) {
          node.setAttribute('type', item.tagType)
        }
      }
    })
    tplList.data = [
      { title: 'Lin Xiaoyu', description: 'Updated three PRDs', status: 'Online', tagType: 'success' },
      { title: 'Chen Yining', description: 'Merged 2 PRs', status: 'Busy', tagType: 'warning' },
      { title: 'Zhao Qiming', description: 'Submitted test report', status: 'Offline', tagType: 'default' },
    ]
  }

  // Scroll loading: append on reach-bottom + load-more tail status
  const infinite = document.querySelector('#list-infinite')
  if (infinite) {
    const tail = document.querySelector('#list-infinite-tail')
    let batch = 0
    const totalBatches = 3
    infinite.addEventListener('oas-item-render', (e) => {
      const { item, element } = e.detail
      element.setAttribute('title', item.title)
      element.setAttribute('description', item.description)
    })
    const append = (count) => {
      const current = infinite.dataItems
      infinite.data = current.concat(
        Array.from({ length: count }, (_, i) => ({
          title: `Log entry ${current.length + i + 1}`,
          description: `Appended by scroll loading · batch ${batch}`,
        })),
      )
    }
    append(8)
    const setTail = (text) => {
      if (tail) tail.textContent = text
    }
    setTail('Scroll down to load more')
    infinite.addEventListener('oas-reach-bottom', () => {
      if (batch >= totalBatches) {
        setTail('— No more —')
        return
      }
      batch += 1
      setTail('Loading…')
      // Simulated async fetch
      setTimeout(() => {
        append(5)
        setTail(batch >= totalBatches ? '— No more —' : 'Scroll down to load more')
      }, 400)
    })
  }

  // Virtual scrolling: 10k logs
  const virtual = document.querySelector('#list-virtual')
  if (virtual) {
    virtual.addEventListener('oas-item-render', (e) => {
      const { item, element } = e.detail
      for (const node of element.querySelectorAll('[data-field]')) {
        node.textContent = item[node.getAttribute('data-field')] ?? ''
      }
    })
    virtual.data = Array.from({ length: 10000 }, (_, i) => ({
      title: `Access log #${i + 1}`,
      description: `GET /api/records/${i + 1} · 200 · ${(Math.random() * 80 + 10).toFixed(0)}ms`,
    }))
  }

  // Pagination composition: host slicing + updating data
  const paged = document.querySelector('#list-paged')
  const pagedNav = document.querySelector('#list-paged-nav')
  if (paged && pagedNav) {
    const all = Array.from({ length: 14 }, (_, i) => ({
      title: `Ticket #${202400 + i}`,
      description: `Customer ${['A', 'B', 'C', 'D'][i % 4]} · ${['Inquiry', 'Incident', 'Suggestion'][i % 3]}`,
    }))
    const pageSize = 4
    paged.addEventListener('oas-item-render', (e) => {
      const { item, element } = e.detail
      element.setAttribute('title', item.title)
      element.setAttribute('description', item.description)
    })
    const render = (page) => {
      paged.data = all.slice((page - 1) * pageSize, page * pageSize)
    }
    render(1)
    pagedNav.addEventListener('oas-change', (e) => render(e.detail.page ?? e.detail.current ?? 1))
  }

  // Card wall: oas-grid + oas-card composition
  const wall = document.querySelector('#list-card-wall')
  if (wall) {
    const cards = [
      { title: 'Dashboard', desc: '12 charts', color: 'var(--oas-color-primary)' },
      { title: 'Inbox', desc: '3 unread', color: 'var(--oas-color-success)' },
      { title: 'Release pipeline', desc: 'v2.4.0 in progress', color: 'var(--oas-color-warning)' },
    ]
    wall.innerHTML = cards
      .map(
        (c) => `
      <oas-card>
        <div slot="cover" style="display: flex; align-items: center; justify-content: center; min-height: 96px; background: ${c.color}; color: var(--oas-color-text-on-primary); font-weight: 600;">${c.title}</div>
        <div style="padding: var(--oas-space-3) var(--oas-space-4);">${c.desc}</div>
      </oas-card>`,
      )
      .join('')
  }
  })
})
</script>

## API

### oas-list

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `bordered` | Whether to show the outer border | `boolean` | — |
| `bottom-offset` | Reach-bottom threshold (px): remaining distance to the bottom ≤ this counts as bottom, default 0 | `string` | `0` |
| `data` | Data channel (JSON string; the `data` / `dataItems` property takes precedence). With data the channel renders; without it falls back to declarative children | `unknown[]` | — |
| `empty` | Force empty state; auto empty when there are no children | `boolean` | — |
| `empty-text` | Empty state text | — | — |
| `height` | Virtual scroll viewport height (px; setting it enables virtual mode, requires the data channel) | `string` | `320` |
| `loading` | Loading state, shows skeleton placeholders | `boolean` | — |
| `max-height` | Max height of the list body (px or CSS length); turns the body into a scroll container (pairs with oas-reach-bottom for scroll loading) | `string` | — |
| `row-height` | Virtual scroll row height (px, default 64; data rows must be fixed-height) | `string` | `64` |
| `size` | Row density: sm / md (default) / lg | `string` | — |
| `split` | Whether to show item dividers | `boolean` | — |
| `stripe` | Zebra stripes: fills visually even rows with a subtle background | `boolean` | — |

| Event | Description |
| --- | --- |
| `oas-click` | Item click (data/virtual rows); detail carries { index, item } |
| `oas-item-render` | Dispatched after each data-channel row renders; detail carries { index, item, element } |
| `oas-reach-bottom` | Scroll reached the bottom (fired once per bottom entry, re-armed after scrolling away); detail carries { scrollTop } |

| Name | Description |
| --- | --- |
| default | Default (declarative oas-list-item children) |
| `empty` | Custom empty state, fully replacing the built-in icon + text |
| `footer` | Footer area (statistics, actions) |
| `header` | Header area (group titles, actions) |
| `load-more` | Tail "load more" area (button / loading placeholder) |
| `template[slot="item"]` | Static skeleton cloned per data item, bound to data via oas-item-render |

### oas-list-item

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `avatar` | Avatar URL quick channel (renders a circular avatar at the row start; slot="avatar" wins) | `string` | — |
| `clickable` | Whole row clickable: hover feedback, focusable (Enter/Space triggers), click dispatches oas-click | — | — |
| `description` | Description text quick channel (slot="description" wins, rich content allowed) | `string` | — |
| `selected` | Selected row highlight (aria-selected synced); selection is host-controlled | — | — |
| `size` | Row density: sm / md (default) / lg | — | — |
| `title` | Item title (rendered into the visible title region; absorbed from the host on read so no native hover tooltip remains; pass an empty string to clear); use slot="title" for rich content | `string` | — |

| Event | Description |
| --- | --- |
| `oas-click` | Row click; detail carries { index, item } (data-row context injected by oas-list) |

| Name | Description |
| --- | --- |
| `avatar` | Rich avatar content (oas-avatar or anything), takes precedence over the avatar attribute |
| `description` | Description area (falls back to the default slot when not provided) |
| `extra` | Extra area on the right of the item |
| `title` | Rich title content slot, overrides the title attribute text when present |
