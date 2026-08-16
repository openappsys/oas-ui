<template>
  <div class="hero-playground">
    <span class="hero-playground__badge">{{ isEn ? 'Live preview' : '可交互预览' }}</span>
    <oas-card>
      <oas-flex vertical gap="14px">
        <oas-flex gap="8px" wrap justify="center">
          <oas-button type="primary" @click="hi">{{ t.hi }}</oas-button>
          <oas-button @click="bye">{{ t.bye }}</oas-button>
          <oas-segmented :value="seg" :options="segOptions" @oas-change="onSeg"></oas-segmented>
        </oas-flex>
        <oas-flex gap="18px" wrap justify="center">
          <oas-switch></oas-switch>
          <oas-slider class="hero-playground__slider"></oas-slider>
          <oas-rate value="4"></oas-rate>
        </oas-flex>
        <oas-flex gap="8px" wrap justify="center">
          <oas-tag type="primary">Web Components</oas-tag>
          <oas-tag type="success">TypeScript</oas-tag>
          <oas-tag type="warning">SSR + DSD</oas-tag>
          <oas-badge value="v2">
            <oas-tag type="info">OAS-UI</oas-tag>
          </oas-badge>
        </oas-flex>
      </oas-flex>
    </oas-card>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useData } from 'vitepress'

const { lang } = useData()
const isEn = computed(() => lang.value.startsWith('en'))
const t = computed(() => (isEn.value ? { hi: 'Say hi', bye: 'Message' } : { hi: '打个招呼', bye: '发消息' }))

const seg = ref('day')
const segOptions = computed(() =>
  JSON.stringify([
    { label: isEn.value ? 'Day' : '日', value: 'day' },
    { label: isEn.value ? 'Week' : '周', value: 'week' },
    { label: isEn.value ? 'Month' : '月', value: 'month' },
  ]),
)
function onSeg(e: Event) {
  seg.value = (e as CustomEvent<{ value: string }>).detail.value
}

// 复用 theme/index.ts 挂载的 window.message（避免 SSG 构建期静态引入 ui 包）
type MessageApi = { info(text: string): void; success(text: string): void }
function msg(): MessageApi | undefined {
  return (window as unknown as { message?: MessageApi }).message
}
function hi() {
  msg()?.info('来自 OAS-UI 的问候')
}
function bye() {
  msg()?.success(isEn.value ? 'It works!' : '组件已在工作！')
}
</script>

<style scoped>
.hero-playground {
  width: 100%;
  position: relative;
}
.hero-playground__badge {
  position: absolute;
  top: 10px;
  right: 12px;
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-secondary);
  letter-spacing: 0.04em;
  pointer-events: none;
}
.hero-playground__slider {
  width: 120px;
}
</style>
