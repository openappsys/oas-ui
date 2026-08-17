<template>
  <section class="home-section home-code">
    <div class="hcode-wrap">
      <header class="hcode-head home-reveal">
        <div class="hcode-kicker">DROP-IN</div>
        <h2 class="hcode-title">{{ isEn ? 'Use it like HTML' : '像写 HTML 一样用它' }}</h2>
        <p class="hcode-intro">
          {{
            isEn
              ? 'Web Components are a browser standard. The same code runs everywhere — framework adapters are optional.'
              : 'Web Components 是浏览器原生标准。同一段代码到处跑——框架桥接是可选加分项。'
          }}
        </p>
      </header>
    <div class="hcode-grid">
      <div class="hcode-left home-reveal">
        <div class="hcode-lead">
          {{ isEn ? 'Zero deps, zero build,' : '零依赖，零构建，' }}
          <br />
          <em>{{ isEn ? 'modern frameworks, all covered.' : '现代框架都适配。' }}</em>
        </div>
        <p class="hcode-sub">
          {{
            isEn
              ? 'Works in plain HTML out of the box; official integration plugins for Vue and React, SSR ready.'
              : 'HTML 直接开用；Vue / React 还有官方集成插件，SSR 开箱即用。'
          }}
        </p>
        <div class="hcode-bridges">
          <a
            v-for="b in bridges"
            :key="b.name"
            :href="b.link"
            class="hcode-bridge"
          >
            <span class="hcode-bridge-ic">{{ b.ic }}</span>
            <div>
              <div class="hcode-bridge-nm">{{ b.name }}</div>
              <div class="hcode-bridge-ht">{{ b.hint }}</div>
            </div>
          </a>
        </div>
      </div>
      <div class="hcode-win home-reveal" :style="{ '--d': '0.15s' }">
        <div class="hcode-tabs">
          <span
            v-for="t in tabs"
            :key="t.key"
            class="hcode-tab"
            :class="{ on: active === t.key }"
            @click="active = t.key"
          >
            {{ t.label }}
          </span>
          <span class="hcode-file">oas-button</span>
        </div>
        <pre class="hcode-pre" v-html="snippetHtml"></pre>
        <div class="hcode-out">
          <span class="hcode-out-lbl">OUTPUT ▸</span>
          <span class="hcode-render">{{ btn }}</span>
          <span class="hcode-render ghost">{{ isEn ? 'Secondary' : '次要' }}</span>
          <span class="hcode-ok">✓ {{ isEn ? 'one component, everywhere' : '一套组件，处处可用' }}</span>
        </div>
      </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useData } from 'vitepress'

const { lang } = useData()
const isEn = computed(() => lang.value.startsWith('en'))

const active = ref('html')

const tabs = computed(() => [
  { key: 'html', label: 'HTML' },
  { key: 'vue', label: 'Vue' },
  { key: 'react', label: 'React' },
  { key: 'svelte', label: 'Svelte' },
  { key: 'angular', label: 'Angular' },
  { key: 'astro', label: 'Astro' },
])

// 代码示例按语言生成：按钮/输入文案与注释跟随当前 locale
const btn = computed(() => (isEn.value ? 'Save' : '保存'))
const ph = computed(() => (isEn.value ? 'Type here' : '输入内容'))

const snippets = computed<Record<string, string>>(() => {
  const b = btn.value
  const p = ph.value
  return {
    html: `<span class="l">1</span><span class="c">&lt;!-- ${isEn.value ? 'plain HTML: drop-in' : '原生 HTML：直接引入'} --&gt;</span>\n<span class="l">2</span><span class="t">&lt;script</span> <span class="a">type</span>=<span class="s">"module"</span> <span class="a">src</span>=<span class="s">"https://unpkg.com/@oas-ui/ui"</span><span class="t">&gt;&lt;/script&gt;</span>\n<span class="l">3</span>\n<span class="l">4</span><span class="t">&lt;oas-button</span> <span class="a">type</span>=<span class="s">"primary"</span><span class="t">&gt;</span>${b}<span class="t">&lt;/oas-button&gt;</span>\n<span class="l">5</span><span class="t">&lt;oas-input</span> <span class="a">placeholder</span>=<span class="s">"${p}"</span><span class="t">&gt;&lt;/oas-input&gt;</span>`,
    vue: `<span class="l">1</span><span class="t">&lt;template&gt;</span>\n<span class="l">2</span>  <span class="t">&lt;oas-button</span> <span class="a">type</span>=<span class="s">"primary"</span><span class="t">&gt;</span>${b}<span class="t">&lt;/oas-button&gt;</span>\n<span class="l">3</span>  <span class="t">&lt;oas-input</span> <span class="a">placeholder</span>=<span class="s">"${p}"</span><span class="t">&gt;&lt;/oas-input&gt;</span>\n<span class="l">4</span><span class="t">&lt;/template&gt;</span>\n<span class="l">5</span>\n<span class="l">6</span><span class="c">&lt;!-- ${isEn.value ? 'the same code, rendered by Vue' : '同一段代码，Vue 直接渲染'} --&gt;</span>`,
    react: `<span class="l">1</span><span class="k">export default</span> <span class="k">function</span> App() {\n<span class="l">2</span>  <span class="k">return</span> (\n<span class="l">3</span>    <span class="t">&lt;&gt;</span>\n<span class="l">4</span>      <span class="t">&lt;oas-button</span> <span class="a">type</span>=<span class="s">"primary"</span><span class="t">&gt;</span>${b}<span class="t">&lt;/oas-button&gt;</span>\n<span class="l">5</span>      <span class="t">&lt;oas-input</span> <span class="a">placeholder</span>=<span class="s">"${p}"</span><span class="t">&gt;&lt;/oas-input&gt;</span>\n<span class="l">6</span>    <span class="t">&lt;/&gt;</span>\n<span class="l">7</span>  );\n<span class="l">8</span>}`,
    svelte: `<span class="l">1</span><span class="c">&lt;!-- ${isEn.value ? 'same tags in Svelte' : 'Svelte 里一样直接写'} --&gt;</span>\n<span class="l">2</span><span class="t">&lt;oas-button</span> <span class="a">type</span>=<span class="s">"primary"</span><span class="t">&gt;</span>${b}<span class="t">&lt;/oas-button&gt;</span>\n<span class="l">3</span><span class="t">&lt;oas-input</span> <span class="a">placeholder</span>=<span class="s">"${p}"</span><span class="t">&gt;&lt;/oas-input&gt;</span>`,
    angular: `<span class="l">1</span><span class="c">&lt;!-- ${isEn.value ? 'Angular template: CUSTOM_ELEMENTS_SCHEMA set' : 'Angular 模板：CUSTOM_ELEMENTS_SCHEMA 已配'} --&gt;</span>\n<span class="l">2</span><span class="t">&lt;oas-button</span> <span class="a">type</span>=<span class="s">"primary"</span><span class="t">&gt;</span>${b}<span class="t">&lt;/oas-button&gt;</span>\n<span class="l">3</span><span class="t">&lt;oas-input</span> <span class="a">placeholder</span>=<span class="s">"${p}"</span><span class="t">&gt;&lt;/oas-input&gt;</span>`,
    astro: `<span class="l">1</span><span class="c">&lt;!-- ${isEn.value ? 'Astro: works out of the box' : 'Astro：无需配置，模板里直接用'} --&gt;</span>\n<span class="l">2</span><span class="t">&lt;oas-button</span> <span class="a">type</span>=<span class="s">"primary"</span><span class="t">&gt;</span>${b}<span class="t">&lt;/oas-button&gt;</span>\n<span class="l">3</span><span class="t">&lt;oas-input</span> <span class="a">placeholder</span>=<span class="s">"${p}"</span><span class="t">&gt;&lt;/oas-input&gt;</span>`,
  }
})

const snippetHtml = computed(() => snippets.value[active.value])

