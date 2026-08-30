# Pagination

Data pagination navigation with page-number ellipsis, prev/next flipping, configurable sibling page count, total display, page-size switching and quick jump.

## Basic usage

<DemoBlock title="Basic usage">
  <oas-pagination total="100" page-size="10" current="1"></oas-pagination>
</DemoBlock>

## Page-number ellipsis

<DemoBlock title="Ellipsis for many pages">
  <oas-pagination total="500" page-size="10" current="25"></oas-pagination>
</DemoBlock>

## Sibling page count

<DemoBlock title="siblings control">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-tag type="info">siblings="1" (default)</oas-tag>
    <oas-pagination total="200" page-size="10" current="10"></oas-pagination>
    <oas-tag type="info">siblings="2"</oas-tag>
    <oas-pagination total="200" page-size="10" current="10" siblings="2"></oas-pagination>
  </oas-space>
</DemoBlock>

## Page-number cap

<DemoBlock title="pager-count page-number cap">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-tag type="info">siblings="2" (no cap, 7 page buttons)</oas-tag>
    <oas-pagination total="1000" page-size="10" current="45" siblings="2"></oas-pagination>
    <oas-tag type="info">siblings="2" + pager-count="5" (truncation wins, only 5)</oas-tag>
    <oas-pagination total="1000" page-size="10" current="45" siblings="2" pager-count="5"></oas-pagination>
    <oas-tag type="info">pager-count="5" (100 pages, only 5 page buttons)</oas-tag>
    <oas-pagination total="1000" page-size="10" current="45" pager-count="5"></oas-pagination>
  </oas-space>
</DemoBlock>

When the cap is exceeded, the window shrinks centered on the current page, leaving at least 2 pages on each side of an ellipsis (first/last pages always reachable); values below the minimum 5 fall back to 5 with a console warning.

## Total count

<DemoBlock title="show-total displays the total">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-tag type="info">show-total displays "X items in total"</oas-tag>
    <oas-pagination total="150" page-size="10" show-total></oas-pagination>
    <oas-tag type="info">Hidden when not set</oas-tag>
    <oas-pagination total="150" page-size="10"></oas-pagination>
  </oas-space>
</DemoBlock>

## Page-size switching

<DemoBlock title="page-sizes dropdown">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-pagination id="pagination-sizes" total="150" page-size="10" current="1" page-sizes='[10,20,50]'></oas-pagination>
    <oas-tag type="primary" id="pagination-sizes-info">10 per page, currently on page 1</oas-tag>
  </oas-space>
</DemoBlock>

Switching the page size resets to page 1 and fires `oas-change` with `detail: { page: 1, pageSize }`.

## Page-size switch threshold

<DemoBlock title="total-boundary controls the page-size switcher">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-tag type="info">total-boundary="100": the page-size dropdown is hidden when total ≤ 100 (here total=30, no dropdown)</oas-tag>
    <oas-pagination total="30" page-size="10" total-boundary="100" page-sizes="[10,20,50]"></oas-pagination>
    <oas-tag type="info">Click the buttons to raise total (>100) so the switcher appears; lower it to hide again</oas-tag>
    <oas-space size="small">
      <oas-button size="small" id="pagination-boundary-inc">total 30 → 300</oas-button>
      <oas-button size="small" id="pagination-boundary-dec">total 300 → 30</oas-button>
    </oas-space>
    <oas-pagination id="pagination-boundary" total="30" page-size="10" total-boundary="100" page-sizes="[10,20,50]" current="1"></oas-pagination>
    <oas-tag type="primary" id="pagination-boundary-info">total=30 (switcher hidden)</oas-tag>
  </oas-space>
</DemoBlock>

With `total-boundary` set, the page-size dropdown renders only when `total` exceeds the threshold; without it, the current behavior is kept (dropdown shows whenever `page-sizes` is set).

## Quick jump

<DemoBlock title="show-jumper jump to a page">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-pagination id="pagination-jumper" total="150" page-size="10" current="3" show-jumper></oas-pagination>
    <oas-tag type="primary" id="pagination-jumper-info">Currently on page 3</oas-tag>
  </oas-space>
</DemoBlock>

