<template>
  <div class="scene-showcase">
    <header class="scene-showcase__head">
      <h2 class="scene-showcase__title">{{ isEn ? 'In real use' : '核心场景' }}</h2>
      <p class="scene-showcase__intro">
        {{
          isEn
            ? 'Three working slices of the library — not marketing slides, but actual components you can poke at.'
            : '三个真实可用的组件切片——不是营销幻灯片，是你能直接戳一戳的真实组件。'
        }}
      </p>
    </header>
    <oas-grid :columns="cols" gap="16px">
      <oas-card class="scene-card">
        <header class="scene-card__head">
          <oas-tag type="primary">Form</oas-tag>
          <h3 class="scene-card__title">{{ isEn ? 'Form' : '表单' }}</h3>
          <p class="scene-card__desc">
            {{ isEn ? 'Collect, validate, submit — controlled fields and rule-based errors.' : '收集、校验、提交——受控字段与规则驱动的错误反馈。' }}
          </p>
        </header>
        <oas-form class="scene-card__body">
          <oas-space direction="vertical" size="small" style="width: 100%">
            <oas-input name="username" placeholder="username"></oas-input>
            <oas-select name="role" placeholder="role" :options="roleOptionsJson"></oas-select>
            <oas-checkbox name="agree">{{ isEn ? 'Agree to terms' : '同意条款' }}</oas-checkbox>
            <oas-button type="primary" @click="submit">{{ isEn ? 'Submit' : '提交' }}</oas-button>
          </oas-space>
        </oas-form>
      </oas-card>

      <oas-card class="scene-card">
        <header class="scene-card__head">
          <oas-tag type="success">Display</oas-tag>
          <h3 class="scene-card__title">{{ isEn ? 'Data display' : '数据展示' }}</h3>
          <p class="scene-card__desc">
            {{ isEn ? 'Numbers with locale, progress bars, color tags — read-only at a glance.' : '数字带 locale 格式化、进度条、色板标签——一眼读懂。' }}
          </p>
        </header>
        <div class="scene-card__body">
          <oas-flex gap="16px" wrap>
            <oas-statistic value="1240" :prefix.attr="'今日 '"></oas-statistic>
            <oas-statistic value="88.5" precision="1" :suffix.attr="'%'"></oas-statistic>
          </oas-flex>
          <oas-progress :percent="66"></oas-progress>
          <oas-flex gap="6px" wrap>
            <oas-tag type="primary">primary</oas-tag>
            <oas-tag type="success">success</oas-tag>
            <oas-tag type="warning">warning</oas-tag>
            <oas-tag type="danger">danger</oas-tag>
            <oas-tag type="info">info</oas-tag>
          </oas-flex>
        </div>
      </oas-card>

      <oas-card class="scene-card">
        <header class="scene-card__head">
          <oas-tag type="warning">Feedback</oas-tag>
          <h3 class="scene-card__title">{{ isEn ? 'Feedback' : '反馈' }}</h3>
          <p class="scene-card__desc">
            {{ isEn ? 'Click the buttons — message toast or notification, your choice.' : '点按钮——轻提示还是系统通知，你说了算。' }}
          </p>
        </header>
        <div class="scene-card__body">
          <oas-space direction="vertical" size="small">
            <oas-button @click="sayInfo" block>{{ isEn ? 'Info toast' : '信息提示' }}</oas-button>
            <oas-button type="success" @click="saySuccess" block>{{ isEn ? 'Success toast' : '成功提示' }}</oas-button>
            <oas-button type="danger" @click="sayError" block>{{ isEn ? 'Error toast' : '错误提示' }}</oas-button>
          </oas-space>
        </div>
      </oas-card>
    </oas-grid>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useData } from 'vitepress'

const { lang } = useData()
const isEn = computed(() => lang.value.startsWith('en'))

const roleOptionsJson = computed(() =>
  JSON.stringify([
    { label: isEn.value ? 'Admin' : '管理员', value: 'admin' },
    { label: isEn.value ? 'Editor' : '编辑', value: 'editor' },
    { label: isEn.value ? 'Guest' : '访客', value: 'guest' },
  ]),
)

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

type Msg = { info(t: string): void; success(t: string): void; error(t: string): void }
function msg(): Msg | undefined {
  return (window as unknown as { message?: Msg }).message
}

function submit() {
  const form = document.querySelector('.scene-card__body') as HTMLElement | null
  const inner = form?.shadowRoot?.querySelector('form') as HTMLFormElement | null
  inner?.requestSubmit()
  msg()?.success(isEn.value ? 'Submitted (demo)' : '已提交（演示）')
}
function sayInfo() {
  msg()?.info(isEn.value ? 'Information notice' : '这是一条信息提示')
}
function saySuccess() {
  msg()?.success(isEn.value ? 'Operation succeeded' : '操作成功')
}
function sayError() {
  msg()?.error(isEn.value ? 'Something went wrong' : '出错了')
}
</script>

<style scoped>
.scene-showcase {
  padding: var(--oas-space-4) 0 var(--oas-space-6);
}
.scene-showcase__head {
  text-align: center;
  margin-bottom: var(--oas-space-6);
}
.scene-showcase__title {
  font-size: var(--oas-font-size-xl);
  font-weight: 600;
  color: var(--oas-color-text-primary);
  margin: 0 0 var(--oas-space-3);
}
.scene-showcase__intro {
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
  margin: 0 auto;
  max-width: 640px;
}
.scene-card {
  display: flex;
  flex-direction: column;
}
.scene-card__head {
  margin-bottom: var(--oas-space-3);
}
.scene-card__title {
  font-size: var(--oas-font-size-md);
  font-weight: 600;
  color: var(--oas-color-text-primary);
  margin: var(--oas-space-2) 0 var(--oas-space-1);
}
.scene-card__desc {
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
  margin: 0;
  line-height: 1.6;
}
.scene-card__body {
  margin-top: var(--oas-space-2);
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-3);
}
.scene-card oas-button {
  align-self: stretch;
}
</style>