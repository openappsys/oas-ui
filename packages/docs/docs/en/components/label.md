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

## API

### Attributes

| Attribute  | Description                                                        | Type      | Default |
| ---------- | ------------------------------------------------------------------ | --------- | ------- |
| `for`      | Target control id; click forwards to `getElementById(for).focus()` | `string`  | —       |
| `position` | Position of the asterisk relative to the text                      | `string`  | `after` |
| `required` | Append a required `*` marker (`aria-hidden`)                       | `boolean` | —       |

### Slots

| Name    | Description |
| ------- | ----------- |
| default | —           |

> Note: `for` is also synced to the native `<label>` `for` attribute; the click behavior is manually forwarded and can focus the target control across Shadow DOM.
