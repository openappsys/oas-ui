# Cascader 级联选择

多列面板级联选择。

## 基础用法

<div class="demo">
  <oas-cascader placeholder="请选择地区" options='[{"label":"浙江","value":"zj","children":[{"label":"杭州","value":"hz"},{"label":"宁波","value":"nb"}]},{"label":"江苏","value":"js","children":[{"label":"南京","value":"nj"}]}]'></oas-cascader>
</div>

## 选择即生效

<div class="demo">
  <oas-cascader change-on-select placeholder="选择非叶子即提交" options='[{"label":"浙江","value":"zj","children":[{"label":"杭州","value":"hz"}]}]'></oas-cascader>
</div>

## API

| 属性 | 说明 | 默认值 |
|---|---|---|
| `value` | 路径数组（JSON） | `[]` |
| `options` | 级联选项，JSON 树 | `[]` |
| `placeholder` | 占位符 | `请选择` |
| `change-on-select` | 选中任意级即提交 | `false` |
| `disabled` | 禁用 | `false` |

| 事件 | 说明 |
|---|---|
| `oas-change` | 选择变化，`detail: { value }`（路径数组） |
