# AppBar

An application bar layout strip at the top of a page / tool area (`role="banner"`): leading area (menu button / custom content) + title + action area + trailing area + overflow collection + scroll collapse + an extended second row.

## Basic usage

The `heading` attribute sets the title text, and `slot="actions"` holds action buttons (`oas-button` etc.); the title area is the `flex: 1` strut pushing the actions to the far end.

<DemoBlock title="Title and action area">
  <oas-app-bar heading="Project workspace">
    <oas-button size="small" slot="actions">Import</oas-button>
    <oas-button size="small" type="primary" slot="actions">New project</oas-button>
  </oas-app-bar>
</DemoBlock>

## Menu button

The `menu-button` boolean attribute shows a leading menu (hamburger) button; clicking it dispatches `oas-menu-toggle` (the host opens/closes its own drawer). After toggling the drawer, the host writes back the `menu-open` boolean attribute and the button's `aria-expanded` follows; `menu-controls` points to the host drawer element id (`aria-controls`).

<DemoBlock title="Menu button and open state">
  <oas-app-bar id="ab-menu" heading="Console" menu-button menu-controls="side-drawer"></oas-app-bar>
  <p id="ab-menu-out" style="margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">Click the hamburger button on the left and watch aria-expanded and the event feedback.</p>
  <!-- aria-controls reference target placeholder: in real usage this is the host drawer element id -->
  <div id="side-drawer" hidden></div>
</DemoBlock>

## Title / leading / trailing slots

`slot="title"` renders a rich title (it overrides the `heading` attribute text when present); `slot="leading"` holds custom leading content after the menu button; `slot="trailing"` holds end-of-bar content such as an avatar (excluded from overflow collection).

<DemoBlock title="Slot composition">
  <oas-app-bar heading="Placeholder title">
    <oas-avatar slot="leading">O</oas-avatar>
    <span slot="title" style="display: inline-flex; align-items: center; gap: var(--oas-space-2)">
      Release center <oas-tag color="blue">Beta</oas-tag>
    </span>
    <oas-button size="small" round icon="gear" aria-label="Settings" slot="trailing"></oas-button>
  </oas-app-bar>
</DemoBlock>

## Overflow collection

When `slot="actions"` exceeds the bar width, the overflowing action items are automatically collected into a "···" popup (ResizeObserver driven, recalculated live while resizing); mirror items in the popup dispatch clicks back to the original buttons. A button's `aria-label` takes priority as its mirror label.

<DemoBlock title="Narrow-container overflow collection (resize the window to watch it recalculate)">
  <div style="max-width: 360px">
    <oas-app-bar id="ab-overflow" heading="Reports">
      <oas-button size="small" slot="actions" onclick="message.info('Refreshed')">Refresh</oas-button>
      <oas-button size="small" slot="actions" onclick="message.info('Exported as CSV')">Export CSV</oas-button>
      <oas-button size="small" slot="actions" onclick="message.info('Exported as Excel')">Export Excel</oas-button>
      <oas-button size="small" slot="actions" onclick="message.info('Shared')">Share</oas-button>
      <oas-button size="small" slot="actions" onclick="message.info('Archived')">Archive</oas-button>
      <oas-button size="small" slot="actions" onclick="message.info('Sent to printer')">Print</oas-button>
      <oas-button size="small" slot="actions" onclick="message.info('Configured')">Settings</oas-button>
    </oas-app-bar>
  </div>
</DemoBlock>

## Position variants

`position` controls the placement variant: `static` (default, follows the document flow) / `absolute` / `fixed` (viewport top, offset via the `--oas-app-bar-top` variable) / `floating` (rounded floating capsule with shadow and inset margins). The demos keep static positioning via inline styles to avoid covering the page; use the variants directly in real scenarios.

<DemoBlock title="Four variants (all kept static for the demo)">
  <oas-app-bar heading="static default"></oas-app-bar>
  <oas-app-bar heading="absolute" position="absolute" style="position: static; margin-block-start: var(--oas-space-3)"></oas-app-bar>
  <oas-app-bar heading="fixed" position="fixed" style="position: static; margin-block-start: var(--oas-space-3)"></oas-app-bar>
  <oas-app-bar heading="floating capsule" position="floating" style="position: static; margin-block-start: var(--oas-space-3)"></oas-app-bar>
