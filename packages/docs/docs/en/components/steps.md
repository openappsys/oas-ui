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

| Property    | Description                                              | Default                 |
| ----------- | -------------------------------------------------------- | ----------------------- |
| `steps`     | `[{ title, description?, status? }]` JSON string         | `[]`                    |
| `current`   | Current step index (0-based)                             | `0`                     |
| `direction` | Direction                                                | `horizontal` / `vertical` |
| `clickable` | Steps are clickable to jump (boolean; enabled when present) | off                    |

State rules: an explicit `status` (`wait` / `process` / `finish` / `error`) takes priority; otherwise it is derived from `current` — index `< current` is `finish` (✓), `=== current` is `process`, and the rest are `wait`.

| Event        | Description                                  | detail        |
| ------------ | -------------------------------------------- | ------------- |
| `oas-change` | Fired when a clickable step is clicked (including keyboard triggers) | `{ index }` (0-based) |
