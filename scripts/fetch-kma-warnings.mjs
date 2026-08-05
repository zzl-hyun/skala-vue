import { access, mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import process from 'node:process'
import { loadEnv } from 'vite'

const OUTPUT_PATH = resolve('public/kma-warnings.json')
const KMA_WARNING_URL = 'https://apihub.kma.go.kr/api/typ01/url/wrn_now_data.php'
const MAX_FETCH_ATTEMPTS = 3
const RETRY_DELAY_MS = 3000

const wait = (milliseconds) => new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds))

const getErrorMessage = (error) => [error?.message, error?.cause?.code, error?.cause?.message].filter(Boolean).join(' / ')

const fetchWithRetry = async (url) => {
  let lastError

  for (let attempt = 1; attempt <= MAX_FETCH_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      return response
    } catch (error) {
      lastError = error

      if (attempt === MAX_FETCH_ATTEMPTS) break

      console.warn(`[KMA] 특보 조회 ${attempt}/${MAX_FETCH_ATTEMPTS}회 실패 (${getErrorMessage(error)}). ${RETRY_DELAY_MS / 1000}초 후 재시도합니다.`)
      await wait(RETRY_DELAY_MS)
    }
  }

  throw lastError
}

const createWarningLabel = (type, level) => {
  if (level === '예비') return `${type} 예비특보`
  if (['주의보', '경보', '중대경보'].includes(level)) return `${type}${level}`
  return [type, level].filter(Boolean).join(' ')
}

const parseWarningLine = (line) => {
  if (!line || line.startsWith('#') || line.startsWith('=')) return null

  const columns = line.split(',').map((column) => column.trim())

  if (columns.length < 9 || !columns[0] || !columns[2]) return null

  const [regionGroupCode, regionGroupName, regionCode, regionName, issuedAt, effectiveAt, type, level, command, endTime] = columns

  if (!type || command === '해제') return null

  return {
    regionGroupCode,
    regionGroupName,
    regionCode,
    regionName,
    issuedAt,
    effectiveAt,
    type,
    level,
    command,
    endTime: endTime === '=' ? '' : endTime,
    label: createWarningLabel(type, level),
  }
}

const hasExistingSnapshot = async () => {
  try {
    await access(OUTPUT_PATH)
    return true
  } catch {
    return false
  }
}

const keepExistingSnapshot = async (message) => {
  if (await hasExistingSnapshot()) {
    console.warn(`[KMA] ${message} 기존 특보 파일을 사용합니다.`)
    return
  }

  await mkdir(dirname(OUTPUT_PATH), { recursive: true })
  await writeFile(
    OUTPUT_PATH,
    `${JSON.stringify(
      {
        fetchedAt: null,
        warnings: [],
      },
      null,
      2,
    )}\n`,
  )
  console.warn(`[KMA] ${message} 빈 특보 파일을 생성했습니다.`)
}

const fetchWarnings = async () => {
  const env = loadEnv('development', process.cwd(), '')
  const apiKey = process.env.VITE_KMA_API_KEY || env.VITE_KMA_API_KEY

  if (!apiKey) {
    await keepExistingSnapshot('VITE_KMA_API_KEY가 없습니다.')
    return
  }

  const url = new URL(KMA_WARNING_URL)
  url.search = new URLSearchParams({
    fe: 'f',
    tm: '',
    disp: '0',
    help: '0',
    authKey: apiKey,
  })

  try {
    const response = await fetchWithRetry(url)

    // 기상청 특보 API는 EUC-KR 텍스트이므로 UTF-8 JSON으로 변환해 저장한다.
    const responseBuffer = await response.arrayBuffer()
    const responseText = new TextDecoder('euc-kr').decode(responseBuffer)
    const warnings = responseText.split(/\r?\n/).map(parseWarningLine).filter(Boolean)

    await mkdir(dirname(OUTPUT_PATH), { recursive: true })
    await writeFile(
      OUTPUT_PATH,
      `${JSON.stringify(
        {
          fetchedAt: new Date().toISOString(),
          warnings,
        },
        null,
        2,
      )}\n`,
    )

    console.log(`[KMA] 현재 기상특보 ${warnings.length}건을 저장했습니다.`)
  } catch (error) {
    await keepExistingSnapshot(`특보 조회에 실패했습니다. (${getErrorMessage(error)})`)
  }
}

await fetchWarnings()
