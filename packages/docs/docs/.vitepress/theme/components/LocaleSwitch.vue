<script setup lang="ts">
import { computed } from 'vue'
import { useData, useRoute } from 'vitepress'

// 分段语言切换（中 / EN）：只两种语言，永久可见优于下拉隐藏。
// 用 <a> 而非按钮：真实链接可被爬虫发现，自带 hreflang 语义；点击同时写 oas-lang 偏好
// （视为显式切换，与移动端默认下拉的 Layout watcher 判据等价，见 Layout.vue），并广播
// oas-lang-pref 事件让 LangHint 立即复算（否则点当前语言段后提示条残留）。
const { lang, site, page } = useData()
const route = useRoute()

const isEn = computed(() => lang.value.startsWith('en'))

/** 当前页在另一语言下的对应路径（深链，不回首页）。站点 base 当前为 '/'，仍按通用前缀拼接。 */
function counterpart(toEn: boolean): string {
  // 404 页无对应语言版：回落语言根，避免指向 /en/<不存在的路径>
  if (page.value.isNotFound) return toEn ? '/en/' : '/'
  let p = route.path
  if (p !== '/' && p.endsWith('/')) p = p.slice(0, -1)
  const onEn = p === '/en' || p.startsWith('/en/')
  const noLocale = onEn ? (p === '/en' ? '/' : p.slice(3)) : p
  const target = toEn ? (noLocale === '/' ? '/en/' : `/en${noLocale}`) : noLocale
  const base = site.value.base || '/'
  return base === '/' ? target : base.replace(/\/$/, '') + target
}

const options = computed(() => [
  { short: '中', label: '简体中文', href: counterpart(false), active: !isEn.value, langAttr: 'zh-CN' },
  { short: 'EN', label: 'English', href: counterpart(true), active: isEn.value, langAttr: 'en' },
])

function onSelect(toEn: boolean): void {
  try {
    localStorage.setItem('oas-lang', toEn ? 'en' : 'zh')
  } catch {
    // localStorage 不可用（隐私模式等）：仅本次生效，不静默失败上报
  }
  // 通知 LangHint 复算（它只看 lang 变化，点当前语言段时 lang 不变）
  window.dispatchEvent(new CustomEvent('oas-lang-pref'))
}
</script>

<template>
  <div class="oas-locale-switch" role="group" :aria-label="isEn ? 'Language' : '语言切换'">
    <a
      v-for="opt in options"
      :key="opt.langAttr"
      class="oas-locale-switch-item"
      :class="{ active: opt.active }"
      :href="opt.href"
      :hreflang="opt.langAttr"
      :lang="opt.langAttr"
      rel="alternate"
      :title="opt.label"
      :aria-label="`${opt.short} ${opt.label}`"
      :aria-current="opt.active ? 'page' : undefined"
      @click="onSelect(opt.langAttr === 'en')"
      >{{ opt.short }}</a
    >
  </div>
</template>

<style scoped>
.oas-locale-switch {
  /* 移动端同样显示：横幅关闭后的移动端二访客只剩此处语言入口（紧凑 22px 高不挤导航栏）；
     DOM 序在汉堡前，无需 order（order 归位规则仅桌面断点，见 style.css） */
  flex: none;
  display: flex;
  align-items: center;
  padding: 2px;
  border: 1px solid var(--vp-c-border);
  border-radius: 999px;
  background: var(--vp-c-bg-soft);
}

.oas-locale-switch-item {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 22px;
  padding: 0 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
  color: var(--vp-c-text-2);
  text-decoration: none;
  transition:
    color 0.15s,
    background-color 0.15s;
}

.oas-locale-switch-item:hover {
  color: var(--vp-c-text-1);
}

.oas-locale-switch-item.active {
  background: var(--vp-c-brand-1);
  color: #fff;
}

/* 暗色下 --vp-c-brand-1 是浅色 tint（#a8b1ff），白字对比度仅 ~2:1——固定品牌蓝对齐 LangHint 处理 */
html.dark .oas-locale-switch-item.active {
  background: #2f5bd7;
}

.oas-locale-switch-item:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 2px;
}
</style>
