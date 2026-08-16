<template>
  <div class="code-showcase">
    <header class="code-showcase__head">
      <h2 class="code-showcase__title">{{ isEn ? 'Drop in like any HTML' : '像写 HTML 一样用它' }}</h2>
      <p class="code-showcase__intro">
        {{
          isEn
            ? 'Web Components are a browser standard. The same code runs everywhere — framework adapters are optional.'
            : 'Web Components 是浏览器原生标准。同一段代码到处跑——框架桥接是可选加分项。'
        }}
      </p>
    </header>

    <oas-card>
      <pre class="code-showcase__pre"><code>{{ codeSnippet }}</code></pre>
    </oas-card>

    <oas-grid columns="4" gap="12px" class="code-showcase__bridges">
      <a
        v-for="b in bridges"
        :key="b.icon + b.name"
        :href="b.link"
        class="code-showcase__bridge"
      >
        <oas-card hoverable>
          <div class="code-showcase__bridge-card">
            <oas-icon :name="b.icon" size="22" color="var(--oas-color-primary)"></oas-icon>
            <div>
              <div class="code-showcase__bridge-name">{{ b.name }}</div>
              <div class="code-showcase__bridge-hint">{{ b.hint }}</div>
            </div>
          </div>
        </oas-card>
      </a>
    </oas-grid>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'

const { lang } = useData()
const isEn = computed(() => lang.value.startsWith('en'))

const codeSnippet = computed(() =>
  isEn.value
    ? '<script src="https://unpkg.com/@oas-ui/ui"><\/script>\n<oas-button type="primary">Click me</oas-button>\n<oas-input placeholder="type here"></oas-input>'
    : '<script src="https://unpkg.com/@oas-ui/ui"><\/script>\n<oas-button type="primary">点我</oas-button>\n<oas-input placeholder="输入"></oas-input>',
)

const bridges = computed(() =>
  isEn.value
    ? [
        { icon: 'file', name: 'HTML', hint: 'No build step', link: '/guide/getting-started' },
        { icon: 'gear', name: 'Vue', hint: '@oas-ui/nuxt', link: '/guide/ssr' },
        { icon: 'gear', name: 'React', hint: '@oas-ui/next', link: '/guide/ssr' },
        { icon: 'plus', name: 'Svelte + Angular', hint: 'Plain custom elements', link: '/guide/getting-started' },
      ]
    : [
        { icon: 'file', name: 'HTML', hint: '零构建步骤', link: '/guide/getting-started' },
        { icon: 'gear', name: 'Vue', hint: '@oas-ui/nuxt', link: '/guide/ssr' },
        { icon: 'gear', name: 'React', hint: '@oas-ui/next', link: '/guide/ssr' },
        { icon: 'plus', name: 'Svelte / Angular', hint: '原生自定义元素', link: '/guide/getting-started' },
      ],
)
</script>

<style scoped>
.code-showcase {
  padding: var(--oas-space-4) 0 var(--oas-space-6);
}
.code-showcase__head {
  text-align: center;
  margin-bottom: var(--oas-space-6);
}
.code-showcase__title {
  font-size: var(--oas-font-size-xl);
  font-weight: 600;
  color: var(--oas-color-text-primary);
  margin: 0 0 var(--oas-space-3);
}
.code-showcase__intro {
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
  margin: 0 auto;
  max-width: 640px;
}
.code-showcase__pre {
  margin: 0;
  padding: var(--oas-space-4);
  background: var(--oas-color-bg-hover);
  border-radius: var(--oas-radius-md);
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: var(--oas-font-size-sm);
  line-height: 1.7;
  color: var(--oas-color-text-primary);
  overflow-x: auto;
  white-space: pre;
}
.code-showcase__bridges {
  margin-top: var(--oas-space-4);
}
.code-showcase__bridge {
  text-decoration: none;
  color: inherit;
}
.code-showcase__bridge-card {
  display: flex;
  gap: var(--oas-space-3);
  align-items: center;
}
.code-showcase__bridge-name {
  font-weight: 600;
  color: var(--oas-color-text-primary);
}
.code-showcase__bridge-hint {
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-secondary);
  font-family: 'SFMono-Regular', Consolas, monospace;
}
</style>