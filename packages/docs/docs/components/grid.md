# Grid 栅格

24 栅格布局系统，配合 `oas-grid-item` 划分列宽，支持间距、偏移与自定义总列数；设置 `columns` 后切换为自动等分布局（simple-grid）。

## 基础栅格

<DemoBlock title="三等分">
  <oas-grid gap="12px" style="width: 100%">
    <oas-grid-item span="8"><div class="demo-grid-box">span 8</div></oas-grid-item>
    <oas-grid-item span="8"><div class="demo-grid-box">span 8</div></oas-grid-item>
    <oas-grid-item span="8"><div class="demo-grid-box">span 8</div></oas-grid-item>
  </oas-grid>
</DemoBlock>

## 不等分

<DemoBlock title="不等分">
  <oas-grid gap="12px" style="width: 100%">
    <oas-grid-item span="6"><div class="demo-grid-box">span 6</div></oas-grid-item>
    <oas-grid-item span="12"><div class="demo-grid-box">span 12</div></oas-grid-item>
    <oas-grid-item span="6"><div class="demo-grid-box">span 6</div></oas-grid-item>
  </oas-grid>
</DemoBlock>

## 偏移

<DemoBlock title="偏移 offset">
  <oas-grid gap="12px" style="width: 100%">
    <oas-grid-item span="12"><div class="demo-grid-box">span 12</div></oas-grid-item>
    <oas-grid-item span="8" offset="4"><div class="demo-grid-box">span 8 offset 4</div></oas-grid-item>
    <oas-grid-item span="4" offset="6"><div class="demo-grid-box">span 4 offset 6</div></oas-grid-item>
  </oas-grid>
</DemoBlock>

## 自定义总列数

<DemoBlock title="自定义 cols">
  <oas-grid cols="12" gap="12px" style="width: 100%">
    <oas-grid-item span="6"><div class="demo-grid-box">span 6 / 12 列</div></oas-grid-item>
    <oas-grid-item span="6"><div class="demo-grid-box">span 6 / 12 列</div></oas-grid-item>
    <oas-grid-item span="4"><div class="demo-grid-box">span 4</div></oas-grid-item>
    <oas-grid-item span="8"><div class="demo-grid-box">span 8</div></oas-grid-item>
  </oas-grid>
</DemoBlock>

## 自动列（simple-grid）

设置 `columns` 后按 `repeat(n, 1fr)` 自动等分，子项 span 被忽略（span 仅在无 `columns` 时生效），与 24 列栅格并存不冲突。

<DemoBlock title="columns 自动等分">
  <oas-grid columns="3" gap="12px" style="width: 100%">
    <div class="demo-grid-box">1</div>
    <div class="demo-grid-box">2</div>
    <div class="demo-grid-box">3</div>
    <div class="demo-grid-box">4</div>
    <div class="demo-grid-box">5</div>
    <div class="demo-grid-box">6</div>
  </oas-grid>
</DemoBlock>

<DemoBlock title="columns 忽略 span">
  <oas-grid columns="4" gap="12px" style="width: 100%">
    <oas-grid-item span="8"><div class="demo-grid-box">span 8 被忽略</div></oas-grid-item>
    <oas-grid-item span="24"><div class="demo-grid-box">span 24 被忽略</div></oas-grid-item>
    <oas-grid-item span="8"><div class="demo-grid-box">span 8 被忽略</div></oas-grid-item>
    <oas-grid-item span="24"><div class="demo-grid-box">span 24 被忽略</div></oas-grid-item>
  </oas-grid>
</DemoBlock>

## 大间距

<DemoBlock title="间距 gap">
  <oas-grid gap="24px" style="width: 100%">
    <oas-grid-item span="8"><div class="demo-grid-box">span 8</div></oas-grid-item>
    <oas-grid-item span="8"><div class="demo-grid-box">span 8</div></oas-grid-item>
    <oas-grid-item span="8"><div class="demo-grid-box">span 8</div></oas-grid-item>
  </oas-grid>
</DemoBlock>

<style>
  .demo-grid-box {
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--oas-color-bg-hover);
    border-radius: var(--oas-radius-md);
    font-size: var(--oas-font-size-xs);
    color: var(--oas-color-text-secondary);
  }
</style>

## API

### oas-grid

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `cols` | 总列数 | `string` | `24` |
| `columns` | 自动等分数（simple-grid，有值时忽略子项 span） | `string` | — |
| `gap` | 间距 | `string` | `0` |

| 名称 | 说明 |
| --- | --- |
| 默认 | — |

### oas-grid-item

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `offset` | 左侧偏移列数 | `string` | `0` |
| `span` | 跨列数 | `string` | `24` |

| 名称 | 说明 |
| --- | --- |
| 默认 | — |

`oas-grid` 渲染为 CSS Grid，子项为 24 份中的一份；`oas-grid-item` 通过 `span` 声明占位。设置 `columns` 后自动等分、忽略 span，普通元素子项也可直接放入。
