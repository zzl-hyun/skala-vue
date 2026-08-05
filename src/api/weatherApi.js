import axios from 'axios'
import { cities } from '@/data/cities'

/**
 * OpenWeather API 요청과 브라우저 캐시를 관리하는 모듈
 *
 * 현재 날씨, 도시 검색, 사용자 추가 도시, 시간대별·5일 예보를 한 곳에서 처리한다.
 * API 키는 Vite 환경 변수에서 읽으며, 프론트엔드 실습용 구조라 브라우저 번들에 포함된다.
 */

// 현재 날씨와 예보는 한 시간 동안 재사용해 불필요한 API 호출을 줄인다.
const CACHE_KEY = 'weather-list'
const CACHE_DURATION = 60 * 60 * 1000
const FORECAST_CACHE_PREFIX = 'five-day-forecast-v2'
const CUSTOM_CITIES_KEY = 'weather-custom-cities'
const HIDDEN_CITIES_KEY = 'weather-hidden-city-ids'

/**
 * 현재 날씨 캐시의 구조와 만료 시간을 확인한다.
 * 유효한 경우 목록과 만료 시각을 반환하고, 손상되거나 만료된 캐시는 제거한다.
 */
export const getWeatherCacheInfo = () => {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY))

    if (!cached || !Array.isArray(cached.weatherList)) return null

    const expiresAt = cached.savedAt + CACHE_DURATION
    const isValid = Date.now() < expiresAt

    if (isValid) {
      return {
        savedAt: cached.savedAt,
        expiresAt,
        weatherList: cached.weatherList,
      }
    }

    localStorage.removeItem(CACHE_KEY)
    return null
  } catch {
    localStorage.removeItem(CACHE_KEY)
    return null
  }
}

/**
 * 현재 날씨 목록과 저장 시각을 localStorage에 기록한다.
 * 화면에서 남은 캐시 시간을 계산할 수 있도록 만료 시각도 반환한다.
 */
export const saveWeatherListCache = (weatherList) => {
  const savedAt = Date.now()

  localStorage.setItem(
    CACHE_KEY,
    JSON.stringify({
      savedAt,
      weatherList,
    }),
  )

  return {
    savedAt,
    expiresAt: savedAt + CACHE_DURATION,
  }
}

// 사용자가 검색으로 추가한 도시는 기본 도시 목록과 분리해서 보관한다.
const getCustomCities = () => {
  try {
    const customCities = JSON.parse(localStorage.getItem(CUSTOM_CITIES_KEY))

    return Array.isArray(customCities) ? customCities.map((city) => ({ ...city, isCustom: true })) : []
  } catch {
    localStorage.removeItem(CUSTOM_CITIES_KEY)
    return []
  }
}

const markCustomCities = (weatherItems) => {
  const customCityIds = new Set(getCustomCities().map((city) => String(city.id)))

  return weatherItems.map((city) => (customCityIds.has(String(city.id)) ? { ...city, isCustom: true } : city))
}

const getHiddenCityIds = () => {
  try {
    const hiddenCityIds = JSON.parse(localStorage.getItem(HIDDEN_CITIES_KEY))

    return Array.isArray(hiddenCityIds) ? hiddenCityIds.map(String) : []
  } catch {
    localStorage.removeItem(HIDDEN_CITIES_KEY)
    return []
  }
}

const excludeHiddenCities = (cityItems) => {
  const hiddenCityIds = new Set(getHiddenCityIds())

  return cityItems.filter((city) => !hiddenCityIds.has(String(city.id)))
}

/**
 * 도시 이름 또는 좌표를 이용해 현재 날씨를 한 건 조회한다.
 * 카드용 요약 필드와 상세 화면에서 사용할 원본 응답(detail)을 함께 반환한다.
 */
const requestCurrentWeather = async (city) => {
  const hasCoordinates = Number.isFinite(city.lat) && Number.isFinite(city.lon)

  // 같은 이름의 도시가 있을 수 있으므로 좌표가 있으면 이름보다 좌표를 우선한다.
  const locationParams = hasCoordinates ? { lat: city.lat, lon: city.lon } : { q: `${city.name},${city.country ?? 'KR'}` }

  const { data } = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
    params: {
      ...locationParams,
      appid: import.meta.env.VITE_OPENWEATHER_API_KEY,
      units: 'metric',
      lang: 'kr',
    },
  })
  // console.log(data)

  return {
    ...city,
    id: city.id ?? String(data.id),
    name: city.name ?? data.name,
    name_kr: city.name_kr ?? city.name ?? data.name,
    temp: Math.round(data.main.temp),
    status: data.weather[0].description,
    main: data.main,
    visibility: data.visibility,
    wind: data.wind,
    clouds: data.clouds,
    detail: data,
  }
}

