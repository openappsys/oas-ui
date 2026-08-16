<template>
  <div class="stats-bar">
    <oas-flex justify="center" gap="10px" wrap>
      <template v-for="(item, i) in numeric" :key="item.key">
        <oas-divider v-if="i > 0" direction="vertical"></oas-divider>
        <oas-statistic :value="item.value" :prefix="item.label" :suffix="item.suffix" :precision="item.precision"></oas-statistic>
      </template>
      <oas-divider direction="vertical"></oas-divider>
      <span class="stats-bar__version">v{{ stats.version }}</span>
    </oas-flex>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'
import stats from '../../generated/stats.json'

const { lang } = useData()
const isEn = computed(() => lang.value.startsWith('en'))
const numeric = computed(() => {
  // CDN 体积保留 1 位小数（oas-statistic 默认 precision=0 会截断 153.2 → 153）
  const items = (isEn.value
    ? [
        { key: 'components', label: 'Components ', value: String(stats.components) },
        { key: 'cdn', label: 'CDN gzip ', value: String(stats.cdnGzipKB), suffix: ' KB', precision: 1 },
        { key: 'locales', label: 'Locales ', value: String(stats.locales) },
        { key: 'tests', label: 'Tests ', value: String(stats.tests) },
      ]
    : [
        { key: 'components', label: '组件 ', value: String(stats.components) },
        { key: 'cdn', label: 'CDN gzip ', value: String(stats.cdnGzipKB), suffix: ' KB', precision: 1 },
        { key: 'locales', label: '语言包 ', value: String(stats.locales) },
        { key: 'tests', label: '测试用例 ', value: String(stats.tests) },
      ]) as Array<{
    key: string
    label: string
    value: string
    suffix?: string
    precision?: number
  }>
  return items
})
</script>

<style scoped>
.stats-bar {
  padding: var(--oas-space-4) 0 var(--oas-space-2);
}
.stats-bar__version {
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-md);
  line-height: 2;
  font-variant-numeric: tabular-nums;
}
</style>
