# List

Displays a collection of related items, capable of carrying a title, description, and extra actions.

## Basic Usage

<DemoBlock title="Bordered list">
  <div style="width: 100%">
    <oas-list bordered>
      <oas-list-item title="需求评审">
        <span slot="description">迭代 v1.0 需求清单</span>
      </oas-list-item>
      <oas-list-item title="开发完成">
        <span slot="description">全部组件单测通过</span>
      </oas-list-item>
      <oas-list-item title="发布上线">
        <span slot="description">文档站已部署</span>
        <oas-tag slot="extra" type="success">已发布</oas-tag>
      </oas-list-item>
    </oas-list>
  </div>
</DemoBlock>

## Without Border

<DemoBlock title="Default dividers">
  <div style="width: 100%">
    <oas-list>
      <oas-list-item title="说明文档">
        <span slot="description">仅保留条目间分隔线</span>
      </oas-list-item>
      <oas-list-item title="使用手册">
        <span slot="description">不加整体边框</span>
      </oas-list-item>
    </oas-list>
  </div>
</DemoBlock>

## Content Forms

<DemoBlock title="Multiple content forms">
  <div style="width: 100%">
    <oas-list bordered>
      <oas-list-item title="纯标题条目">
        <oas-tag slot="extra" type="primary">NEW</oas-tag>
      </oas-list-item>
      <oas-list-item title="默认插槽兜底">
        未提供 description 插槽时，内容走默认插槽。
      </oas-list-item>
      <oas-list-item title="待办状态">
        <span slot="description">等待负责人确认</span>
        <oas-tag slot="extra" type="warning">待处理</oas-tag>
      </oas-list-item>
    </oas-list>
  </div>
</DemoBlock>

## Loading and Empty States

<DemoBlock title="Loading state">
  <div style="width: 100%">
    <oas-list loading bordered>
      <oas-list-item title="请求中的条目">
        <span slot="description">加载完成前显示骨架占位</span>
      </oas-list-item>
      <oas-list-item title="请求中的条目">
        <span slot="description">由 loading 属性统一接管占位</span>
      </oas-list-item>
    </oas-list>
  </div>
</DemoBlock>

<DemoBlock title="Empty state">
  <div style="width: 100%">
    <oas-list bordered empty></oas-list>
  </div>
  <p style="width: 100%; margin: var(--oas-space-3) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
     设置 <code>empty</code> 强制空态；列表没有任何 <code>oas-list-item</code> 子项时也会自动显示空态，可通过 <code>empty-text</code> 自定义文案。
  </p>
</DemoBlock>

## Empty Text and Dividers

`empty-text` customizes the empty state text (default "暂无数据").

<DemoBlock title="Custom empty text">
  <div style="width: 100%">
    <oas-list bordered empty empty-text="暂无匹配任务，请调整筛选条件后重试"></oas-list>
  </div>
</DemoBlock>

`split` controls the item dividers: by default (without `bordered`) dividers are included; setting `bordered` turns the dividers off, and `split` can be used to re-enable them when needed.

<DemoBlock title="split dividers">
  <div style="width: 100%">
    <oas-list bordered>
      <oas-list-item title="条目一"><span slot="description">bordered 默认不绘制条目分隔线</span></oas-list-item>
      <oas-list-item title="条目二"><span slot="description">仅整体边框</span></oas-list-item>
    </oas-list>
    <oas-list bordered split style="margin-top: var(--oas-space-4)">
      <oas-list-item title="条目一"><span slot="description">bordered + split 追加条目分隔线</span></oas-list-item>
      <oas-list-item title="条目二"><span slot="description">边框与分隔线并存</span></oas-list-item>
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
          <img src="https://picsum.photos/seed/isui-list-1/96/96" alt="缩略图" style="width: 48px; height: 48px; border-radius: var(--oas-radius-sm); object-fit: cover;">
          <div>
            <div style="font-weight: 600;">产品周报第 12 期</div>
            <div style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm);">本周上线 6 个新组件</div>
          </div>
        </div>
      </oas-list-item>
      <oas-list-item>
        <div style="display: flex; gap: var(--oas-space-3); align-items: center;">
          <img src="https://picsum.photos/seed/isui-list-2/96/96" alt="缩略图" style="width: 48px; height: 48px; border-radius: var(--oas-radius-sm); object-fit: cover;">
          <div>
            <div style="font-weight: 600;">设计走查记录</div>
            <div style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm);">交互态与暗色主题复核</div>
          </div>
        </div>
      </oas-list-item>
      <oas-list-item>
        <div style="display: flex; gap: var(--oas-space-3); align-items: center;">
          <svg width="48" height="48" viewBox="0 0 48 48" style="border-radius: var(--oas-radius-sm);"><rect width="48" height="48" rx="8" fill="#16a34a"/><text x="24" y="30" font-size="20" text-anchor="middle" fill="#fff" font-family="sans-serif">✓</text></svg>
          <div>
            <div style="font-weight: 600;">发布 v1.6</div>
            <div style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm);">展示组件全部发布</div>
          </div>
        </div>
        <oas-tag slot="extra" type="success">已发布</oas-tag>
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
