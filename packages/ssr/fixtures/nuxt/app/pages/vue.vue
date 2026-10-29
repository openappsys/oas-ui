<script setup lang="ts">
const examples = [
  { label: 'alpha', type: 'success' as const },
  { label: 'beta', type: 'warning' as const },
]
</script>

<template>
  <main class="vue-page" data-page="vue">
    <p class="eyebrow">OAS-UI · Nuxt 4 · Vue template</p>
    <h1>Vue template custom elements</h1>
    <p class="lede">
      These <code>oas-*</code> tags are written directly in a Vue SFC. The <code>@oas-ui/nuxt</code> module registers
      the <code>oas-*</code> prefix as <code>compilerOptions.isCustomElement</code>, so Vue compiles them as custom
      elements instead of unresolved components.
    </p>
    <div class="stack">
      <oas-empty data-case="vue-empty" />
      <oas-tag v-for="item in examples" :key="item.label" :type="item.type">{{ item.label }}</oas-tag>
    </div>
    <p><a href="/?locale=zh-CN">← Back to the DSD page</a></p>
  </main>
</template>

<style scoped>
.vue-page {
  max-width: 880px;
  margin: 0 auto;
  padding: 48px 24px 72px;
}
.eyebrow {
  margin: 0 0 8px;
  font-size: 13px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--oas-color-text-secondary);
}
h1 {
  margin: 0 0 8px;
  font-size: clamp(28px, 4vw, 40px);
}
.lede {
  max-width: 62ch;
  color: var(--oas-color-text-secondary);
}
code {
  font-family: var(--oas-font-family-mono, ui-monospace, monospace);
}
.stack {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  margin: 24px 0;
  padding: 20px;
  border: 1px solid var(--oas-color-border);
  border-radius: 14px;
  background: var(--oas-color-bg);
}
</style>
