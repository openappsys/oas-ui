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

## API

| 组件 | 属性 | 说明 | 类型 | 默认值 |
|---|---|---|---|---|
| `oas-list` | `bordered` | 是否显示整体边框 | boolean | `false` |
| `oas-list` | `split` | 是否显示条目分隔线 | boolean | 未设置 `bordered` 时为 `true` |
| `oas-list-item` | `title` | 条目标题 | string | — |

| 插槽 | 说明 |
|---|---|
| `description` | 描述区（不提供时回退默认插槽） |
| `extra` | 条目右侧扩展区 |
