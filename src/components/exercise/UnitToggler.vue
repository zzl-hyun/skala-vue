<template>
  <div class="unit-toggle">
    <span>날씨단위: {{ configStore.unitSymbol }}</span>
    <UButton type="button" color="neutral" variant="outline" size="xs" @click="configStore.toggleUnit"> 단위변경 </UButton>
  </div>
</template>

<script setup>
import { useConfigStore } from '@/stores/configStore'

// 단위 상태를 Pinia에서 관리해 카드와 상세 화면이 함께 변경되도록 한다.
const configStore = useConfigStore()
// console.log(configStore.unit)
</script>

<style scoped>
.unit-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  white-space: nowrap;
}

.unit-toggle span {
  margin: 0;
  color: var(--color-text-muted);
}
</style>
