<script setup lang="ts">
import { ref } from 'vue'

type Theme = 'light' | 'dark' | 'high-contrast'
const theme = ref<Theme>('light')
const sortInfo = ref('')

const columns = [
  { key: 'name', title: '姓名', sortable: true },
  { key: 'age', title: '年龄', sortable: true },
  { key: 'city', title: '城市' },
]
const rows = [
  { key: 1, name: '张三', age: 30, city: '北京' },
  { key: 2, name: '李四', age: 25, city: '上海' },
  { key: 3, name: '王五', age: 35, city: '深圳' },
]

function onSortChange(e: Event) {
  const d = (e as CustomEvent).detail
  sortInfo.value = `key=${d.key} order=${d.order || '无'}`
}
</script>

<template>
  <div :data-theme="theme">
    <h1>Vue Playground · 表格页</h1>

    <div class="switch-row">
      <oas-button size="sm" @click="theme = 'light'" :type="theme === 'light' ? 'primary' : 'default'">Light</oas-button>
      <oas-button size="sm" @click="theme = 'dark'" :type="theme === 'dark' ? 'primary' : 'default'">Dark</oas-button>
      <oas-button size="sm" @click="theme = 'high-contrast'" :type="theme === 'high-contrast' ? 'primary' : 'default'">高对比</oas-button>
    </div>

    <div class="demo-block">
      <h3>可排序表格（@oas-sort-change 桥接）</h3>
      <oas-table
        :columns="JSON.stringify(columns)"
        :data="JSON.stringify(rows)"
        row-key="key"
        @oas-sort-change="onSortChange"
      ></oas-table>
      <p v-if="sortInfo">排序：{{ sortInfo }}</p>
    </div>

    <div class="demo-block">
      <h3>抽屉 + 消息</h3>
      <oas-button
        size="sm"
        @click="
          ;(window as any).OASMessage?.success?.('Vue 侧成功提示')
        "
      >成功消息</oas-button>
    </div>
  </div>
</template>
