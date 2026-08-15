# Space 间距

水平/垂直等距布局容器。

## 水平

<DemoBlock title="水平间距">
  <oas-space>
    <oas-button>按钮</oas-button>
    <oas-button type="primary">按钮</oas-button>
    <oas-button type="danger">按钮</oas-button>
  </oas-space>
</DemoBlock>

## 垂直

<DemoBlock title="垂直间距">
  <oas-space direction="vertical">
    <oas-tag>标签一</oas-tag>
    <oas-tag type="success">标签二</oas-tag>
    <oas-tag type="warning">标签三</oas-tag>
  </oas-space>
</DemoBlock>

## 尺寸与换行

`size` 支持 `xs`（4px）/ `small`（8px）/ `medium`（12px，默认）/ `large`（24px）/ `xl`（32px）五档，或直接写数字像素；非法值回落 `medium` 并提示告警。

<DemoBlock title="五种间距">
  <oas-space size="xs" style="width: 100%;">
    <oas-tag>xs 4px</oas-tag>
    <oas-tag>标签</oas-tag>
    <oas-tag>标签</oas-tag>
  </oas-space>
  <oas-space size="small" style="width: 100%;">
    <oas-tag>small 8px</oas-tag>
    <oas-tag>标签</oas-tag>
    <oas-tag>标签</oas-tag>
  </oas-space>
  <oas-space size="medium" style="width: 100%;">
    <oas-tag>medium 12px</oas-tag>
    <oas-tag>标签</oas-tag>
    <oas-tag>标签</oas-tag>
  </oas-space>
  <oas-space size="large" style="width: 100%;">
    <oas-tag>large 24px</oas-tag>
    <oas-tag>标签</oas-tag>
    <oas-tag>标签</oas-tag>
  </oas-space>
  <oas-space size="xl" style="width: 100%;">
    <oas-tag>xl 32px</oas-tag>
    <oas-tag>标签</oas-tag>
    <oas-tag>标签</oas-tag>
  </oas-space>
</DemoBlock>

<DemoBlock title="大间距与换行">
  <oas-space size="large" wrap>
    <oas-button>按钮 1</oas-button>
    <oas-button>按钮 2</oas-button>
    <oas-button>按钮 3</oas-button>
    <oas-button>按钮 4</oas-button>
    <oas-button>按钮 5</oas-button>
  </oas-space>
</DemoBlock>

`size` 也支持逗号分隔的两值数组（如 `size="8,16"`）：第一个值为横向间距、第二个为纵向间距，`wrap` 换行时纵向间距生效。

<DemoBlock title="size 数组（横向 / 纵向）">
  <oas-space size="8,24" wrap>
    <oas-button>按钮 1</oas-button>
    <oas-button>按钮 2</oas-button>
    <oas-button>按钮 3</oas-button>
    <oas-button>按钮 4</oas-button>
    <oas-button>按钮 5</oas-button>
    <oas-button>按钮 6</oas-button>
  </oas-space>
</DemoBlock>

## 对齐

<DemoBlock title="交叉轴对齐">
  <oas-space align="start">
    <oas-tag>start</oas-tag>
    <oas-button type="primary">按钮</oas-button>
  </oas-space>
  <oas-space align="center">
    <oas-tag>center</oas-tag>
    <oas-button type="primary">按钮</oas-button>
  </oas-space>
</DemoBlock>

## 分隔符

`separator` 在子项间插入分隔符号（次要文字色）；也支持 `slot="separator"` 自定义分隔内容（优先于字符串，例如竖排分割线）。

<DemoBlock title="字符串分隔符">
  <oas-space separator="|">
    <oas-tag>标签</oas-tag>
    <oas-tag>标签</oas-tag>
    <oas-tag>标签</oas-tag>
  </oas-space>
  <oas-space separator="·">
    <oas-button type="text">编辑</oas-button>
    <oas-button type="text">复制</oas-button>
    <oas-button type="text">删除</oas-button>
  </oas-space>
</DemoBlock>

