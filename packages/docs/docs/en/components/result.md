# Result

A result feedback page supporting four states: success, error, warning, and info.

## Basic usage

<DemoBlock title="Basic usage">
  <oas-result status="success" title="Submitted successfully" description="Your order has been paid"></oas-result>
</DemoBlock>

## Four states

<DemoBlock title="Four states">
  <oas-space direction="vertical" size="large" style="width: 100%">
    <oas-result status="success" title="Operation succeeded" description="Processing completed"></oas-result>
    <oas-result status="error" title="Operation failed" description="A problem occurred during processing"></oas-result>
    <oas-result status="warning" title="Warning" description="Some operations could not be completed"></oas-result>
    <oas-result status="info" title="Info" description="This is an informational message"></oas-result>
  </oas-space>
</DemoBlock>

## Action area

<DemoBlock title="Action area">
  <oas-result status="success" title="Submitted successfully" description="Your order has been paid">
    <oas-button slot="extra" type="primary">Back to home</oas-button>
    <oas-button slot="extra">View order</oas-button>
  </oas-result>
</DemoBlock>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `description` | Description text | — | — |
| `status` | Result status | — | `success` |
| `title` | Title text | — | — |

### Slots

| Name | Description |
| --- | --- |
| `extra` | Action area, placed below the description |
