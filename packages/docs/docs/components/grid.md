# Grid 栅格

24 栅格布局系统，配合 `oas-grid-item` 划分列宽，支持间距、偏移与自定义总列数。

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

| 组件            | 属性     | 说明         | 默认值 |
| --------------- | -------- | ------------ | ------ |
| `oas-grid`      | `cols`   | 总列数       | `24`   |
| `oas-grid`      | `gap`    | 间距         | `0`    |
| `oas-grid-item` | `span`   | 跨列数       | `24`   |
| `oas-grid-item` | `offset` | 左侧偏移列数 | `0`    |

`oas-grid` 渲染为 CSS Grid，子项为 24 份中的一份；`oas-grid-item` 通过 `span` 声明占位。
