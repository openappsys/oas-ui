# Segmented 分段器

单选的线性分段选择器，用于轻度筛选 / 切换视图，`role="radiogroup"`，可禁用单项。

## 基础用法

<DemoBlock title="基础用法">
  <oas-segmented options='[{"label":"日","value":"day"},{"label":"周","value":"week"},{"label":"月","value":"month"}]'></oas-segmented>
</DemoBlock>

## 默认选中

<DemoBlock title="受控 value">
  <oas-segmented value="week" options='[{"label":"日","value":"day"},{"label":"周","value":"week"},{"label":"月","value":"month"}]'></oas-segmented>
</DemoBlock>

## 禁用单项

<DemoBlock title="禁用选项">
  <oas-segmented options='[{"label":"启用","value":"on"},{"label":"禁用","value":"off","disabled":true},{"label":"仅读","value":"ro","disabled":true}]'></oas-segmented>
</DemoBlock>

## 切换事件

<DemoBlock title="oas-change 事件">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-segmented id="segmented-demo" options='[{"label":"图表","value":"chart"},{"label":"列表","value":"list"},{"label":"看板","value":"board"}]'></oas-segmented>
    <oas-tag type="primary" id="segmented-info">当前选中：chart</oas-tag>
  </oas-space>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const seg = document.getElementById('segmented-demo')
  const info = document.getElementById('segmented-info')
  seg?.addEventListener('oas-change', (e) => {
    const { value } = e.detail
    info.textContent = `当前选中：${value}`
  })
})
</script>

## API

| 属性      | 说明                                        |
| --------- | ------------------------------------------- |
| `options` | `[{ label, value, disabled? }]` JSON 字符串 |
| `value`   | 选中值（缺省选第一项，受控属性）            |

| 事件         | 说明                      |
| ------------ | ------------------------- |
| `oas-change` | 切换，`detail: { value }` |

容器 `role="radiogroup"`，每项 `role="radio"` + `aria-checked` / `aria-disabled`。
