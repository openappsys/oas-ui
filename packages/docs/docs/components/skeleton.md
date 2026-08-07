# Skeleton 骨架屏

加载时的占位骨架，支持头像、标题、多行段落与流光动画。

## 基础用法

<DemoBlock title="基础用法">
  <div style="width: 100%; max-width: 360px">
    <oas-skeleton active avatar title rows="3"></oas-skeleton>
  </div>
</DemoBlock>

## 组合

<DemoBlock title="组合">
  <div style="width: 100%; max-width: 360px">
    <oas-space direction="vertical" size="medium" style="width: 100%">
      <oas-skeleton avatar title rows="2"></oas-skeleton>
      <oas-skeleton rows="2"></oas-skeleton>
    </oas-space>
  </div>
</DemoBlock>

## 无动画

<DemoBlock title="无动画">
  <div style="width: 100%; max-width: 360px">
    <oas-skeleton title rows="3"></oas-skeleton>
  </div>
</DemoBlock>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
|---|---|---|---|
| `rows` | 段落行数 | `number` | `3` |
| `title` | 是否显示标题占位 | `boolean` | `false` |
| `avatar` | 是否显示头像占位 | `boolean` | `false` |
| `active` | 是否启用流光动画 | `boolean` | `false` |
