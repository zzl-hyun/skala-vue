<template>
  <div class="container">
    <aside class="map-column">
      <BaseDashboardCard>
        <WeatherMap />
      </BaseDashboardCard>
    </aside>

    <div class="content-column">
      <BaseDashboardCard>
        <SearchBar :cur-query="searchQuery" :adding="isAddingCity" :locating="isLocating" @update-query="updateSearchQuery" @add-city="addCity" @request-location="loadCurrentLocation"> </SearchBar>
        <p v-if="cityAddMessage" class="city-add-message" aria-live="polite">
          {{ cityAddMessage }}
        </p>
      </BaseDashboardCard>

      <BaseDashboardCard>
        <div class="section-heading">
          <h2>🏞️ 지역별 날씨 현황</h2>
          <p>도시별 현재 관측 정보</p>
        </div>

        <p class="api-status" :class="`api-status--${apiStatus}`">
          <span v-if="apiStatus === 'loading'">{{ API_LOADING }}</span>
          <span v-else-if="apiStatus === 'success'">{{ API_SUCCESS }}</span>
          <span v-else>{{ API_FAIL }}</span>
        </p>

        <div class="cache-row">
          <p>{{ cacheStatusText }}</p>
          <UButton type="button" color="neutral" variant="ghost" size="xs" :loading="isRefreshing" :disabled="apiStatus === 'loading'" @click="loadWeather({ forceRefresh: true })">
            최신 날씨 다시 불러오기
          </UButton>
        </div>

        <div class="filter-row">
          <USelect v-model="sortKey" :items="sortOptions" class="filter-select" size="sm" aria-label="정렬 기준" />

          <button type="button" class="sort-direction" :aria-label="sortDirection === 'asc' ? '내림차순으로 변경' : '오름차순으로 변경'" @click="toggleSortDirection">
            <svg class="sort-direction-icon" :class="{ 'sort-direction-icon--down': sortDirection === 'desc' }" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 19V5M6.5 10.5 12 5l5.5 5.5" />
            </svg>
          </button>

          <UButton type="button" :color="favoriteOnly ? 'primary' : 'neutral'" variant="outline" size="sm" class="favorite-filter" :aria-pressed="favoriteOnly" @click="favoriteOnly = !favoriteOnly">
            <span style="color: orange">★</span> 즐겨찾기 <span>{{ favoriteCount }}</span>
          </UButton>
        </div>

        <div class="weather-grid">
          <WeatherCard
            v-for="item in filteredWeatherList"
            :key="item.id"
            :city-item="item"
            :hot-temperature="HOT_TEMPERATURE"
            :is-favorite="isFavorite(item.id)"
            @select-card="selectCity"
            @toggle-favorite="toggleFavorite"
            @click-detail="showDetail"
          >
          </WeatherCard>
        </div>
        <p v-if="filteredWeatherList.length === 0">
          {{ favoriteOnly ? '즐겨찾기한 도시가 없습니다.' : '검색 결과와 일치하는 도시가 없습니다.' }}
        </p>

        <div class="status-bar">
          {{ selectedCityInfo }}
        </div>
      </BaseDashboardCard>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed, watch, watchEffect } from 'vue'
import BaseDashboardCard from './BaseDashboardCard.vue'
import SearchBar from './SearchBar.vue'
import WeatherCard from './weatherCard.vue'
import WeatherMap from './WeatherMap.vue'
import { getWeatherByLocation, getWeatherCacheInfo, getWeatherList, saveCustomCity, saveWeatherListCache } from '@/api/weatherApi'
import { useRoute, useRouter } from 'vue-router'
import { useFavoriteCities } from '@/composables/useFavoriteCities'

/**
 * 날씨 대시보드의 데이터와 화면 상태를 관리하는 부모 컴포넌트
 * API 결과와 검색·정렬·즐겨찾기 상태를 소유하고 자식 컴포넌트에는 props와 emits로 연결한다.
 */
const route = useRoute()
const router = useRouter()

// URL에 검색어가 있으면 새로고침하거나 주소를 공유해도 같은 검색 상태로 시작한다.
const initialQuery = typeof route.query.q === 'string' ? route.query.q : ''
const searchQuery = ref(initialQuery)

const updateSearchQuery = (query) => {
  searchQuery.value = query
  cityAddMessage.value = ''
}
watchEffect(() => {
  console.log(`[watchEffect 자동 호출] 현재 검색어 '${searchQuery.value}' 에 매칭되는 API 데이터를 필터링했습니다`)
})

const HOT_TEMPERATURE = 28
const API_LOADING = 'OpenWeather API 데이터 불러오는 중...'
const API_SUCCESS = 'OpenWeather API 데이터 로드 성공'
const API_FAIL = 'OpenWeather API 데이터 로드 실패'
const weatherList = ref([])
const apiStatus = ref('loading')
const weatherSource = ref('')
const cacheExpiresAt = ref(0)
const currentTime = ref(Date.now())
const isRefreshing = ref(false)
const isAddingCity = ref(false)
const isLocating = ref(false)
const cityAddMessage = ref('')
const currentLocationCity = ref(null)
let cacheTimer

/**
 * 저장된 캐시 또는 OpenWeather API에서 현재 날씨 목록을 불러온다.
 * @param {Object} options
 * @param {boolean} options.forceRefresh 캐시를 건너뛰고 새로 요청할지 여부
 */
const loadWeather = async ({ forceRefresh = false } = {}) => {
  const cacheBeforeLoad = forceRefresh ? null : getWeatherCacheInfo()

  if (forceRefresh) {
    isRefreshing.value = true
  } else if (weatherList.value.length === 0) {
    apiStatus.value = 'loading'
  }

  try {
    weatherList.value = await getWeatherList({ forceRefresh })
    // console.log(weatherList.value)
    apiStatus.value = 'success'
    weatherSource.value = cacheBeforeLoad ? 'cache' : 'network'

    const cacheInfo = getWeatherCacheInfo()
    cacheExpiresAt.value = cacheInfo?.expiresAt ?? 0
    currentTime.value = Date.now()
  } catch (error) {
    console.error(error)
    apiStatus.value = 'error'
  } finally {
    isRefreshing.value = false
  }
}

onMounted(() => {
  loadWeather()

  // 남은 캐시 시간을 갱신하고 만료된 데이터는 자동으로 다시 요청한다.
  cacheTimer = window.setInterval(() => {
    currentTime.value = Date.now()

    const isExpired = cacheExpiresAt.value > 0 && currentTime.value >= cacheExpiresAt.value

    if (isExpired && apiStatus.value === 'success' && !isRefreshing.value) {
      loadWeather({ forceRefresh: true })
    }
  }, 60 * 1000)
})

onBeforeUnmount(() => {
  window.clearInterval(cacheTimer)
})

const cacheStatusText = computed(() => {
  if (apiStatus.value === 'loading') return '캐시 상태 확인 중'
  if (!cacheExpiresAt.value) return '저장된 캐시 없음'

  const remainingMilliseconds = cacheExpiresAt.value - currentTime.value

  if (remainingMilliseconds <= 0) return '캐시가 만료되었습니다.'

  const remainingMinutes = Math.ceil(remainingMilliseconds / (60 * 1000))
  const sourceText = weatherSource.value === 'cache' ? '캐시 데이터 사용 중' : '최신 데이터 사용 중'

  return `${sourceText} · 다음 갱신까지 ${remainingMinutes}분`
})

const sortKey = ref('name')
const sortDirection = ref('asc')
const sortOptions = [
  { label: '이름순', value: 'name' },
  { label: '기온순', value: 'temp' },
  { label: '체감온도순', value: 'feels' },
  { label: '습도순', value: 'humidity' },
  { label: '풍속순', value: 'wind' },
]
const favoriteOnly = ref(false)
const { favoriteIds, isFavorite, toggleFavorite } = useFavoriteCities()
const favoriteCount = computed(() => favoriteIds.value.length)

// 콜백 기반 Geolocation API를 async/await로 다루기 위해 Promise로 감싼다.
const getBrowserPosition = () =>
  new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 10 * 1000,
      maximumAge: 5 * 60 * 1000,
    })
  })

const getLocationErrorMessage = (error) => {
  if (error?.code === 1) return '위치 권한이 거부되었습니다. 브라우저 설정에서 위치 권한을 허용해 주세요.'
  if (error?.code === 2) return '현재 위치를 확인할 수 없습니다.'
  if (error?.code === 3) return '위치 확인 시간이 초과되었습니다. 다시 시도해 주세요.'
  return '현재 위치 날씨를 불러오지 못했습니다.'
}

const loadCurrentLocation = async () => {
  if (!('geolocation' in navigator)) {
    cityAddMessage.value = '이 브라우저에서는 위치 기능을 사용할 수 없습니다.'
    return
  }

  isLocating.value = true
  cityAddMessage.value = '현재 위치를 확인하는 중입니다.'

  try {
    const position = await getBrowserPosition()
    // console.log(position)
    const currentCity = await getWeatherByLocation({
      lat: position.coords.latitude,
      lon: position.coords.longitude,
    })
    const existingCity = weatherList.value.find((item) => String(item.detail?.id) === String(currentCity.detail.id))
    const locationName = existingCity?.name_kr ?? currentCity.name

    // 현재 위치 카드는 저장 목록과 분리해 이번 접속 동안만 목록 최상단에 보여 준다.
    currentLocationCity.value = {
      ...currentCity,
      name_kr: `현재 위치 · ${locationName}`,
      isCurrentLocation: true,
    }
    searchQuery.value = ''
    cityAddMessage.value = `현재 위치(${locationName}) 날씨를 불러왔습니다.`
  } catch (error) {
    cityAddMessage.value = getLocationErrorMessage(error)
  } finally {
    isLocating.value = false
  }
}

const addCity = async (location) => {
  isAddingCity.value = true
  cityAddMessage.value = ''

  try {
    const newCity = await getWeatherByLocation(location)
    // console.log(newCity)
    const existingCity = weatherList.value.find((item) => String(item.detail?.id) === String(newCity.detail.id))
    const targetCity = existingCity ?? newCity

    // OpenWeather 도시 ID가 같은 항목은 중복 저장하지 않는다.
    if (!existingCity) {
      weatherList.value.push(newCity)
      saveCustomCity(newCity)

      const cacheInfo = saveWeatherListCache(weatherList.value)
      cacheExpiresAt.value = cacheInfo.expiresAt
      currentTime.value = Date.now()
      weatherSource.value = 'network'
    }

    cityAddMessage.value = existingCity
      ? `${targetCity.name_kr ?? targetCity.name}은(는) 이미 목록에 있습니다.`
      : `${targetCity.name_kr ?? targetCity.name}을(를) 목록에 추가했습니다. 즐겨찾기는 카드의 별 버튼으로 설정할 수 있습니다.`
  } catch (error) {
    console.error(error)
    cityAddMessage.value = '도시 날씨를 불러오지 못했습니다.'
  } finally {
    isAddingCity.value = false
  }
}

// 입력값을 query string에 반영해 검색 상태를 URL과 동기화한다.
watch(searchQuery, (query) => {
  const normalizedQuery = query.trim()
  const currentQuery = typeof route.query.q === 'string' ? route.query.q : ''

  if (normalizedQuery === currentQuery) return

  router.replace({
    query: {
      ...route.query,
      q: normalizedQuery || undefined,
    },
  })
})

watch(
  () => route.query.q,
  (query) => {
    // 뒤로 가기처럼 URL이 먼저 변한 경우에는 입력값을 반대로 복원한다.
    const normalizedQuery = typeof query === 'string' ? query : ''

    if (normalizedQuery !== searchQuery.value) {
      searchQuery.value = normalizedQuery
    }
  },
)

const toggleSortDirection = () => {
  sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
}

