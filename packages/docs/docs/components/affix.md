# Affix 固钉

将内容吸附在视口顶部，页面滚动到指定偏移后自动固定，常用于固定表格操作栏、工具栏等。

## 基础用法

<DemoBlock title="基础用法">
  <oas-affix offset="16">
    <oas-button type="primary">滚动页面时固定到顶部</oas-button>
  </oas-affix>
</DemoBlock>

向下滚动当前页面，观察按钮在接近视口顶部时被固定（`position: fixed`）。

## 自定义偏移

<DemoBlock title="自定义偏移">
  <oas-affix offset="80">
    <oas-button>固定于距视口顶部 80px</oas-button>
  </oas-affix>
</DemoBlock>

## 组合内容

<DemoBlock title="组合内容">
  <oas-affix offset="16">
    <oas-space>
      <oas-tag type="primary">筛选条件</oas-tag>
      <oas-button size="small">重置</oas-button>
      <oas-button size="small" type="primary">查询</oas-button>
    </oas-space>
  </oas-affix>
</DemoBlock>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `offset` | 距视口顶部的固定距离（px） | `string` | `0` |

### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | — |

监听 `window` scroll，元素滚出视口后吸附，内容通过默认插槽传入。
