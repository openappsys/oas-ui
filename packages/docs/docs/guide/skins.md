# 皮肤画廊

> 6 套品牌色皮肤 × 3 套内置主题，实时切换预览。机制与用法见[主题与自定义](/guide/theming)。

<script setup>
import { ref } from 'vue'
const skins = [
  ['', 'default'],
  ['violet', 'violet'],
  ['emerald', 'emerald'],
  ['rose', 'rose'],
  ['amber', 'amber'],
  ['graphite', 'graphite'],
  ['teal', 'teal'],
]
const themes = ['light', 'dark', 'high-contrast']
const skin = ref('')
const theme = ref('light')
</script>

<div class="sg-wrap" :data-theme="theme" :data-skin="skin || undefined">
  <div class="sg-row">
    <button
      v-for="[v, label] in skins"
      :key="label"
      class="sg-btn"
      :class="{ 'sg-active': skin === v }"
      @click="skin = v"
    >
      <span class="sg-dot" :data-skin="v || undefined" :data-theme="theme" />{{ label }}
    </button>
  </div>
  <div class="sg-row">
    <button
      v-for="t in themes"
      :key="t"
      class="sg-btn"
      :class="{ 'sg-active': theme === t }"
      @click="theme = t"
    >
      {{ t }}
    </button>
  </div>

  <div class="sg-preview">
    <oas-button type="primary">主要按钮</oas-button>
    <oas-button>次要按钮</oas-button>
    <oas-switch checked></oas-switch>
    <oas-checkbox checked>选项</oas-checkbox>
    <oas-input placeholder="输入框" style="width: 180px"></oas-input>
    <oas-progress :percent="62" style="width: 220px"></oas-progress>
    <oas-tag type="primary">标签</oas-tag>
    <oas-badge value="9" color="primary"><oas-button>徽标</oas-button></oas-badge>
  </div>
</div>

<style>
.sg-wrap {
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-lg);
  padding: var(--oas-space-4);
  background: var(--oas-color-bg);
  transition: background var(--oas-transition-base);
}
.sg-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--oas-space-2);
  margin-bottom: var(--oas-space-3);
}
.sg-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--oas-space-1_5);
  padding: 4px 10px;
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-primary);
  background: var(--oas-color-bg);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-full, 999px);
  border-radius: 999px;
  cursor: pointer;
}
.sg-btn.sg-active {
  border-color: var(--oas-color-primary);
  color: var(--oas-color-primary);
  box-shadow: var(--oas-focus-ring);
}
.sg-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--oas-color-primary);
}
.sg-preview {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--oas-space-3);
  color: var(--oas-color-text-primary);
}
</style>

## 用法

```html
<link rel="stylesheet" href="https://unpkg.com/@oas-ui/theme@2/skins.css" />
<html data-theme="dark" data-skin="violet">
```

```js
document.documentElement.dataset.skin = 'emerald'
```
