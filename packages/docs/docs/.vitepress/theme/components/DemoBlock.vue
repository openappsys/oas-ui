<template>
  <div class="demo-block">
    <div class="demo-block__head">
      <h3 v-if="title">{{ title }}</h3>
      <div v-else>&nbsp;</div>
      <button class="demo-block__toggle" type="button" @click="toggle">
        {{ show ? labels.hide : labels.show }}
      </button>
    </div>
    <div ref="bodyEl" class="demo-block__body"><slot /></div>
    <div v-show="show" class="demo-block__code">
      <div class="demo-block__code-head">
        <span>{{ labels.example }}</span>
        <button type="button" class="demo-block__copy" @click="copy">{{ labels.copy }}</button>
      </div>
      <!-- Shiki 高亮输出完整 <pre>，经 v-html 注入；未就绪或失败时回退纯文本 -->
      <div v-if="highlightedHtml" class="demo-block__code-body" v-html="highlightedHtml"></div>
      <pre v-else><code>{{ code }}</code></pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useData } from 'vitepress'

const props = defineProps<{ title?: string; script?: string }>()
const show = ref(false)
const bodyEl = ref<HTMLElement | null>(null)
const code = ref('')
const highlightedHtml = ref('')

// UI 文案跟随页面 locale（zh-CN / en）
const { lang } = useData()
const labels = computed(() =>
  lang.value.startsWith('en')
    ? { show: 'Show code', hide: 'Hide code', example: 'Example', copy: 'Copy' }
    : { show: '查看代码', hide: '收起代码', example: '示例代码', copy: '复制' },
)

/** 把浏览器序列化的单行 HTML 格式化为换行缩进（便于阅读；空元素 <x></x> 保持一行） */
function formatHtml(html: string): string {
  // 标签间换行：`>` 后非 `</` 才换行（空元素 `<x></x>` 的 `></` 保持一行）
  const tokens = html.replace(/>(?!<\/)\s*</g, '>\n<').split('\n')
  let depth = 0
  const out: string[] = []
  for (const raw of tokens) {
    const t = raw.trim()
    if (!t) continue
    if (/^<\//.test(t)) depth = Math.max(0, depth - 1)
    out.push('  '.repeat(depth) + t)
    // 开标签进一级（排除：自闭合 `/>`、行内闭合 `... </x>` 同 token 已闭合）
    if (/^<[^/!][^>]*>$/.test(t) && !/\/>$/.test(t) && !/<\/[a-z][\w-]*>\s*$/.test(t)) depth++
  }
  return out.join('\n')
}

onMounted(() => {
  // 取 light DOM 原始标签作为示例代码；script prop 提供补充注册/用法代码（完整使用方法）
  const html = (bodyEl.value?.innerHTML ?? '').replace(/<!--.*?-->/gs, '').trim()
  const formatted = formatHtml(html)
  code.value = props.script ? `${props.script.trim()}\n\n${formatted}` : formatted
})

function toggle(): void {
  show.value = !show.value
  // 首次展开才异步高亮（shiki 按需分包，避免每个页面都加载高亮内核）
  if (show.value) void renderHighlight()
}

/**
 * 用 Shiki 把示例代码按 HTML 语法高亮。
 * 双主题（github-light / github-dark）：token 色由行内 --shiki-light/--shiki-dark
 * 变量承载，暗色切换走 CSS（见全局 <style> 块），无需重渲染。
 * 动态 import：shiki 拆成懒加载 chunk；失败时保持纯文本，不阻断复制。
 */
async function renderHighlight(): Promise<void> {
  if (highlightedHtml.value || !code.value) return
  try {
    const [
      { createHighlighterCore },
      { createJavaScriptRegexEngine },
      htmlLang,
      githubLight,
      githubDark,
    ] = await Promise.all([
      import('shiki/core'),
      import('shiki/engine/javascript'),
      import('shiki/langs/html.mjs'),
      import('shiki/themes/github-light.mjs'),
      import('shiki/themes/github-dark.mjs'),
    ])
    const highlighter = await createHighlighterCore({
      themes: [githubLight.default, githubDark.default],
      langs: [htmlLang.default],
      // JS 正则引擎，浏览器端无需加载 wasm
      engine: createJavaScriptRegexEngine(),
    })
    highlightedHtml.value = await highlighter.codeToHtml(code.value, {
      lang: 'html',
      themes: { light: 'github-light', dark: 'github-dark' },
    })
  } catch (err) {
    console.error('[DemoBlock] Shiki 语法高亮失败，已回退为纯文本：', err)
  }
}

async function copy(): Promise<void> {
  await navigator.clipboard.writeText(code.value)
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
/* 纯文本回退的 <pre>（模板内，带 data-v）与 Shiki 注入的 <pre.shiki>（v-html，无 data-v）共用外观 */
.demo-block__code pre,
.demo-block__code :deep(pre.shiki) {
  margin: 0;
  padding: var(--oas-space-3) var(--oas-space-4);
  /* 覆盖 Shiki 行内主题背景，统一走设计 token（明暗自动切换） */
  background: var(--oas-color-bg-hover) !important;
  font-size: var(--oas-font-size-sm);
  overflow-x: auto;
  line-height: 1.7;
}
.demo-block__code code,
.demo-block__code :deep(pre.shiki code) {
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
}
</style>

<style>
/* Shiki 双主题：暗色下把 token 色切到 --shiki-dark（html.dark 由 Vitepress 控制）。
   需放全局块：v-html 注入的 span 不携带本组件 data-v 属性，scoped 选择器够不到。 */
html.dark .demo-block__code-body pre.shiki,
html.dark .demo-block__code-body pre.shiki span {
  color: var(--shiki-dark) !important;
}
</style>
