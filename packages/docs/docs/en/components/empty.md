# Empty

A placeholder for empty data, supporting custom descriptions, custom illustrations with sizing, and hiding the illustration or action area.

## Basic usage

<DemoBlock title="Basic usage">
  <oas-empty></oas-empty>
</DemoBlock>

## Custom description

<DemoBlock title="Custom description">
  <oas-empty description="No matching records"></oas-empty>
</DemoBlock>

## Custom illustration (image URL)

Pass an image URL via the `illustration` attribute to replace the default illustration.

<DemoBlock title="Image URL">
  <oas-empty description="No data" illustration="https://picsum.photos/seed/oas-empty/120"></oas-empty>
</DemoBlock>

## Custom illustration (SVG markup)

The `illustration` attribute also accepts inline SVG/HTML markup.

<DemoBlock title="SVG markup">
  <oas-empty description="No data" illustration="<svg viewBox='0 0 120 120' xmlns='http://www.w3.org/2000/svg'><rect x='20' y='28' width='80' height='56' rx='10' fill='var(--oas-color-border)' stroke='var(--oas-color-text-disabled)'/><circle cx='60' cy='86' r='16' fill='var(--oas-color-primary)' opacity='0.2'/><circle cx='60' cy='86' r='5' fill='var(--oas-color-primary)'/></svg>"></oas-empty>
</DemoBlock>

## Custom illustration (slot)

Pass any content via `slot="illustration"`; it takes precedence over the `illustration` attribute.

<DemoBlock title="Slot custom illustration">
  <oas-empty description="Custom illustration content">
    <svg slot="illustration" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><circle cx="60" cy="60" r="42" fill="var(--oas-color-primary)" opacity="0.15"/><circle cx="60" cy="60" r="18" fill="none" stroke="var(--oas-color-primary)" stroke-width="4"/></svg>
  </oas-empty>
</DemoBlock>

## Custom size

Control the illustration size (number, in px) via `image-size`, used together with a custom illustration.

<DemoBlock title="Custom size">
  <oas-empty description="Enlarged illustration" image-size="160" illustration="<svg viewBox='0 0 120 120' xmlns='http://www.w3.org/2000/svg'><circle cx='60' cy='60' r='44' fill='var(--oas-color-primary)' opacity='0.15'/><circle cx='60' cy='60' r='20' fill='none' stroke='var(--oas-color-primary)' stroke-width='4'/></svg>"></oas-empty>
</DemoBlock>

## Hide illustration

<DemoBlock title="Hide illustration">
  <oas-empty description="No data" hide-image></oas-empty>
</DemoBlock>

## Action area

<DemoBlock title="Action area">
  <oas-empty description="No members yet">
    <oas-button slot="action" size="small" type="primary">Invite member</oas-button>
    <oas-button slot="action" size="small">Refresh list</oas-button>
  </oas-empty>
</DemoBlock>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `description` | Description text | — | — |
| `hide-image` | Hide the illustration | — | — |
| `illustration` | Custom illustration: SVG/HTML markup or image URL | — | — |
| `image-size` | Illustration size (px) | — | — |

### Slots

| Name | Description |
| --- | --- |
| `action` | Action area, placed below the description |
| `illustration` | Custom illustration content, takes precedence over the `illustration` attribute |
