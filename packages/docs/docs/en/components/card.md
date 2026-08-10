# Card

An information container that groups a set of related content.

## Basic Usage

<DemoBlock title="Basic card">
  <div style="width: 100%">
    <oas-card title="项目概览">
      <p>这是一张基础卡片，展示一组摘要信息。</p>
      <p>内容区支持任意自定义结构。</p>
    </oas-card>
  </div>
</DemoBlock>

## No Title

<DemoBlock title="Card without title">
  <div style="width: 100%">
    <oas-card>
      <p>省略 <code>title</code> 属性时，仅保留内容区。</p>
    </oas-card>
  </div>
</DemoBlock>

## Hoverable

<DemoBlock title="Hover shadow">
  <div style="width: 100%">
    <oas-card title="悬浮卡片" hoverable>
      <p>将鼠标移入卡片，可看到阴影过渡效果。</p>
    </oas-card>
  </div>
</DemoBlock>

## Extra Area

<DemoBlock title="Card with extra actions">
  <div style="width: 100%">
    <oas-card title="权限管理">
      <p>通过 <code>extra</code> 插槽在标题右侧放置操作。</p>
      <oas-button slot="extra" size="small">新建</oas-button>
    </oas-card>
  </div>
</DemoBlock>

## Cover Image

An image can be placed in the content area to compose a "cover + title + description" media card.

<DemoBlock title="Card with cover image">
  <div style="width: 320px">
    <oas-card>
      <svg viewBox="0 0 400 180" preserveAspectRatio="none" style="width:100%; height:150px; display:block; border-radius: var(--oas-radius-sm); margin-bottom: var(--oas-space-3);"><defs><linearGradient id="ccg1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0b6cff"/><stop offset="1" stop-color="#0891b2"/></linearGradient></defs><rect width="400" height="180" fill="url(#ccg1)"/><text x="200" y="100" font-size="22" text-anchor="middle" fill="#fff" font-family="sans-serif">封面图</text></svg>
      <strong>山景徒步</strong>
      <p style="color: var(--oas-color-text-secondary); margin: var(--oas-space-1) 0 0;">周末两日轻装徒步路线推荐。</p>
    </oas-card>
  </div>
</DemoBlock>

<DemoBlock title="Image cover (img)">
  <div style="width: 320px">
    <oas-card hoverable>
      <img src="https://picsum.photos/seed/isui-card-1/400/180" alt="封面" style="width:100%; height:150px; object-fit: cover; display:block; border-radius: var(--oas-radius-sm); margin-bottom: var(--oas-space-3);">
      <strong>城市骑行</strong>
      <p style="color: var(--oas-color-text-secondary); margin: var(--oas-space-1) 0 0;">沿江 15 公里休闲骑行线路。</p>
    </oas-card>
  </div>
</DemoBlock>

## API

| Attribute   | Description                 | Type    | Default |
| ----------- | --------------------------- | ------- | ------- |
| `title`     | Card title                  | string  | —       |
| `hoverable` | Whether to enable the hover shadow | boolean | `false` |

| Slot        | Description            |
| ----------- | ---------------------- |
| Default     | Card content           |
| `extra`     | Extra area on the right of the title |
