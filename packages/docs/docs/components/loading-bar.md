# LoadingBar 顶部加载条

页面顶部的全局加载进度条，命令式 API 驱动。

## 基础用法

<DemoBlock title="开始与完成">
  <oas-space>
    <oas-button type="primary" onclick="loadingBar.start(); setTimeout(() => loadingBar.finish(), 2000)">开始加载</oas-button>
    <oas-button onclick="loadingBar.finish()">立即完成</oas-button>
  </oas-space>
</DemoBlock>

## 失败状态

<DemoBlock title="失败状态">
  <oas-space>
    <oas-button type="danger" onclick="loadingBar.start(); setTimeout(() => loadingBar.error(), 2000)">模拟加载失败</oas-button>
  </oas-space>
</DemoBlock>

## 清空

<DemoBlock title="清空">
  <oas-space>
    <oas-button onclick="loadingBar.start()">开始</oas-button>
    <oas-button onclick="destroyAllLoadingBar()">移除加载条</oas-button>
  </oas-space>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  const { loadingBar, destroyAllLoadingBar } = await import('@oas-ui/ui')
  window.loadingBar = loadingBar
  window.destroyAllLoadingBar = destroyAllLoadingBar
})
</script>

## API

### 方法

| 方法                     | 说明                         |
| ------------------------ | ---------------------------- |
| `loadingBar.start()`     | 开始加载，进度自动前进至 90% |
| `loadingBar.finish()`    | 完成并移除                   |
| `loadingBar.error()`     | 失败（红色）并移除           |
| `destroyAllLoadingBar()` | 移除当前加载条               |

加载条 `role="progressbar"`，进度通过 `aria-valuenow` 同步。
