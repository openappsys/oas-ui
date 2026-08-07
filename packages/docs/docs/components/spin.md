# Spin 加载中

加载指示器，可包裹内容。

## 基础用法

<div class="demo">
  <oas-space>
    <oas-spin></oas-spin>
    <oas-spin size="sm"></oas-spin>
    <oas-spin size="lg"></oas-spin>
  </oas-space>
</div>

## 包裹内容

<div class="demo" style="width: 300px; position: relative">
  <oas-spin spinning>
    <div style="height: 80px; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center">加载中的内容区域</div>
  </oas-spin>
</div>

## API

| 属性 | 说明 | 默认值 |
|---|---|---|
| `size` | `sm` / `md` / `lg` | `md` |
| `spinning` | 包裹内容并覆盖遮罩 | `false` |

`role="status"` + `aria-busy="true"`。
