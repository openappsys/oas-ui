# Result

A result feedback page supporting success, error, warning, info, plus 403/404/500 HTTP error page states — with dual title/description channels, a body slot, custom icons and size tiers.

## Basic usage

<DemoBlock title="Basic usage">
  <oas-result status="success" title="Submitted successfully" description="Your order has been paid"></oas-result>
</DemoBlock>

## Four states

Each of the four states comes with an original SVG icon on a circular tinted background; state colors follow semantic tokens (with dark variants).

<DemoBlock title="Four states">
  <oas-space direction="vertical" size="large" style="width: 100%">
    <oas-result status="success" title="Operation succeeded" description="Processing completed"></oas-result>
    <oas-result status="error" title="Operation failed" description="A problem occurred during processing"></oas-result>
    <oas-result status="warning" title="Warning" description="Some operations could not be completed"></oas-result>
    <oas-result status="info" title="Info" description="This is an informational message"></oas-result>
  </oas-space>
</DemoBlock>

## HTTP error pages (403 / 404 / 500)

The `status` attribute supports 403 / 404 / 500 HTTP error scenarios, each with an original semantic glyph (padlock / question mark / server). Color mapping: 403→warning, 404→primary, 500→danger.

<DemoBlock title="403 Forbidden">
  <oas-result status="403" title="403" description="Sorry, you do not have permission to access this page">
    <oas-button slot="extra" type="primary">Back to home</oas-button>
    <oas-button slot="extra">Contact admin</oas-button>
  </oas-result>
</DemoBlock>

<DemoBlock title="404 Not Found">
  <oas-result status="404" title="404" description="Sorry, the page you visited does not exist or has been removed">
    <oas-button slot="extra" type="primary">Back to home</oas-button>
  </oas-result>
</DemoBlock>

<DemoBlock title="500 Server Error">
  <oas-result status="500" title="500" description="Something went wrong on our end, please try again later">
    <oas-button slot="extra" type="primary">Refresh and retry</oas-button>
  </oas-result>
</DemoBlock>

## Rich description

Rich description content goes through the `description` slot, which overrides the attribute text when present.

<DemoBlock title="Rich description (slot=description)">
  <oas-result status="info" title="Scheduled maintenance">
    <span slot="description">Maintenance window: tonight <oas-tag size="small">22:00 – 24:00</oas-tag>; some services may be briefly unavailable.</span>
  </oas-result>
</DemoBlock>

## Body content (error detail list)

The default slot is the body content area between the description and the action area — the classic spot for listing error details.

<DemoBlock title="Body content (error detail list)">
  <oas-result status="error" title="Submission failed" description="Please fix the following issues and resubmit">
    <ul>
      <li>Recipient name is required</li>
      <li>The phone number format is invalid</li>
      <li>The invoice title does not match the tax ID</li>
    </ul>
    <oas-button slot="extra" type="primary">Back to edit</oas-button>
  </oas-result>
</DemoBlock>

## Custom icon

Passing a custom icon through the `icon` slot switches to a neutral state (the semantic tinted background and state color are removed, so the icon is fully custom) — useful for branded or special-purpose results.

<DemoBlock title="Custom icon (slot=icon)">
  <oas-result title="Now in the review queue" description="We will finish the review within one business day">
    <svg slot="icon" viewBox="0 0 16 16" width="72" height="72" fill="none" stroke="var(--oas-color-primary)" stroke-width="1.5" aria-hidden="true"><circle cx="8" cy="8" r="6"/><path d="M6.5 7.5 L7.8 8.8 L10 5.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
    <oas-button slot="extra" type="primary">View review progress</oas-button>
  </oas-result>
</DemoBlock>

## Size tiers

`size` provides small / medium / large (default medium), scaling both the icon diameter and typography.

<DemoBlock title="Size tiers">
  <oas-space direction="horizontal" size="large" align="start" wrap>
    <oas-result status="success" size="small" title="Compact"></oas-result>
    <oas-result status="success" size="medium" title="Default"></oas-result>
    <oas-result status="success" size="large" title="Roomy"></oas-result>
  </oas-space>
</DemoBlock>

## Rich title

The `title` slot accepts rich content (for example a large status code composed with explanatory text), overriding the `title` attribute.

<DemoBlock title="Rich title (slot=title)">
  <oas-result status="error" description="Connection lost">
    <span slot="title" style="font-size: 40px; line-height: 1.2">Cannot reach the server</span>
  </oas-result>
</DemoBlock>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `description` | Description text | `string` | — |
| `size` | Size preset `small` / `medium` (default) / `large`: scales icon diameter and font sizes | `string` | `medium` |
| `status` | Status: `success` / `error` / `warning` / `info` / `403` / `404` / `500` (HTTP error pages with dedicated icons); invalid values fall back to info with a warning | `string` | `success` |
| `title` | Title text (rendered into the visible title region; absorbed from the host on read so no native hover tooltip remains; pass an empty string to clear); use the "title" slot for rich content | `string` | — |

### Slots

| Name | Description |
| --- | --- |
| default | Content area (error detail lists, etc.), placed between the description and the extra actions |
| `description` | Rich description slot; overrides the description attribute when present |
| `extra` | Action area, placed below the description |
| `icon` | Custom icon (overrides the built-in status icon; switches to neutral styling without the tinted backdrop) |
| `title` | Rich title content slot; overrides the title attribute text when present |