<DemoBlock title="自定义分隔插槽（slot=separator）">
  <oas-space>
    <oas-button type="text">编辑</oas-button>
    <oas-divider direction="vertical" slot="separator"></oas-divider>
    <oas-button type="text">复制</oas-button>
    <oas-divider direction="vertical" slot="separator"></oas-divider>
    <oas-button type="text">删除</oas-button>
  </oas-space>
</DemoBlock>

## 分布

`justify` 控制主轴分布：`start` / `center` / `end` / `space-between` / `space-around` / `space-evenly`；不设置时保持默认起点排列。

<DemoBlock title="justify 分布">
  <oas-space justify="space-between" style="width: 100%">
    <oas-tag>space-between</oas-tag>
    <oas-tag>两端对齐</oas-tag>
    <oas-tag>标签</oas-tag>
  </oas-space>
  <oas-space justify="center" style="width: 100%">
    <oas-tag>center</oas-tag>
    <oas-tag>居中</oas-tag>
  </oas-space>
  <oas-space justify="space-around" style="width: 100%">
    <oas-tag>space-around</oas-tag>
    <oas-tag>项两侧均分</oas-tag>
    <oas-tag>标签</oas-tag>
  </oas-space>
  <oas-space justify="end" style="width: 100%">
    <oas-tag>end</oas-tag>
    <oas-tag>靠右</oas-tag>
  </oas-space>
</DemoBlock>

## 反向排列

`reverse` 翻转主轴方向：水平 → `row-reverse`（从右到左）、垂直 → `column-reverse`（从下到上）。

<DemoBlock title="reverse 反向排列">
  <oas-space reverse>
    <oas-button>一</oas-button>
    <oas-button>二</oas-button>
    <oas-button>三</oas-button>
  </oas-space>
  <oas-space direction="vertical" reverse>
    <oas-tag>标签一</oas-tag>
    <oas-tag>标签二</oas-tag>
    <oas-tag>标签三</oas-tag>
  </oas-space>
</DemoBlock>

## 子项填满

`fill` 让子项等分填满容器（`flex: 1` 等价物）；`fill-ratio`（百分比，默认 100）按比例分配——子项自身可设置，容器级 `fill-ratio` 作为缺省。

<DemoBlock title="fill 子项等分填满">
  <oas-space fill style="width: 100%">
    <oas-button>一</oas-button>
    <oas-button>二</oas-button>
    <oas-button>三</oas-button>
  </oas-space>
  <oas-space fill style="width: 100%">
    <oas-button>一</oas-button>
    <oas-button fill-ratio="200">二（200%）</oas-button>
    <oas-button>三</oas-button>
  </oas-space>
</DemoBlock>

## 行内嵌入

`oas-space` 默认是块级 flex 容器；需要嵌在文字段落中时，给宿主加一行 `style="display: inline-flex"` 即可——行内是宿主 CSS 的事，不是组件属性。

<DemoBlock title="行内嵌入文字段落">
  <p>
    正文中间嵌一组
    <oas-space style="display: inline-flex" size="small">
      <oas-tag>标签一</oas-tag>
      <oas-tag type="success">标签二</oas-tag>
    </oas-space>
    标签，与文字同行、等距排列。
  </p>
</DemoBlock>

## 响应式

`direction` 与 `size` 支持断点简写：空格分隔的基础值 + 若干 `断点:值`（如 `direction="column md:row"`、`size="small md:large"`）。窗口在断点宽度以下时用基础值，达到断点宽度（移动优先 `min-width`）后切到断点值。

断点表：

| 断点 | 宽度 |
| --- | --- |
| `sm` | 640px |
| `md` | 768px |
| `lg` | 1024px |
| `xl` | 1280px |

<DemoBlock title="方向响应式：窄屏竖排、md 起横排">
  <oas-space direction="column md:row" style="width: 100%">
    <oas-button>按钮 1</oas-button>
    <oas-button>按钮 2</oas-button>
    <oas-button>按钮 3</oas-button>
  </oas-space>
</DemoBlock>

