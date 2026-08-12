# Timeline

Displays a series of event nodes in chronological order.

## Basic Usage

<DemoBlock title="Basic timeline">
  <div style="width: 100%">
    <oas-timeline>
      <oas-timeline-item time="2024-01-01"><p>Project kickoff; goals and scope defined.</p></oas-timeline-item>
      <oas-timeline-item time="2024-03-01" color="green"><p>Core components developed; unit tests pass.</p></oas-timeline-item>
      <oas-timeline-item time="2024-05-01" color="red"><p>Fixed production issues and ran regression.</p></oas-timeline-item>
      <oas-timeline-item time="2024-06-15"><p>Docs site launched and published.</p></oas-timeline-item>
    </oas-timeline>
  </div>
</DemoBlock>

## Color Variants

<DemoBlock title="Node colors">
  <div style="width: 100%">
    <oas-timeline>
      <oas-timeline-item time="2024-06-01"><p>Default theme color</p></oas-timeline-item>
      <oas-timeline-item time="2024-06-02" color="green"><p>Green: completed</p></oas-timeline-item>
      <oas-timeline-item time="2024-06-03" color="red"><p>Red: alert</p></oas-timeline-item>
      <oas-timeline-item time="2024-06-04" color="gray"><p>Gray: archived</p></oas-timeline-item>
    </oas-timeline>
  </div>
</DemoBlock>

## Rich Content Nodes

<DemoBlock title="Custom content">
  <div style="width: 100%">
    <oas-timeline>
      <oas-timeline-item time="2024-07-01">
        <p><strong>v1.2.0 released</strong></p>
        <p style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">Added data-display components; see the release notes.</p>
      </oas-timeline-item>
      <oas-timeline-item time="2024-07-15" color="green">
        <p><strong>v1.3.0 released</strong></p>
        <p style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">Improved the dark theme and accessibility.</p>
      </oas-timeline-item>
    </oas-timeline>
  </div>
</DemoBlock>

## Pending Tail Node

<DemoBlock title="Pending tail node">
  <div style="width: 100%">
    <oas-timeline>
      <oas-timeline-item time="2024-08-01"><p>v1.4.0 requirements review completed.</p></oas-timeline-item>
      <oas-timeline-item time="2024-08-10" color="green"><p>Core features developed; unit tests pass.</p></oas-timeline-item>
      <oas-timeline-item pending></oas-timeline-item>
    </oas-timeline>
  </div>
</DemoBlock>

Setting `pending` on an `oas-timeline-item` renders that node as a hollow dot with a dashed connector, meaning "in progress / coming soon"; a node without content shows the "敬请期待" text by default.

## API

### oas-timeline-item

| Attribute | Description                                                                  | Type | Default |
| --------- | ---------------------------------------------------------------------------- | ---- | ------- |
| `color`   | Node marker color: `green` / `red` / `gray`; defaults to the theme color     | —    | —       |
| `pending` | In-progress node: hollow dot + dashed connector; shows "敬请期待" when empty | —    | —       |
| `time`    | Time text of the node                                                        | —    | —       |

| Name    | Description |
| ------- | ----------- |
| default | —           |
