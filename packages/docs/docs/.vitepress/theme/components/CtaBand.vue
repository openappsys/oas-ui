<template>
  <div class="cta-band">
    <oas-card class="cta-band__card">
      <h2 class="cta-band__title">{{ isEn ? 'Three lines. Then ship.' : '三行代码，开始用' }}</h2>
      <pre class="cta-band__code"><code>{{ codeSnippet }}</code></pre>
      <oas-flex justify="center" gap="12px" wrap>
        <a class="cta-band__btn btn--primary" href="/guide/getting-started">
          {{ isEn ? 'Get started' : '快速开始' }}
        </a>
        <a class="cta-band__btn" href="https://github.com/openappsys/oas-ui" target="_blank" rel="noopener">
          GitHub
        </a>
      </oas-flex>
    </oas-card>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'

const { lang } = useData()
const isEn = computed(() => lang.value.startsWith('en'))

const codeSnippet = computed(
  () => `pnpm add @oas-ui/ui @oas-ui/theme
import '@oas-ui/theme'
import '@oas-ui/ui'`,
)
</script>

<style scoped>
.cta-band {
  padding: var(--oas-space-6) 0;
  text-align: center;
}
.cta-band__card {
  padding: var(--oas-space-6);
}
.cta-band__title {
  font-size: var(--oas-font-size-xl);
  font-weight: 600;
  color: var(--oas-color-text-primary);
  margin: 0 0 var(--oas-space-4);
}
.cta-band__code {
  display: inline-block;
  margin: 0 auto var(--oas-space-4);
  padding: var(--oas-space-3) var(--oas-space-4);
  background: var(--oas-color-bg-hover);
  border-radius: var(--oas-radius-md);
  font-family: 'SFMono-Regular', Consolas, monospace;
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-primary);
  text-align: left;
  white-space: pre;
}
.cta-band__btn {
  display: inline-block;
  padding: var(--oas-space-2) var(--oas-space-4);
  border-radius: var(--oas-radius-md);
  text-decoration: none;
  font-weight: 500;
  border: 1px solid var(--oas-color-border);
  color: var(--oas-color-text-primary);
  background: var(--oas-color-bg);
}
.cta-band__btn.btn--primary {
  background: var(--oas-color-primary);
  color: var(--oas-color-text-on-primary, #fff);
  border-color: var(--oas-color-primary);
}
.cta-band__btn:hover {
  opacity: 0.85;
}
</style>