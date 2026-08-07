# LoadingBar 顶部加载条

页面顶部的全局加载进度条。

## 基础用法

<div class="demo">
  <oas-space>
    <oas-button onclick="loadingBar.start(); setTimeout(() => loadingBar.finish(), 2000)">开始加载</oas-button>
    <oas-button onclick="loadingBar.start(); setTimeout(() => loadingBar.error(), 2000)">加载失败</oas-button>
  </oas-space>
</div>

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  const { loadingBar } = await import('@oas-ui/ui')
  window.loadingBar = loadingBar
})
</script>

## API

| 方法 | 说明 |
|---|---|
| `loadingBar.start()` | 开始（自动前进至 90%） |
| `loadingBar.finish()` | 完成并移除 |
| `loadingBar.error()` | 失败（红色）并移除 |