const bridges = computed(() =>
  isEn.value
    ? [
        { ic: '</>', name: 'HTML', hint: 'No build step', link: '/guide/getting-started' },
        { ic: 'V', name: 'Vue', hint: '@oas-ui/nuxt', link: '/guide/ssr' },
        { ic: '⚛', name: 'React', hint: '@oas-ui/next', link: '/guide/ssr' },
        { ic: 'S', name: 'Svelte', hint: 'Plain custom elements', link: '/guide/getting-started' },
        { ic: 'A', name: 'Angular', hint: 'Plain custom elements', link: '/guide/getting-started' },
        { ic: '✦', name: 'Astro', hint: 'Plain custom elements', link: '/guide/getting-started' },
      ]
    : [
        { ic: '</>', name: '原生 HTML', hint: '零构建步骤', link: '/guide/getting-started' },
        { ic: 'V', name: 'Vue', hint: '@oas-ui/nuxt', link: '/guide/ssr' },
        { ic: '⚛', name: 'React', hint: '@oas-ui/next', link: '/guide/ssr' },
        { ic: 'S', name: 'Svelte', hint: '原生自定义元素', link: '/guide/getting-started' },
        { ic: 'A', name: 'Angular', hint: '原生自定义元素', link: '/guide/getting-started' },
        { ic: '✦', name: 'Astro', hint: '原生自定义元素', link: '/guide/getting-started' },
      ],
)
</script>

