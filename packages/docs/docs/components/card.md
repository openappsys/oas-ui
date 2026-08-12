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

## 封面图

内容区可放图片，组合成"封面 + 标题 + 描述"的媒体卡片。

<DemoBlock title="带封面图的卡片">
  <div style="width: 320px">
    <oas-card>
      <svg viewBox="0 0 400 180" preserveAspectRatio="none" style="width:100%; height:150px; display:block; border-radius: var(--oas-radius-sm); margin-bottom: var(--oas-space-3);"><defs><linearGradient id="ccg1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0b6cff"/><stop offset="1" stop-color="#0891b2"/></linearGradient></defs><rect width="400" height="180" fill="url(#ccg1)"/><text x="200" y="100" font-size="22" text-anchor="middle" fill="#fff" font-family="sans-serif">封面图</text></svg>
      <strong>山景徒步</strong>
      <p style="color: var(--oas-color-text-secondary); margin: var(--oas-space-1) 0 0;">周末两日轻装徒步路线推荐。</p>
    </oas-card>
  </div>
</DemoBlock>

<DemoBlock title="图片封面（img）">
  <div style="width: 320px">
    <oas-card hoverable>
      <img src="https://picsum.photos/seed/isui-card-1/400/180" alt="封面" style="width:100%; height:150px; object-fit: cover; display:block; border-radius: var(--oas-radius-sm); margin-bottom: var(--oas-space-3);">
      <strong>城市骑行</strong>
      <p style="color: var(--oas-color-text-secondary); margin: var(--oas-space-1) 0 0;">沿江 15 公里休闲骑行线路。</p>
    </oas-card>
  </div>
</DemoBlock>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `hoverable` | 是否开启悬浮阴影 | `boolean` | — |
| `title` | 卡片标题 | `string` | — |

### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | 卡片内容 |
| `extra` | 标题右侧扩展区 |
