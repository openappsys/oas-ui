# Grid 栅格

## 基础用法

<div class="demo">
  <oas-grid gap="12px">
    <oas-grid-item span="8"><div class="grid-box" style="height: 40px; background: var(--oas-color-bg-hover); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center">8 列</div></oas-grid-item>
    <oas-grid-item span="8"><div class="grid-box" style="height: 40px; background: var(--oas-color-bg-hover); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center">8 列</div></oas-grid-item>
    <oas-grid-item span="8"><div class="grid-box" style="height: 40px; background: var(--oas-color-bg-hover); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center">8 列</div></oas-grid-item>
  </oas-grid>
</div>

## API

| 组件 | 属性 | 说明 | 默认值 |
|---|---|---|---|
| `oas-grid` | `cols` | 总列数 | `24` |
| `oas-grid` | `gap` | 间距 | `0` |
| `oas-grid-item` | `span` | 跨列数 | `24` |
| `oas-grid-item` | `offset` | 偏移列数 | `0` |
