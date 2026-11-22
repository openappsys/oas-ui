<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useData, useRoute } from 'vitepress'

// 语言提示条（SEO 友好替代自动跳转）：浏览器语言与页面语言明显不匹配时，提示「本页有另一语言版」。
// 触发规则——存在明显更合适的另一语言才提示：中文页浏览器语言不含 zh 时提示英文版（英文是本站
// 唯一备选，也是国际默认预期）；英文页浏览器语言含 zh 时提示中文版。第三语言用户落地英文页后
// 不再被烦。不提示的人群：已显式保存过偏好（oas-lang）或已关闭过（oas-lang-hint-dismissed）。
// 纯客户端判定（visible 仅 onMounted 后置真），SSR 与水合输出一致，无 hydration 不匹配。
const { lang, site, page } = useData()
const route = useRoute()

const visible = ref(false)
const isEn = computed(() => lang.value.startsWith('en'))

/** 与 LocaleSwitch 同规则：当前页对应语言版本深链（含 base 归一与 404 回落，两处保持孪生） */
function counterpart(toEn: boolean): string {
  if (page.value.isNotFound) return toEn ? '/en/' : '/'
  let p = route.path
  if (p !== '/' && p.endsWith('/')) p = p.slice(0, -1)
  const onEn = p === '/en' || p.startsWith('/en/')
  const noLocale = onEn ? (p === '/en' ? '/' : p.slice(3)) : p
  const target = toEn ? (noLocale === '/' ? '/en/' : `/en${noLocale}`) : noLocale
  const base = site.value.base || '/'
  return base === '/' ? target : base.replace(/\/$/, '') + target
}

const hintHref = computed(() => counterpart(!isEn.value))

// 判定只在客户端做；SPA 跨 locale 导航时 lang 异步切换（语言 chunk 懒加载，实测约 500ms），
// 必须跟随 lang 重算——否则旧决定残留（如点提示进英文页后仍挂着中文提示条）。
// 注意守卫分支也要显式置 false：visible 可能带着上一页的决定。
// 同步 oas-lang-hint-predict 类：head 内联脚本在绘制前按同一条规则预置该类让布局让位
// （消除横幅挂载时的 36px CLS）；此处对账——预测命中但判定不显示（局部存储竞态）时撤掉让位。
function evaluate(): void {
  let show = false
  try {
    if (!localStorage.getItem('oas-lang') && !localStorage.getItem('oas-lang-hint-dismissed')) {
      const langs =
        navigator.languages && navigator.languages.length
          ? navigator.languages
          : [navigator.language]
      const hasZh = langs.some((l) => !!l && l.toLowerCase().startsWith('zh'))
      show = isEn.value ? hasZh : !hasZh
    }
  } catch {
    // localStorage 不可用（隐私模式等）：不提示，不影响浏览
  }
  visible.value = show
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('oas-lang-hint-predict', show)
  }
}

function onPrefChange(): void {
  evaluate()
}

onMounted(() => {
  evaluate()
  window.addEventListener('oas-lang-pref', onPrefChange)
})
onBeforeUnmount(() => window.removeEventListener('oas-lang-pref', onPrefChange))
watch(lang, evaluate)

function dismiss(): void {
  visible.value = false
  if (typeof document !== 'undefined') {
    document.documentElement.classList.remove('oas-lang-hint-predict')
  }
  try {
    localStorage.setItem('oas-lang-hint-dismissed', '1')
  } catch {
    // 同上静默
  }
}

// 点击提示链接 = 显式选择目标语言，与 LocaleSwitch 同语义写偏好
function onFollow(): void {
  try {
    localStorage.setItem('oas-lang', isEn.value ? 'zh' : 'en')
  } catch {
    // 同上静默
  }
  window.dispatchEvent(new CustomEvent('oas-lang-pref'))
}
</script>

<template>
  <div v-if="visible" class="oas-lang-hint" :lang="isEn ? 'zh-CN' : 'en'">
    <a class="oas-lang-hint-link" :href="hintHref" :hreflang="isEn ? 'zh-CN' : 'en'" rel="alternate" @click="onFollow">
      {{ isEn ? '本页提供简体中文版本' : 'This page is available in English' }}
      <span class="oas-lang-hint-arrow" aria-hidden="true">→</span>
    </a>
    <button type="button" class="oas-lang-hint-close" :aria-label="isEn ? '关闭提示' : 'Dismiss'" @click="dismiss">
      <span aria-hidden="true">×</span>
    </button>
  </div>
</template>

<style>
/* 非 scoped：--vp-layout-top-height 需经 html 挂根上，框架消费见 VPNav/VPContent/VPSidebar/VPNavScreen */
.oas-lang-hint {
  position: fixed;
  top: 0;
  right: 0;
  left: 0;
  z-index: var(--vp-z-index-layout-top);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  height: 36px;
  padding: 0 12px;
  font-size: 13px;
  background: var(--vp-c-brand-1);
  color: #fff;
  white-space: nowrap;
}

/* head 内联脚本绘制前的预测让位（与 :has(.oas-lang-hint) 同源，消除横幅挂载的 36px CLS）。
   LangHint 挂载后由 :has() 接管；evaluate() 负责预测未命中时的撤除 */
html:has(.oas-lang-hint),
html.oas-lang-hint-predict {
  --vp-layout-top-height: 36px;
}

/* 暗色下 --vp-c-brand-1 是浅色 tint，白字压不住——banner 用固定品牌蓝保证两主题对比度一致 */
html.dark .oas-lang-hint {
  background: #2f5bd7;
}

.oas-lang-hint-link {
  display: inline-flex;
  flex: 0 1 auto;
  align-items: center;
  gap: 6px;
  overflow: hidden;
  min-width: 0;
  color: #fff;
  font-weight: 600;
  text-decoration: underline;
  text-overflow: ellipsis;
  text-underline-offset: 3px;
  white-space: nowrap;
}

.oas-lang-hint-link:hover {
  color: #fff;
  opacity: 0.85;
}

.oas-lang-hint-link:focus-visible {
  border-radius: 2px;
  outline: 2px solid #fff;
  outline-offset: 2px;
}

.oas-lang-hint-arrow {
  flex: none;
}

.oas-lang-hint-close {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: #fff;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
}

.oas-lang-hint-close:hover {
  background: rgba(255, 255, 255, 0.2);
}

.oas-lang-hint-close:focus-visible {
  outline: 2px solid #fff;
  outline-offset: 2px;
}
</style>
