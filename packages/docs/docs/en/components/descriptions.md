# Descriptions

Displays read-only information in groups, suitable for detail page scenarios.

## Basic Usage

<DemoBlock title="Basic description list">
  <div style="width: 100%">
    <oas-descriptions title="用户信息" column="3">
      <oas-descriptions-item label="姓名"><span>张三</span></oas-descriptions-item>
      <oas-descriptions-item label="年龄"><span>30</span></oas-descriptions-item>
      <oas-descriptions-item label="城市"><span>北京</span></oas-descriptions-item>
      <oas-descriptions-item label="手机号"><span>138-0000-0000</span></oas-descriptions-item>
      <oas-descriptions-item label="邮箱"><span>zhangsan@example.com</span></oas-descriptions-item>
      <oas-descriptions-item label="职位"><span>前端工程师</span></oas-descriptions-item>
    </oas-descriptions>
  </div>
</DemoBlock>

## Columns

<DemoBlock title="Two-column layout">
  <div style="width: 100%">
    <oas-descriptions title="订单信息" column="2">
      <oas-descriptions-item label="订单号"><span>SO-20240801-001</span></oas-descriptions-item>
      <oas-descriptions-item label="下单时间"><span>2024-08-01 10:30</span></oas-descriptions-item>
      <oas-descriptions-item label="支付金额"><span>¥ 1,280.00</span></oas-descriptions-item>
      <oas-descriptions-item label="配送方式"><span>标准配送</span></oas-descriptions-item>
    </oas-descriptions>
  </div>
</DemoBlock>

## No Title

<DemoBlock title="No title">
  <div style="width: 100%">
    <oas-descriptions column="3">
      <oas-descriptions-item label="环境"><span>生产</span></oas-descriptions-item>
      <oas-descriptions-item label="版本"><span>v1.0.0</span></oas-descriptions-item>
      <oas-descriptions-item label="状态"><span>运行中</span></oas-descriptions-item>
    </oas-descriptions>
  </div>
</DemoBlock>

## Custom Content

<DemoBlock title="Rich content">
  <div style="width: 100%">
    <oas-descriptions title="成员信息" column="2">
      <oas-descriptions-item label="负责人"><span>张三</span></oas-descriptions-item>
      <oas-descriptions-item label="角色"><span>管理员</span></oas-descriptions-item>
      <oas-descriptions-item label="简介"><span>负责组件库设计系统与工程规范建设。</span></oas-descriptions-item>
      <oas-descriptions-item label="状态"><span>在职</span></oas-descriptions-item>
    </oas-descriptions>
  </div>
</DemoBlock>

## API

| Component                | Attribute | Description   | Type          | Default |
| ------------------------ | --------- | ------------- | ------------- | ------- |
| `oas-descriptions`       | `title`   | Title         | string        | —       |
| `oas-descriptions`       | `column`  | Columns per row | string / number | `3`     |
| `oas-descriptions-item`  | `label`   | Field label   | string        | —       |

| Slot                              | Description   |
| --------------------------------- | -------------- |
| `oas-descriptions-item` default slot | Field content  |
