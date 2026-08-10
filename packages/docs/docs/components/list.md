# List 列表

用于展示同类信息集合，可承载标题、描述与扩展操作。

## 基础用法

<DemoBlock title="带边框列表">
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

## 无边框

<DemoBlock title="默认分隔线">
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

## 内容形态

<DemoBlock title="多种内容形态">
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

## 加载与空态

<DemoBlock title="加载态">
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

<DemoBlock title="空态">
  <div style="width: 100%">
    <oas-list bordered empty></oas-list>
  </div>
  <p style="width: 100%; margin: var(--oas-space-3) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
     设置 <code>empty</code> 强制空态；列表没有任何 <code>oas-list-item</code> 子项时也会自动显示空态，可通过 <code>empty-text</code> 自定义文案。
  </p>
</DemoBlock>

## 空态文案与分隔线

`empty-text` 自定义空态文案（默认「暂无数据」）。

<DemoBlock title="自定义空态文案">
  <div style="width: 100%">
    <oas-list bordered empty empty-text="暂无匹配任务，请调整筛选条件后重试"></oas-list>
  </div>
</DemoBlock>

`split` 控制条目分隔线：默认（不设置 `bordered`）时自带分隔线；设置 `bordered` 后分隔线关闭，需要时用 `split` 重新开启。

<DemoBlock title="分隔线 split">
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

## 图文混排

条目默认插槽可放缩略图，配合标题与描述形成富媒体列表。

<DemoBlock title="图文列表（缩略图 + 标题 + 描述）">
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

### oas-list

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `bordered` | 是否显示整体边框 | — | — |
| `empty` | 强制空态；无子项时自动空态 | — | — |
| `empty-text` | 空态文案 | — | — |
| `loading` | 加载态，显示骨架占位 | — | — |
| `split` | 是否显示条目分隔线 | — | — |

| 名称 | 说明 |
| --- | --- |
| 默认 | — |
| `description` | 描述区（不提供时回退默认插槽） |
| `extra` | 条目右侧扩展区 |

### oas-list-item

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `title` | 条目标题 | — | — |

| 名称 | 说明 |
| --- | --- |
| `description` | — |
| `extra` | — |
