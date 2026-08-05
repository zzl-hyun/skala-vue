<template>
  <div class="weather-card" :class="cityItem.temp >= hotTemperature ? 'card-hot' : 'card-cool'" @click="emit('select-card', cityItem)">
    <header class="card-heading">
      <div class="city-info">
        <h3>{{ cityItem.name_kr ?? cityItem.name }}</h3>
        <p>{{ citySubtitle }}</p>
      </div>
      <div class="card-actions">
        <UButton
          type="button"
          :color="isFavorite ? 'warning' : 'neutral'"
          variant="ghost"
          size="sm"
          square
          class="favorite-button"
          :aria-pressed="isFavorite"
          :aria-label="isFavorite ? `${cityItem.name} 즐겨찾기 해제` : `${cityItem.name} 즐겨찾기 추가`"
          @click.stop="emit('toggle-favorite', cityItem.id)"
        >
          {{ isFavorite ? '★' : '☆' }}
        </UButton>
        <UButton
          type="button"
          color="neutral"
          variant="ghost"
          size="sm"
          square
          class="remove-button"
          :aria-label="`${cityItem.name_kr ?? cityItem.name} 삭제`"
          @click.stop="emit('remove-city', cityItem)"
        >
          ×
        </UButton>
      </div>
    </header>

    <div class="weather-main">
      <div class="current-temperature">
        <strong :aria-label="configStore.formatTemp(cityItem.temp)">
          <span aria-hidden="true"> <CountUp :to="displayedTemperature" :duration="0.65" class-name="temperature-count" />{{ configStore.unitSymbol }} </span>
        </strong>
        <span class="current-temperature-label">현재 기온</span>
      </div>

      <div class="weather-visual">
        <img v-if="cityItem.detail?.weather?.[0]?.icon" class="weather-icon" :src="weatherIcon" :alt="cityItem.detail.weather[0].description" />
        <UBadge v-if="activeWarning" :color="warningColor" variant="solid" size="sm" class="warning-badge" :title="activeWarning.regionName">
          ⚠ {{ activeWarning.label }}<span v-if="additionalWarningCount"> 외 {{ additionalWarningCount }}건</span>
        </UBadge>
      </div>
    </div>

    <footer class="card-footer">
      <div class="card-metrics">
        <span
          >체감 <strong>{{ configStore.formatTemp(cityItem.main.feels_like) }}</strong></span
        >
        <span
          >습도 <strong>{{ cityItem.main.humidity }}%</strong></span
        >
      </div>

      <UButton type="button" color="neutral" variant="link" size="sm" class="detail-button" @click.stop="emit('click-detail', cityItem)"> 상세보기 → </UButton>
    </footer>
  </div>
</template>

<script setup>
import { useConfigStore } from '@/stores/configStore'
import { computed } from 'vue'
import CountUp from './CountUp.vue'

/**
 * 도시 한 곳의 현재 날씨를 표시하는 표현용 컴포넌트
 * 데이터는 props로 받고 카드 선택, 즐겨찾기, 상세 이동 요청은 부모로 emit한다.
 */
const props = defineProps({
  cityItem: {
    type: Object,
    required: true,
  },
  hotTemperature: {
    type: Number,
    required: true,
  },
  isFavorite: {
    type: Boolean,
    default: false,
  },
})
// console.log(props.cityItem)
const emit = defineEmits(['select-card', 'toggle-favorite', 'remove-city', 'click-detail'])
const configStore = useConfigStore()

// API 원본 온도는 바꾸지 않고 전역 단위 설정에 맞는 표시값만 계산한다.
const displayedTemperature = computed(() => configStore.convertTemp(props.cityItem.temp))

// OpenWeather가 내려 준 아이콘 코드로 공식 날씨 이미지를 구성한다.
const weatherIcon = computed(() => `https://openweathermap.org/img/wn/${props.cityItem.detail?.weather?.[0]?.icon}@2x.png`)

// 실제 기상특보가 있는 도시에만 특보 배지를 표시한다.
const activeWarning = computed(() => props.cityItem.warnings?.[0] ?? null)
const additionalWarningCount = computed(() => Math.max(0, (props.cityItem.warnings?.length ?? 0) - 1))
const warningColor = computed(() => (['예비', '주의', '주의보'].includes(activeWarning.value?.level) ? 'warning' : 'error'))

// 한글 도시명이 따로 있으면 영문명과 날씨 상태를 보조 설명으로 묶는다.
const citySubtitle = computed(() => {
  const subtitle = []

  if (props.cityItem.name_kr && props.cityItem.name_kr !== props.cityItem.name) {
    subtitle.push(props.cityItem.name)
  }

  if (props.cityItem.status) {
    subtitle.push(props.cityItem.status)
  }

  return subtitle.join(' · ')
})
</script>

<style scoped>
.weather-card {
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 12px;
  margin-bottom: 10px;
  min-height: 180px;
  padding: 16px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-background-soft);
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.card-hot {
  background: linear-gradient(to bottom right, var(--color-background-soft) 0%, var(--color-background-soft) 62%, var(--color-hot-surface) 100%);
}

.card-cool {
  background: linear-gradient(to bottom right, var(--color-background-soft) 0%, var(--color-background-soft) 62%, var(--color-cool-surface) 100%);
}

.weather-card:hover {
  border-color: var(--color-border-hover);
  box-shadow: 0 6px 18px var(--color-shadow);
}
.weather-card:last-child {
  margin-bottom: 0;
}

.card-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.card-heading h3 {
  margin: 0;
  color: var(--color-heading);
  font-size: 17px;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.card-heading p {
  margin: 3px 0 0;
  color: var(--color-text-soft);
  font-size: 11px;
}

.weather-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.current-temperature {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.current-temperature-label {
  color: var(--color-text-soft);
  font-size: 11px;
}

.current-temperature strong {
  color: var(--color-heading);
  font-size: 32px;
  font-weight: 650;
  letter-spacing: -0.04em;
  line-height: 1;
}

.temperature-count {
  display: inline-block;
  min-width: 2ch;
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.weather-visual {
  display: flex;
  align-items: center;
  flex-direction: column;
  gap: 2px;
}

.weather-icon {
  width: 72px;
  height: 72px;
  object-fit: contain;
  border-radius: 50%;
  background: var(--color-icon-background);
  box-shadow: inset 0 0 0 1px var(--color-border);
}

.warning-badge {
  max-width: 116px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 10px;
  border-top: 1px solid var(--color-border);
}

.card-metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  color: var(--color-text-soft);
  font-size: 12px;
}

.card-metrics strong {
  margin-left: 3px;
  color: var(--color-text);
  font-weight: 600;
}

.favorite-button {
  font-size: 17px;
  line-height: 1;
}

.card-actions {
  display: flex;
  align-items: center;
  gap: 2px;
}

.remove-button {
  color: var(--color-text-soft);
  font-size: 18px;
  line-height: 1;
}

.detail-button {
  min-height: auto;
  padding: 0;
  font-size: 12px;
  white-space: nowrap;
}

@media (max-width: 380px) {
  .card-footer {
    align-items: flex-start;
    flex-direction: column;
  }

  .detail-button {
    align-self: flex-end;
  }
}
</style>
