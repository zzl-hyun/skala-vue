<template>
  <!-- 대시보드에서 반복되는 카드 여백과 배경을 하나로 통일하는 슬롯 컨테이너 -->
  <div class="base-dashboard-card">
    <slot></slot>
  </div>
</template>

<script setup></script>

<style scoped>
.base-dashboard-card {
  padding: clamp(16px, 2.5vw, 22px);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: var(--color-background-soft);
}
</style>
