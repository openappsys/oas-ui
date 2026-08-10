<template>
  <button
    class="lang-switch"
    type="button"
    :title="current === 'zh-CN' ? 'Switch to English' : '切换为中文'"
    :aria-label="current === 'zh-CN' ? 'Switch to English' : '切换为中文'"
    @click="toggle"
  >
    {{ current === 'zh-CN' ? 'EN' : '中文' }}
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useData, useRouter } from 'vitepress'

const { lang, page } = useData()
const router = useRouter()

// 以当前路由所属 locale 为准（与 @oas-ui/i18n 的 registry 解耦，避免按钮状态与实际页面不一致）
const current = computed<'zh-CN' | 'en'>(() => (lang.value === 'en' ? 'en' : 'zh-CN'))

/** 切换组件内置文案（@oas-ui/i18n），与路由切换并行 */
async function applyI18n(next: 'zh-CN' | 'en'): Promise<void> {
  const { setLocale, registerLocale } = await import('@oas-ui/i18n')
  const pack =
    next === 'en'
      ? (await import('@oas-ui/i18n/en')).default
      : (await import('@oas-ui/i18n/zh-CN')).default
  registerLocale(pack)
  setLocale(next)
}

/**
 * 目标路由：
 * - 首页与 guide/ 已有英文版，切到对应英文路由（/en/...）；
 * - 组件页暂无英文版，从中文切英文时回退到英文首页 /en/；
 * - 从英文切回中文时，组件页指向已有的中文页面。
 */
function target(next: 'en' | 'zh-CN'): string {
  const rel = page.value.relativePath // 如 'index.md' / 'guide/xxx.md' / 'en/guide/xxx.md'
  if (next === 'en') {
    if (rel.startsWith('en/')) return '' // 已在英文路由
    if (rel === 'index.md' || rel.startsWith('guide/')) {
      const base = rel === 'index.md' ? '' : rel.replace(/\.md$/, '')
      return `/en/${base}`
    }
    return '/en/'
  }
  if (!rel.startsWith('en/')) return '' // 已在中文路由
  const base = rel.slice('en/'.length).replace(/\.md$/, '')
  return `/${base}`
}

function toggle(): void {
  const next = current.value === 'zh-CN' ? 'en' : 'zh-CN'
  void applyI18n(next)
  const href = target(next)
  if (href) router.go(href)
}
</script>

<style scoped>
.lang-switch {
  border: 1px solid var(--oas-color-border);
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  border-radius: var(--oas-radius-md);
  padding: 2px 10px;
  font-size: var(--oas-font-size-sm);
  cursor: pointer;
  font-family: inherit;
  margin-left: var(--oas-space-2);
  line-height: 1.6;
}
.lang-switch:hover {
  color: var(--oas-color-primary);
  border-color: var(--oas-color-primary);
}
</style>
