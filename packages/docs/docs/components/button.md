# Button 按钮

基础按钮组件，原生 `<button>` 增强。

## 类型

<DemoBlock title="按钮类型">
  <oas-button>默认按钮</oas-button>
  <oas-button type="primary">主要按钮</oas-button>
  <oas-button type="success">成功按钮</oas-button>
  <oas-button type="warning">警告按钮</oas-button>
  <oas-button type="danger">危险按钮</oas-button>
  <oas-button type="text">文字按钮</oas-button>
</DemoBlock>

## 尺寸

<DemoBlock title="三种尺寸">
  <oas-button size="small">小按钮</oas-button>
  <oas-button size="medium">中按钮</oas-button>
  <oas-button size="large">大按钮</oas-button>
</DemoBlock>

## 禁用与加载

<DemoBlock title="禁用与加载态">
  <oas-button disabled>禁用</oas-button>
  <oas-button type="primary" loading>加载中</oas-button>
  <oas-button type="success" loading>提交中</oas-button>
</DemoBlock>

## 事件

<DemoBlock title="点击事件">
  <oas-button type="primary" onoas-click="message.info('触发了 oas-click 事件')">点击我</oas-button>
</DemoBlock>

点击派发 `oas-click` CustomEvent（bubbles + composed），`detail.originalEvent` 为原生 MouseEvent。

## 图标按钮

`icon` 在文字前渲染图标（复用 oas-icon 图标集，`IconName`），图标与文字间距走 `--oas-space-2`。

<DemoBlock title="图标 + 文字">
  <oas-button type="primary" icon="search">搜索</oas-button>
  <oas-button type="success" icon="download">下载</oas-button>
  <oas-button type="danger" icon="trash">删除</oas-button>
  <oas-button icon="plus">新建</oas-button>
</DemoBlock>

无文字时按钮自动等宽正方形，需 `aria-label` 提供可访问名称；未显式设置时兜底取图标名（如 `icon="close"` → `aria-label="close"`），建议显式提供中文名称。

<DemoBlock title="纯图标按钮">
  <oas-button type="primary" icon="check" aria-label="确认"></oas-button>
  <oas-button icon="search" aria-label="搜索"></oas-button>
  <oas-button type="danger" icon="trash" aria-label="删除"></oas-button>
  <oas-button icon="heart" aria-label="收藏"></oas-button>
</DemoBlock>

## 块级

`block` 使按钮占满父容器宽度。

<DemoBlock title="块级按钮">
  <oas-button block type="primary">块级按钮</oas-button>
  <oas-button block type="success" icon="download">下载</oas-button>
</DemoBlock>

## 圆角

`round` 使用胶囊圆角（`--oas-radius-full`，无该 token 时回退 `999px`）。

<DemoBlock title="圆角按钮">
  <oas-button round type="primary" icon="check">完成</oas-button>
  <oas-button round icon="search" aria-label="搜索"></oas-button>
  <oas-button round type="danger">取消订阅</oas-button>
</DemoBlock>

## 幽灵

`ghost` 为透明底 + 描边形态，描边与文字按 `type` 着色，hover 加深。

<DemoBlock title="幽灵按钮">
  <oas-button ghost>默认幽灵</oas-button>
  <oas-button ghost type="primary">主要幽灵</oas-button>
  <oas-button ghost type="success">成功幽灵</oas-button>
  <oas-button ghost type="warning">警告幽灵</oas-button>
  <oas-button ghost type="danger" icon="trash">危险幽灵</oas-button>
</DemoBlock>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `block` | 占满父容器宽度（块级） | — | — |
| `disabled` | 禁用 | — | — |
| `ghost` | 幽灵/描边形态，透明底 + 按 `type` 着色描边，hover 加深 | — | — |
| `icon` | 图标名（复用 oas-icon 图标集）；无文字时等宽、以图标名兜底名称 | — | — |
| `loading` | 加载态 | — | — |
| `round` | 胶囊圆角（`--oas-radius-full` / `999px`） | — | — |
| `size` | 尺寸 | `ButtonSize` | `medium` |
| `type` | 类型 | `ButtonType` | `default` |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-click` | 点击，`detail: { originalEvent }` |

### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | — |
