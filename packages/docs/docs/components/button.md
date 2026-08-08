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
  <oas-button type="primary" onclick="console.log('oas-click', event)">点击我</oas-button>
</DemoBlock>

## API

| 属性       | 说明   | 类型                                                              | 默认值    |
| ---------- | ------ | ----------------------------------------------------------------- | --------- |
| `type`     | 类型   | `default` / `primary` / `success` / `warning` / `danger` / `text` | `default` |
| `size`     | 尺寸   | `small` / `medium` / `large`                                      | `medium`  |
| `disabled` | 禁用   | boolean                                                           | `false`   |
| `loading`  | 加载态 | boolean                                                           | `false`   |

| 事件        | 说明                              |
| ----------- | --------------------------------- |
| `oas-click` | 点击，`detail: { originalEvent }` |
