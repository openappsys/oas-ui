# Card 卡片

用于承载一组相关内容的信息容器。

## 基础用法

<DemoBlock title="基础卡片">
  <div style="width: 100%">
    <oas-card title="项目概览">
      <p>这是一张基础卡片，展示一组摘要信息。</p>
      <p>内容区支持任意自定义结构。</p>
    </oas-card>
  </div>
</DemoBlock>

## 无标题

<DemoBlock title="无标题卡片">
  <div style="width: 100%">
    <oas-card>
      <p>省略 <code>title</code> 属性时，仅保留内容区。</p>
    </oas-card>
  </div>
</DemoBlock>

## 可悬浮

<DemoBlock title="悬浮阴影">
  <div style="width: 100%">
    <oas-card title="悬浮卡片" hoverable>
      <p>将鼠标移入卡片，可看到阴影过渡效果。</p>
    </oas-card>
  </div>
</DemoBlock>

## 扩展区

<DemoBlock title="带操作扩展区">
  <div style="width: 100%">
    <oas-card title="权限管理">
      <p>通过 <code>extra</code> 插槽在标题右侧放置操作。</p>
      <oas-button slot="extra" size="small">新建</oas-button>
    </oas-card>
  </div>
</DemoBlock>

## API

| 属性 | 说明 | 类型 | 默认值 |
|---|---|---|---|
| `title` | 卡片标题 | string | — |
| `hoverable` | 是否开启悬浮阴影 | boolean | `false` |

| 插槽 | 说明 |
|---|---|
| 默认插槽 | 卡片内容 |
| `extra` | 标题右侧扩展区 |
