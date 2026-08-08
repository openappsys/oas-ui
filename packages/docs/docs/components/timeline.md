# Timeline 时间线

用于按时间顺序展示一系列事件节点。

## 基础用法

<DemoBlock title="基础时间线">
  <div style="width: 100%">
    <oas-timeline>
      <oas-timeline-item time="2024-01-01"><p>项目启动，明确目标与边界。</p></oas-timeline-item>
      <oas-timeline-item time="2024-03-01" color="green"><p>核心组件开发完成，单测通过。</p></oas-timeline-item>
      <oas-timeline-item time="2024-05-01" color="red"><p>修复线上问题并回归。</p></oas-timeline-item>
      <oas-timeline-item time="2024-06-15"><p>文档站上线，对外发布。</p></oas-timeline-item>
    </oas-timeline>
  </div>
</DemoBlock>

## 颜色变体

<DemoBlock title="节点颜色">
  <div style="width: 100%">
    <oas-timeline>
      <oas-timeline-item time="2024-06-01"><p>默认主题色</p></oas-timeline-item>
      <oas-timeline-item time="2024-06-02" color="green"><p>绿色：已完成</p></oas-timeline-item>
      <oas-timeline-item time="2024-06-03" color="red"><p>红色：告警</p></oas-timeline-item>
      <oas-timeline-item time="2024-06-04" color="gray"><p>灰色：已归档</p></oas-timeline-item>
    </oas-timeline>
  </div>
</DemoBlock>

## 富内容节点

<DemoBlock title="自定义内容">
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

## 进行中尾节点

<DemoBlock title="进行中尾节点">
  <div style="width: 100%">
    <oas-timeline>
      <oas-timeline-item time="2024-08-01"><p>v1.4.0 需求评审完成。</p></oas-timeline-item>
      <oas-timeline-item time="2024-08-10" color="green"><p>核心功能开发完成，单测通过。</p></oas-timeline-item>
      <oas-timeline-item pending></oas-timeline-item>
    </oas-timeline>
  </div>
</DemoBlock>

给 `oas-timeline-item` 设置 `pending` 后，该节点显示为空心圆点 + 虚线连接，表示「进行中 / 敬请期待」；节点无内容时默认展示「敬请期待」文案。

## API

| 组件                | 属性      | 说明                                                      | 类型    | 默认值  |
| ------------------- | --------- | --------------------------------------------------------- | ------- | ------- |
| `oas-timeline-item` | `time`    | 节点时间文本                                              | string  | —       |
| `oas-timeline-item` | `color`   | 节点标记色：`green` / `red` / `gray`，缺省为主题色        | string  | —       |
| `oas-timeline-item` | `pending` | 进行中节点：空心圆点 + 虚线连接，无内容时显示「敬请期待」 | boolean | `false` |
