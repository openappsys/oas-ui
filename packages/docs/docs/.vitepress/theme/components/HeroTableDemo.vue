<template>
  <div class="hero-table-demo">
    <oas-card>
      <oas-flex vertical gap="12px">
        <oas-flex gap="6px" wrap>
          <oas-button size="small" :type="sortOn ? 'primary' : 'default'" @click="toggleSort">
            {{ isEn ? 'Sort' : '排序' }}
          </oas-button>
          <oas-button size="small" :type="paged ? 'primary' : 'default'" @click="togglePaged">
            {{ isEn ? 'Pagination' : '分页' }}
          </oas-button>
        </oas-flex>
        <oas-table
          row-key="name"
          :columns="columnsJson"
          :data="pagedDataJson"
          :sort-key="sortOn ? 'age' : null"
          sort-order="desc"
          height="240"
        ></oas-table>
        <oas-pagination
          v-if="paged"
          :total="rows.length"
          :page-size="PAGE_SIZE"
          :current="currentPage"
          @oas-change="onPageChange"
        ></oas-pagination>
      </oas-flex>
    </oas-card>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useData } from 'vitepress'

const { lang } = useData()
const isEn = computed(() => lang.value.startsWith('en'))

const sortOn = ref(false)
const paged = ref(false)
function toggleSort() {
  sortOn.value = !sortOn.value
}
function togglePaged() {
  paged.value = !paged.value
  currentPage.value = 1
}

const rows = [
  { name: '张三', age: 30, city: '北京', position: '前端工程师' },
  { name: '李四', age: 25, city: '上海', position: '产品经理' },
  { name: '王五', age: 35, city: '深圳', position: '后端工程师' },
  { name: '赵六', age: 28, city: '杭州', position: 'UI 设计师' },
  { name: '孙七', age: 32, city: '广州', position: '测试工程师' },
  { name: '钱八', age: 40, city: '成都', position: '运维总监' },
  { name: '孙九', age: 27, city: '武汉', position: '产品助理' },
  { name: '周十', age: 33, city: '南京', position: '后端组长' },
]

const PAGE_SIZE = 3
const currentPage = ref(1)
function onPageChange(e: Event) {
  const detail = (e as CustomEvent<{ page?: number }>).detail
  if (detail.page) currentPage.value = detail.page
}
const pagedDataJson = computed(() => {
  if (!paged.value) return JSON.stringify(rows)
  const start = (currentPage.value - 1) * PAGE_SIZE
  return JSON.stringify(rows.slice(start, start + PAGE_SIZE))
})

const columnsJson = computed(() =>
  JSON.stringify([
    { key: 'name', title: isEn.value ? 'Name' : '姓名', sortable: true },
    { key: 'age', title: isEn.value ? 'Age' : '年龄', sortable: true, align: 'center', width: '60px' },
    { key: 'city', title: isEn.value ? 'City' : '城市' },
    { key: 'position', title: isEn.value ? 'Role' : '职位' },
  ]),
)
</script>

<style scoped>
.hero-table-demo {
  width: 100%;
}
</style>