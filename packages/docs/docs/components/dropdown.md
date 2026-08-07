# Dropdown 下拉菜单

点击触发器展开菜单，浮层定位到触发元素旁。

## 基础用法

<DemoBlock title="点击触发">
  <oas-dropdown items='[{"label":"编辑","value":"edit"},{"label":"复制","value":"copy"},{"label":"删除","value":"delete"}]' placement="bottom">
    <oas-button type="primary">操作</oas-button>
  </oas-dropdown>
</DemoBlock>

## 放置方向

<DemoBlock title="四个方向">
  <oas-dropdown placement="top" items='[{"label":"编辑","value":"edit"},{"label":"删除","value":"delete"}]'>
    <oas-button>上</oas-button>
  </oas-dropdown>
  <oas-dropdown placement="bottom" items='[{"label":"编辑","value":"edit"},{"label":"删除","value":"delete"}]'>
    <oas-button>下</oas-button>
  </oas-dropdown>
  <oas-dropdown placement="left" items='[{"label":"编辑","value":"edit"},{"label":"删除","value":"delete"}]'>
    <oas-button>左</oas-button>
  </oas-dropdown>
  <oas-dropdown placement="right" items='[{"label":"编辑","value":"edit"},{"label":"删除","value":"delete"}]'>
    <oas-button>右</oas-button>
  </oas-dropdown>
</DemoBlock>

## 禁用项

<DemoBlock title="禁用项">
  <oas-dropdown items='[{"label":"编辑","value":"edit"},{"label":"删除","value":"delete","disabled":true}]'>
    <oas-button>操作</oas-button>
  </oas-dropdown>
</DemoBlock>

## 选择事件

<DemoBlock title="选择事件">
  <oas-dropdown id="dd-event" onoas-select="ddLog(event)" items='[{"label":"编辑","value":"edit"},{"label":"复制","value":"copy"},{"label":"删除","value":"delete"}]'>
    <oas-button>选择操作</oas-button>
  </oas-dropdown>
  <oas-tag id="dd-result" type="info">尚未选择</oas-tag>
</DemoBlock>

## 受控显示

<DemoBlock title="受控显示（open 属性）">
  <oas-button onclick="event.stopPropagation(); document.getElementById('dd-ctrl').toggleAttribute('open')">切换显隐</oas-button>
  <oas-dropdown id="dd-ctrl" items='[{"label":"编辑","value":"edit"},{"label":"删除","value":"delete"}]'>
    <oas-button>触发元素</oas-button>
  </oas-dropdown>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  window.ddLog = (e) => {
    const tag = document.getElementById('dd-result')
    if (tag) tag.textContent = `已选择：${e.detail.value}`
  }
})
</script>

## API

| 属性 | 说明 | 类型 | 默认值 |
|---|---|---|---|
| `items` | 菜单项 JSON | `[{ label, value, disabled? }]` | `[]` |
| `value` | 当前选中值 | `string` | — |
| `placement` | 浮层位置 | `top` / `bottom` / `left` / `right` | `bottom` |
| `open` | 受控显示（布尔属性，存在即展开） | `boolean` | `false` |

| 事件 | 说明 |
|---|---|
| `oas-select` | 选择某项，`detail: { value }` |

点击触发器切换显隐，点击外部 / 按 Esc / 选择后关闭；`role="menu"` + `menuitem`。