<style scoped>
.home-code {
  position: relative;
  padding: 96px 0;
  background: var(--home-bg);
}
.home-code::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(40% 40% at 85% 0%, var(--home-glow-soft), transparent 65%);
}
.hcode-wrap {
  position: relative;
  max-width: 1180px;
  margin: 0 auto;
  padding: 0 32px;
}
.hcode-head {
  position: relative;
  text-align: center;
  margin-bottom: 52px;
}
.hcode-kicker {
  font-family: var(--oas-font-family-mono, ui-monospace, Consolas, monospace);
  font-size: 12px;
  letter-spacing: 4px;
  color: var(--oas-color-primary);
  text-transform: uppercase;
  display: inline-flex;
  align-items: center;
  gap: 12px;
}
.hcode-kicker::before,
.hcode-kicker::after {
  content: '';
  width: 30px;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--oas-color-primary));
}
.hcode-kicker::after {
  background: linear-gradient(90deg, var(--oas-color-primary), transparent);
}
.hcode-title {
  margin-top: 14px;
  font-size: clamp(28px, 4vw, 36px);
  font-weight: 800;
  letter-spacing: -0.8px;
  line-height: 1.2;
  background: var(--home-grad-text);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.hcode-intro {
  margin: 14px auto 0;
  max-width: 640px;
  font-size: 15px;
  color: var(--oas-color-text-secondary);
}
.hcode-grid {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1.15fr;
  gap: 56px;
  align-items: center;
}
.hcode-lead {
  font-size: 26px;
  font-weight: 800;
  letter-spacing: -0.5px;
  line-height: 1.45;
  color: var(--oas-color-text-primary);
}
.hcode-lead em {
  font-style: normal;
  background: var(--home-grad-strong);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.hcode-sub {
  margin-top: 18px;
  color: var(--oas-color-text-secondary);
  font-size: 15px;
  line-height: 1.85;
}
.hcode-bridges {
  margin-top: 32px;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
.hcode-bridge {
  position: relative;
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 16px;
  border-radius: var(--oas-radius-lg);
  background: var(--home-card-bg);
  border: 1px solid var(--home-border);
  transition: transform 0.18s var(--oas-ease-out), border-color 0.18s var(--oas-ease-out),
    box-shadow 0.18s var(--oas-ease-out);
  text-decoration: none;
  overflow: hidden;
}
.hcode-bridge::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(70% 80% at 20% 0%, var(--home-glow), transparent 60%);
  opacity: 0;
  transition: opacity 0.18s var(--oas-ease-out);
  pointer-events: none;
}
.hcode-bridge:hover {
  border-color: color-mix(in srgb, var(--oas-color-primary) 45%, transparent);
  transform: translateY(-3px);
  box-shadow: 0 12px 28px -16px var(--home-glow);
}
.hcode-bridge:hover::after {
  opacity: 1;
}
.hcode-bridge-ic {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 9px;
  background: color-mix(in srgb, var(--oas-color-primary) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--oas-color-primary) 30%, transparent);
  color: var(--oas-color-primary);
  font-size: 13px;
  font-family: var(--oas-font-family-mono, ui-monospace, Consolas, monospace);
  font-weight: 700;
  flex-shrink: 0;
}
.hcode-bridge-nm {
  position: relative;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--oas-color-text-primary);
}
.hcode-bridge-ht {
  position: relative;
  font-size: 11px;
  color: var(--oas-color-text-secondary);
  font-family: var(--oas-font-family-mono, ui-monospace, Consolas, monospace);
  margin-top: 2px;
}
.hcode-win {
  border-radius: var(--oas-radius-lg);
  overflow: hidden;
  border: 1px solid var(--home-code-border);
  background: var(--home-code-bg);
  box-shadow: 0 34px 80px -28px rgba(0, 0, 0, 0.65);
}
.hcode-tabs {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 10px 14px 0 14px;
  background: #161b22;
}
.hcode-tab {
  font-family: var(--oas-font-family-mono, ui-monospace, Consolas, monospace);
  font-size: 11.5px;
  color: #8b949e;
  padding: 6px 14px;
  cursor: pointer;
  user-select: none;
  border: 1px solid transparent;
  border-bottom: none;
  border-radius: 7px 7px 0 0;
  transition: color 0.15s var(--oas-ease-out);
}
.hcode-tab:hover {
  color: #e6edf3;
}
.hcode-tab.on {
  color: #79c0ff;
  background: var(--home-code-bg);
  border-color: var(--home-code-border);
}
.hcode-file {
  margin-left: auto;
  font-family: var(--oas-font-family-mono, ui-monospace, Consolas, monospace);
  font-size: 11px;
  color: #8b949e;
  padding: 6px 8px;
}
.hcode-pre {
  margin: 0;
  padding: 22px 24px;
  min-height: 168px;
  font-family: var(--oas-font-family-mono, ui-monospace, Consolas, monospace);
  font-size: 13px;
  line-height: 1.9;
  color: #c9d1d9;
  overflow-x: auto;
  white-space: pre;
}
.hcode-pre :deep(.l) {
  color: #3d444d;
  display: inline-block;
  width: 22px;
  user-select: none;
}
.hcode-pre :deep(.k) {
  color: #ff7b72;
}
.hcode-pre :deep(.t) {
  color: #79c0ff;
}
.hcode-pre :deep(.s) {
  color: #a5d6a7;
}
.hcode-pre :deep(.c) {
  color: #8b949e;
  font-style: italic;
}
.hcode-pre :deep(.a) {
  color: #ffa657;
}
.hcode-out {
  display: flex;
  align-items: center;
  gap: 14px;
  border-top: 1px dashed var(--home-code-border);
  padding: 18px 22px;
}
.hcode-out-lbl {
  font-family: var(--oas-font-family-mono, ui-monospace, Consolas, monospace);
  font-size: 11px;
  color: #8b949e;
  letter-spacing: 0.1em;
}
.hcode-render {
  height: 32px;
  padding: 0 16px;
  border-radius: 6px;
  background: var(--oas-color-primary);
  color: var(--oas-color-text-on-primary);
  font-size: 13px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
}
.hcode-render.ghost {
  background: transparent;
  border: 1px solid var(--home-code-border);
  color: #8b949e;
}
.hcode-ok {
  margin-left: auto;
  font-family: var(--oas-font-family-mono, ui-monospace, Consolas, monospace);
  font-size: 11.5px;
  color: var(--home-ok);
}

@media (max-width: 900px) {
  .hcode-grid {
    grid-template-columns: 1fr;
    gap: 40px;
  }
}
</style>
