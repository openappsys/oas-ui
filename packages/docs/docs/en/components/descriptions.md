# Descriptions

Displays read-only information in groups, suitable for detail page scenarios.

## Basic Usage

<DemoBlock title="Basic description list">
  <div style="width: 100%">
    <oas-descriptions title="User Info" column="3">
      <oas-descriptions-item label="Name"><span>Alice</span></oas-descriptions-item>
      <oas-descriptions-item label="Age"><span>30</span></oas-descriptions-item>
      <oas-descriptions-item label="City"><span>Beijing</span></oas-descriptions-item>
      <oas-descriptions-item label="Phone"><span>138-0000-0000</span></oas-descriptions-item>
      <oas-descriptions-item label="Email"><span>alice@example.com</span></oas-descriptions-item>
      <oas-descriptions-item label="Position"><span>Frontend Engineer</span></oas-descriptions-item>
    </oas-descriptions>
  </div>
</DemoBlock>

## Columns

<DemoBlock title="Two-column layout">
  <div style="width: 100%">
    <oas-descriptions title="Order Info" column="2">
      <oas-descriptions-item label="Order No."><span>SO-20240801-001</span></oas-descriptions-item>
      <oas-descriptions-item label="Order time"><span>2024-08-01 10:30</span></oas-descriptions-item>
      <oas-descriptions-item label="Amount"><span>¥ 1,280.00</span></oas-descriptions-item>
      <oas-descriptions-item label="Delivery"><span>Standard delivery</span></oas-descriptions-item>
    </oas-descriptions>
  </div>
</DemoBlock>

## No Title

<DemoBlock title="No title">
  <div style="width: 100%">
    <oas-descriptions column="3">
      <oas-descriptions-item label="Environment"><span>Production</span></oas-descriptions-item>
      <oas-descriptions-item label="Version"><span>v1.0.0</span></oas-descriptions-item>
      <oas-descriptions-item label="Status"><span>Running</span></oas-descriptions-item>
    </oas-descriptions>
  </div>
</DemoBlock>

## Custom Content

<DemoBlock title="Rich content">
  <div style="width: 100%">
    <oas-descriptions title="Member Info" column="2">
      <oas-descriptions-item label="Owner"><span>Alice</span></oas-descriptions-item>
      <oas-descriptions-item label="Role"><span>Administrator</span></oas-descriptions-item>
      <oas-descriptions-item label="Bio"><span>Responsible for the component library design system and engineering standards.</span></oas-descriptions-item>
      <oas-descriptions-item label="Status"><span>Employed</span></oas-descriptions-item>
    </oas-descriptions>
  </div>
</DemoBlock>

## API

### oas-descriptions

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `column` | Columns per row | `string` | `3` |
| `title` | Title | `string` | — |

| Name | Description |
| --- | --- |
| default | — |

### oas-descriptions-item

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `label` | Field label | `string` | — |

| Name | Description |
| --- | --- |
| default | Field content |
