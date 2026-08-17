<script setup lang="ts">
import { ref, watch } from 'vue'
import { message } from '@oas-ui/ui'

type Theme = 'light' | 'dark' | 'high-contrast'
const theme = ref<Theme>('light')

// 主题挂 html（documentElement）：token 的 [data-theme] 变量定义在 html 上，
// body 背景与全部组件一起跟随；挂根 div 会导致页面底色不跟随（普通行透明底透出白页，dark 下文字不可见）
watch(
  theme,
  (v) => {
    document.documentElement.dataset.theme = v
  },
  { immediate: true },
)
const form = ref({ name: '', email: '' })
const sortInfo = ref('')
const formRef = ref<HTMLElement | null>(null)

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

// oas-button 在 oas-form 的 shadow DOM 外，点击不触发跨 shadow 的原生 submit 语义；
// 显式调 oas-form 内部 form 的 requestSubmit()（与文档站 demo 同一接法）
function submitForm() {
  formRef.value?.shadowRoot?.querySelector('form')?.requestSubmit()
}

function onSubmit(e: Event) {
  const d = (e as CustomEvent<{ values: Record<string, string> }>).detail
  form.value = { name: d.values['name'] ?? '', email: d.values['email'] ?? '' }
}

function onSortChange(e: Event) {
  const d = (e as CustomEvent<{ key: string; order: string }>).detail
  sortInfo.value = `key=${d.key} order=${d.order || '无'}`
}
</script>

<template>
  <div>
    <h1>Vue Playground</h1>

    <div class="demo-block">
      <h3>主题切换</h3>
      <div class="switch-row">
        <oas-button
          size="small"
          @click="theme = 'light'"
          :type="theme === 'light' ? 'primary' : 'default'"
          >Light</oas-button
        >
        <oas-button size="small" @click="theme = 'dark'" :type="theme === 'dark' ? 'primary' : 'default'"
          >Dark</oas-button
        >
        <oas-button
          size="small"
          @click="theme = 'high-contrast'"
          :type="theme === 'high-contrast' ? 'primary' : 'default'"
          >高对比</oas-button
        >
      </div>
    </div>

    <div class="demo-block">
      <h3>表单（oas-submit 桥接）</h3>
      <oas-form ref="formRef" @oas-submit="onSubmit">
        <oas-form-item label="姓名" name="name" required>
          <oas-input name="name" placeholder="请输入姓名" required></oas-input>
        </oas-form-item>
        <oas-form-item label="邮箱" name="email" required>
          <oas-input name="email" placeholder="请输入邮箱" required></oas-input>
        </oas-form-item>
        <oas-button type="primary" size="small" @click="submitForm">提交</oas-button>
      </oas-form>
      <p v-if="form.name">已提交：{{ form.name }} / {{ form.email }}</p>
    </div>

    <div class="demo-block">
      <h3>表格（attribute 通道 + sort-change 桥接）</h3>
      <oas-table
        :columns="JSON.stringify(columns)"
        :data="JSON.stringify(rows)"
        row-key="key"
        @oas-sort-change="onSortChange"
      ></oas-table>
      <p v-if="sortInfo">排序：{{ sortInfo }}</p>
    </div>

    <div class="demo-block">
      <h3>消息（命令式 API）</h3>
      <oas-button size="small" @click="message.success('Vue 侧成功提示')">成功消息</oas-button>
    </div>

    <div class="demo-block">
      <h3>Vue 3 属性传递通道</h3>
      <oas-select
        placeholder="请选择"
        options='[{"value":"a","label":"选项 A"},{"value":"b","label":"选项 B"}]'
        style="width: 220px"
      ></oas-select>
      <oas-input prefix="¥" placeholder="金额" style="width: 180px"></oas-input>
    </div>
  </div>
</template>
