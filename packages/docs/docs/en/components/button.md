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

## Variant

`variant` controls the button shape, orthogonal to the `type` semantic color: `solid` (default filled) / `outlined` / `dashed` / `filled` (soft) / `text` / `link`. Legacy `ghost` equals `outlined`, `plain` equals `filled`.

<DemoBlock title="Outlined / Dashed / Filled">
  <oas-button variant="outlined" type="primary">Outlined</oas-button>
  <oas-button variant="dashed" type="primary">Dashed</oas-button>
  <oas-button variant="filled" type="primary">Filled</oas-button>
  <oas-button variant="outlined">Default outlined</oas-button>
  <oas-button variant="dashed">Default dashed</oas-button>
</DemoBlock>

<DemoBlock title="Text / Link">
  <oas-button variant="text">Text button</oas-button>
  <oas-button variant="text" type="primary">Primary text</oas-button>
  <oas-button variant="link" href="#">Link button</oas-button>
</DemoBlock>

## Custom color

`color` overrides the `type` semantic color with any color value.

<DemoBlock title="Custom color">
  <oas-button color="#7c3aed">Purple solid</oas-button>
  <oas-button color="#0e9f6e" variant="outlined">Green outlined</oas-button>
  <oas-button color="#db2777" variant="filled">Pink filled</oas-button>
</DemoBlock>

## Press feedback

`wave` enables a subtle press feedback (slight sink + darken, on by default); `wave="false"` disables it.

<DemoBlock title="Press feedback">
  <oas-button type="primary">Press me (on by default)</oas-button>
  <oas-button wave="false">Feedback off</oas-button>
</DemoBlock>

## CJK auto spacing

`auto-insert-space` inserts a space between two consecutive CJK characters (typography optimization, off by default).

<DemoBlock title="CJK auto spacing">
  <oas-button auto-insert-space>保存设置</oas-button>
  <oas-button auto-insert-space type="primary">确认提交订单</oas-button>
</DemoBlock>

## Autofocus

`autofocus` gives the button focus after page load (native `autofocus` does not pierce Shadow DOM; the component forwards focus to the inner button on mount).

<DemoBlock title="autofocus">
  <oas-button autofocus type="primary">Focused on load</oas-button>
  <oas-button>Normal button</oas-button>
</DemoBlock>

## Long content wrapping

Buttons are single-line by default (`white-space: nowrap`). With the explicit `wrap` attribute, long text wraps within a constrained width (parent container or `width` / `max-width`) and the box grows with the content (same height as default when it fits on one line).

<DemoBlock title="wrap for long content">
  <oas-button wrap style="width: 120px;">A long button label that wraps automatically</oas-button>
  <oas-button wrap type="primary" style="max-width: 160px;">Long primary button text wraps in a narrow container</oas-button>
</DemoBlock>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `auto-insert-space` | CJK auto spacing: inserts a space between two consecutive CJK characters (off by default) | `string` | — |
| `autofocus` | Autofocus: focuses the inner button on mount (native autofocus does not pierce Shadow DOM; the component forwards it) | `boolean` | — |
| `block` | Fill the full width of the parent container (block level) | `boolean` | — |
| `circle` | Circle button (icon-only, square + full rounding) | `boolean` | — |
| `color` | Custom color: overrides the `type` semantic color (any color value) | `string` | — |
| `disabled` | Disabled | `boolean` | — |
| `ghost` | Ghost/outline style: transparent background + outline colored by `type`, darkens on hover | `boolean` | — |
| `href` | Link address: renders a native `<a>` when set | `string` | — |
| `icon` | Icon name (reusing the oas-icon icon set); without text it becomes an equal-width square and uses the icon name as the fallback label | `string` | — |
| `icon-position` | Icon position: `start` (default, left) / `end` (right) | `string` | `start` |
| `loading` | Loading state | `boolean` | — |
| `plain` | Plain style: low-contrast soft (transparent bg + softened text), equals `variant="filled"` | `boolean` | — |
| `round` | Pill radius (`--oas-radius-full` / `999px`) | `boolean` | — |
| `size` | Size: `xs` / `small` / `medium` (default) / `large` / `xl`; invalid values fall back to `medium` with a warning | `ButtonSize` | `medium` |
| `target` | How the link opens (`_blank` / `_self` etc.), with `href` | `string` | — |
| `type` | Type | `ButtonType` | `default` |
| `variant` | Shape (orthogonal to `type`): `solid` (default filled) / `outlined` / `dashed` / `filled` (soft) / `text` / `link` | `ButtonVariant \| ''` | — |
| `wave` | Press feedback: slight sink + darken (on by default); `wave="false"` disables | `string` | `true` |
| `wrap` | Long-text wrapping: single-line nowrap by default; when enabled, content wraps within constrained widths and the box grows with it | `boolean` | — |

### Events

| Event | Description |
| --- | --- |
| `oas-click` | Click, `detail: { originalEvent }` |

### Slots

| Name | Description |
| --- | --- |
| default | — |
