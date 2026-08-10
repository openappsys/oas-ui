# Timeline

Displays a series of event nodes in chronological order.

## Basic Usage

<DemoBlock title="Basic timeline">
  <div style="width: 100%">
    <oas-timeline>
      <oas-timeline-item time="2024-01-01"><p>项目启动，明确目标与边界。</p></oas-timeline-item>
      <oas-timeline-item time="2024-03-01" color="green"><p>核心组件开发完成，单测通过。</p></oas-timeline-item>
      <oas-timeline-item time="2024-05-01" color="red"><p>修复线上问题并回归。</p></oas-timeline-item>
      <oas-timeline-item time="2024-06-15"><p>文档站上线，对外发布。</p></oas-timeline-item>
    </oas-timeline>
  </div>
</DemoBlock>

## Color Variants

<DemoBlock title="Node colors">
  <div style="width: 100%">
    <oas-timeline>
      <oas-timeline-item time="2024-06-01"><p>默认主题色</p></oas-timeline-item>
      <oas-timeline-item time="2024-06-02" color="green"><p>绿色：已完成</p></oas-timeline-item>
      <oas-timeline-item time="2024-06-03" color="red"><p>红色：告警</p></oas-timeline-item>
      <oas-timeline-item time="2024-06-04" color="gray"><p>灰色：已归档</p></oas-timeline-item>
    </oas-timeline>
  </div>
</DemoBlock>

## Rich Content Nodes

<DemoBlock title="Custom content">
  <div style="width: 100%">
    <oas-timeline>
      <oas-timeline-item time="2024-07-01">
        <p><strong>v1.2.0 发布</strong></p>
        <p style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">新增数据展示组件，详见版本说明。</p>
      </oas-timeline-item>
      <oas-timeline-item time="2024-07-15" color="green">
        <p><strong>v1.3.0 发布</strong></p>
        <p style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">优化暗色主题与无障碍支持。</p>
      </oas-timeline-item>
    </oas-timeline>
  </div>
</DemoBlock>

## Pending Tail Node

<DemoBlock title="Pending tail node">
  <div style="width: 100%">
    <oas-timeline>
      <oas-timeline-item time="2024-08-01"><p>v1.4.0 需求评审完成。</p></oas-timeline-item>
      <oas-timeline-item time="2024-08-10" color="green"><p>核心功能开发完成，单测通过。</p></oas-timeline-item>
      <oas-timeline-item pending></oas-timeline-item>
    </oas-timeline>
  </div>
</DemoBlock>

Setting `pending` on an `oas-timeline-item` renders that node as a hollow dot with a dashed connector, meaning "in progress / coming soon"; a node without content shows the "敬请期待" text by default.

## API

| Component            | Attribute   | Description                                                    | Type    | Default |
| -------------------- | ----------- | ------------------------------------------------------------- | ------- | ------- |
| `oas-timeline-item`  | `time`      | Time text of the node                                         | string  | —       |
| `oas-timeline-item`  | `color`     | Node marker color: `green` / `red` / `gray`; defaults to the theme color | string  | —       |
| `oas-timeline-item`  | `pending`   | In-progress node: hollow dot + dashed connector; shows "敬请期待" when empty | boolean | `false` |
