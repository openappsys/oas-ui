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
    <span class="demo-flex-label">justify="evenly"</span>
    <oas-flex justify="evenly" style="width: 100%">
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

## 子项填满

`fill` 让子项等分填满容器（`flex: 1` 等价物）；`fill-ratio`（百分比，默认 100）按比例分配——子项自身可设置，容器级 `fill-ratio` 作为缺省。

<DemoBlock title="fill 子项等分填满">
  <oas-flex fill gap="8px" style="width: 100%">
    <div class="demo-flex-fill-box">一</div>
    <div class="demo-flex-fill-box">二</div>
    <div class="demo-flex-fill-box">三</div>
  </oas-flex>
</DemoBlock>

<DemoBlock title="fill-ratio 按比例分配">
  <oas-flex fill gap="8px" style="width: 100%">
    <div class="demo-flex-fill-box">1</div>
    <div class="demo-flex-fill-box" fill-ratio="200">2（200%）</div>
    <div class="demo-flex-fill-box">3</div>
  </oas-flex>
  <oas-flex fill fill-ratio="300" gap="8px" style="width: 100%; margin-top: 8px">
    <div class="demo-flex-fill-box">容器级缺省 300%</div>
    <div class="demo-flex-fill-box">同样 300%</div>
  </oas-flex>
</DemoBlock>

> **关于子项 order**：oas-flex 无子项组件载体（子元素是任意宿主元素），逐子项设 `order` 没有合理 API，故本版本不做子项排序。若后续出现 oas-flex-item 子项组件场景（排序/基准尺寸等逐子项能力），再按需引入。

## 响应式

`direction` 与 `gap` 支持断点简写：空格分隔的基础值 + 若干 `断点:值`（如 `direction="column md:row"`、`gap="8px md:16px"`）。窗口在断点宽度以下时用基础值，达到断点宽度（移动优先 `min-width`）后切到断点值。

断点表：

| 断点 | 宽度 |
| --- | --- |
| `sm` | 640px |
| `md` | 768px |
| `lg` | 1024px |
| `xl` | 1280px |

<DemoBlock title="方向响应式：窄屏竖排、md 起横排">
  <oas-flex direction="column md:row" gap="8px" style="width: 100%">
    <oas-button>按钮 1</oas-button>
    <oas-button>按钮 2</oas-button>
    <oas-button>按钮 3</oas-button>
  </oas-flex>
</DemoBlock>

<DemoBlock title="间距响应式：8px 起、md 起 24px">
  <oas-flex gap="8px md:24px" wrap style="width: 100%">
    <oas-tag>1</oas-tag><oas-tag>2</oas-tag><oas-tag>3</oas-tag>
    <oas-tag>4</oas-tag><oas-tag>5</oas-tag><oas-tag>6</oas-tag>
  </oas-flex>
</DemoBlock>

> 拖窄浏览器窗口可观察 direction 从横排切回竖排、间距收紧的过程。

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
  .demo-flex-fill-box {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 48px;
    background: var(--oas-color-primary);
    color: var(--oas-color-primary-text);
    border-radius: var(--oas-radius-md);
    font-size: var(--oas-font-size-sm);
  }
</style>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `align` | 交叉轴对齐 | `string` | `stretch` |
| `direction` | 主轴方向；支持断点简写：空格分隔的基础值 + 若干 `断点:值`（如 `column md:row`），断点表 `sm`=640px / `md`=768px / `lg`=1024px / `xl`=1280px（移动优先 min-width），低于断点用基础值；非法断点名/值回落基础值并告警 | `string` | `row` |
| `fill` | 子项等分填满容器（`flex: 1` 等价物） | `boolean` | — |
| `fill-ratio` | 配合 `fill` 的分配比例（百分比，默认 100）：子项自身可设、容器级作缺省 | `string` | — |
| `gap` | 子项间距；支持断点简写（如 `8px md:16px`，断点表同 `direction`） | `string` | — |
| `justify` | 主轴对齐：`start`/`center`/`end`/`between`/`around`/`evenly`（与 `flex-*`/`space-*` 旧枚举双向兼容） | `string` | `start` |
| `vertical` | 纵向简写（= direction:column，优先于 direction） | `boolean` | — |
| `wrap` | 换行 | `boolean` | — |

### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | — |
