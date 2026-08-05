<template>
  <section v-if="isLoading" class="empty-state">
    <p>상세 정보를 불러오는 중입니다.</p>
  </section>

  <section v-else-if="detail" class="detail-page">
    <UButton type="button" color="neutral" variant="soft" size="sm" square class="modal-close" aria-label="상세 닫기" @click="closeDetail"> × </UButton>

    <header class="weather-hero">
      <div>
        <p class="location">📍 {{ city.name_kr ?? detail.name }}, {{ detail.sys.country }}</p>
        <h2>{{ detail.weather[0].description }}</h2>
        <p class="updated-at">관측 시간 {{ formatTime(detail.dt) }}</p>
      </div>

      <div class="temperature">
        <img :src="weatherIcon" :alt="detail.weather[0].description" />
        <strong :aria-label="configStore.formatTemp(detail.main.temp)">
          <span aria-hidden="true"> <CountUp :to="displayedTemperature" :duration="0.8" class-name="temperature-count" />{{ configStore.unitSymbol }} </span>
        </strong>
      </div>
    </header>

    <section v-if="cityWarnings.length" class="warning-section" aria-labelledby="weather-warning-title">
      <div class="warning-heading">
        <h3 id="weather-warning-title">기상특보</h3>
        <span>{{ cityWarnings.length }}건</span>
      </div>

      <ul class="warning-list">
        <li v-for="warning in cityWarnings" :key="`${warning.type}-${warning.level}-${warning.regionCode}`">
          <div>
            <UBadge :color="getWarningColor(warning.level)" variant="soft" size="sm">{{ warning.label }}</UBadge>
            <strong>{{ warning.regionName }}</strong>
          </div>
          <small v-if="warning.effectiveAt">발효 {{ formatWarningTime(warning.effectiveAt) }}</small>
        </li>
      </ul>
      <small style="font-size:10px;">데이터 제공: 기상청</small>
    </section>

    <div class="summary-grid">
      <article class="summary-card">
        <span>🌡️ 체감온도</span>
        <strong>{{ configStore.formatTemp(Math.round(detail.main.feels_like)) }}</strong>
      </article>
      <article class="summary-card">
        <span>💧 습도</span>
        <strong>{{ detail.main.humidity }}%</strong>
      </article>
      <article class="summary-card">
        <span>💨 풍속</span>
        <strong>{{ detail.wind.speed }} m/s</strong>
      </article>
      <article class="summary-card">
        <span>☁️ 구름량</span>
        <strong>{{ detail.clouds.all }}%</strong>
      </article>
    </div>

    <section class="forecast-section" aria-labelledby="hourly-forecast-title">
      <div class="forecast-heading">
        <h3 id="hourly-forecast-title">시간대별 예보</h3>
        <span>3시간 간격</span>
      </div>

      <p v-if="forecastStatus === 'loading'" class="forecast-status" aria-live="polite">예보를 불러오는 중입니다.</p>
      <p v-else-if="forecastStatus === 'error'" class="forecast-status forecast-status--error" aria-live="polite">
        {{ forecastErrorMessage }}
      </p>

      <template v-else>
        <div class="hourly-forecast" tabindex="0" aria-label="시간대별 날씨 예보">
          <article v-for="item in hourlyForecastItems" :key="`${item.timestamp}-${item.timeLabel}`" class="hourly-item">
            <time :datetime="item.dateTime">{{ item.timeLabel }}</time>
            <img v-if="item.weatherIcon" class="hourly-icon" :src="getForecastIcon(item.weatherIcon)" :alt="item.weatherDescription" />
            <strong>{{ configStore.formatTemp(item.temp) }}</strong>
            <small>강수 {{ item.precipitationProbability }}%</small>
            <small>풍속 {{ item.windSpeed }} m/s</small>
          </article>
        </div>

        <h3 id="five-day-forecast-title" class="five-day-heading">5일 예보</h3>
        <div class="forecast-grid" aria-labelledby="five-day-forecast-title">
          <article v-for="day in fiveDayForecast" :key="day.date" class="forecast-day">
            <time :datetime="day.date">{{ formatForecastDate(day.date) }}</time>
            <img v-if="day.weatherIcon" class="forecast-icon" :src="getForecastIcon(day.weatherIcon)" alt="" aria-hidden="true" />
            <span class="forecast-condition">
              {{ day.weatherDescription }}
            </span>
            <strong>
              <span>{{ configStore.formatTemp(day.tempMin) }}</span> ~
              {{ configStore.formatTemp(day.tempMax) }}
            </strong>
            <small>강수 {{ day.precipitationProbability }}%</small>
          </article>
        </div>

        <a class="forecast-source" href="https://openweathermap.org/forecast5" target="_blank" rel="noopener"> 예보 데이터: OpenWeather </a>
      </template>
    </section>

    <div class="details-card">
      <h3>상세 관측 정보</h3>
      <dl>
        <div>
          <dt>최저 / 최고 기온</dt>
          <dd>{{ configStore.formatTemp(detail.main.temp_min) }}° / {{ configStore.formatTemp(detail.main.temp_max) }}°</dd>
        </div>
        <div>
          <dt>기압</dt>
          <dd>{{ detail.main.pressure }} hPa</dd>
        </div>
        <div>
          <dt>가시거리</dt>
          <dd>{{ (detail.visibility / 1000).toFixed(1) }} km</dd>
        </div>
        <div>
          <dt>돌풍</dt>
          <dd>{{ detail.wind.gust ?? '-' }} m/s</dd>
        </div>
        <div>
          <dt>일출</dt>
          <dd>🌅 {{ formatTime(detail.sys.sunrise) }}</dd>
        </div>
        <div>
          <dt>일몰</dt>
          <dd>🌇 {{ formatTime(detail.sys.sunset) }}</dd>
        </div>
        <div>
          <dt>좌표</dt>
          <dd>{{ detail.coord.lat }}, {{ detail.coord.lon }}</dd>
        </div>
      </dl>
    </div>
  </section>

  <section v-else class="empty-state">
    <p>도시 상세 정보를 불러올 수 없습니다.</p>
    <UButton type="button" color="primary" @click="closeDetail">대시보드로 돌아가기</UButton>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getFiveDayForecast, getWeatherList } from '@/api/weatherApi'