Enter a page number and press Enter to jump (out-of-range values are clamped to the valid range), firing `oas-change` with `detail: { page, pageSize }`.

## Combined usage

<DemoBlock title="Total + page-size + quick jump">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-pagination id="pagination-full" total="520" page-size="20" current="1" show-total page-sizes='[10,20,50,100]' show-jumper></oas-pagination>
    <oas-tag type="primary" id="pagination-full-info">20 per page, currently on page 1</oas-tag>
  </oas-space>
</DemoBlock>

## Flip event

<DemoBlock title="oas-change event">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-pagination id="pagination-demo" total="85" page-size="10" current="1"></oas-pagination>
    <oas-tag type="primary" id="pagination-demo-info">Currently on page 1</oas-tag>
  </oas-space>
</DemoBlock>

## Disabled state

<DemoBlock title="disabled disables everything">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-pagination disabled total="150" page-size="10" current="3" show-total page-sizes='[10,20,50]' show-jumper></oas-pagination>
    <oas-tag type="info">All page buttons, the page-size dropdown and the jumper input are disabled</oas-tag>
  </oas-space>
</DemoBlock>

## Sizes

<DemoBlock title="size five tiers (xs / sm / md / lg / xl)">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-pagination size="xs" total="100" page-size="10"></oas-pagination>
    <oas-pagination size="sm" total="100" page-size="10"></oas-pagination>
    <oas-pagination size="md" total="100" page-size="10"></oas-pagination>
    <oas-pagination size="lg" total="100" page-size="10"></oas-pagination>
    <oas-pagination size="xl" total="100" page-size="10"></oas-pagination>
  </oas-space>
</DemoBlock>

Defaults to `md`; invalid values fall back to `md` with a console warning.

## Simple mode

<DemoBlock title="simple minimal form">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-pagination simple total="100" page-size="10" current="3"></oas-pagination>
    <oas-tag type="info">simple + show-jumper combined</oas-tag>
    <oas-pagination simple total="100" page-size="10" current="3" show-jumper></oas-pagination>
  </oas-space>
</DemoBlock>

The simple form renders only the prev/next buttons and a "current / total pages" text; it is mutually exclusive with the page-number ellipsis algorithm (`simple` wins).

## Unknown-total form

<DemoBlock title="show-more for unknown totals">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-tag type="info">When total is unknown (≤0), renders "Previous / More / Next"; More is a non-clickable status indicator, prev/next flip current ± 1</oas-tag>
    <oas-pagination id="pagination-more" show-more total="0" page-size="10" current="1"></oas-pagination>
    <oas-tag type="primary" id="pagination-more-info">Currently on page 1 (no total concept)</oas-tag>
    <oas-tag type="info">show-more is ignored when total > 0 (normal page numbers)</oas-tag>
    <oas-pagination show-more total="100" page-size="10" current="3"></oas-pagination>
  </oas-space>
</DemoBlock>

`show-more` targets unknown-total scenarios: no page-number sequence or total text, just the three buttons; `show-jumper` / `page-sizes` / `hide-on-single` do not apply (no page-count concept).

## First / last pages

<DemoBlock title="show-edges first/last buttons">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-tag type="info">First page (« disabled)</oas-tag>
    <oas-pagination show-edges total="100" page-size="10" current="1"></oas-pagination>
    <oas-tag type="info">Middle</oas-tag>
    <oas-pagination show-edges total="100" page-size="10" current="5"></oas-pagination>
    <oas-tag type="info">Last page (» disabled)</oas-tag>
    <oas-pagination show-edges total="100" page-size="10" current="10"></oas-pagination>
  </oas-space>
</DemoBlock>

## Hide on single page

<DemoBlock title="hide-on-single hides the component">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-tag type="info">8 records, 10 per page → single page, component hidden</oas-tag>
    <oas-pagination hide-on-single total="8" page-size="10"></oas-pagination>
    <oas-tag type="info">Without it, a single page still renders (buttons disabled)</oas-tag>
    <oas-pagination total="8" page-size="10"></oas-pagination>
  </oas-space>
</DemoBlock>

## Custom icons

