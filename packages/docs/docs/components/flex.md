# Flex 弹性布局

基于 CSS Flexbox 的布局容器，通过属性控制方向、主轴/交叉轴对齐、间距与换行。

## 基础用法

<DemoBlock title="水平与间距">
  <oas-flex gap="12px">
    <oas-tag type="primary">标签一</oas-tag>
    <oas-tag type="success">标签二</oas-tag>
    <oas-tag type="warning">标签三</oas-tag>
  </oas-flex>
</DemoBlock>

## 方向

<DemoBlock title="垂直方向">
  <oas-flex direction="vertical" gap="8px">
    <oas-tag>纵向排布</oas-tag>
    <oas-tag type="success">从上到下</oas-tag>
    <oas-tag type="info">间距可调</oas-tag>
  </oas-flex>
</DemoBlock>

## 主轴对齐

<DemoBlock title="主轴对齐 justify">
  <div class="demo-flex-col">
    <span class="demo-flex-label">justify="flex-start"（默认）</span>
    <oas-flex justify="flex-start" gap="8px" style="width: 100%">
      <oas-tag>1</oas-tag><oas-tag>2</oas-tag><oas-tag>3</oas-tag>
    </oas-flex>
    <span class="demo-flex-label">justify="center"</span>
    <oas-flex justify="center" gap="8px" style="width: 100%">
      <oas-tag>1</oas-tag><oas-tag>2</oas-tag><oas-tag>3</oas-tag>
    </oas-flex>
    <span class="demo-flex-label">justify="flex-end"</span>
    <oas-flex justify="flex-end" gap="8px" style="width: 100%">
      <oas-tag>1</oas-tag><oas-tag>2</oas-tag><oas-tag>3</oas-tag>
    </oas-flex>
    <span class="demo-flex-label">justify="space-between"</span>
    <oas-flex justify="space-between" style="width: 100%">
      <oas-tag>1</oas-tag><oas-tag>2</oas-tag><oas-tag>3</oas-tag>
    </oas-flex>
    <span class="demo-flex-label">justify="space-around"</span>
    <oas-flex justify="space-around" style="width: 100%">
      <oas-tag>1</oas-tag><oas-tag>2</oas-tag><oas-tag>3</oas-tag>
    </oas-flex>
  </div>
</DemoBlock>

## 交叉轴对齐

<DemoBlock title="交叉轴对齐 align">
  <div class="demo-flex-col">
    <span class="demo-flex-label">align="stretch"（默认）</span>
    <oas-flex align="stretch" gap="8px" style="width: 100%; height: 80px">
      <oas-button>按钮</oas-button><oas-tag size="small">标签</oas-tag>
    </oas-flex>
    <span class="demo-flex-label">align="flex-start"</span>
    <oas-flex align="flex-start" gap="8px" style="width: 100%; height: 80px">
      <oas-button>按钮</oas-button><oas-tag size="small">标签</oas-tag>
    </oas-flex>
    <span class="demo-flex-label">align="center"</span>
    <oas-flex align="center" gap="8px" style="width: 100%; height: 80px">
      <oas-button>按钮</oas-button><oas-tag size="small">标签</oas-tag>
    </oas-flex>
    <span class="demo-flex-label">align="flex-end"</span>
    <oas-flex align="flex-end" gap="8px" style="width: 100%; height: 80px">
      <oas-button>按钮</oas-button><oas-tag size="small">标签</oas-tag>
    </oas-flex>
  </div>
</DemoBlock>

> 固定高度 80px 容器 + 不同高度子项（按钮 32px / 标签 20px），用于观察各 `align` 变体的交叉轴对齐差异；`stretch` 会把子项拉伸至容器高度。

## 换行

<DemoBlock title="换行 wrap">
  <oas-flex wrap="wrap" gap="8px" style="width: 100%">
    <oas-tag>1</oas-tag><oas-tag>2</oas-tag><oas-tag>3</oas-tag>
    <oas-tag>4</oas-tag><oas-tag>5</oas-tag><oas-tag>6</oas-tag>
    <oas-tag>7</oas-tag><oas-tag>8</oas-tag><oas-tag>9</oas-tag>
    <oas-tag>10</oas-tag>
  </oas-flex>
</DemoBlock>

<style>
  .demo-flex-col {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
  }
  .demo-flex-label {
    font-size: var(--oas-font-size-xs);
    color: var(--oas-color-text-secondary);
  }
</style>

## API

| 属性        | 说明       | 类型                                                                    | 默认值       |
| ----------- | ---------- | ----------------------------------------------------------------------- | ------------ |
| `direction` | 主轴方向   | `row` / `vertical`                                                      | `row`        |
| `justify`   | 主轴对齐   | `flex-start` / `center` / `flex-end` / `space-between` / `space-around` | `flex-start` |
| `align`     | 交叉轴对齐 | `stretch` / `flex-start` / `center` / `flex-end` / `baseline`           | `stretch`    |
| `gap`       | 子项间距   | string（如 `8px`）                                                      | —            |
| `wrap`      | 换行策略   | `nowrap` / `wrap`                                                       | `nowrap`     |
