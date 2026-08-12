# Spin 加载中

加载指示器，可单独使用，也可包裹内容并叠加遮罩。

## 基础用法

`size` 支持 `xs` / `small` / `medium`（默认）/ `large` / `xl` 五档；旧缩写 `sm`/`md`/`lg` 保留兼容。

<DemoBlock title="五种尺寸">
  <oas-space size="large">
    <oas-spin size="xs"></oas-spin>
    <oas-spin size="small"></oas-spin>
    <oas-spin></oas-spin>
    <oas-spin size="large"></oas-spin>
    <oas-spin size="xl"></oas-spin>
  </oas-space>
</DemoBlock>

<DemoBlock title="旧缩写别名（sm / md / lg）">
  <oas-space size="large">
    <oas-spin size="sm"></oas-spin>
    <oas-spin size="md"></oas-spin>
    <oas-spin size="lg"></oas-spin>
  </oas-space>
</DemoBlock>

## 包裹内容

<DemoBlock title="包裹内容">
  <oas-spin spinning>
    <div style="width: 280px; height: 96px; display: flex; align-items: center; justify-content: center; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md)">
      加载中的内容区域
    </div>
  </oas-spin>
</DemoBlock>

## API

### 属性

| 属性       | 说明                                                                                          | 类型      | 默认值 |
| ---------- | --------------------------------------------------------------------------------------------- | --------- | ------ |
| `size`     | 指示器尺寸：`xs` / `small` / `medium`（默认）/ `large` / `xl`；旧缩写 `sm`/`md`/`lg` 保留兼容 | `string`  | `md`   |
| `spinning` | 是否加载中；设置后包裹内容并叠加遮罩                                                          | `boolean` | —      |

### 插槽

| 名称 | 说明 |
| ---- | ---- |
| 默认 | —    |

指示器 `role="status"`。