<DemoBlock title="prev-icon / next-icon slots">
  <oas-pagination total="100" page-size="10" current="3">
    <span slot="prev-icon" style="font-size: 12px">«</span>
    <span slot="next-icon" style="font-size: 12px">»</span>
  </oas-pagination>
</DemoBlock>

Providing `slot="prev-icon"` / `slot="next-icon"` content replaces the default `‹` / `›` arrows.

## Custom total

<DemoBlock title="total slot">
  <oas-pagination total="150" page-size="10" show-total>
    <span slot="total"><b>150</b> records in total</span>
  </oas-pagination>
</DemoBlock>

Providing `slot="total"` content replaces the built-in "Total N" text; the `show-total` boolean remains compatible (built-in text shown without slot content).

## Flip interception

<DemoBlock title="oas-before-change veto">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-pagination id="pagination-before" total="100" page-size="10" current="1"></oas-pagination>
    <oas-tag type="primary" id="pagination-before-info">Currently on page 1</oas-tag>
  </oas-space>
</DemoBlock>

`oas-before-change` fires before a page change/jump with `detail: { page }`; the host can call `preventDefault()` to cancel the change (this demo vetoes jumping to page 4). Page-size switching is not intercepted.

## Controlled mode

<DemoBlock title="controlled current">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-space size="small">
      <oas-button size="small" id="pagination-prev-page">Previous</oas-button>
      <oas-button size="small" id="pagination-next-page">Next</oas-button>
      <oas-button size="small" id="pagination-reset">Back to page 1</oas-button>
    </oas-space>
    <oas-pagination id="pagination-controlled" total="200" page-size="10" current="1"></oas-pagination>
    <oas-tag type="primary" id="pagination-controlled-info">Currently on page 1</oas-tag>
  </oas-space>
</DemoBlock>

External buttons set the `current` attribute directly to drive the view (out-of-range values are clamped); the component's own flips fire `oas-change` and write back the attribute.

## Edge cases

<DemoBlock title="Single page / first-last disabled">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-tag type="info">Single-page data (flip buttons disabled)</oas-tag>
    <oas-pagination total="8" page-size="10"></oas-pagination>
    <oas-tag type="info">First page (‹ disabled)</oas-tag>
    <oas-pagination total="50" page-size="10" current="1"></oas-pagination>
    <oas-tag type="info">Last page (› disabled)</oas-tag>
    <oas-pagination total="50" page-size="10" current="5"></oas-pagination>
  </oas-space>
</DemoBlock>

## Link mode

<DemoBlock title="href-template renders links">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-tag type="info">href-template="#page={page}" (native browser navigation; middle/right-click and new-tab work)</oas-tag>
    <oas-pagination id="pagination-link" href-template="#page={page}" total="100" page-size="10" current="3" show-edges></oas-pagination>
    <oas-tag type="primary" id="pagination-link-info">Currently on page 3</oas-tag>
    <oas-tag type="info">target="_blank" passthrough (opens in a new tab)</oas-tag>
    <oas-pagination href-template="#page={page}" target="_blank" total="100" page-size="10" current="3"></oas-pagination>
    <oas-tag type="info">disabled degrades to a non-clickable span</oas-tag>
    <oas-pagination href-template="#page={page}" disabled total="100" page-size="10" current="3"></oas-pagination>
  </oas-space>
</DemoBlock>

With `href-template` (containing the `{page}` placeholder) set, page/prev/next/first/last are rendered as `<a href>` with `{page}` replaced by the target page; `target` is passed through to `<a target>`. When disabled they degrade to non-clickable spans. Clicking still fires `oas-change`; vetoing `oas-before-change` also prevents native navigation.

## Responsive

<DemoBlock title="responsive switches to minimal on narrow screens">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-pagination responsive total="500" page-size="10" current="25" show-total></oas-pagination>
    <oas-tag type="info">Renders in the simple minimal form when the component is narrower than 640px (ResizeObserver), restores when wide enough; equivalent to explicit simple</oas-tag>
  </oas-space>
</DemoBlock>

## Clickable ellipsis

<DemoBlock title="ellipsis jumps pages">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-pagination id="pagination-ellipsis" total="1000" page-size="10" current="5"></oas-pagination>
    <oas-tag type="primary" id="pagination-ellipsis-info">Currently on page 5</oas-tag>
  </oas-space>