import { getKmaWarnings, getWarningsForCity } from '@/api/kmaWarningApi'
import { useConfigStore } from '@/stores/configStore'
import CountUp from '@/components/exercise/CountUp.vue'

const configStore = useConfigStore()
const route = useRoute()
const router = useRouter()
const city = ref(null)
const isLoading = ref(true)
const fiveDayForecast = ref([])
const hourlyForecast = ref([])
const forecastStatus = ref('loading')
const forecastErrorMessage = ref('5일 예보를 불러오지 못했습니다.')

const loadWarnings = async (currentCity) => {
  if (Array.isArray(currentCity.warnings)) return

  try {
    const warnings = await getKmaWarnings()

    if (String(city.value?.id) !== String(currentCity.id)) return

    city.value = {
      ...city.value,
      warnings: getWarningsForCity(currentCity, warnings),
    }
  } catch (error) {
    console.error('상세 화면에서 기상특보를 불러오지 못했습니다.', error)
  }
}

const loadFiveDayForecast = async (currentCity) => {
  const requestedCityId = String(currentCity.id)
  const { lat, lon } = currentCity.detail.coord

  forecastStatus.value = 'loading'
  forecastErrorMessage.value = '5일 예보를 불러오지 못했습니다.'

  try {
    const forecast = await getFiveDayForecast({
      cityId: requestedCityId,
      latitude: lat,
      longitude: lon,
    })
    // console.log(forecast)

    if (String(city.value?.id) !== requestedCityId) return

    fiveDayForecast.value = forecast.daily
    hourlyForecast.value = forecast.hourly
    forecastStatus.value = 'success'
  } catch (error) {
    console.error(error)

    if (String(city.value?.id) !== requestedCityId) return

    fiveDayForecast.value = []
    hourlyForecast.value = []
    forecastErrorMessage.value = error.response?.data?.message || '5일 예보를 불러오지 못했습니다.'
    forecastStatus.value = 'error'
  }
}

const loadCity = async () => {
  isLoading.value = true
  fiveDayForecast.value = []
  hourlyForecast.value = []
  forecastStatus.value = 'loading'
  forecastErrorMessage.value = '5일 예보를 불러오지 못했습니다.'

  const routedCity = window.history.state?.city
  if (routedCity && String(routedCity.id) === String(route.params.cityId) && routedCity.detail) {
    city.value = routedCity
    isLoading.value = false
    loadWarnings(routedCity)
    loadFiveDayForecast(routedCity)
    return
  }

  try {
    const weatherList = await getWeatherList()
    city.value = weatherList.find((item) => String(item.id) === String(route.params.cityId)) ?? null
  } catch (error) {
    console.error(error)
    city.value = null
  } finally {
    isLoading.value = false
  }

  if (city.value?.detail?.coord) {
    loadWarnings(city.value)
    loadFiveDayForecast(city.value)
  }
}