/**
 * 기본 도시와 사용자 추가 도시의 현재 날씨를 불러온다.
 * 강제 갱신이 아니면 캐시를 먼저 사용하고, 요청이 필요할 때는 Promise.all로 병렬 조회한다.
 */
export const getWeatherList = async ({ forceRefresh = false } = {}) => {
  const cachedWeather = forceRefresh ? null : getWeatherCacheInfo()

  if (cachedWeather) {
    return markCustomCities(excludeHiddenCities(cachedWeather.weatherList))
  }

  const allCities = excludeHiddenCities([...cities, ...getCustomCities()])
  const weatherList = await Promise.all(allCities.map(requestCurrentWeather))
  // console.log(weatherList)

  saveWeatherListCache(weatherList)

  return weatherList
}

/**
 * 카카오 주소 검색 API로 국내 행정구역을 검색한다.
 * 검색된 좌표는 기존 OpenWeather 현재 날씨 조회에 그대로 전달한다.
 */
export const searchCities = async (query) => {
  const { data } = await axios.get('https://dapi.kakao.com/v2/local/search/address.json', {
    headers: {
      Authorization: `KakaoAK ${import.meta.env.VITE_KAKAO_REST_API_KEY}`,
    },
    params: {
      query,
      size: 5,
    },
  })
  // console.log(data)

  return data.documents.map((result) => {
    const address = result.address
    const cityName = address.region_3depth_name || address.region_2depth_name || address.region_1depth_name
    const state = [address.region_1depth_name, address.region_2depth_name].filter((region) => region && region !== cityName).join(' ')

    return {
      key: address.b_code || `${result.x}-${result.y}`,
      name: cityName,
      name_kr: cityName,
      state,
      country: 'KR',
      lat: Number(result.y),
      lon: Number(result.x),
    }
  })
}

// 현재 위치와 검색 결과 모두 같은 현재 날씨 요청 함수를 재사용한다.
export const getWeatherByLocation = (location) => requestCurrentWeather(location)

/**
 * 사용자가 선택한 도시의 식별 정보만 저장한다.
 * 날씨 값은 시간이 지나면 바뀌므로 목록을 다시 불러올 때 API에서 새로 조회한다.
 */
export const saveCustomCity = (city) => {
  const customCities = getCustomCities()
  const customCity = {
    id: String(city.id),
    name: city.name,
    name_kr: city.name_kr ?? city.name,
    state: city.state ?? '',
    country: city.detail.sys.country,
    lat: city.detail.coord.lat,
    lon: city.detail.coord.lon,
    isCustom: true,
  }

  const isSaved = customCities.some((savedCity) => String(savedCity.id) === customCity.id)

  if (!isSaved) {
    localStorage.setItem(CUSTOM_CITIES_KEY, JSON.stringify([...customCities, customCity]))
  }

  return customCity
}

/** 도시 종류에 따라 사용자 추가 목록에서 제거하거나 기본 목록에서 숨긴다. */
export const removeWeatherCity = (city) => {
  if (city.isCustom) {
    const remainingCities = getCustomCities().filter((item) => String(item.id) !== String(city.id))

    localStorage.setItem(CUSTOM_CITIES_KEY, JSON.stringify(remainingCities))
    return
  }

  const hiddenCityIds = getHiddenCityIds()
  const normalizedId = String(city.id)

  if (!hiddenCityIds.includes(normalizedId)) {
    localStorage.setItem(HIDDEN_CITIES_KEY, JSON.stringify([...hiddenCityIds, normalizedId]))
  }
}

// 도시별 예보 캐시가 서로 덮어쓰지 않도록 cityId를 키에 포함한다.
const getForecastCacheKey = (cityId) => `${FORECAST_CACHE_PREFIX}-${cityId}`

