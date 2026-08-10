# VisuallyHidden

A container that is visible to screen readers but visually hidden. Commonly used for assistive descriptions, form validation hints, and other accessibility scenarios.

## Basic usage

<DemoBlock title="Visually hidden text">
  <oas-button>Submit</oas-button>
  <oas-visually-hidden>This form can only be submitted once. Please confirm the content is correct before submitting.</oas-visually-hidden>
</DemoBlock>

## API

This component has no attributes; it only passes through content via the default slot.

### Slots

| Name | Description |
| --- | --- |
| default | Passed-through content, visually hidden but readable and copyable by screen readers |

> Note: uses the classic clip technique (`position: absolute; width/height: 1px; clip`, etc.) for visual hiding; purely presentational with no interactive elements and no events.