watch(() => route.params.cityId, loadCity, { immediate: true })

const detail = computed(() => city.value?.detail ?? null)
const cityWarnings = computed(() => city.value?.warnings ?? [])
const displayedTemperature = computed(() => configStore.convertTemp(detail.value?.main?.temp ?? 0))

const weatherIcon = computed(() => `https://openweathermap.org/img/wn/${detail.value?.weather?.[0]?.icon}@2x.png`)

const hourlyForecastItems = computed(() => {
  if (!detail.value || hourlyForecast.value.length === 0) return []

  const currentItem = {
    timestamp: detail.value.dt,
    dateTime: new Date(detail.value.dt * 1000).toISOString(),
    timeLabel: '지금',
    temp: Math.round(detail.value.main.temp),
    precipitationProbability: hourlyForecast.value[0].precipitationProbability,
    windSpeed: detail.value.wind.speed,
    weatherDescription: detail.value.weather[0].description,
    weatherIcon: detail.value.weather[0].icon,
  }

  const forecastItems = hourlyForecast.value.slice(0, 7).map((item) => ({
    ...item,
    dateTime: new Date(item.timestamp * 1000).toISOString(),
    timeLabel: formatForecastHour(item.timestamp),
  }))

  return [currentItem, ...forecastItems]
})

const formatTime = (timestamp) => {
  const localTimestamp = (timestamp + (detail.value?.timezone ?? 0)) * 1000

  return new Date(localTimestamp).toLocaleTimeString('ko-KR', {
    timeZone: 'UTC',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatForecastDate = (date) =>
  new Intl.DateTimeFormat('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date(`${date}T00:00:00`))

function formatForecastHour(timestamp) {
  const localTimestamp = (timestamp + (detail.value?.timezone ?? 0)) * 1000

  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'UTC',
    hour: 'numeric',
    hourCycle: 'h23',
  }).format(new Date(localTimestamp))
}

const getForecastIcon = (icon) => `https://openweathermap.org/img/wn/${icon}@2x.png`

const getWarningColor = (level) => (['예비', '주의', '주의보'].includes(level) ? 'warning' : 'error')

const formatWarningTime = (value) => {
  if (!/^\d{12}$/.test(value)) return value

  const month = Number(value.slice(4, 6))
  const day = Number(value.slice(6, 8))
  const hour = value.slice(8, 10)
  const minute = value.slice(10, 12)

  return `${month}월 ${day}일 ${hour}:${minute}`
}

const closeDetail = () => {
  router.push({ name: 'weather', query: route.query })
}
</script>

<style scoped>
.detail-page,
.empty-state {
  margin: 0;
  color: var(--color-text);
}

.detail-page {
  position: relative;
  padding: 22px;
}

.weather-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 22px;
  border: 1px solid var(--color-border);
  border-radius: 11px;
  background: var(--color-background-mute);
  color: var(--color-heading);
}

.location,
.updated-at {
  margin: 0;
}

.location {
  color: var(--color-text-muted);
  font-size: 12px;
  font-weight: 600;
}

.weather-hero h2 {
  margin: 4px 0;
  font-size: 23px;
  font-weight: 700;
}

.updated-at {
  color: var(--color-text-soft);
  font-size: 12px;
}

.temperature {
  display: flex;
  align-items: center;
}

.temperature img {
  width: 58px;
  height: 58px;
}

.temperature strong {
  font-size: 34px;
  font-weight: 650;
  letter-spacing: -0.04em;
}

.temperature-count {
  display: inline-block;
  min-width: 2ch;
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin: 12px 0;
}

.warning-section {
  margin: 12px 0;
  padding: 14px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-background-soft);
}

.warning-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 9px;
}

.warning-heading h3 {
  margin: 0;
  font-size: 16px;
}

.warning-heading span,
.warning-list small {
  color: var(--color-text-soft);
  font-size: 11px;
}

.warning-list {
  display: grid;
  gap: 7px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.warning-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 10px;
  border-radius: 7px;
  background: var(--color-background-mute);
}

