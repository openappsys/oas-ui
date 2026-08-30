# PageHeader

A page header information area with title, subtitle, back button, breadcrumb, a body area and a bottom action area. Commonly used at the top of detail and edit pages.

## Basic usage

<DemoBlock title="Title and subtitle">
  <oas-page-header title="Order details" subtitle="Order No. 20260801001"></oas-page-header>
</DemoBlock>

## With back button

<DemoBlock title="Back button">
  <oas-page-header title="User settings" subtitle="Update account and security info" back></oas-page-header>
</DemoBlock>

## Avatar

The `avatar` named slot renders between the back button and the title block (a "back + avatar + title" layout); compose it with the `oas-avatar` component. The block is not rendered when empty.

<DemoBlock title="avatar slot">
  <oas-page-header title="John" subtitle="Product Designer · Beijing" back>
    <oas-avatar slot="avatar">J</oas-avatar>
  </oas-page-header>
</DemoBlock>

## Breadcrumb

Place a breadcrumb in its own top row via `slot="breadcrumb"`, composing the `oas-breadcrumb` component.

<DemoBlock title="breadcrumb slot">
  <oas-page-header title="Order details" subtitle="Order No. 20260801001">
    <oas-breadcrumb slot="breadcrumb" separator="›" items='[{"label":"Home","href":"/"},{"label":"Orders","href":"/orders"},{"label":"Order details"}]'></oas-breadcrumb>
  </oas-page-header>
</DemoBlock>

## Title and subtitle slots

The title / subtitle can be plain text via attributes, or rich content (icons, badges, links…) via `slot="title"` / `slot="subtitle"` — the slot takes precedence over the attribute text when present.

<DemoBlock title="title / subtitle slots">
  <oas-page-header>
    <span slot="title" style="display: inline-flex; align-items: center; gap: var(--oas-space-2)">
      Project overview <oas-tag color="blue">In progress</oas-tag>
    </span>
    <span slot="subtitle">Last updated: 2026-08-30 14:00</span>
  </oas-page-header>
</DemoBlock>

## Right-side action area

<DemoBlock title="extra slot">
  <oas-page-header title="Project management" subtitle="12 projects in total">
    <oas-space slot="extra" size="small">
      <oas-button size="small">Export</oas-button>
      <oas-button size="small" type="primary">New project</oas-button>
    </oas-space>
  </oas-page-header>
</DemoBlock>

## Body area

Body content goes below the title row via the default slot; the block is not rendered when empty.

<DemoBlock title="content default slot">
  <oas-page-header title="Project overview" subtitle="Progress and key metrics">
    <div style="line-height: 1.8; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
      The project is entering the sprint phase: frontend progress is 80%, API integration is underway, and a beta release is expected this Friday.
    </div>
  </oas-page-header>
</DemoBlock>

## Bottom action area

<DemoBlock title="footer slot">
  <oas-page-header title="User settings" subtitle="Update account and security info">
    <div slot="footer" style="display: flex; justify-content: flex-end">
      <oas-space size="small">
        <oas-button size="small">Cancel</oas-button>
        <oas-button size="small" type="primary">Save</oas-button>
      </oas-space>
    </div>
  </oas-page-header>
</DemoBlock>

## Custom back icon

<DemoBlock title="back-icon slot">
  <oas-page-header title="Article details" subtitle="Published on 2026-08-28" back>
    <oas-icon slot="back-icon" name="arrow-left"></oas-icon>
  </oas-page-header>
</DemoBlock>

## Full combination

A full combination of breadcrumb + title row + body + bottom actions.

<DemoBlock title="All blocks combined">
  <oas-page-header title="Order details" subtitle="Order No. 20260801001" back>
    <oas-breadcrumb slot="breadcrumb" separator="›" items='[{"label":"Home","href":"/"},{"label":"Orders","href":"/orders"},{"label":"Order details"}]'></oas-breadcrumb>
    <oas-space slot="extra" size="small">
      <oas-button size="small">Print</oas-button>
      <oas-button size="small" type="primary">Approve</oas-button>
    </oas-space>
    <div style="line-height: 1.8; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
      The order contains 3 items, totaling ¥1,299.00, expected delivery on 2026-09-02. Recipient: John, 138****5678.
    </div>
    <div slot="footer" style="display: flex; justify-content: flex-end">
      <oas-space size="small">
        <oas-button size="small">Reject</oas-button>
        <oas-button size="small" type="primary">Ship</oas-button>
      </oas-space>
    </div>
  </oas-page-header>
</DemoBlock>

## Event feedback

<DemoBlock title="Back event">
  <oas-page-header title="Article details" back onoas-back="message.info('Back clicked')"></oas-page-header>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  const { message } = await import('@oas-ui/ui')
  window.message = message
})
</script>

## Transparent background variant (ghost)

`ghost` gives the header a transparent background (the background rule is set to `none`; title/text colors keep the theme foreground token) and removes the footer divider. It is meant to sit on colored backgrounds / pages so the underlying color shows through. The comparison below uses a neutral-tinted container: the default keeps the footer divider, while ghost is pure surface with no divider.

<DemoBlock title="ghost transparent background (tinted container comparison)">
  <div style="width: 100%; max-width: 640px; background: var(--oas-color-bg-hover); border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md)">
    <oas-page-header ghost title="User settings" subtitle="ghost: surface shows through, no divider" back>
      <div slot="footer" style="display: flex; justify-content: flex-end">
        <oas-button size="small" type="primary">Save</oas-button>
      </div>
    </oas-page-header>
  </div>
  <div style="width: 100%; max-width: 640px; background: var(--oas-color-bg-hover); border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md)">
    <oas-page-header title="User settings (default)" subtitle="Default: keeps the divider">
      <div slot="footer" style="display: flex; justify-content: flex-end">
        <oas-button size="small" type="primary">Save</oas-button>
      </div>
    </oas-page-header>
  </div>
</DemoBlock>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `back` | Whether to show the back button | `boolean` | — |
| `ghost` | Transparent-background variant: the header background rule is set to `none` (forced transparent so the container/page background shows through) and the footer divider is removed; title/text colors keep the theme foreground token; all other layout is unchanged | `boolean` | — |
| `subtitle` | Subtitle text | `string` | — |
| `title` | Title text (rendered into the visible title region; absorbed from the host on read so no native hover tooltip remains; pass an empty string to clear) | `string` | — |

### Events

| Event | Description |
| --- | --- |
| `oas-back` | The back button was clicked |

### Slots

| Name | Description |
| --- | --- |
| default | Body content (default slot, below the title row; not rendered when empty) |
| `avatar` | Avatar (between the back button and the title block; compose with the oas-avatar component, not rendered when empty) |
| `back-icon` | Icon slot for the back button; replaces the built-in chevron when present (empty comment nodes count as no content) |
| `breadcrumb` | Breadcrumb in its own top row; compose with the oas-breadcrumb component (not rendered when empty) |
| `extra` | Right-side action area |
| `footer` | Bottom action area (not rendered when empty) |
| `subtitle` | Rich subtitle content slot; overrides the subtitle attribute text when present |
| `title` | Rich title content slot; overrides the title attribute text when present |

Slots: body content goes in the default slot; the `breadcrumb` / `footer` / `content` blocks are not rendered when empty; the `title` / `subtitle` / `back-icon` slots override the attribute text / built-in icon when present. The back button renders as a native `<button aria-label="Back">`.
