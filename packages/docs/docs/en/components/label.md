# Label

A form label component. `for` points to the target control's id, and clicking focuses the control; supports a required asterisk and its position.

## Basic usage

<DemoBlock title="Basic label">
  <oas-label for="demo-input">Name</oas-label>
  <oas-input id="demo-input" placeholder="Enter your name"></oas-input>
</DemoBlock>

## Required asterisk

`required` appends a `*` marker; `position` places the asterisk before (`before`) or after (`after`, default) the text.

<DemoBlock title="Required asterisk">
  <oas-label for="demo-required" required>Email</oas-label>
  <oas-input id="demo-required" placeholder="Enter your email"></oas-input>
</DemoBlock>

<DemoBlock title="Asterisk before">
  <oas-label for="demo-before" required position="before">Phone number</oas-label>
  <oas-input id="demo-before" placeholder="Enter your phone number"></oas-input>
</DemoBlock>

## Plain text label

Without `for`, only text is rendered and clicks don't forward focus; long text wraps instead of overflowing.

<DemoBlock title="Plain text & long text">
  <oas-label>Plain text label without for</oas-label>
  <oas-label>This is an especially long label text, used to demonstrate that long text wraps automatically without overflowing the container boundary. Please be patient while reading.</oas-label>
</DemoBlock>

## States

`error` renders validation-failure red text; `disabled` statically grays out (purely visual, doesn't block events — the associated control manages its own disabled); `colon` appends a colon after the text.

<DemoBlock title="States">
  <oas-label error>Failed validation label</oas-label>
  <oas-label disabled>Disabled label</oas-label>
  <oas-label colon>Label with colon</oas-label>
  <oas-label required colon>Required + colon</oas-label>
</DemoBlock>

## Tooltip

`tooltip` renders a hint icon button after the text; hovering shows a floating layer (reuses `oas-tooltip` — the component doesn't build its own floating layer).

<DemoBlock title="Hint icon">
  <oas-label tooltip="Username must be 3-20 characters">Username</oas-label>
</DemoBlock>

## Color

`color` accepts 11 preset names (auto-adapting to light/dark themes) or any CSS color value (takes effect immediately, overriding presets and defaults). Text uses the compliant token:

<DemoBlock title="Preset palette">
  <oas-label color="red">Red label</oas-label>
  <oas-label color="green">Green label</oas-label>
  <oas-label color="blue">Blue label</oas-label>
</DemoBlock>

<DemoBlock title="Custom color value">
  <oas-label color="#0e7490">Teal label</oas-label>
</DemoBlock>

## Alignment & wrapping (host CSS equivalents)

Text alignment and wrapping don't need component attributes — one line of host CSS does it:

<DemoBlock title="Alignment & wrapping (host CSS)">
  <oas-label style="text-align: right; display: block;">Right-aligned label</oas-label>
  <oas-label style="white-space: nowrap;">No-wrap label</oas-label>
</DemoBlock>

Required-mark forms (asterisk + position) are covered by `required` + `position`; the Field combo (label + error + description) is handled by `oas-form-item`.

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `colon` | — | `boolean` | — |
| `color` | — | `string` | — |
| `disabled` | — | `boolean` | — |
| `error` | — | `boolean` | — |
| `for` | Target control id; click forwards to `getElementById(for).focus()` | `string` | — |
| `position` | Position of the asterisk relative to the text | `string` | `after` |
| `required` | Append a required `*` marker (`aria-hidden`) | `boolean` | — |
| `tooltip` | — | `string` | — |

### Slots

| Name | Description |
| --- | --- |
| default | — |

> Note: `for` is also synced to the native `<label>` `for` attribute; the click behavior is manually forwarded and can focus the target control across Shadow DOM. Double-clicking doesn't select text (consistent with mainstream behavior).