.warning-list li div {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.warning-list strong {
  overflow: hidden;
  color: var(--color-heading);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.summary-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-height: 76px;
  padding: 12px 8px;
  border: 1px solid var(--color-border);
  border-radius: 9px;
  background: var(--color-background-soft);
  text-align: center;
}

.summary-card span {
  color: var(--color-text-muted);
  font-size: 12px;
}

.summary-card strong {
  color: var(--color-heading);
  font-size: 18px;
}

.forecast-section {
  margin: 12px 0;
  padding: 14px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-background-soft);
}

.forecast-section h3 {
  margin: 0 0 10px;
  font-size: 16px;
}

.forecast-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.forecast-heading span {
  color: var(--color-text-soft);
  font-size: 11px;
}

.forecast-status {
  margin: 0;
  padding: 14px 0;
  color: var(--color-text-muted);
  text-align: center;
}

.forecast-status--error {
  color: var(--color-danger);
}

.hourly-forecast {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 7px;
  scrollbar-width: thin;
}

.hourly-item {
  display: flex;
  min-width: 92px;
  flex: 0 0 92px;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 9px 6px;
  border: 1px solid var(--color-border-soft);
  border-radius: 8px;
  background: var(--color-background-mute);
  text-align: center;
}

.hourly-item time {
  color: var(--color-heading);
  font-size: 12px;
  font-weight: 600;
}

.hourly-item strong {
  color: var(--color-heading);
  font-size: 15px;
}

.hourly-item small {
  color: var(--color-text-muted);
  font-size: 10px;
  white-space: nowrap;
}

.hourly-icon {
  width: 38px;
  height: 38px;
}

.forecast-section .five-day-heading {
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid var(--color-border);
}

.forecast-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(96px, 1fr));
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.forecast-day {
  display: flex;
  min-width: 84px;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 9px 5px;
  border-radius: 8px;
  border: 1px solid var(--color-border-soft);
  background: var(--color-background-mute);
  text-align: center;
}

.forecast-day time,
.forecast-day small {
  color: var(--color-text-muted);
  font-size: 11px;
}

.forecast-icon {
  width: 38px;
  height: 38px;
}

.forecast-condition {
  min-height: 32px;
  color: var(--color-text);
  font-size: 11px;
}

.forecast-day strong {
  font-size: 13px;
}

.forecast-day strong span {
  color: var(--color-text-muted);
  font-weight: 500;
}

.forecast-source {
  display: block;
  width: fit-content;
  margin: 6px 0 0 auto;
  color: var(--color-text-soft);
  font-size: 10px;
}

.details-card {
  padding: 18px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-background-soft);
}

.details-card h3 {
  margin: 0 0 12px;
  color: var(--color-heading);
  font-size: 16px;
}

.details-card dl {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0 24px;
  margin: 0;
}

.details-card dl div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 9px 0;
  border-bottom: 1px solid var(--color-border);
}

.details-card dt {
  color: var(--color-text-muted);
}

.details-card dd {
  margin: 0;
  font-weight: 600;
  text-align: right;
}

.modal-close {
  position: absolute;
  z-index: 1;
  top: 31px;
  right: 31px;
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  padding: 0 0 3px;
  border: 1px solid var(--color-border);
  border-radius: 50%;
  background: var(--color-background-soft);
  color: var(--color-text-muted);
  cursor: pointer;
  font-size: 24px;
  line-height: 1;
  transition:
    background-color 0.15s ease,
    transform 0.15s ease;
}

.modal-close:hover {
  background: var(--color-background-mute);
  color: var(--color-heading);
}

.btn-home {
  display: block;
  margin-top: 15px;
  padding: 11px 16px;
  border: 0;
  border-radius: 5px;
  background: #0ea5e9;
  color: #fff;
  cursor: pointer;
  font-weight: 700;
  text-align: center;
  text-decoration: none;
}

.btn-home:hover {
  background: #0284c7;
}

.empty-state {
  padding: 40px 20px;
  border-radius: 10px;
  background: var(--color-background-mute);
  text-align: center;
}

@media (max-width: 560px) {
  .summary-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .details-card dl {
    grid-template-columns: 1fr;
  }

  .detail-page {
    padding: 12px;
  }

  .weather-hero {
    padding: 18px;
  }

  .weather-hero h2 {
    font-size: 23px;
  }

  .temperature img {
    width: 56px;
    height: 56px;
  }

  .temperature strong {
    font-size: 34px;
  }

  .modal-close {
    top: 27px;
    right: 27px;
  }
}
</style>
