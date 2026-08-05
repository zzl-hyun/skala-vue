import axios from 'axios'
import { cities } from '@/data/cities'

const CACHE_KEY = 'weather-list'
const CACHE_DURATION = 60 * 60 * 1000
const FORECAST_CACHE_PREFIX = 'five-day-forecast'
const CUSTOM_CITIES_KEY = 'weather-custom-cities'

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

const getCustomCities = () => {
  try {
    const customCities = JSON.parse(localStorage.getItem(CUSTOM_CITIES_KEY))

    return Array.isArray(customCities) ? customCities : []
  } catch {
    localStorage.removeItem(CUSTOM_CITIES_KEY)
    return []
  }
}

const requestCurrentWeather = async (city) => {
  const hasCoordinates = Number.isFinite(city.lat) && Number.isFinite(city.lon)
  const locationParams = hasCoordinates
    ? { lat: city.lat, lon: city.lon }
    : { q: `${city.name},${city.country ?? 'KR'}` }

  const { data } = await axios.get(
    'https://api.openweathermap.org/data/2.5/weather',
    {
      params: {
        ...locationParams,
        appid: import.meta.env.VITE_OPENWEATHER_API_KEY,
        units: 'metric',
        lang: 'kr',
      },
    },
  )
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

export const getWeatherList = async ({ forceRefresh = false } = {}) => {
  const cachedWeather = forceRefresh ? null : getWeatherCacheInfo()

  if (cachedWeather) {
    return cachedWeather.weatherList
  }

  const allCities = [...cities, ...getCustomCities()]
  const weatherList = await Promise.all(
    allCities.map(requestCurrentWeather),
  )
  // console.log(weatherList)

  saveWeatherListCache(weatherList)

  return weatherList
}

export const searchCities = async (query) => {
  const { data } = await axios.get(
    'https://api.openweathermap.org/geo/1.0/direct',
    {
      params: {
        q: query,
        limit: 5,
        appid: import.meta.env.VITE_OPENWEATHER_API_KEY,
      },
    },
  )
  // console.log(data)

  return data.map((city) => ({
    key: `${city.lat}-${city.lon}`,
    name: city.name,
    name_kr: city.local_names?.ko ?? city.name,
    state: city.state ?? '',
    country: city.country,
    lat: city.lat,
    lon: city.lon,
  }))
}

export const getWeatherByLocation = (location) =>
  requestCurrentWeather(location)

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
  }

  const isSaved = customCities.some(
    (savedCity) => String(savedCity.id) === customCity.id,
  )

  if (!isSaved) {
    localStorage.setItem(
      CUSTOM_CITIES_KEY,
      JSON.stringify([...customCities, customCity]),
    )
  }

  return customCity
}

const getForecastCacheKey = (cityId) =>
  `${FORECAST_CACHE_PREFIX}-${cityId}`

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

export const getFiveDayForecast = async ({ cityId, latitude, longitude }) => {
  const cachedForecast = getCachedForecast(cityId)

  if (cachedForecast) {
    return cachedForecast
  }

  const { data } = await axios.get(
    'https://api.openweathermap.org/data/2.5/forecast',
    {
      params: {
        lat: latitude,
        lon: longitude,
        appid: import.meta.env.VITE_OPENWEATHER_API_KEY,
        units: 'metric',
        lang: 'kr',
      },
    },
  )
  // console.log(data.list)

  const timezoneOffset = data.city?.timezone ?? 0
  const dailyForecasts = data.list.reduce((days, item) => {
    const localDate = new Date(
      (item.dt + timezoneOffset) * 1000,
    ).toISOString().slice(0, 10)
    const localHour = new Date(
      (item.dt + timezoneOffset) * 1000,
    ).getUTCHours()
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
    day.precipitationProbability = Math.max(
      day.precipitationProbability,
      Math.round((item.pop ?? 0) * 100),
    )

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

  localStorage.setItem(
    getForecastCacheKey(cityId),
    JSON.stringify({
      savedAt: Date.now(),
      forecast,
    }),
  )

  return forecast
}