</DemoBlock>

## Elevation (elevated / on-scroll shadow)

The `elevated` boolean attribute shows the shadow permanently; when unset, the shadow appears automatically once the page is scrolled (scrollY &gt; 0) and is removed back at the top. The shadow is adjustable via the `--oas-app-bar-shadow` variable.

<DemoBlock title="elevated permanent shadow (the right example shadows after scrolling)">
  <oas-app-bar heading="elevated permanent" elevated style="margin-block-end: var(--oas-space-3)"></oas-app-bar>
  <oas-app-bar heading="Shadow after scrolling"></oas-app-bar>
</DemoBlock>

## Scroll collapse (hide-on-scroll)

The `hide-on-scroll` boolean attribute (effective in the floating variants `fixed` / `absolute` / `floating`): scrolling down slides the bar out of the viewport with `translateY`, scrolling up slides it back; a scroll delta &gt;4px is required to detect direction. Hiding is **purely visual** (no `aria-hidden`); it restores when scrolled back.

<DemoBlock title="fixed + hide-on-scroll (pinned below the navbar; scroll this page)">
  <div style="height: 420px; display: flex; align-items: center; justify-content: center; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md); color: var(--oas-color-text-tertiary); font-size: var(--oas-font-size-sm)">Long scroll placeholder (scroll down to hide, scroll up to restore)</div>
  <oas-app-bar id="ab-hide" heading="Scroll collapse demo" position="fixed" hide-on-scroll style="--oas-app-bar-top: 64px">
    <oas-button size="small" type="primary" slot="actions" onclick="message.info('Button inside the fixed bar works')">Action</oas-button>
  </oas-app-bar>
</DemoBlock>

## Extended row

`slot="extended"` renders a second row (large title / search box etc.); with the `extended-collapse-on-scroll` boolean attribute enabled, scrolling past 8px collapses the extended row leaving only the main row, expanding again below the threshold (grid row transition, disabled under `prefers-reduced-motion`).

<DemoBlock title="Extended large title + collapse on scroll">
  <oas-app-bar id="ab-extended" heading="Data analytics" extended-collapse-on-scroll>
    <div slot="extended" style="padding: 0 var(--oas-space-4) var(--oas-space-3); font-size: var(--oas-font-size-xl); font-weight: 700">Data analytics</div>
  </oas-app-bar>
  <p style="margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">Scroll this page: the extended row collapses leaving the main row; it expands again at the top.</p>
</DemoBlock>

## RTL

Inside a `dir="rtl"` container the component mirrors automatically: the `data-rtl` hook + fully logical layout properties (`inset-inline` / `padding-inline`); the "···" popup aligns to the far end of the actions area.

<DemoBlock title="RTL mirroring">
  <div dir="rtl" style="max-width: 420px">
    <oas-app-bar heading="لوحة التحكم" menu-button>
      <oas-button size="small" slot="actions" onclick="message.info('تحديث')">تحديث</oas-button>
      <oas-button size="small" slot="actions" onclick="message.info('تصدير')">تصدير</oas-button>
      <oas-button size="small" slot="actions" onclick="message.info('مشاركة')">مشاركة</oas-button>
      <oas-button size="small" slot="actions" onclick="message.info('طباعة')">طباعة</oas-button>
    </oas-app-bar>
  </div>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const menu = document.getElementById('ab-menu')
  const out = document.getElementById('ab-menu-out')
  menu?.addEventListener('oas-menu-toggle', () => {
    const open = menu.hasAttribute('menu-open')
    if (open) menu.removeAttribute('menu-open')
    else menu.setAttribute('menu-open', '')
    out.textContent = `oas-menu-toggle dispatched, menu-open=${menu.hasAttribute('menu-open')}, aria-expanded=${menu.shadowRoot?.querySelector('[part="menu-button"]')?.getAttribute('aria-expanded')}`
  })
})
</script>
