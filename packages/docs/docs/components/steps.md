# Steps 步骤条

## 基础用法

<div class="demo">
  <oas-steps current="1" steps='[{"title":"第一步","description":"开始"},{"title":"第二步","description":"进行中"},{"title":"第三步","description":"完成"}]'></oas-steps>
</div>

## 纵向

<div class="demo" style="width: 240px">
  <oas-steps direction="vertical" current="1" steps='[{"title":"第一步"},{"title":"第二步"},{"title":"第三步"}]'></oas-steps>
</div>

## API

| 属性 | 说明 | 默认值 |
|---|---|---|
| `steps` | `[{ title, description? }]` | `[]` |
| `current` | 当前步骤索引 | `0` |
| `direction` | `horizontal` / `vertical` | `horizontal` |
