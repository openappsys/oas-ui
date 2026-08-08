<template>
  <div class="demo-block">
    <div class="demo-block__head">
      <h3 v-if="title">{{ title }}</h3>
      <div v-else>&nbsp;</div>
      <button class="demo-block__toggle" type="button" @click="show = !show">
        {{ show ? '收起代码' : '查看代码' }}
      </button>
    </div>
    <div ref="bodyEl" class="demo-block__body"><slot /></div>
    <div v-show="show" class="demo-block__code">
      <div class="demo-block__code-head">
        <span>示例代码</span>
        <button type="button" class="demo-block__copy" @click="copy">复制</button>
      </div>
      <pre><code>{{ cleanCode }}</code></pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const props = defineProps<{ title?: string }>()
const show = ref(false)
const bodyEl = ref<HTMLElement | null>(null)
const code = ref('')

onMounted(() => {
  // 取 light DOM 原始标签作为示例代码
  code.value = (bodyEl.value?.innerHTML ?? '').replace(/<!--.*?-->/gs, '').trim()
})

const cleanCode = computed(() => code.value)

async function copy(): Promise<void> {
  await navigator.clipboard.writeText(cleanCode.value)
}
</script>

<style scoped>
.demo-block {
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-lg);
  margin-bottom: var(--oas-space-5);
  background: var(--oas-color-bg);
  /* 不再用 overflow: hidden，避免裁掉 demo 内向下展开的下拉/浮层；
     圆角改由 head/code 子区域各自处理 */
}
.demo-block__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--oas-space-3) var(--oas-space-5);
  border-bottom: 1px solid var(--oas-color-border);
  background: var(--oas-color-bg-hover);
  color: var(--oas-color-text-primary);
  border-top-left-radius: var(--oas-radius-lg);
  border-top-right-radius: var(--oas-radius-lg);
}
.demo-block__head h3 {
  margin: 0;
  font-size: var(--oas-font-size-md);
  font-weight: 500;
}
.demo-block__toggle {
  border: 1px solid var(--oas-color-border);
  background: var(--oas-color-bg);
  border-radius: var(--oas-radius-sm);
  padding: 2px 10px;
  font-size: var(--oas-font-size-xs);
  cursor: pointer;
  color: var(--oas-color-text-secondary);
  font-family: inherit;
}
.demo-block__toggle:hover {
  color: var(--oas-color-primary);
  border-color: var(--oas-color-primary);
}
.demo-block__body {
  padding: var(--oas-space-5);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--oas-space-3);
  color: var(--oas-color-text-primary);
  background: var(--oas-color-bg);
  transition: background var(--oas-transition-base) var(--oas-ease-out);
}
.demo-block__body > * {
  max-width: 100%;
}
.demo-block__code {
  border-top: 1px dashed var(--oas-color-border);
  /* 代码区是展开态最底部元素，负责裁出底部圆角（pre 背景色与外层不同） */
  border-bottom-left-radius: var(--oas-radius-lg);
  border-bottom-right-radius: var(--oas-radius-lg);
  overflow: hidden;
}
.demo-block__code-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--oas-space-2) var(--oas-space-4);
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-secondary);
}
.demo-block__copy {
  border: none;
  background: none;
  cursor: pointer;
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-primary);
  font-family: inherit;
}
.demo-block__code pre {
  margin: 0;
  padding: var(--oas-space-3) var(--oas-space-4);
  background: var(--oas-color-bg-hover);
  font-size: var(--oas-font-size-sm);
  overflow-x: auto;
  line-height: 1.7;
}
.demo-block__code code {
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
}
</style>