// 위치 카드 병합 → 검색 → 즐겨찾기 → 정렬 순서로 최종 표시 목록을 만든다.
const filteredWeatherList = computed(() => {
  const keywords = searchQuery.value
    .split(',')
    .map((keyword) => keyword.trim().toLowerCase())
    .filter(Boolean)

  const currentCityId = currentLocationCity.value?.detail?.id
  let result = currentLocationCity.value ? [currentLocationCity.value, ...weatherList.value.filter((item) => String(item.detail?.id) !== String(currentCityId))] : [...weatherList.value]

  if (keywords.length > 0) {
    result = result.filter((item) => keywords.some((keyword) => item.name.toLowerCase().includes(keyword) || item.name_kr.includes(keyword)))
  }

  if (favoriteOnly.value) {
    result = result.filter((item) => isFavorite(item.id))
  }

  if (sortKey.value !== 'default') {
    const multiplier = sortDirection.value === 'asc' ? 1 : -1

    result.sort((first, second) => {
      if (sortKey.value === 'name') {
        return (first.name_kr ?? first.name).localeCompare(second.name_kr ?? second.name, 'ko') * multiplier
      }

      const values = {
        temp: [first.temp, second.temp],
        feels: [first.main.feels_like, second.main.feels_like],
        humidity: [first.main.humidity, second.main.humidity],
        wind: [first.wind?.speed ?? 0, second.wind?.speed ?? 0],
      }

      return (values[sortKey.value][0] - values[sortKey.value][1]) * multiplier
    })
  }

  const currentLocationIndex = result.findIndex((item) => item.isCurrentLocation)

  // 정렬 기준과 관계없이 현재 위치 날씨는 항상 첫 번째에 고정한다.
  if (currentLocationIndex > 0) {
    const [currentLocation] = result.splice(currentLocationIndex, 1)
    result.unshift(currentLocation)
  }

  return result
})

const selectedCityInfo = ref('카드를 클릭하거나 검색해 보세요.')
watch(selectedCityInfo, (newValue) => {
  console.log('[watch 감지] 상태 바 문구가 업데이트 되었습니다. ->', newValue)
})
const selectCity = (city) => {
  selectedCityInfo.value = `${city.name_kr ?? city.name}이(가) 선택되었습니다.`
}

const showDetail = (city) => {
  // 이미 받은 응답을 History state로 전달해 상세 화면의 중복 API 요청을 줄인다.
  router.push({
    name: 'detail',
    params: {
      cityId: city.id,
    },
    state: {
      city: JSON.parse(JSON.stringify(city)),
    },
    query: route.query,
  })
}
</script>

<style scoped>
.container {
  display: grid;
  grid-template-columns: minmax(320px, 7fr) minmax(0, 13fr);
  align-items: start;
  gap: 16px;
  margin: 20px auto 0;
}

.map-column {
  position: sticky;
  top: 16px;
  min-width: 0;
}

.content-column {
  display: grid;
  min-width: 0;
  gap: 16px;
}

.status-bar {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--color-border-soft);
  color: var(--color-text-soft);
  font-size: 12px;
}
.empty-message {
  color: red;
}
.filter-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.cache-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: -4px 0 14px;
  padding: 9px 10px;
  border: 1px solid var(--color-border-soft);
  border-radius: 8px;
  background: var(--color-background-mute);
}

.cache-row p {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 11px;
}

.city-add-message {
  margin: 8px 0 0;
  color: var(--color-text);
  font-size: 12px;
}

.section-heading {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.section-heading h2 {
  margin: 0;
  color: var(--color-heading);
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.section-heading p {
  margin: 0;
  color: var(--color-text-soft);
  font-size: 12px;
}

.filter-select {
  width: 132px;
  min-width: 132px;
  max-width: 132px;
  flex: 0 0 132px;
}

.sort-direction {
  display: inline-grid;
  place-items: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: 0;
  border-radius: 10px;
  background: transparent;
  box-shadow: none;
  color: var(--color-text-muted);
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
}

.sort-direction:hover {
  background: var(--color-background-mute);
  color: var(--color-heading);
}

.sort-direction:focus-visible {
  outline: 2px solid var(--color-border-soft);
  outline-offset: 2px;
}

.sort-direction-icon {
  width: 16px;
  height: 16px;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
  transition: transform 0.18s ease;
}

.sort-direction-icon--down {
  transform: rotate(180deg);
}

.favorite-filter {
  margin-left: auto;
  min-height: 36px;
}

.favorite-filter span {
  margin-left: 3px;
  color: var(--color-text-soft);
}

.api-status {
  margin: 3px 0 14px;
  font-size: 11px;
}

.api-status--loading {
  color: var(--color-text);
}

.api-status--success {
  color: var(--color-text-muted);
}

.api-status--error {
  color: var(--color-danger);
}

.weather-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.weather-grid :deep(.weather-card) {
  margin-bottom: 0;
}

@media (max-width: 600px) {
  .cache-row {
    align-items: flex-start;
    flex-direction: column;
  }

  .weather-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .container {
    grid-template-columns: 1fr;
  }

  .map-column {
    position: static;
  }
}
</style>
