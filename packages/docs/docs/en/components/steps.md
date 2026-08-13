# Steps

A step indicator that guides users through a task, with four states (wait / process / finish / error), vertical layout and clickable navigation.

## Basic usage

<DemoBlock title="In progress">
  <oas-steps current="1" steps='[{"title":"Create order","description":"Fill in order details"},{"title":"Confirm payment","description":"Choose a payment method"},{"title":"Complete shipping","description":"Wait for delivery"}]'></oas-steps>
</DemoBlock>

## Finished state

<DemoBlock title="All finished">
  <oas-steps current="3" steps='[{"title":"Create order"},{"title":"Confirm payment"},{"title":"Complete shipping"}]'></oas-steps>
</DemoBlock>

## Initial step

<DemoBlock title="Initial waiting">
  <oas-steps current="0" steps='[{"title":"Step 1"},{"title":"Step 2"},{"title":"Step 3"}]'></oas-steps>
</DemoBlock>

## Four states

Set the state explicitly per step via the `status` field: `wait` waiting (secondary color + number), `process` in progress (primary color + number), `finish` done (success color + ✓), `error` error (danger color + ✕).

<DemoBlock title="wait / process / finish / error">
  <oas-steps steps='[{"title":"Waiting","description":"Not started","status":"wait"},{"title":"In progress","description":"Processing","status":"process"},{"title":"Completed","description":"Succeeded","status":"finish"},{"title":"Error","description":"Failed","status":"error"}]'></oas-steps>
</DemoBlock>

## Clickable switching

With `clickable` enabled, step items are clickable to jump (the whole item is clickable and keyboard-reachable via Enter/Space); clicking fires `oas-change` (detail is `{ index }`) and switches the current step.

<DemoBlock title="Click a step to switch the current step">
  <oas-steps clickable current="1" onoas-change="message.info('Switched to step ' + (event.detail.index + 1))" steps='[{"title":"Create order","description":"Fill in order details"},{"title":"Confirm payment","description":"Choose a payment method"},{"title":"Complete shipping","description":"Wait for delivery"}]'></oas-steps>
</DemoBlock>

## Progress dot

With `progress-dot`, the step indicator becomes a dot (the current step is enlarged with a soft halo) and the connector is a thin line; combined with `clickable`, dots are clickable to jump (keyboard included).

<DemoBlock title="Progress dot">
  <oas-steps progress-dot clickable current="1" onoas-change="message.info('Switched to step ' + (event.detail.index + 1))" steps='[{"title":"Create order"},{"title":"Confirm payment"},{"title":"Complete shipping"}]'></oas-steps>
</DemoBlock>

## Navigation mode

With `navigation`, steps become an arrow navigation bar: the current step is highlighted in primary color, previous steps use a light primary tint, waiting steps are gray, and descriptions are hidden. Step items are implicitly clickable (no `clickable` needed). A "Previous / Next" button row is rendered at the bottom (disabled at the first/last step); clicking a step or a button fires `oas-change` (detail is `{ index }`) and switches the current step.

<DemoBlock title="Navigation mode (Previous / Next)">
  <oas-steps navigation current="1" onoas-change="message.info('Current step: ' + (event.detail.index + 1))" steps='[{"title":"Fill in details"},{"title":"Review information"},{"title":"Submit"}]'></oas-steps>
</DemoBlock>

## Without description

<DemoBlock title="Titles only">
  <oas-steps current="1" steps='[{"title":"Register"},{"title":"Real-name verification"},{"title":"Activation complete"}]'></oas-steps>
</DemoBlock>

## Vertical

<DemoBlock title="Vertical direction">
  <div style="width: 260px">
    <oas-steps direction="vertical" current="1" steps='[{"title":"Fill in profile","description":"Basic info and contact details"},{"title":"Upload ID documents","description":"Front and back of ID card"},{"title":"Approved","description":"Waiting for admin review"}]'></oas-steps>
  </div>
</DemoBlock>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `clickable` | Steps are clickable to jump (boolean; enabled when present) | `boolean` | — |
| `current` | Current step index (0-based) | `string` | `0` |
| `direction` | Direction (forced to horizontal in navigation mode) | `string` | `horizontal` |
| `navigation` | Navigation mode: arrow bar with a bottom Previous/Next button row (boolean; enabled when present) | `boolean` | — |
| `progress-dot` | Progress-dot steps: dot indicators with a thin connector line (boolean; enabled when present) | `boolean` | — |
| `steps` | `[{ title, description?, status? }]` JSON string | `StepItem[] \| string` | `[]` |

### Events

| Event | Description |
| --- | --- |
| `oas-change` | Fired when a clickable step or a navigation button is clicked (including keyboard triggers); `detail: { index }` (0-based) |

State rules: an explicit `status` (`wait` / `process` / `finish` / `error`) takes priority; otherwise it is derived from `current` — index `< current` is `finish` (✓), `=== current` is `process`, and the rest are `wait`.
