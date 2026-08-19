# VisuallyHidden

A container that is visible to screen readers but visually hidden. Commonly used for assistive descriptions, form validation hints, and other accessibility scenarios.

## Basic usage

<DemoBlock title="Visually hidden text">
  <oas-button>Submit</oas-button>
  <oas-visually-hidden>This form can only be submitted once. Please confirm the content is correct before submitting.</oas-visually-hidden>
</DemoBlock>

## Reveal on focus (focusable)

With `focusable`, content stays visually hidden by default but appears when focused — the skip-link scenario (keyboard users Tab to a "skip to main content" link and it becomes visible). Tab to the link below to see it appear:

<DemoBlock title="Reveal on focus">
  <oas-visually-hidden focusable>
    <oas-link href="#main">Skip to main content</oas-link>
  </oas-visually-hidden>
  <p style="margin: 8px 0 0; font-size: 13px; color: var(--oas-color-text-secondary);">↑ Hidden by default; appears when the link is focused via Tab</p>
</DemoBlock>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `focusable` | Visually hidden by default, revealed when content is focused (skip-link scenario) | — | — |

### Slots

| Name | Description |
| --- | --- |
| default | Passed-through content, visually hidden but readable and copyable by screen readers |

> Note: uses the classic clip technique (`position: absolute; width/height: 1px; clip`, etc.) for visual hiding; purely presentational with no interactive elements and no events.
