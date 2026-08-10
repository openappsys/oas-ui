# VisuallyHidden

A container that is visible to screen readers but visually hidden. Commonly used for assistive descriptions, form validation hints, and other accessibility scenarios.

## Basic usage

<DemoBlock title="Visually hidden text">
  <oas-button>提交</oas-button>
  <oas-visually-hidden>该表单仅能提交一次，提交前请确认内容无误。</oas-visually-hidden>
</DemoBlock>

## API

This component has no attributes; it only passes through content via the default slot.

| Slot | Description |
| --- | --- |
| Default | Passed-through content, visually hidden but readable and copyable by screen readers |

> Note: uses the classic clip technique (`position: absolute; width/height: 1px; clip`, etc.) for visual hiding; purely presentational with no interactive elements and no events.