</DemoBlock>

Ellipsis is a clickable button: clicking jumps `siblings + 1` pages in that direction (subject to the `oas-before-change` veto and clamped to the valid range); aria-label via i18n (Jump forward/Jump backward).

## Custom page-number content

<DemoBlock title="page-item slot template">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-tag type="info">Slot content holds the {page} placeholder; the component clones it per page</oas-tag>
    <oas-pagination total="100" page-size="10" current="5">
      <span slot="page-item" hidden>Page <b>{page}</b></span>
    </oas-pagination>
  </oas-space>
</DemoBlock>

Put template content containing the `{page}` placeholder; the component clones it into every page-number button and replaces the `{page}` text with the actual page number (textContent-only replacement, injection-safe). Without the slot, buttons show plain page numbers. prev/next/first/last are unaffected.

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const bind = (id, render) => {
    const el = document.getElementById(id)
    const info = document.getElementById(`${id}-info`)
    el?.addEventListener('oas-change', (e) => {
      const { page, pageSize } = e.detail
      render(info, page, pageSize)
      info?.setAttribute('type', 'primary')
    })
  }
  bind('pagination-demo', (info, page) => (info.textContent = `Currently on page ${page}`))
  bind('pagination-sizes', (info, page, pageSize) => (info.textContent = `${pageSize} per page, currently on page ${page}`))
  bind('pagination-jumper', (info, page, pageSize) => (info.textContent = `Currently on page ${page}`))
  bind('pagination-full', (info, page, pageSize) => (info.textContent = `${pageSize} per page, currently on page ${page}`))
  bind('pagination-ellipsis', (info, page) => (info.textContent = `Currently on page ${page}`))
  bind('pagination-link', (info, page) => (info.textContent = `Currently on page ${page}`))
  bind('pagination-more', (info, page) => (info.textContent = `Currently on page ${page}`))

  // total-boundary: flip total to observe the page-size switcher appear/hide
  const boundaryEl = document.getElementById('pagination-boundary')
  const boundaryInfo = document.getElementById('pagination-boundary-info')
  document.getElementById('pagination-boundary-inc')?.addEventListener('click', () => {
    boundaryEl?.setAttribute('total', '300')
    boundaryInfo.textContent = 'total=300 (switcher shown)'
    boundaryInfo.setAttribute('type', 'primary')
  })
  document.getElementById('pagination-boundary-dec')?.addEventListener('click', () => {
    boundaryEl?.setAttribute('total', '30')
    boundaryInfo.textContent = 'total=30 (switcher hidden)'
    boundaryInfo.setAttribute('type', 'primary')
  })

  // Flip interception: veto jumping to page 4 (preventDefault)
  const beforeEl = document.getElementById('pagination-before')
  const beforeInfo = document.getElementById('pagination-before-info')
  const renderPage = (info, page) => (info.textContent = `Currently on page ${page}`)
  beforeEl?.addEventListener('oas-before-change', (e) => {
    if (e.detail.page === 4) {
      e.preventDefault()
      beforeInfo.textContent = 'Jump to page 4 vetoed'
      beforeInfo.setAttribute('type', 'danger')
    }
  })
  beforeEl?.addEventListener('oas-change', (e) => {
    renderPage(beforeInfo, e.detail.page)
    beforeInfo.setAttribute('type', 'primary')
  })

  // Controlled mode: external buttons set the current attribute directly
  const ctrl = document.getElementById('pagination-controlled')
  const ctrlInfo = document.getElementById('pagination-controlled-info')
  const ctrlPageCount = Math.ceil(200 / 10) // total 200 / page-size 10
  const clampPage = (p) => Math.min(Math.max(p, 1), ctrlPageCount)
  const syncCtrlInfo = (page) => {
    ctrlInfo.textContent = `Currently on page ${page}`
    ctrlInfo.setAttribute('type', 'primary')
  }
  const updatePage = (p) => {
    const next = clampPage(p)
    ctrl?.setAttribute('current', String(next))
    syncCtrlInfo(next)
  }
  document.getElementById('pagination-prev-page')?.addEventListener('click', () => {
    updatePage(Number(ctrl?.getAttribute('current') || 1) - 1)
  })
  document.getElementById('pagination-next-page')?.addEventListener('click', () => {
    updatePage(Number(ctrl?.getAttribute('current') || 1) + 1)
  })
  document.getElementById('pagination-reset')?.addEventListener('click', () => updatePage(1))
  ctrl?.addEventListener('oas-change', (e) => syncCtrlInfo(e.detail.page))
})
</script>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `current` | Current page (controlled; flipping updates this attribute) | `string` | `1` |
| `disabled` | Disables everything: all page buttons with aria-disabled, plus the page-size dropdown and jumper input | `boolean` | — |
| `hide-on-single` | Hides the whole component when there is a single page (pageCount ≤ 1) | `boolean` | — |
| `href-template` | Link mode: renders page/prev/next/first/last as `<a href>` (the `{page}` placeholder is replaced with the target page); middle/right-click and opening in a new tab work natively; degrades to a non-clickable span when disabled | `string` | — |
| `page-size` | Records per page | `string` | `10` |
| `page-sizes` | Page-size dropdown options (JSON array), e.g. `[10,20,50]`; switching resets to page 1 | `string` | — |
| `pager-count` | Maximum number of page-number buttons (excluding prev/next/first/last), default 9; when exceeded, the window shrinks centered on the current page (at least 2 pages on each side of an ellipsis, first/last reachable); values below the minimum 5 fall back to 5 with a warning | `string` | `9` |
| `responsive` | Responsive: renders in the simple minimal form automatically when the component is narrower than 640px (ResizeObserver on the host; restores when wide enough); equivalent to explicit `simple` | `boolean` | — |
| `show-edges` | Shows first/last double-arrow buttons (« »), disabled at the boundaries; aria-label via i18n | `boolean` | — |
| `show-jumper` | Shows a quick-jump input 「跳至 __ 页」(Enter to jump, out-of-range clamped) | `boolean` | — |
| `show-more` | Unknown-total form: when total ≤ 0 renders Previous / More / Next (More is a non-clickable status indicator, styled like a page button but muted; prev/next flip current ± 1 and fire oas-change); ignored when total > 0 (normal page numbers); show-jumper / page-sizes / hide-on-single do not apply | `boolean` | — |
| `show-total` | Shows the total text 「共 X 条」 | `boolean` | — |
| `siblings` | Number of page numbers shown on each side of the current page | `string` | `1` |
| `simple` | Minimal form: only prev/next buttons and a "current / total pages" text; mutually exclusive with the page-number ellipsis algorithm (simple wins); show-jumper still applies | `boolean` | — |
| `size` | Size tier: xs / sm / md / lg / xl (default md); invalid values fall back to md with a console warning | `string` | `md` |
| `target` | Passthrough to `<a target>` (e.g. `_blank`) in link mode; only applies when `href-template` is set | `string` | — |
| `total` | Total number of records | `string` | `0` |
| `total-boundary` | Page-size switcher visibility threshold: when set, the page-size dropdown renders only when total exceeds the value (hidden when total ≤ threshold); unset keeps current behavior (dropdown shows whenever page-sizes is set) | `string` | — |

### Events

| Event | Description |
| --- | --- |
| `oas-before-change` | Fires before a page change/jump; preventDefault cancels the change (page-size switching is not intercepted); in link mode it also prevents native navigation |
| `oas-change` | Flipping `{ page }`; page-size switch `{ page: 1, pageSize }`; quick jump `{ page, pageSize }`, `detail: { page } \| { page: 1, pageSize } \| { page, pageSize }` |

### Slots

| Name | Description |
| --- | --- |
| `next-icon` | Icon slot for the next button; replaces the default › when present |
| `page-item` | Custom page-number content slot: put template content containing the `{page}` placeholder (e.g. `<span slot="page-item" hidden>Page {page}</span>`); the component clones it into every page-number button and replaces the placeholder (textContent only, injection-safe); falls back to plain page numbers when absent; prev/next/first/last are unaffected |
| `prev-icon` | Icon slot for the previous button; replaces the default ‹ when present |
| `total` | Total text slot; replaces the built-in "Total N" text when present |

Page numbers are omitted automatically when out of range, and the first/last flip buttons are disabled at the boundaries.
