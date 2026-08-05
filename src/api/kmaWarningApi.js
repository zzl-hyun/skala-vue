import axios from 'axios'

const WARNING_CACHE_KEY = 'kma-weather-warnings-v1'
const WARNING_CACHE_DURATION = 30 * 60 * 1000
const WARNING_FILE_URL = `${import.meta.env.BASE_URL}kma-warnings.json`

// 기본 도시명과 기상청 특보구역명을 정확히 연결해 동명의 다른 지역을 피한다.
const CITY_REGION_ALIASES = {
  '01': ['서울특별시'],
  '02': ['인천광역시'],
  '03': ['대전광역시'],
  '04': ['광주광역시'],
  '05': ['전주시'],
  '06': ['속초시'],
  '07': ['부산광역시'],
  '08': ['대구광역시'],
  '09': ['울산광역시'],
  10: ['성남시'],
}

const WARNING_LEVEL_PRIORITY = {
  중대경보: 4,
  경보: 3,
  주의보: 2,
  주의: 2,
  예비: 1,
}

const normalizeName = (name = '') => name.replace(/^현재 위치\s*·\s*/, '').replace(/\s/g, '')

const getCachedWarnings = () => {
  try {
    const cached = JSON.parse(localStorage.getItem(WARNING_CACHE_KEY))

    if (!cached || !Array.isArray(cached.warnings)) return null
    if (Date.now() - cached.savedAt >= WARNING_CACHE_DURATION) return null

    return cached.warnings
  } catch {
    localStorage.removeItem(WARNING_CACHE_KEY)
    return null
  }
}

/**
 * 빌드 과정에서 UTF-8 JSON으로 변환된 기상청 특보를 불러온다.
 * 동일한 파일을 반복 요청하지 않도록 브라우저에서 30분 동안 캐싱한다.
 */
export const getKmaWarnings = async ({ forceRefresh = false } = {}) => {
  const cachedWarnings = forceRefresh ? null : getCachedWarnings()

  if (cachedWarnings) return cachedWarnings

  const cacheVersion = forceRefresh ? Date.now() : Math.floor(Date.now() / WARNING_CACHE_DURATION)
  const { data } = await axios.get(WARNING_FILE_URL, {
    params: {
      v: cacheVersion,
    },
  })

  const warnings = Array.isArray(data?.warnings) ? data.warnings : []

  localStorage.setItem(
    WARNING_CACHE_KEY,
    JSON.stringify({
      savedAt: Date.now(),
      warnings,
    }),
  )

  return warnings
}

const getCityAliases = (city) => {
  const predefinedAliases = CITY_REGION_ALIASES[String(city.id)]

  if (predefinedAliases) return predefinedAliases

  const cityName = normalizeName(city.name_kr ?? city.name)
  return [cityName, `${cityName}시`, `${cityName}군`]
}

/**
 * 전국 특보 목록에서 카드 도시와 관련된 육상 특보를 찾는다.
 * 같은 도시의 권역별 특보는 종류와 수준이 같으면 하나로 합친다.
 */
export const getWarningsForCity = (city, warnings) => {
  const aliases = getCityAliases(city).map(normalizeName)
  const matchedWarnings = warnings.filter((warning) => {
    const regionGroupName = normalizeName(warning.regionGroupName)
    const regionName = normalizeName(warning.regionName)

    return aliases.some((alias) => regionGroupName === alias || regionName.includes(alias))
  })

  const uniqueWarnings = matchedWarnings.filter(
    (warning, index, list) => list.findIndex((item) => item.type === warning.type && item.level === warning.level) === index,
  )

  return uniqueWarnings.sort((first, second) => (WARNING_LEVEL_PRIORITY[second.level] ?? 0) - (WARNING_LEVEL_PRIORITY[first.level] ?? 0))
}