/**
 * 선택한 도시의 시간대별·5일 예보 캐시를 확인한다.
 * 현재 날씨 캐시와 동일하게 한 시간이 지나면 제거한다.
 */
const getCachedForecast = (cityId) => {
  const cacheKey = getForecastCacheKey(cityId)

  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey))

    if (!cached) return null

    const isValid = Date.now() - cached.savedAt < CACHE_DURATION

    if (isValid) return cached.forecast

    localStorage.removeItem(cacheKey)
    return null
  } catch {
    localStorage.removeItem(cacheKey)
    return null
  }
}

/**
 * OpenWeather의 5 Day / 3 Hour Forecast API를 한 번 호출한다.
 * 앞 24시간은 시간대별 예보로, 전체 응답은 날짜별 최고·최저 예보로 가공한다.
 */
export const getFiveDayForecast = async ({ cityId, latitude, longitude }) => {
  const cachedForecast = getCachedForecast(cityId)

  if (cachedForecast) {
    return cachedForecast
  }

  const { data } = await axios.get('https://api.openweathermap.org/data/2.5/forecast', {
    params: {
      lat: latitude,
      lon: longitude,
      appid: import.meta.env.VITE_OPENWEATHER_API_KEY,
      units: 'metric',
      lang: 'kr',
    },
  })
  // console.log(data.list)

  // API 시각은 UTC이므로 도시의 timezone 값을 더해 현지 날짜를 계산한다.
  const timezoneOffset = data.city?.timezone ?? 0

  // 3시간 간격 8개 구간은 약 24시간의 시간대별 예보가 된다.
  const hourlyForecast = data.list.slice(0, 8).map((item) => ({
    timestamp: item.dt,
    temp: Math.round(item.main.temp),
    precipitationProbability: Math.round((item.pop ?? 0) * 100),
    windSpeed: item.wind?.speed ?? 0,
    weatherDescription: item.weather?.[0]?.description ?? '날씨 정보 없음',
    weatherIcon: item.weather?.[0]?.icon ?? '',
  }))
  // console.log(hourlyForecast)

  // 3시간 단위 응답을 도시 현지 날짜를 기준으로 묶는다.
  const dailyForecasts = data.list.reduce((days, item) => {
    const localDate = new Date((item.dt + timezoneOffset) * 1000).toISOString().slice(0, 10)
    const localHour = new Date((item.dt + timezoneOffset) * 1000).getUTCHours()
    const noonDistance = Math.abs(localHour - 12)
    const weather = item.weather?.[0]

    if (!days[localDate]) {
      days[localDate] = {
        date: localDate,
        tempMax: item.main.temp_max,
        tempMin: item.main.temp_min,
        precipitationProbability: Math.round((item.pop ?? 0) * 100),
        weatherDescription: weather?.description ?? '날씨 정보 없음',
        weatherIcon: weather?.icon ?? '',
        noonDistance,
      }

      return days
    }

    const day = days[localDate]
    day.tempMax = Math.max(day.tempMax, item.main.temp_max)
    day.tempMin = Math.min(day.tempMin, item.main.temp_min)
    day.precipitationProbability = Math.max(day.precipitationProbability, Math.round((item.pop ?? 0) * 100))

    // 하루를 대표하는 날씨 설명과 아이콘은 정오에 가장 가까운 구간을 사용한다.
    if (noonDistance < day.noonDistance) {
      day.weatherDescription = weather?.description ?? '날씨 정보 없음'
      day.weatherIcon = weather?.icon ?? ''
      day.noonDistance = noonDistance
    }

    return days
  }, {})
  // console.log(dailyForecasts)

  const forecast = Object.values(dailyForecasts)
    .slice(0, 5)
    .map((day) => ({
      date: day.date,
      tempMax: Math.round(day.tempMax),
      tempMin: Math.round(day.tempMin),
      precipitationProbability: day.precipitationProbability,
      weatherDescription: day.weatherDescription,
      weatherIcon: day.weatherIcon,
    }))

  // 같은 API 응답으로 만든 두 예보를 함께 저장해 추가 요청 없이 재사용한다.
  const forecastData = {
    daily: forecast,
    hourly: hourlyForecast,
  }

  localStorage.setItem(
    getForecastCacheKey(cityId),
    JSON.stringify({
      savedAt: Date.now(),
      forecast: forecastData,
    }),
  )

  return forecastData
}
