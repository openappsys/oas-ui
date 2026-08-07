# Layout 布局

## 基础用法

<div class="demo">
  <oas-layout style="height: 300px">
    <oas-header slot="header">头部</oas-header>
    <oas-sider slot="sider">侧边栏</oas-sider>
    <oas-content slot="content">内容区</oas-content>
    <oas-footer slot="footer">底部</oas-footer>
  </oas-layout>
</div>

## API

| 组件 | 说明 |
|---|---|
| `oas-layout` | 容器 |
| `oas-header` | 顶栏 |
| `oas-sider` | 侧栏（`collapsed` 折叠） |
| `oas-content` | 内容 |
| `oas-footer` | 底部 |

子组件需带对应 `slot` 属性，渲染为原生语义元素。
