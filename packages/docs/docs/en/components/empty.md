# Empty

A placeholder for empty data, supporting titles, rich descriptions, icon media, two built-in illustrations, size tiers, horizontal alignment and container variants.

## Basic usage

<DemoBlock title="Basic usage">
  <oas-empty></oas-empty>
</DemoBlock>

## Title + description

Combine the `title` attribute (rendered into the visible title region; absorbed from the host on read so no native hover tooltip remains; pass an empty string to clear) with the `description` attribute.

<DemoBlock title="Title + description">
  <oas-empty title="No data yet" description="Adjust the filters and try again"></oas-empty>
</DemoBlock>

The title layer supports rich content: content in the `title` slot overrides the attribute text (badges, links or any markup).

<DemoBlock title="Rich title (slot=title)">
  <oas-empty description="This group has no members yet; they will appear here once invited">
    <span slot="title">No members yet <oas-tag size="small">Team</oas-tag></span>
  </oas-empty>
</DemoBlock>

## Description

Description text is set via the `description` attribute, or via rich content placed in the default slot (which overrides the attribute when present) — handy for wrapped text or usage hints.

<DemoBlock title="Description attribute">
  <oas-empty description="No matching records"></oas-empty>
</DemoBlock>

<DemoBlock title="Rich description (default slot)">
  <oas-empty title="Sync failed">
    <span>The sync was interrupted by the network. Check the <oas-link href="#">help center</oas-link> or retry later.</span>
  </oas-empty>
</DemoBlock>

## Size tiers

`size` provides small / medium / large (default medium), scaling both the media and typography. `image-size` stays available for pixel-level tuning and takes precedence over the tier.

<DemoBlock title="Size tiers">
  <oas-space direction="horizontal" size="large" align="start" wrap>
    <oas-empty title="Compact" size="small"></oas-empty>
    <oas-empty title="Default" size="medium"></oas-empty>
    <oas-empty title="Roomy" size="large"></oas-empty>
    <oas-empty title="Tuned 72" image-size="72"></oas-empty>
  </oas-space>
</DemoBlock>

## Custom illustration (image URL / SVG markup / slot)

The `illustration` attribute accepts an image URL or inline SVG/HTML markup; the `illustration` slot takes any content and has the highest priority.

<DemoBlock title="Image URL">
  <oas-empty title="No data" illustration="https://picsum.photos/seed/oas-empty/120"></oas-empty>
</DemoBlock>

<DemoBlock title="SVG markup">
  <oas-empty title="No data" illustration="<svg viewBox='0 0 120 120' xmlns='http://www.w3.org/2000/svg'><rect x='20' y='28' width='80' height='56' rx='10' fill='var(--oas-color-border)' stroke='var(--oas-color-text-disabled)'/><circle cx='60' cy='86' r='16' fill='var(--oas-color-primary)' opacity='0.2'/><circle cx='60' cy='86' r='5' fill='var(--oas-color-primary)'/></svg>"></oas-empty>
</DemoBlock>

<DemoBlock title="Slot custom illustration">
  <oas-empty title="Custom illustration">
    <svg slot="illustration" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><circle cx="60" cy="60" r="42" fill="var(--oas-color-primary)" opacity="0.15"/><circle cx="60" cy="60" r="18" fill="none" stroke="var(--oas-color-primary)" stroke-width="4"/></svg>
  </oas-empty>
</DemoBlock>

## Second built-in illustration

`illustration="simple"` switches to the built-in simple illustration (original lightweight artwork).

<DemoBlock title="Simple illustration">
  <oas-space direction="horizontal" size="large" align="start" wrap>
    <oas-empty title="Default illustration"></oas-empty>
    <oas-empty title="Simple illustration" illustration="simple"></oas-empty>
  </oas-space>
</DemoBlock>

## Icon media

The `icon` attribute accepts an icon name (from the @oas-ui/icons registry) and renders an icon badge with a circular tinted background — mutually exclusive with the illustration form. Its color is driven by the CSS variable `--oas-empty-icon-color` (defaults to the secondary text color; hosts may override it).

<DemoBlock title="Icon media">
  <oas-space direction="horizontal" size="large" align="start" wrap>
    <oas-empty title="No results" description="Try different keywords" icon="search"></oas-empty>
    <oas-empty title="No access" description="Ask an admin for access" icon="lock"></oas-empty>
  </oas-space>
</DemoBlock>

<DemoBlock title="Icon media (custom color)">
  <oas-empty title="Inbox cleared" description="New messages will show up here" icon="mail" style="--oas-empty-icon-color: var(--oas-color-primary)"></oas-empty>
</DemoBlock>

## Horizontal alignment

`align="start"` or `align="end"` switches to a horizontal layout (media on the inline-start / inline-end side) — a good fit for wide containers or in-form empty states; the default `center` stays vertical. Mirrors automatically under RTL.

<DemoBlock title="Horizontal alignment">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-empty align="start" title="No active projects" description="Create your first project to start organizing your work"></oas-empty>
    <oas-empty align="end" title="No search results" description="Try shorter keywords or clear the filters" illustration="simple"></oas-empty>
  </oas-space>
</DemoBlock>

## Container variants

`variant` provides outlined (bordered container) and filled (tinted container); without it the empty state keeps its default bare layout.

<DemoBlock title="Container variants">
  <oas-space direction="horizontal" size="large" align="start" wrap>
    <oas-empty variant="outlined" title="Outlined" description="Mark the empty area with a border"></oas-empty>
    <oas-empty variant="filled" title="Filled" description="Highlight the empty area with a background"></oas-empty>
  </oas-space>
</DemoBlock>

## Hide illustration

`hide-image` hides the media area and keeps only the text and actions.

<DemoBlock title="Hide illustration">
  <oas-empty title="No data" description="No illustration here" hide-image></oas-empty>
</DemoBlock>

## Action area

Place action buttons in the `action` slot below the content.

<DemoBlock title="Action area">
  <oas-empty title="No members yet" description="Invite members to start collaborating">
    <oas-button slot="action" size="small" type="primary">Invite member</oas-button>
    <oas-button slot="action" size="small">Refresh list</oas-button>
  </oas-empty>
</DemoBlock>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `align` | Layout alignment: `center` (default, vertical) / `start` / `end` (horizontal, media leading or trailing) | `string` | `center` |
| `description` | Description text | — | — |
| `hide-image` | Hide the illustration | — | — |
| `icon` | Icon-set name (oas-icon registry): icon media with a tinted circular backdrop, mutually exclusive with illustration | — | — |
| `illustration` | Custom illustration: SVG/HTML markup or image URL | — | — |
| `image-size` | Illustration size (px) | — | — |
| `size` | Size preset `small` / `medium` (default) / `large`: scales media and font sizes; orthogonal to `image-size` | `string` | `medium` |
| `title` | Title shown above the description (absorbed from the host once rendered — native title absorption; use the title slot for rich content) | `string` | — |
| `variant` | Container variant: `outlined` (border) / `filled` (tinted background); none by default | `string` | — |

### Slots

| Name | Description |
| --- | --- |
| default | Rich description slot; overrides the description attribute and built-in text when present |
| `action` | Action area, placed below the description |
| `illustration` | Custom illustration content, takes precedence over the `illustration` attribute |
| `title` | Rich title slot; overrides the title attribute when present |
