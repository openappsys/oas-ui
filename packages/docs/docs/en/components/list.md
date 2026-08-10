# List

Displays a collection of related items, capable of carrying a title, description, and extra actions.

## Basic Usage

<DemoBlock title="Bordered list">
  <div style="width: 100%">
    <oas-list bordered>
      <oas-list-item title="Requirements Review">
        <span slot="description">Iteration v1.0 requirements list</span>
      </oas-list-item>
      <oas-list-item title="Development Complete">
        <span slot="description">All component unit tests pass</span>
      </oas-list-item>
      <oas-list-item title="Released">
        <span slot="description">Docs site deployed</span>
        <oas-tag slot="extra" type="success">Released</oas-tag>
      </oas-list-item>
    </oas-list>
  </div>
</DemoBlock>

## Without Border

<DemoBlock title="Default dividers">
  <div style="width: 100%">
    <oas-list>
      <oas-list-item title="Documentation">
        <span slot="description">Only item dividers remain</span>
      </oas-list-item>
      <oas-list-item title="Manual">
        <span slot="description">No outer border</span>
      </oas-list-item>
    </oas-list>
  </div>
</DemoBlock>

## Content Forms

<DemoBlock title="Multiple content forms">
  <div style="width: 100%">
    <oas-list bordered>
      <oas-list-item title="Title-only item">
        <oas-tag slot="extra" type="primary">NEW</oas-tag>
      </oas-list-item>
      <oas-list-item title="Default slot fallback">
        When no description slot is provided, content falls back to the default slot.
      </oas-list-item>
      <oas-list-item title="Todo status">
        <span slot="description">Awaiting owner confirmation</span>
        <oas-tag slot="extra" type="warning">Pending</oas-tag>
      </oas-list-item>
    </oas-list>
  </div>
</DemoBlock>

## Loading and Empty States

<DemoBlock title="Loading state">
  <div style="width: 100%">
    <oas-list loading bordered>
      <oas-list-item title="Loading item">
        <span slot="description">Skeleton placeholder until loading finishes</span>
      </oas-list-item>
      <oas-list-item title="Loading item">
        <span slot="description">The loading attribute handles the placeholder</span>
      </oas-list-item>
    </oas-list>
  </div>
</DemoBlock>

<DemoBlock title="Empty state">
  <div style="width: 100%">
    <oas-list bordered empty></oas-list>
  </div>
  <p style="width: 100%; margin: var(--oas-space-3) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
     Setting <code>empty</code> forces the empty state; the list also shows it automatically when it has no <code>oas-list-item</code> children, and the copy can be customized via <code>empty-text</code>.
  </p>
</DemoBlock>

## Empty Text and Dividers

`empty-text` customizes the empty state text (default "暂无数据").

<DemoBlock title="Custom empty text">
  <div style="width: 100%">
    <oas-list bordered empty empty-text="No matching tasks, please adjust the filters and retry"></oas-list>
  </div>
</DemoBlock>

`split` controls the item dividers: by default (without `bordered`) dividers are included; setting `bordered` turns the dividers off, and `split` can be used to re-enable them when needed.

<DemoBlock title="split dividers">
  <div style="width: 100%">
    <oas-list bordered>
      <oas-list-item title="Item 1"><span slot="description">bordered does not draw item dividers by default</span></oas-list-item>
      <oas-list-item title="Item 2"><span slot="description">Only the outer border</span></oas-list-item>
    </oas-list>
    <oas-list bordered split style="margin-top: var(--oas-space-4)">
      <oas-list-item title="Item 1"><span slot="description">bordered + split adds item dividers</span></oas-list-item>
      <oas-list-item title="Item 2"><span slot="description">Border and dividers coexist</span></oas-list-item>
    </oas-list>
  </div>
</DemoBlock>

## Image and Text

The default slot of an item can hold a thumbnail, combining it with the title and description to form a rich-media list.

<DemoBlock title="Image-text list (thumbnail + title + description)">
  <div style="width: 100%">
    <oas-list bordered>
      <oas-list-item>
        <div style="display: flex; gap: var(--oas-space-3); align-items: center;">
          <img src="https://picsum.photos/seed/isui-list-1/96/96" alt="Thumbnail" style="width: 48px; height: 48px; border-radius: var(--oas-radius-sm); object-fit: cover;">
          <div>
            <div style="font-weight: 600;">Product Weekly #12</div>
            <div style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm);">6 new components shipped this week</div>
          </div>
        </div>
      </oas-list-item>
      <oas-list-item>
        <div style="display: flex; gap: var(--oas-space-3); align-items: center;">
          <img src="https://picsum.photos/seed/isui-list-2/96/96" alt="Thumbnail" style="width: 48px; height: 48px; border-radius: var(--oas-radius-sm); object-fit: cover;">
          <div>
            <div style="font-weight: 600;">Design review log</div>
            <div style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm);">Interaction states and dark theme review</div>
          </div>
        </div>
      </oas-list-item>
      <oas-list-item>
        <div style="display: flex; gap: var(--oas-space-3); align-items: center;">
          <svg width="48" height="48" viewBox="0 0 48 48" style="border-radius: var(--oas-radius-sm);"><rect width="48" height="48" rx="8" fill="#16a34a"/><text x="24" y="30" font-size="20" text-anchor="middle" fill="#fff" font-family="sans-serif">✓</text></svg>
          <div>
            <div style="font-weight: 600;">Released v1.6</div>
            <div style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm);">All display components released</div>
          </div>
        </div>
        <oas-tag slot="extra" type="success">Released</oas-tag>
      </oas-list-item>
    </oas-list>
  </div>
</DemoBlock>

## API

| Component      | Attribute    | Description                         | Type    | Default                       |
| -------------- | ------------ | ----------------------------------- | ------- | ----------------------------- |
| `oas-list`     | `bordered`   | Whether to show the outer border    | boolean | `false`                       |
| `oas-list`     | `split`      | Whether to show item dividers       | boolean | `true` when `bordered` is not set |
| `oas-list`     | `loading`    | Loading state, shows skeleton placeholders | boolean | `false`                       |
| `oas-list`     | `empty`      | Force empty state; auto empty when there are no children | boolean | `false`                       |
| `oas-list`     | `empty-text` | Empty state text                    | string  | `暂无数据`                    |
| `oas-list-item`| `title`      | Item title                          | string  | —                             |

| Slot          | Description                            |
| ------------- | -------------------------------------- |
| `description` | Description area (falls back to the default slot when not provided) |
| `extra`       | Extra area on the right of the item    |
