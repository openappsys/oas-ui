# List 列表

## 基础用法

<div class="demo">
  <oas-list bordered>
    <oas-list-item title="需求评审">
      <span slot="description">迭代 v1.0 需求清单</span>
    </oas-list-item>
    <oas-list-item title="开发完成">
      <span slot="description">全部组件单测通过</span>
    </oas-list-item>
    <oas-list-item title="发布上线">
      <span slot="description">文档站已部署</span>
      <oas-tag slot="extra">已发布</oas-tag>
    </oas-list-item>
  </oas-list>
</div>

## API

| 组件 | 属性 | 说明 |
|---|---|---|
| `oas-list` | `bordered` | 整体边框 |
| `oas-list-item` | `title` | 标题 |

插槽：`description`（描述，默认插槽兜底）、`extra`（右侧）。
