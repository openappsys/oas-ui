# Card

An information container that groups a set of related content.

## Basic Usage

<DemoBlock title="Basic card">
  <div style="width: 100%">
    <oas-card title="Project Overview">
      <p>This is a basic card showing a summary of information.</p>
      <p>The content area supports any custom structure.</p>
    </oas-card>
  </div>
</DemoBlock>

## No Title

<DemoBlock title="Card without title">
  <div style="width: 100%">
    <oas-card>
      <p>When the <code>title</code> attribute is omitted, only the content area remains.</p>
    </oas-card>
  </div>
</DemoBlock>

## Hoverable

<DemoBlock title="Hover shadow">
  <div style="width: 100%">
    <oas-card title="Hoverable card" hoverable>
      <p>Hover over the card to see the shadow transition.</p>
    </oas-card>
  </div>
</DemoBlock>

## Extra Area

<DemoBlock title="Card with extra actions">
  <div style="width: 100%">
    <oas-card title="Permission Management">
      <p>Place actions to the right of the title via the <code>extra</code> slot.</p>
      <oas-button slot="extra" size="small">New</oas-button>
    </oas-card>
  </div>
</DemoBlock>

## Cover Image

An image can be placed in the content area to compose a "cover + title + description" media card.

<DemoBlock title="Card with cover image">
  <div style="width: 320px">
    <oas-card>
      <svg viewBox="0 0 400 180" preserveAspectRatio="none" style="width:100%; height:150px; display:block; border-radius: var(--oas-radius-sm); margin-bottom: var(--oas-space-3);"><defs><linearGradient id="ccg1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0b6cff"/><stop offset="1" stop-color="#0891b2"/></linearGradient></defs><rect width="400" height="180" fill="url(#ccg1)"/><text x="200" y="100" font-size="22" text-anchor="middle" fill="#fff" font-family="sans-serif">Cover</text></svg>
      <strong>Mountain Trail</strong>
      <p style="color: var(--oas-color-text-secondary); margin: var(--oas-space-1) 0 0;">A two-day light hiking route recommended for the weekend.</p>
    </oas-card>
  </div>
</DemoBlock>

<DemoBlock title="Image cover (img)">
  <div style="width: 320px">
    <oas-card hoverable>
      <img src="https://picsum.photos/seed/isui-card-1/400/180" alt="Cover" style="width:100%; height:150px; object-fit: cover; display:block; border-radius: var(--oas-radius-sm); margin-bottom: var(--oas-space-3);">
      <strong>City Cycling</strong>
      <p style="color: var(--oas-color-text-secondary); margin: var(--oas-space-1) 0 0;">A 15 km leisure cycling route along the river.</p>
    </oas-card>
  </div>
</DemoBlock>

## API

### Attributes

| Attribute   | Description                        | Type      | Default |
| ----------- | ---------------------------------- | --------- | ------- |
| `hoverable` | Whether to enable the hover shadow | `boolean` | —       |
| `title`     | Card title                         | `string`  | —       |

### Slots

| Name    | Description                          |
| ------- | ------------------------------------ |
| default | Card content                         |
| `extra` | Extra area on the right of the title |
