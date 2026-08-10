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

`vertical` 简写等价于 `direction="vertical"`（纵向堆叠）。

<DemoBlock title="垂直方向">
  <oas-flex vertical gap="8px">
    <oas-tag>纵向排布</oas-tag>
    <oas-tag type="success">从上到下</oas-tag>
    <oas-tag type="info">间距可调</oas-tag>
  </oas-flex>
</DemoBlock>

<DemoBlock title="direction 等价写法">
  <oas-flex direction="vertical" gap="8px">
    <oas-tag>direction="vertical"</oas-tag>
    <oas-tag type="success">与 vertical 一致</oas-tag>
  </oas-flex>
</DemoBlock>

## 主轴对齐

<DemoBlock title="主轴对齐 justify 全枚举">
  <div class="demo-flex-col">
    <span class="demo-flex-label">justify="start"（默认）</span>
    <oas-flex justify="start" gap="8px" style="width: 100%">
      <oas-tag>1</oas-tag><oas-tag>2</oas-tag><oas-tag>3</oas-tag>
    </oas-flex>
    <span class="demo-flex-label">justify="center"</span>
    <oas-flex justify="center" gap="8px" style="width: 100%">
      <oas-tag>1</oas-tag><oas-tag>2</oas-tag><oas-tag>3</oas-tag>
    </oas-flex>
    <span class="demo-flex-label">justify="end"</span>
    <oas-flex justify="end" gap="8px" style="width: 100%">
      <oas-tag>1</oas-tag><oas-tag>2</oas-tag><oas-tag>3</oas-tag>
    </oas-flex>
    <span class="demo-flex-label">justify="between"</span>
    <oas-flex justify="between" style="width: 100%">
      <oas-tag>1</oas-tag><oas-tag>2</oas-tag><oas-tag>3</oas-tag>
    </oas-flex>
    <span class="demo-flex-label">justify="around"</span>
    <oas-flex justify="around" style="width: 100%">
      <oas-tag>1</oas-tag><oas-tag>2</oas-tag><oas-tag>3</oas-tag>
    </oas-flex>
  </div>
</DemoBlock>

## 交叉轴对齐

<DemoBlock title="交叉轴对齐 align 全枚举">
  <div class="demo-flex-col">
    <span class="demo-flex-label">align="stretch"（默认）</span>
    <oas-flex align="stretch" gap="8px" style="width: 100%; height: 80px">
      <oas-button>按钮</oas-button><oas-tag size="small">标签</oas-tag>
    </oas-flex>
    <span class="demo-flex-label">align="start"</span>
    <oas-flex align="start" gap="8px" style="width: 100%; height: 80px">
      <oas-button>按钮</oas-button><oas-tag size="small">标签</oas-tag>
    </oas-flex>
    <span class="demo-flex-label">align="center"</span>
    <oas-flex align="center" gap="8px" style="width: 100%; height: 80px">
      <oas-button>按钮</oas-button><oas-tag size="small">标签</oas-tag>
    </oas-flex>
    <span class="demo-flex-label">align="end"</span>
    <oas-flex align="end" gap="8px" style="width: 100%; height: 80px">
      <oas-button>按钮</oas-button><oas-tag size="small">标签</oas-tag>
    </oas-flex>
    <span class="demo-flex-label">align="baseline"</span>
    <oas-flex align="baseline" gap="8px" style="width: 100%; height: 80px">
      <oas-button>按钮</oas-button><oas-tag size="small">标签</oas-tag>
    </oas-flex>
  </div>
</DemoBlock>

> 固定高度 80px 容器 + 不同高度子项（按钮 32px / 标签 20px），用于观察各 `align` 变体的交叉轴对齐差异；`stretch` 会把子项拉伸至容器高度。

## 换行

`wrap` 为布尔属性：存在即 `flex-wrap: wrap`，缺省 `nowrap`。

<DemoBlock title="换行 wrap">
  <oas-flex wrap gap="8px" style="width: 100%">
    <oas-tag>1</oas-tag><oas-tag>2</oas-tag><oas-tag>3</oas-tag>
    <oas-tag>4</oas-tag><oas-tag>5</oas-tag><oas-tag>6</oas-tag>
    <oas-tag>7</oas-tag><oas-tag>8</oas-tag><oas-tag>9</oas-tag>
    <oas-tag>10</oas-tag>
  </oas-flex>
</DemoBlock>

## 空容器

无子元素时高度为 0，不报错、不占位。

<DemoBlock title="空容器">
  <oas-flex style="width: 100%; background: var(--oas-color-bg-hover)"></oas-flex>
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

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `align` | 交叉轴对齐 | — | `stretch` |
| `direction` | 主轴方向 | — | `row` |
| `gap` | 子项间距 | — | — |
| `justify` | 主轴对齐 | — | `start` |
| `vertical` | 纵向简写 | — | — |
| `wrap` | 换行 | — | — |

### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | — |
