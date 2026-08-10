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
})
</script>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `current` | Current page (controlled; flipping updates this attribute) | — | `1` |
| `page-size` | Records per page | — | `10` |
| `page-sizes` | Page-size dropdown options (JSON array), e.g. `[10,20,50]`; switching resets to page 1 | — | — |
| `show-jumper` | Shows a quick-jump input 「跳至 __ 页」(Enter to jump, out-of-range clamped) | — | — |
| `show-total` | Shows the total text 「共 X 条」 | — | — |
| `siblings` | Number of page numbers shown on each side of the current page | — | `1` |
| `total` | Total number of records | — | `0` |

### Events

| Event | Description |
| --- | --- |
| `oas-change` | Flipping `{ page }`; page-size switch `{ page: 1, pageSize }`; quick jump `{ page, pageSize }` |

Page numbers are omitted automatically when out of range, and the first/last flip buttons are disabled at the boundaries.
