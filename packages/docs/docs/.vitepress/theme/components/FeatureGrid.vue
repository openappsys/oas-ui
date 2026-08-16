<template>
  <div class="feature-grid">
    <header class="feature-grid__head">
      <h2 class="feature-grid__title">{{ isEn ? 'Core features' : '核心特性' }}</h2>
      <p class="feature-grid__intro">
        {{ isEn
          ? 'Six non-negotiable engineering decisions — no half-measures, no hidden trade-offs.'
          : '六个不可妥协的工程决策——不打折扣，不藏隐性权衡。' }}
      </p>
    </header>
    <oas-grid :columns="cols" gap="16px">
      <a v-for="f in features" :key="f.title" class="feature-grid__link" :href="f.link">
        <oas-card hoverable>
          <div class="feature-grid__card">
            <oas-icon :name="f.icon" size="24" color="var(--oas-color-primary)"></oas-icon>
            <div>
              <div class="feature-grid__title">{{ f.title }}</div>
              <div class="feature-grid__desc">{{ f.desc }}</div>
            </div>
          </div>
        </oas-card>
      </a>
    </oas-grid>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { useData } from 'vitepress'

const { lang } = useData()
const isEn = computed(() => lang.value.startsWith('en'))

const features = computed(() => {
  const p = isEn.value ? '/en' : ''
  return isEn.value
    ? [
        { icon: 'check', title: 'Framework-agnostic', desc: 'Native Web Components — works with React, Vue, Svelte or plain HTML.', link: `${p}/guide/getting-started` },
        { icon: 'info', title: 'Full TypeScript', desc: 'Complete types for every property and event, .d.ts shipped with the package.', link: `${p}/components/` },
        { icon: 'star', title: 'Light & Dark', desc: 'Design tokens as CSS variables, theming without rebuilding.', link: `${p}/guide/theming` },
        { icon: 'gear', title: 'SSR + DSD', desc: 'Server-side rendering with declarative shadow DOM, hydration-safe.', link: `${p}/guide/ssr` },
        { icon: 'search', title: 'Tree-shakable', desc: 'Import one component at a time — per-component chain stays tiny.', link: `${p}/guide/getting-started` },
        { icon: 'heart', title: 'Zero dependencies', desc: 'No framework runtime — one CDN file and you are done.', link: `${p}/guide/getting-started` },
      ]
    : [
        { icon: 'check', title: '框架无关', desc: '原生 Web Components 标准，React / Vue / Svelte / 原生 HTML 直接使用。', link: `${p}/guide/getting-started` },
        { icon: 'info', title: 'TypeScript 全量', desc: '属性/事件完整类型，.d.ts 随包发布，编辑器提示开箱即用。', link: `${p}/components/` },
        { icon: 'star', title: '双主题', desc: 'light/dark 设计 token 全走 CSS 变量，自定义主题无需重编译。', link: `${p}/guide/theming` },
        { icon: 'gear', title: 'SSR + DSD', desc: '服务端渲染 + 声明式 Shadow DOM，真水合、无闪动。', link: `${p}/guide/ssr` },
        { icon: 'search', title: '按需引入', desc: 'tree-shakable，单组件引入链 gzip 仅 ~18KB。', link: `${p}/guide/getting-started` },
        { icon: 'heart', title: '零运行时依赖', desc: '无框架运行时依赖，CDN 单文件直接可用。', link: `${p}/guide/getting-started` },
      ]
})

// 响应式列数：<768px 单列（oas-grid 的 columns 在 shadow 内联样式，外部媒体查询覆盖不到，用 JS 切换属性值）
const cols = ref('3')
let mq: MediaQueryList | null = null
function apply(m: MediaQueryList | MediaQueryListEvent) {
  cols.value = m.matches ? '1' : '3'
}
onMounted(() => {
  mq = window.matchMedia('(max-width: 767px)')
  apply(mq)
  mq.addEventListener('change', apply)
})
onBeforeUnmount(() => {
  mq?.removeEventListener('change', apply)
})
</script>

<style scoped>
.feature-grid {
  padding-bottom: var(--oas-space-2);
}
.feature-grid__link {
  text-decoration: none;
  color: inherit;
}
.feature-grid__card {
  display: flex;
  gap: var(--oas-space-3);
  align-items: flex-start;
}
.feature-grid {
  padding: var(--oas-space-4) 0 var(--oas-space-6);
}
.feature-grid__head {
  text-align: center;
  margin-bottom: var(--oas-space-6);
}
.feature-grid__title {
  font-size: var(--oas-font-size-2xl, var(--oas-font-size-xl));
  font-weight: 600;
  color: var(--oas-color-text-primary);
  margin: 0 0 var(--oas-space-3);
}
.feature-grid__intro {
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
  margin: 0 auto;
  max-width: 640px;
}
.feature-grid__title {
  font-weight: 600;
  color: var(--oas-color-text-primary);
  margin-bottom: var(--oas-space-1);
}
.feature-grid__desc {
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
  line-height: 1.6;
}
</style>
