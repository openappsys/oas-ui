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

<DemoBlock title="Three sizes">
  <oas-button size="small">Small</oas-button>
  <oas-button size="medium">Medium</oas-button>
  <oas-button size="large">Large</oas-button>
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

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `block` | Fill the full width of the parent container (block level) | — | — |
| `disabled` | Disabled | — | — |
| `ghost` | Ghost/outline style: transparent background + outline colored by `type`, darkens on hover | — | — |
| `icon` | Icon name (reusing the oas-icon icon set); without text it becomes an equal-width square and uses the icon name as the fallback label | — | — |
| `loading` | Loading state | — | — |
| `round` | Pill radius (`--oas-radius-full` / `999px`) | — | — |
| `size` | Size | `ButtonSize` | `medium` |
| `type` | Type | `ButtonType` | `default` |

### Events

| Event | Description |
| --- | --- |
| `oas-click` | Click, `detail: { originalEvent }` |

### Slots

| Name | Description |
| --- | --- |
| default | — |
