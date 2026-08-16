<template>
  <div class="perf-section">
    <header class="perf-section__head">
      <h2 class="perf-section__title">{{ isEn ? 'Numbers, not slogans' : '性能速览' }}</h2>
      <p class="perf-section__intro">
        {{
          isEn
            ? 'Public baseline, reproducible — full methodology and component-level numbers in docs.'
            : '公开基准，可复现——完整方法论与各组件链数据见文档。'
        }}
      </p>
    </header>
    <oas-flex justify="center" gap="32px" wrap class="perf-section__row">
      <div class="perf-section__item">
        <div class="perf-section__label">{{ isEn ? 'CDN bundle' : 'CDN gzip' }}</div>
        <oas-statistic :value="String(stats.perf.cdnGzipKB)" suffix=" KB" precision="1"></oas-statistic>
      </div>
      <div class="perf-section__item">
        <div class="perf-section__label">{{ isEn ? 'Button chain' : '按钮链' }}</div>
        <oas-statistic :value="String(stats.perf.buttonChainKB)" suffix=" KB" precision="1"></oas-statistic>
      </div>
      <div class="perf-section__item">
        <div class="perf-section__label">{{ isEn ? 'Full entry' : '全量入口' }}</div>
        <oas-statistic :value="String(stats.perf.fullEntryKB)" suffix=" KB" precision="1"></oas-statistic>
      </div>
    </oas-flex>
    <p class="perf-section__note">
      <a href="/guide/ssr" rel="noopener">{{ isEn ? 'Full baseline →' : '完整基准 →' }}</a>
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'
import stats from '../../generated/stats.json'

const { lang } = useData()
const isEn = computed(() => lang.value.startsWith('en'))
</script>

<style scoped>
.perf-section {
  padding: var(--oas-space-4) 0 var(--oas-space-6);
  text-align: center;
}
.perf-section__head {
  margin-bottom: var(--oas-space-5);
}
.perf-section__title {
  font-size: var(--oas-font-size-xl);
  font-weight: 600;
  color: var(--oas-color-text-primary);
  margin: 0 0 var(--oas-space-3);
}
.perf-section__intro {
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
  margin: 0 auto;
  max-width: 640px;
}
.perf-section__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--oas-space-2);
}
.perf-section__item oas-statistic {
  font-size: 28px;
}
.perf-section__label {
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-md);
}
.perf-section__note {
  margin-top: var(--oas-space-4);
  font-size: var(--oas-font-size-sm);
}
.perf-section__note a {
  color: var(--oas-color-primary);
}
</style>