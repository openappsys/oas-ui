<template>
  <footer class="home-section home-footer">
    <div class="hf-wrap">
      <div class="hf-grid">
        <div class="hf-brand">
          <div class="hf-logo">
            <img class="hf-logo-img" :src="isDark ? '/favicon-dark.svg' : '/favicon.svg'" alt="OAS-UI" width="26" height="26" />
            OAS-UI
          </div>
          <p>
            {{
              isEn
                ? 'A framework-agnostic Web Components UI library. One set of components, running everywhere — for plain HTML and most frameworks.'
                : '框架无关的 Web Components UI 组件库。一套组件，到处运行——适配原生 HTML 和常见框架。'
            }}
          </p>
        </div>
        <div class="hf-col">
          <h4>{{ isEn ? 'Guide' : '指南' }}</h4>
          <a href="/guide/getting-started">{{ isEn ? 'Getting Started' : '快速开始' }}</a>
          <a href="/guide/theming">{{ isEn ? 'Theming' : '主题' }}</a>
          <a href="/guide/ssr">SSR</a>
          <a href="/guide/accessibility">{{ isEn ? 'Accessibility' : '无障碍' }}</a>
        </div>
        <div class="hf-col">
          <h4>{{ isEn ? 'Resources' : '资源' }}</h4>
          <a href="/components/">{{ isEn ? 'Components' : '组件总览' }}</a>
          <a href="/changelog">{{ isEn ? 'Changelog' : '更新日志' }}</a>
          <a href="https://github.com/openappsys/oas-ui" target="_blank" rel="noopener">GitHub</a>
        </div>
        <div class="hf-col">
          <h4>{{ isEn ? 'Ecosystem' : '生态' }}</h4>
          <a href="/guide/ssr">Nuxt</a>
          <a href="/guide/ssr">Next.js</a>
          <a href="/guide/getting-started">CDN</a>
        </div>
      </div>
      <div class="hf-bottom">
        <span>© 2026 OAS-UI · {{ isEn ? 'Framework-agnostic Web Components library' : '框架无关的 Web Components 组件库' }}</span>
        <span class="hf-license">MIT OR Apache-2.0</span>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'

const { lang, isDark } = useData()
const isEn = computed(() => lang.value.startsWith('en'))
</script>

<style scoped>
.home-footer {
  padding: 52px 0 32px;
  background: var(--home-bg);
}
.hf-wrap {
  max-width: 1180px;
  margin: 0 auto;
  padding: 0 32px;
}
.hf-grid {
  display: grid;
  grid-template-columns: 1.4fr 1fr 1fr 1fr;
  gap: 40px;
}
.hf-logo {
  display: flex;
  align-items: center;
  gap: 9px;
  font-weight: 700;
  letter-spacing: 1.5px;
  font-size: 15px;
  color: var(--oas-color-text-primary);
}
.hf-logo-img {
  width: 26px;
  height: 26px;
  border-radius: 7px;
  display: block;
}
.hf-brand p {
  margin-top: 14px;
  color: var(--oas-color-text-secondary);
  font-size: 13px;
  line-height: 1.8;
  max-width: 300px;
}
.hf-col h4 {
  font-size: 13px;
  color: var(--oas-color-text-primary);
  margin-bottom: 16px;
  letter-spacing: 0.5px;
}
.hf-col a {
  display: block;
  color: var(--oas-color-text-secondary);
  font-size: 13px;
  margin-bottom: 10px;
  transition: color 0.15s var(--oas-ease-out);
  text-decoration: none;
}
.hf-col a:hover {
  color: var(--oas-color-primary);
}
.hf-bottom {
  margin-top: 44px;
  padding-top: 22px;
  border-top: 1px solid var(--home-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12.5px;
  color: var(--oas-color-text-secondary);
  flex-wrap: wrap;
  gap: 10px;
}
.hf-license {
  font-family: var(--oas-font-family-mono, ui-monospace, Consolas, monospace);
}

@media (max-width: 900px) {
  .hf-grid {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
