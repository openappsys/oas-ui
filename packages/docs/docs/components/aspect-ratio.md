# AspectRatio 等比容器

按指定宽高比锁定容器尺寸的纯展示组件，支持预定义比例名（`square`/`landscape`/`portrait`/`wide`/`ultrawide`/`golden`）与分式/小数语法；宽度 100%、高度由比例推导，内容铺满并按比例裁切；无子内容时仍按比例占位。无事件。

## 基础用法

<DemoBlock title="16/9 视频比例">
  <oas-aspect-ratio ratio="16/9" style="border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); background: var(--oas-color-bg-hover);">
    <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--oas-color-text-secondary);">16:9</div>
  </oas-aspect-ratio>
</DemoBlock>

## 常见比例

<DemoBlock title="4:3 / 1:1 / 21:9">
  <oas-aspect-ratio ratio="4:3" style="border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); background: var(--oas-color-bg-hover); margin-bottom: var(--oas-space-3);">
    <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--oas-color-text-secondary);">4:3</div>
  </oas-aspect-ratio>
  <oas-aspect-ratio ratio="1:1" style="border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); background: var(--oas-color-bg-hover); margin-bottom: var(--oas-space-3); width: 200px;">
    <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--oas-color-text-secondary);">1:1</div>
  </oas-aspect-ratio>
  <oas-aspect-ratio ratio="21:9" style="border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); background: var(--oas-color-bg-hover);">
    <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--oas-color-text-secondary);">21:9</div>
  </oas-aspect-ratio>
</DemoBlock>

## 预定义比例名

`ratio` 支持六个预定义 token，名字映射常用比例（与分式/小数语法共存，token 名优先匹配）：

| token        | 比例      | token        | 比例      |
| ------------ | --------- | ------------ | --------- |
| `square`     | 1 : 1     | `wide`       | 16 : 9    |
| `landscape`  | 4 : 3     | `ultrawide`  | 21 : 9    |
| `portrait`   | 3 : 4     | `golden`     | 1.618 : 1 |

<DemoBlock title="预定义 token 六档">
  <oas-aspect-ratio ratio="square" style="width: 160px; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); background: var(--oas-color-bg-hover);">
    <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--oas-color-text-secondary);">square 1:1</div>
  </oas-aspect-ratio>
  <oas-aspect-ratio ratio="landscape" style="width: 160px; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); background: var(--oas-color-bg-hover);">
    <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--oas-color-text-secondary);">landscape 4:3</div>
  </oas-aspect-ratio>
  <oas-aspect-ratio ratio="portrait" style="width: 160px; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); background: var(--oas-color-bg-hover);">
    <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--oas-color-text-secondary);">portrait 3:4</div>
  </oas-aspect-ratio>
  <oas-aspect-ratio ratio="wide" style="border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); background: var(--oas-color-bg-hover);">
    <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--oas-color-text-secondary);">wide 16:9</div>
  </oas-aspect-ratio>
  <oas-aspect-ratio ratio="ultrawide" style="border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); background: var(--oas-color-bg-hover);">
    <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--oas-color-text-secondary);">ultrawide 21:9</div>
  </oas-aspect-ratio>
  <oas-aspect-ratio ratio="golden" style="width: 320px; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); background: var(--oas-color-bg-hover);">
    <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--oas-color-text-secondary);">golden 1.618:1</div>
  </oas-aspect-ratio>
</DemoBlock>

## number 形式

`ratio` 也可通过 number property 赋值（`el.ratio = 1.5`），与字符串形式完全等价——在 Vue/React 中以 `:ratio` 绑定数字或直接赋 property 均走同一解析链路。

<DemoBlock title="小数 / number property">
  <oas-space direction="vertical" style="width: 100%">
    <oas-aspect-ratio ratio="1.5" style="border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); background: var(--oas-color-bg-hover);">
      <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--oas-color-text-secondary);">ratio="1.5"（照片 3:2）</div>
    </oas-aspect-ratio>
    <oas-space size="small">
      <oas-button size="small" onclick="document.getElementById('ar-property').ratio = 1.5">el.ratio = 1.5</oas-button>
      <oas-button size="small" onclick="document.getElementById('ar-property').ratio = '16/9'">el.ratio = '16/9'</oas-button>
      <oas-button size="small" onclick="document.getElementById('ar-property').ratio = 'golden'">el.ratio = 'golden'</oas-button>
    </oas-space>
    <oas-aspect-ratio id="ar-property" ratio="1.5" style="border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); background: var(--oas-color-bg-hover);">
      <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--oas-color-text-secondary);">number property 赋值（点击上方按钮切换）</div>
    </oas-aspect-ratio>
  </oas-space>
</DemoBlock>

## flex 容器内

`oas-aspect-ratio` 默认宽度 100%，但在 flex 容器中作为 flex 子项时**不会自动拉伸占满**——高度仍按比例推导，宽度由 flex 布局决定。需要撑开时给宿主设 `flex` 属性（如 `flex: 1`）或显式宽度。

<DemoBlock title="flex 容器中的表现">
  <oas-flex gap="8px" style="width: 100%">
    <oas-aspect-ratio ratio="16/9" style="flex: 1; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); background: var(--oas-color-bg-hover);">
      <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--oas-color-text-secondary);">flex: 1</div>
    </oas-aspect-ratio>
    <oas-aspect-ratio ratio="16/9" style="flex: 1; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); background: var(--oas-color-bg-hover);">
      <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--oas-color-text-secondary);">flex: 1</div>
    </oas-aspect-ratio>
    <oas-aspect-ratio ratio="1/1" style="width: 96px; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); background: var(--oas-color-bg-hover);">
      <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--oas-color-text-secondary);">width 96px</div>
    </oas-aspect-ratio>
  </oas-flex>
</DemoBlock>

> 注意：不设宽度/`flex` 时，flex 容器内的 `oas-aspect-ratio` 宽度由内容决定（内容为空时可能塌成 0）——请始终给宿主设 `flex` 属性或显式宽度。

## 空内容占位

<DemoBlock title="无子内容仍保比例（1:1）">
  <oas-aspect-ratio ratio="1:1" style="border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); background: var(--oas-color-bg-hover);"></oas-aspect-ratio>
</DemoBlock>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `ratio` | 宽高比：预定义名 `square`（1/1）/ `landscape`（4/3）/ `portrait`（3/4）/ `wide`（16/9）/ `ultrawide`（21/9）/ `golden`（1.618/1），或分式 `16/9`、`4:3`、`16 / 9`、小数 `1.5`；亦可用 property 赋 number（`el.ratio = 1.5`）。token 名优先匹配；缺失/非法（含 0 分子或分母）回退 `1 / 1`，非法值 dev 告警一次（同值去重） | `string \| number` | — |

### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | — |

- 宿主宽度 100%，高度由 `aspect-ratio` 推导；内容经 absolute `inset: 0` 铺满并按比例裁切。
- 无子内容时宿主仍按比例占位。
- 无事件，纯展示。