<DemoBlock title="间距响应式：small 起、md 起 large">
  <oas-space size="small md:large" wrap>
    <oas-button>按钮 1</oas-button>
    <oas-button>按钮 2</oas-button>
    <oas-button>按钮 3</oas-button>
    <oas-button>按钮 4</oas-button>
    <oas-button>按钮 5</oas-button>
  </oas-space>
</DemoBlock>

## 紧凑组合（oas-compact）

`oas-compact` 让相邻表单控件（`oas-button` / `oas-input` / `oas-input-number` / `oas-select`）贴边合并边框：相邻处 -1px 重叠、首尾圆角、中间直角；支持 `vertical`（纵向贴合）、`disabled`（全组禁用）、`block`（宽度 100%）。

<DemoBlock title="input + button 贴合">
  <oas-compact aria-label="搜索组合">
    <oas-input value="oas-ui" placeholder="请输入关键词"></oas-input>
    <oas-button type="primary">查询</oas-button>
  </oas-compact>
</DemoBlock>

<DemoBlock title="select + button 贴合">
  <oas-compact>
    <oas-select value="all" options='[{"label":"全部","value":"all"},{"label":"进行中","value":"active"},{"label":"已完成","value":"done"}]'></oas-select>
    <oas-button type="primary">筛选</oas-button>
  </oas-compact>
</DemoBlock>

<DemoBlock title="纵向贴合">
  <oas-compact vertical>
    <oas-button>顶部</oas-button>
    <oas-button>中间</oas-button>
    <oas-button type="primary">底部</oas-button>
  </oas-compact>
</DemoBlock>

<DemoBlock title="block 撑满与 disabled 透传">
  <oas-compact block>
    <oas-input placeholder="订阅邮箱"></oas-input>
    <oas-button type="primary">订阅</oas-button>
  </oas-compact>
  <oas-compact disabled>
    <oas-input placeholder="全组禁用"></oas-input>
    <oas-button type="primary">按钮</oas-button>
  </oas-compact>
</DemoBlock>

## API

### oas-space

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `align` | 对齐 | `string` | — |
| `direction` | 方向；支持断点简写：空格分隔的基础值 + 若干 `断点:值`（如 `column md:row`），断点表 `sm`=640px / `md`=768px / `lg`=1024px / `xl`=1280px（移动优先 min-width），低于断点用基础值 | `SpaceDirection` | `horizontal` |
| `fill` | 子项等分填满容器（`flex: 1` 等价物） | `boolean` | — |
| `fill-ratio` | 配合 `fill` 的分配比例（百分比，默认 100）：子项自身可设、容器级作缺省 | `string` | — |
| `justify` | 主轴分布：`start` / `center` / `end` / `space-between` / `space-around` / `space-evenly`（缺省不设） | `string` | — |
| `reverse` | 反向排列：水平 → `row-reverse`、垂直 → `column-reverse` | `boolean` | — |
| `separator` | 子项间分隔符字符串（次要文字色）；`slot="separator"` 自定义分隔优先于字符串 | `string` | — |
| `size` | 间距：`xs`（4px）/ `small`（8px）/ `medium`（12px，默认）/ `large`（24px）/ `xl`（32px），或数字像素；逗号分隔两值（如 `8,16`）分别控制横向/纵向间距；支持断点简写（如 `small md:large`，断点表同 `direction`）；非法值回落 `medium` 并告警 | `string` | `medium` |
| `wrap` | 是否换行 | `boolean` | — |

| 名称 | 说明 |
| --- | --- |
| 默认 | 子项 |
| `separator` | 自定义分隔内容（如 `<oas-divider direction="vertical">`），优先于 `separator` 字符串 |

### oas-compact

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `aria-label` | — | `boolean` | — |
| `block` | 宽度 100%（撑满父容器） | — | — |
| `disabled` | 透传全组禁用 | `boolean` | — |
| `vertical` | 纵向贴合（相邻处上下 -1px 重叠，圆角方向改上下） | `boolean` | — |

| 名称 | 说明 |
| --- | --- |
| 默认 | 相邻表单控件（`oas-button` / `oas-input` / `oas-input-number` / `oas-select`） |
