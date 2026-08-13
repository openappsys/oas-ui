# Button

Basic button component, an enhanced native `<button>`.

## Types

<DemoBlock title="Button types">
  <oas-button>Default</oas-button>
  <oas-button type="primary">Primary</oas-button>
  <oas-button type="success">Success</oas-button>
  <oas-button type="warning">Warning</oas-button>
  <oas-button type="danger">Danger</oas-button>
  <oas-button type="text">Text</oas-button>
</DemoBlock>

## Sizes

<DemoBlock title="Five sizes">
  <oas-button size="xs">XS</oas-button>
  <oas-button size="small">Small</oas-button>
  <oas-button size="medium">Medium</oas-button>
  <oas-button size="large">Large</oas-button>
  <oas-button size="xl">XL</oas-button>
</DemoBlock>

`size` supports five tiers: `xs` / `small` / `medium` (default) / `large` / `xl`; invalid values fall back to `medium` with a warning.

<DemoBlock title="Five sizes · primary">
  <oas-button type="primary" size="xs">XS</oas-button>
  <oas-button type="primary" size="small">Small</oas-button>
  <oas-button type="primary" size="medium">Medium</oas-button>
  <oas-button type="primary" size="large">Large</oas-button>
  <oas-button type="primary" size="xl">XL</oas-button>
</DemoBlock>

<DemoBlock title="Five sizes · icon-only">
  <oas-button icon="search" size="xs" aria-label="Search"></oas-button>
  <oas-button icon="search" size="small" aria-label="Search"></oas-button>
  <oas-button icon="search" size="medium" aria-label="Search"></oas-button>
  <oas-button icon="search" size="large" aria-label="Search"></oas-button>
  <oas-button icon="search" size="xl" aria-label="Search"></oas-button>
</DemoBlock>

## Disabled & Loading

<DemoBlock title="Disabled and loading states">
  <oas-button disabled>Disabled</oas-button>
  <oas-button type="primary" loading>Loading</oas-button>
  <oas-button type="success" loading>Submitting</oas-button>
</DemoBlock>

## Events

<DemoBlock title="Click event">
  <oas-button type="primary" onoas-click="message.info('oas-click event fired')">Click me</oas-button>
</DemoBlock>

Clicking dispatches the `oas-click` CustomEvent (bubbles + composed); `detail.originalEvent` is the native MouseEvent.

## Icon buttons

`icon` renders an icon before the text (reusing the oas-icon icon set, `IconName`); the spacing between the icon and text follows `--oas-space-2`.

<DemoBlock title="Icon + text">
  <oas-button type="primary" icon="search">Search</oas-button>
  <oas-button type="success" icon="download">Download</oas-button>
  <oas-button type="danger" icon="trash">Delete</oas-button>
  <oas-button icon="plus">New</oas-button>
</DemoBlock>

Without text, the button becomes an equal-width square and needs an `aria-label` for an accessible name; when not set explicitly, the icon name is used as a fallback (e.g. `icon="close"` → `aria-label="close"`). It is recommended to provide an explicit label.

<DemoBlock title="Icon-only buttons">
  <oas-button type="primary" icon="check" aria-label="Confirm"></oas-button>
  <oas-button icon="search" aria-label="Search"></oas-button>
  <oas-button type="danger" icon="trash" aria-label="Delete"></oas-button>
  <oas-button icon="heart" aria-label="Favorite"></oas-button>
</DemoBlock>

## Block

`block` makes the button fill the full width of its parent container.

<DemoBlock title="Block buttons">
  <oas-button block type="primary">Block button</oas-button>
  <oas-button block type="success" icon="download">Download</oas-button>
</DemoBlock>

## Rounded

`round` applies a pill radius (`--oas-radius-full`, falling back to `999px` when the token is unavailable).

<DemoBlock title="Rounded buttons">
  <oas-button round type="primary" icon="check">Done</oas-button>
  <oas-button round icon="search" aria-label="Search"></oas-button>
  <oas-button round type="danger">Unsubscribe</oas-button>
</DemoBlock>

## Ghost

`ghost` renders a transparent background with an outline; the outline and text are colored by `type` and darken on hover.

<DemoBlock title="Ghost buttons">
  <oas-button ghost>Default ghost</oas-button>
  <oas-button ghost type="primary">Primary ghost</oas-button>
  <oas-button ghost type="success">Success ghost</oas-button>
  <oas-button ghost type="warning">Warning ghost</oas-button>
  <oas-button ghost type="danger" icon="trash">Danger ghost</oas-button>
</DemoBlock>

## Circle

`circle` turns the button into a circle; icon-only buttons combine equal-width and full rounding into a circle.

<DemoBlock title="Circle buttons">
  <oas-button circle icon="search" aria-label="Search"></oas-button>
  <oas-button circle type="primary" icon="check" aria-label="Confirm"></oas-button>
  <oas-button circle type="danger" icon="trash" aria-label="Delete"></oas-button>
</DemoBlock>

## Icon position

`icon-position` controls the icon/text order: `start` (default, icon on the left) or `end` (icon on the right).

<DemoBlock title="Icon on the right">
  <oas-button icon-position="end" type="primary" icon="download">Download</oas-button>
  <oas-button icon-position="end" icon="chevron-right">Next</oas-button>
</DemoBlock>

## Link button

Setting `href` renders a native link (`<a>`); `target` controls how it opens (`_blank` / `_self` etc.).

<DemoBlock title="Link buttons">
  <oas-button href="#">Default link</oas-button>
  <oas-button href="#" target="_blank" type="primary">Open in new tab</oas-button>
</DemoBlock>

## Plain

`plain` uses a low-contrast, subtle style (transparent background with softened outline and text), gentler on light backgrounds.

<DemoBlock title="Plain buttons">
  <oas-button plain>Plain button</oas-button>
  <oas-button plain type="primary">Primary plain</oas-button>
  <oas-button plain type="danger">Danger plain</oas-button>
</DemoBlock>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `block` | Fill the full width of the parent container (block level) | `boolean` | — |
| `circle` | — | `boolean` | — |
| `disabled` | Disabled | `boolean` | — |
| `ghost` | Ghost/outline style: transparent background + outline colored by `type`, darkens on hover | `boolean` | — |
| `href` | — | `string` | — |
| `icon` | Icon name (reusing the oas-icon icon set); without text it becomes an equal-width square and uses the icon name as the fallback label | `string` | — |
| `icon-position` | — | `string` | `start` |
| `loading` | Loading state | `boolean` | — |
| `plain` | — | `boolean` | — |
| `round` | Pill radius (`--oas-radius-full` / `999px`) | `boolean` | — |
| `size` | Size: `xs` / `small` / `medium` (default) / `large` / `xl`; invalid values fall back to `medium` with a warning | `ButtonSize` | `medium` |
| `target` | — | `string` | — |
| `type` | Type | `ButtonType` | `default` |

### Events

| Event | Description |
| --- | --- |
| `oas-click` | Click, `detail: { originalEvent }` |

### Slots

| Name | Description |
| --- | --- |
| default | — |
